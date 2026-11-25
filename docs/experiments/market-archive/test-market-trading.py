"""Independent-seed, minute-level checks of the proposed fictional market.

No future prices or hidden regimes are visible to the strategies. Decisions every
10 minutes execute at the NEXT minute quote. Each stock has its own 1,000-banana
wallet. Fractional shares, no leverage, no deposits; all positions are liquidated
at the end. Fees charged on both sides, including final liquidation.
"""
from pathlib import Path
import json
import sys
import numpy as np
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--wandering', action='store_true')
parser.add_argument('--reps', type=int, default=100)
args = parser.parse_args()

sys.stdout.reconfigure(encoding='utf-8')
OUT = Path(__file__).parent
original = json.loads((OUT / 'market-simulation.json').read_text(encoding='utf-8'))
params = original['parameters']
BASE = np.array([s['base'] for s in original['stocks']])
RISK = np.array([['Lav', 'Mellem', 'Høj'].index(s['risk']) for s in original['stocks']])
REPS = args.reps
N = REPS * len(BASE)
STEPS = 365 * 1440
HORIZONS = [10, 60, 180, 1440]
FEES = [0, .0025, .005]
SEED = 20261031
rng = np.random.default_rng(SEED)
sample_rng = np.random.default_rng(80723)
trade_rng = np.random.default_rng(90821)
anchor_rng = np.random.default_rng(601109)
ends = {h: set(sample_rng.choice(np.arange(30 * 1440 + h, STEPS + 1), 200, replace=False).tolist()) for h in HORIZONS}
samples = {h: [] for h in HORIZONS}
risk = np.tile(RISK, REPS)
base = np.tile(BASE, REPS)
logbase = np.log(base)
anchor = logbase.copy()
anchor_sigma = np.array([.04,.07,.10])[risk] / np.sqrt(1440)
price = logbase.copy()
history = np.zeros((1441, N))
history[0] = price
sigma = np.array(params['dailyVolatility'])[risk] / np.sqrt(1440)
pull = np.log(2) / (np.array(params['halfLifeDays'])[risk] * 1440)
drift = np.array(params['trendDailyLogDrift'])[risk] / 1440
regime = np.zeros(N, dtype=int)
remaining = np.zeros(N, dtype=int)
names = ['buyHold', 'randomDaily', 'momentum', 'buyDip', 'buyDipLimited']
position = np.zeros((len(names), N), dtype=bool)
pending = np.zeros_like(position)
pending[0] = True
gross = np.zeros_like(position, dtype=float)
entries = np.zeros_like(position, dtype=int)
exits = np.zeros_like(position, dtype=int)
entry_price = np.zeros_like(position, dtype=float)
entry_minute = np.zeros_like(position, dtype=int)
wins = np.zeros_like(position, dtype=int)
max_log_equity = np.zeros_like(gross)
max_drawdown = np.zeros_like(gross)
history_equity = []

print(f'{N} stock-years; 5 strategies; fees 0 / 0.25 / 0.5 percent per side.', flush=True)
for minute in range(1, STEPS + 1):
    due = remaining <= 0
    count = np.count_nonzero(due)
    if count:
        regime[due] = rng.choice(4, count, p=params['regimeProbabilities'])
        remaining[due] = rng.integers(30, 181, count)
    tendency = np.where(regime == 1, drift, np.where(regime == 2, -drift, 0))
    vol = sigma * np.where(regime == 3, 1.5, 1)
    excess = np.maximum(price - np.log(250), 0)
    if args.wandering:
        # Experimental alternative: the ORIGINAL base stays fixed, but the
        # medium-term balance point can move. It reverts only over ~one year.
        anchor += -np.log(2)/(365*1440)*(anchor-logbase) + anchor_sigma*anchor_rng.standard_normal(N)
    move = -pull * (price - anchor) + tendency - .02 * excess ** 2 / 1440 + vol * rng.standard_normal(N)
    new_price = np.minimum(price + np.clip(move, -.01, .01), np.log(2500))
    gross += position * (new_price - price)
    price = new_price
    remaining -= 1
    history[minute % 1441] = price

    # Execute the previously submitted order, never at its decision quote.
    buy = pending & ~position
    sell = ~pending & position
    entries += buy
    exits += sell
    wins += sell & ((price - entry_price + np.log(1-.0025) - np.log(1+.0025)) > 0)
    entry_price = np.where(buy, price, entry_price)
    entry_minute = np.where(buy, minute, entry_minute)
    position = pending.copy()
    equity = gross - entries * np.log(1+.0025) + exits * np.log(1-.0025)
    # Liquidation value includes the exit fee for all still-open positions.
    equity += position * np.log(1-.0025)
    max_log_equity = np.maximum(max_log_equity, equity)
    max_drawdown = np.minimum(max_drawdown, equity - max_log_equity)

    for h in HORIZONS:
        if minute in ends[h]:
            samples[h].append((price - history[(minute-h) % 1441]).astype(np.float32))

    if minute % 10 == 0:
        momentum = price - history[(minute-60) % 1441] if minute >= 60 else np.zeros(N)
        pending[2] = np.where(~position[2], momentum > np.log(1.01), momentum >= np.log(.99))
        pending[3] = np.where(~position[3], price < logbase + np.log(.8), price < logbase)
        limited_exit = (price >= logbase) | (price - entry_price[4] <= np.log(.7)) | (minute-entry_minute[4] >= 30*1440)
        pending[4] = np.where(~position[4], price < logbase + np.log(.8), ~limited_exit)
    if minute % 1440 == 0:
        pending[1] = trade_rng.random(N) < .5
    if minute % (30*1440) == 0:
        history_equity.append({
            'day': minute // 1440,
            'strategies': [float(np.median(np.exp(row)-1)*100) for row in equity],
        })
        print(f'Day {minute//1440} / 365', flush=True)

