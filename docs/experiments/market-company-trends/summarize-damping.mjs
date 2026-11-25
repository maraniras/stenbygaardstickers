import fs from 'node:fs'
import assert from 'node:assert/strict'
const root=new URL('./',import.meta.url)
const runs=['dampingPilot','dampingValidation'].map(p=>JSON.parse(fs.readFileSync(new URL(`stress-${p}-20261125.json`,root),'utf8')))
assert.equal(new Set(runs.flatMap(r=>r.seeds)).size,80)
assert(runs.every(r=>r.markets===40&&Object.keys(r.models).length===3))
const models={}
for(const key of Object.keys(runs[0].models)){
 const samples=runs.map(r=>r.models[key])
 const mean=fn=>samples.reduce((a,s)=>a+fn(s),0)/samples.length
 models[key]={
  maximumObservedQuote:Math.max(...samples.map(s=>s.maxObservedPrice)),
  stockPeakAbove1000Percent:mean(s=>s.stockPeakAbove1000Percent),
  stockPeakAbove10000Percent:mean(s=>s.stockPeakAbove10000Percent),
  meanFresh30DayPortfolioReturnPercent:mean(s=>s.portfolioRolling30Days.mean),
  stockYearLossPercent:mean(s=>s.stockYearLossPercent),
  overheatedStrategyBeatsHoldPercent:mean(s=>s.strategies.avoidOverheated.beatHoldPercent),
  weekMomentumBeatsHoldPercent:mean(s=>s.strategies.momentumWeek.beatHoldPercent),
  resistanceDipBeatsHoldPercent:mean(s=>s.strategies.resistanceDip.beatHoldPercent),
 }
 assert(Object.values(models[key]).every(Number.isFinite))
}
const output={markets:80,stocksPerMarket:20,models,
 method:'Equal-size batches: means and proportions pooled with equal weights; maxima use maximum across both batches; no averaged percentiles. Overlapping 30-day windows are dependent.',
 recommendation:'Experimental comparison only; see DAMPING.md for assessment. Neither variant is automatically promoted.'}
fs.writeFileSync(new URL('damping-summary-20261125.json',root),JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify(output,null,2))
