import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import './chat.css';
import SearchDock from './components/SearchDock.jsx';
import JourneyMap from './components/JourneyMap.jsx';
import LayerSwitcher from './components/LayerSwitcher.jsx';
import ResultsDock from './components/ResultsDock.jsx';
import useWeatherField from './hooks/useWeatherField.js';
import {journeyWarnings} from './mapData.js';
import {Icon, londonTime} from './ui.jsx';

function App() {
  const [sample, setSample] = useState(false), [stations, setStations] = useState([]);
  const [origin, setOrigin] = useState(''), [destination, setDestination] = useState('');
  const [preference, setPreference] = useState('fastest');
  const [data, setData] = useState(null), [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false), [chatBusy, setChatBusy] = useState(false);
  const [stationBusy, setStationBusy] = useState(true), [error, setError] = useState(''), [refreshFailed, setRefreshFailed] = useState(false);
  const [health, setHealth] = useState(null), [searchMode, setSearchMode] = useState('journey'), [searchOpen, setSearchOpen] = useState(false);
  const [activeContextLayer, setContext] = useState('none'), [routesVisible, setRoutesVisible] = useState(true);
  const [sheetState, setSheetState] = useState('collapsed'), [selectedFeature, setFeature] = useState(null);
  const [weatherVariable, setWeatherVariable] = useState('temperature_c'), [weatherPeriod, setWeatherPeriod] = useState(0), [weatherOpacity, setWeatherOpacity] = useState(.3);
  const [fitToken, setFitToken] = useState(0), [coverageToken, setCoverageToken] = useState(0), [visualHeight, setVisualHeight] = useState(null);
  const chatRef = useRef(null), locked = useRef(false), generation = useRef(0);
  const working = busy || chatBusy;
  const field = useWeatherField(activeContextLayer === 'weather', sample);

  useEffect(() => {
    const available = field.data?.available_variables;
    if (available?.length && !available.includes(weatherVariable)) setWeatherVariable(available[0]);
  }, [field.data, weatherVariable]);

  useEffect(() => {fetch('/api/health').then(response => response.json()).then(setHealth).catch(() => {});}, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => setVisualHeight(viewport?.height || window.innerHeight);
    update(); viewport?.addEventListener('resize', update);
    return () => viewport?.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    clearJourney(); setStations([]); setOrigin(''); setDestination(''); setStationBusy(true);
    (async () => {
      try {
        const response = await fetch(`/api/stations?sample=${sample}`, {signal: controller.signal});
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Station search is unavailable.');
        if (controller.signal.aborted) return;
        setStations(result.stations);
        setOrigin(result.stations.find(station => station.name.startsWith('Waterloo'))?.id || '');
        setDestination((result.stations.find(station => station.name === 'Bank Underground Station') || result.stations.find(station => station.name.startsWith('Bank')))?.id || '');
      } catch (failure) {if (!controller.signal.aborted) {setError(failure.message); setSearchOpen(true);}}
      finally {if (!controller.signal.aborted) setStationBusy(false);}
    })();
    return () => controller.abort();
  }, [sample]);

  function clearJourney() {generation.current++; setData(null); setSelected(null); setFeature(null); setSheetState('collapsed'); setError(''); setRefreshFailed(false);}
  function changeOrigin(value) {setOrigin(value); clearJourney();}
  function changeDestination(value) {setDestination(value); clearJourney();}
  function changePreference(value) {if (value !== preference) {setPreference(value); clearJourney();}}
  function changeSample(value) {if (!locked.current) {setSample(value); setFeature(null);}}
  function acquire() {if (locked.current) return false; locked.current = true; return true;}
  function release() {locked.current = false;}
  function acceptJourney(result) {
    setData(result); setSelected(result.recommended_id); setOrigin(result.origin.id); setDestination(result.destination.id); setPreference(result.preference);
    setError(''); setRefreshFailed(false); setFeature(null); setSearchOpen(false); setRoutesVisible(true); setSheetState('partial');
  }
  async function submit(event, refresh = false) {
    event?.preventDefault();
    if (stationBusy || !origin || !destination || !acquire()) return;
    const id = ++generation.current;
    setBusy(true); setError(''); setRefreshFailed(false); setFeature(null);
    if (!refresh) {setData(null); setSelected(null);}
    try {
      const response = await fetch('/api/plan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({origin, destination, sample, preference})});
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Journey planning is unavailable.');
      if (id === generation.current) acceptJourney(result);
    } catch (failure) {if (id === generation.current) {setError(failure.message); setRefreshFailed(refresh); if (!refresh) setSearchOpen(true);}}
    finally {if (id === generation.current) setBusy(false); release();}
  }
  function selectRoute(id) {setSelected(id); setFeature(null); setSheetState('partial');}
  function showFeature(feature) {setFeature(feature); setSearchOpen(false); setSheetState('expanded');}
  function changeContext(value) {setContext(value); setFeature(null);}
  function escape(event) {
    if (event.key !== 'Escape') return;
    if (searchOpen) {setSearchOpen(false); document.querySelector('.search-trigger, #map-question')?.focus();}
    else if (document.querySelector('.weather-settings[open]')) document.querySelector('.weather-settings[open]').open = false;
    else if (selectedFeature || sheetState === 'expanded') {setFeature(null); setSheetState(data ? 'partial' : 'collapsed');}
    else if (sheetState === 'partial') setSheetState('collapsed');
  }
  const route = data?.routes.find(item => item.id === selected);
  const warnings = journeyWarnings(data);
  const retrieved = data?.sources.find(source => source.name === 'TfL journeys')?.retrieved_at;

  return <main className={`map-app sheet-${sheetState}`} style={visualHeight ? {height: visualHeight} : undefined} onKeyDown={escape}>
    <h1 className="sr-only">Waywise — London journey explorer</h1>
    <JourneyMap {...{data, selectedId: selected, onSelectRoute: selectRoute, routesVisible, activeContextLayer, field, weatherVariable, weatherPeriod, weatherOpacity, fitToken, coverageToken}} onFeature={showFeature}/>
    <header className="app-header"><a className="brand" href="/" aria-label="Waywise home"><span className="brand-mark"><Icon name="arrow"/></span>waywise<span className="brand-period">.</span></a><div className="mode-control" role="group" aria-label="Data mode"><button type="button" aria-pressed={!sample} disabled={working} onClick={() => changeSample(false)}><i/>Live</button><button type="button" aria-pressed={sample} disabled={working} onClick={() => changeSample(true)}>Sample</button></div></header>
    <SearchDock mode={searchMode} onMode={setSearchMode} open={searchOpen} onOpen={value => {setSearchOpen(value); if (value) setSheetState('collapsed');}} journey={data} chatRef={chatRef} working={working}
      controlsProps={{stations, origin, destination, preference, sample, stationBusy, working, busy, error, onOrigin: changeOrigin, onDestination: changeDestination, onPreference: changePreference, onSwap: () => {setOrigin(destination); setDestination(origin); clearJourney();}, onSubmit: submit, onSample: changeSample}}
      chatProps={{onJourney: acceptJourney, busy: chatBusy, onBusyChange: setChatBusy, disabled: busy || stationBusy, sample, onLive: () => changeSample(false), aiConfigured: health?.openai_configured, acquire, release}}/>
    <LayerSwitcher {...{routesVisible, activeContextLayer, field, weatherVariable, weatherPeriod, weatherOpacity, data, route}} onRoutes={() => setRoutesVisible(value => !value)} onContext={changeContext} onVariable={value => {setWeatherVariable(value); setFeature(null);}} onPeriod={value => {setWeatherPeriod(value); setFeature(null);}} onOpacity={setWeatherOpacity} onCoverage={() => setCoverageToken(value => value + 1)}/>
    {(sample || warnings.length > 0 || error) && <aside className="global-notice" role="status" tabIndex={0}>{sample && <strong>Fictional sample · not live travel information.</strong>}{busy && data && <p>Updating · previous journey snapshot remains visible.</p>}{error && <p>{refreshFailed ? 'Refresh failed · previous snapshot retained. ' : ''}{error}</p>}{warnings.map((warning, index) => <p key={index}>{warning}</p>)}</aside>}
    {!data && !busy && !selectedFeature && <div className="empty-map-hint"><Icon name="pin"/><div><strong>London, your way.</strong><p>Choose Journey or Ask AI above to compare station-to-station routes.</p></div></div>}
    <button className="fit-journey" type="button" disabled={!data} onClick={() => {setSearchOpen(false); setFeature(null); setSheetState('partial'); setFitToken(value => value + 1);}}><Icon name="fit"/><span>Fit journey</span></button>
    <ResultsDock {...{data, route, selectedFeature, field, weatherVariable, weatherPeriod, sheetState, working, busy}} onState={setSheetState} onSelect={selectRoute} onRefresh={() => submit(null, true)} onCloseFeature={() => {selectedFeature?.returnFocus?.(); setFeature(null); if (!data) setSheetState('collapsed');}}/>
    <div className="snapshot-status" role="status"><span className={`snapshot-dot${sample ? ' sample' : ''}`}/><span>{sample ? 'Fictional sample' : busy && data ? 'Updating · previous snapshot' : refreshFailed ? 'Previous snapshot · refresh failed' : data ? `TfL retrieved ${londonTime(retrieved)} London` : 'London stations · leave now'}</span><span className="snapshot-credit"> · forecasts: Open-Meteo</span></div>
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
