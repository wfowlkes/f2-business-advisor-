'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const percent=x=>x==null?'—':`${x>0?'+':''}${x.toFixed(2)}%`;
 const outcome=x=>x<0?'bad':x>=10?'good':'flat';
 let results=null;
 function cell(tr,text,cls){tr.append(el('td',text,cls));}
 function paintMatrix(){const wrap=$('matrix');wrap.replaceChildren();const tbl=el('table'),head=el('thead'),tr=el('tr');
 ['Business','7-day selected','7-day baseline → selected WAPE','7-day change','30-day selected','30-day baseline → selected WAPE','30-day change','Decision'].forEach(x=>tr.append(el('th',x)));
 head.append(tr);tbl.append(head);const body=el('tbody');
 for(const b of results.businesses){const t=el('tr');cell(t,b.name);for(const h of [7,30]){const x=b.horizons[h];cell(t,x.method);cell(t,`${x.baselineHoldoutWape}% → ${x.holdoutWape}%`);cell(t,percent(x.improvement),outcome(x.improvement));}cell(t,'HOLD','flat');body.append(t);}tbl.append(body);wrap.append(tbl);
 }
 function detail(type){const b=results.businesses.find(x=>x.type===type);if(!b)return;const out=$('details');out.replaceChildren();
 out.append(el('p',`${b.name}: the research-selected method is fixed before independent testing. The retrospective method ranking below is shown only to understand failure mechanisms and future opportunities.`));
 const cards=el('div',undefined,'horizon');
 for(const h of [7,30]){const x=b.horizons[h],card=el('article');
  card.append(el('small',`${h}-day selected method`),el('div',x.method,'value'),el('p',`Baseline: ${x.baseline} (${x.baselineHoldoutWape}% WAPE)`),el('p',`Selected: ${x.holdoutWape}% WAPE • ${percent(x.improvement)} versus baseline • ${x.holdoutBias}% signed bias`));
  card.append(el('p',`${x.wins}/3 groups improved ≥10%; ${x.losses}/3 groups worse.`),el('p',x.status,x.status.startsWith('FAIL')?'bad':'flat'));
  card.append(el('p',`Observed best in hindsight: ${x.observedBest}. This is NOT the chosen strategy.`));cards.append(card);
 }
 out.append(cards);
 for(const h of [7,30]){const x=b.horizons[h],heading=el('h3',`${h}-day retrospective ranking (unseen synthetic challenge)`);out.append(heading);
  const holder=el('div',undefined,'tablewrap'),tbl=el('table'),thead=el('thead'),row=el('tr');['Rank','Method','Challenge WAPE','Signed bias','How to interpret'].forEach(s=>row.append(el('th',s)));thead.append(row);tbl.append(thead);const tbody=el('tbody');
  x.methodRanks.forEach((m,i)=>{let tr=el('tr');cell(tr,String(i+1));cell(tr,m.method);cell(tr,`${m.wape}%`);cell(tr,`${m.bias}%`);cell(tr,m.method===x.method?'Preselected strategy':m.method===x.baseline?'Preselected reference baseline':'Hindsight ranking ONLY');tbody.append(tr)});tbl.append(tbody);holder.append(tbl);out.append(holder);
 }
 }
 async function renderCalendar(){
 try{const r=await fetch('calendar-stress.json',{cache:'no-store'});if(!r.ok)throw Error('Report unavailable');const data=await r.json();if(data.authority!=='HOLD')throw Error('Governance check failed');
 const wrap=$('calendar');wrap.replaceChildren();const tbl=el('table'),tr=el('tr');['Business','7-day selected change','7-day groups worse','30-day selected change','30-day groups worse'].forEach(t=>tr.append(el('th',t)));const h=el('thead');h.append(tr);tbl.append(h);
 const body=el('tbody');for(const b of data.businesses){const row=el('tr');cell(row,b.name);for(const horizon of [7,30]){const x=b.horizons[horizon];cell(row,percent(x.meanImprovement),outcome(x.meanImprovement));cell(row,`${x.negativeGroups}/3`,x.negativeGroups?'bad':'flat');}body.append(row);}tbl.append(body);wrap.append(tbl);
 }catch(e){$('calendar').textContent='Cannot load stress report: '+e.message;}}
 async function start(){try{const res=await fetch('strategy-summary.json',{cache:'no-store'});if(!res.ok)throw Error('The synthetic report is not deployed yet.');results=await res.json();if(results.productionStatus!=='HOLD'||results.businesses.length!==9)throw Error('Evidence governance invalid');
  paintMatrix();renderCalendar();const select=$('business');for(const b of results.businesses){const opt=el('option',b.name);opt.value=b.type;select.append(opt);}select.addEventListener('change',()=>detail(select.value));detail(select.value);
 }catch(e){$('matrix').textContent='Unable to load evidence: '+e.message;}}
 start();
})();
