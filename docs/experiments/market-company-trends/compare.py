"""Paired 90-real-day study of independent 7–28 day company regimes."""
import importlib.util
import json
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
import numpy as np

folder = Path(__file__).parent
spec = importlib.util.spec_from_file_location('market_tempo_engine', folder.parent/'market-tempo/compare.py')
engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = engine
spec.loader.exec_module(engine)
stocks = json.loads((folder.parent/'market-growth/market-simulation.json').read_text(encoding='utf-8'))['stocks']
base = np.array([s['base'] for s in stocks])
risk = np.array([['Lav', 'Mellem', 'Høj'].index(s['risk']) for s in stocks])
days = 90
checkpoints = np.arange(days+1, dtype=np.int64)*17520
vol = np.tile(np.array([.012,.022,.035])/math.sqrt(1440), (2,1))
quiet = np.array([[engine.noise_correction(v) for v in row] for row in vol])
wild = np.array([[engine.noise_correction(v*1.5) for v in row] for row in vol])
growth = .9*quiet+.1*wild+math.log(1.05)/(365*1440)

def trends(seed):
    # Separate RNG: adding company trends cannot change existing noise paths.
    rng = np.random.default_rng(np.random.SeedSequence([seed, 728]))
    drift = np.zeros((2,days,20))
    states = np.zeros((days,20), dtype=np.int64)
    durations = []
    for i in range(20):
        day = 0
        previous = 9
        smoothed = 0.
        while day < days:
            options = [v for v in [-1,0,1] if v != previous]
            state = int(rng.choice(options))
            duration = int(rng.integers(7,29))
            durations.append(duration)
            for d in range(day,min(days,day+duration)):
                # Two-day easing; same trend amplitude for all risk classes.
                smoothed += (state-smoothed)*(1-math.exp(-.5))
                drift[1,d,i] = smoothed*math.log(1.5)/(30*17520)
                states[d,i] = state
            previous = state
            day += duration
    assert min(durations)>=7 and max(durations)<=28
    return drift, states

params = (base,risk,vol,quiet,wild,growth)
tiny = np.array([0,60,120],dtype=np.int64)
zero = np.zeros((2,1,20))
original = engine.simulate(123,*params,tiny)
optional = engine.simulate(123,*params,tiny,zero)
interpreted = engine.simulate.py_func(123,*params,tiny,zero)
for a,b,c in zip(original,optional,interpreted):
    np.testing.assert_allclose(a,b,rtol=1e-12,atol=1e-12)
    np.testing.assert_allclose(a,c,rtol=1e-9,atol=1e-10)
# Confirm trend units and sign with identical random draws and no resistance.
positive = zero.copy()
positive[1,:,:] = .000001
raised = engine.simulate(123,*params,tiny,positive)
np.testing.assert_allclose(raised[0][-1,1]-original[0][-1,1],.00012,atol=1e-10)
print('Zero-trend compatibility, interpreted/JIT, trend sign and units passed',flush=True)

def run(seed):
    drift,states = trends(seed)
    result = engine.simulate(seed,*params,checkpoints,drift)
    daily = np.exp(result[0])
    assert np.isfinite(daily).all() and (daily>0).all() and (daily<=2500+1e-8).all()
    return daily,states

seeds = [20261202+i*1009 for i in range(60)]
with ThreadPoolExecutor(max_workers=8) as pool:
    worlds = list(pool.map(run,seeds))
daily = np.stack([w[0] for w in worlds])
reports = {}
for m,label in enumerate(['baseline','companyTrends']):
    p = daily[:,:,m,:]
    factors = p/base
    net = factors-.05*np.maximum(factors-1,0)
    losing30 = p[:,30:,:]<p[:,:-30,:]
    worst30 = np.min(p[:,30:,:]/p[:,:-30,:]-1,axis=1)
    longest = []
    for market in factors:
        for i in range(20):
            run_length = best = 0
            for f in market[1:,i]:
                run_length = run_length+1 if f<1-1e-12 else 0
                best = max(best,run_length)
            longest.append(best)
    reports[label] = {
        'portfolioNet90MeanPercent':float(np.mean(net[:,-1,:].mean(axis=1)-1)*100),
        'portfolioNet90MedianPercent':float(np.median(net[:,-1,:].mean(axis=1)-1)*100),
        'stocksEndBelowStartPercent':float(np.mean(factors[:,-1,:]<1)*100),
        'losing30DayWindowsPercent':float(np.mean(losing30)*100),
        'stocksWith30DayLossAbove20Percent':float(np.mean(worst30<-.2)*100),
        'medianLongestBelowStartDays':float(np.median(longest)),
        'dailyLogVolByRiskPercent':{label:float(np.std(np.diff(np.log(p[:,:,risk==r]),axis=1),axis=1).mean()*100) for r,label in enumerate(['Lav','Mellem','Høj'])},
    }
output = {'seeds':seeds,'markets':60,'realDays':days,'stocks':stocks,
          'parameters':{'clockSpeed':365/30,'durationRealDays':[7,28],
                        'trendLogPerRealDay':math.log(1.5)/30,'smoothingRealDays':2,
                        'states':[-1,0,1],'repeatSameState':False,
                        'riskIndependentTrend':True,'growthAdjustment':0},
          'reports':reports,'example':{'seed':seeds[0],'baseline':daily[0,:,0,:].tolist(),
              'companyTrends':daily[0,:,1,:].tolist(),'states':worlds[0][1].tolist()},
          'limits':['90-day study, not a full real-year ensemble',
                    'Overlapping windows are dependent; no independent-observation confidence claim',
                    'Company trend has zero symmetric log target, not guaranteed neutral arithmetic return',
                    'Active trading, momentum exploitation and live APIs not tested']}
(folder/'results-20261125.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps(reports,ensure_ascii=False,indent=2),flush=True)
