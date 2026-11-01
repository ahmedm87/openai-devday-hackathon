import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherFeatures, affectedLeg, journeyWarnings} from './mapData.js';

test('zero forecasts remain available while missing values remain transparent', () => {
  const data = {cells: [{id:'a',sample_id:'one',bounds:[-1,51,0,52]}, {id:'b',sample_id:null,bounds:[0,51,1,52]}], samples:[{id:'one',hours:[{rain_probability:0,temperature_c:null}]}]};
  const rain = weatherFeatures(data,'rain_probability',0).features;
  assert.deepEqual(rain.map(item=>item.properties.available),[true,false]);
  assert.equal(rain[0].properties.value,0);
  assert.equal(weatherFeatures(data,'temperature_c',0).features[0].properties.available,false);
  assert.deepEqual(rain[0].geometry.coordinates[0],[[-1,51],[0,51],[0,52],[-1,52],[-1,51]]);
});

test('areas sharing a returned location use the same canonical forecast', () => {
  const data = {cells:[{id:'a',sample_id:'same',bounds:[0,0,1,1]},{id:'b',sample_id:'same',bounds:[1,0,2,1]}],samples:[{id:'same',hours:[{temperature_c:12},{temperature_c:9}]}]};
  assert.deepEqual(weatherFeatures(data,'temperature_c',1).features.map(item=>item.properties.value),[9,9]);
});

test('line warnings apply only to matching route legs; unavailable is not good service', () => {
  const leg = {lines:[{id:'jubilee'}],disruptions:[]};
  const route = {line_statuses:[{id:'northern',statuses:[{description:'Severe Delays'}]},{id:'jubilee',statuses:[{description:'Good Service'}]}]};
  assert.equal(affectedLeg(leg,route).affected,false);
  route.line_statuses[1].statuses[0].description='Minor Delays';
  assert.equal(affectedLeg(leg,route).affected,true);
  assert.deepEqual(affectedLeg(leg,{line_statuses:[]}).statuses,[]);
});

test('geometry warnings use displayed option numbers after preference ordering', () => {
  const data = {warnings:['route-1: geometry unavailable'],routes:[{id:'route-2',legs:[]},{id:'route-1',legs:[{geometry:[]}]}]};
  assert.deepEqual(journeyWarnings(data),['Option 2: geometry unavailable']);
});
