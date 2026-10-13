'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 let key=null;
 const money=(n,c)=>new Intl.NumberFormat(undefined,{style:'currency',currency:c||'USD',maximumFractionDigits:2}).format(n);
 const fill=(id,items)=>{const el=$(id);el.replaceChildren();for(const x of items){const li=document.createElement('li');li.textContent=x;el.append(li);}};
 async function load(){
   const userKey=$('key').value||key;if(!userKey){$('error').textContent='Enter the private dashboard key.';return;}
   $('load').disabled=true;$('refresh').disabled=true;$('error').textContent='';
   try {
     const r=await fetch('/api/snapshot',{headers:{Authorization:'Bearer '+userKey},cache:'no-store'});
     if(!r.ok)throw Error(r.status===401?'Incorrect key or too many requests.':'Shopify sync is unavailable (Learning Lab stays on HOLD).');
     const d=await r.json();key=userKey;$('key').value='';$('access').style.display='none';$('report').style.display='block';
     $('sales').textContent=money(d.metrics.sales,d.provenance.currency);$('orders').textContent=d.metrics.orders.toLocaleString();$('days').textContent=d.metrics.days;
     $('provenance').textContent=`${d.provenance.start} to ${d.provenance.end} • ${d.provenance.timezone} • ${d.source}. Updated ${new Date(d.refreshedAt).toLocaleString()}.`;
     fill('quality',d.warnings);fill('reasons',[...new Set([...(d.analysis.hold||[]),...(d.analysis.tests[7]?.reasons||[]),...(d.analysis.tests[30]?.reasons||[])])].slice(0,12));
   }catch(e){$('error').textContent=e.message;}finally{$('load').disabled=false;$('refresh').disabled=false;}
 }
 $('load').addEventListener('click',load);$('refresh').addEventListener('click',load);
 $('key').addEventListener('keydown',e=>{if(e.key==='Enter')load()});
})();
