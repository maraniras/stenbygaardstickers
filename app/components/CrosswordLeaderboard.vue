<script setup lang="ts">
import type { CrosswordLeaderboard } from '../../shared/types/crossword'
const props = defineProps<{ preview: boolean }>()
const emit = defineEmits<{ close: [] }>()
const liveData = ref<CrosswordLeaderboard | null>(null)
const example = ref(false)
const data = computed<CrosswordLeaderboard | null>(() => {
  const live = liveData.value
  if (!props.preview || !example.value || !live) return live
  const samples = [
    { name: 'Mathias', words: 0.62, letters: 0.76 },
    { name: 'Nicole', words: 0.47, letters: 0.65 },
    { name: 'Norsk', words: 0.24, letters: 0.39 },
    { name: null, words: 0.08, letters: 0.17 },
  ]
  return {
    ...live,
    mode: 'correct',
    players: samples.map((sample, i) => ({
      id: `example-${i}`,
      name: sample.name,
      label: sample.name || 'Anonym 1',
      words: Math.round(live.totalWords * sample.words),
      letters: Math.round(live.totalLetters * sample.letters),
      completed: false,
      winner: false,
    })),
  }
})
const pending = ref(true)
const error = ref('')
const { isMe } = useUser()
let alive = true
let timer: ReturnType<typeof setInterval> | undefined
let request: Promise<void> | undefined
function load() {
  if (request) return request
  request = (async () => {
    try {
      const result = await $fetch<CrosswordLeaderboard>('/api/games/crossword/leaderboard', {
        query: props.preview ? { preview: '1' } : {},
        timeout: 10000,
        retry: 0,
      })
      if (alive) {
        liveData.value = result
        error.value = ''
      }
    } catch (err: any) {
      if (alive) error.value = err?.data?.statusMessage || 'Kunne ikke hente ranglisten.'
    } finally {
      if (alive) pending.value = false
      request = undefined
    }
  })()
  return request
}
onMounted(() => {
  void load()
  timer = setInterval(() => {
    if (!document.hidden) void load()
  }, 15000)
})
onBeforeUnmount(() => {
  alive = false
  clearInterval(timer)
})
</script>
<template>
  <AppDialog
    label="Krydsordets rangliste"
    @close="emit('close')"
  >
    <section class="crossword-leaderboard">
      <header>
        <div>
          <span class="eyebrow">KRYDS &amp; TVÆRS #1</span>
          <h2>Rangliste</h2>
        </div>
        <button
          type="button"
          class="close"
          aria-label="Luk ranglisten"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div
        v-if="preview && liveData"
        class="preview-example"
      >
        <button
          type="button"
          @click="example = !example"
        >
          {{ example ? 'Vis faktiske deltagere' : 'Eksempel efter dagligt tjek' }}
        </button>
        <strong v-if="example">Eksempel · fiktive tal</strong>
      </div>
      <p
        v-if="pending"
        role="status"
        class="message"
      >
        Henter ranglisten…
      </p>
      <p
        v-if="error"
        role="alert"
        class="message"
      >
        {{ error }}
        <button
          type="button"
          class="retry"
          @click="load"
        >
          Prøv igen
        </button>
      </p>
      <template v-if="data">
        <p class="totals">
          {{ data.players.length }} {{ data.players.length === 1 ? 'deltager' : 'deltagere' }} ·
          {{ data.totalWords }} ord · {{ data.totalLetters }} bogstavfelter
        </p>
        <p
          v-if="!data.players.length"
          class="message"
        >
          Ingen er begyndt endnu. Du kommer med, når du udfylder det første bogstav.
        </p>
        <table v-else>
          <caption>
            {{
              data.mode === 'correct' ? 'Rigtige ord og bogstaver' : 'Udfyldte ord og bogstaver'
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Spiller</th>
              <th scope="col">Ord</th>
              <th scope="col">Bogstaver</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(player, index) in data.players"
              :key="player.id"
              :class="{ mine: player.name && isMe(player.name) }"
            >
              <td class="position">{{ index + 1 }}</td>
              <td>
                <div class="person">
                  <UserAvatar
                    v-if="player.name"
                    :name="player.name"
                    class="avatar"
                  />
                  <span
                    v-else
                    class="avatar anonymous"
                    aria-hidden="true"
                    >?</span
                  >
                  <div class="person-name">
                    <strong>{{ player.label }}</strong
                    ><small
                      v-if="player.completed"
                      class="completed"
                      >{{ player.winner ? 'Vinder' : 'Løst' }}</small
                    ><small v-else-if="player.name && isMe(player.name)">Dig</small>
                  </div>
                </div>
              </td>
              <td class="number">
                <b>{{ player.words }}</b
                ><span>/{{ data.totalWords }}</span>
              </td>
              <td class="number">
                <b>{{ player.letters }}</b
                ><span>/{{ data.totalLetters }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="explanation">
          {{
            data.mode === 'correct'
              ? 'Viser rigtige svar fra dagens gennemgang kl. 04. Nye rettelser vurderes ved næste daglige tjek.'
              : 'Viser udfyldte ord og bogstaver — ikke nødvendigvis rigtige svar. Rigtige svar vises, når hjælpen starter.'
          }}
        </p>
      </template>
    </section>
  </AppDialog>
</template>
<style scoped>
.crossword-leaderboard {
  padding: 20px 16px;
}
.preview-example {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  font-size: 10px;
}
.preview-example button {
  padding: 7px 10px;
  border: 1px solid var(--hairline);
  border-radius: 9px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
}
.preview-example strong {
  color: var(--muted);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.12em;
  font-weight: 800;
  color: var(--muted);
}
h2 {
  margin: 5px 0 0;
  font-size: 25px;
  color: var(--title);
}
.close {
  flex: none;
  width: 40px;
  height: 40px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  color: var(--text);
  background: var(--surface-2);
  font-size: 26px;
}
.totals {
  margin: 18px 0 12px;
  color: var(--muted);
  font-size: 11px;
}
.message {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 20px 0;
}
.retry {
  border: 0;
  padding: 4px;
  color: var(--text);
  background: transparent;
  font: inherit;
  text-decoration: underline;
}
table {
  border-collapse: collapse;
  width: 100%;
  table-layout: fixed;
}
caption {
  text-align: left;
  font-size: 11px;
  padding-bottom: 8px;
  color: var(--muted);
}
th {
  text-align: left;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  padding: 8px 4px;
}
th:first-child {
  width: 26px;
}
th:nth-child(3) {
  width: 66px;
}
th:nth-child(4) {
  width: 82px;
}
th:nth-child(n + 3) {
  text-align: right;
}
td {
  padding: 12px 4px;
  border-top: 1px solid var(--hairline);
}
.position {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.person {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
}
.person-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.person-name strong {
  display: block;
  font-size: 12px;
}
.person-name small {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  color: var(--muted);
}
.person-name .completed {
  color: light-dark(#287343, #95d7ac);
  font-weight: 800;
}
.number {
  text-align: right;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.number span {
  font-size: 10px;
  color: var(--muted);
}
.mine {
  background: var(--accent-soft);
}
.explanation {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}
</style>
