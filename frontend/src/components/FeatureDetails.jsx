import React from 'react';
import {affectedLeg, weatherVariables} from '../mapData.js';
import {londonTime} from '../ui.jsx';

export default function FeatureDetails({feature, data, route, field, variable, period, onClose}) {
  if (!feature) return null;
  let content, title;
  if (feature.type === 'weather-cell') {
    const cell = field.data?.cells.find(item => item.id === feature.id);
    const sample = field.data?.samples.find(item => item.id === cell?.sample_id);
    const value = sample?.hours[period]?.[variable] ?? null;
    const definition = weatherVariables[variable], time = field.data?.periods[period];
    title = `${definition.label} · sampling area ${feature.id}`;
    content = <><p className="feature-value">{value === null ? 'Unavailable' : `${value}${definition.unit}`}</p><p>Forecast valid {londonTime(time?.start)}{variable === 'rain_probability' ? `–${londonTime(time?.end)}` : ''} · London time</p><p>{field.data?.intervals[variable]}</p><p>Requested point: {cell?.requested.latitude}, {cell?.requested.longitude}</p><p>{sample ? `Returned forecast location: ${sample.returned.latitude}, ${sample.returned.longitude}. Shared by ${sample.requested_cell_ids.length} sampling area(s).` : 'No forecast location returned.'}</p><p>Application sampling footprint, not a native weather-model cell. No interpolation. Model resolution is unavailable.</p><small>Retrieved {londonTime(field.data?.retrieved_at)} · Open-Meteo forecast</small></>;
  } else if (feature.type === 'endpoint' && data) {
    const station = feature.index ? data.destination : data.origin;
    const weather = data.weather.find(item => item.location === station.name) || (data.sample ? data.weather[0] : null);
    title = `Forecast near ${feature.index ? 'destination' : 'origin'}`;
    content = <><p><strong>{station.name}</strong></p>{weather?.hours.length ? weather.hours.map((hour,index) => <div className="forecast-hour" key={index}><p><strong>{hour.temperature_c ?? '—'}°C · {hour.rain_probability ?? '—'}% rain probability</strong></p><p>{hour.wind_kmh ?? '—'} km/h wind · forecast hour {londonTime(hour.time)} London</p></div>) : <p>Endpoint forecast unavailable.</p>}<p>{data.sample ? 'Fictional sample · not retrieved' : weather ? `Retrieved ${londonTime(weather.retrieved_at)} London` : 'Retrieval time unavailable'}</p><small>{weather?.source} · endpoint forecast, not weather along the whole route.</small></>;
  } else if (feature.type === 'disruption' && route) {
    const leg = route.legs[feature.index];
    if (!leg) return null;
    const context = affectedLeg(leg, route);
    title = 'This journey · service context';
    content = <><p><strong>{leg.from} → {leg.to}</strong></p>{context.statuses.map(line => <div key={line.id}><h4>{line.name}</h4>{line.statuses.map((status,index) => <div key={index}><strong>{status.description}</strong>{status.reason && <p>{status.reason}</p>}</div>)}</div>)}{leg.disruptions.map((notice,index) => <p key={index}>{notice.description}</p>)}<p>The badge anchors a supplied journey leg. It is not an incident location or a measured journey delay.</p><small>TfL retrieved {londonTime(data.sources.find(source => source.name === 'TfL line status')?.retrieved_at)} London</small></>;
  } else return null;
  return <section className="feature-details" aria-label={title}><div className="section-heading"><h3>{title}</h3><button type="button" className="icon-button" aria-label="Close map feature details" onClick={onClose}>×</button></div>{content}</section>;
}
