import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import JourneyChat from './JourneyChat.jsx';
import './chat.css';

const londonTime = value => {
  if (!value) return 'Unavailable';
  // TfL can return naive London timestamps. Never interpret those in the browser's timezone.
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : null;
  return normalized ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour:'2-digit', minute:'2-digit' }).format(new Date(normalized)) : value.slice(11,16);
};
const lineColor = name => ({jubilee:'#7b858b',northern:'#263b43','waterloo & city':'#52b9aa',central:'#dc5349',victoria:'#45a4d1',district:'#2d8761',piccadilly:'#4b61b5',bakerloo:'#a57957',walking:'#c77840'}[name?.toLowerCase()] || '#677bc3');
async function api(path, options) {
  const response = await fetch(path, options);
  let body;
  try { body = await response.json(); } catch { throw new Error('The server returned an unexpected response. Check that FastAPI is running.'); }
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Please check your station selections and try again.');
  return body;
}
function Icon({name, ...props}) {
  const paths = {arrow:'M4 12h16m-6-6 6 6-6 6',pin:'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Zm-8-3v6m-3-3h6',train:'M6 3h12v13H6zM6 10h12M9 19l-2 3m8-3 2 3M9 13h.01M15 13h.01',rain:'M7 15a4 4 0 1 1 0-8 6 6 0 0 1 11 2 3 3 0 0 1 0 6M8 18l-1 3m6-3-1 3m6-3-1 3',check:'m5 12 4 4L19 6',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',swap:'M4 8h15l-4-4M20 16H5l4 4'};
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.pin}/></svg>;
}
function JourneyMap({data, route}) {
  const container = useRef(null), mapRef = useRef(null);
  const [ready, setReady] = useState(false), [mapError, setMapError] = useState('');
  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({container:container.current,style:'https://tiles.openfreemap.org/styles/positron',center:[-0.115,51.508],zoom:12,attributionControl:true});
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'bottom-right');
      map.on('style.load',()=>{setReady(true);setMapError('');});
      map.on('error',()=>setMapError('Some map tiles could not load. Route details remain available.'));
    } catch { setMapError('Map unavailable in this browser. Route details remain available.'); }
    return ()=> { map?.remove(); mapRef.current=null; };
  }, []);
  useEffect(()=>{
    const map = mapRef.current;
    if (!map || !ready) return;
    const features = (route?.legs || []).filter(l=>l.geometry.length>1).map(leg=>({type:'Feature',properties:{color:lineColor(leg.mode === 'walking' ? 'walking' : leg.lines[0]?.name),walking:leg.mode==='walking'},geometry:{type:'LineString',coordinates:leg.geometry}}));
    const lines = {type:'FeatureCollection',features};
    if (map.getSource('journey')) map.getSource('journey').setData(lines);
    else {
      map.addSource('journey',{type:'geojson',data:lines});
      map.addLayer({id:'journey-halo',type:'line',source:'journey',paint:{'line-width':10,'line-color':'#ffffff','line-opacity':0.9},layout:{'line-cap':'round','line-join':'round'}});
      map.addLayer({id:'journey-lines',type:'line',source:'journey',paint:{'line-width':5,'line-color':['get','color']},layout:{'line-cap':'round','line-join':'round'}});
    }
    const points = data ? [data.origin,data.destination].map((s,i)=>({type:'Feature',properties:{label:i?'B':'A'},geometry:{type:'Point',coordinates:[s.lon,s.lat]}})) : [];
    const endpoints = {type:'FeatureCollection',features:points};
    if (map.getSource('endpoints')) map.getSource('endpoints').setData(endpoints);
    else {
      map.addSource('endpoints',{type:'geojson',data:endpoints});
      map.addLayer({id:'endpoint-dots',type:'circle',source:'endpoints',paint:{'circle-radius':10,'circle-color':'#102c35','circle-stroke-color':'white','circle-stroke-width':3}});
    }
    const coords = [...features.flatMap(f=>f.geometry.coordinates),...points.map(p=>p.geometry.coordinates)];
    if (coords.length) { const bounds=new maplibregl.LngLatBounds(); coords.forEach(c=>bounds.extend(c)); map.fitBounds(bounds,{padding:75,maxZoom:14,duration:700}); }
  }, [data, route, ready]);
  return <div className="map-shell"><div ref={container} className="map" aria-label="Map showing the selected London journey"/>
    <div className="map-heading"><span className="dot"/>LONDON <span className="map-heading-sub">{data ? 'Your journey, mapped' : 'A better way across the city'}</span></div>
    <div className="map-caption">{data?.sample ? 'SAMPLE · Schematic routes, not live service' : route ? 'Selected route · Geometry from TfL where available' : 'Choose your stations to see route options'}</div>
    {mapError && <div className="map-error" role="status">{mapError}</div>}
  </div>;
}
function App() {
  const [sample,setSample]=useState(false),[stations,setStations]=useState([]),[origin,setOrigin]=useState(''),[destination,setDestination]=useState('');
  const [data,setData]=useState(null),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[stationBusy,setStationBusy]=useState(true),[error,setError]=useState('');
  const [health,setHealth]=useState(null);
  const [preference,setPreference]=useState('fastest'),[chatBusy,setChatBusy]=useState(false);
  const working=busy||chatBusy;
  useEffect(()=>{api('/api/health').then(setHealth).catch(()=>{});},[]);
  useEffect(()=>{
    let cancelled=false;
    setData(null);setError('');setStations([]);setOrigin('');setDestination('');setStationBusy(true);
    api('/api/stations?sample='+sample).then(result=>{
      if(cancelled)return;
      setStations(result.stations);
      const find = name => result.stations.find(s=>s.name.toLowerCase().startsWith(name))?.id || '';
      setOrigin(find('waterloo'));setDestination(find('bank'));
    }).catch(err=>{if(!cancelled)setError(err.message);}).finally(()=>{if(!cancelled)setStationBusy(false);});
    return ()=>{cancelled=true;};
  },[sample]);
  async function submit(event) {
    event.preventDefault();setBusy(true);setError('');setData(null);
    try {
      const result=await api('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin,destination,sample,preference})});
      setData(result);setSelected(result.recommended_id);
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  const route=data?.routes.find(r=>r.id===selected);
  function acceptChatJourney(result) {
    setData(result);setSelected(result.recommended_id);setOrigin(result.origin.id);setDestination(result.destination.id);
    setPreference(result.preference||'fastest');setError('');
  }
  const lines=r=>[...new Set(r.legs.flatMap(l=>l.lines.map(n=>n.name)).filter(Boolean))];
  return <><header className="topbar"><a className="brand" href="/" aria-label="Waywise home"><span className="brand-mark"><Icon name="arrow"/></span>waywise<span className="brand-city">LONDON</span></a><div className="header-right"><span className="desktop-only">A little context. A better commute.</span><span className="edition">HACKATHON EDITION ↗</span></div></header>
    <main><section className="intro"><div><div className="eyebrow">LONDON TRANSPORT INTELLIGENCE</div><h1>Your city.<br/><em>Your better way.</em></h1><p>Routes, disruptions and the weather.<br/>One considered journey across London.</p></div><div className="intro-note"><span className="note-number">01 — 03</span><span>Plan.<br/>Compare.<br/>Go with context.</span></div></section>
    <section className="planner" aria-label="Journey planner"><div className="form-header"><span className="section-tag"><Icon name="pin"/>WHERE ARE WE HEADING?</span><div className="mode-switch" aria-label="Data mode"><button type="button" className={!sample?'active':''} disabled={working} onClick={()=>setSample(false)}>Live journey</button><button type="button" className={sample?'active':''} disabled={working} onClick={()=>setSample(true)}>Sample demo</button></div></div>
      {sample && <div className="sample-banner">SAMPLE MODE · Fictional routes, times and weather. No live API or AI calls.</div>}
      <form onSubmit={submit} className="journey-form"><label><span><i className="station-dot"/>FROM</span><select value={origin} onChange={e=>{setOrigin(e.target.value);setData(null);}} disabled={stationBusy||working||sample} required aria-label="Origin station"><option value="">{stationBusy?'Loading stations…':'Choose a station'}</option>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <button className="swap" type="button" title="Swap stations" aria-label="Swap stations" disabled={sample||working||stationBusy} onClick={()=>{setOrigin(destination);setDestination(origin);setData(null);}}><Icon name="swap"/></button>
      <label><span><i className="station-dot destination"/>TO</span><select value={destination} onChange={e=>{setDestination(e.target.value);setData(null);}} disabled={stationBusy||working||sample} required aria-label="Destination station"><option value="">Choose a station</option>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <div className="departure"><span>DEPARTURE</span><strong><Icon name="clock"/>Leave now</strong><small>London local time</small></div>
      <button className="plan-button" disabled={working||stationBusy||!origin||!destination}>{busy?'Finding your way…':'Find my journey'}<Icon name="arrow"/></button></form>
      <div className="preference-row"><span>PRIORITISE</span><div aria-label="Journey preference">{[['fastest','Quickest'],['less_walking','Less walking'],['fewer_changes','Fewer changes']].map(([value,label])=><button key={value} type="button" aria-pressed={preference===value} className={preference===value?'active':''} disabled={working} onClick={()=>{setPreference(value);setData(null);}}>{label}</button>)}</div></div>
      <div className="form-footer"><span>{stationBusy?'Connecting to TfL…':sample?'Explore a fictional Waterloo → Bank journey':'Station-to-station · TfL network'}</span><span className="key-status">{health?.openai_configured?'AI configured':'AI explanation awaiting API key'}</span></div>
    </section>
    {error&&<div className="error" role="alert"><strong>We couldn’t complete that request.</strong> {error} {!sample&&<button onClick={()=>setSample(true)}>Try the sample demo →</button>}</div>}
    <JourneyChat journey={data} onJourney={acceptChatJourney} busy={chatBusy} onBusyChange={setChatBusy} disabled={busy||stationBusy} sample={sample} onLive={()=>setSample(false)}/>
    <section className="workspace"><div className="results"><div className="results-heading"><h2>{data?'Your options':'A journey that makes sense.'}</h2><span>{data?`${data.routes.length} ROUTES`:'THE WHOLE PICTURE'}</span></div>
      {busy?<div className="empty-state loading" role="status"><span className="loader"/><h3>Connecting the dots.</h3><p>Checking journeys, service status and endpoint weather. The explanation follows.</p></div>:!data?<div className="empty-state"><div className="empty-icon"><Icon name="train"/></div><h3>More than the quickest route.</h3><p>See the travel time, the changes and the conditions that matter before you leave.</p><div className="feature-row"><span>01 <b>Compare routes</b></span><span>02 <b>Check conditions</b></span><span>03 <b>Understand why</b></span></div></div>:<>
      <div className="route-list">{data.routes.map((r,i)=><button key={r.id} className={'route-card '+(selected===r.id?'selected':'')} onClick={()=>setSelected(r.id)} aria-pressed={selected===r.id}><div className="route-top"><span className="route-index">0{i+1}</span><strong>{r.duration}<small> min</small></strong><span className={r.id===data.recommended_id?'badge':'route-time'}>{r.id===data.recommended_id?<><Icon name="check"/>{({fastest:'QUICKEST',less_walking:'LESS WALKING',fewer_changes:'FEWER CHANGES'})[data.preference||'fastest']}</>:londonTime(r.departure)+' → '+londonTime(r.arrival)}</span></div><div className="line-pills">{lines(r).length?lines(r).map(name=><span key={name} style={{'--line-color':lineColor(name)}}>{name}</span>):<span style={{'--line-color':lineColor('walking')}}>Walk</span>}</div><div className="route-bottom"><span>{r.changes===0?'No changes':`${r.changes} change${r.changes===1?'':'s'}`} · {r.walking_minutes} min walking reported</span><span className="route-select">{selected===r.id?'Selected':'View route'} ↗</span></div></button>)}</div>
      <div className="ranking-note">{data.ranking_rule}</div>
      </>}
      {data&&<div className="explanation"><div className="explanation-title"><Icon name="spark"/><h3>{data.explanation.status==='available'?'AI perspective':data.sample?'Sample perspective':'Recommendation context'}</h3><span>INTERPRETATION</span></div><p>{data.explanation.summary}</p>{data.explanation.tradeoffs.map((t,i)=><p className="small" key={i}>{t}</p>)}{data.explanation.limitations.map((t,i)=><p className="limitation" key={i}>{t}</p>)}</div>}
    </div><JourneyMap data={data} route={route}/></section>
    {data&&<section className="evidence"><div className="evidence-column"><div className="eyebrow">RETRIEVED FACTS {sample?'· FICTIONAL SAMPLE':''}</div><h2>The conditions around your journey.</h2><div className="weather-grid">{data.weather.length?data.weather.map((w,i)=>{const h=w.hours[0];return <article className="weather-card" key={i}><Icon name="rain"/><div><h3>{w.location}</h3><strong>{h.temperature_c??'—'}° <span>· {h.rain_probability??'—'}% rain probability</span></strong><p>{h.wind_kmh??'—'} km/h wind · Forecast hour {londonTime(h.time)}</p>{w.hours.length>1&&<p>{w.hours.length} hourly periods overlap the journey; showing the first.</p>}<small>{w.source} · {w.retrieved_at?'Retrieved '+londonTime(w.retrieved_at):'Synthetic sample; not retrieved'}</small></div></article>;}):<p>Weather data is unavailable.</p>}</div><p className="fine-print">Forecasts cover points near the origin and destination, not every part of the route. Rain probability is not a guarantee of rain.</p></div>
    <div className="evidence-column status-column"><div className="eyebrow">SELECTED ROUTE · SERVICE CONTEXT</div><h2>Before you step out.</h2>{route.line_statuses.map(s=><div className="status-row" key={s.id}><strong>{s.name}</strong>{s.statuses.length?s.statuses.map((st,i)=><div key={i}><span>{st.description}</span>{st.reason&&<p>{st.reason}</p>}</div>):<p>Status not supplied.</p>}</div>)}{!route.status_available&&<p className="limitation">Line status is unavailable{sample?' in the synthetic sample':''}.</p>}{route.legs.flatMap(l=>l.disruptions).map((d,i)=><p key={i} className="limitation">{d.description}</p>)}<p className="fine-print">Line-level status is context and does not measure the delay to this particular journey.</p></div></section>}
    {route&&<section className="journey-detail"><div className="eyebrow">SELECTED ROUTE · JOURNEY STEPS</div><ol>{route.legs.map((leg,i)=><li key={i}><span style={{background:lineColor(leg.mode==='walking'?'walking':leg.lines[0]?.name)}}/ ><div><strong>{leg.instruction||`${leg.from} → ${leg.to}`}</strong><p>{leg.from} → {leg.to} · {leg.duration} min</p></div></li>)}</ol></section>}
    {data&&<section className="provenance"><h3>Sources & limitations</h3>{data.sources.map((s,i)=><p key={i}>{s.name}: {s.retrieved_at?'retrieved '+londonTime(s.retrieved_at)+' London time':'unavailable'} · Provider update time: {s.provider_updated_at||'not supplied'}</p>)}{data.warnings.map((w,i)=><p className="limitation" key={i}>{w}</p>)}{data.generated_at&&<p>Response assembled {new Date(data.generated_at).toLocaleString('en-GB',{timeZone:'Europe/London'})} London time. Refresh your search for current information.</p>}</section>}
    <footer><a className="brand footer-brand" href="/">waywise<span className="brand-city">LONDON</span></a><span>Built for the city. Grounded in the data.</span><div><a href="https://tfl.gov.uk/" target="_blank" rel="noreferrer">Transport for London ↗</a><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo ↗</a></div></footer></main></>;
}
createRoot(document.getElementById('root')).render(<App/>);
