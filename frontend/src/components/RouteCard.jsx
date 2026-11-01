import React from 'react';
import {Icon} from '../ui.jsx';

export default function RouteCard({route, number, selected, recommended, disabled, onSelect}) {
  const lines = [...new Set(route.legs.flatMap(leg => leg.lines.map(line => line.name)))].join(' · ') || 'Walking';
  return <button className={`route-summary${selected ? ' selected' : ''}${recommended ? ' recommended' : ''}`} type="button" aria-pressed={selected} aria-label={`Option ${number}, ${route.duration} minutes, ${lines}, ${route.walking_minutes} minutes walking reported, ${route.changes} changes${recommended ? ', recommended' : ''}`} disabled={disabled} onClick={() => onSelect(route.id)}>
    <span className="summary-number">Option {number}</span>
    {recommended && <span className="summary-recommended" title="Recommended"><Icon name="check"/><span>Recommended</span></span>}
    <strong>{route.duration}<small> min</small></strong>
    <span>{route.walking_minutes} min walking*</span>
    <span>{route.changes === 0 ? 'No changes' : `${route.changes} change${route.changes === 1 ? '' : 's'}`}</span>
    <small className="summary-lines" title={lines}>{lines}</small>
  </button>;
}
