import React from 'react';
import {Icon, preferences} from '../ui.jsx';
import StationSearch from './StationSearch.jsx';

export default function JourneyControls({stations, origin, destination, preference, sample, stationBusy, working, busy, error, onOrigin, onDestination, onPreference, onSwap, onSubmit, onSample}) {
  return <section className="journey-controls" aria-label="Journey planner">
    <form onSubmit={onSubmit}>
      <StationSearch label="From station" stations={stations} value={origin} onChange={onOrigin} disabled={stationBusy || working || sample}/>
      <div className="swap-row"><span>London stations only</span><button className="text-button" type="button" disabled={sample || working || stationBusy} onClick={onSwap}><Icon name="swap"/>Swap</button></div>
      <StationSearch label="To station" stations={stations} value={destination} onChange={onDestination} disabled={stationBusy || working || sample}/>
      <div className="preference-control" role="group" aria-label="Journey preference">{preferences.map(([value, label]) => <button key={value} type="button" aria-pressed={preference === value} disabled={working} onClick={() => onPreference(value)}>{label}</button>)}</div>
      <button className="find-button" type="submit" disabled={working || stationBusy || !origin || !destination}>{busy ? 'Finding your way…' : 'Find journey'}<Icon name="arrow"/></button>
    </form>
    <p className="controls-note">{stationBusy ? 'Loading TfL stations…' : sample ? 'Fictional Waterloo → Bank example' : 'Leave now · times shown in London time'}</p>
    {error && <p className="request-error" role="alert">{error}</p>}
    {!sample && error && <button className="text-button" type="button" disabled={working} onClick={() => onSample(true)}>Try the labelled sample →</button>}
  </section>;
}
