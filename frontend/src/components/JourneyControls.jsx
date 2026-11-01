import React from 'react';
import {Icon, preferences} from '../ui.jsx';

export default function JourneyControls({stations, origin, destination, preference, sample, stationBusy, working, busy, error, onOrigin, onDestination, onPreference, onSwap, onSubmit, onSample}) {
  return <section className="journey-controls panel" aria-label="Journey planner">
    <div className="controls-heading"><h2><Icon name="pin"/>Where are we heading?</h2><button className="swap-button" type="button" aria-label="Swap stations" title="Swap stations" disabled={sample || working || stationBusy} onClick={onSwap}><Icon name="swap"/></button></div>
    {sample && <p className="sample-warning">Fictional sample · routes, times and weather are not live.</p>}
    <form onSubmit={onSubmit}>
      <label className="station-field"><span><i className="station-dot"/>From</span><select value={origin} onChange={event => onOrigin(event.target.value)} disabled={stationBusy || working || sample} required aria-label="Origin station"><option value="">{stationBusy ? 'Loading stations…' : 'Choose a station'}</option>{stations.map(station => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
      <label className="station-field"><span><i className="station-dot destination"/>To</span><select value={destination} onChange={event => onDestination(event.target.value)} disabled={stationBusy || working || sample} required aria-label="Destination station"><option value="">Choose a station</option>{stations.map(station => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
      <div className="preference-control" role="group" aria-label="Journey preference">{preferences.map(([value, label]) => <button key={value} type="button" aria-pressed={preference === value} disabled={working} onClick={() => onPreference(value)}>{label}</button>)}</div>
      <button className="find-button" type="submit" disabled={working || stationBusy || !origin || !destination}>{busy ? 'Finding your way…' : 'Find my journey'}<Icon name="arrow"/></button>
    </form>
    <p className="controls-note">{stationBusy ? 'Connecting to TfL…' : sample ? 'Waterloo → Bank · synthetic example' : 'Station-to-station · TfL network'}</p>
    {error && <div className="request-error" role="alert"><strong>We couldn’t complete that request.</strong><p>{error}</p>{!sample && <button type="button" onClick={() => onSample(true)}>Try the labelled sample →</button>}</div>}
  </section>;
}
