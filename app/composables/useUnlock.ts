// Simpel kodelås i browseren. Den holder tilfældige besøgende ude, men data og
// billeder ligger stadig offentligt på serveren for den, der kender adresserne.
const CODE = 'emileric'
const KEY = 'stenbygaard-unlocked'

function read() {
  try { return localStorage.getItem(KEY) === CODE }
  catch { return false }
}

export function useUnlock() {
  const unlocked = useState('unlocked', read)

  function tryUnlock(input: string) {
    if (input.trim().toLowerCase() !== CODE) return false
    try { localStorage.setItem(KEY, CODE) }
    catch {}
    unlocked.value = true
    return true
  }

  return { unlocked, tryUnlock }
}
