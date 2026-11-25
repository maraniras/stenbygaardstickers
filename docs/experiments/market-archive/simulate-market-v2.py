"""Fictional banana market v2: no anchor, gain-only sale fee.

Run with Python + NumPy. --trend-scale 1 retains the preceding trend parameters;
--trend-scale 0 is a diagnostic control. No application code is changed.
"""
from pathlib import Path
import argparse
import csv
import json
import math
import sys
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
parser = argparse.ArgumentParser()
parser.add_argument('--reps', type=int, default=100)
parser.add_argument('--trend-scale', type=float, default=1)
parser.add_argument('--vol-scale', type=float, default=1)
args = parser.parse_args()
OUT = Path(__file__).parent
old = json.loads((OUT/'market-simulation.json').read_text(encoding='utf-8'))
base = np.tile([s['base'] for s in old['stocks']], args.reps)
risk = np.tile([['Lav','Mellem','Høj'].index(s['risk']) for s in old['stocks']], args.reps)
N = len(base)
STEPS = 365*1440
SEED = 20261101
rng = np.random.default_rng(SEED)
random_strategy = np.random.default_rng(733104)
sample_rng = np.random.default_rng(909220)
sigma = np.array([.05,.10,.18])[risk]*args.vol_scale/np.sqrt(1440)
drift = np.array([.10,.20,.35])[risk]*args.trend_scale/1440

def noise_correction(s, bound=.01):
    """log E[exp(clip(s*Z,-bound,bound))], not the unclipped approximation."""
    cdf = lambda z: .5*(1+math.erf(z/math.sqrt(2)))
    a = bound/s
    mean = math.exp(-bound)*cdf(-a) + math.exp(s*s/2)*(cdf(a-s)-cdf(-a-s)) + math.exp(bound)*(1-cdf(a))
    return math.log(mean)

quiet_correction = np.array([noise_correction(s) for s in sigma])
wild_correction = np.array([noise_correction(s*1.5) for s in sigma])
price = np.log(base)
initial = price.copy()
remaining = np.zeros(N, dtype=int)
regime = np.zeros(N, dtype=int)
history = np.zeros((1441,N))
history[0] = price
names = ['buyHold','randomDaily','momentum','oldDip','oldDipLimited']
position = np.zeros((5,N),dtype=bool)
pending = position.copy()
pending[0] = True
entry = np.zeros((5,N))
entry_time = np.zeros((5,N),dtype=int)
gross = np.zeros((5,N))
fee_log = np.zeros((5,N))
entries = np.zeros((5,N),dtype=int)
exits = np.zeros((5,N),dtype=int)
logmax = price.copy()
logmin = price.copy()
hit1000 = np.zeros(N,dtype=bool)
hitcap = np.zeros(N,dtype=bool)
above250_minutes = 0
horizons = {1440:'day',7*1440:'week',30*1440:'month',49*1440:'sevenWeeks',90*1440:'threeMonths',180*1440:'sixMonths',STEPS:'year'}
snapshots = {}
short_horizons = [10,60,180,1440]
sample_times = {h:set(sample_rng.choice(np.arange(30*1440+h,STEPS+1),100,replace=False).tolist()) for h in short_horizons}
short = {h:[] for h in short_horizons}
case_series = [base[:20].tolist()]
equity_peak = np.zeros((5,N))
drawdown = np.zeros((5,N))

def sale_factor(log_return, fee=.05):
    # Gain fraction of sale proceeds = max(1 - cost/sale, 0).
    fraction = -np.expm1(-np.maximum(log_return,0))
    return np.log1p(-fee*fraction)

