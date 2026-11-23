import type { Ref } from 'vue'

// Keep server state current, but reveal money only alongside its visible result.
// Set pending before sending the action, and clear it when the result is on screen.
export function usePresentedBalance(
  source: Ref<number | undefined>,
  pending: Ref<boolean>,
  identity: Ref<string>,
) {
  const shown = ref(source.value)
  let owner = identity.value
  watch(
    [identity, source, pending],
    ([currentOwner, balance, waiting]) => {
      if (currentOwner !== owner || !waiting) shown.value = balance
      owner = currentOwner
    },
    { flush: 'sync' },
  )
  return readonly(shown)
}
