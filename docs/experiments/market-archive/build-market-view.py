from pathlib import Path
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

folder = Path(__file__).parent
source = json.loads((folder / 'market-simulation.json').read_text(encoding='utf-8'))
case = source['case']
indices = [i for i in range(len(case['series'])) if i <= 7 * 24 or i % 12 == 0]
view = {
    'stocks': source['stocks'],
    'horizons': sorted(source['horizons'], key=lambda h: h['days']),
    'times': [i / 24 for i in indices],
    'series': [[round(v, 5) for v in case['series'][i]] for i in indices],
    'endpoints': case['endpoints'],
    'max': case['max'],
    'min': case['min'],
}
fragment = (folder / 'market-template.html').read_text(encoding='utf-8').replace('__MARKET_DATA__', json.dumps(view, ensure_ascii=False, separators=(',', ':')))
assert len(fragment.encode('utf-8')) < 1_000_000
(folder / 'market-simulation.html').write_text(fragment, encoding='utf-8')
print(f'{len(indices)} chart samples, {len(fragment.encode("utf-8"))} bytes')
for i, stock in enumerate(source['stocks']):
    print(stock['name'], stock['risk'], stock['base'], 'year', round(case['endpoints']['year'][i], 3), 'min', round(case['min'][i], 3), 'max', round(case['max'][i], 3))
