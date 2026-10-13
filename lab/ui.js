'use strict';
(()=>{
const $=id=>document.getElementById(id),LAB=window.F2Synthetic;
let snapshot=null,selected='stable';
const fmt=n=>n==null||!Number.isFinite(n)?'—':n.toFixed(1)+'%';
const money=n=>n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;};
const node=(parent,...children)=>{parent.append(...children);return parent;};
function resultCell(p){const c=el('td');c.textContent=fmt(p);c.className=p===null?'flat':p>=10?'good':p<0?'bad':'flat';return c;}
function paintBoard(){const target=$('scoreboard');target.replaceChildren();
 const table=el('table'),head=el('thead'),tr=el('tr');['Business','7d baseline WAPE','7d challenger WAPE','7d change','30d baseline WAPE','30d challenger WAPE','30d change','Decision'].forEach(t=>tr.append(el('th',t)));head.append(tr);table.append(head);
 const body=el('tbody');for(const b of snapshot.businesses){const t=el('tr');t.append(el('td',b.name));for(const h of [7,30]){const s=b.summary[h];t.append(resultCell(s.championWape),resultCell(s.candidateWape),resultCell(s.meanImprovement));}t.append(node(el('td'),el('span','HOLD','pill hold')));body.append(t)}table.append(body);target.append(table);
 target.append(el('p','WAPE = absolute forecast error as a percentage of observed synthetic totals. “Change” is percentage improvement in WAPE relative to the validation-selected baseline; negative means the challenger was worse. Means combine independent seeded runs. All business decisions remain HOLD.'));
}
function sparkline(data){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 160');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','spark');svg.setAttribute('role','img');svg.setAttribute('aria-label','Synthetic daily sales over the last 180 days');
 for(const v of [35,80,125]){const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1','0');line.setAttribute('x2','600');line.setAttribute('y1',String(v));line.setAttribute('y2',String(v));svg.append(line);}
 const values=data.slice(-180).map(x=>x.net_sales),max=Math.max(...values,1);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',values.map((v,i)=>(i?'L':'M')+(i*600/(values.length-1)).toFixed(1)+' '+(145-v/max*130).toFixed(1)).join(' '));svg.append(path);return svg;
}
function paintDetail(){const b=snapshot.businesses.find(x=>x.type===selected),r=b.runs[0],s=LAB.generate(b.type,r.seed,{asOf:snapshot.asOf});const d=$('detail');d.replaceChildren();
 const about=el('p',b.description+'. This is generated data with no merchant/customer information. Seed '+r.seed+', fingerprint '+r.fingerprint+'.');d.append(about);
 const horizons=el('div',undefined,'horizon');for(const h of [7,30]){let t=r.tests[h],n=r.nextForecast[h];const c=el('article');c.append(el('small',`${h}-day forward synthetic forecast · selected baseline ${t.champion||'none'}`),el('div',money(n?.forecastTotal),'value'),el('small',`Independent holdout: ${fmt(t.championHoldoutWape)} WAPE · candidate ${fmt(t.candidateHoldoutWape)} · Δ ${fmt(t.improvement)}`),el('p',`Challenger ${t.candidate||'none'} · ${t.action}`));horizons.append(c)}d.append(horizons);
 const wrap=el('div',undefined,'details'),left=el('div',undefined,'panel'),right=el('div',undefined,'panel');
 left.append(el('h3','Simulated sales trajectory'),sparkline(s.daily),el('p',`Generated ${s.daily.length} days. Total simulated sales: ${money(r.totals.net_sales)}. Orders: ${r.totals.orders.toLocaleString()}. Refunds: ${money(r.totals.refunds)}. Stockout days: ${r.totals.stockoutDays}.`));
 const split=r.split;left.append(el('p',`Frozen training ends ${split.training.end}; validation ${split.validation.start}–${split.validation.end}; independent holdout ${split.holdout.start}–${split.holdout.end}.`));
 right.append(el('h3','Stress signals & alternatives'));
 const signals=el('ul',undefined,'signals');for(const s of r.signals)signals.append(el('li',s));right.append(signals);
 right.append(el('h3','Learning controls'));
 const controls=el('ul',undefined,'signals');for(const x of r.ledger)controls.append(el('li',`${x.control}: ${x.state} — ${x.evidence}`));right.append(controls);wrap.append(left,right);d.append(wrap);
 d.append(el('p','No automatic retraining or deployment. If the challenger improves one synthetic scenario, that result is only a hypothesis for a prospective test on unseen data. The local exported JSON is a reproducible snapshot, not an immutable or production audit ledger.'));
}
function run(){const seed=Number($('seed').value),seeds=Number($('replicates').value);$('run').disabled=true;$('status').textContent='Running chronological backtests across five simulated businesses…';
 try{snapshot=LAB.batch({seed,seeds});const business=$('business');business.replaceChildren();for(const b of snapshot.businesses){const opt=el('option',b.name);opt.value=b.type;business.append(opt)}business.disabled=false;business.value=selected;
  $('kRuns').textContent=String(seeds*5);paintBoard();paintDetail();$('export').disabled=false;
  $('status').textContent=`Completed ${seeds*5} reproducible synthetic histories · ${snapshot.asOf} cutoff · production HOLD. Model selection does not use independent holdout outcomes.`;
 }catch(e){$('status').textContent='Unable to run experiment: '+e.message;}finally{$('run').disabled=false;}
}
$('run').addEventListener('click',run);$('business').addEventListener('change',e=>{selected=e.target.value;if(snapshot)paintDetail()});
$('export').addEventListener('click',()=>{if(!snapshot)return;const data={...snapshot,exportedAt:new Date().toISOString(),warning:'Locally exported synthetic-only research snapshot, not immutable or evidence of real business accuracy.'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='f2-learning-lab-synthetic-'+snapshot.seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);});
run();
})();
