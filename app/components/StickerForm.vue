<script setup lang="ts">
// Fælles felter til upload-siden og admin. Admin kan også rette by og land,
// som ellers findes automatisk ud fra koordinatet.
const draft = defineModel<StickerDraft>({ required: true })
const busy = defineModel<boolean>('busy', { default: false })
const props = defineProps<{ admin?: boolean; locate?: boolean; names: string[] }>()

const geocoding = ref(false)

// Dato fra det første billede med EXIF-dato – men kun ved upload, og kun hvis
// man ikke selv har rettet datoen
const dateTouched = ref(false)
const dateFromPhoto = ref(false)
function onPhotoDate(date: string) {
  if (props.admin || dateTouched.value || dateFromPhoto.value) return
  draft.value.date = date
  dateFromPhoto.value = true
}

if (props.admin) {
  let last = draft.value.location
  watch(
    () => draft.value.location,
    async (loc) => {
      if (!loc || (last && loc.lat === last.lat && loc.lng === last.lng)) return
      last = loc
      geocoding.value = true
      try {
        const place = await $fetch<{ city: string; country: string; countryCode: string }>(
          '/api/geocode',
          { query: loc },
        )
        if (place.city) Object.assign(draft.value, place)
      } catch {
      } finally {
        geocoding.value = false
      }
    },
  )
}
function editDate() {
  dateTouched.value = true
  dateFromPhoto.value = false
}
</script>

<template>
  <div class="form">
    <label class="field">
      <span class="eyebrow">Titel</span>
      <input
        v-model="draft.title"
        maxlength="80"
        placeholder="Fx Eiffeltårnet"
        autocapitalize="sentences"
      />
    </label>

    <div class="field">
      <span class="eyebrow">Hvor sidder den?</span>
      <LocationPicker
        v-model="draft.location"
        :locate="locate"
      />
    </div>

    <div
      v-if="admin"
      class="place"
    >
      <label class="field">
        <span class="eyebrow">By {{ geocoding ? '(finder…)' : '' }}</span>
        <input
          v-model="draft.city"
          maxlength="80"
        />
      </label>
      <label class="field">
        <span class="eyebrow">Land</span>
        <input
          v-model="draft.country"
          maxlength="80"
        />
      </label>
      <label class="field code">
        <span class="eyebrow">Kode</span>
        <input
          v-model="draft.countryCode"
          maxlength="2"
          autocapitalize="characters"
        />
      </label>
    </div>

    <div class="field">
      <span class="eyebrow">Sat op af</span>
      <NameInput
        v-model="draft.placedBy"
        :suggestions="names"
      />
    </div>

    <label class="field">
      <span class="eyebrow">Dato</span>
      <input
        v-model="draft.date"
        type="date"
        :max="today()"
        @input="editDate"
      />
      <span
        v-if="dateFromPhoto"
        class="hint-text"
        >📷 Hentet fra billedet – ret den, hvis den er forkert</span
      >
    </label>

    <label class="field">
      <span class="eyebrow">Beskrivelse</span>
      <textarea
        v-model="draft.description"
        maxlength="3000"
        placeholder="Hvad laver Emil her?"
      />
    </label>

    <div class="field">
      <span class="eyebrow">Billeder og video</span>
      <MediaEditor
        v-model="draft.media"
        v-model:busy="busy"
        @photo-date="onPhotoDate"
      />
      <p class="hint-text">
        Det første bliver forsidebillede. Tryk på stjernen for at vælge et andet.
      </p>
    </div>
  </div>
</template>

<style scoped>
.place {
  display: grid;
  grid-template-columns: 1fr 1fr 64px;
  gap: 8px;
}
.code input {
  text-transform: uppercase;
}
</style>
