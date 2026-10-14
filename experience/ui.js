'use strict';
(()=>{
 const X=window.LiberientExperience,F2=window.F2,$=id=>document.getElementById(id),framework=X.createFramework();
 let ds=X.createDataset(),selected=[],slideIndex=0,accessKey=null,capabilities={},poll=null;
 const money=x=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(x??0);
 const display=(id)=>{const n=ds.values[id];if(id==='source')return ds.sourceLabel;if(id==='insights')return n||'Review observations';if(n===null||n===undefined)return '—';return (['revenue','forecast7','forecast30','refunds'].includes(id)?'$':'')+money(n)};
 const emit=(type,arg)=>{framework.emit(type,arg);$('lastEvent').textContent=`Last framework event: ${type.replaceAll('-',' ')} · ${new Date().toLocaleTimeString()}`};
 function chart(rows,width=360,height=69){
  const a=rows.filter(x=>x.net_sales!==null).slice(-28);if(a.length<2)return '';
  let min=Math.min(...a.map(x=>x.net_sales)),max=Math.max(...a.map(x=>x.net_sales));if(max===min)max++;
  const point=(x,i)=>[5+i*(width-10)/(a.length-1),height-8-((x.net_sales-min)/(max-min))*(height-18)];
  const half=Math.max(2,a.length-7),before=a.slice(0,half).map((x,i)=>point(x,i).join(',')).join(' '),after=a.slice(half-1).map((x,i)=>point(x,i+half-1).join(',')).join(' ');
  let m=ds.change;let j=m?a.findIndex(x=>x.date===m.date):-1;const pt=j>=0?point(a[j],j):null;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Revenue trend${m?' with observed change point':''}"><path d="M5 ${height-7} L${width-5} ${height-7}" stroke="#343c87"/><polyline points="${before}"/><polyline class="after" points="${after}"/>${pt?`<line x1="${pt[0]}" x2="${pt[0]}" y1="${height-7}" y2="4" stroke="#b65cff" stroke-dasharray="3 4"/><circle class="mark" cx="${pt[0]}" cy="${pt[1]}" r="5"/>`:''}</svg>`;
 }
 function loadPreferences(){try{let v=JSON.parse(localStorage.getItem('liberient-tracker-v2')||'null');return v&&v.configured===true&&Array.isArray(v.ids)?v:null}catch{return null}}
 function savePreferences(){try{localStorage.setItem('liberient-tracker-v2',JSON.stringify({configured:true,ids:selected}))}catch{}}
 function content(id){let map={revenue:{title:'Revenue performance',value:display('revenue'),line:'Last 30 completed days',delta:ds.trend.revenue},orders:{title:'Order flow',value:display('orders'),line:'Completed order counts',delta:ds.trend.orders},forecast7:{title:'Next 7 days',value:display('forecast7'),line:'Exploratory forecast · HOLD'},forecast30:{title:'Next 30 days',value:display('forecast30'),line:'Exploratory forecast · HOLD'},customers:{title:'Customer momentum',value:display('customers'),line:'Connected customer aggregates'},inventory:{title:'Inventory picture',value:display('inventory'),line:'Connected stock quantity'},refunds:{title:'Return pressure',value:display('refunds'),line:'Connected refund totals'},source:{title:'Source & provenance',value:ds.sourceLabel,line:ds.disclaimer},insights:{title:'What changed?',value:ds.change?`${ds.change.percent>0?'+':''}${ds.change.percent}%`:'No material shift',line:ds.change?'Two closed 7-day windows':'No detected inflection (not a guarantee)'}};
 return map[id];}
 function updateSlides(){
  const eligible=ds.registry.filter(x=>x.id!=='source');if(!eligible.length)return;
  slideIndex=Math.min(Math.max(0,slideIndex),eligible.length-1);
  const cards=eligible.map(m=>{
   const v=content(m.id),change=v.delta===null||v.delta===undefined?'':`<span class="delta">${v.delta>0?'+':''}${v.delta}% vs prior 30 days</span>`;
   return `<article class="slide" data-id="${m.id}" aria-label="${v.title}"><h3>${v.title}</h3><strong>${v.value}</strong><div class="note">${v.line}</div>${change}${['revenue','orders','insights','forecast7','forecast30'].includes(m.id)?chart(ds.rows):''}</article>`;
  });
  $('slides').innerHTML=cards.join('');$('carouselDots').innerHTML=eligible.map((_,i)=>`<span class="${i===slideIndex?'current':''}" aria-hidden="true"></span>`).join('');$('carouselPage').textContent=`${slideIndex+1} / ${eligible.length}`;
  requestAnimationFrame(()=>{$('slides').children[slideIndex]?.scrollIntoView({block:'nearest',inline:'start',behavior:'smooth'});});
 }
 function moveSlide(delta){const n=ds.registry.filter(x=>x.id!=='source').length;if(!n)return;slideIndex=(slideIndex+delta+n)%n;const card=$('slides').children[slideIndex];card?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});$('carouselPage').textContent=`${slideIndex+1} / ${n}`;[...$('carouselDots').children].forEach((x,i)=>x.classList.toggle('current',i===slideIndex));emit('carousel-change',{module:card?.dataset.id,source:ds.kind});}
 function renderTracker(){const items=ds.registry.filter(m=>selected.includes(m.id));$('tracker').replaceChildren();$('streamEmpty').hidden=items.length!==0;
  items.forEach(m=>{const v=content(m.id),el=document.createElement('article');el.className='track-card';el.innerHTML=`<div class="kicker">${m.label}</div><strong></strong><div class="small"></div>`;el.querySelector('strong').textContent=v.value;el.querySelector('.small').textContent=v.line;if(['revenue','orders','forecast7'].includes(m.id))el.insertAdjacentHTML('beforeend',chart(ds.rows,190,58));$('tracker').append(el);});}
 function renderChoices(){const root=$('choices');root.replaceChildren();ds.registry.forEach(m=>{const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=selected.includes(m.id);check.addEventListener('change',()=>{if(check.checked&&!selected.includes(m.id))selected.push(m.id);if(!check.checked)selected=selected.filter(x=>x!==m.id);savePreferences();renderTracker();emit('tracker-customized',{module:m.id,source:ds.kind});});label.append(check,document.createTextNode(m.label));root.append(label);});}
 function render(){
  const connected=ds.connected;document.querySelector('.sidebar').classList.toggle('connected',connected);
  $('connectionText').textContent=connected?'Source active':'Not connected';$('sourceType').textContent=ds.sourceLabel+(connected?' · '+ds.asOf:'');
  $('heroMode').textContent=connected?ds.sourceLabel.toUpperCase()+' · DECISIONS HOLD':'AWAITING A DATA SOURCE';$('workspace').hidden=!connected;$('clearBtn').hidden=!connected;
  $('startMessage').textContent=ds.disclaimer;document.querySelectorAll('[data-needs]').forEach(el=>{el.hidden=ds.feature[el.dataset.needs]!==true;});
  if(!connected)return;
  const prefs=loadPreferences();selected=prefs?X.selection(ds,prefs.ids).available.filter(id=>prefs.ids.includes(id)):ds.registry.map(x=>x.id); // Source gate always wins; an intentional empty selection stays empty.
  slideIndex=0;updateSlides();renderTracker();renderChoices();$('authority').textContent=`${ds.sourceLabel} · ${ds.disclaimer} · Decision authority HOLD`;
  $('assistantTitle').textContent=capabilities.chatgptEnabled&&accessKey?'Ask ChatGPT':'Ask your business data';$('assistantLabel').textContent=capabilities.chatgptEnabled&&accessKey?'PRIVATE AI CONNECTION':'LOCAL SNAPSHOT INSIGHTS';
 }
 function load(d,privateSource=false){if(!privateSource)accessKey=null;ds=d;emit('source-connected',{source:d.kind,reason:d.disclaimer});render();$('answer').textContent='Ready to answer questions using the enabled source only.';}
 function reset(){ds=X.createDataset();accessKey=null;selected=[];if(poll){clearInterval(poll);poll=null;}emit('source-cleared',{reason:'Source manually cleared'});render();}
 async function loadPrivate(){const k=$('privateKey').value;if(!k){$('startMessage').textContent='Enter your private dashboard key.';return}try{
  const response=await fetch('/api/snapshot',{headers:{Authorization:'Bearer '+k},cache:'no-store'});if(!response.ok)throw Error('Private source unavailable or authorization rejected');
  const data=await response.json();const parsed=X.fromSnapshot(data);accessKey=k;$('privateKey').value='';$('privateAccess').hidden=true;load(parsed,true);
  if(poll)clearInterval(poll);poll=setInterval(async()=>{if(document.visibilityState==='hidden'||!accessKey)return;try{const r=await fetch('/api/snapshot',{headers:{Authorization:'Bearer '+accessKey},cache:'no-store'});if(r.ok){const next=X.fromSnapshot(await r.json());if(next.asOf!==ds.asOf||next.values.revenue!==ds.values.revenue)load(next,true);}}catch{}},60000);
 }catch(e){$('startMessage').textContent=e.message;accessKey=null;}}
 function exportAudit(){emit('audit-export',{source:ds.kind,reason:'Local, non-immutable session event export'});const content=JSON.stringify({version:X.VERSION,source:ds.kind,authority:'HOLD',events:framework.events(),note:'Volatile client session audit only; not a production immutable ledger. No raw business records exported.'},null,2);const a=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));a.href=url;a.download='liberient-session-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('carouselPrev').addEventListener('click',()=>moveSlide(-1));$('carouselNext').addEventListener('click',()=>moveSlide(1));
 $('slides').addEventListener('scroll',()=>{const el=$('slides'),first=el.firstElementChild;if(!first)return;const step=first.getBoundingClientRect().width+13;const count=el.children.length;const i=Math.max(0,Math.min(count-1,Math.round(el.scrollLeft/step)));if(i!==slideIndex){slideIndex=i;$('carouselPage').textContent=`${i+1} / ${count}`;[...$('carouselDots').children].forEach((v,j)=>v.classList.toggle('current',i===j));}},{passive:true});
 $('demoBtn').addEventListener('click',()=>load(X.fromDemo(F2)));$('csvBtn').addEventListener('click',()=>$('csvFile').click());$('csvFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3_000_000)throw Error('CSV exceeds 3 MB');load(X.fromImport(F2,await file.text()));}catch(err){$('startMessage').textContent=err.message;}finally{e.target.value='';}});$('clearBtn').addEventListener('click',reset);
 $('customizeBtn').addEventListener('click',()=>{$('customize').hidden=!$('customize').hidden;emit('customize-open',{source:ds.kind});});$('doneCustomize').addEventListener('click',()=>{$('customize').hidden=true;});$('auditBtn').addEventListener('click',exportAudit);
 $('privateBtn').addEventListener('click',()=>{$('privateAccess').hidden=!$('privateAccess').hidden;emit('source-connect-attempt',{source:'SHOPIFY'});});$('connectBtn').addEventListener('click',loadPrivate);
 document.querySelectorAll('a.nav').forEach(link=>link.addEventListener('click',()=>emit('module-view',{module:link.textContent.trim(),source:ds.kind})));\n $('askForm').addEventListener('submit',async e=>{e.preventDefault();const q=$('question').value.trim();if(!ds.connected||!q)return;emit('assistant-question',{source:ds.kind,reason:'User question submitted, contents not logged'});
  $('answer').textContent='Checking available information…';if(capabilities.chatgptEnabled&&accessKey){try{const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessKey},body:JSON.stringify({question:q})});if(!response.ok)throw Error('Secure AI currently unavailable');const body=await response.json();$('answer').textContent=body.answer+' · Decision authority HOLD';emit('assistant-response',{source:ds.kind,reason:'Bounded AI aggregate response; no raw prompts in audit'});}catch{$('answer').textContent='Secure ChatGPT unavailable. '+X.localAnswer(ds,q);} }else{$('answer').textContent=X.localAnswer(ds,q);emit('assistant-response',{source:ds.kind,reason:'Local deterministic source-backed response'});}});
 fetch('/api/capabilities',{cache:'no-store'}).then(x=>x.ok?x.json():null).then(x=>{capabilities=x||{};if(x?.privateSnapshot)$('privateBtn').hidden=false;render();}).catch(()=>{});
 render();
})();
