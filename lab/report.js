'use strict';
const fs=require('node:fs');
const path=require('node:path');
const LAB=require('./synthetic.js');
// Synthetic-only reporting. No customer information, no Shopify credentials, no model changes.
function dailySeed(date){
 const raw=String(date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||Number.isNaN(new Date(raw+'T00:00:00Z').valueOf())||new Date(raw+'T00:00:00Z').toISOString().slice(0,10)!==raw)throw Error('Invalid report date');
 return 1+Number(raw.replaceAll('-',''))%900000000;
}
function createReport({date=new Date().toISOString().slice(0,10),seed=dailySeed(date),seeds=3}={}){
 const report=LAB.batch({seed,seeds}),rows=report.businesses.map(b=>({type:b.type,name:b.name,seven:b.summary[7],thirty:b.summary[30],evidence:b.runs.map(x=>({seed:x.seed,fingerprint:x.fingerprint,split:x.split}))}));
 const warnings=rows.flatMap(b=>[7,30].flatMap(h=>{const t=b[h===7?'seven':'thirty'];return [...(t.meanImprovement<0?[`${b.name} ${h}-day original challenger underperformed`]:[]),...(t.shadowImprovement<0?[`${b.name} ${h}-day shadow challenger underperformed`]:[])];}));
 const contents={id:`f2-synthetic-daily-${date}`,generatedAt:new Date().toISOString(),asOf:LAB.AS_OF,date,version:LAB.VERSION,seed,seeds,synthetic:true,decisionAuthority:'HOLD',source:'SYNTHETIC; no Shopify data or merchant history',rows,warnings,prospectiveTest:'No model promotion. Record negative cases and carry fixed methods into future seed challenges.'};
 const lines=[`# F2 Synthetic Learning Lab — ${date}`,'',`**SYNTHETIC ONLY • Decision authority HOLD** • ${rows.length} scenarios × ${seeds} seeds`,'',`Version: ${LAB.VERSION} | Seed: ${seed} | Cutoff: ${LAB.AS_OF}`,'',
 '| Synthetic scenario | 7-day baseline WAPE | 7-day original challenger WAPE | 7-day shadow WAPE | 30-day baseline WAPE | 30-day original challenger WAPE | 30-day shadow WAPE |',
 '|---|---:|---:|---:|---:|---:|---:|',
 ...rows.map(b=>`| ${b.name} | ${b.seven.championWape}% | ${b.seven.candidateWape}% | ${b.seven.shadowWape}% | ${b.thirty.championWape}% | ${b.thirty.candidateWape}% | ${b.thirty.shadowWape}% |`),
 '','## Negative and adversarial observations',...(warnings.length?warnings.map(w=>'- '+w):['- No negative mean comparisons in this seed group. Other cases may fail.']),
 '','## Governance','- Previous v1 methods and original five generator regimes remain frozen and independently comparable.','- Shadow weights (70% recent weekday + 30% history) are fixed before new seed challenges.','- No automatic promotion, optimization on holdout or live business decision.','- This is simulator error only, not measured external Shopify accuracy or profit.','- Generated artifact is not a tamper-proof audit ledger.'];
 return {data:contents,markdown:lines.join('\n')+'\n'};
}
if(require.main===module){
 const date=process.env.F2_REPORT_DATE||new Date().toISOString().slice(0,10),report=createReport({date});
 const dir=path.resolve(process.env.F2_REPORT_DIR||'synthetic-report');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report.data,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'report.md'),report.markdown);
 process.stdout.write(`F2 synthetic ${date}: ${report.data.rows.length} scenarios, seed ${report.data.seed}, ${report.data.warnings.length} negative outcomes, HOLD\n`);
}
module.exports={dailySeed,createReport};
