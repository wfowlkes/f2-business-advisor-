'use strict';
(()=>{
 const $=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const columns=(heads,rows)=>{const t=make('table'),head=make('thead'),tr=make('tr');for(const x of heads)tr.append(make('th',x));head.append(tr);t.append(head);const body=make('tbody');for(const a of rows){const row=make('tr');for(const x of a)row.append(make('td',String(x)));body.append(row);}t.append(body);return t;};
 let source,selected;
 function paint(){const b=source.businesses.find(x=>x.type===selected);if(!b)return;
  const d=$('detail');d.replaceChildren();d.append(make('h3',b.name));d.append(make('p',`Previous detector: ${b.meanSwitchesV13} average switches. Research indicator: ${b.meanSwitchesV14} average switches. Results use dated completed observations only.`));
  d.append(columns(['Forecast','Old WAPE','New WAPE','Seed groups improved'],[7,30].map(h=>[`${h} days`,b.horizons[h].oldWape+'%',b.horizons[h].gatedWape+'%',b.horizons[h].winningSeeds+'/3'])));
  const e=$('events');e.replaceChildren();const log=b.scenariosDuringTest.flatMap(s=>s.events.map(x=>[s.seed,x.date,x.from,x.to]));e.append(columns(['Seed','Observed date','Previous','New (internal)'],log));
 }
 fetch('bridge-summary.json',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Evidence unavailable');return r.json();}).then(data=>{
  source=data;for(const b of data.businesses){const o=make('option',b.name);o.value=b.type;$('business').append(o);}
  const out=$('summary');out.replaceChildren();out.append(columns(['Simulated business','Old switches','New switches','7d old → new WAPE','30d old → new WAPE'],data.businesses.map(b=>[b.name,b.meanSwitchesV13,b.meanSwitchesV14,`${b.horizons[7].oldWape}% → ${b.horizons[7].gatedWape}%`,`${b.horizons[30].oldWape}% → ${b.horizons[30].gatedWape}%`])));
  selected=data.businesses[0].type;$('business').value=selected;paint();
 }).catch(e=>{$('summary').textContent='HOLD: '+e.message;});
 $('business').addEventListener('change',v=>{selected=v.target.value;paint();});
 $('export').addEventListener('click',()=>{if(!source)return;const b=source.businesses.find(x=>x.type===selected);if(!b)return;const json=JSON.stringify({version:source.version,synthetic:true,authority:'HOLD',...b},null,2);const u=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=make('a');a.href=u;a.download='f2-learning-lab-bridge-synthetic.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
})();
