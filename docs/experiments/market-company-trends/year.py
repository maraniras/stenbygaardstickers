"""365 real days; same preselected market-noise seed as the previous year."""
import argparse
import csv
import importlib.util
import json
import math
from pathlib import Path
import sys
import numpy as np
from company import trends
from cheap import adjustments

folder = Path(__file__).parent
parser=argparse.ArgumentParser()
parser.add_argument('--variant',choices=['legacy','candidate','bounded','cheap'],default='cheap')
args=parser.parse_args()
candidate=args.variant=='candidate'
monthly_factor=1.5 if args.variant=='legacy' else 1.25
spec = importlib.util.spec_from_file_location('market_tempo_engine',folder.parent/'market-tempo/compare.py')
engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = engine
spec.loader.exec_module(engine)
seed = 20261128
stocks = json.loads((folder.parent/'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
base = np.array([s['base'] for s in stocks])
risk = np.array([['Lav','Mellem','Høj'].index(s['risk']) for s in stocks])
vol = np.tile(np.array([.012,.022,.035])/math.sqrt(1440),(2,1))
quiet = np.array([[engine.noise_correction(s) for s in row] for row in vol])
wild = np.array([[engine.noise_correction(s*1.5) for s in row] for row in vol])
growth = .9*quiet+.1*wild+math.log(1.05)/(365*1440)
drift,states = trends(seed,365,monthly_factor)
short,_ = trends(seed,90,monthly_factor)
np.testing.assert_array_equal(drift[:,:90,:],short)
stock_noise=None
if args.variant=='cheap':
    stock_noise=np.array([[[vol[m,risk[i]],quiet[m,risk[i]],wild[m,risk[i]]] for i in range(20)] for m in range(2)])
    stock_noise[1],delta=adjustments(base,risk,vol[1],growth[1],engine.noise_correction)
    drift[1]+=delta[None,:]
checkpoints = np.arange(366,dtype=np.int64)*17520
print('Simulating 365 real days, baseline + company trends, 20 stocks',flush=True)
price_rules=np.array([[.02,math.log(2500)],[0.,math.inf]]) if candidate else None
snapshots,peaks,troughs,drawdowns,caps,portfolio_dd = engine.simulate(seed,base,risk,vol,quiet,wild,growth,checkpoints,drift,price_rules,stock_noise=stock_noise)
all_daily = np.exp(snapshots)
old = json.loads((folder.parent/'market-fast-year/result-20261125.json').read_text(encoding='utf-8'))
np.testing.assert_allclose(all_daily[:,0,:],old['daily'],rtol=1e-9,atol=1e-10)
daily = all_daily[:,1,:]
if args.variant=='cheap':
    bounded=json.loads((folder/'year-bounded-20261125.json').read_text(encoding='utf-8'))
    np.testing.assert_allclose(daily[:,base>=25],np.array(bounded['daily'])[:,base>=25],rtol=1e-9,atol=1e-10)
assert np.isfinite(daily).all() and (daily>0).all()
if not candidate:
    assert (daily<=2500+1e-8).all()
    assert (np.exp(peaks[-1,1])<=2500+1e-8).all()
net_factors = daily/base-.05*np.maximum(daily/base-1,0)
results=[]
for i,s in enumerate(stocks):
    end=float(daily[-1,i])
    change=(end/s['base']-1)*100
    results.append({**s,'end':end,'changePercent':change,
        'status':'PLUS' if change>0 else 'MINUS' if change<0 else 'UÆNDRET',
        'netHoldReturnPercent':float((net_factors[-1,i]-1)*100),
        'min':float(np.exp(troughs[-1,1,i])), 'max':float(np.exp(peaks[-1,1,i])),
        'maxDrawdownPercent':float(np.expm1(drawdowns[-1,1,i])*100)})
net_daily=net_factors.mean(axis=1)*1000
output={'seed':seed,'variant':args.variant,'realDays':365,'clockSpeed':365/30,'stocks':results,
        'daily':daily.tolist(),'companyStates':states.tolist(),
        'portfolio':{'initial':1000,'netValue':float(net_daily[-1]),
            'netReturnPercent':float((net_daily[-1]/1000-1)*100),'netDaily':net_daily.tolist(),
            'drawdownPercentHourlyVirtual':float(portfolio_dd[-1,1]*100)},
        'method':{'baselineFullYearChecked':True,'trendPrefixChecked':True,
            'trendRng':'independent per-company SeedSequence [seed,728,companyIndex]; horizon-stable',
            'differenceFrom90DayStudy':'same regime formula; separate per-company RNG streams rather than a sequential stream',
            'regimeRealDays':[7,28],'smoothingRealDays':2,'growthChange':'cheap.py adjustments below initial price 25' if args.variant=='cheap' else 0,
            'trendDailyLogAmplitude':math.log(monthly_factor)/30,
            'priceResistance':not candidate,'fixedPriceCap':None if candidate else 2500,
            'selection':'same original market-noise seed as previous annual example; no result-based seed selection',
            'stockReturn':'gross quote change versus original price; separate net after 5% fee on positive gains',
            'portfolio':'1000 bananas allocated equally by coin amount to all 20 stocks, no rebalancing or deposits',
            'extrema':'all virtual minutes; may include intrareal-minute untradable extrema',
            'notForecast':True}}
stem='year-cheap-20261125' if args.variant=='cheap' else 'year-bounded-20261125' if args.variant=='bounded' else 'year-candidate-20261125' if candidate else 'year-20261125'
(folder/(stem+'.json')).write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
with (folder/(stem+'.csv')).open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f)
    w.writerow(['Aktie','Risiko','Start','Slut','Status','KursaendringPct','NettoPct','Laveste','Hoejeste','StoersteFaldPct'])
    for s in results:
        w.writerow([s[k] for k in ['name','risk','base','end','status','changePercent','netHoldReturnPercent','min','max','maxDrawdownPercent']])
print(json.dumps({'plus':sum(s['status']=='PLUS' for s in results),'minus':sum(s['status']=='MINUS' for s in results),
    'portfolio':output['portfolio']['netValue'],'netReturn':output['portfolio']['netReturnPercent'],
    'baselineChecked':True,'trendPrefixChecked':True}),flush=True)
