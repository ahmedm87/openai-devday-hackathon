import React from 'react';

export default function MapLegend({context}) {
  return <div className="map-key" aria-label="Map legend"><span><i/>Selected</span><span><i className="muted"/>Alternative</span><span><i className="walking"/>Walking</span>{context === 'weather' && <span>Forecasts · tap a point or sampling area</span>}</div>;
}
