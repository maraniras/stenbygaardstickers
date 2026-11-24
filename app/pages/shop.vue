<script setup lang="ts">
import { SHOP_PROFILE_FRAMES, type ProfileFrame } from '../../shared/utils/profile-frames'
import { SHOP_PROFILE_BANNERS, type ProfileBanner } from '../../shared/utils/profile-banners'
useHead({ title: 'Shop · Stenbygaard Stickers' })
const { name } = useUser()
const { state } = useEconomy()
const { inventory } = useProfileFrames()
const { inventory: bannerInventory } = useProfileBanners()
const section = ref('frames')
const sections = [
  { id: 'frames', name: 'Profilrammer', count: SHOP_PROFILE_FRAMES.length },
  { id: 'banners', name: 'Profilbannere', count: SHOP_PROFILE_BANNERS.length },
]
const selectedBanner = ref<ProfileBanner>()
const selected = ref<ProfileFrame>()
const preview = ref<HTMLDialogElement>()
function show(frame: ProfileFrame) {
  selectedBanner.value = undefined
  selected.value = frame
  preview.value?.showModal()
}
function showBanner(banner: ProfileBanner) {
  selected.value = undefined
  selectedBanner.value = banner
  preview.value?.showModal()
}
</script>

<template>
  <div class="shop-page">
    <PageHeader
      title="Shop"
      description="Brug dine bananer"
      ><template #actions
        ><BananaBalance
          v-if="state"
          :balance="state.wallet.balance" /></template
    ></PageHeader>
    <p class="preview-notice">
      <span>Forhåndsvisning</span> Shoppen åbner snart. Du kan prøve rammer og bannere her — køb er
      ikke åbnet endnu.
    </p>
    <nav
      class="shop-sections"
      aria-label="Shopsektioner"
    >
      <button
        v-for="item in sections"
        :key="item.id"
        type="button"
        :aria-pressed="section === item.id"
        @click="section = item.id"
      >
        {{ item.name }} <span>{{ item.count }}</span>
      </button>
    </nav>
    <section
      v-if="section === 'frames'"
      aria-labelledby="profile-frames-title"
    >
      <div class="section-title">
        <h2 id="profile-frames-title">Profilrammer</h2>
        <span>{{ SHOP_PROFILE_FRAMES.length }} rammer</span>
      </div>
      <div class="frames">
        <button
          v-for="frame in SHOP_PROFILE_FRAMES"
          :key="frame.id"
          class="frame-card"
          type="button"
          :aria-label="`Se ${frame.name} på dit profilbillede`"
          @click="show(frame)"
        >
          <ProfileFramePreview
            :frame="frame"
            :name="name"
          />
          <h3>{{ frame.name }}</h3>
          <span class="availability">{{
            inventory.owned.includes(frame.id) ? 'Ejet' : 'Kommer snart'
          }}</span>
          <span class="try-label">Se ramme ↗</span>
        </button>
      </div>
    </section>
    <section
      v-else
      aria-labelledby="profile-banners-title"
    >
      <div class="section-title">
        <h2 id="profile-banners-title">Profilbannere</h2>
        <span>{{ SHOP_PROFILE_BANNERS.length }} bannere</span>
      </div>
      <div class="frames">
        <button
          v-for="banner in SHOP_PROFILE_BANNERS"
          :key="banner.id"
          class="frame-card"
          type="button"
          :aria-label="`Se ${banner.name} på din profil`"
          @click="showBanner(banner)"
        >
          <span class="banner-artwork"
            ><ProfileBannerPreview
              :banner="banner"
              :name="name"
          /></span>
          <h3>{{ banner.name }}</h3>
          <span class="availability">{{
            bannerInventory.owned.includes(banner.id) ? 'Ejet' : 'Kommer snart'
          }}</span>
          <span class="try-label">Se banner ↗</span>
        </button>
      </div>
    </section>
    <dialog
      ref="preview"
      class="frame-dialog"
      aria-labelledby="frame-preview-title"
      @click="$event.target === preview && preview?.close()"
    >
      <template v-if="selected">
        <button
          class="close"
          type="button"
          aria-label="Luk forhåndsvisning"
          @click="preview?.close()"
        >
          ×
        </button>
        <ProfileFramePreview
          :frame="selected"
          :name="name"
        />
        <h2 id="frame-preview-title">{{ selected.name }}</h2>
        <p>{{ selected.description }}</p>
        <NuxtLink
          v-if="inventory.owned.includes(selected.id)"
          class="btn"
          to="/mig"
          @click="preview?.close()"
          >Vælg i indstillinger</NuxtLink
        >
        <button
          v-else
          class="btn"
          type="button"
          disabled
        >
          Køb åbner snart
        </button>
        <p class="small">
          {{
            inventory.owned.includes(selected.id)
              ? 'Du ejer allerede denne ramme.'
              : 'Pris kommer senere. Der trækkes ingen bananer.'
          }}
        </p>
      </template>
      <template v-else-if="selectedBanner">
        <button
          class="close"
          type="button"
          aria-label="Luk forhåndsvisning"
          @click="preview?.close()"
        >
          ×
        </button>
        <ProfileBannerPreview
          class="large-banner"
          :banner="selectedBanner"
          :name="name"
        />
        <h2 id="frame-preview-title">{{ selectedBanner.name }}</h2>
        <p>{{ selectedBanner.description }}</p>
        <NuxtLink
          v-if="bannerInventory.owned.includes(selectedBanner.id)"
          class="btn"
          to="/mig"
          @click="preview?.close()"
          >Vælg i indstillinger</NuxtLink
        >
        <button
          v-else
          class="btn"
          type="button"
          disabled
        >
          Køb åbner snart
        </button>
        <p class="small">
          {{
            bannerInventory.owned.includes(selectedBanner.id)
              ? 'Du ejer allerede dette banner.'
              : 'Pris kommer senere. Der trækkes ingen bananer.'
          }}
        </p>
      </template>
    </dialog>
  </div>
