import React from 'react';

export const preferences = [['fastest', 'Quickest'], ['less_walking', 'Less walking'], ['fewer_changes', 'Fewer changes']];

export function londonTime(value) {
  if (!value) return 'Unavailable';
  if (!/(?:Z|[+-]\d\d:\d\d)$/.test(value)) return value.slice(11, 16);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export const lineColor = name => ({
  jubilee: '#7b858b', northern: '#263b43', 'waterloo & city': '#52b9aa', central: '#dc5349',
  victoria: '#45a4d1', district: '#2d8761', piccadilly: '#4b61b5', bakerloo: '#a57957',
  circle: '#d8b82b', 'hammersmith & city': '#ca8295', metropolitan: '#922b63',
  dlr: '#299e9b', elizabeth: '#7962b5', 'elizabeth line': '#7962b5', walking: '#c77840',
}[name?.toLowerCase()] || '#677bc3');

export function londonStamp(value) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function Icon({name, ...props}) {
  const paths = {
    arrow: 'M4 12h16m-6-6 6 6-6 6', pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Zm-8-3v6m-3-3h6',
    train: 'M6 3h12v13H6zM6 10h12M9 19l-2 3m8-3 2 3M9 13h.01M15 13h.01',
    rain: 'M7 15a4 4 0 1 1 0-8 6 6 0 0 1 11 2 3 3 0 0 1 0 6M8 18l-1 3m6-3-1 3m6-3-1 3',
    check: 'm5 12 4 4L19 6', clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
    swap: 'M4 8h15l-4-4M20 16H5l4 4', refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M18 17a7 7 0 0 1-12 2l-2-2',
    chevron: 'm6 9 6 6 6-6',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    layers: 'm12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 17l10 5 10-5',
    fit: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
    warning: 'm12 3 10 18H2ZM12 9v5m0 3h.01',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.pin}/></svg>;
}
