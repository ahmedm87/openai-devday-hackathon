import React, {useEffect, useRef} from 'react';
import {Icon, lineColor, londonTime} from '../ui.jsx';
import Recommendation from './Recommendation.jsx';
import FeatureDetails from './FeatureDetails.jsx';
import RouteCard from './RouteCard.jsx';

function JourneyEvidence({data, route, number}) {
  return <div className="journey-evidence">
    <section><h3>Selected Option {number} · journey steps</h3><p className="evidence-note">{londonTime(route.departure)} → {londonTime(route.arrival)} · London time. {route.duration} minutes.</p><ol className="journey-steps">{route.legs.map((leg,index) => <li key={index}><span className="leg-marker" style={{'--line-color': lineColor(leg.mode === 'walking' ? 'walking' : leg.lines[0]?.name)}}>{index + 1}</span><div><strong>{leg.from} → {leg.to}</strong><p>{leg.instruction}</p><small>{leg.duration} min · {leg.mode.replaceAll('-', ' ')}</small>{leg.disruptions.map((notice,item) => <p key={item} className="notice-text">{notice.description}</p>)}</div></li>)}</ol></section>
    <Recommendation data={data} number={data.routes.findIndex(item => item.id === data.recommended_id) + 1}/>
    <section><h3>Selected-route service context</h3>{data.sample ? <p>Fictional sample · no line status checked.</p> : route.legs.every(leg => leg.mode === 'walking') ? <p>No public transport line status applies to this walking option.</p> : route.line_statuses.length ? route.line_statuses.map(line => <article className="status-line" key={line.id}><h4>{line.name}</h4>{line.statuses.map((status,index) => <div key={index}><strong>{status.description}</strong>{status.reason && <p>{status.reason}</p>}</div>)}</article>) : <p>Line status unavailable.</p>}<p className="evidence-note">Line status does not measure this journey’s delay.</p></section>
    <section><h3>Endpoint forecasts</h3>{data.weather.length ? data.weather.map((weather,index) => <article className="weather-evidence" key={index}><h4>{weather.location}</h4>{weather.hours.map((hour,item) => <p key={item}>{londonTime(hour.time)} London · {hour.temperature_c ?? '—'}°C · {hour.rain_probability ?? '—'}% rain probability · {hour.wind_kmh ?? '—'} km/h wind</p>)}<small>{data.sample ? 'Fictional sample' : `Retrieved ${londonTime(weather.retrieved_at)} London`} · {weather.source}</small></article>) : <p>Endpoint forecasts unavailable.</p>}</section>
    <section><h3>Sources & snapshot times</h3>{data.sources.map((source,index) => <p key={index}><strong>{source.name}</strong> · {source.retrieved_at ? `retrieved ${londonTime(source.retrieved_at)} London` : 'retrieval unavailable'} · {source.provider_updated_at ? `provider updated ${londonTime(source.provider_updated_at)}` : 'provider update time unavailable'}</p>)}<p className="evidence-note">{data.ranking_rule}</p><p className="evidence-note">* Walking minutes are TfL-reported walking legs, not proof of no walking within stations. Forecasts cover endpoints.</p></section>
  </div>;
}

export default function ResultsDock({data, route, selectedFeature, field, weatherVariable, weatherPeriod, sheetState, working, busy, onState, onSelect, onRefresh, onCloseFeature}) {
  const content = useRef(null), heading = useRef(null);
  useEffect(() => {if (sheetState === 'expanded') {heading.current?.focus(); if (content.current) content.current.scrollTop = 0;}}, [sheetState, selectedFeature]);
  if (!data && !selectedFeature && !busy) return null;
  const recommended = data?.routes.find(item => item.id === data.recommended_id);
  const number = data?.routes.findIndex(item => item.id === data.recommended_id) + 1;
  const summary = data?.explanation?.summary || data?.ranking_rule || '';
  const sentence = summary.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || summary;
  return <section className={`results-dock ${sheetState}`} data-map-overlay="results" aria-label="Journey results" aria-busy={busy}>
    <div className="results-toolbar"><div ref={heading} tabIndex={-1}><strong>{busy && !data ? 'Finding your way…' : data ? `Recommended: Option ${number} · ${recommended?.duration} min` : 'Map details'}</strong><small>{data ? `${data.origin.name} → ${data.destination.name}` : 'Forecast context'}</small></div><div className="sheet-actions"><button type="button" aria-label="Collapse results" aria-pressed={sheetState === 'collapsed'} onClick={() => onState('collapsed')}><Icon name="chevron"/><span>Summary</span></button><button type="button" aria-label="Show route options" aria-pressed={sheetState === 'partial'} disabled={!data} onClick={() => onState('partial')}>Routes</button><button type="button" aria-label="Expand journey details" aria-pressed={sheetState === 'expanded'} onClick={() => onState('expanded')}>Details ↑</button></div></div>
    {sheetState !== 'collapsed' && <div className="sheet-scroll" ref={content}>
      {data && <><div className="route-summaries">{data.routes.slice(0,3).map((item,index) => <RouteCard key={item.id} route={item} number={index + 1} selected={route?.id === item.id} recommended={item.id === data.recommended_id} disabled={working} onSelect={onSelect}/>)}</div><p className="recommendation-preview"><Icon name="spark"/><span><strong>Why Option {number}: </strong>{sentence}</span></p></>}
      {sheetState === 'expanded' && <><FeatureDetails feature={selectedFeature} data={data} route={route} field={field} variable={weatherVariable} period={weatherPeriod} onClose={onCloseFeature}/>{data && route && <JourneyEvidence data={data} route={route} number={data.routes.findIndex(item => item.id === route.id) + 1}/>}</>}
      {data && <div className="sheet-footer"><small>{data.sample ? 'Fictional sample · not travel advice' : working ? 'Updating · previous snapshot visible' : 'Retrieved snapshots · refresh for updates'}</small><button className="text-button" type="button" disabled={working} onClick={onRefresh}><Icon name="refresh"/>Refresh journey</button></div>}
    </div>}
  </section>;
}
