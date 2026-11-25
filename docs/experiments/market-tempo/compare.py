"""Paired accelerated-clock experiments, retaining every virtual minute.

A 365/30 clock maps the previous 365-day model to exactly 30 real days.
Noise, trends, growth, resistance, clipping and regime lengths all run on the
virtual clock. This is not an approximate multiplication of daily returns.
"""
import argparse
import csv
import json
import math
from pathlib import Path
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import numpy as np
from numba import njit

sys.path.insert(0,str(Path(__file__).parents[1]/'market-improvements'))
from compare import one_market as reference_market, noise_correction

T=365*1440
HORIZONS=[1,7,30,90]
SCENARIOS=[
    {'id':'tempo3','label':'3× tempo','speed':3.,'model':0},
    {'id':'tempo7','label':'7× tempo','speed':7.,'model':0},
    {'id':'tempo7growth','label':'7× + ekstra vækst','speed':7.,'model':4},
    {'id':'monthCalm','label':'År på én måned · roligere','speed':365/30,'model':1},
    {'id':'monthNormal','label':'År på én måned · normal','speed':365/30,'model':0},
    {'id':'monthWild','label':'År på én måned · mere vild','speed':365/30,'model':2},
    {'id':'monthExtraWild','label':'År på én måned · meget vild','speed':365/30,'model':3},
]


@njit(cache=True,nogil=True)
def simulate(seed,base,risk,vol,quiet,wild,growth,checkpoints):
    np.random.seed(seed)
    m_count=vol.shape[0]
    n=len(checkpoints)
    price=np.empty((m_count,20))
    for m in range(m_count):
        for i in range(20):
            price[m,i]=math.log(base[i])
    initial=price.copy()
    peaks=price.copy()
    troughs=price.copy()
    dd=np.zeros_like(price)
    caps=np.zeros_like(price)
    regime=np.zeros(20,dtype=np.int64)
    remaining=np.zeros(20,dtype=np.int64)
    portfolio_peak=np.ones(m_count)
    portfolio_dd=np.zeros(m_count)
    snapshots=np.empty((n,m_count,20))
    snapshot_peak=np.empty_like(snapshots)
    snapshot_trough=np.empty_like(snapshots)
    snapshot_dd=np.empty_like(snapshots)
    snapshot_caps=np.empty_like(snapshots)
    snapshot_portfolio_dd=np.zeros((n,m_count))
    snapshots[0]=price
    snapshot_peak[0]=peaks
    snapshot_trough[0]=troughs
    snapshot_dd[0]=dd
    snapshot_caps[0]=caps
    cursor=1
    trend_rates=np.array([.02,.04,.07])/1440
    log250=math.log(250.)
    logcap=math.log(2500.)
    for minute in range(1,checkpoints[-1]+1):
        for i in range(20):
            if remaining[i]<=0:
                u=np.random.random()
                regime[i]=0 if u<.5 else 1 if u<.7 else 2 if u<.9 else 3
                remaining[i]=np.random.randint(30,181)
        common=np.random.standard_normal()
        for i in range(20):
            individual=np.random.standard_normal()
            z=math.sqrt(.7)*individual+math.sqrt(.3)*common
            r=risk[i]
            turbulent=regime[i]==3
            trend=trend_rates[r] if regime[i]==1 else -trend_rates[r] if regime[i]==2 else 0.
            for m in range(m_count):
                noise=min(.01,max(-.01,vol[m,r]*(1.5 if turbulent else 1)*z))
                pressure=.02*max(price[m,i]-log250,0.)**2/1440
                price[m,i]=min(price[m,i]+trend-pressure+noise-(wild[m,r] if turbulent else quiet[m,r])+growth[m,r],logcap)
                peaks[m,i]=max(peaks[m,i],price[m,i])
                troughs[m,i]=min(troughs[m,i],price[m,i])
                dd[m,i]=min(dd[m,i],price[m,i]-peaks[m,i])
                if price[m,i]>=logcap-1e-12:
                    caps[m,i]=1
            remaining[i]-=1
        # Hourly virtual-time valuation; 5-20 real minutes at the chosen speeds.
        if minute%60==0:
            for m in range(m_count):
                value=0.
                for i in range(20):
                    factor=math.exp(price[m,i]-initial[m,i])
                    value+=(factor-.05*max(factor-1,0.))/20
                portfolio_peak[m]=max(portfolio_peak[m],value)
                portfolio_dd[m]=min(portfolio_dd[m],value/portfolio_peak[m]-1)
        if cursor<n and minute==checkpoints[cursor]:
            snapshots[cursor]=price
            snapshot_peak[cursor]=peaks
            snapshot_trough[cursor]=troughs
            snapshot_dd[cursor]=dd
            snapshot_caps[cursor]=caps
            snapshot_portfolio_dd[cursor]=portfolio_dd
            cursor+=1
    return snapshots,snapshot_peak,snapshot_trough,snapshot_dd,snapshot_caps,snapshot_portfolio_dd


