export const weatherVariables = {
  temperature_c: {label: 'Temperature', unit: '°C', stops: [-5, '#4059a7', 5, '#8ccbdd', 15, '#edd99e', 25, '#ed9967', 35, '#bd4d54'], legend: ['≤−5', '5', '15', '25', '≥35']},
  rain_probability: {label: 'Rain chance', unit: '%', stops: [0, '#e7f3fc', 20, '#acd7f5', 50, '#559fd8', 80, '#365ba5', 100, '#303b7e'], legend: ['0', '20', '50', '80', '100']},
};

export function weatherFeatures(data, variable, period) {
  const samples = new Map(data?.samples.map(sample => [sample.id, sample]) || []);
  return {type: 'FeatureCollection', features: (data?.cells || []).map(cell => {
    const sample = samples.get(cell.sample_id), value = sample?.hours[period]?.[variable] ?? null;
    const [west, south, east, north] = cell.bounds;
    return {type: 'Feature', properties: {cell_id: cell.id, value: value ?? 0, available: value !== null}, geometry: {type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]}};
  })};
}

export function affectedLeg(leg, route) {
  const ids = new Set(leg.lines.map(line => line.id));
  const statuses = (route.line_statuses || []).filter(line => ids.has(line.id));
  const descriptions = [...new Set(statuses.flatMap(line => line.statuses.map(status => status.description)).filter(value => !/^good service$|^no issues$/i.test(value)))];
  return {affected: descriptions.length > 0 || leg.disruptions.length > 0, descriptions, statuses};
}

export function journeyWarnings(data) {
  if (!data) return [];
  const warnings = data.warnings.map(warning => {
    const index = data.routes.findIndex(route => warning.startsWith(`${route.id}:`));
    return index < 0 ? warning : warning.replace(`${data.routes[index].id}:`, `Option ${index + 1}:`);
  });
  if (data.routes.some(route => route.legs.some(leg => leg.geometry.length < 2)) && !warnings.some(warning => /geometry/i.test(warning))) warnings.push('Some route sections have no geometry and are not drawn.');
  return warnings;
}
