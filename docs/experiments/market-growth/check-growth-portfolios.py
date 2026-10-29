"""Replay held-out market prices to test equal-weight diversified buy-and-hold.
No trading signals, no rebalancing; 1,000 bananas split across the 20 stocks.
"""
from pathlib import Path
import json
import math
import numpy as np

folder=Path(__file__).parent
source=json.loads((folder/'market-simulation.json').read_text(encoding='utf-8'))
reps=50
base=np.tile([s['base'] for s in source['stocks']],reps)
risk=np.tile([['Lav','Mellem','Høj'].index(s['risk']) for s in source['stocks']],reps)
N=len(base)
T=365*1440
sigma=np.array([.05,.10,.18])[risk]*.4/np.sqrt(1440)
drift=np.array([.10,.20,.35])[risk]*.2/1440
def correction(s,c=.01):
    phi=lambda z:.5*(1+math.erf(z/math.sqrt(2)))
    a=c/s
    return math.log(math.exp(-c)*phi(-a)+math.exp(s*s/2)*(phi(a-s)-phi(-a-s))+math.exp(c)*(1-phi(a)))
quiet=np.array([correction(s) for s in sigma])
wild=np.array([correction(1.5*s) for s in sigma])
growth=np.stack([np.zeros(N),np.log1p(np.array([.08,.15,.25])[risk])/T,.9*quiet+.1*wild+math.log(1.05)/T])
price=np.tile(np.log(base),(3,1))
rng=np.random.default_rng(20261102)
regime=np.zeros(N,dtype=int)
remaining=np.zeros(N,dtype=int)
entry=None
for minute in range(1,T+1):
    due=remaining<=0
    count=np.count_nonzero(due)
    if count:
        regime[due]=rng.choice(4,count,p=[.5,.2,.2,.1])
        remaining[due]=rng.integers(30,181,count)
    trend=np.where(regime==1,drift,np.where(regime==2,-drift,0))
    turbulent=regime==3
    noise=np.clip(sigma*np.where(turbulent,1.5,1)*rng.standard_normal(N),-.01,.01)
    pressure=.02*np.maximum(price-np.log(250),0)**2/1440
    price=np.minimum(price+trend-pressure+noise-np.where(turbulent,wild,quiet)+growth,np.log(2500))
    remaining-=1
    if minute==1:
        entry=price.copy()
    if minute%(90*1440)==0:
        print(f'Portfolio replay: day {minute//1440}/365',flush=True)

returns=np.expm1(price-entry)
net=returns-.05*np.maximum(returns,0)
reshaped=net.reshape(3,reps,20)
results={}
labels=['Lav','Mellem','Høj']
models=['noGrowth','smallGrowth','riskCompensatedGrowth']
risk20=risk[:20]
for m,model in enumerate(models):
    results[model]={}
    for label,select in [('all',np.ones(20,dtype=bool))]+[(label,risk20==r) for r,label in enumerate(labels)]:
        values=reshaped[m,:,select].mean(axis=0)*100
        assert values.shape==(reps,)
        results[model][label]={'portfolios':reps,'stocksPerPortfolio':int(select.sum()),'p05p50p95':np.quantile(values,[.05,.5,.95]).tolist(),'mean':float(values.mean()),'positivePercent':float(np.mean(values>0)*100)}
    # Reconcile independent replay with the full strategy engine, if available.
    other=folder/'market-growth-20261102.json'
    if other.exists():
        ref=json.loads(other.read_text(encoding='utf-8'))['models'][model]
        for r,label in enumerate(labels):
            actual=float(net[m,risk==r].mean()*100)
            expected=ref['summary']['year'][label]['strategies']['buyHold']['netReturnPercent']['mean']
            assert abs(actual-expected)<1e-8,(actual,expected)

(folder/'market-growth-portfolios.json').write_text(json.dumps({'seed':20261102,'initialTotalWallet':1000,'method':'50 held-out portfolios of 20 stocks; initial equal coin allocation; no rebalancing; buy minute 1; sell year end; 5% of positive gain per stock; losses do not offset other stocks gains','results':results},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2),flush=True)
