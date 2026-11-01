import React from 'react';
import {lineColor, londonTime} from '../ui.jsx';

export default function RouteStops({route, number, sample = false, notices = false}) {
  let transit = 0;
  return <section className="selected-itinerary" aria-label={`Option ${number} stops and changes`}>
    <h3>Option {number} · stops & changes</h3>
    <p className="evidence-note">{londonTime(route.departure)} → {londonTime(route.arrival)} · London time · {route.duration} min</p>
    <ol className="journey-steps">{route.legs.map((leg,index) => {
      const walking = leg.mode === 'walking';
      const change = !walking && transit++ > 0;
      const line = leg.lines.map(item => item.name).join(' / ') || leg.mode.replaceAll('-', ' ');
      const stops = leg.stops?.length ? leg.stops : [{name:leg.from},{name:leg.to}];
      return <li key={index}><span className="leg-marker" style={{'--line-color':lineColor(walking ? 'walking' : leg.lines[0]?.name)}}>{change ? '↔' : index+1}</span><div>
        <strong>{walking ? 'Walk' : change ? `Change at ${leg.from}` : `Board at ${leg.from}`}</strong>
        <p>{line} · {leg.duration} min{leg.instruction ? ` · ${leg.instruction}` : ''}</p>
        <ol className="station-sequence" aria-label={`${line} stops in travel order`}>{stops.map((stop,i) => <li key={`${stop.id || stop.name}-${i}`} className={i===0 || i===stops.length-1 ? 'leg-endpoint' : ''}><span aria-hidden="true"/>{stop.name}{i===stops.length-1 && <small>{index===route.legs.length-1 ? 'Arrive' : 'Leave this leg'}</small>}</li>)}</ol>
        {!walking && !leg.stops_available && <p className="stops-unavailable">{sample ? 'Illustrative stops only.' : 'Intermediate stops not supplied for this leg.'}</p>}
        {notices && leg.disruptions.map((notice,i) => <p key={i} className="notice-text">{notice.description}</p>)}
      </div></li>;
    })}</ol>
  </section>;
}
