from pathlib import Path
import json

folder = Path(__file__).parent
old = json.loads((folder/'market-simulation.json').read_text(encoding='utf-8'))
models=[]
for tag,label in [('t1-v1','Tidligere udsving'),('t0.2-v0.4','Dæmpede udsving')]:
    result=json.loads((folder/f'market-v2-{tag}.json').read_text(encoding='utf-8'))
    case=result['case']
    indices=[i for i in range(len(case['hourlySeries'])) if i<=7*24 or i%12==0]
    data={
        'stocks':result['stocks'],
        'horizons':sorted(old['horizons'],key=lambda h:h['days']),
        'times':[i/24 for i in indices],
        'series':[[float(f'{v:.5g}') for v in case['hourlySeries'][i]] for i in indices],
        'endpoints':case['endpoints'],'min':case['min'],'max':case['max'],
    }
    models.append({'label':label,'data':data})
fragment=(folder/'market-template.html').read_text(encoding='utf-8')
fragment=fragment.replace('20 aktier · et simuleret år','20 aktier · uden grundkurs')
fragment=fragment.replace('<div class="controls">','<div class="controls">\n    <label class="form-label">Model<select class="form-select" id="market-model"></select></label>',1)
fragment=fragment.replace("const data=JSON.parse(document.getElementById('market-data').textContent);", "const bundle=JSON.parse(document.getElementById('market-data').textContent);\n  const savedModel=window.openai?.widgetState?.modelContent?.model;\n  const initialModel=[0,1].includes(savedModel)?savedModel:1;\n  let data=bundle.models[initialModel].data;")
fragment=fragment.replace("const state={period:","const state={model:initialModel,period:")
fragment=fragment.replace("const header=root.querySelector('thead');","const modelSelect=root.querySelector('#market-model');\n  bundle.models.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=m.label;modelSelect.append(o);});\n  const header=root.querySelector('thead');")
fragment=fragment.replace("  data.stocks.forEach((s,i)=>{\n    const row=", "  function fillTable(){tbody.replaceChildren();data.stocks.forEach((s,i)=>{\n    const row=")
fragment=fragment.replace("tbody.append(row);\n  });", "tbody.append(row);\n  });} fillTable();")
fragment=fragment.replace("modelContent:{period:state.period", "modelContent:{model:state.model,period:state.period")
fragment=fragment.replace("period.value=state.period;", "modelSelect.value=state.model;period.value=state.period;")
fragment=fragment.replace("  period.addEventListener('change'", "  modelSelect.addEventListener('change',()=>{state.model=Number(modelSelect.value);data=bundle.models[state.model].data;fillTable();draw();persist();});\n  period.addEventListener('change'")
fragment=fragment.replace("if(!s)return;if(data.horizons", "if(!s)return;if([0,1].includes(s.model)){state.model=s.model;data=bundle.models[state.model].data;fillTable();}if(data.horizons")
fragment=fragment.replace("format.format(data.endpoints[h.key][i])", "(data.endpoints[h.key][i]<.01?precise(data.endpoints[h.key][i]):format.format(data.endpoints[h.key][i]))")
fragment=fragment.replace('__MARKET_DATA__',json.dumps({'models':models},ensure_ascii=False,separators=(',',':')))
assert 'function fillTable()' in fragment
assert '__MARKET_DATA__' not in fragment
assert len(fragment.encode('utf-8'))<1_000_000
(folder/'market-v2.html').write_text(fragment,encoding='utf-8')
print('Saved',len(fragment.encode('utf-8')),'bytes')
