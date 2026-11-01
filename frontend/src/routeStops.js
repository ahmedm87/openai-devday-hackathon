export function selectedStopFeatures(route) {
  const features=[]; let transit=0;
  for(const [legIndex,leg] of (route?.legs || []).entries()) {
    const change=leg.mode!=='walking' && transit++>0;
    for(const [i,stop] of (leg.stops || []).entries()) {
      if(!Number.isFinite(stop.lon)||!Number.isFinite(stop.lat))continue;
      const previous=features.at(-1), same=previous && (stop.id && previous.properties.stop_id ? stop.id===previous.properties.stop_id : stop.name===previous.properties.name);
      const kind=i===0 && change?'change':'stop';
      if(same) {if(kind==='change'){previous.properties.kind=kind;previous.geometry.coordinates=[stop.lon,stop.lat];}continue;}
      features.push({type:'Feature',geometry:{type:'Point',coordinates:[stop.lon,stop.lat]},properties:{route_id:route.id,stop_id:stop.id,name:stop.name,label:stop.name.replace(/ Underground Station$| Rail Station$/,''),kind,leg:legIndex}});
    }
  }
  return {type:'FeatureCollection',features};
}