def summarize(a):
    return {'p05p50p95':np.quantile(a,[.05,.5,.95]).tolist(),'mean':float(np.mean(a)),
            'positivePercent':float(np.mean(a>0)*100)}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--markets-per-seed',type=int,default=100)
    parser.add_argument('--workers',type=int,default=8)
    parser.add_argument('--phase',choices=['pilot','targeted'],default='pilot')
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    stocks=json.loads((Path(__file__).parents[1]/'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
    risk_labels=['Lav','Mellem','Høj']
    base=np.array([s['base'] for s in stocks])
    risk=np.array([risk_labels.index(s['risk']) for s in stocks])
    scenarios=SCENARIOS
    max_days=90
    periods_tested=HORIZONS
    seeds=[20261128,20261129]
    multipliers=np.array([1.,.75,1.25,1.5,1.])
    if args.phase=='targeted':
        scenarios=[
            {'id':'monthNormal','label':'År på én måned · uændret vækst','speed':365/30,'model':0},
            {'id':'normalPlus5','label':'Normale udsving + ekstra 5 % vækst','speed':365/30,'model':1,'extraGrowth':.05},
            {'id':'wildPlus6','label':'Større udsving + ekstra 6 % vækst','speed':365/30,'model':2,'extraGrowth':.06},
            {'id':'extraWildPlus8','label':'Meget store udsving + ekstra 8 % vækst','speed':365/30,'model':3,'extraGrowth':.08},
            {'id':'tempo7growth','label':'7× tempo + ekstra 10 % vækst','speed':7.,'model':4,'extraGrowth':.10},
        ]
        max_days=30
        periods_tested=[1,7,30]
        seeds=[20261130,20261201]
        multipliers=np.array([1.,1.,1.25,1.5,1.])
    vol=multipliers[:,None]*np.array([.012,.022,.035])[None,:]/math.sqrt(1440)
    quiet=np.array([[noise_correction(s) for s in row] for row in vol])
    wild=np.array([[noise_correction(s*1.5) for s in row] for row in vol])
    base_growth=.9*quiet[0]+.1*wild[0]+math.log(1.05)/T
    # Fixed arithmetic drift across noise variants; no hidden extra growth from more risk.
    growth=np.tile(base_growth,(5,1))
    growth[4]+=math.log(1.10)/(30*7*1440)
    if args.phase=='targeted':
        growth[1]+=math.log(1.05)/T
        growth[2]+=math.log(1.06)/T
        growth[3]+=math.log(1.08)/T
    checkpoints=np.array(sorted({0,1440,2880,*[int(round(day*s['speed']*1440)) for s in scenarios for day in range(1,max_days+1)]}),dtype=np.int64)
    lookup={int(v):i for i,v in enumerate(checkpoints)}
    params=base,risk,vol,quiet,wild,growth
    tiny=np.array([0,1440,2880],dtype=np.int64)
    compiled=simulate(12345,*params,tiny)
    interpreted=simulate.py_func(12345,*params,tiny)
    for a,b in zip(compiled,interpreted):
        np.testing.assert_allclose(a,b,rtol=1e-9,atol=1e-10)
    # The normal variant must reproduce the previous candidate's minute formula/RNG.
    old_vol=np.array([[.02,.04,.072]]+[[.012,.022,.035]]*4)/math.sqrt(1440)
    old_quiet=np.array([[noise_correction(s) for s in row] for row in old_vol])
    old_wild=np.array([[noise_correction(s*1.5) for s in row] for row in old_vol])
    old_growth=np.tile(np.log1p(np.array([.08,.15,.25]))/T,(5,1))
    old_growth[2:]=.9*old_quiet[2:]+.1*old_wild[2:]+math.log(1.05)/T
    old=reference_market(12345,2,base,risk,old_vol,old_quiet,old_wild,old_growth)
    np.testing.assert_allclose(np.exp(compiled[0][:,0,:]),old[6][:,3,:],rtol=1e-9,atol=1e-10)
    np.testing.assert_allclose(np.exp(compiled[1][-1,0]),old[3][3],rtol=1e-9,atol=1e-10)
    np.testing.assert_allclose(np.expm1(compiled[3][-1,0]),old[2][3],rtol=1e-9,atol=1e-10)
    print('Interpreted/JIT and previous normal-model reference checks passed',flush=True)
    worlds=[]
    examples=[]
    started=time.time()
    for seed in seeds:
        results=[None]*args.markets_per_seed
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures={executor.submit(simulate,seed+i*1009,*params,checkpoints):i for i in range(args.markets_per_seed)}
            completed=0
            for future in as_completed(futures):
                i=futures[future]
                results[i]=future.result()
                completed+=1
                if completed%10==0:
                    print(f'Seed {seed}: {completed}/{args.markets_per_seed}; elapsed {time.time()-started:.0f}s',flush=True)
        examples.append({'seed':seed,'scenarios':{s['id']:[np.exp(results[0][0][lookup[int(round(d*s['speed']*1440))],s['model']]).tolist() for d in range(max_days+1)] for s in scenarios}})
        worlds.extend(results)
    reports={}
    for scenario in scenarios:
        sid=scenario['id']
        m=scenario['model']
        periods={}
        for day in periods_tested:
            at=lookup[int(round(day*scenario['speed']*1440))]
            factors=np.stack([np.exp(w[0][at,m])/base for w in worlds])
            net=(factors-.05*np.maximum(factors-1,0)-1)*100
            portfolio=net.mean(axis=1)
            peaks=np.stack([np.exp(w[1][at,m])/base for w in worlds])
            troughs=np.stack([np.exp(w[2][at,m])/base for w in worlds])
            dd=np.stack([np.expm1(w[3][at,m]) for w in worlds])*100
            rng=np.random.default_rng(81837)
            boot=np.mean(rng.choice(portfolio,(2000,len(worlds)),replace=True),axis=1)
            periods[str(day)]={
                'individualNet':summarize(net.ravel()),'portfolioNet':summarize(portfolio),
                'portfolioMean95Bootstrap':np.quantile(boot,[.025,.975]).tolist(),
                'portfolioReturns':portfolio.tolist(),
                'individualMaxDrawdownPercent':summarize(dd.ravel()),
                'portfolioHourlyVirtualDrawdownPercent':summarize(np.array([w[5][at,m] for w in worlds])*100),
                'finishDownHalfPercent':float(np.mean(factors<=.5)*100),
                'finishDoubleAfterFeePercent':float(np.mean(net>=100)*100),
                'everDoublePricePercent':float(np.mean(peaks>=2)*100),
                'everHalfPricePercent':float(np.mean(troughs<=.5)*100),
                'ever1000Percent':float(np.mean(np.stack([np.exp(w[1][at,m]) for w in worlds])>=1000)*100),
                'everCapPercent':float(np.mean(np.stack([w[4][at,m] for w in worlds]))*100),
                'maxPrice':float(max(np.exp(w[1][at,m]).max() for w in worlds)),
                'risks':{label:{'individualNet':summarize(net[:,risk==i].ravel()),
                                 'finishDoubleAfterFeePercent':float(np.mean(net[:,risk==i]>=100)*100),
                                 'finishDownHalfPercent':float(np.mean(factors[:,risk==i]<=.5)*100)} for i,label in enumerate(risk_labels)},
                'batches':[{'seed':seed,'portfolio':summarize(portfolio[j*args.markets_per_seed:(j+1)*args.markets_per_seed])} for j,seed in enumerate(seeds)],
            }
            assert abs(periods[str(day)]['individualNet']['mean']-periods[str(day)]['portfolioNet']['mean'])<1e-9
        reports[sid]={**scenario,'dailyNoisePerVirtualDay':(vol[m]*math.sqrt(1440)).tolist(),
                      'extraMonthlyGrowthComponent':scenario.get('extraGrowth',.10 if m==4 else 0.),'periods':periods}
    output={'phase':args.phase,'seeds':seeds,'marketsPerScenario':len(worlds),'stocksPerMarket':20,'stocks':stocks,
            'periodDays':periods_tested,'parameters':{'virtualDailyRegimeDrift':[.02,.04,.07],
              'sharedNoiseVarianceFraction':.3,'regimeLengthVirtualMinutes':[30,180],
              'virtualMinuteGrowthLogDrift':growth.tolist(),
              'annualVirtualGrowthComponent':np.expm1(growth*T).tolist(),
              'noiseMultipliers':multipliers.tolist(),'cap':2500,'resistanceFrom':250,'saleFeeOfPositiveGain':.05},
            'scenarios':reports,'examples':examples,
            'method':{'paired':True,'clock':'exact original virtual-minute transitions; checkpoints sampled at corresponding real-day boundaries',
                      'fee':'5% on positive realized gains at independent hypothetical end-of-period liquidation, per stock; no loss offset',
                      'portfolio':'1000 bananas equally allocated by coin amount over 20 stocks at the starting quote; no rebalancing or deposits',
                      'noiseVariants':('same arithmetic growth component in the noise-only pilot variants; noise compensation recomputed for each volatility' if args.phase=='pilot' else 'specified noise ratios combined with separately specified extra-growth components; these are combined settings, not an isolated noise test'),
                      'coverage':'minute-level stock extrema; portfolio drawdown sampled each virtual hour',
                      'selection':('seven scenarios and two new seeds fixed before results; seed two held out; no tuning during run' if args.phase=='pilot' else 'extra growth settings chosen after the pilot; five scenarios and two entirely new seeds fixed before this validation run; no tuning within validation'),
                      'notTested':'active trading strategies or production API behavior'},
            'elapsedSeconds':time.time()-started}
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    with args.out.with_suffix('.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.writer(f)
        writer.writerow(['Variant','Dage','Gennemsnit portefolje netto pct','Median portefolje netto pct','P05','P95','Portefoljer i plus pct','Median enkeltaktie netto pct','Enkeltaktier netto 2x pct','Enkeltaktier kurs halveret pct','Kurser 2x undervejs pct'])
        for s in reports.values():
            for day,p in s['periods'].items():
                writer.writerow([s['label'],day,p['portfolioNet']['mean'],p['portfolioNet']['p05p50p95'][1],p['portfolioNet']['p05p50p95'][0],p['portfolioNet']['p05p50p95'][2],p['portfolioNet']['positivePercent'],p['individualNet']['p05p50p95'][1],p['finishDoubleAfterFeePercent'],p['finishDownHalfPercent'],p['everDoublePricePercent']])
    print(json.dumps({'out':str(args.out),'elapsedSeconds':time.time()-started,'monthly':{sid:{'mean':s['periods']['30']['portfolioNet']['mean'],'median':s['periods']['30']['portfolioNet']['p05p50p95'][1]} for sid,s in reports.items()}},ensure_ascii=False),flush=True)


if __name__=='__main__':
    main()
