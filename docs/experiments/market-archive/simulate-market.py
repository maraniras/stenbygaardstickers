"""Reproducible design experiment, not an implemented market or a forecast."""
from pathlib import Path
import csv
import json
import numpy as np

OUT = Path(__file__).parent
BASE = np.array([1, 2, 3, 4, 5, 7, 10, 13, 16, 20, 25, 30, 38, 45, 52, 60, 70, 80, 90, 100.])
RISK = np.array([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 1, 2])
NAMES = ['Bananboden', 'Emils Sokker', 'Knæ Holding', 'Lygtepæl A/S', 'Stickerpost', 'Norsk Offshore', 'Aalborg Lim', 'Motława Mad', 'Emil Airways', 'Klister & Co', 'Rom Express', 'Skrigeteknik', 'Nicole Design', 'Mathias Montage', 'Bananraketten', 'Stenbygaard Fragt', 'Colosseum Kiosk', 'Mikkels Månebase', 'Verdenslim', 'Emil Global']
DAYS = {'day': 1, 'week': 7, 'sevenWeeks': 49, 'month': 30, 'threeMonths': 90, 'sixMonths': 180, 'year': 365}
LABELS = {'day': '1 dag', 'week': '1 uge', 'sevenWeeks': '7 uger', 'month': '1 måned', 'threeMonths': '3 måneder', 'sixMonths': '6 måneder', 'year': '1 år'}
PARAMS = {
    'seed': 20261029,
    'ensembleSeed': 20261030,
    'replications': 100,
    'dailyVolatility': [.05, .10, .18],
    'halfLifeDays': [12, 24, 36],
    'trendDailyLogDrift': [.10, .20, .35],
    'regimeProbabilities': [.50, .20, .20, .10],
    'regimeMinutes': [30, 180],
    'turbulentVolatilityMultiplier': 1.5,
    'upperPressureStart': 250,
    'upperPressurePerDay': .02,
    'hardCap': 2500,
    'maxMinuteLogMove': .01,
    'minuteIntervals': 365 * 1440,
}


