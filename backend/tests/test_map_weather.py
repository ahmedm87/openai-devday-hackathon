import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend import map_weather as module

START = datetime(2026, 11, 1, 15, tzinfo=timezone.utc)


def batch(start=START):
    # Repeated coordinates exercise deduplication, including valid zero rain.
    return [{'latitude': 51.5, 'longitude': -.1,
             'hourly': {'time': [(start + timedelta(hours=i)).strftime('%Y-%m-%dT%H:%M') for i in range(5)],
                        'temperature_2m': [10, 11, None, 13, 14],
                        'precipitation_probability': [90, 0, 25, 50, 100]}} for _ in range(25)]


def test_field_preserves_requested_and_deduplicated_returned_cells():
    result = module.normalise_batch(batch(), START, START)
    assert len(result['cells']) == 25 and len(result['samples']) == 1
    assert len(result['samples'][0]['requested_cell_ids']) == 25
    assert len({cell['sample_id'] for cell in result['cells']}) == 1
    assert result['cells'][0]['requested'] != result['samples'][0]['returned']
    assert result['provider_updated_at'] is None and result['resolution_km'] is None


def test_probability_uses_hour_ending_at_next_timestamp_and_missing_is_not_zero():
    result = module.normalise_batch(batch(), START, START)
    values = result['samples'][0]['hours']
    assert values[0] == {'temperature_c': 10, 'rain_probability': 0}
    assert values[2] == {'temperature_c': None, 'rain_probability': 50}
    assert result['periods'][0]['end'] == (START + timedelta(hours=1)).isoformat()


def test_missing_cells_and_invalid_values_stay_unavailable():
    raw = batch()
    raw[0] = None
    raw[1]['hourly']['temperature_2m'][0] = float('nan')
    result = module.normalise_batch(raw, START, START)
    assert result['cells'][0]['sample_id'] is None
    assert result['samples'][0]['hours'][0]['temperature_c'] is None
    assert result['warnings']
    with pytest.raises(ValueError):
        module.normalise_batch(raw[:-1], START, START)


def test_weather_cache_coalesces_requests_and_reuses_original_retrieval(monkeypatch):
    async def scenario():
        module.weather_cache.clear()
        monkeypatch.setattr(module, '_lock', asyncio.Lock())
        async def fetch(*args):
            await asyncio.sleep(.01)
            return batch(args[1])
        source = AsyncMock(side_effect=fetch)
        monkeypatch.setattr(module, 'fetch_batch', source)
        results = await asyncio.gather(module.load_weather(), module.load_weather())
        assert results[0] is results[1]
        assert source.await_count == 1
        assert (await module.load_weather())['retrieved_at'] == results[0]['retrieved_at']
        module.weather_cache.clear()
    asyncio.run(scenario())


def test_field_failure_is_explicit_and_backed_off(monkeypatch):
    async def scenario():
        module.weather_cache.clear()
        monkeypatch.setattr(module, '_lock', asyncio.Lock())
        source = AsyncMock(side_effect=httpx.ConnectError('Unavailable'))
        monkeypatch.setattr(module, 'fetch_batch', source)
        for _ in range(2):
            with pytest.raises(module.HTTPException) as error:
                await module.load_weather()
            assert error.value.status_code == 503
        assert source.await_count == 1
        module.weather_cache.clear()
    asyncio.run(scenario())


def test_sample_and_unknown_area_do_not_call_provider(monkeypatch):
    source = AsyncMock(side_effect=AssertionError('No network for sample/invalid area'))
    monkeypatch.setattr(module, 'load_weather', source)
    with TestClient(app) as client:
        assert client.get('/api/map/weather?sample=true').status_code == 409
        assert client.get('/api/map/weather?area=arbitrary-grid').status_code == 422
    source.assert_not_called()


def test_batch_parameters_match_all_requested_locations(monkeypatch):
    client_type = httpx.AsyncClient
    def handler(request):
        params = request.url.params
        assert len(params['latitude'].split(',')) == 25
        assert len(params['longitude'].split(',')) == 25
        assert params['elevation'].split(',') == ['nan'] * 25
        assert params['hourly'] == 'temperature_2m,precipitation_probability'
        assert params['start_hour'] == '2026-11-01T15:00'
        assert params['end_hour'] == '2026-11-01T19:00'
        return httpx.Response(200, json=batch())
    monkeypatch.setattr(module.httpx, 'AsyncClient', lambda **kwargs: client_type(transport=httpx.MockTransport(handler), **kwargs))
    assert len(asyncio.run(module.fetch_batch(module.requested_cells(), START))) == 25
