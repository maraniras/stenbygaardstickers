"""One fresh 20-stock year: archived damped v2 + smallGrowth, minute resolution.

The price update and noise correction are copied from market-growth experiments.
No trades, invented application events, or changes to real app balances.
"""
import argparse
import json
import math
from pathlib import Path
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--seed', type=int, default=20261125)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
stocks = json.loads((Path(__file__).parents[1] / 'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
risk = np.array([['Lav', 'Mellem', 'Høj'].index(s['risk']) for s in stocks])
base = np.array([s['base'] for s in stocks])
steps = 365 * 1440
sigma = np.array([.05, .10, .18])[risk] * .4 / np.sqrt(1440)
drift = np.array([.10, .20, .35])[risk] * .2 / 1440
growth = np.log1p(np.array([.08, .15, .25])[risk]) / steps

def correction(s, bound=.01):
    phi = lambda z: .5 * (1 + math.erf(z / math.sqrt(2)))
    a = bound / s
    return math.log(math.exp(-bound) * phi(-a) + math.exp(s*s/2) * (phi(a-s)-phi(-a-s)) + math.exp(bound) * (1-phi(a)))

quiet = np.array([correction(s) for s in sigma])
wild = np.array([correction(1.5*s) for s in sigma])
rng = np.random.default_rng(args.seed)
price = np.log(base)
maximum = price.copy()
minimum = price.copy()
maximum_at = np.zeros(20, dtype=int)
minimum_at = np.zeros(20, dtype=int)
drawdown = np.zeros(20)
regime = np.zeros(20, dtype=int)
remaining = np.zeros(20, dtype=int)
daily = [base.tolist()]
hourly = [base.tolist()]
monthly = {}

for minute in range(1, steps+1):
    due = remaining <= 0
    count = np.count_nonzero(due)
    if count:
        regime[due] = rng.choice(4, count, p=[.5,.2,.2,.1])
        remaining[due] = rng.integers(30,181,count)
    trend = np.where(regime == 1, drift, np.where(regime == 2, -drift, 0))
    turbulent = regime == 3
    noise = np.clip(sigma*np.where(turbulent,1.5,1)*rng.standard_normal(20),-.01,.01)
    pressure = .02*np.maximum(price-np.log(250),0)**2/1440
    price = np.minimum(price+trend-pressure+noise-np.where(turbulent,wild,quiet)+growth,np.log(2500))
    remaining -= 1
    maximum_at = np.where(price > maximum, minute, maximum_at)
    minimum_at = np.where(price < minimum, minute, minimum_at)
    maximum = np.maximum(maximum, price)
    minimum = np.minimum(minimum, price)
    drawdown = np.minimum(drawdown, np.expm1(price-maximum))
    if minute % 60 == 0:
        hourly.append(np.exp(price).tolist())
    if minute % 1440 == 0:
        daily.append(np.exp(price).tolist())
    if minute % (30*1440) == 0 or minute == steps:
        monthly[str(minute//1440)] = np.exp(price).tolist()
    if minute % (90*1440) == 0:
        print(f'Day {minute//1440}/365', flush=True)

end = np.exp(price)
assert len(stocks)==20 and len(daily)==366 and len(hourly)==8761
assert np.isfinite(end).all() and np.all(end>0) and np.all(end<=2500)
assert np.all(np.exp(minimum)<=base) and np.all(np.exp(maximum)>=end)
results = []
for i,s in enumerate(stocks):
    fee = .05*max(float(end[i]-base[i]),0)
    results.append({**s,'end':float(end[i]),'changePercent':float((end[i]/base[i]-1)*100),
        'min':float(np.exp(minimum[i])),'max':float(np.exp(maximum[i])),
        'minMinute':int(minimum_at[i]),'maxMinute':int(maximum_at[i]),
        'maxDrawdownPercent':float(drawdown[i]*100),'gainFeePerShare':fee,
        'netHoldReturnPercent':float(((end[i]-fee)/base[i]-1)*100)})
output={'seed':args.seed,'days':365,'minuteSteps':steps,'stocks':results,'daily':daily,'hourly':hourly,'monthly':monthly,
    'model':{'id':'damped-v2-smallGrowth','anchor':False,'dailyNoise':[.02,.04,.072],'dailyRegimeDrift':[.02,.04,.07],
             'annualAddedGrowth':[.08,.15,.25],'hardCap':2500,'pressureAbove':250,'regimeMinutes':[30,180],
             'source':'docs/experiments/market-growth/simulate-market-growth.py'}}
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'seed':args.seed,'stocks':20,'up':sum(s['changePercent']>0 for s in results),'max':max(s['max'] for s in results),'out':str(args.out)},ensure_ascii=False),flush=True)
