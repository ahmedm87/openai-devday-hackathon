import React, {useEffect, useRef, useState} from 'react';
import maplibregl from 'maplibre-gl';
import {Icon, lineColor, londonTime} from '../ui.jsx';

const clickableLayers = ['route-selected-transit', 'route-selected-walk', 'route-alternative-transit', 'route-alternative-walk'];
const mapPadding = width => width < 500 ? {top: 108, right: 62, bottom: 45, left: 62} : {top: 100, right: 75, bottom: 60, left: 75};

function forecastPopup(station, weather, role, sample) {
  const content = document.createElement('div');
  content.className = 'forecast-popup';
  const title = document.createElement('strong');
  title.textContent = `${sample ? 'Sample forecast' : 'Forecast'} near ${role}`;
  content.append(title);
  const name = document.createElement('p');
  name.textContent = station.name;
  content.append(name);
  const hour = weather?.hours?.[0];
  const lines = hour ? [
    `${hour.temperature_c ?? '—'}°C · ${hour.rain_probability ?? '—'}% rain probability`,
    `${hour.wind_kmh ?? '—'} km/h wind`,
    `Forecast hour ${londonTime(hour.time)} · London time`,
    sample ? 'Fictional sample · not retrieved' : `Retrieved ${londonTime(weather.retrieved_at)} · London time`,
    weather.source,
  ] : ['Endpoint forecast unavailable.'];
  lines.filter(Boolean).forEach(text => {const line = document.createElement('p'); line.textContent = text; content.append(line);});
  return content;
}

function ServiceContext({data, route}) {
  if (!data || !route) return null;
  const walking = route.legs.every(leg => leg.mode === 'walking');
  const statuses = route.line_statuses || [];
  const descriptions = [...new Set(statuses.flatMap(line => line.statuses.map(status => status.description)))];
  const retrieved = data.sources.find(source => source.name === 'TfL line status')?.retrieved_at;
  return <details className="map-service" key={`${data.generated_at || 'sample'}-${route.id}`}>
    <summary><Icon name="train"/><span>Selected-route status<small>{data.sample ? 'Sample · not checked' : walking ? 'Walking route' : descriptions.join(' · ') || 'Status unavailable'}</small></span><Icon name="chevron"/></summary>
    <div className="map-service-content">
      <p className="context-time">{data.sample ? 'Fictional sample · no service check' : retrieved ? `Retrieved ${londonTime(retrieved)} · London time` : 'Retrieval time unavailable'}</p>
      {walking ? <p>No public transport line status applies to this walking option.</p> : statuses.length ? statuses.map(line => <div className="status-line" key={line.id}><strong>{line.name}</strong><div className="status-labels">{line.statuses.map((status, index) => <span key={index}>{status.description}</span>)}</div>{[...new Set(line.statuses.map(status => status.reason).filter(Boolean))].map((reason, index) => <p key={index}>{reason}</p>)}</div>) : <p>No line status was returned for this route.</p>}
      {route.legs.flatMap(leg => leg.disruptions).map((notice, index) => <p key={index}>{notice.description}</p>)}
      <p className="essential-uncertainty">Line-wide reports do not measure this journey’s delay.</p>
    </div>
  </details>;
}

