'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {dailySeed,createReport}=require('../lab/report.js');
test('daily seed deterministic and bounded; invalid calendar dates rejected',()=>{
 assert.equal(dailySeed('2026-10-13'),dailySeed('2026-10-13'));
 assert.notEqual(dailySeed('2026-10-13'),dailySeed('2026-10-14'));
 assert.throws(()=>dailySeed('2026-02-30'));
});
test('daily report stays synthetic HOLD, captures negative results, does not claim real accuracy',()=>{
 const r=createReport({date:'2026-10-13',seed:101,seeds:3});
 assert.equal(r.data.synthetic,true);assert.equal(r.data.decisionAuthority,'HOLD');assert.equal(r.data.rows.length,9);
 assert(r.data.warnings.some(x=>x.includes('Unpredictable Store 30-day')));
 assert(r.data.rows.every(x=>x.evidence.length===3));
 assert(r.markdown.includes('SYNTHETIC ONLY'));
 const x=createReport({date:'2026-10-13',seed:101,seeds:3});
 assert.deepEqual(r.data.rows,x.data.rows);
});

test('expanded daily report records fixed shadow method outcomes and negative stress cases',()=>{
 const r=createReport({date:'2026-10-13',seed:30303,seeds:3});
 assert.equal(r.data.rows.length,9);
 assert(r.data.rows.every(x=>Number.isFinite(x.thirty.shadowWape)));
 assert(r.data.warnings.some(x=>x.includes('shadow challenger underperformed')));
 assert(r.markdown.includes('shadow WAPE'));
 assert.equal(r.data.decisionAuthority,'HOLD');
});
