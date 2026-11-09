'use strict';
/**
 * LIBERIENT / F2 business Resolution Learning Loop (RLL).
 *
 * Read-only, bounded and synchronous. It only normalizes an isolated display
 * copy; raw merchant data, orders, pricing, inventory, Shopify and forecasts
 * are not modified. Missing or conflicting facts remain HOLD.
 */
const crypto = require('node:crypto');

const MAX_CYCLES=4, MAX_ROWS=4000, MAX_BYTES=250000;
function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function checkRows(data) {
  const issues=[],seen=new Map();
  for(let i=0;i<data.length;i++) {
    const row=data[i];
    if(!row||typeof row!=='object'||Array.isArray(row)||
        typeof row.date!=='string'||!(/^\d{4}-\d{2}-\d{2}$/.test(row.date))) {
      issues.push({code:'MISSING_OR_INVALID_DATE',row:i});continue;
    }
    const previous=seen.get(row.date);
    if(previous) {
      const same=digest(previous.row)===digest(row);
      issues.push({code:same?'IDENTICAL_DISPLAY_DUPLICATE':'CONFLICTING_DATE',row:i});
    } else seen.set(row.date,{row,i});
    // Financial source errors cannot be repaired by research inference.
    for(const name of ['orders','net_sales']) {
      if(Object.hasOwn(row,name) &&
         (typeof row[name]!=='number'||!Number.isFinite(row[name])||
          (name==='orders' && (!Number.isInteger(row[name])||row[name]<0))))
        issues.push({code:'INVALID_FINANCIAL_UNIT',row:i});
    }
  }
  if(!data.length) issues.push({code:'NO_DAILY_ROWS',row:-1});
  return issues;
}
function diagnoseBusinessReadOnly(rows,{maxCycles=MAX_CYCLES,maxMilliseconds=15000}={}) {
  if(!Array.isArray(rows)||rows.length>MAX_ROWS||!Number.isInteger(maxCycles)||
     maxCycles<1||maxCycles>8||!Number.isFinite(maxMilliseconds)||
     maxMilliseconds<=0||maxMilliseconds>120000)
    throw Error('Invalid bounded RLL input');
  const source=clone(rows);
  const rawSize=Buffer.byteLength(JSON.stringify(source),'utf8');
  if(rawSize>MAX_BYTES)throw Error('RLL source exceeds byte bound');
  const sourceHash=digest(source);
  let shadow=clone(source),iterations=0,status='HOLD',reason='NO_VALIDATED_RESOLUTION';
  const trace=[],start=Date.now();
  let issues=checkRows(shadow);
  trace.push({cycle:0,issues:issues.length,sourceHash});
  if(!issues.length) {status='SHADOW_RESOLVED';reason='STRUCTURAL_CHECK_PASSED';}
  while(issues.length && iterations<maxCycles) {
    if(Date.now()-start>maxMilliseconds) {reason='TIME_BUDGET_EXCEEDED';break;}
    if(issues.some(x=>x.code!=='IDENTICAL_DISPLAY_DUPLICATE')) {
      reason='EXTERNAL_VERIFICATION_REQUIRED';break;
    }
    // Only remove exact repeat rows from a detached DISPLAY COPY.
    const before=issues.length,seen=new Set();
    shadow=shadow.filter(r=>{
      const key=r.date+':'+digest(r);
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    iterations++;issues=checkRows(shadow);
    trace.push({cycle:iterations,issues:issues.length,method:'DEDUPLICATE_SHADOW_DISPLAY'});
    if(issues.length>=before){reason='NO_MEASURABLE_PROGRESS';break;}
    if(!issues.length){status='SHADOW_RESOLVED';reason='DISPLAY_DUPLICATION_RESOLVED';break;}
  }
  if(issues.length && iterations===maxCycles) reason='MAX_CYCLES_EXHAUSTED';
  if(digest(rows)!==sourceHash) {status='HOLD';reason='SOURCE_MUTATED';}
  return {
    system:'LIBERIENT_RLL_SHADOW_V1',status,reason,cycles:iterations,
    sourceHash,rowsObserved:source.length,shadowRows:shadow.length,
    outstandingIssueCodes:[...new Set(issues.map(x=>x.code))],
    audit:trace,sourceAuthenticated:false,releaseAuthorized:false,
    shopifyWrites:0,forecastUpdates:0,modelPromotion:'HOLD',
    protectedP9LawChanges:false,protectedSampleTChanges:false
  };
}

/**
 * Research -> plan -> execute authorized read-only diagnostics -> verify/HOLD.
 * Never creates external jobs, writes Shopify, changes a model, or uses
 * caller-provided flags to authorize a protected action.
 */
function executeBusinessResearchFindings(rows,{requestedActions=[]}={}) {
  if(!Array.isArray(requestedActions)||requestedActions.length>8||
     requestedActions.some(a=>typeof a!=='string'))
    throw Error('Bounded declared business findings required');
  const raw=clone(rows),hash=digest(raw);
  const kinds=['SOURCE_QUALITY_RECHECK',...requestedActions];
  const plan=kinds.map((kind,index)=>({
    id:'LIBERIENT-RLL-'+(index+1),action:kind,
    owner:kind==='SOURCE_QUALITY_RECHECK'?'BUSINESS_DATA_QA':'EXTERNAL_GOVERNANCE',
    acceptance:kind==='SOURCE_QUALITY_RECHECK'
      ?'Measure input quality and repair only copied display duplicates'
      :'Independent authorization and real evidence required',
    stage:'PLANNED',productionAuthorized:false
  }));
  const output=[];
  let audit=null;
  for(const action of plan) {
    const receipt={id:action.id,action:action.action,stage:'HOLD',
                   sourceHash:hash,productionAuthorized:false};
    if(action.action==='SOURCE_QUALITY_RECHECK') {
      try {
        audit=diagnoseBusinessReadOnly(raw);
        receipt.stage='EXECUTED_RESEARCH';
        receipt.verified='LOCAL_STRUCTURAL_ONLY';
        receipt.reason=audit.reason;
        receipt.problems=audit.outstandingIssueCodes;
        receipt.shadowRows=audit.shadowRows;
        receipt.resultHash=digest(audit);
      } catch(e) {
        receipt.reason='RLL_EVIDENCE_OR_BUDGET_HOLD';
      }
    } else {
      receipt.reason='USER_AND_GOVERNANCE_APPROVAL_REQUIRED';
    }
    output.push(receipt);
  }
  if(digest(rows)!==hash)throw Error('RLL source changed unexpectedly');
  const executed=output.filter(r=>r.stage==='EXECUTED_RESEARCH').length;
  return {
    system:'LIBERIENT-RESEARCH-ACTION-1.0',
    status:executed===output.length?'EXECUTED_RESEARCH_ONLY':
      executed?'EXECUTED_RESEARCH_WITH_HOLDS':'HOLD_ACTIONS_PENDING',
    actionsPlanned:output.length,actionsExecuted:executed,
    actionsHeld:output.length-executed,plan,receipts:output,
    sourceHash:hash,productionAuthorized:false,modelPromotion:'HOLD',
    shopifyWrites:0,forecastChanges:0,
    p9Modified:false,sampletModified:false,backgroundTasksStarted:false
  };
}
module.exports={diagnoseBusinessReadOnly,executeBusinessResearchFindings};

