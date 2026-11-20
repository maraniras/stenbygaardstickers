<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404 })
useHead({ title: 'Nye gaveindpakninger · Preview' })
const names = [
  'Svømmefødder',
  'Snorkel og briller',
  'Cykelhjul',
  'Cykelhjelm',
  'Oakley-inspirerede løbesolbriller',
  'Bil',
]
</script>
<template>
  <div class="page">
    <PageHeader
      title="Nye indpakninger"
      back-to="/spil/pakkeleg?preview=1&steal=1"
      back-label="Tilbage til testbordet"
    />
    <p>Seks nye former · nu 26 forskellige indpakninger. Indholdet er stadig hemmeligt.</p>
    <div class="wrapping-grid">
      <article
        v-for="(name, i) in names"
        :key="name"
      >
        <div class="art">
          <ParcelPresent
            :style-index="20 + i"
            :label="`#${21 + i}`"
          />
        </div>
        <h2>{{ name }}</h2>
      </article>
    </div>
  </div>
</template>
<style scoped>
.wrapping-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 24px 0;
}
article {
  display: grid;
  align-content: start;
  padding: 20px 10px;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: var(--surface);
  text-align: center;
}
.art {
  display: grid;
  place-items: center;
  min-height: 145px;
}
h2 {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.5;
}
@media (max-width: 540px) {
  .wrapping-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
