import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

export function setup(redisEnabled = false, extra = []) {
  const storage = new Map(),
    hashes = new Map(),
    strings = new Map(),
    modules = new Map()
  const context = vm.createContext({
    Buffer,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Intl,
    redisEnabled,
    createError: (v) => Object.assign(new Error(v.statusMessage), v),
    nameKey: (n) => n.toLocaleLowerCase('da'),
    useStorage: () => ({
      getItem: async (k) => {
        const v = storage.get(k)
        if (typeof v === 'string' && v.startsWith('{')) return JSON.parse(v)
        return v
      },
      setItem: async (k, v) => storage.set(k, v),
      getKeys: async (p) => [...storage.keys()].filter((k) => k.startsWith(p)),
    }),
    redis: async (commands) =>
      commands.map(([cmd, key, ...args]) => {
        if (cmd === 'HGET') return hashes.get(key)?.get(args[0]) ?? null
        if (cmd === 'HGETALL') return [...(hashes.get(key)?.entries() ?? [])].flat()
        if (cmd === 'GET') return strings.get(key) ?? null
        if (cmd === 'SET') {
          if (args.includes('NX') && strings.has(key)) return null
          strings.set(key, args[0])
          return 'OK'
        }
        throw Error(cmd)
      }),
    redisEval: async (_script, keys, args) => {
      // Atomic Redis server-side compare-and-set, with competing readers before it.
      let hash = hashes.get(keys[0])
      if (!hash) hashes.set(keys[0], (hash = new Map()))
      if ((hash.get(args[0]) ?? '') !== args[1]) return 0
      hash.set(args[0], args[2])
      return 1
    },
  })
  function load(file) {
    const path = resolve(file)
    if (modules.has(path)) return modules.get(path)
    if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'))
    const exports = {}
    modules.set(path, exports)
    const code = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText
    const req = (id) => {
      if (!id.startsWith('.')) return createRequire(path)(id)
      const target = resolve(dirname(path), id)
      return load(existsSync(target) ? target : target + '.ts')
    }
    vm.runInContext(`(function(exports,require){${code}\n})`, context)(exports, req)
    Object.assign(context, exports)
    return exports
  }
  for (const f of [
    'shared/utils/sticker.ts',
    'shared/utils/continents.ts',
    'shared/utils/capitals.ts',
    'shared/utils/seasons.ts',
    'shared/utils/badges.ts',
    'shared/utils/economy.ts',
    'shared/utils/game-day.ts',
    'server/utils/economy-store.ts',
    'server/utils/economy.ts',
    'server/utils/daily-challenge.ts',
    'server/utils/daily-games.ts',
    ...extra,
  ])
    load(f)
  return { api: context, storage, hashes }
}
