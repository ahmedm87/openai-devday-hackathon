import React from 'react';
import {Icon, lineColor, londonTime, preferences} from '../ui.jsx';

export default function RouteCard({route, number, selected, recommended, preference, disabled, onSelect}) {
  const lines = [...new Set(route.legs.flatMap(leg => leg.lines.map(line => line.name)).filter(Boolean))];
  const label = preferences.find(([value]) => value === preference)?.[1] || 'Quickest';
  return <button type="button" className={`route-card${selected ? ' selected' : ''}`} aria-pressed={selected} aria-label={`Option ${number}, ${route.duration} minutes, ${lines.join(', ') || 'walking'}${recommended ? ', recommended' : ''}`} disabled={disabled} onClick={() => onSelect(route.id)}>
    <div className="route-top"><span className="route-number">{String(number).padStart(2, '0')}</span><strong>{route.duration}<small> min</small></strong>{recommended && <span className="recommendation-badge"><Icon name="check"/>{label}</span>}</div>
    <div className="route-times">{londonTime(route.departure)} → {londonTime(route.arrival)} <span>London time</span></div>
    <div className="line-pills">{(lines.length ? lines : ['Walk']).map(name => <span key={name} style={{'--line-color': lineColor(name === 'Walk' ? 'walking' : name)}}>{name}</span>)}</div>
    <div className="route-bottom"><span>{route.changes === 0 ? 'No changes' : `${route.changes} change${route.changes === 1 ? '' : 's'}`} · {route.walking_minutes} min walking reported</span><span className="route-action">{selected ? 'Selected' : 'View'} ↗</span></div>
  </button>;
}
