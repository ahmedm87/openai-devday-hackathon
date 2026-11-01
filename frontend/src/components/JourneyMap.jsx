import React, {useEffect, useRef, useState} from 'react';
import maplibregl from 'maplibre-gl';
import {affectedLeg, weatherFeatures, weatherVariables} from '../mapData.js';
import {lineColor} from '../ui.jsx';

const routeLayers = ['route-selected-transit', 'route-selected-walk', 'route-alternative-transit', 'route-alternative-walk'];
const empty = () => ({type: 'FeatureCollection', features: []});

function overlayPadding(map) {
  const root = map.getContainer().closest('.map-app');
  const rect = root.getBoundingClientRect();
  const search = root.querySelector('[data-map-overlay="top"]')?.getBoundingClientRect();
  const context = root.querySelector('[data-map-overlay="context"]')?.getBoundingClientRect();
  const results = root.querySelector('[data-map-overlay="results"]')?.getBoundingClientRect();
  const mobile = rect.width <= 760;
  const top = mobile ? Math.max(search?.bottom || 0, context?.bottom || 0) - rect.top + 22 : (search?.bottom || rect.top + 90) - rect.top + 24;
  const bottom = results ? rect.bottom - results.top + 20 : 84;
  return {top: Math.min(top, rect.height * .4), bottom: Math.min(bottom, rect.height * .4), left: mobile ? 50 : 60, right: mobile ? 50 : Math.min((context?.width || 280) + 44, rect.width * .32)};
}

