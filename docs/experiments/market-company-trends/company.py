"""Independent slow company regimes at the 365/30 market clock."""
import math
import numpy as np

def trends(seed, days, monthly_factor=1.25):
    drift = np.zeros((2,days,20))
    states = np.zeros((days,20), dtype=np.int64)
    durations = []
    for i in range(20):
        # A separate stream per company keeps all prefixes stable when extending
        # the horizon. The 90-day study uses the original sequential generator.
        rng = np.random.default_rng(np.random.SeedSequence([seed, 728, i]))
        day, previous, smoothed = 0, 9, 0.
        while day < days:
            state = int(rng.choice([v for v in [-1,0,1] if v != previous]))
            duration = int(rng.integers(7,29))
            durations.append(duration)
            for d in range(day,min(days,day+duration)):
                smoothed += (state-smoothed)*(1-math.exp(-.5))
                drift[1,d,i] = smoothed*math.log(monthly_factor)/(30*17520)
                states[d,i] = state
            previous = state
            day += duration
    assert min(durations)>=7 and max(durations)<=28
    return drift, states
