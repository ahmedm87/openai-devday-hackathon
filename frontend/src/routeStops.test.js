import test from 'node:test';import assert from 'node:assert/strict';
import {selectedStopFeatures} from './routeStops.js';
test('selected stop features merge the interchange and omit unknown map positions',()=>{
  const stop=(id,lon)=>({id,name:id,lat:51.5,lon});
  const result=selectedStopFeatures({id:'r',legs:[{mode:'tube',stops:[stop('A',-.1),stop('X',-.09)]},{mode:'tube',stops:[stop('X',-.091),{id:'unknown',name:'Unknown'},stop('B',-.08)]}]});
  assert.deepEqual(result.features.map(f=>f.properties.name),['A','X','B']);assert.equal(result.features[1].properties.kind,'change');assert.deepEqual(result.features[1].geometry.coordinates,[-.091,51.5]);assert.equal(selectedStopFeatures(null).features.length,0);
});
