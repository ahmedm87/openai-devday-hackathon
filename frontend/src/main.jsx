import React, {Fragment, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import './chat.css';
import JourneyChat from './JourneyChat.jsx';
import JourneyControls from './components/JourneyControls.jsx';
import JourneyMap from './components/JourneyMap.jsx';
import RouteCard from './components/RouteCard.jsx';
import Recommendation from './components/Recommendation.jsx';
import {Icon, lineColor, londonTime} from './ui.jsx';

function Evidence({data, route, optionNumber}) {
  return <details className="evidence-panel panel">
    <summary><span>Selected Option {optionNumber}: steps & evidence</span><Icon name="chevron"/></summary>
    <div className="evidence-content">
      <section><h2>Journey steps</h2><ol className="journey-steps">{route.legs.map((leg, index) => <li key={index}><span className="leg-marker" style={{'--line-color': lineColor(leg.mode === 'walking' ? 'walking' : leg.lines[0]?.name)}}>{index + 1}</span><div><strong>{leg.from} → {leg.to}</strong><p>{leg.instruction}</p><small>{leg.duration} min · {leg.mode.replaceAll('-', ' ')}</small></div></li>)}</ol></section>
      <section><h2>Endpoint forecasts</h2><p className="evidence-note">Forecasts describe conditions near the endpoints, not along the whole route. Times below are London time.</p><div className="weather-evidence">{data.weather.length ? data.weather.map((weather, index) => <article key={index}><h3><Icon name="rain"/>{weather.location}</h3>{weather.hours.map((hour, hourIndex) => <p key={hourIndex}><time dateTime={hour.time}>{londonTime(hour.time)}</time> · {hour.temperature_c ?? '—'}°C · {hour.rain_probability ?? '—'}% rain probability · {hour.wind_kmh ?? '—'} km/h wind</p>)}<small>{data.sample ? 'Fictional sample · not retrieved' : `Retrieved ${londonTime(weather.retrieved_at)}`} · {weather.source}</small></article>) : <p>No endpoint forecast was returned.</p>}</div></section>
      <section><h2>Sources & snapshot times</h2><ul className="source-list">{data.sources.map((source, index) => <li key={index}><strong>{source.name}</strong><span>{data.sample ? 'Fictional sample' : source.retrieved_at ? `Retrieved ${londonTime(source.retrieved_at)} London time` : 'Retrieval time unavailable'}</span><small>{source.provider_updated_at ? `Provider updated ${londonTime(source.provider_updated_at)}` : 'Provider update time unavailable'}</small></li>)}</ul><p className="evidence-note">{data.ranking_rule}</p><p className="evidence-note">These are retrieved snapshots. Use Refresh to request updated journey options.</p></section>
    </div>
  </details>;
}

function App() {
  const [sample, setSample] = useState(false), [stations, setStations] = useState([]);
  const [origin, setOrigin] = useState(''), [destination, setDestination] = useState('');
  const [preference, setPreference] = useState('fastest');
  const [data, setData] = useState(null), [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false), [chatBusy, setChatBusy] = useState(false);
  const [stationBusy, setStationBusy] = useState(true), [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const working = busy || chatBusy;

  useEffect(() => {fetch('/api/health').then(response => response.json()).then(setHealth).catch(() => {});}, []);
  useEffect(() => {
    let cancelled = false;
    setStationBusy(true); setData(null); setSelected(null); setError(''); setStations([]); setOrigin(''); setDestination('');
    (async () => {
      try {
        const response = await fetch(`/api/stations?sample=${sample}`);
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Station search is unavailable. Try again shortly.');
        if (cancelled) return;
        setStations(result.stations);
        setOrigin(result.stations.find(station => station.name.startsWith('Waterloo'))?.id || '');
        setDestination(result.stations.find(station => station.name.startsWith('Bank'))?.id || '');
      } catch (failure) {if (!cancelled) setError(failure.message);}
      finally {if (!cancelled) setStationBusy(false);}
    })();
    return () => {cancelled = true;};
  }, [sample]);

  function clearJourney() {setData(null); setSelected(null); setError('');}
  function changeOrigin(value) {setOrigin(value); clearJourney();}
  function changeDestination(value) {setDestination(value); clearJourney();}
  function changePreference(value) {if (value !== preference) {setPreference(value); clearJourney();}}
  function changeSample(value) {if (!working) setSample(value);}
  async function submit(event) {
    event?.preventDefault();
    if (working || stationBusy || !origin || !destination) return;
    setBusy(true); clearJourney();
    try {
      const response = await fetch('/api/plan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({origin, destination, sample, preference})});
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Journey planning is unavailable. Try again shortly.');
      setData(result); setSelected(result.recommended_id);
    } catch (failure) {setError(failure.message);}
    finally {setBusy(false);}
  }
  function acceptChatJourney(result) {
    setData(result); setSelected(result.recommended_id); setOrigin(result.origin.id); setDestination(result.destination.id); setPreference(result.preference); setError('');
  }
  const route = data?.routes.find(item => item.id === selected);
  const optionNumber = data?.routes.findIndex(item => item.id === selected) + 1;

  return <>
    <header className="topbar"><a className="brand" href="/" aria-label="Waywise home"><span className="brand-mark"><Icon name="arrow"/></span>waywise<span className="brand-period">.</span></a><span className="header-context">London Transport Intelligence</span><div className="mode-control" role="group" aria-label="Data mode"><button type="button" aria-pressed={!sample} disabled={working} onClick={() => changeSample(false)}><i/>Live</button><button type="button" aria-pressed={sample} disabled={working} onClick={() => changeSample(true)}>Sample</button></div></header>
    <main className="app-shell">
      <div className="workspace-intro"><div><h1>A clearer way across London.</h1><p>Compare routes, check the context, choose your way.</p></div><span className="leave-now"><Icon name="clock"/>Leave now · London time</span></div>
      <div className="workspace">
        <JourneyControls {...{stations, origin, destination, preference, sample, stationBusy, working, busy, error}} onOrigin={changeOrigin} onDestination={changeDestination} onPreference={changePreference} onSwap={() => {setOrigin(destination); setDestination(origin); clearJourney();}} onSubmit={submit} onSample={changeSample}/>
        <JourneyMap data={data} selectedId={selected} onSelectRoute={setSelected} onRefresh={submit} working={working}/>
        <JourneyChat journey={data} onJourney={acceptChatJourney} busy={chatBusy} onBusyChange={setChatBusy} disabled={busy || stationBusy} sample={sample} onLive={() => changeSample(false)} aiConfigured={health?.openai_configured}/>
        <section className="route-results" aria-label="Journey options" aria-busy={busy}>
          {data ? <><div className="results-heading"><h2>Your options</h2><span aria-live="polite">{data.routes.length} route{data.routes.length === 1 ? '' : 's'} · {data.sample ? 'sample' : 'TfL'}</span></div><p className="journey-label">{data.origin.name} <span>→</span> {data.destination.name}</p>{data.routes.map((item, index) => <Fragment key={item.id}><RouteCard route={item} number={index + 1} selected={selected === item.id} recommended={data.recommended_id === item.id} preference={data.preference} disabled={working} onSelect={setSelected}/>{data.recommended_id === item.id && <Recommendation data={data} number={index + 1}/>}</Fragment>)}</> : <div className="empty-state panel"><span className="empty-icon"><Icon name={busy ? 'clock' : 'train'}/></span><h2>{busy ? 'Finding your options…' : 'Your journey starts here.'}</h2><p>{busy ? 'Retrieving route options, service context and endpoint forecasts.' : 'Use the station fields or ask in chat.'}</p>{!busy && <ol><li><span className="empty-number">01</span><span>Choose your stations.</span></li><li><span className="empty-number">02</span><span>Compare the returned options.</span></li><li><span className="empty-number">03</span><span>Select a route to view on the map.</span></li></ol>}</div>}
        </section>
      </div>
      {data && route && <Evidence data={data} route={route} optionNumber={optionNumber}/>}
      <footer><span>waywise. <span>Built for a better way through the city.</span></span><span>TfL · Open-Meteo · OpenAI <span className="footer-divider">/</span> Map © OpenStreetMap contributors</span></footer>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
