"""Bounded, cached map forecasts, independent of journey orchestration."""
import asyncio
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix='/api/map', tags=['map context'])
BOUNDS = [-0.32, 51.40, 0.12, 51.64]  # west, south, east, north
GRID_SIZE = 5
TTL = 600
weather_cache = {}
_lock = asyncio.Lock()


def requested_cells():
    west, south, east, north = BOUNDS
    dx, dy = (east - west) / GRID_SIZE, (north - south) / GRID_SIZE
    return [{'id': f'{row}-{col}',
             'requested': {'longitude': round(west + (col + .5) * dx, 6),
                           'latitude': round(south + (row + .5) * dy, 6)},
             'bounds': [round(west + col * dx, 6), round(south + row * dy, 6),
                        round(west + (col + 1) * dx, 6), round(south + (row + 1) * dy, 6)]}
            for row in range(GRID_SIZE) for col in range(GRID_SIZE)]


def iso(value):
    return value.astimezone(timezone.utc).isoformat()


def finite(value, minimum, maximum):
    return (value if isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value) and minimum <= value <= maximum else None)


def normalise_batch(raw, start, retrieved):
    cells = requested_cells()
    if not isinstance(raw, list) or len(raw) != len(cells):
        raise ValueError('Forecast batch did not match the requested grid')
    periods = [{'start': iso(start + timedelta(hours=i)),
                'end': iso(start + timedelta(hours=i + 1))} for i in range(4)]
    samples, by_location, missing, conflicts = [], {}, 0, False
    for cell, response in zip(cells, raw):
        cell['sample_id'] = None
        if not isinstance(response, dict):
            missing += 1
            continue
        lat = finite(response.get('latitude'), -90, 90)
        lon = finite(response.get('longitude'), -180, 180)
        if lat is None or lon is None:
            missing += 1
            continue
        hourly = response.get('hourly')
        if not isinstance(hourly, dict):
            hourly = {}
        hours = {}
        stamps = hourly.get('time')
        for i, stamp in enumerate(stamps if isinstance(stamps, list) else []):
            try:
                parsed = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError, AttributeError):
                continue
            def value(name, lower, upper):
                values = hourly.get(name)
                return finite(values[i], lower, upper) if isinstance(values, list) and i < len(values) else None
            hours[iso(parsed)] = {'temperature_c': value('temperature_2m', -100, 70),
                                  'rain_probability': value('precipitation_probability', 0, 100)}
        values = [{'temperature_c': hours.get(period['start'], {}).get('temperature_c'),
                   # Open-Meteo probability describes the hour ending at its timestamp.
                   'rain_probability': hours.get(period['end'], {}).get('rain_probability')}
                  for period in periods]
        key = (round(lat, 6), round(lon, 6))
        if key not in by_location:
            sample = {'id': f'sample-{len(samples)}', 'returned': {'latitude': lat, 'longitude': lon},
                      'requested_cell_ids': [], 'hours': values,
                      'model': response.get('model'), 'resolution_km': None}
            by_location[key] = sample
            samples.append(sample)
        sample = by_location[key]
        if sample['hours'] != values:
            conflicts = True
        sample['requested_cell_ids'].append(cell['id'])
        cell['sample_id'] = sample['id']
    if not any(value is not None for sample in samples for hour in sample['hours'] for value in hour.values()):
        raise ValueError('No usable forecast values were returned')
    warnings = []
    if missing:
        warnings.append(f'{missing} requested sampling area(s) have no returned forecast location.')
    if any(value is None for sample in samples for hour in sample['hours'] for value in hour.values()):
        warnings.append('Some forecast values are unavailable; their cells remain transparent.')
    if conflicts:
        warnings.append('Repeated returned locations had differing values; one canonical series per returned location is displayed.')
    return {'area': 'london-demo', 'area_label': 'Central London demonstration extent',
            'coverage_bounds': BOUNDS, 'grid_size': GRID_SIZE, 'sample': False,
            'cells': cells, 'samples': samples, 'periods': periods,
            'units': {'temperature_c': '°C', 'rain_probability': '%'},
            'available_variables': [name for name in ('temperature_c', 'rain_probability')
                                    if any(hour[name] is not None for sample in samples for hour in sample['hours'])],
            'intervals': {'temperature_c': 'Instantaneous forecast at the selected period start.',
                          'rain_probability': 'Probability of more than 0.1 mm precipitation during the selected hour.'},
            'retrieved_at': iso(retrieved), 'provider_updated_at': None,
            'source': 'Open-Meteo forecast', 'source_url': 'https://open-meteo.com/en/docs',
            'model': None, 'resolution_km': None,
            'approximation': 'Application sampling areas, not provider-native model cell boundaries. No interpolation or extrapolation.',
            'requested_location_count': len(cells), 'unique_returned_location_count': len(samples),
            'warnings': warnings}


async def fetch_batch(cells, start):
    params = {'latitude': ','.join(str(cell['requested']['latitude']) for cell in cells),
              'longitude': ','.join(str(cell['requested']['longitude']) for cell in cells),
              'hourly': 'temperature_2m,precipitation_probability', 'timezone': 'UTC',
              'start_hour': start.strftime('%Y-%m-%dT%H:%M'),
              'end_hour': (start + timedelta(hours=4)).strftime('%Y-%m-%dT%H:%M'),
              'cell_selection': 'nearest', 'elevation': ','.join('nan' for _ in cells)}
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.get('https://api.open-meteo.com/v1/forecast', params=params)
        response.raise_for_status()
        return response.json()


async def load_weather():
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    key = ('london-demo', GRID_SIZE, tuple(BOUNDS), 'temperature_2m,precipitation_probability', iso(start))
    async with _lock:
        cached = weather_cache.get(key)
        if cached and cached['expires'] > time.monotonic():
            if 'error' in cached:
                raise HTTPException(503, cached['error'])
            return cached['result']
        try:
            raw = await fetch_batch(requested_cells(), start)
            result = normalise_batch(raw, start, datetime.now(timezone.utc))
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            message = 'The area forecast is unavailable. Journey planning and endpoint forecasts remain independent. Try again shortly.'
            weather_cache[key] = {'expires': time.monotonic() + 30, 'error': message}
            raise HTTPException(503, message) from None
        weather_cache.clear()
        weather_cache[key] = {'expires': time.monotonic() + TTL, 'result': result}
        return result


@router.get('/weather')
async def map_weather(area: Literal['london-demo'] = 'london-demo', sample: bool = False):
    if sample:
        raise HTTPException(409, 'The area forecast is disabled in fictional sample mode. Endpoint sample forecasts remain available.')
    return await load_weather()
