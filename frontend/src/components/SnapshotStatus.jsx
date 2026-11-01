import React from 'react';
import {londonTime} from '../ui.jsx';

export default function SnapshotStatus({data, sample, working, refreshFailed}) {
  const retrieved = data?.sources.find(source => source.name === 'TfL journeys')?.retrieved_at;
  const text = sample ? 'Fictional sample' : working && data ? 'Updating · previous snapshot' : refreshFailed ? 'Previous snapshot · refresh failed' : data ? `TfL retrieved ${londonTime(retrieved)} London` : 'London stations · leave now';
  return <div className="snapshot-status" role="status"><span className={`snapshot-dot${sample ? ' sample' : ''}`}/><span>{text}</span><span className="snapshot-credit">{sample ? ' · synthetic data' : ' · forecasts: Open-Meteo'}</span></div>;
}