# Independent arithmetic checks, including a losing sale and a partial sale.
assert abs(math.exp(math.log(1.2)+sale_factor(np.array(math.log(1.2))))-1.19)<1e-12
assert abs(math.exp(math.log(.8)+sale_factor(np.array(math.log(.8))))-.8)<1e-12
assert abs((5*4 - .05*max(5*4 - 5*((10*1+10*3)/20),0))-19.5)<1e-12
print(f'V2: {N} stock-years, trend scale {args.trend_scale}, vol scale {args.vol_scale}',flush=True)
for minute in range(1,STEPS+1):
    due = remaining<=0
    count = np.count_nonzero(due)
    if count:
        regime[due] = rng.choice(4,count,p=[.5,.2,.2,.1])
        remaining[due] = rng.integers(30,181,count)
    trend = np.where(regime==1,drift,np.where(regime==2,-drift,0))
    wild = regime==3
    vol = sigma*np.where(wild,1.5,1)
    correction = np.where(wild,wild_correction,quiet_correction)
    pressure = .02*np.maximum(price-np.log(250),0)**2/1440
    noise = np.clip(vol*rng.standard_normal(N),-.01,.01)
    new = np.minimum(price + trend - pressure + noise - correction,np.log(2500))
    gross += position*(new-price)
    price = new
    remaining -= 1
    history[minute%1441] = price
    logmax = np.maximum(logmax,price)
    logmin = np.minimum(logmin,price)
    hit1000 |= price>=np.log(1000)
    hitcap |= price>=np.log(2500)-1e-12
    above250_minutes += np.count_nonzero(price>np.log(250))

    buy = pending & ~position
    sell = ~pending & position
    fee_if_sold = sale_factor(price-entry)
    fee_log += np.where(sell,fee_if_sold,0)
    entries += buy
    exits += sell
    entry = np.where(buy,price,entry)
    entry_time = np.where(buy,minute,entry_time)
    position = pending.copy()
    liquidation = gross + fee_log + np.where(position,fee_if_sold,0)
    equity_peak = np.maximum(equity_peak,liquidation)
    drawdown = np.minimum(drawdown,liquidation-equity_peak)

    if minute%10==0:
        momentum = price-history[(minute-60)%1441] if minute>=60 else np.zeros(N)
        pending[2] = np.where(~position[2],momentum>np.log(1.01),momentum>=np.log(.99))
        pending[3] = np.where(~position[3],price<initial+np.log(.8),price<initial)
        stop = (price>=initial) | (price-entry[4]<=np.log(.7)) | (minute-entry_time[4]>=30*1440)
        pending[4] = np.where(~position[4],price<initial+np.log(.8),~stop)
    if minute%1440==0:
        pending[1] = random_strategy.random(N)<.5
    for h in short_horizons:
        if minute in sample_times[h]:
            short[h].append((price-history[(minute-h)%1441]).astype(np.float32))
    if minute in horizons:
        snapshots[horizons[minute]] = {'prices':np.exp(price).tolist(),'grossWalletLog':gross.tolist(),'netWalletLog':liquidation.tolist()}
    if minute%60==0:
        case_series.append(np.exp(price[:20]).round(7).tolist())
    if minute%(60*1440)==0:
        print(f'Day {minute//1440}/365',flush=True)

fee_log += np.where(position,sale_factor(price-entry),0)
exits += position
assert np.array_equal(entries,exits)
assert np.isfinite(price).all() and np.isfinite(gross).all()
assert np.all(price<=np.log(2500)+1e-12)
assert np.all(fee_log<=1e-12)

def distribution(values):
    return {'p05p50p95':np.quantile(values,[.05,.5,.95]).tolist(),'mean':float(np.mean(values)),'positivePercent':float(np.mean(values>0)*100)}

summary = {}
for key,snapshot in snapshots.items():
    prices = np.array(snapshot['prices'])
    net = np.array(snapshot['netWalletLog'])
    gross_snap = np.array(snapshot['grossWalletLog'])
    summary[key] = {}
    for r,label in enumerate(['Lav','Mellem','Høj']):
        selected = risk==r
        summary[key][label] = {
            'stockReturnPercent':distribution(np.expm1(np.log(prices[selected]/base[selected]))*100),
            'strategies':{name:{'netReturnPercent':distribution(np.expm1(net[i,selected])*100),'grossReturnPercent':distribution(np.expm1(gross_snap[i,selected])*100)} for i,name in enumerate(names)},
        }

