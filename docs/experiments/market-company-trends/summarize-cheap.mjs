import fs from 'node:fs'
import assert from 'node:assert/strict'
const root=new URL('./',import.meta.url)
const runs=['cheapPilot','cheapValidation'].map(p=>JSON.parse(fs.readFileSync(new URL(`stress-${p}-20261125.json`,root),'utf8')))
assert.equal(new Set(runs.flatMap(r=>r.seeds)).size,80)
assert(runs.every(r=>r.markets===40))
const models={}
for(const key of Object.keys(runs[0].models)){
 const samples=runs.map(r=>r.models[key])
 const mean=fn=>samples.reduce((a,s)=>a+fn(s),0)/samples.length
 const group='upTo10'
 models[key]={
  cheapStocksPerMarket:samples[0].startPriceGroups[group].stocksPerMarket,
  cheapFinishGain1000Percent:mean(s=>s.startPriceGroups[group].finishGrossGain1000Percent),
  cheapFinishGain2000Percent:mean(s=>s.startPriceGroups[group].finishGrossGain2000Percent),
  cheapEverGain1000Percent:mean(s=>s.startPriceGroups[group].everGrossGain1000Percent),
  cheapEverGain2000Percent:mean(s=>s.startPriceGroups[group].everGrossGain2000Percent),
  cheapYearPositivePercent:mean(s=>s.startPriceGroups[group].annualNet.positivePercent),
  cheapYearMeanNetPercent:mean(s=>s.startPriceGroups[group].annualNet.mean),
  meanFresh30DayPortfolioReturnPercent:mean(s=>s.portfolioRolling30Days.mean),
  resistanceDipBeatsHoldPercent:mean(s=>s.strategies.resistanceDip.beatHoldPercent),
  maximumQuote:Math.max(...samples.map(s=>s.maxObservedPrice)),
 }
 assert(Object.values(models[key]).every(Number.isFinite))
}
const out={markets:80,stocksPerMarket:20,models,
 method:'Equal-size batches pooled with equal weights for means and proportions. No averaged medians. Cheap: original quote <=10. Gain percentages in threshold metrics are gross, not after sale fee. New monthly investments; overlapping windows dependent.'}
fs.writeFileSync(new URL('cheap-summary-20261125.json',root),JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out,null,2))
