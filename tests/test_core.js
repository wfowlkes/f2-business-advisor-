const assert=require('node:assert/strict');const F=require('../core.js');
let demo=F.makeDemo();assert.equal(demo.daily.length,400);assert(demo.daily.every(x=>x.net_sales>0));let test=F.analyze(demo);assert.equal(test.status,'HOLD');assert.equal(test.tests[7].status,'HOLD');assert.equal(test.tests[30].status,'HOLD');assert(test.tests[7].reasons.some(x=>x.includes('Synthetic')));
let empty='date,net_sales,orders\n2026-10-01,0,0\n2026-10-02,0,0';let zero=F.normalize(empty);assert.equal(zero.metrics.sales,0);assert(F.analyze(zero).hold.some(x=>x.includes('No order')));
let missing=F.normalize('date,net_sales\n2026-09-01,5\n2026-09-03,7');assert.equal(missing.metrics.missing,1);assert.equal(missing.reconciled,false);assert(F.analyze(missing).hold.some(x=>x.includes('Missing')));
assert.throws(()=>F.normalize('Name,Total\nA,4'),/Missing a date/);
assert.equal(F.parseCSV('a,b\n"a, b",4')[1][0],'a, b');
let today=demo.daily.slice(0,100);let pred=F.forecast(today,7,'same weekday');assert.equal(pred.length,7);assert(pred.every(x=>x.value>=0));
console.log('PASS: demo, 7/30-day HOLD, zero-sales HOLD, missing dates HOLD, malformed CSV, CSV quoting, seasonality forecasts');
