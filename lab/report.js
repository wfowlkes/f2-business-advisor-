'use strict';
const fs=require('node:fs');
const path=require('node:path');
const LAB=require('./synthetic.js');
// Synthetic-only reports: no Shopify calls, secrets or live model changes.
function dailySeed(date){
 const raw=String(date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||Number.isNaN(new Date(raw+'T00:00:00Z').valueOf())||new Date(raw+'T00:00:00Z').toISOString().slice(0,10)!==raw)throw Error('Invalid report date');
 return 1+Number(raw.replaceAll('-',''))%900000000;
}
function createReport({date=new Date().toISOString().slice(0,10),seed=dailySeed(date),seeds=3}={}){
 const report=LAB.batch({seed,seeds});
 const rows=report.businesses.map(b=>({type:b.type,name:b.name,seven:b.summary[7],thirty:b.summary[30],evidence:b.runs.map(x=>({seed:x.seed,fingerprint:x.fingerprint,split:x.split}))}));
 const warnings=rows.flatMap(b=>[7,30].filter(h=>b[h===7?'seven':'thirty'].meanImprovement<0).map(h=>b.name+' '+h+'-day synthetic challenger underperformed selected baseline'));
 const contents={id:'f2-synthetic-daily-'+date,generatedAt:new Date().toISOString(),asOf:LAB.AS_OF,date,version:LAB.VERSION,seed,seeds,synthetic:true,decisionAuthority:'HOLD',source:'SYNTHETIC; no Shopify data or merchant history',rows,warnings,prospectiveTest:'No model promotion. Record negative cases and carry fixed methods into future seed challenges.'};
 const lines=['# F2 Synthetic Learning Lab — '+date,'','**SYNTHETIC ONLY • Decision authority HOLD** • '+rows.length+' business scenarios × '+seeds+' deterministic seeds','','Version: '+LAB.VERSION+' | Seed: '+seed+' | Synthetic history cutoff: '+LAB.AS_OF,'','| Synthetic business | 7-day baseline WAPE | 7-day challenger WAPE | 7-day WAPE improvement | 30-day baseline WAPE | 30-day challenger WAPE | 30-day WAPE improvement |','|---|---:|---:|---:|---:|---:|---:|',...rows.map(b=>'| '+b.name+' | '+b.seven.championWape+'% | '+b.seven.candidateWape+'% | '+b.seven.meanImprovement+'% | '+b.thirty.championWape+'% | '+b.thirty.candidateWape+'% | '+b.thirty.meanImprovement+'% |'),'','## Negative / adversarial observations',...(warnings.length?warnings.map(w=>'- '+w):['- No negative mean comparisons in this seed set; other outcomes remain possible.']),'','## Governance','- Training, validation and holdout are separate; holdout graded only after model selection.','- Candidate improvements are synthetic research hypotheses, never live model promotions.','- No Shopify data, merchant credentials, inventory changes or business decisions are involved.','- Exported artifact is dated evidence, not an independently immutable production audit ledger.'];
 return {data:contents,markdown:lines.join('\n')+'\n'};
}
if(require.main===module){
 const date=process.env.F2_REPORT_DATE||new Date().toISOString().slice(0,10),report=createReport({date});
 const dir=path.resolve(process.env.F2_REPORT_DIR||'synthetic-report');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report.data,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'report.md'),report.markdown);
 process.stdout.write('F2 synthetic '+date+': '+report.data.rows.length+' scenarios, seed '+report.data.seed+', '+report.data.warnings.length+' negative outcomes, HOLD\n');
}
module.exports={dailySeed,createReport};