</template>

<style scoped>
.shop-page {
  max-width: 680px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 24px;
}
.preview-notice {
  padding: 16px;
  border-radius: 18px;
  background: var(--accent-soft);
  color: var(--muted);
  line-height: 1.6;
  font-size: 13px;
  margin-bottom: 24px;
}
.preview-notice span {
  display: block;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 3px;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.shop-sections {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0 6px;
  margin-bottom: 20px;
}
.shop-sections button {
  flex-shrink: 0;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  color: var(--text);
  background: var(--surface);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.shop-sections button[aria-pressed='true'] {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
}
.shop-sections button span {
  margin-left: 6px;
  opacity: 0.7;
}
.banner-artwork {
  display: flex;
  align-items: center;
  aspect-ratio: 1;
}
.large-banner {
  margin: 34px 0 20px;
}
.section-title h2 {
  font-size: 21px;
}
.section-title > span {
  color: var(--muted);
  font-size: 12px;
}
.frames {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.frame-card {
  min-width: 0;
  text-align: center;
  padding: 14px 12px;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.frame-card:hover {
  background: var(--surface-2);
}
.frame-card h3 {
  font-size: 16px;
  margin-top: 8px;
}
.availability {
  display: block;
  margin-top: 7px;
  color: var(--muted);
  font-size: 11px;
}
.try-label {
  display: inline-block;
  margin-top: 12px;
  font-size: 12px;
  font-weight: 700;
}
.frame-dialog {
  position: fixed;
  margin: auto;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid var(--hairline);
  border-radius: 26px;
  background: var(--surface);
  color: var(--text);
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.frame-dialog::backdrop {
  background: #080612a8;
  backdrop-filter: blur(5px);
}
.frame-dialog .frame-preview {
  width: min(240px, 100%);
  margin: 12px auto;
}
.frame-dialog h2 {
  font-size: 24px;
}
.frame-dialog p {
  color: var(--muted);
  line-height: 1.6;
  font-size: 14px;
  margin: 12px 0 20px;
}
.frame-dialog .small {
  font-size: 12px;
  margin-bottom: 0;
}
.frame-dialog .btn {
  width: 100%;
}
.close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: var(--text);
  background: var(--surface-2);
  font-size: 26px;
}
@media (min-width: 560px) {
  .frames {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
