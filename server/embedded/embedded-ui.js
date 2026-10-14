'use strict';
(()=>{
 const $=id=>document.getElementById(id),X=window.LiberientExperience;
 let data=X.createDataset(),ids=[],position=0,loading=false,ledger=X.createFramework();
 const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
 function plot(rows,field){
  const a=(rows||[]).slice(-30);
  if(a.length<14||a.some(r=>!Number.isFinite(r[field])))return null;
  const ns=a.map(r=>r[field]),min=Math.min(...ns),max=Math.max(...ns),range=Math.max(1,max-min),w=450,h=88;
  const points=ns.map((v,i)=>[8+i*(w-16)/(ns.length-1),h-10-(v-min)/range*(h-23)]);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('chart');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.setAttribute('role','img');svg.setAttribute('aria-label',field==='orders'?'Daily order trend':'Daily order subtotal trend');
  const drawLine=(pts,color)=>{const el=document.createElementNS('http://www.w3.org/2000/svg','polyline');el.setAttribute('points',pts.map(p=>p.join(',')).join(' '));el.setAttribute('stroke',color);el.setAttribute('stroke-width','3');el.setAttribute('fill','none');svg.append(el)};
  drawLine(points.slice(0,-6),'#9287ff');drawLine(points.slice(-7),'#51e7ff');
  const p=ns.slice(-14,-7).reduce((s,v)=>s+v,0)/7,q=ns.slice(-7).reduce((s,v)=>s+v,0)/7;
  if(p>0&&Math.abs((q/p-1)*100)>=12){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',points[points.length-7][0]);line.setAttribute('x2',points[points.length-7][0]);line.setAttribute('y1','4');line.setAttribute('y2',h-8);line.setAttribute('stroke','#d485ff');line.setAttribute('stroke-dasharray','4 4');svg.append(line);
   const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',points[points.length-7][0]);dot.setAttribute('cy',points[points.length-7][1]);dot.setAttribute('r','5');dot.setAttribute('fill','#f9e4ff');svg.append(dot);}
  return svg;
 }

 async function api(path,method='GET'){
  if(typeof window.shopify?.idToken!=='function')throw Error('Open LIBERIENT from your Shopify admin.');
  const token=await window.shopify.idToken();const r=await fetch('/shopify-app/api/'+path,{method,headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!r.ok)throw Error('The authorized store data is not ready. Please try again.');return r.json();
 }
 function cards(){return data.registry.filter(x=>x.id!=='source').map(x=>({id:x.id,label:x.label,value:data.values[x.id]}));}
 function draw(){const connected=data.connected;document.querySelector('.sidebar').classList.toggle('connected',connected);
  $('workspace').hidden=!connected;$('connectionText').textContent=connected?'Store connected':'Connection pending';$('sourceType').textContent=data.sourceLabel;
  $('heroMode').textContent=connected?'SHOPIFY ORDER SNAPSHOT · HOLD':'WAITING FOR AUTHORIZED SHOPIFY DATA';
  $('startMessage').textContent=connected?'Shopify order subtotals only. This is not reconciled net sales. New order activity will be refreshed when Shopify notifies LIBERIENT.':'Checking Shopify installation, session and authorized data.';
  document.querySelectorAll('[data-needs]').forEach(n=>n.hidden=data.feature[n.dataset.needs]!==true);
  if(!connected)return;
  const items=cards();position=Math.min(position,Math.max(0,items.length-1));
  $('slides').replaceChildren();for(const item of items){const article=document.createElement('article');article.className='slide';const h=document.createElement('h3'),strong=document.createElement('strong'),note=document.createElement('div');h.textContent=item.id==='revenue'?'Order subtotal (proxy)':item.label;strong.textContent=item.value==null?'—':(['revenue','forecast7','forecast30'].includes(item.id)?'}
  $('carouselPage').textContent=items.length?`${position+1} / ${items.length}`:'0 / 0';$('slides').children[position]?.scrollIntoView({block:'nearest',inline:'start'});
  $('tracker').replaceChildren();for(const id of ids.filter(x=>items.some(t=>t.id===x))){const item=items.find(x=>x.id===id),a=document.createElement('article'),b=document.createElement('b'),c=document.createElement('p');a.className='track-card';b.textContent=item.label;c.textContent=item.value==null?'—':fmt(item.value);a.append(b,c);if(['revenue','orders'].includes(item.id)){const trend=plot(data.rows,item.id==='orders'?'orders':'net_sales');if(trend)a.append(trend)}$('tracker').append(a);} $('streamEmpty').hidden=ids.length>0;
  $('choices').replaceChildren();for(const it of items){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=ids.includes(it.id);check.onchange=()=>{ids=check.checked?[...ids,it.id]:ids.filter(x=>x!==it.id);ledger.emit('tracker-customized',{module:it.id});draw();};label.append(check,document.createTextNode(it.label));$('choices').append(label);}
  $('authority').textContent='Shopify historical order subtotal proxy · Decision authority HOLD';
 }
 async function load(force=false){if(loading)return;loading=true;$('startMessage').textContent='Checking Shopify data…';try{let state=await api('snapshot');if(force||state.needsSync)state=await api('sync','POST');data=X.fromSnapshot(state);ids=ids.filter(id=>data.registry.some(x=>x.id===id));if(!ids.length)ids=cards().map(x=>x.id);ledger.emit('source-connected',{source:'SHOPIFY'});draw();}
  catch(e){$('startMessage').textContent=e.message;}finally{loading=false;}}
 $('syncNow').onclick=()=>load(true);
 $('carouselPrev').onclick=()=>{position=(position-1+cards().length)%Math.max(1,cards().length);draw();};
 $('carouselNext').onclick=()=>{position=(position+1)%Math.max(1,cards().length);draw();};
 $('customizeBtn').onclick=()=>{$('customize').hidden=!$('customize').hidden;};
 $('doneCustomize').onclick=()=>{$('customize').hidden=true;};
 $('askForm').onsubmit=e=>{e.preventDefault();ledger.emit('assistant-question',{source:'SHOPIFY'});$('answer').textContent=X.localAnswer(data,$('question').value.trim());};
 $('auditBtn').onclick=()=>{const blob=new Blob([JSON.stringify({authority:'HOLD',events:ledger.events()},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='liberient-ui-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
 $('aiApproval').hidden=true;$('assistantTitle').textContent='Ask your Shopify business data';$('assistantLabel').textContent='LOCAL ANSWERS · READ ONLY';
 load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
 setInterval(()=>{if(document.visibilityState==='visible')load();},60000);
})();
:'')+fmt(item.value);note.className='note';note.textContent=item.id.startsWith('forecast')?'Research only · HOLD':'Authorized Shopify aggregate; not reconciled net sales';article.append(h,strong,note);if(['revenue','orders'].includes(item.id)){const trend=plot(data.rows,item.id==='orders'?'orders':'net_sales');if(trend)article.append(trend)}$('slides').append(article);}
  $('carouselPage').textContent=items.length?`${position+1} / ${items.length}`:'0 / 0';$('slides').children[position]?.scrollIntoView({block:'nearest',inline:'start'});
  $('tracker').replaceChildren();for(const id of ids.filter(x=>items.some(t=>t.id===x))){const item=items.find(x=>x.id===id),a=document.createElement('article'),b=document.createElement('b'),c=document.createElement('p');a.className='track-card';b.textContent=item.label;c.textContent=item.value==null?'—':fmt(item.value);a.append(b,c);$('tracker').append(a);} $('streamEmpty').hidden=ids.length>0;
  $('choices').replaceChildren();for(const it of items){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=ids.includes(it.id);check.onchange=()=>{ids=check.checked?[...ids,it.id]:ids.filter(x=>x!==it.id);ledger.emit('tracker-customized',{module:it.id});draw();};label.append(check,document.createTextNode(it.label));$('choices').append(label);}
  $('authority').textContent='Shopify historical order subtotal proxy · Decision authority HOLD';
 }
 async function load(force=false){if(loading)return;loading=true;$('startMessage').textContent='Checking Shopify data…';try{let state=await api('snapshot');if(force||state.needsSync)state=await api('sync','POST');data=X.fromSnapshot(state);ids=ids.filter(id=>data.registry.some(x=>x.id===id));if(!ids.length)ids=cards().map(x=>x.id);ledger.emit('source-connected',{source:'SHOPIFY'});draw();}
  catch(e){$('startMessage').textContent=e.message;}finally{loading=false;}}
 $('syncNow').onclick=()=>load(true);
 $('carouselPrev').onclick=()=>{position=(position-1+cards().length)%Math.max(1,cards().length);draw();};
 $('carouselNext').onclick=()=>{position=(position+1)%Math.max(1,cards().length);draw();};
 $('customizeBtn').onclick=()=>{$('customize').hidden=!$('customize').hidden;};
 $('doneCustomize').onclick=()=>{$('customize').hidden=true;};
 $('askForm').onsubmit=e=>{e.preventDefault();ledger.emit('assistant-question',{source:'SHOPIFY'});$('answer').textContent=X.localAnswer(data,$('question').value.trim());};
 $('auditBtn').onclick=()=>{const blob=new Blob([JSON.stringify({authority:'HOLD',events:ledger.events()},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='liberient-ui-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
 $('aiApproval').hidden=true;$('assistantTitle').textContent='Ask your Shopify business data';$('assistantLabel').textContent='LOCAL ANSWERS · READ ONLY';
 load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
})();