def simulate(reps, seed, sample=False):
    rng = np.random.default_rng(seed)
    risk = np.tile(RISK, reps)
    base = np.tile(BASE, reps)
    logbase = np.log(base)
    price = logbase.copy()
    sigma = np.array(PARAMS['dailyVolatility'])[risk] / np.sqrt(1440)
    pull = np.log(2) / (np.array(PARAMS['halfLifeDays'])[risk] * 1440)
    drift = np.array(PARAMS['trendDailyLogDrift'])[risk] / 1440
    remaining = np.zeros(len(base), dtype=int)
    regime = np.zeros(len(base), dtype=int)
    logmax = price.copy()
    logmin = price.copy()
    thresholds = [250, 500, 1000, 2000, 2500]
    minutes_above = np.zeros((len(thresholds), len(base)), dtype=np.int64)
    endpoints = {}
    snapshots = {day * 1440: key for key, day in DAYS.items()}
    sampled = [base.copy()] if sample else []
    # Also retain the true minute-level minimum/maximum within each sampled hour.
    hourmin = price.copy()
    hourmax = price.copy()
    sampled_min = [base.copy()] if sample else []
    sampled_max = [base.copy()] if sample else []
    cap = np.log(PARAMS['hardCap'])
    for minute in range(1, PARAMS['minuteIntervals'] + 1):
        due = remaining <= 0
        count = np.count_nonzero(due)
        if count:
            regime[due] = rng.choice(4, count, p=PARAMS['regimeProbabilities'])
            remaining[due] = rng.integers(30, 181, count)
        tendency = np.where(regime == 1, drift, np.where(regime == 2, -drift, 0))
        vol = sigma * np.where(regime == 3, 1.5, 1)
        excess = np.maximum(price - np.log(250), 0)
        pressure = .02 * excess ** 2 / 1440
        move = -pull * (price - logbase) + tendency - pressure + vol * rng.standard_normal(len(base))
        price = np.minimum(price + np.clip(move, -.01, .01), cap)
        remaining -= 1
        logmax = np.maximum(logmax, price)
        logmin = np.minimum(logmin, price)
        hourmin = np.minimum(hourmin, price)
        hourmax = np.maximum(hourmax, price)
        for index, threshold in enumerate(thresholds):
            minutes_above[index] += price >= np.log(threshold) - 1e-12
        if minute in snapshots:
            endpoints[snapshots[minute]] = np.exp(price).tolist()
        if sample and minute % 60 == 0:
            sampled.append(np.exp(price).copy())
            sampled_min.append(np.exp(hourmin).copy())
            sampled_max.append(np.exp(hourmax).copy())
            hourmin = price.copy()
            hourmax = price.copy()
    peaks = np.exp(logmax)
    lows = np.exp(logmin)
    final = np.exp(price)
    stats = {}
    for index, label in enumerate(['Lav', 'Mellem', 'Høj']):
        selected = risk == index
        ratio = final[selected] / base[selected]
        peakratio = peaks[selected] / base[selected]
        stats[label] = {
            'paths': int(selected.sum()),
            'yearReturnPercentiles': ((np.quantile(ratio, [.05, .50, .95]) - 1) * 100).tolist(),
            'peakMultiplePercentiles': np.quantile(peakratio, [.50, .95, .99]).tolist(),
            'finishHigherPercent': float(np.mean(ratio > 1) * 100),
        }
    return {
        'endpoints': endpoints,
        'max': peaks.tolist(),
        'min': lows.tolist(),
        'series': np.asarray(sampled).round(6).tolist(),
        'hourMin': np.asarray(sampled_min).round(6).tolist(),
        'hourMax': np.asarray(sampled_max).round(6).tolist(),
        'stats': stats,
        'thresholds': [{
            'price': threshold,
            'pathsReached': int(np.count_nonzero(peaks >= threshold - 1e-8)),
            'pathPercent': float(np.mean(peaks >= threshold - 1e-8) * 100),
            'minutePercent': float(minutes_above[index].sum() / (len(base) * PARAMS['minuteIntervals']) * 100),
        } for index, threshold in enumerate(thresholds)],
        'globalMax': float(peaks.max()),
        'globalMin': float(lows.min()),
    }


print('Running 20 stocks, 525,600 minute steps each...', flush=True)
case = simulate(1, PARAMS['seed'], True)
print('Running 100 independent markets (2,000 stock-years)...', flush=True)
ensemble = simulate(PARAMS['replications'], PARAMS['ensembleSeed'])
ensemble.pop('endpoints')
ensemble.pop('series')
ensemble.pop('hourMin')
ensemble.pop('hourMax')
result = {
    'parameters': PARAMS,
    'stocks': [{'name': name, 'base': float(base), 'risk': ['Lav', 'Mellem', 'Høj'][risk]} for name, base, risk in zip(NAMES, BASE, RISK)],
    'horizons': [{'key': key, 'label': LABELS[key], 'days': day} for key, day in DAYS.items()],
    'case': case,
    'ensemble': ensemble,
}
# Compact embedded data: at most ~1,000 points per selected chart are rendered.
(OUT / 'market-simulation.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
with (OUT / 'market-simulation.csv').open('w', newline='', encoding='utf-8-sig') as file:
    writer = csv.writer(file, delimiter=';')
    writer.writerow(['Aktie', 'Risiko', 'Startkurs'] + list(LABELS.values()) + ['Laveste minutkurs', 'Højeste minutkurs'])
    for i, stock in enumerate(result['stocks']):
        writer.writerow([stock['name'], stock['risk'], stock['base']] + [round(case['endpoints'][key][i], 6) for key in DAYS] + [round(case['min'][i], 6), round(case['max'][i], 6)])
assert all(np.isfinite(case['max']))
assert min(case['min']) > 0
assert max(ensemble['max']) <= 2500 + 1e-8
assert len(case['series']) == 365 * 24 + 1
print(json.dumps({'case': {key: case[key] for key in ['globalMax', 'globalMin', 'thresholds', 'stats']}, 'ensemble': {key: ensemble[key] for key in ['globalMax', 'globalMin', 'thresholds', 'stats']}}, ensure_ascii=False, indent=2))
