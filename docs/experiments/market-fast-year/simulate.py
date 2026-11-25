"""Extend the predefined first normal-tempo example to 365 real days.

No extra growth; exact virtual-minute market model, 365/30 clock speed.
"""
import argparse
import csv
import importlib.util
import json
import math
from pathlib import Path
import sys
import numpy as np

folder=Path(__file__).parent
spec=importlib.util.spec_from_file_location('market_tempo_engine',folder.parent/'market-tempo/compare.py')
engine=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=engine
spec.loader.exec_module(engine)

parser=argparse.ArgumentParser()
parser.add_argument('--seed',type=int,default=20261128)
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args()
stocks=json.loads((folder.parent/'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
base=np.array([s['base'] for s in stocks])
risk=np.array([['Lav','Mellem','Høj'].index(s['risk']) for s in stocks])
speed=365/30
checkpoints=np.array([int(round(day*1440*speed)) for day in range(366)],dtype=np.int64)
vol=np.array([[.012,.022,.035]])/math.sqrt(1440)
quiet=np.array([[engine.noise_correction(s) for s in row] for row in vol])
wild=np.array([[engine.noise_correction(s*1.5) for s in row] for row in vol])
growth=.9*quiet+.1*wild+math.log(1.05)/(365*1440)
print(f'Simulating 365 real days, {checkpoints[-1]} virtual minutes, 20 stocks, seed {args.seed}',flush=True)
snapshots,peaks,troughs,drawdowns,caps,portfolio_drawdowns=engine.simulate(args.seed,base,risk,vol,quiet,wild,growth,checkpoints)
daily=np.exp(snapshots[:,0,:])
factors=daily/base
net_factors=factors-.05*np.maximum(factors-1,0)
portfolio_gross=factors.mean(axis=1)*1000
portfolio_net=net_factors.mean(axis=1)*1000
assert daily.shape==(366,20)
assert np.isfinite(daily).all() and np.all(daily>0) and np.all(daily<=2500+1e-8)
assert np.all(np.exp(peaks[-1,0])>=daily[-1]-1e-8)
assert np.all(np.exp(troughs[-1,0])<=base+1e-8)
prefix_checked=False
if args.seed==20261128:
    previous=json.loads((folder.parent/'market-tempo/results-20261125.json').read_text(encoding='utf-8'))
    example=next(e for e in previous['examples'] if e['seed']==args.seed)
    np.testing.assert_allclose(daily[:91],np.array(example['scenarios']['monthNormal']),rtol=1e-9,atol=1e-10)
    prefix_checked=True
results=[]
for i,s in enumerate(stocks):
    factor=float(factors[-1,i])
    results.append({**s,'end':float(daily[-1,i]),'changePercent':(factor-1)*100,
                    'netHoldReturnPercent':float((net_factors[-1,i]-1)*100),
                    'min':float(np.exp(troughs[-1,0,i])),'max':float(np.exp(peaks[-1,0,i])),
                    'maxDrawdownPercent':float(np.expm1(drawdowns[-1,0,i])*100),
                    'gainFeePerShare':float(.05*max(daily[-1,i]-base[i],0)),
                    'capReached':bool(caps[-1,0,i])})
periods=[]
for day in [30,60,90,120,150,180,210,240,270,300,330,360,365]:
    periods.append({'day':day,'grossValue':float(portfolio_gross[day]),'netValue':float(portfolio_net[day]),
                    'netReturnPercent':float((portfolio_net[day]/1000-1)*100)})
output={'seed':args.seed,'realDays':365,'clockSpeed':speed,'virtualMinutes':int(checkpoints[-1]),
        'virtualDays':float(checkpoints[-1]/1440),'virtualYears':float(checkpoints[-1]/(365*1440)),
        'stocks':results,'daily':daily.tolist(),
        'portfolio':{'initial':1000,'grossValue':float(portfolio_gross[-1]),'netValue':float(portfolio_net[-1]),
                     'netReturnPercent':float((portfolio_net[-1]/1000-1)*100),
                     'drawdownPercentHourlyVirtual':float(portfolio_drawdowns[-1,0]*100),
                     'grossDaily':portfolio_gross.tolist(),'netDaily':portfolio_net.tolist(),'periods':periods},
        'parameters':{'variant':'monthNormal, no extra growth','dailyNoisePerVirtualDay':[.012,.022,.035],
                      'sharedNoiseVarianceFraction':.3,'regimeDriftPerVirtualDay':[.02,.04,.07],
                      'virtualMinuteGrowthLogDrift':growth[0].tolist(),'regimeLengthVirtualMinutes':[30,180],
                      'resistanceFrom':250,'cap':2500,'saleFeeOfPositiveGain':.05},
        'method':{'selection':'predefined first pilot example, no seed search or selection based on year-end result',
                  'portfolio':'1000 bananas equally allocated in bananas over all 20 stocks at initial quote; no rebalancing; no deposits; liquidation only at year end',
                  'dailyValues':'hypothetical liquidation values relative to original cost, not daily trading or realized daily fees',
                  'stockExtrema':'every virtual minute, including start; some intrareal-minute peaks are not visible/tradable in a real-minute UI',
                  'portfolioDrawdown':'hypothetical liquidation value sampled hourly in virtual time, roughly every 4.93 real minutes',
                  'prefix90DaysChecked':prefix_checked,'forecast':False}}
args.out.parent.mkdir(parents=True,exist_ok=True)
args.out.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
with args.out.with_suffix('.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.writer(f)
    w.writerow(['Aktie','Risiko','Start','Slut','KursaendringPct','NettoAfkastPct','LavesteVirtuelleKurs','HoejesteVirtuelleKurs','StoersteFaldPct'])
    for s in results:
        w.writerow([s['name'],s['risk'],s['base'],s['end'],s['changePercent'],s['netHoldReturnPercent'],s['min'],s['max'],s['maxDrawdownPercent']])
print(json.dumps({'stocksUp':sum(s['changePercent']>0 for s in results),
                  'portfolioNet':output['portfolio']['netValue'],'portfolioReturnPercent':output['portfolio']['netReturnPercent'],
                  'maxPrice':max(s['max'] for s in results),'prefix90DaysChecked':prefix_checked,'out':str(args.out)},ensure_ascii=False),flush=True)
