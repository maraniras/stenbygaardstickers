"""Paired experiments: same random paths, only long-term growth differs.
Python + NumPy; fictional bananas only; no changes to the app.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
parser=argparse.ArgumentParser()
parser.add_argument('--seed',type=int,default=20261101)
parser.add_argument('--reps',type=int,default=50)
args=parser.parse_args()
folder=Path(__file__).parent
old=json.loads((folder/'market-simulation.json').read_text(encoding='utf-8'))
base=np.tile([s['base'] for s in old['stocks']],args.reps)
risk=np.tile([['Lav','Mellem','Høj'].index(s['risk']) for s in old['stocks']],args.reps)
N=len(base)
T=365*1440
rng=np.random.default_rng(args.seed)
random_strategy=np.random.default_rng(733104 if args.seed==20261101 else 733105)
sigma=np.array([.05,.10,.18])[risk]*.4/np.sqrt(1440)
trend_drift=np.array([.10,.20,.35])[risk]*.2/1440

def correction(s,c=.01):
    phi=lambda z:.5*(1+math.erf(z/math.sqrt(2)))
    a=c/s
    return math.log(math.exp(-c)*phi(-a)+math.exp(s*s/2)*(phi(a-s)-phi(-a-s))+math.exp(c)*(1-phi(a)))

quiet=np.array([correction(s) for s in sigma])
wild=np.array([correction(1.5*s) for s in sigma])
models=['noGrowth','smallGrowth','riskCompensatedGrowth']
growth=np.stack([
    np.zeros(N),
    np.log1p(np.array([.08,.15,.25])[risk])/T,
    .9*quiet+.1*wild+math.log(1.05)/T,
])
initial=np.log(base)
price=np.tile(initial,(3,1))
regime=np.zeros(N,dtype=int)
remaining=np.zeros(N,dtype=int)
history=np.zeros((1441,3,N))
history[0]=price
strategies=['buyHold','randomDaily','momentum','oldDip','oldDipLimited']
pos=np.zeros((5,3,N),dtype=bool)
pending=pos.copy()
pending[0]=True
entry=np.zeros((5,3,N))
entry_minute=np.zeros((5,3,N),dtype=int)
gross=np.zeros((5,3,N))
fees=np.zeros((5,3,N))
entries=np.zeros((5,3,N),dtype=int)
exits=np.zeros((5,3,N),dtype=int)
peaks=price.copy()
troughs=price.copy()
hit1000=np.zeros((3,N),dtype=bool)
hitcap=np.zeros((3,N),dtype=bool)
above250=np.zeros(3,dtype=np.int64)
horizons={1440:'day',7*1440:'week',30*1440:'month',49*1440:'sevenWeeks',90*1440:'threeMonths',180*1440:'sixMonths',T:'year'}
snapshots={}
sample_rng=np.random.default_rng(909220)
short_horizons=[10,60,180,1440]
sample_times={h:set(sample_rng.choice(np.arange(30*1440+h,T+1),100,replace=False).tolist()) for h in short_horizons}
samples={h:[] for h in short_horizons}
case=[np.exp(price[:,:20]).tolist()]

def tax_factor(log_return):
    return np.log1p(.05*np.expm1(-np.maximum(log_return,0)))

def stats(values):
    return {'p05p50p95':np.quantile(values,[.05,.5,.95]).tolist(),'mean':float(np.mean(values)),'positivePercent':float(np.mean(values>0)*100)}

assert abs(np.exp(np.log(1.2)+tax_factor(np.array(np.log(1.2))))-1.19)<1e-12
assert tax_factor(np.array(np.log(.8)))==0
print(f'{args.reps} paired markets, {N} stock-years per model, seed {args.seed}',flush=True)
for minute in range(1,T+1):
    due=remaining<=0
    count=np.count_nonzero(due)
    if count:
        regime[due]=rng.choice(4,count,p=[.5,.2,.2,.1])
        remaining[due]=rng.integers(30,181,count)
    trend=np.where(regime==1,trend_drift,np.where(regime==2,-trend_drift,0))
    turbulent=regime==3
    vol=sigma*np.where(turbulent,1.5,1)
    corr=np.where(turbulent,wild,quiet)
    noise=np.clip(vol*rng.standard_normal(N),-.01,.01)
    pressure=.02*np.maximum(price-np.log(250),0)**2/1440
    new=np.minimum(price+trend-pressure+noise-corr+growth,np.log(2500))
    gross+=pos*(new-price)
    price=new
    remaining-=1
    history[minute%1441]=price
    peaks=np.maximum(peaks,price)
    troughs=np.minimum(troughs,price)
    hit1000|=price>=np.log(1000)
    hitcap|=price>=np.log(2500)-1e-12
    above250+=np.count_nonzero(price>np.log(250),axis=1)

    # Every signal is submitted at a 10-minute boundary and filled NEXT minute.
    if minute%10==1:
        buy=pending & ~pos
        sell=~pending & pos
        fees+=np.where(sell,tax_factor(price-entry),0)
        entries+=buy
        exits+=sell
        entry=np.where(buy,price,entry)
        entry_minute=np.where(buy,minute,entry_minute)
        pos=pending.copy()
    if minute%10==0:
        momentum=price-history[(minute-60)%1441] if minute>=60 else np.zeros_like(price)
        pending[2]=np.where(~pos[2],momentum>np.log(1.01),momentum>=np.log(.99))
        pending[3]=np.where(~pos[3],price<initial+np.log(.8),price<initial)
        stop=(price>=initial)|(price-entry[4]<=np.log(.7))|(minute-entry_minute[4]>=30*1440)
        pending[4]=np.where(~pos[4],price<initial+np.log(.8),~stop)
    if minute%1440==0:
        # Same random choices in all three models.
        pending[1]=np.broadcast_to(random_strategy.random(N)<.5,(3,N))
    if minute in horizons:
        net=gross+fees+np.where(pos,tax_factor(price-entry),0)
        snapshots[horizons[minute]]={'prices':price.copy(),'net':net.copy(),'gross':gross.copy()}
    for h in short_horizons:
        if minute in sample_times[h]:
            samples[h].append((price-history[(minute-h)%1441]).astype(np.float32))
    if minute%60==0:
        case.append(np.exp(price[:,:20]).tolist())
    if minute%(90*1440)==0:
        print(f'Day {minute//1440}/365',flush=True)

exits+=pos
assert np.array_equal(entries,exits)
assert np.isfinite(price).all() and np.isfinite(gross).all()
assert np.all(fees<=1e-12)
assert np.all(price<=np.log(2500)+1e-12)

results={}
for m,name in enumerate(models):
    summary={}
    for horizon,s in snapshots.items():
        summary[horizon]={}
        for r,label in enumerate(['Lav','Mellem','Høj']):
            selected=risk==r
            summary[horizon][label]={
                'stockReturnPercent':stats(np.expm1(s['prices'][m,selected]-initial[selected])*100),
                'strategies':{strategy:{'netReturnPercent':stats(np.expm1(s['net'][i,m,selected])*100),'grossReturnPercent':stats(np.expm1(s['gross'][i,m,selected])*100)} for i,strategy in enumerate(strategies)},
            }
    short={}
    for h in short_horizons:
        sample=np.stack(samples[h])[:,m,:]
        short[str(h)]={}
        for r,label in enumerate(['Lav','Mellem','Høj']):
            moves=np.expm1(sample[:,risk==r].ravel())
            short[str(h)][label]={'medianAbsoluteMovePercent':float(np.median(np.abs(moves))*100),'windowCount':int(moves.size)}
    diagnostics={}
    for r,label in enumerate(['Lav','Mellem','Høj']):
        selected=risk==r
        diagnostics[label]={
            'paths':int(selected.sum()),
            'annualAddedLogDrift':float(np.mean(growth[m,selected])*T),
            'annualGrowthMultiplierWithoutNoiseOrPressure':float(np.expm1(np.mean(growth[m,selected])*T)),
            'everOver1000Percent':float(np.mean(hit1000[m,selected])*100),
            'everAtCapPercent':float(np.mean(hitcap[m,selected])*100),
            'finishUnder10PercentOfStartPercent':float(np.mean(price[m,selected]-initial[selected]<np.log(.1))*100),
            'medianRoundTrips':{strategy:float(np.median(entries[i,m,selected])) for i,strategy in enumerate(strategies)},
        }
    results[name]={
        'summary':summary,'shortWindows':short,'diagnostics':diagnostics,
        'globalMax':float(np.exp(peaks[m].max())),'globalMin':float(np.exp(troughs[m].min())),
        'timeOver250Percent':float(above250[m]/(N*T)*100),
        'case':{'hourlySeries':[item[m] for item in case],'endpoints':{k:np.exp(s['prices'][m,:20]).tolist() for k,s in snapshots.items()},'min':np.exp(troughs[m,:20]).tolist(),'max':np.exp(peaks[m,:20]).tolist()},
    }

# Independent hold-out seed and identical paths within each experiment.
# Original seed also checks the optimized runner against the previous v2 engine.
if args.seed==20261101 and args.reps==50:
    previous=json.loads((folder/'market-v2-t0.2-v0.4.json').read_text(encoding='utf-8'))
    for label in ['Lav','Mellem','Høj']:
        for strategy in strategies:
            actual=results['noGrowth']['summary']['year'][label]['strategies'][strategy]['netReturnPercent']['p05p50p95']
            expected=previous['summary']['year'][label]['strategies'][strategy]['netReturnPercent']['p05p50p95']
            assert np.allclose(actual,expected,rtol=1e-10,atol=1e-8),(label,strategy,actual,expected)
    print('Baseline reproduces all previous annual strategy percentiles.',flush=True)

result={'seed':args.seed,'markets':args.reps,'stockYearsPerModel':N,'models':results,'stocks':old['stocks'],
    'method':{'paired':True,'buyFee':0,'positiveRealizedGainFee':.05,'noFeeOnLosses':True,'decisionMinutes':10,'execution':'next minute','walletPerStock':1000,'fractionalShares':True,'leverage':False,'finalLiquidation':True,'baseReturnForce':False,'noiseDailyVolatility':[.02,.04,.072],'regimeDailyLogDrift':[.02,.04,.07],'regimeMinutes':[30,180],'regimeProbabilities':[.5,.2,.2,.1],'cap':2500,'pressure':'.02*max(ln(price/250),0)^2 per day','growth':{'noGrowth':'0','smallGrowth':'log(1+[.08,.15,.25])/525600 per minute','riskCompensatedGrowth':'0.9*quietNoiseLogMoment+0.1*wildNoiseLogMoment+log(1.05)/525600 per minute'},'sampling':'100 shared endpoints per horizon after day 30; overlapping windows; not independent observations','oldDip':'Buy below 80% of ORIGINAL start; sell at ORIGINAL start; no return force in generator','otherStrategies':'same definitions as v2, no future prices or hidden regimes visible; buyHold, randomDaily, momentum, oldDip, oldDipLimited; all-in or cash per wallet'}}
path=folder/f'market-growth-{args.seed}.json'
path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
for model,data in results.items():
    print(model,json.dumps({r:{'stock':v['stockReturnPercent'],'strategies':{s:sv['netReturnPercent'] for s,sv in v['strategies'].items()}} for r,v in data['summary']['year'].items()},ensure_ascii=False),flush=True)