export default function JourneyMap({data, selectedId, onSelectRoute, onRefresh, working}) {
  const container = useRef(null), mapRef = useRef(null), selectionRef = useRef(onSelectRoute);
  const boundsRef = useRef(null), lastFit = useRef(null);
  const [ready, setReady] = useState(false), [mapError, setMapError] = useState('');
  const [forecast, setForecast] = useState(null);
  const forecastPanel = useRef(null);
  const route = data?.routes.find(item => item.id === selectedId);
  selectionRef.current = onSelectRoute;

  useEffect(() => {
    if (!forecast) return;
    forecast.button.setAttribute('aria-expanded', 'true');
    forecastPanel.current?.focus();
    return () => forecast.button.setAttribute('aria-expanded', 'false');
  }, [forecast]);

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({container: container.current, style: 'https://tiles.openfreemap.org/styles/positron', center: [-0.115, 51.508], zoom: 12, attributionControl: true});
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-left');
      map.on('style.load', () => {setReady(true); setMapError('');});
      map.on('error', () => setMapError('Some map data could not load. Route facts remain available in the sidebar.'));
      const hits = point => {
        const layers = clickableLayers.filter(id => map.getLayer(id));
        // Keep thin and dashed paths usable without making the visible lines heavier.
        const radius = window.matchMedia('(pointer: coarse)').matches ? 12 : 6;
        const area = [[point.x - radius, point.y - radius], [point.x + radius, point.y + radius]];
        return layers.length ? map.queryRenderedFeatures(area, {layers}) : [];
      };
      map.on('click', event => {
        const id = hits(event.point)[0]?.properties?.route_id;
        if (id) selectionRef.current(id);
      });
      map.on('mousemove', event => {map.getCanvas().style.cursor = hits(event.point).length ? 'pointer' : '';});
      map.on('resize', () => {
        if (boundsRef.current) map.fitBounds(boundsRef.current, {padding: mapPadding(container.current.clientWidth), maxZoom: 14, duration: 0});
      });
    } catch {setMapError('Map unavailable in this browser. Route facts remain available in the sidebar.');}
    return () => {map?.remove(); mapRef.current = null;};
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const ordered = data ? [...data.routes.filter(item => item.id !== selectedId), ...data.routes.filter(item => item.id === selectedId)] : [];
    const features = ordered.flatMap(item => item.legs.filter(leg => leg.geometry.length > 1).map(leg => ({
      type: 'Feature', properties: {route_id: item.id, mode: leg.mode, selected: item.id === selectedId, color: lineColor(leg.mode === 'walking' ? 'walking' : leg.lines[0]?.name)},
      geometry: {type: 'LineString', coordinates: leg.geometry},
    })));
    const collection = {type: 'FeatureCollection', features};
    if (map.getSource('journeys')) map.getSource('journeys').setData(collection);
    else {
      map.addSource('journeys', {type: 'geojson', data: collection});
      const filter = (selected, walking) => ['all', ['==', ['get', 'selected'], selected], [walking ? '==' : '!=', ['get', 'mode'], 'walking']];
      const layout = {'line-cap': 'round', 'line-join': 'round'};
      map.addLayer({id: 'route-alternative-transit', type: 'line', source: 'journeys', filter: filter(false, false), layout, paint: {'line-color': ['get', 'color'], 'line-width': 5, 'line-opacity': .3}});
      map.addLayer({id: 'route-alternative-walk', type: 'line', source: 'journeys', filter: filter(false, true), layout, paint: {'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': .35, 'line-dasharray': [1.5, 1.5]}});
      map.addLayer({id: 'route-selected-halo', type: 'line', source: 'journeys', filter: ['==', ['get', 'selected'], true], layout, paint: {'line-color': '#ffffff', 'line-width': 10, 'line-opacity': .95}});
      map.addLayer({id: 'route-selected-transit', type: 'line', source: 'journeys', filter: filter(true, false), layout, paint: {'line-color': ['get', 'color'], 'line-width': 6}});
      map.addLayer({id: 'route-selected-walk', type: 'line', source: 'journeys', filter: filter(true, true), layout, paint: {'line-color': ['get', 'color'], 'line-width': 5, 'line-dasharray': [1.5, 1.5]}});
    }
    if (data && lastFit.current !== data) {
      const coords = [...features.flatMap(feature => feature.geometry.coordinates), [data.origin.lon, data.origin.lat], [data.destination.lon, data.destination.lat]];
      const bounds = new maplibregl.LngLatBounds();
      coords.forEach(coordinate => bounds.extend(coordinate));
      boundsRef.current = bounds;
      map.fitBounds(bounds, {padding: mapPadding(container.current.clientWidth), maxZoom: 14, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650});
      lastFit.current = data;
    }
    if (!data) {boundsRef.current = null; lastFit.current = null;}
  }, [data, selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    setForecast(null);
    if (!map || !ready || !data) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    const markers = [data.origin, data.destination].map((station, index) => {
      const role = index ? 'destination' : 'origin';
      const weather = data.weather.find(item => item.location === station.name) || (data.sample ? data.weather[0] : null);
      const hour = weather?.hours?.[0];
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'weather-marker';
      button.setAttribute('aria-label', `${data.sample ? 'Sample forecast' : 'Forecast'} near ${role}: ${station.name}`);
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-haspopup', 'dialog');
      button.title = `Forecast near ${role} · select for forecast hour and source`;
      const letter = document.createElement('span'); letter.className = 'endpoint-letter'; letter.textContent = index ? 'B' : 'A';
      const text = document.createElement('span'); text.className = 'endpoint-weather'; text.textContent = hour ? `${hour.temperature_c ?? '—'}° · ${hour.rain_probability ?? '—'}%` : 'Forecast —';
      button.append(letter, text);
      const coordinates = [station.lon, station.lat];
      const popup = new maplibregl.Popup({offset: 24, maxWidth: '250px'}).setLngLat(coordinates).setDOMContent(forecastPopup(station, weather, role, data.sample));
      popup.on('open', () => {
        button.setAttribute('aria-expanded', 'true');
        popup.getElement().setAttribute('role', 'dialog');
        popup.getElement().setAttribute('aria-label', `Forecast near ${role}`);
      });
      popup.on('close', () => button.setAttribute('aria-expanded', 'false'));
      // Native button activation handles Enter/Space once, as well as pointer clicks.
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (mobile.matches) {
          popup.remove();
          setForecast({station, weather, role, button});
          return;
        }
        if (popup.isOpen()) popup.remove(); else popup.addTo(map);
      });
      const marker = new maplibregl.Marker({element: button, anchor: 'bottom'}).setLngLat(coordinates).addTo(map);
      return {marker, popup};
    });
    const closeForecast = () => {setForecast(null); markers.forEach(({popup}) => popup.remove());};
    mobile.addEventListener('change', closeForecast);
    return () => {mobile.removeEventListener('change', closeForecast); markers.forEach(({marker, popup}) => {popup.remove(); marker.remove();});};
  }, [data, ready]);

  const journeysAt = data?.sources.find(source => source.name === 'TfL journeys')?.retrieved_at;
  const weatherAt = data?.weather.find(item => item.retrieved_at)?.retrieved_at;
  const warnings = data?.warnings.map(warning => {
    const index = data.routes.findIndex(item => warning.startsWith(`${item.id}:`));
    return index < 0 ? warning : warning.replace(`${data.routes[index].id}:`, `Option ${index + 1}:`);
  }) || [];
  const missingGeometry = data?.routes.some(item => item.legs.some(leg => leg.geometry.length < 2)) && !warnings.some(warning => /geometry/i.test(warning));
  return <section className="map-panel" aria-label="Journey map and context">
    <div className="map-panel-heading"><div><h2>Journey map</h2><p>{data ? data.sample ? 'Fictional sample · schematic paths' : `TfL journeys retrieved ${londonTime(journeysAt)} · London time` : 'Compare the ways across London'}</p></div>{data && <button className="refresh-button" type="button" disabled={working} onClick={onRefresh} aria-label="Refresh search"><Icon name="refresh"/><span>{working ? 'Updating…' : 'Refresh'}</span></button>}</div>
    <div className="map-frame"><div ref={container} className="map-canvas" aria-label="Map showing returned journey options"/><ServiceContext data={data} route={route}/>{mapError && <p className="map-error" role="status">{mapError}</p>}</div>
    {forecast && data && <section className="mobile-forecast" ref={forecastPanel} role="dialog" aria-label={`Forecast near ${forecast.role}`} tabIndex={-1}>
      <div className="mobile-forecast-heading"><h3>{data.sample ? 'Sample forecast' : 'Forecast'} near {forecast.role}</h3><button type="button" aria-label="Close forecast details" onClick={() => {forecast.button.focus(); setForecast(null);}}>×</button></div>
      <p>{forecast.station.name}</p>
      {forecast.weather?.hours?.[0] ? <><p className="forecast-hour">Forecast hour {londonTime(forecast.weather.hours[0].time)} · London time</p><p>{data.sample ? 'Fictional sample · not retrieved' : `Retrieved ${londonTime(forecast.weather.retrieved_at)} · London time`}</p><p>{forecast.weather.hours[0].temperature_c ?? '—'}°C · {forecast.weather.hours[0].rain_probability ?? '—'}% rain probability · {forecast.weather.hours[0].wind_kmh ?? '—'} km/h wind</p><small>{forecast.weather.source}</small></> : <p>Endpoint forecast unavailable.</p>}
    </section>}
    <div className="map-legend" aria-label="Route map legend"><span><i className="legend-selected"/>Selected</span><span><i className="legend-alternative"/>Alternatives · click to select</span><span><i className="legend-walking"/>Walking</span></div>
    {data && <><p className="map-forecast-note">A / B: forecast near origin / destination. Select a marker for its forecast hour and source.</p><div className="map-source-times"><span>{data.sample ? 'Synthetic example · not live' : weatherAt ? `Endpoint forecasts retrieved ${londonTime(weatherAt)}` : 'Endpoint forecasts unavailable'}</span><span>Retrieved snapshots · refresh for updates</span></div>{(warnings.length > 0 || missingGeometry) && <div className="map-warnings" role="status">{missingGeometry && <p>Some route sections have no geometry and are not drawn.</p>}{warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}</>}
  </section>;
}