# Include forced liquidation, even for underwater trades.
exits += position
wins += position & ((price - entry_price + np.log(1-.0025) - np.log(1+.0025)) > 0)
assert np.array_equal(entries, exits)
assert np.all(entries >= 0)
assert np.all(np.isfinite(gross))

short = {}
for h in HORIZONS:
    logs = np.stack(samples[h])
    short[str(h)] = {}
    for r, label in enumerate(['Lav', 'Mellem', 'Høj']):
        values = logs[:, risk == r].ravel()
        net = np.expm1(values + np.log(1-.0025)-np.log(1+.0025)) * 100
        short[str(h)][label] = {
            'windows': int(len(values)),
            'grossReturnP05P50P95': (np.expm1(np.quantile(values,[.05,.5,.95]))*100).tolist(),
            'medianAbsoluteMovePercent': float(np.median(np.abs(np.expm1(values))) * 100),
            'netPositivePercent': float(np.mean(net>0) * 100),
            'meanNetPercent': float(np.mean(net)),
            'medianNetPercent': float(np.median(net)),
        }

strategies = {}
for fee in FEES:
    label = str(fee)
    strategies[label] = {}
    net_log = gross - entries*np.log(1+fee)+exits*np.log(1-fee)
    for index, name in enumerate(names):
        strategies[label][name] = {}
        for r, risk_label in enumerate(['Lav', 'Mellem', 'Høj']):
            selected = risk == r
            returns = np.expm1(net_log[index,selected]) * 100
            strategies[label][name][risk_label] = {
                'paths': int(selected.sum()),
                'annualReturnP05P50P95': np.quantile(returns,[.05,.5,.95]).tolist(),
                'meanAnnualReturnPercent': float(np.mean(returns)),
                'positiveWalletPercent': float(np.mean(returns>0)*100),
                'medianRoundTrips': float(np.median(entries[index,selected])),
                'meanRoundTrips': float(np.mean(entries[index,selected])),
                'medianMaxDrawdownPercent': float(np.median(np.expm1(max_drawdown[index,selected]))*100) if fee == .0025 else None,
            }

result = {
    'seed': SEED, 'replications': REPS, 'stockYears': N, 'minutesPerStock': STEPS,
    'variant': 'wandering' if args.wandering else 'fixed',
    'anchorDailyVolatility': [.04,.07,.10] if args.wandering else [0,0,0],
    'anchorHalfLifeDays': 365 if args.wandering else None,
    'initialWallet': 1000, 'feesPerSide': FEES,
    'parameters': params,
    'shortWindows': short,
    'strategies': strategies,
    'medianEquityHistory': history_equity,
    'method': {
        'windows': '200 shared random endpoints per horizon after day 30; windows may overlap, not independent trials',
        'strategies': 'All-in or cash, fractional shares, no leverage, separate wallet per stock, next-minute execution, final liquidation',
        'momentum': 'Buy after +1% over last hour; sell after -1% over last hour; decisions every 10min',
        'buyDip': 'Buy below 80% of fixed public base; sell at base; forced liquidation at year end',
        'buyDipLimited': 'Same, with 30% stop-loss from entry and 30-day maximum holding period; re-entry allowed next decision',
        'randomDaily': 'Daily independent 50% choice of invested or cash',
    },
}
filename = 'market-trading-tests-wandering.json' if args.wandering else 'market-trading-tests.json'
(OUT/filename).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('SHORT WINDOWS', json.dumps(short,ensure_ascii=False),flush=True)
print('STRATEGIES, 0.25% EACH SIDE',json.dumps(strategies['0.0025'],ensure_ascii=False),flush=True)