short_summary = {}
for h,sample in short.items():
    sample = np.stack(sample)
    short_summary[str(h)] = {}
    for r,label in enumerate(['Lav','Mellem','Høj']):
        selected = risk==r
        returns = np.expm1(sample[:,selected].ravel())
        net = returns-.05*np.maximum(returns,0)
        short_summary[str(h)][label] = {
            'medianAbsoluteMovePercent':float(np.median(np.abs(returns))*100),
            'netReturnPercent':distribution(net*100),
            'windowCount':int(returns.size),
        }

diagnostic = {}
for r,label in enumerate(['Lav','Mellem','Høj']):
    selected = risk==r
    diagnostic[label] = {
        'paths':int(selected.sum()),
        'everOver1000Percent':float(np.mean(hit1000[selected])*100),
        'everAtCapPercent':float(np.mean(hitcap[selected])*100),
        'finishBelow10PercentOfStartPercent':float(np.mean(price[selected]-initial[selected]<np.log(.1))*100),
        'tradesMedian':{name:float(np.median(entries[i,selected])) for i,name in enumerate(names)},
        'drawdownMedianPercent':{name:float(np.median(np.expm1(drawdown[i,selected]))*100) for i,name in enumerate(names)},
    }

result = {
    'version':'no-anchor-gain-fee-v2','seed':SEED,'replications':args.reps,'stockYears':N,
    'trendScale':args.trend_scale,'volScale':args.vol_scale,'saleFeeOnPositiveGain':.05,'purchaseFee':0,
    'stocks':old['stocks'],'parameters':{'dailyNoiseVolatility':(.05*args.vol_scale,.10*args.vol_scale,.18*args.vol_scale),'trendDailyLogDrift':(.10*args.trend_scale,.20*args.trend_scale,.35*args.trend_scale),'regimeMinutes':[30,180],'noiseLogClip':.01,'cap':2500,'upperPressure':'.02*max(ln(price/250),0)^2 per day','noiseCorrection':'exact log moment of clipped Gaussian','regimeProbabilities':[.5,.2,.2,.1]},
    'summary':summary,'shortWindows':short_summary,'diagnostics':diagnostic,
    'globalMin':float(np.exp(logmin.min())),'globalMax':float(np.exp(logmax.max())),
    'timeOver250Percent':float(above250_minutes/(N*STEPS)*100),
    'case':{'hourlySeries':case_series,'endpoints':{k:v['prices'][:20] for k,v in snapshots.items()},'min':np.exp(logmin[:20]).tolist(),'max':np.exp(logmax[:20]).tolist()},
    'method':{'strategies':'Separate 1000-banana all-in/cash wallets; fractional shares; no leverage; 10-minute decisions filled next minute; final liquidation; gains-only fees paid at each sale, no loss-offset refunds','oldDip':'Buy under 80% of ORIGINAL starting price; sell at ORIGINAL starting price. The price generator does not use that start price.','sampling':'100 random shared endpoints after day 30 per horizon, windows may overlap; not independent samples','fees':'Net sale = Q*salePrice - .05*max(Q*salePrice - Q*entryPrice,0); no fee on losses or purchases'},
}
tag = f't{args.trend_scale:g}-v{args.vol_scale:g}'
(OUT/f'market-v2-{tag}.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
with (OUT/f'market-v2-{tag}.csv').open('w',encoding='utf-8-sig',newline='') as file:
    writer=csv.writer(file,delimiter=';')
    keys=['day','week','month','sevenWeeks','threeMonths','sixMonths','year']
    writer.writerow(['Aktie','Risiko','Startkurs']+keys+['Min','Max'])
    for i,stock in enumerate(old['stocks']):
        writer.writerow([stock['name'],stock['risk'],stock['base']]+[result['case']['endpoints'][k][i] for k in keys]+[result['case']['min'][i],result['case']['max'][i]])
print(json.dumps({'year':summary['year'],'diagnostics':diagnostic,'min':result['globalMin'],'max':result['globalMax'],'timeOver250Percent':result['timeOver250Percent']},ensure_ascii=False,indent=2),flush=True)
