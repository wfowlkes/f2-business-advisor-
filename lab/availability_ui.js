'use strict';
(()=>{
 const $=id=>document.getElementById(id),el=(type,text)=>{const n=document.createElement(type);if(text!==undefined)n.textContent=text;return n;};
 const percent=n=>Number.isFinite(n)?n.toFixed(2)+'%':'—';
 let data=null;
 function table(head,records){const tbl=el('table'),th=el('thead'),tr=el('tr');for(const name of head)tr.append(el('th',name));th.append(tr);tbl.append(th);const body=el('tbody');for(const values of records){const row=el('tr');for(const v of values)row.append(el('td',String(v)));body.append(row)}tbl.append(body);return tbl;}
 function show(){if(!data)return;const selected=$('series').value,run=data.cohorts.find(x=>`${x.group}/${x.mode}/${x.seed}`===selected);if(!run)return;
 const d=$('detail');d.replaceChildren();d.append(el('h3',`${run.group} · ${run.mode} · seed ${run.seed}`));
 d.append(el('p',`Frozen v1.4: ${percent(run.metrics.frozenWape)} WAPE; pure availability research: ${percent(run.metrics.availabilityWape)}; historical skill-gated: ${percent(run.metrics.gatedWape)}. Research-only switches ${run.metrics.routed}/${run.metrics.folds}.`));
 d.append(el('p',`${run.metrics.highUncertainty}/${run.metrics.folds} forecasts had high uncertainty about future stockouts. Scenario envelopes must never be mistaken for calibrated prediction intervals.`));
 $('folds').replaceChildren(table(['Forecast cutoff','Realized synthetic sales','Frozen v1.4','Availability','Gated','Route'],run.records.map(x=>[x.cutoff,Math.round(x.actual),Math.round(x.frozen),x.availability==null?'HOLD':Math.round(x.availability),Math.round(x.gated??x.frozen),x.route])));
 }
 fetch('availability-results.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Report unavailable');return r.json()}).then(d=>{
  if(d.productionAuthority!=='HOLD')throw Error('Unapproved report');data=d;
  const scenarios=d.cohorts.map(x=>[`${x.group}/${x.mode}/${x.seed}`,`${x.group}: ${x.mode} / ${x.seed}`]);
  const select=$('series');select.replaceChildren();for(const [v,name] of scenarios){const opt=el('option',name);opt.value=v;select.append(opt)}select.addEventListener('change',show);
  const parent=$('outcomes');parent.replaceChildren(table(['Evidence group','Supply mechanism','Seed','Frozen v1.4 WAPE','Availability WAPE','Skill-gated WAPE','Decision'],d.cohorts.map(x=>[x.group,x.mode,x.seed,percent(x.metrics.frozenWape),percent(x.metrics.availabilityWape),percent(x.metrics.gatedWape),'HOLD'])));
  show();
 }).catch(e=>{$('outcomes').textContent='Cannot load synthetic report: '+e.message});
})();
