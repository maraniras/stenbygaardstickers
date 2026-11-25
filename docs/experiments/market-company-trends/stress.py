"""Annual paired market/strategy stress test; next-real-minute execution."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import importlib.util
import json
import math
from pathlib import Path
import sys
import time
import numpy as np
from company import trends

folder=Path(__file__).parent
spec=importlib.util.spec_from_file_location('market_tempo_engine',folder.parent/'market-tempo/compare.py')
engine=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=engine
spec.loader.exec_module(engine)
from numba import njit

MODELS=['withoutCompanyTrends','company50','company25']
STRATEGIES=['hold','randomDaily','momentumHour','momentumWeek','oldDip','resistanceDip','avoidOverheated']

@njit(cache=True)
def trade(prices,initial,seed):
    # rows: initial, hourly decision mark, next-minute executable mark ...
    n,m_count,count=prices.shape
    cash=np.ones((m_count,7,count))*50.
    quantity=np.zeros_like(cash)
    basis=np.zeros_like(cash)
    trips=np.zeros_like(cash)
    values=np.empty((m_count,7,366))
    ema=np.log(prices[0]).copy()
    values[:,:,0]=1000.
    for hour in range(365*24):
        signal_at=hour*2
        fill_at=signal_at+1
        for m in range(m_count):
            for i in range(count):
                price=prices[fill_at,m,i]
                observed=prices[signal_at,m,i]
                if hour>0:
                    ema[m,i]+=(1-math.exp(-1/(30*24)))*(math.log(observed)-ema[m,i])
                for s in range(7):
                    invested=quantity[m,s,i]>0
                    target=invested
                    if s==0:
                        target=True
                    elif s==1 and hour%24==0:
                        x=(seed+(hour//24)*1103515245+i*12345)&0x7fffffff
                        x=(x*1103515245+12345)&0x7fffffff
                        target=x<1073741824
                    elif s==2 and hour>=1:
                        change=observed/prices[(hour-1)*2,m,i]-1
                        target=change>=-.01 if invested else change>.01
                    elif s==3 and hour>=168:
                        change=observed/prices[(hour-168)*2,m,i]-1
                        target=change>=-.02 if invested else change>.02
                    elif s==4:
                        target=observed<initial[i] if invested else observed<initial[i]*.8
                    elif s==5:
                        target=observed<250 if invested else observed<200
                    elif s==6:
                        heat=math.log(observed)-ema[m,i]
                        target=heat<math.log(1.5) if invested else heat<math.log(1.2)
                    if target and not invested:
                        basis[m,s,i]=cash[m,s,i]
                        quantity[m,s,i]=cash[m,s,i]/price
                        cash[m,s,i]=0.
                    elif invested and not target:
                        gross=quantity[m,s,i]*price
                        cash[m,s,i]=gross-.05*max(gross-basis[m,s,i],0.)
                        quantity[m,s,i]=0.
                        trips[m,s,i]+=1
        if (hour+1)%24==0:
            day=(hour+1)//24
            at=(hour+1)*2
            for m in range(m_count):
                for s in range(7):
                    value=0.
                    for i in range(count):
                        gross=quantity[m,s,i]*prices[at,m,i]
                        value+=cash[m,s,i]+gross-.05*max(gross-basis[m,s,i],0.)
                    values[m,s,day]=value
    return values,trips

def stats(a):
    a=np.asarray(a)
    return {'p05p50p95':np.quantile(a,[.05,.5,.95]).tolist(),'mean':float(a.mean()),'positivePercent':float((a>0).mean()*100)}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--phase',choices=['pilot','validation','final','dampingPilot','dampingValidation','cheapPilot','cheapValidation'],default='pilot')
    parser.add_argument('--markets',type=int,default=60)
    parser.add_argument('--workers',type=int,default=6)
    args=parser.parse_args()
    stocks=json.loads((folder.parent/'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
    base=np.array([s['base'] for s in stocks])
    risk=np.array([['Lav','Mellem','Høj'].index(s['risk']) for s in stocks])
    vol=np.tile(np.array([.012,.022,.035])/math.sqrt(1440),(3,1))
    quiet=np.array([[engine.noise_correction(v) for v in row] for row in vol])
    wild=np.array([[engine.noise_correction(v*1.5) for v in row] for row in vol])
    growth=.9*quiet+.1*wild+math.log(1.05)/(365*1440)
    model_names=MODELS if args.phase!='final' else ['company50','company25','company25NoPriceAnchor']
    price_rules=None if args.phase!='final' else np.array([[.02,math.log(2500)],[.02,math.log(2500)],[0.,math.inf]])
    damping=args.phase in ['dampingPilot','dampingValidation']
    cheap=args.phase in ['cheapPilot','cheapValidation']
    recent_rules=None
    if damping:
        model_names=['unbounded','recentGentle','recentStrong']
        price_rules=np.array([[0.,math.inf]]*3)
        recent_rules=np.array([[0.,math.log(1.5),30.],[.10,math.log(1.5),30.],[.35,math.log(1.5),30.]])
    stock_noise=None
    cheap_weight=1-np.minimum(np.log(base)/math.log(25),1.)
    noise_scale=1-.35*cheap_weight
    cheap_delta=np.zeros((3,20))
    if cheap:
        model_names=['bounded','cheapGrowth','cheapGrowthAndNoise']
        stock_noise=np.empty((3,20,3))
        for m in range(3):
            for i in range(20):
                sigma=vol[m,risk[i]]*(noise_scale[i] if m==2 else 1.)
                q=engine.noise_correction(sigma)
                w=engine.noise_correction(sigma*1.5)
                stock_noise[m,i]=[sigma,q,w]
                if m>0:
                    cheap_delta[m,i]=(.9*q+.1*w+math.log(1.05)/(365*1440)-growth[m,risk[i]]
                        -cheap_weight[i]*math.log(1.05)/(30*17520))
    tiny=np.array([0,60,120],dtype=np.int64)
    old=engine.simulate(123,base,risk,vol,quiet,wild,growth,tiny)
    explicit=engine.simulate(123,base,risk,vol,quiet,wild,growth,tiny,None,np.array([[.02,math.log(2500)]]*3))
    for a,b in zip(old,explicit):
        np.testing.assert_allclose(a,b,rtol=1e-12,atol=1e-12)
    if cheap:
        same_noise=np.array([[[vol[m,risk[i]],quiet[m,risk[i]],wild[m,risk[i]]] for i in range(20)] for m in range(3)])
        same=engine.simulate(123,base,risk,vol,quiet,wild,growth,tiny,None,None,None,same_noise)
        for a,b in zip(old,same):
            np.testing.assert_allclose(a,b,rtol=1e-12,atol=1e-12)
        assert cheap_weight[0]==1 and np.all(cheap_weight[base>=25]==0)
        assert np.all(cheap_delta[1,base<25]<0) and np.all(cheap_delta[:,base>=25]==0)
    for shift in [0.,math.log(1000000)]:
        assert abs(engine.recent_growth_brake(math.log(3)+shift,shift,.35,math.log(1.5))-.35*math.log(2)**2/17520)<1e-12
    assert engine.recent_growth_brake(math.log(1.4),0.,.35,math.log(1.5))==0
    assert engine.recent_growth_brake(math.log(.5),0.,.35,math.log(1.5))==0
    if damping:
        zero_rules=np.array([[0.,math.log(1.5),30.]]*3)
        zero=engine.simulate(123,base,risk,vol,quiet,wild,growth,tiny,None,None,zero_rules)
        interpreted=engine.simulate.py_func(123,base,risk,vol,quiet,wild,growth,tiny,None,None,zero_rules)
        for a,b,c in zip(old,zero,interpreted):
            np.testing.assert_allclose(a,b,rtol=1e-12,atol=1e-12)
            np.testing.assert_allclose(a,c,rtol=1e-9,atol=1e-10)
    # 60 real minutes = 730 virtual minutes. Round absolute times, not intervals.
    points=[0]
    for h in range(365*24):
        points.extend([int(round((h*60+1)*365/30)),(h+1)*730])
    checkpoints=np.array(points,dtype=np.int64)
    assert np.all(np.diff(checkpoints)>0) and len(checkpoints)==17521
    # Known profit/loss/fee checks and hold-vs-direct-liquidation reconciliation.
    flat=np.ones((17521,1,20))*10
    v,_=trade(flat,np.ones(20)*10,123)
    np.testing.assert_allclose(v,1000,rtol=1e-12)
    flat[-1]=20
    v,_=trade(flat,np.ones(20)*10,123)
    assert abs(v[0,0,-1]-1950)<1e-9
    flat[-1]=5
    v,_=trade(flat,np.ones(20)*10,123)
    assert abs(v[0,0,-1]-500)<1e-9
    flat[:]=10
    flat[1]=20
    v,_=trade(flat,np.ones(20)*10,123)
    assert abs(v[0,0,-1]-500)<1e-9 # must buy at fill quote, not signal quote
    print('Execution, profit-fee and loss-no-fee checks passed',flush=True)
    start=time.time()
    seed_base=20261210 if args.phase=='pilot' else 20270110 if args.phase=='validation' else 20270210
    if damping:
        seed_base=20270310 if args.phase=='dampingPilot' else 20270410
    if cheap:
        seed_base=20270510 if args.phase=='cheapPilot' else 20270610
    seeds=[seed_base+i*1009 for i in range(args.markets)]
    def run(seed):
        d,_=trends(seed,365,1.5)
        drift=np.concatenate([d[:1],d[1:],d[1:]*math.log(1.25)/math.log(1.5)],axis=0)
        if args.phase=='final':
            drift=np.concatenate([d[1:],d[1:]*math.log(1.25)/math.log(1.5),d[1:]*math.log(1.25)/math.log(1.5)],axis=0)
        if damping:
            drift=np.tile(d[1:]*math.log(1.25)/math.log(1.5),(3,1,1))
        if cheap:
            drift=np.tile(d[1:]*math.log(1.25)/math.log(1.5),(3,1,1))
            drift+=cheap_delta[:,None,:]
        result=engine.simulate(seed,base,risk,vol,quiet,wild,growth,checkpoints,drift,price_rules,recent_rules,stock_noise)
        prices=np.exp(result[0])
        assert np.isfinite(prices).all() and (prices>0).all()
        if cheap:
            np.testing.assert_allclose(prices[:,0,base>=25],prices[:,1,base>=25],rtol=1e-12,atol=1e-12)
            np.testing.assert_allclose(prices[:,0,base>=25],prices[:,2,base>=25],rtol=1e-12,atol=1e-12)
        if args.phase!='final' and not damping:
            assert (prices<=2500+1e-8).all()
        elif not damping:
            assert (prices[:,:2]<=2500+1e-8).all()
        values,trips=trade(prices,base,seed)
        expected=(prices[-1]/prices[1]-.05*np.maximum(prices[-1]/prices[1]-1,0)).mean(axis=1)*1000
        np.testing.assert_allclose(values[:,0,-1],expected,rtol=1e-9)
        daily=prices[::48] # each real day is 48 snapshot indices
        factors=daily/base
        net=factors-.05*np.maximum(factors-1,0)
        worst90=np.min(daily[90:]/daily[:-90]-1,axis=0)
        longest=np.zeros((3,20))
        run_length=np.zeros_like(longest)
        for row in factors[1:]:
            run_length=np.where(row<1,run_length+1,0)
            longest=np.maximum(longest,run_length)
        monthly_factors=daily[30:]/daily[:-30]
        monthly=(monthly_factors-.05*np.maximum(monthly_factors-1,0)-1).mean(axis=2)*100
        strategy_dd=(values/np.maximum.accumulate(values,axis=2)-1).min(axis=2)*100
        return {'yearNet':(net[-1]-1)*100,'monthly':monthly,
            'strategy':(values[:,:,-1]/1000-1)*100,'strategyDrawdown':strategy_dd,
            'trips':trips.mean(axis=2),'worst90':worst90*100,'longest':longest,
            'drawdown':np.expm1(result[3][-1])*100,'caps':result[4][-1],
            'maxPrice':np.exp(result[1][-1]).max(axis=1),
            'peakStockPrices':np.exp(result[1][-1])}
    worlds=[]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(run,s):s for s in seeds}
        for f in as_completed(futures):
            worlds.append((futures[f],f.result()))
            if len(worlds)%10==0:
                print(f'{len(worlds)}/{len(seeds)} annual markets, {time.time()-start:.0f}s',flush=True)
    worlds=[w for _,w in sorted(worlds)]
    report={}
    for m,name in enumerate(model_names):
        year=np.stack([w['yearNet'][m] for w in worlds])
        strategies=np.stack([w['strategy'][m] for w in worlds])
        report[name]={'portfolioAnnualNet':stats(year.mean(axis=1)),
            'individualAnnualNet':stats(year.ravel()),
            'portfolioYearLossPercent':float((year.mean(axis=1)<0).mean()*100),
            'stockYearLossPercent':float((year<0).mean()*100),
            'stockYearLossOverHalfPercent':float((year< -50).mean()*100),
            'portfolioRolling30Days':stats(np.concatenate([w['monthly'][:,m] for w in worlds])),
            'stocksWith90DayLossAbove20Percent':float(np.mean([w['worst90'][m]<-20 for w in worlds])*100),
            'medianLongestBelowStartDays':float(np.median([w['longest'][m] for w in worlds])),
            'capHitPercent':float(np.mean([w['caps'][m] for w in worlds])*100),
            'maxObservedPrice':float(max(w['maxPrice'][m] for w in worlds)),
            'stockPeakAbove1000Percent':float(np.mean([w['peakStockPrices'][m]>1000 for w in worlds])*100),
            'stockPeakAbove10000Percent':float(np.mean([w['peakStockPrices'][m]>10000 for w in worlds])*100),
            'risks':{label:stats(year[:,risk==i].ravel()) for i,label in enumerate(['Lav','Mellem','Høj'])},
            'strategies':{label:{**stats(strategies[:,i]),
                'beatHoldPercent':float((strategies[:,i]>strategies[:,0]).mean()*100),
                'medianDailySampledDrawdownPercent':float(np.median([w['strategyDrawdown'][m,i] for w in worlds])),
                'medianRoundTripsPerStock':float(np.median([w['trips'][m,i] for w in worlds]))}
                for i,label in enumerate(STRATEGIES)}}
        if cheap:
            peak_factors=np.stack([w['peakStockPrices'][m]/base for w in worlds])
            end_factors=1+np.where(year>0,year/.95,year)/100
            report[name]['startPriceGroups']={}
            for label,mask in [('upTo10',base<=10),('11to24',(base>10)&(base<25)),('25andUp',base>=25)]:
                returns=year[:,mask]
                report[name]['startPriceGroups'][label]={
                    'stocksPerMarket':int(mask.sum()),'annualNet':stats(returns.ravel()),
                    'finishGrossGain1000Percent':float((end_factors[:,mask]>=11).mean()*100),
                    'finishGrossGain2000Percent':float((end_factors[:,mask]>=21).mean()*100),
                    'everGrossGain1000Percent':float((peak_factors[:,mask]>=11).mean()*100),
                    'everGrossGain2000Percent':float((peak_factors[:,mask]>=21).mean()*100)}
    output={'phase':args.phase,'markets':args.markets,'seeds':seeds,'realDays':365,'stocksPerMarket':20,
        'models':report,'parameters':{'company50MonthlyLog':math.log(1.5),'company25MonthlyLog':math.log(1.25),
        'growthUnchanged':True,'regimeDays':[7,28],'clockSpeed':365/30},
        'method':{'paired':True,'decision':'hourly, fill one real minute later (rounded virtual minute)',
        'strategyFunds':'20 separate 50-banana wallets; fractional shares, cash or long only, reinvest proceeds, no cross-stock reallocation',
        'fee':'5% of positive realized profit per sale; hypothetical liquidation at end; no fee on loss',
        'hold':'buys at first real-minute quote, no further trades',
        'momentumHour':'entry >+1% last hour, exit <−1% last hour',
        'momentumWeek':'entry >+2% last 7 days, exit <−2% last 7 days',
        'oldDip':'entry below 80% of initial quote, exit at initial quote',
        'resistanceDip':'entry below 200, exit at 250',
        'avoidOverheated':'hourly log EMA with 30-day time constant; sell if >1.5 times EMA, reenter if <1.2; next-minute fills',
        'monthly':'fresh equally allocated buy-and-hold investment per overlapping 30-day window; 5% fee per winning stock at window end',
        'limits':'one hourly execution schedule; no optimal strategy search, no transaction price impact; rolling windows dependent',
        'selection':'pilot and validation models fixed before pilot; final no-anchor candidate chosen after pilot and tested on fresh seeds without within-run tuning',
        'priceRules':'final third model has no price-dependent resistance and no fixed cap; other variants retain legacy limits'},
        'elapsedSeconds':time.time()-start}
    path=folder/f'stress-{args.phase}-20261125.json'
    if damping:
        output['parameters']['recentRules']=recent_rules.tolist()
        output['method']['selection']='recent-damping pilot parameters fixed in advance; validation uses fresh seeds with unchanged strengths'
        output['method']['priceRules']='all damping variants have no absolute price cap or resistance; EMA initialized at start quote, updated after each virtual-minute transition'
    if cheap:
        output['parameters']['cheapWeight']=cheap_weight.tolist()
        output['parameters']['noiseScaleForCombinedModel']=noise_scale.tolist()
        output['parameters']['maxMonthlyLogGrowthDiscount']=math.log(1.05)
        output['parameters']['growthUnchanged']=False
        output['method']['priceRules']='all variants retain resistance above 250 and cap 2500; no recent-rise damping'
        output['method']['selection']='cheap pilot parameters fixed before run; validation uses new seeds with unchanged settings'
        output['method']['cheapRules']='fixed initial quote, never current quote: log-tapered growth discount below 25; combined variant also reduces noise by up to 35% with growth compensation recalculated'
    path.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    for name,r in report.items():
        print(name,json.dumps({'annual':r['portfolioAnnualNet'],'stockLoss':r['stockYearLossPercent'],
            'momentumWeek':r['strategies']['momentumWeek'],'momentumHour':r['strategies']['momentumHour']},ensure_ascii=False),flush=True)

if __name__=='__main__':
    main()
