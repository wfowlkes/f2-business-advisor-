const assert=require('node:assert/strict');const F=require('../core.js');
let demo=F.makeDemo();assert.equal(demo.daily.length,400);assert(demo.daily.every(x=>x.net_sales>0));let test=F.analyze(demo);assert.equal(test.status,'HOLD');assert.equal(test.tests[7].status,'HOLD');assert.equal(test.tests[30].status,'HOLD');assert(test.tests[7].reasons.some(x=>x.includes('Synthetic')));
let empty='date,net_sales,orders\n2026-10-01,0,0\n2026-10-02,0,0';let zero=F.normalize(empty);assert.equal(zero.metrics.sales,0);assert(F.analyze(zero).hold.some(x=>x.includes('No order')));
let missing=F.normalize('date,net_sales,orders\n2026-09-01,5,1\n2026-09-03,7,2');assert.equal(missing.metrics.missing,1);assert.equal(missing.reconciled,false);assert(F.analyze(missing).hold.some(x=>x.includes('Missing')));
assert.throws(()=>F.normalize('Name,Total\nA,4'),/Missing daily date/);
assert.equal(F.parseCSV('a,b\n"a, b",4')[1][0],'a, b');
let today=demo.daily.slice(0,100);let pred=F.forecast(today,7,'same weekday');assert.equal(pred.length,7);assert(pred.every(x=>x.value>=0));
console.log('PASS: demo, 7/30-day HOLD, zero-sales HOLD, missing dates HOLD, malformed CSV, CSV quoting, seasonality forecasts');
function mustThrow(csv,expected){let thrown=false;try{F.normalize(csv)}catch(e){thrown=true;if(expected&&!String(e.message).includes(expected))throw Error('Wrong error: '+e.message)}if(!thrown)throw Error('Expected rejection: '+csv.slice(0,80));}
mustThrow('date,net_sales,orders\n2026-10-11,,3\n','No valid');
mustThrow('date,net_sales,orders\n2026-02-30,120,2\n','No valid');
mustThrow('date,net_sales,orders,email\n2026-10-11,100,2,buyer@example.test\n','customer or order-level');
mustThrow('created_at,net_sales,orders\n2026-10-11,100,2\n','daily date');
mustThrow('date,net_sales\n2026-10-11,100\n','orders');
const quality=F.normalize('date,net_sales,orders\n2026-10-10,100,2\n2026-10-11,150,3\n');
if(quality.reconciled!==false)throw Error('CSV column labels must not imply verified reconciliation');
if(!quality.warnings.some(w=>w.includes('NOT verified')))throw Error('Missing provenance warning');
console.log('PASS: strict daily aggregates, blank amounts, real dates, PII rejection, reconciliation HOLD');
