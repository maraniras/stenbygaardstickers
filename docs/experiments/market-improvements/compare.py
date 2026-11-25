"""Predefined, paired minute-level market experiments; fictitious bananas only.

Two independent seeds, 100 markets per seed, 20 original stocks per market.
Five variants progressively isolate noise, growth, shared shocks and smooth trends.
Numba accelerates scalar loops without changing the price model's formulas.
"""
import argparse
import csv
import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import time
import numpy as np
from numba import njit

MODELS = ['current', 'lowerNoise', 'balancedGrowth', 'sharedNoise', 'smoothTrends']
LABELS = ['Nuværende', 'Lavere udsving', 'Lavere udsving + justeret vækst', 'Også fælles markedsstøj', 'Også bløde trendskift']
STRATEGIES = ['buyHold', 'randomDaily', 'momentum', 'oldDip']
RISKS = ['Lav', 'Mellem', 'Høj']
T = 365 * 1440


def noise_correction(s):
    phi = lambda z: .5*(1+math.erf(z/math.sqrt(2)))
    a = .01/s
    return math.log(math.exp(-.01)*phi(-a)+math.exp(s*s/2)*(phi(a-s)-phi(-a-s))+math.exp(.01)*(1-phi(a)))


@njit(cache=True)
def fee_log(gain):
    return math.log1p(.05*math.expm1(-max(gain, 0.)))


@njit(cache=True, nogil=True)
def one_market(seed, days, base, risk, vol, quiet, wild, growth):
    np.random.seed(seed)
    m_count = vol.shape[0]
    price = np.empty((m_count, 20))
    for m in range(m_count):
        for i in range(20):
            price[m,i] = math.log(base[i])
    peak = price.copy()
    trough = price.copy()
    drawdown = np.zeros_like(price)
    caps = np.zeros_like(price)
    history = np.zeros((1441, m_count, 20))
    history[0] = price
    regime = np.zeros(20, dtype=np.int64)
    remaining = np.zeros(20, dtype=np.int64)
    smooth = np.zeros(20)
    positions = np.zeros((m_count, 4, 20), dtype=np.bool_)
    pending = np.zeros_like(positions)
    pending[:,0,:] = True
    entry = np.zeros((m_count, 4, 20))
    realized = np.zeros_like(entry)
    round_trips = np.zeros((m_count, 4, 20), dtype=np.int64)
    daily = np.empty((days+1, m_count, 20))
    daily[0] = np.exp(price)
    portfolio = np.ones((days+1, m_count))
    short_windows = np.empty((days, 3, m_count, 20))
    log250 = math.log(250.)
    logcap = math.log(2500.)
    trend_rates = np.array([.02, .04, .07])/1440
    alpha = 1-math.exp(-1/15.)
    for minute in range(1, days*1440+1):
        for i in range(20):
            if remaining[i] <= 0:
                u = np.random.random()
                regime[i] = 0 if u<.5 else 1 if u<.7 else 2 if u<.9 else 3
                remaining[i] = np.random.randint(30,181)
        common_z = np.random.standard_normal()
        for i in range(20):
            z = np.random.standard_normal()
            mixed = math.sqrt(.7)*z+math.sqrt(.3)*common_z
            r = risk[i]
            turbulent = regime[i] == 3
            trend = trend_rates[r] if regime[i]==1 else -trend_rates[r] if regime[i]==2 else 0.
            smooth[i] += alpha*(trend-smooth[i])
            for m in range(m_count):
                noise_z = mixed if m>=3 else z
                noise = min(.01, max(-.01, vol[m,r]*(1.5 if turbulent else 1)*noise_z))
                pressure = .02*max(price[m,i]-log250, 0.)**2/1440
                change = (smooth[i] if m==4 else trend)-pressure+noise-(wild[m,r] if turbulent else quiet[m,r])+growth[m,r]
                price[m,i] = min(price[m,i]+change, logcap)
                peak[m,i] = max(peak[m,i], price[m,i])
                trough[m,i] = min(trough[m,i], price[m,i])
                drawdown[m,i] = min(drawdown[m,i], math.expm1(price[m,i]-peak[m,i]))
                if price[m,i] >= logcap-1e-12:
                    caps[m,i] = 1
            remaining[i] -= 1
        history[minute%1441] = price
        # Fill decisions from the previous 10-minute boundary, never same-minute quotes.
        if minute%10 == 1:
            for m in range(m_count):
                for s in range(4):
                    for i in range(20):
                        if pending[m,s,i] and not positions[m,s,i]:
                            entry[m,s,i] = price[m,i]
                        elif not pending[m,s,i] and positions[m,s,i]:
                            gain = price[m,i]-entry[m,s,i]
                            realized[m,s,i] += gain+fee_log(gain)
                            round_trips[m,s,i] += 1
                        positions[m,s,i] = pending[m,s,i]
        if minute%10 == 0:
            for m in range(m_count):
                for i in range(20):
                    momentum = price[m,i]-history[(minute-60)%1441,m,i] if minute>=60 else 0.
                    pending[m,2,i] = momentum>=math.log(.99) if positions[m,2,i] else momentum>math.log(1.01)
                    pending[m,3,i] = price[m,i]<math.log(base[i]) if positions[m,3,i] else price[m,i]<math.log(base[i]*.8)
        if minute%1440 == 0:
            day = minute//1440
            daily[day] = np.exp(price)
            for h in range(3):
                lag = 60 if h==0 else 180 if h==1 else 1440
                short_windows[day-1,h] = np.expm1(price-history[(minute-lag)%1441])
            for m in range(m_count):
                net = 0.
                for i in range(20):
                    gain = price[m,i]-entry[m,0,i]
                    net += math.exp(gain+fee_log(gain))/20
                    # Separate deterministic random-strategy coin; no influence on price RNG.
                    x = (seed+day*1103515245+i*12345)&0x7fffffff
                    x = (x*1103515245+12345)&0x7fffffff
                    pending[m,1,i] = x<1073741824
                portfolio[day,m] = net
    strategy = realized.copy()
    for m in range(m_count):
        for s in range(4):
            for i in range(20):
                if positions[m,s,i]:
                    gain = price[m,i]-entry[m,s,i]
                    strategy[m,s,i] += gain+fee_log(gain)
                    round_trips[m,s,i] += 1
    raw = np.empty_like(price)
    for m in range(m_count):
        for i in range(20):
            raw[m,i] = math.expm1(price[m,i]-math.log(base[i]))
    return raw, np.expm1(strategy), drawdown, np.exp(peak), np.exp(trough), caps, daily, portfolio, round_trips, short_windows


