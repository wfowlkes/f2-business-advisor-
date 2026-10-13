'use strict';
/* Research evidence generator: read frozen development-only selection, evaluate independent challenge. */
const fs=require('node:fs');
const path=require('node:path');
const M=require('./scenario_methods.js');
const selectionFile=path.join(__dirname,'selection-frozen.json');
function loadSelection(){
 const x=JSON.parse(fs.readFileSync(selectionFile,'utf8'));
 if(x.version!==M.VERSION)throw Error('Version mismatch in frozen selection');
 if(JSON.stringify(x.developmentSeeds)!==JSON.stringify(M.DEVELOPMENT_SEEDS))throw Error('Development seeds mismatch');
 return x;
}
function compact(report){
 return {version:report.version,evidence:report.evidence,selectionPolicy:report.selectionPolicy,caution:report.caution,
 developmentSeeds:report.developmentSeeds,futureTestSeeds:report.futureTestSeeds,productionStatus:'HOLD',
 businessCount:report.businesses.length,businesses:report.businesses.map(b=>({type:b.type,name:b.name,horizons:Object.fromEntries([7,30].map(h=>{
 const t=b.horizons[h];return [h,{method:t.method,baseline:t.baseline,developmentWape:t.developmentWape,
  baselineDevelopmentWape:t.baselineDevelopmentWape,holdoutWape:t.holdoutWape,holdoutBias:t.holdoutBias,
  baselineHoldoutWape:t.baselineHoldoutWape,improvement:t.improvement,wins:t.wins,losses:t.losses,
  observedBest:t.observedBest,retrospectiveBestOnly:t.retrospectiveBestOnly,status:t.status,
  seedResults:t.seedResults,methodRanks:t.methodRanks,productionStatus:'HOLD'}];}))}))};
}
function report(){return compact(M.challenge(loadSelection()));}
function markdown(data){
 const lines=[`# F2 Scenario-Specific Forecasting — ${data.version}`,'',
 '**SYNTHETIC ONLY — independent challenge evaluation, not real Shopify accuracy. ALL production decisions HOLD.**','',
 `Development seed groups: ${data.developmentSeeds.join(', ')}. Unseen challenge groups: ${data.futureTestSeeds.join(', ')}.`,
 'Models and scenario-specific selections were fixed using development **validation** data. The challenge holdout was inspected after selection.',
 'The simulated business type is known to the experiment. No real-business classifier or universal champion has been validated.','',
 '| Scenario | 7-day selected | 7d WAPE baseline → selected | 7d change | 7d decision | 30-day selected | 30d WAPE baseline → selected | 30d change | 30d decision |',
 '|---|---|---|---:|---|---|---|---:|---|'];
 for(const b of data.businesses){const s=b.horizons[7],t=b.horizons[30];
 lines.push(`| ${b.name} | ${s.method} | ${s.baselineHoldoutWape}% → ${s.holdoutWape}% | ${s.improvement}% | ${s.status} | ${t.method} | ${t.baselineHoldoutWape}% → ${t.holdoutWape}% | ${t.improvement}% | ${t.status} |`);
 }
 lines.push('','## Method rankings and alternative hypotheses','',
 'The first listed ranking is **retrospective** performance over the challenge sets, NOT the method used for forecasts. It must never be substituted after the fact.');
 for(const b of data.businesses){lines.push('',`### ${b.name}`);
  for(const h of [7,30]){const x=b.horizons[h];const top=x.methodRanks.slice(0,5).map(z=>`${z.method} (${z.wape}% WAPE)`).join('; ');
   lines.push(`- **${h}d:** preselected **${x.method}** (${x.holdoutWape}% WAPE, ${x.holdoutBias}% bias), validation-selected baseline **${x.baseline}** (${x.baselineHoldoutWape}% WAPE). Independent improvement **${x.improvement}%**. ${x.wins}/3 challenge groups cleared +10%; ${x.losses}/3 groups worse. **${x.status}**. Retrospective top five: ${top}.`);
  }
 }
 lines.push('','## Learning Lab governance','',
 '- LL-09: Scenario and horizon selections are frozen using development validation only; no use of future test labels to select forecasting strategy.',
 '- LL-10: Record all adverse results including high absolute WAPE, poor bias, and scenario-specific failures. Compare to each seed’s validation-selected baseline.',
 '- LL-11: Generator type is an experimental oracle category. Real regime inference is NOT available and scenario-specific results may collapse on another simulator.',
 '- LL-12: Positive synthetic results are only prospective research candidates; no Shopify reconciliation, uncertainty interval coverage, decision utility or measured profitability.',
 '- HOLD on production recommendations, live Shopify usage, automatic model promotion, and business impact claims.','',
 '## Next prospective work','',
 '- Freeze candidate research settings in code; evaluate generators with changed shock timing, asymmetric seasons, inventory lead times and promotion schedules.',
 '- Develop a **causal, as-of-cutoff** regime detector using only observable prior signals, then test confusion and strategy-routing errors.',
 '- Require improved accuracy on a different generator and real authorized chronological sales history before any merchant-facing model recommendation.');
 return lines.join('\n')+'\n';
}
function calendarMarkdown(r){const lines=['','## Secondary frozen calendar shift (same generator, not external validation)','',
 `Simulation calendar end ${r.cutoff}; new challenge seeds ${r.seeds.join(', ')}. Selections and model formulas unchanged.`,
 '', '| Scenario | 7d mean WAPE change | 7d negative groups | 30d mean WAPE change | 30d negative groups |',
 '|---|---:|---:|---:|---:|'];for(const b of r.businesses){const s=b.horizons[7],t=b.horizons[30];
  lines.push(`| ${b.name} | ${s.meanImprovement}% | ${s.negativeGroups}/3 | ${t.meanImprovement}% | ${t.negativeGroups}/3 |`);
 }lines.push('','The promotion-fatigue method again underperformed on both horizons. Supply-disruption methods did not improve because the frozen selection was the reference itself. These failures stay in the ledger.','');return lines.join('\n')+'\n';}
if(require.main===module){const r=report();const dir=process.env.F2_SCENARIO_OUTPUT||__dirname;
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'strategy-summary.json'),JSON.stringify(r,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'strategy-results.md'),markdown(r));
 const stress=M.calendarStress(loadSelection());fs.writeFileSync(path.join(dir,'calendar-stress.json'),JSON.stringify(stress,null,2)+'\n');
 fs.appendFileSync(path.join(dir,'strategy-results.md'),calendarMarkdown(stress));
 console.log(`${r.version}: ${r.businessCount} simulated businesses × 2 horizons × ${r.futureTestSeeds.length} unseen seeds; production HOLD`);
}
module.exports={loadSelection,compact,report,markdown,calendarMarkdown};
