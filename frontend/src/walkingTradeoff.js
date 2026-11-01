export function walkingTradeoff(routes, budget) {
  const valid = (routes || []).filter(r => Number.isFinite(r.duration) && r.duration >= 0 && Number.isFinite(r.walking_minutes) && r.walking_minutes >= 0);
  const byTime = (a,b) => a.duration-b.duration || a.walking_minutes-b.walking_minutes || (a.changes || 0)-(b.changes || 0);
  const baseline = [...valid].sort(byTime)[0];
  if (!baseline) return null;
  const limit = Number.isFinite(budget) ? Math.max(0,Math.min(15,budget)) : 0;
  const candidates = valid.filter(r => r.duration <= baseline.duration+limit && r.walking_minutes < baseline.walking_minutes);
  const winner = candidates.sort((a,b) => a.walking_minutes-b.walking_minutes || byTime(a,b))[0] || baseline;
  return {baseline,winner,extraMinutes:winner.duration-baseline.duration,walkingSaved:baseline.walking_minutes-winner.walking_minutes,improved:winner.id!==baseline.id};
}
export function destinationRain(data, route) {
  const forecast = data?.weather?.find(item => item.location===data.destination?.name) || (data?.sample ? data.weather?.[0] : null);
  const arrival = Date.parse(route?.arrival);
  const hour = forecast?.hours?.find(item => {const t=Date.parse(item.time);return t<=arrival && arrival<t+3600000;});
  const value=hour?.rain_probability;
  return Number.isFinite(value) && value>=0 && value<=100 ? value : null;
}