def summary(a):
    return {'p05p50p95':np.quantile(a,[.05,.5,.95]).tolist(), 'mean':float(np.mean(a)), 'positivePercent':float(np.mean(a>0)*100)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--markets-per-seed',type=int,default=100)
    parser.add_argument('--workers',type=int,default=8)
    parser.add_argument('--out',type=Path,required=True)
    args = parser.parse_args()
    stocks = json.loads((Path(__file__).parents[1]/'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
    base = np.array([s['base'] for s in stocks])
    risk = np.array([RISKS.index(s['risk']) for s in stocks])
    vol = np.array([[.02,.04,.072]]+[[.012,.022,.035]]*4)/math.sqrt(1440)
    quiet = np.array([[noise_correction(s) for s in row] for row in vol])
    wild = np.array([[noise_correction(s*1.5) for s in row] for row in vol])
    growth = np.tile(np.log1p(np.array([.08,.15,.25]))/T,(5,1))
    growth[2:] = .9*quiet[2:]+.1*wild[2:]+math.log(1.05)/T
    params = base,risk,vol,quiet,wild,growth
    # Numerical check against interpreted execution of the exact same formula/streams.
    compiled = one_market(12345,2,*params)
    reference = one_market.py_func(12345,2,*params)
    for a,b in zip(compiled, reference):
        np.testing.assert_allclose(a,b,rtol=1e-9,atol=1e-10)
    assert fee_log(-1.)==0 and abs(math.exp(math.log(1.2)+fee_log(math.log(1.2)))-1.19)<1e-12
    print('Numerical reference and fee checks passed',flush=True)
    seeds = [20261126,20261127]
    all_results = []
    examples = []
    batches = []
    started = time.time()
    for seed in seeds:
        results = [None]*args.markets_per_seed
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(one_market,seed+r*1009,365,*params):r for r in range(args.markets_per_seed)}
            completed=0
            for future in as_completed(futures):
                r=futures[future]
                result=future.result()
                results[r]=result
                completed+=1
                if completed%10==0:
                    print(f'Seed {seed}: {completed}/{args.markets_per_seed} markets; elapsed {time.time()-started:.0f}s',flush=True)
        examples.append({'seed':seed,'daily':results[0][6].tolist()})
        batch={'seed':seed,'models':{}}
        for m,name in enumerate(MODELS):
            raw=np.concatenate([r[0][m] for r in results])*100
            net=np.concatenate([r[1][m,0] for r in results])*100
            portfolios=np.array([r[7][-1,m]-1 for r in results])*100
            batch['models'][name]={'individualNet':summary(net),'portfolio':summary(portfolios),'individualRaw':summary(raw)}
        batches.append(batch)
        # Discard most daily curves after deriving daily portfolio drawdowns.
        for r in results:
            portfolio_dd=np.min(r[7]/np.maximum.accumulate(r[7],axis=0)-1,axis=0)
            correlations=[]
            for m in range(len(MODELS)):
                c=np.corrcoef(np.diff(np.log(r[6][:,m,:]),axis=0),rowvar=False)
                correlations.append(float((c.sum()-np.trace(c))/(20*19)))
            all_results.append((r[0],r[1],r[2],r[3],r[4],r[5],r[7][-1]-1,portfolio_dd,r[8],r[9],correlations))
    results={}
    risk_tiled=np.tile(risk,len(all_results))
    for m,name in enumerate(MODELS):
        raw=np.concatenate([r[0][m] for r in all_results])*100
        strategy=np.stack([r[1][m] for r in all_results])*100
        dd=np.concatenate([r[2][m] for r in all_results])*100
        portfolios=np.array([r[6][m] for r in all_results])*100
        portfolio_dd=np.array([r[7][m] for r in all_results])*100
        rng=np.random.default_rng(81731)
        bootstrap=np.mean(rng.choice(portfolios,(2000,len(portfolios)),replace=True),axis=1)
        windows={}
        for h,label in enumerate(['hour','threeHours','day']):
            samples=np.stack([r[9][:,h,m,:] for r in all_results])*100
            windows[label]={risk_label:{'medianAbsoluteMovePercent':float(np.median(np.abs(samples[:,:,risk==i]))),
                                       'p95AbsoluteMovePercent':float(np.quantile(np.abs(samples[:,:,risk==i]),.95))}
                            for i,risk_label in enumerate(RISKS)}
        results[name]={
            'label':LABELS[m], 'rawAnnual':summary(raw), 'netAnnual':summary(strategy[:,0,:].ravel()),
            'finishBelowHalfPercent':float(np.mean(raw<=-50)*100),
            'finishBelowTenthPercent':float(np.mean(raw<=-90)*100),
            'maxDrawdownPercent':summary(dd), 'portfolioNetAnnual':summary(portfolios),
            'portfolioMean95Bootstrap':np.quantile(bootstrap,[.025,.975]).tolist(),
            'portfolioDailyDrawdownPercent':summary(portfolio_dd),
            'capHitPercent':float(np.mean(np.concatenate([r[5][m] for r in all_results]))*100),
            'maxPrice':float(max(r[3][m].max() for r in all_results)),
            'risks':{label:{'netAnnual':summary(strategy[:,0,:].ravel()[risk_tiled==i]),
                            'lossOverHalfPercent':float(np.mean(raw[risk_tiled==i]<=-50)*100)} for i,label in enumerate(RISKS)},
            'strategies':{s:summary(strategy[:,i,:].ravel()) for i,s in enumerate(STRATEGIES)},
            'medianRoundTrips':{s:float(np.median(np.concatenate([r[8][m,i] for r in all_results]))) for i,s in enumerate(STRATEGIES)},
            'shortWindows':windows,
            'meanDailyPairwiseCorrelation':float(np.mean([r[10][m] for r in all_results])),
        }
    paired={}
    current=np.array([r[6][0] for r in all_results])*100
    for m,name in enumerate(MODELS[1:],1):
        delta=np.array([r[6][m] for r in all_results])*100-current
        paired[name]={'portfolioChangePercentagePoints':summary(delta)}
    output={'seeds':seeds,'marketsPerSeed':args.markets_per_seed,'marketsPerModel':len(all_results),
        'stockYearsPerModel':len(all_results)*20,'days':365,'minuteStepsPerMarket':T,'stocks':stocks,
        'parameters':{'dailyNoise':(vol*math.sqrt(1440)).tolist(),'annualAddedLogDrift':(growth*T).tolist(),
                      'sharedNoiseVarianceFraction':.3,'smoothTrendTimeConstantMinutes':15,'saleFeeOfPositiveGain':.05},
        'models':results,'batches':batches,'paired':paired,'examples':examples,
        'method':{'execution':'signals each ten minutes; fill following minute; random exposure changes daily',
                  'portfolio':'1000 bananas equally allocated in bananas over 20 stocks; buy minute one; no rebalancing; sell year end; fee per stock; no loss offset',
                  'individual':'independent 1000 banana wallet per stock and strategy; fractional shares; no loans or deposits',
                  'priceDrawdown':'minute-level','portfolioDrawdown':'daily liquidation value after fee',
                  'randomness':'same MT19937 draws and regime paths across variants; shared-noise variants mix independent common and individual Gaussian shocks',
                  'selection':'parameters and both seeds fixed before results; seed two is hold-out; no tuning during run'},
        'elapsedSeconds':time.time()-started}
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    with args.out.with_suffix('.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.writer(f)
        writer.writerow(['Model','Median individuel netto pct','Over halvdelen tabt pct','Median portefolje netto pct','Gennemsnit portefolje netto pct','Portefoljer i plus pct','Median max fald pct'])
        for name,r in results.items():
            writer.writerow([r['label'],r['netAnnual']['p05p50p95'][1],r['finishBelowHalfPercent'],r['portfolioNetAnnual']['p05p50p95'][1],r['portfolioNetAnnual']['mean'],r['portfolioNetAnnual']['positivePercent'],r['maxDrawdownPercent']['p05p50p95'][1]])
    print(json.dumps({'out':str(args.out),'elapsedSeconds':time.time()-started,'models':{name:{'individualMedian':r['netAnnual']['p05p50p95'][1],'portfolioMean':r['portfolioNetAnnual']['mean'],'portfolioMedian':r['portfolioNetAnnual']['p05p50p95'][1]} for name,r in results.items()}},ensure_ascii=False),flush=True)


if __name__=='__main__':
    main()
