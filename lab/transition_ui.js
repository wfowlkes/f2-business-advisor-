'use strict';
(()=>{
 const $=id=>document.getElementById(id),T=window.F2TransitionEngine,LAB=window.F2Synthetic,M=window.F2ScenarioMethods;
 const make=(tag,content)=>{const e=document.createElement(tag);if(content!==undefined)e.textContent=content;return e;};
 const tbody=(heading,records)=>{const t=make('table'),h=make('tr');heading.forEach(x=>h.append(make('th',x)));const th=make('thead');th.append(h);t.append(th);const b=make('tbody');for(const row of records){const tr=make('tr');row.forEach(x=>tr.append(make('td',String(x))));b.append(tr);}t.append(b);return t;};
 let cached=null,selection=null,allowed=null;
 for(const scenario of LAB.TYPES){const o=make('option',scenario.name);o.value=scenario.id;$('business').append(o);}
 const getJSON=async name=>{const r=await fetch(name,{cache:'force-cache'});if(!r.ok)throw Error('Cannot load '+name);return r.json();};
 async function prepare(){if(selection)return;const [s,v,c,report]=await Promise.all([getJSON('selection-frozen.json'),getJSON('strategy-summary.json'),getJSON('calendar-stress.json'),getJSON('transition-results.json')]);
  const wrap=$('metrics');wrap.replaceChildren();wrap.append(tbody(['Simulated business','7d adaptive WAPE','7d fixed WAPE','30d adaptive WAPE','30d fixed WAPE','Mean switches'],report.businesses.map(b=>[b.name,b.score[7].routerWape+'%',b.score[7].static28Wape+'%',b.score[30].routerWape+'%',b.score[30].static28Wape+'%',b.avgSwitches])));
  selection=s.selection;allowed={};for(const b of v.businesses){allowed[b.type]={};const cal=c.businesses.find(x=>x.type===b.type);for(const horizon of [7,30]){const a=b.horizons[horizon],t=cal?.horizons[horizon];allowed[b.type][horizon]=!!(a.status.startsWith('RESEARCH CANDIDATE')&&a.losses===0&&t&&t.positiveGroups>=2&&t.negativeGroups===0&&Math.abs(t.meanBias)<=5);}}
 }
 async function run(){
  $('run').disabled=true;try{
   await prepare();const type=$('business').value,data=LAB.generate(type,740001,{asOf:'2027-05-19'});
   const audit=T.replay(data.daily,{mapping:selection,allowed}),last=audit.indicator;cached={version:T.VERSION,synthetic:true,seed:data.seed,simulatorTypeForGradingOnly:type,asOf:data.asOf,detected:last,events:audit.events,productionAuthority:'HOLD'};
   const box=$('indicator');box.replaceChildren();box.append(make('h3','Latest inferred condition: '+audit.state.active));
   box.append(make('p',`Observation through ${last.asOf}. Heuristic signal strength: ${last.signalStrength.toFixed(2)} (NOT a probability). Current indicator: ${last.status}. Known simulation type, for test grading only: ${type}.`));
   box.append(make('p',`Recent evidence: ${JSON.stringify({sales28Ratio:last.evidence.monthDemandRatio,stockoutRate:last.evidence.stockoutRate,refundShare:last.evidence.refundShare,volatilityCV:last.evidence.volatilityCV})}`));
   const routes=$('routing');routes.replaceChildren();routes.append(tbody(['Horizon','Research-selected method','Active shadow method','Eligible to shadow-route','Decision'],[7,30].map(h=>{
    const selected=selection[audit.state.active]?.[h]?.method||'none',resolved=audit.methods[h];return [`${h} days`,selected,resolved.method,resolved.eligible?'Yes':'No: baseline fallback','HOLD'];
   })));
   const ledger=$('ledger');ledger.replaceChildren();ledger.append(tbody(['Observed date','Previous state','New state','Signal','Authority'],audit.events.map(e=>[e.date,e.from,e.to,e.signalStrength,e.authority])));
   if(!audit.events.length)ledger.append(make('p','No confirmed switches in this synthetic history.'));
   $('download').disabled=false;
  }catch(e){$('indicator').textContent='HOLD: '+e.message;}finally{$('run').disabled=false;}
 }
 $('run').addEventListener('click',run);
 $('download').addEventListener('click',()=>{if(!cached)return;const data=new Blob([JSON.stringify(cached,null,2)],{type:'application/json'});const a=document.createElement('a');const url=URL.createObjectURL(data);a.href=url;a.download='F2-synthetic-transition-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),250);});
})();