export default function JourneyMap({data, selectedId, onSelectRoute, onFeature, routesVisible, activeContextLayer, field, weatherVariable, weatherPeriod, weatherOpacity, fitToken, coverageToken}) {
  const container = useRef(null), mapRef = useRef(null), latest = useRef(null);
  const bounds = useRef(null), lastPlan = useRef(null);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  latest.current = {data, selectedId, onSelectRoute, onFeature, activeContextLayer, routesVisible};

  function fitJourney() {
    if (mapRef.current && bounds.current) mapRef.current.fitBounds(bounds.current, {padding: overlayPadding(mapRef.current), maxZoom: 14, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500});
  }

  useEffect(() => {
    let map, observer;
    try {
      map = new maplibregl.Map({container: container.current, style: 'https://tiles.openfreemap.org/styles/positron', center: [-.12, 51.515], zoom: 11.4, attributionControl: false, dragRotate: false, pitchWithRotate: false});
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
      map.addControl(new maplibregl.AttributionControl({compact: true}), 'bottom-right');
      map.on('style.load', () => {setReady(true); setError('');});
      map.on('error', () => setError('Some map data could not load. Journey facts remain available in Details.'));
      const hits = point => {
        const layers = routeLayers.filter(id => map.getLayer(id));
        const radius = window.matchMedia('(pointer: coarse)').matches ? 12 : 7;
        return layers.length ? map.queryRenderedFeatures([[point.x - radius, point.y - radius], [point.x + radius, point.y + radius]], {layers}) : [];
      };
      map.on('click', event => {
        const hit = hits(event.point)[0]?.properties;
        const state = latest.current;
        if (hit) {
          if (hit.route_id === state.selectedId && state.activeContextLayer === 'disruptions' && hit.affected) state.onFeature({type: 'disruption', index: Number(hit.leg_index)});
          else state.onSelectRoute(hit.route_id);
          return;
        }
        if (state.activeContextLayer === 'weather' && map.getLayer('weather-field')) {
          const cell = map.queryRenderedFeatures(event.point, {layers: ['weather-field']})[0];
          if (cell) state.onFeature({type: 'weather-cell', id: cell.properties.cell_id});
        }
      });
      map.on('mousemove', event => {
        const weatherHit = latest.current.activeContextLayer === 'weather' && map.getLayer('weather-field') && map.queryRenderedFeatures(event.point, {layers: ['weather-field']}).length;
        map.getCanvas().style.cursor = hits(event.point).length || weatherHit ? 'pointer' : '';
      });
      observer = new ResizeObserver(() => map.resize());
      observer.observe(container.current);
    } catch {setError('Map unavailable in this browser. Journey facts remain available in Details.');}
    return () => {observer?.disconnect(); map?.remove(); mapRef.current = null;};
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!map.getSource('journeys')) {
      map.addSource('journeys', {type: 'geojson', data: empty()});
      const filter = (selected, walking) => ['all', ['==', ['get', 'selected'], selected], [walking ? '==' : '!=', ['get', 'mode'], 'walking']];
      const layout = {'line-cap': 'round', 'line-join': 'round'};
      map.addLayer({id: 'route-alternative-transit', type: 'line', source: 'journeys', filter: filter(false, false), layout, paint: {'line-color': ['get', 'color'], 'line-width': 5, 'line-opacity': .3}});
      map.addLayer({id: 'route-alternative-walk', type: 'line', source: 'journeys', filter: filter(false, true), layout, paint: {'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': .35, 'line-dasharray': [1.5, 1.5]}});
      map.addLayer({id: 'route-warning', type: 'line', source: 'journeys', filter: ['all', ['==', ['get', 'selected'], true], ['==', ['get', 'affected'], true]], layout, paint: {'line-color': '#d58b25', 'line-width': 15, 'line-opacity': .65, 'line-dasharray': [1, 1]}});
      map.addLayer({id: 'route-selected-halo', type: 'line', source: 'journeys', filter: ['==', ['get', 'selected'], true], layout, paint: {'line-color': '#fff', 'line-width': 10, 'line-opacity': .95}});
      map.addLayer({id: 'route-selected-transit', type: 'line', source: 'journeys', filter: filter(true, false), layout, paint: {'line-color': ['get', 'color'], 'line-width': 6}});
      map.addLayer({id: 'route-selected-walk', type: 'line', source: 'journeys', filter: filter(true, true), layout, paint: {'line-color': ['get', 'color'], 'line-width': 5, 'line-dasharray': [1.5, 1.5]}});
      map.addSource('weather-cells', {type: 'geojson', data: empty()});
      map.addSource('weather-coverage', {type: 'geojson', data: empty()});
      const before = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
      map.addLayer({id: 'weather-field', type: 'fill', source: 'weather-cells', paint: {'fill-color': '#e7f3fc', 'fill-opacity': .3}}, before);
      map.addLayer({id: 'weather-cell-edges', type: 'line', source: 'weather-cells', filter: ['==', ['get', 'available'], true], paint: {'line-color': '#ffffff', 'line-width': .6, 'line-opacity': .25}}, before);
      map.addLayer({id: 'weather-missing', type: 'line', source: 'weather-cells', filter: ['==', ['get', 'available'], false], paint: {'line-color': '#805f46', 'line-width': 1, 'line-dasharray': [3, 3]}}, before);
      map.addLayer({id: 'weather-boundary', type: 'line', source: 'weather-coverage', paint: {'line-color': '#566d78', 'line-width': 1.5, 'line-dasharray': [3, 3]}}, before);
    }
    const ordered = data ? [...data.routes.filter(item => item.id !== selectedId), ...data.routes.filter(item => item.id === selectedId)] : [];
    const features = ordered.flatMap(route => route.legs.flatMap((leg,index) => leg.geometry.length < 2 ? [] : [{
      type: 'Feature', properties: {route_id: route.id, leg_index: index, mode: leg.mode, selected: route.id === selectedId, affected: affectedLeg(leg, route).affected, color: lineColor(leg.mode === 'walking' ? 'walking' : leg.lines[0]?.name)},
      geometry: {type: 'LineString', coordinates: leg.geometry},
    }]));
    map.getSource('journeys').setData({type: 'FeatureCollection', features});
    [...routeLayers, 'route-selected-halo'].forEach(id => map.setLayoutProperty(id, 'visibility', routesVisible ? 'visible' : 'none'));
    map.setLayoutProperty('route-warning', 'visibility', routesVisible && activeContextLayer === 'disruptions' ? 'visible' : 'none');
    if (data && lastPlan.current !== data) {
      const next = new maplibregl.LngLatBounds();
      [...features.flatMap(feature => feature.geometry.coordinates), [data.origin.lon, data.origin.lat], [data.destination.lon, data.destination.lat]].forEach(coordinate => next.extend(coordinate));
      bounds.current = next; lastPlan.current = data;
      const frame = requestAnimationFrame(fitJourney);
      return () => cancelAnimationFrame(frame);
    }
    if (!data) {bounds.current = null; lastPlan.current = null;}
  }, [data, selectedId, routesVisible, activeContextLayer, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getSource('weather-cells')) return;
    const visible = activeContextLayer === 'weather' && field.status === 'ready';
    map.getSource('weather-cells').setData(weatherFeatures(visible ? field.data : null, weatherVariable, weatherPeriod));
    const area = field.data?.coverage_bounds;
    map.getSource('weather-coverage').setData(area ? {type: 'FeatureCollection', features: [{type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[[area[0],area[1]],[area[2],area[1]],[area[2],area[3]],[area[0],area[3]],[area[0],area[1]]]]}}]} : empty());
    ['weather-field', 'weather-cell-edges', 'weather-missing', 'weather-boundary'].forEach(id => map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'));
    const scale = ['interpolate', ['linear'], ['get', 'value'], ...weatherVariables[weatherVariable].stops];
    map.setPaintProperty('weather-field', 'fill-color', ['case', ['get', 'available'], scale, 'rgba(0,0,0,0)']);
    map.setPaintProperty('weather-field', 'fill-opacity', ['case', ['get', 'available'], weatherVariable === 'rain_probability' ? ['*', weatherOpacity, ['interpolate', ['linear'], ['get','value'], 0, .3, 100, 1]] : weatherOpacity, 0]);
  }, [ready, activeContextLayer, field.status, field.data, weatherVariable, weatherPeriod, weatherOpacity]);

  useEffect(() => {if (fitToken > 0) requestAnimationFrame(fitJourney);}, [fitToken]);
  useEffect(() => {
    const map = mapRef.current, area = field.data?.coverage_bounds;
    if (coverageToken && map && ready && area) map.fitBounds([[area[0],area[1]],[area[2],area[3]]], {padding: overlayPadding(map), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500});
  }, [coverageToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    const markers = [];
    if (routesVisible || activeContextLayer === 'weather') {
      [data.origin, data.destination].forEach((station,index) => {
        const weather = data.weather.find(item => item.location === station.name) || (data.sample ? data.weather[0] : null);
        const hour = weather?.hours[0];
        const button = document.createElement('button');
        button.type = 'button'; button.className = `endpoint-marker${activeContextLayer === 'weather' ? ' with-forecast' : ''}`;
        button.setAttribute('aria-label', `${activeContextLayer === 'weather' ? 'Forecast near' : 'Journey'} ${index ? 'destination' : 'origin'}: ${station.name}`);
        const letter = document.createElement('span'); letter.className = 'endpoint-letter'; letter.textContent = index ? 'B' : 'A'; button.append(letter);
        if (activeContextLayer === 'weather') {const text = document.createElement('span'); text.textContent = hour ? `☂ ${hour.temperature_c ?? '—'}°C · ${hour.rain_probability ?? '—'}%` : 'Forecast unavailable'; button.append(text);}
        button.addEventListener('click', event => {event.stopPropagation(); latest.current.onFeature({type: 'endpoint', index, returnFocus: () => {if (button.isConnected) button.focus();}});});
        markers.push(new maplibregl.Marker({element: button, anchor: 'bottom'}).setLngLat([station.lon,station.lat]).addTo(map));
      });
    }
    const route = data.routes.find(item => item.id === selectedId);
    if (routesVisible && activeContextLayer === 'disruptions' && route) {
      route.legs.forEach((leg,index) => {
        const context = affectedLeg(leg, route);
        if (!context.affected || leg.geometry.length < 2) return;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'disruption-marker';
        button.textContent = `△ ${context.descriptions.join(' · ') || 'Route notice'}`;
        button.setAttribute('aria-label', `Line context: ${context.descriptions.join(', ') || 'route notice'}`);
        button.addEventListener('click', event => {event.stopPropagation(); latest.current.onFeature({type: 'disruption', index, returnFocus: () => {if (button.isConnected) button.focus();}});});
        markers.push(new maplibregl.Marker({element: button}).setLngLat(leg.geometry[Math.floor((leg.geometry.length - 1) / 2)]).addTo(map));
      });
    }
    return () => markers.forEach(marker => marker.remove());
  }, [data, selectedId, activeContextLayer, routesVisible, ready]);

  return <section className="map-background" aria-label="London journey map"><div ref={container} className="map-canvas"/>{error && <p className="map-error" role="status">{error}</p>}<div className="map-key" aria-label="Map legend"><span><i/>Selected</span><span><i className="muted"/>Alternative</span><span><i className="walking"/>Walking</span>{activeContextLayer === 'weather' && <span>Forecasts · tap a point or sampling area</span>}</div></section>;
}
