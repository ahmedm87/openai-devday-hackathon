import test from 'node:test';
import assert from 'node:assert/strict';
import {overlayLayout} from './overlayLayout.js';

test('compact desktop panels clear search, controls and the expanded sheet', () => {
  const result = overlayLayout({height:663,topBoundary:120,dockTop:400,fitWidth:105});
  assert.equal(result.contextTop,132);
  assert.equal(result.sheetSpace,275);
  assert.equal(result.contextTop+result.contextMaxHeight+12,663-result.sheetSpace-44);
  assert.equal(result.sheetMaxHeight,455);
  assert.equal(result.zoomRight,139);
});

test('phone controls track the actual results height rather than a fixed sheet estimate', () => {
  const partial = overlayLayout({height:844,topBoundary:163,dockTop:508,dockBottom:69,edgeGap:12,fitWidth:98});
  const collapsed = overlayLayout({height:844,topBoundary:163,dockTop:713,dockBottom:69,edgeGap:12,fitWidth:98});
  assert.equal(partial.sheetTop,175);
  assert.equal(partial.sheetSpace,348);
  assert.equal(collapsed.sheetSpace,143);
  assert.ok(collapsed.contextMaxHeight>partial.contextMaxHeight);
  assert.equal(partial.sheetMaxHeight,600);
});

test('reduced height hides a context panel that cannot clear the control rail', () => {
  const result = overlayLayout({height:400,topBoundary:163,dockTop:230,dockBottom:69,edgeGap:12,fitWidth:98});
  assert.equal(result.contextTight,true);
  assert.ok(result.contextMaxHeight<54);
  assert.equal(result.sheetTop+result.sheetMaxHeight+69,400);
});

test('initial zoom controls clear the measured empty-state hint', () => {
  const result = overlayLayout({height:500,topBoundary:163,hintTop:360,edgeGap:12});
  assert.equal(500-result.sheetSpace,348);
  assert.equal(result.zoomRight,12);
});

test('a taller desktop context panel moves the control rail into the free left slot', () => {
  const result = overlayLayout({height:663,topBoundary:119,dockTop:347,fitWidth:103,contextLeft:656,contextNaturalHeight:170});
  assert.equal(result.controlsLeft,true);
  assert.ok(result.contextMaxHeight>=170);
  const blocked = overlayLayout({height:663,topBoundary:119,dockTop:347,fitWidth:103,contextLeft:656,contextNaturalHeight:170,leftBlocked:true});
  assert.equal(blocked.controlsLeft,false);
});
