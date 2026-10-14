'use strict';
(()=>{
 const X=window.LiberientExperience,F2=window.F2,$=id=>document.getElementById(id),framework=X.createFramework();
 let ds=X.createDataset(),selected=[],slideIndex=0,accessKey=null,capabilities={},poll=null;
 const money=x=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(x??0);
 const display=(id)=>{const n=ds.values[id];if(id==='source')return ds.sourceLabel;if(id==='insights')return n||'Review observations';if(n===null||n===undefined)return '—';return (['revenue','forecast7','forecast30','refunds'].includes(id)?'$':'')+money(n)};
 const emit=(type,arg)=>{framework.emit(type,arg);$('lastEvent').textContent=`Last framework event: ${type.replaceAll('-',' ')} · ${new Date().toLocaleTimeString()}`};
 function chart(rows,width=360,height=69,field='net_sales'){
  const a=rows.slice(-60);if(a.length<14||a.some(x=>!Number.isFinite(x[field])))return '';
  let min=Math.min(...a.map(x=>x[field])),max=Math.max(...a.map(x=>x[field]));if(max===min)max++;
  const point=(x,i)=>[5+i*(width-10)/(a.length-1),height-8-((x[field]-min)/(max-min))*(height-18)];
  const half=Math.max(2,a.length-7),before=a.slice(0,half).map((x,i)=>point(x,i).join(',')).join(' '),after=a.slice(half-1).map((x,i)=>point(x,i+half-1).join(',')).join(' ');
  // Retrospective changepoint recognition across all 60 completed daily observations.
  // Mark a point only after seven subsequent observations confirmed the window shift.
  let strongest={index:-1,pct:0};
  for(let end=13;end<a.length;end++){
   const prior=a.slice(end-13,end-6),current=a.slice(end-6,end+1);
   const avg=prior.reduce((n,x)=>n+x[field],0)/7;
   const recent=current.reduce((n,x)=>n+x[field],0)/7;
   if(avg<=0)continue;
   const pct=100*(recent/avg-1);
   if(Math.abs(pct)>=12&&Math.abs(pct)>Math.abs(strongest.pct))strongest={index:end,pct};
  }
  const m=strongest.index>=0?{date:a[strongest.index].date}:null;
  const pt=m?point(a[strongest.index],strongest.index):null;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${({orders:'Order count',returning_customers:'Returning-customer activity',inventory_units:'Inventory units',refunds:'Refund amounts'})[field]||'Revenue'} trend${m?' with observed change point':''}"><path d="M5 ${height-7} L${width-5} ${height-7}" stroke="#343c87"/><polyline points="${before}"/><polyline class="after" points="${after}"/>${pt?`<line x1="${pt[0]}" x2="${pt[0]}" y1="${height-7}" y2="4" stroke="#b65cff" stroke-dasharray="3 4"/><circle class="mark" cx="${pt[0]}" cy="${pt[1]}" r="5"/>`:''}</svg>`;
 }
 function loadPreferences(){try{let v=JSON.parse(localStorage.getItem('liberient-tracker-v2')||'null');return v&&v.configured===true&&Array.isArray(v.ids)?v:null}catch{return null}}
 function savePreferences(){try{localStorage.setItem('liberient-tracker-v2',JSON.stringify({configured:true,ids:selected}))}catch{}}
 function content(id){let map={revenue:{title:'Revenue performance',value:display('revenue'),line:'Last 30 completed days',delta:ds.trend.revenue},orders:{title:'Order flow',value:display('orders'),line:'Completed order counts',delta:ds.trend.orders},forecast7:{title:'Next 7 days',value:display('forecast7'),line:'Exploratory forecast · HOLD'},forecast30:{title:'Next 30 days',value:display('forecast30'),line:'Exploratory forecast · HOLD'},customers:{title:'Customer momentum',value:display('customers'),line:'Customer-order activity · last 30 days, not unique people'},inventory:{title:'Inventory picture',value:display('inventory'),line:'Units on hand · last completed day'},refunds:{title:'Return pressure',value:display('refunds'),line:'Refund amount · last 30 days'},source:{title:'Source & provenance',value:ds.sourceLabel,line:ds.disclaimer},insights:{title:'What changed?',value:ds.change?`${ds.change.percent>0?'+':''}${ds.change.percent}%`:'No material shift',line:ds.change?'Two closed 7-day windows':'No detected inflection (not a guarantee)'}};
 return map[id];}
 function updateSlides(){
  const eligible=ds.registry.filter(x=>x.id!=='source');if(!eligible.length)return;
  slideIndex=Math.min(Math.max(0,slideIndex),eligible.length-1);
  const cards=eligible.map(m=>{
   const v=content(m.id),change=v.delta===null||v.delta===undefined?'':`<span class="delta">${v.delta>0?'+':''}${v.delta}% vs prior 30 days</span>`;
   return `<article class="slide" data-id="${m.id}" aria-label="${v.title}"><h3>${v.title}</h3><strong>${v.value}</strong><div class="note">${v.line}</div>${change}${['revenue','orders','customers','inventory','refunds','insights'].includes(m.id)?chart(ds.rows,360,69,({orders:'orders',customers:'returning_customers',inventory:'inventory_units',refunds:'refunds'})[m.id]||'net_sales'):''}</article>`;
  });
  $('slides').innerHTML=cards.join('');$('carouselDots').innerHTML=eligible.map((_,i)=>`<span class="${i===slideIndex?'current':''}" aria-hidden="true"></span>`).join('');$('carouselPage').textContent=`${slideIndex+1} / ${eligible.length}`;
  requestAnimationFrame(()=>{$('slides').children[slideIndex]?.scrollIntoView({block:'nearest',inline:'start',behavior:'smooth'});});
 }
 function moveSlide(delta){const n=ds.registry.filter(x=>x.id!=='source').length;if(!n)return;slideIndex=(slideIndex+delta+n)%n;const card=$('slides').children[slideIndex];card?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});$('carouselPage').textContent=`${slideIndex+1} / ${n}`;[...$('carouselDots').children].forEach((x,i)=>x.classList.toggle('current',i===slideIndex));emit('carousel-change',{module:card?.dataset.id,source:ds.kind});}
 function renderTracker(){const items=selected.map(id=>ds.registry.find(m=>m.id===id)).filter(Boolean);$('tracker').replaceChildren();$('streamEmpty').hidden=items.length!==0;
  items.forEach(m=>{const v=content(m.id),el=document.createElement('article');el.className='track-card';el.innerHTML=`<div class="kicker">${m.label}</div><strong></strong><div class="small"></div>`;el.querySelector('strong').textContent=v.value;el.querySelector('.small').textContent=v.line;if(['revenue','orders','customers','inventory','refunds'].includes(m.id))el.insertAdjacentHTML('beforeend',chart(ds.rows,190,58,({orders:'orders',customers:'returning_customers',inventory:'inventory_units',refunds:'refunds'})[m.id]||'net_sales'));
  const controls=document.createElement('div');controls.className='track-controls';
  for(const [label,step] of [['←',-1],['→',1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.title='Reorder '+m.label;b.setAttribute('aria-label',label==='←'?'Move '+m.label+' earlier':'Move '+m.label+' later');b.onclick=()=>{const at=selected.indexOf(m.id),other=at+step;if(other<0||other>=selected.length)return;[selected[at],selected[other]]=[selected[other],selected[at]];savePreferences();renderTracker();emit('tracker-customized',{module:m.id,source:ds.kind,reason:'Reordered'});};controls.append(b);}el.append(controls);$('tracker').append(el);});}
 function renderChoices(){const root=$('choices');root.replaceChildren();ds.registry.forEach(m=>{const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=selected.includes(m.id);check.addEventListener('change',()=>{if(check.checked&&!selected.includes(m.id))selected.push(m.id);if(!check.checked)selected=selected.filter(x=>x!==m.id);savePreferences();renderTracker();emit('tracker-customized',{module:m.id,source:ds.kind});});label.append(check,document.createTextNode(m.label));root.append(label);});}
 function render(){
  const connected=ds.connected;document.querySelector('.sidebar').classList.toggle('connected',connected);
  $('connectionText').textContent=connected?'Source active':'Not connected';$('sourceType').textContent=ds.sourceLabel+(connected?' · '+ds.asOf:'');
  $('heroMode').textContent=connected?ds.sourceLabel.toUpperCase()+' · DECISIONS HOLD':'AWAITING A DATA SOURCE';$('workspace').hidden=!connected;$('clearBtn').hidden=!connected;
  $('startMessage').textContent=ds.disclaimer;document.querySelectorAll('[data-needs]').forEach(el=>{el.hidden=ds.feature[el.dataset.needs]!==true;});
  if(!connected){$('aiApproval').hidden=true;return;}
  const prefs=loadPreferences();selected=prefs?prefs.ids.filter(id=>X.selection(ds,prefs.ids).available.includes(id)):ds.registry.map(x=>x.id); // Source gate always wins; an intentional empty selection stays empty.
  slideIndex=0;updateSlides();renderTracker();renderChoices();$('authority').textContent=`${ds.sourceLabel} · ${ds.disclaimer} · Decision authority HOLD`;
  const aiAvailable=!!(capabilities.chatgptEnabled&&accessKey);$('aiApproval').hidden=!aiAvailable;if(!aiAvailable)$('aiConsent').checked=false;
  $('assistantTitle').textContent=aiAvailable?'Ask your business data · Optional ChatGPT':'Ask your business data';$('assistantLabel').textContent=aiAvailable?'AI AVAILABLE · REQUIRES YOUR APPROVAL':'LOCAL SNAPSHOT INSIGHTS';
 }
 function load(d,privateSource=false){if(d.connected&&d.change)framework.proposal('Review observed '+d.change.direction+' sales shift for prospective validation; no auto-promotion');if(!privateSource){accessKey=null;if(poll){clearInterval(poll);poll=null;}}ds=d;emit('source-connected',{source:d.kind,reason:d.disclaimer});render();$('answer').textContent='Ready to answer questions using the enabled source only.';}
 function reset(){ds=X.createDataset();accessKey=null;selected=[];if(poll){clearInterval(poll);poll=null;}emit('source-cleared',{reason:'Source manually cleared'});render();}
 async function loadPrivate(){const k=$('privateKey').value;if(!k){$('startMessage').textContent='Enter your private dashboard key.';return}try{
  const response=await fetch('/api/snapshot',{headers:{Authorization:'Bearer '+k},cache:'no-store'});if(!response.ok)throw Error('Private source unavailable or authorization rejected');
  const data=await response.json();const parsed=X.fromSnapshot(data);accessKey=k;$('privateKey').value='';$('privateAccess').hidden=true;load(parsed,true);
  if(poll)clearInterval(poll);poll=setInterval(async()=>{if(document.visibilityState==='hidden'||!accessKey)return;try{const r=await fetch('/api/snapshot',{headers:{Authorization:'Bearer '+accessKey},cache:'no-store'});if(r.ok){const next=X.fromSnapshot(await r.json());if(next.asOf!==ds.asOf||next.values.revenue!==ds.values.revenue)load(next,true);}}catch{}},60000);
 }catch(e){$('startMessage').textContent=e.message;accessKey=null;emit('source-connect-error',{source:'SHOPIFY',reason:'Private source unavailable'});}}
 function exportAudit(){emit('audit-export',{source:ds.kind,reason:'Bounded local audit export'});const content=JSON.stringify({version:X.VERSION,source:ds.kind,authority:'HOLD',events:framework.events(),note:'Volatile client session audit only; not a production immutable ledger. No raw business records exported.'},null,2);const a=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));a.href=url;a.download='liberient-session-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('carouselPrev').addEventListener('click',()=>moveSlide(-1));$('carouselNext').addEventListener('click',()=>moveSlide(1));
 $('slides').addEventListener('scroll',()=>{const el=$('slides'),first=el.firstElementChild;if(!first)return;const step=first.getBoundingClientRect().width+13;const count=el.children.length;const i=Math.max(0,Math.min(count-1,Math.round(el.scrollLeft/step)));if(i!==slideIndex){slideIndex=i;$('carouselPage').textContent=`${i+1} / ${count}`;[...$('carouselDots').children].forEach((v,j)=>v.classList.toggle('current',i===j));}},{passive:true});
 async function useDemo60(){
  emit('module-view',{module:'synthetic-demo-60d'});
  let fixture=null;
  try{const r=await fetch('/api/demo60',{cache:'no-store'});if(r.ok)fixture=await r.json();}catch{}
  if(!fixture)fixture=window.LiberientDemo60.generate();
  try{load(X.fromDemo60(F2,fixture));$('startMessage').textContent=fixture.database?.engine==='SQLite'?'Two months of synthetic records loaded from the SQLite demo database.':'Two months of generated synthetic records loaded locally (no database connection on this site).';}
  catch(e){$('startMessage').textContent='The synthetic source failed validation: '+e.message;}
 }
 $('demoBtn').addEventListener('click',useDemo60);$('csvBtn').addEventListener('click',()=>{emit('module-view',{module:'import-aggregate'});$('csvFile').click();});$('csvFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3_000_000)throw Error('CSV exceeds 3 MB');load(X.fromImport(F2,await file.text()));}catch(err){$('startMessage').textContent=err.message;}finally{e.target.value='';}});$('clearBtn').addEventListener('click',reset);
 $('customizeBtn').addEventListener('click',()=>{emit('customize-open',{source:ds.kind});$('customize').hidden=!$('customize').hidden;});$('doneCustomize').addEventListener('click',()=>{emit('module-view',{module:'customize-done'});$('customize').hidden=true;});$('auditBtn').addEventListener('click',()=>{emit('module-view',{module:'session-audit'});exportAudit();});
 $('privateBtn').addEventListener('click',()=>{emit('source-connect-attempt',{source:'SHOPIFY'});$('privateAccess').hidden=!$('privateAccess').hidden;});$('connectBtn').addEventListener('click',()=>{emit('module-view',{module:'private-connection-attempt'});loadPrivate();});
 document.querySelectorAll('nav .nav').forEach(el=>el.addEventListener('click',()=>emit('module-view',{module:el.querySelector('span')?.textContent||'overview',source:ds.kind})));
 $('askForm').addEventListener('submit',async e=>{e.preventDefault();const q=$('question').value.trim();if(!ds.connected||!q)return;emit('assistant-question',{source:ds.kind,reason:'User question submitted, contents not logged'});
  $('answer').textContent='Checking available information…';if(capabilities.chatgptEnabled&&accessKey&&$('aiConsent').checked){try{const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessKey},body:JSON.stringify({question:q,approved:true})});if(!response.ok)throw Error('Secure AI currently unavailable');const body=await response.json();$('answer').textContent=body.answer+' · Decision authority HOLD';emit('assistant-response',{source:ds.kind,reason:'Approved aggregate-only AI response'});}catch{$('answer').textContent='Secure ChatGPT unavailable. '+X.localAnswer(ds,q);emit('assistant-response',{source:ds.kind,reason:'Local response after unavailable AI'});} }else{$('answer').textContent=X.localAnswer(ds,q);emit('assistant-response',{source:ds.kind,reason:'Local source-backed response'});}});
 const autoLoad=()=>{if($('autoDemo')?.value==='true'&&(capabilities.demoMode===true||!capabilities.privateSnapshot))useDemo60();};
 fetch('/api/capabilities',{cache:'no-store'}).then(x=>x.ok?x.json():null).then(x=>{capabilities=x||{};if(x?.privateSnapshot)$('privateBtn').hidden=false;if(x?.privateSnapshot&&x?.demoMode!==true)$('demoBtn').hidden=true;render();autoLoad();}).catch(()=>autoLoad());
 render();
})();
