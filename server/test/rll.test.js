'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {diagnoseBusinessReadOnly}=require('../resolution_learning_loop.js');

const day=(date,orders=1,net_sales=40)=>({date,orders,net_sales});

test('RLL valid merchant-day data yields bounded research validation only',()=>{
  const input=[day('2026-11-04'),day('2026-11-05')];
  const frozen=JSON.stringify(input);
  const r=diagnoseBusinessReadOnly(input);
  assert.equal(JSON.stringify(input),frozen);
  assert.equal(r.status,'SHADOW_RESOLVED');
  assert.equal(r.cycles,0);
  assert.equal(r.releaseAuthorized,false);
  assert.equal(r.modelPromotion,'HOLD');
  assert.equal(r.shopifyWrites,0);
  assert.equal(r.forecastUpdates,0);
});

test('RLL corrects only duplicate display shadow rows',()=>{
  const input=[day('2026-11-04'),day('2026-11-04'),day('2026-11-05')];
  const frozen=JSON.stringify(input);
  const r=diagnoseBusinessReadOnly(input);
  assert.equal(r.status,'SHADOW_RESOLVED');
  assert.equal(r.reason,'DISPLAY_DUPLICATION_RESOLVED');
  assert.equal(r.cycles,1);
  assert.equal(r.shadowRows,2);
  assert.equal(JSON.stringify(input),frozen);
});

test('RLL leaves conflicting merchant dates in HOLD without rewriting data',()=>{
  const input=[day('2026-11-04',2,10),day('2026-11-04',3,40)];
  const r=diagnoseBusinessReadOnly(input);
  assert.equal(r.status,'HOLD');
  assert.equal(r.reason,'EXTERNAL_VERIFICATION_REQUIRED');
  assert(r.outstandingIssueCodes.includes('CONFLICTING_DATE'));
  assert.equal(input.length,2);
});

test('RLL does not synthesize missing customer or financial facts',()=>{
  const r=diagnoseBusinessReadOnly([{orders:3}]);
  assert.equal(r.status,'HOLD');
  assert(r.outstandingIssueCodes.includes('MISSING_OR_INVALID_DATE'));
  assert.equal(r.releaseAuthorized,false);
});

test('RLL enforces bounds and source immutability',()=>{
  assert.throws(()=>diagnoseBusinessReadOnly([], {maxCycles:999}));
  assert.throws(()=>diagnoseBusinessReadOnly(Array(4001).fill(day('2026-11-04'))));
  const r=diagnoseBusinessReadOnly([day('2026-11-05',0,0)],{maxCycles:1});
  assert.equal(r.status,'SHADOW_RESOLVED');
  assert.equal(r.sourceAuthenticated,false);
});
