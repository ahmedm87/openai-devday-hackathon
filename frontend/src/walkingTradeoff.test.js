import test from 'node:test';
import assert from 'node:assert/strict';
import {walkingTradeoff,destinationRain} from './walkingTradeoff.js';
const routes=[{id:'fast',duration:16,walking_minutes:12,changes:0},{id:'dry',duration:20,walking_minutes:4,changes:1},{id:'least',duration:25,walking_minutes:0,changes:2}];
test('the budget switches the winner at the actual extra-duration threshold',()=>{
  assert.equal(walkingTradeoff(routes,3).winner.id,'fast');
  const c=walkingTradeoff(routes,4);assert.equal(c.winner.id,'dry');assert.equal(c.extraMinutes,4);assert.equal(c.walkingSaved,8);
  assert.equal(walkingTradeoff(routes,9).winner.id,'least');
});
test('zero walking and missing data never produce invented savings',()=>{
  assert.equal(walkingTradeoff([{id:'zero',duration:10,walking_minutes:0},...routes],15).improved,false);
  assert.equal(walkingTradeoff([],5),null);assert.equal(walkingTradeoff([{id:'missing',duration:2}],5),null);
});
test('duration ties use the least walking baseline; equal savings prefer less time',()=>{
  const c=walkingTradeoff([...routes,{id:'tie',duration:16,walking_minutes:10},{id:'slower',duration:21,walking_minutes:4}],5);
  assert.equal(c.baseline.id,'tie');assert.equal(c.winner.id,'dry');assert.equal(c.walkingSaved,6);
});
test('destination rain covers arrival, preserves zero and excludes stale hours',()=>{
  const data={destination:{name:'Bank'},weather:[{location:'Origin',hours:[{time:'2026-11-01T16:00:00Z',rain_probability:99}]},{location:'Bank',hours:[{time:'2026-11-01T16:00:00Z',rain_probability:0},{time:'2026-11-01T17:00:00Z',rain_probability:70}]}]};
  assert.equal(destinationRain(data,{arrival:'2026-11-01T16:50:00Z'}),0);assert.equal(destinationRain(data,{arrival:'2026-11-01T17:00:00Z'}),70);assert.equal(destinationRain(data,{arrival:'2026-11-01T18:00:00Z'}),null);
});
