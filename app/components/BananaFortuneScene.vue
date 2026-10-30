<script setup lang="ts">
const props = defineProps<{ level: number, count: number }>()
const id = useId()
const cargo = computed(() => Array.from({ length: Math.ceil(props.count / (props.level === 8 ? 2 : 3)) }, (_, i) => i))
</script>
<template>
  <svg viewBox="0 0 400 200" class="fortune-scene" aria-hidden="true">
    <defs>
      <linearGradient :id="`${id}-sky`" x2="0" y2="1"><stop stop-color="#23263e"/><stop offset="1" stop-color="#54415c"/></linearGradient>
      <linearGradient :id="`${id}-gold`" x2=".8" y2="1"><stop stop-color="#fff1ae"/><stop offset=".45" stop-color="#d3aa55"/><stop offset="1" stop-color="#8e612e"/></linearGradient>
      <linearGradient :id="`${id}-steel`" x2="1" y2=".6"><stop stop-color="#b7bfcb"/><stop offset=".45" stop-color="#626c83"/><stop offset="1" stop-color="#343b52"/></linearGradient>
      <radialGradient :id="`${id}-space`"><stop stop-color="#593875"/><stop offset="1" stop-color="#15172e"/></radialGradient>
      <radialGradient :id="`${id}-planet`" cx=".3" cy=".25" r=".8"><stop stop-color="#fff3b4"/><stop offset=".5" stop-color="#eecb66"/><stop offset=".85" stop-color="#be893b"/><stop offset="1" stop-color="#64412d"/></radialGradient>
      <radialGradient :id="`${id}-light`"><stop stop-color="#ffe4a4" stop-opacity=".25"/><stop offset="1" stop-color="#ffe4a4" stop-opacity="0"/></radialGradient>
    </defs>

    <!-- A cargo terminal and a ship full of bananas, not another room of crates. -->
    <g v-if="level === 7">
      <path d="M0 0H400V200H0Z" :fill="`url(#${id}-sky)`"/>
      <circle cx="63" cy="39" r="20" fill="#edc991" opacity=".5"/><path d="M14 63H93M105 43H174M233 58H294" stroke="#d1c4ce24" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 146H400V200H0Z" fill="#243c51"/><path d="M0 163H79M311 161H400M15 185H123M272 187H394M151 178H234" stroke="#839b9e40" stroke-width="2"/>
      <path d="M330 148V25H359V148M307 27H377M320 25 266 5H230V12H266L333 37M344 27V142" fill="none" stroke="#c9a369" stroke-width="5"/>
      <path d="M245 12V71M239 72V80Q245 88 251 80" fill="none" stroke="#e8d3a6" stroke-width="2"/>
      <image href="/badges/banana-baron.webp" x="232" y="78" width="30" height="30" transform="rotate(-12 247 93)"/>
      <path d="M31 141H343L313 174H83L48 156Z" fill="#475b6b"/><path d="M48 151H333L325 160H59Z" fill="#d3b26d"/><path d="M85 174H313" stroke="#131c30" stroke-width="4"/>
      <path d="M272 104H310V141H272Z" fill="#c7c5b6"/><path d="M269 104H314V110H269Z" fill="#e5ddc3"/><path d="M280 115H290V125H280ZM295 115H305V125H295Z" fill="#384a63"/><path d="M287 103V83M281 83H294" stroke="#b2b7b4" stroke-width="3"/>
      <path d="M64 103H259V140H64Z" fill="#355d62" stroke="#91a09b" stroke-width="2"/><path d="M73 110H249V134H73Z" fill="#152b39"/>
      <image v-for="i in cargo" :key="i" href="/badges/banana-baron.webp" :x="76 + (i % 12) * 14" :y="115 - Math.floor(i / 12) * 16" width="26" height="26" :transform="`rotate(${i % 2 ? 12 : -15},${89 + (i % 12) * 14},${128 - Math.floor(i / 12) * 16})`"/>
      <path d="M80 135H247" stroke="#a1aa90" stroke-width="3"/><path d="M95 146H124M138 146H167M181 146H210" stroke="#27364b" stroke-width="3"/>
      <path d="M344 148H400V156H337Z" fill="#908674"/><path d="M362 156V181M390 156V181" stroke="#66606a" stroke-width="6"/>
      <text x="220" y="165" fill="#f0dfb8" font-size="6" font-family="inherit" font-weight="700" letter-spacing="2">EMIL EXPORT</text>
    </g>

    <!-- A walk-in vault with a heavy, open door and its own banana reserve. -->
    <g v-else-if="level === 8">
      <path d="M0 0H400V200H0Z" fill="#292939"/><path d="M0 160 200 130 400 160V200H0Z" fill="#3b3540"/>
      <path d="M0 180H400M80 200 130 150M320 200 270 150" stroke="#80706340" fill="none"/>
      <rect x="39" y="18" width="267" height="153" rx="12" :fill="`url(#${id}-steel)`"/><rect x="51" y="29" width="243" height="132" rx="7" fill="#c6a76a"/><rect x="60" y="38" width="225" height="115" rx="4" fill="#181b2a"/>
      <ellipse cx="172" cy="99" rx="117" ry="71" :fill="`url(#${id}-light)`"/>
      <path d="M69 54H276M69 77H276" stroke="#80725538"/><path d="M79 147H264" stroke="#dfbd76" stroke-width="5"/>
      <image v-for="i in cargo" :key="i" href="/badges/banana-baron.webp" :x="74 + (i % 12) * 15" :y="121 - Math.floor(i / 12) * 19" width="29" height="29" :transform="`rotate(${i % 3 * 12 - 12},${88 + (i % 12) * 15},${135 - Math.floor(i / 12) * 19})`"/>
      <rect x="47" y="43" width="17" height="21" rx="3" fill="#e4d1a3"/><rect x="47" y="125" width="17" height="21" rx="3" fill="#e4d1a3"/>
      <ellipse cx="311" cy="99" rx="51" ry="80" fill="#222739" stroke="#bfa274" stroke-width="5"/><ellipse cx="317" cy="96" rx="43" ry="71" :fill="`url(#${id}-steel)`" stroke="#e1d7b8" stroke-width="2"/>
      <ellipse cx="317" cy="96" rx="31" ry="54" fill="none" stroke="#c8b885" stroke-width="2" stroke-dasharray="2 10"/>
      <path d="M317 68V122M295 96H339M301 77 333 115M301 115 333 77" stroke="#e5c98a" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="317" cy="96" rx="13" ry="19" fill="#444253" stroke="#e8cb83" stroke-width="3"/><image href="/marker.png" x="306" y="82" width="22" height="27"/>
      <path d="M64 174H112V186H64ZM70 162H106V174H70Z" :fill="`url(#${id}-gold)`"/><path d="M77 163 84 172M93 163 99 172" stroke="#fff0b8" opacity=".6"/>
      <text x="173" y="13" text-anchor="middle" fill="#d7be8a" font-size="6" font-family="inherit" letter-spacing="3">BANANA RESERVE</text>
    </g>

    <!-- A full industrial facility, silos and two banana conveyor belts. -->
    <g v-else-if="level === 9">
      <path d="M0 0H400V200H0Z" :fill="`url(#${id}-sky)`"/><path d="M0 163H400V200H0Z" fill="#343143"/>
      <path d="M72 88V57H94V88M111 72V37H131V72" fill="#756978"/><path d="M70 57H97M109 37H133" stroke="#c2a98b" stroke-width="4"/>
      <g fill="#c9b9c2" opacity=".16"><ellipse cx="121" cy="23" rx="14" ry="8"/><ellipse cx="140" cy="13" rx="21" ry="10"/><ellipse cx="80" cy="43" rx="12" ry="7"/></g>
      <path d="M48 89 87 66V89L126 66V89L165 66V89H239V155H48Z" fill="#75717a" stroke="#b5a18a" stroke-width="2"/>
      <path d="M57 102H84V120H57ZM95 102H122V120H95ZM133 102H160V120H133Z" fill="#dac98c"/>
      <path d="M70 103V119M108 103V119M146 103V119" stroke="#55566a" stroke-width="2"/>
      <path d="M177 105H225V155H177Z" fill="#252d40"/>
      <path d="M274 58V144Q292 158 310 144V58Z" :fill="`url(#${id}-steel)`"/><ellipse cx="292" cy="58" rx="18" ry="8" fill="#c3c6c3"/><path d="M292 50V35H267V43" fill="none" stroke="#b2b6bc" stroke-width="7"/>
      <path d="M326 83V150Q340 162 354 150V83Z" :fill="`url(#${id}-gold)`"/><ellipse cx="340" cy="83" rx="14" ry="6" fill="#efd39b"/>
      <image href="/badges/banana-baron.webp" x="278" y="77" width="28" height="28"/><path d="M281 119H303M281 126H303M331 124H349" stroke="#dad4b480" stroke-width="2"/>
      <rect x="20" y="150" width="360" height="18" rx="9" fill="#182032" stroke="#ba9a65" stroke-width="3"/>
      <circle v-for="n in 18" :key="n" :cx="23 + n * 18" cy="159" r="4" fill="#657183"/>
      <path d="M44 170V190M356 170V190M110 170V190M290 170V190" stroke="#6e6876" stroke-width="5"/>
      <image v-for="i in cargo" :key="i" href="/badges/banana-baron.webp" :x="24 + (i % 18) * 19" :y="127 - Math.floor(i / 18) * 16" width="25" height="25" :transform="`rotate(${i % 2 ? 9 : -12},${36 + (i % 18) * 19},${139 - Math.floor(i / 18) * 16})`"/>
      <rect x="163" y="79" width="79" height="19" rx="3" fill="#d1b674"/><text x="202" y="91" text-anchor="middle" fill="#4a3940" font-size="7" font-family="inherit" font-weight="800" letter-spacing="1">EMIL INDUSTRIES</text>
      <path d="M11 189H387" stroke="#b4a28230" stroke-width="2"/>
    </g>

    <!-- At a quarter million, ordinary storage has left the solar system. -->
    <g v-else>
      <path d="M0 0H400V200H0Z" :fill="`url(#${id}-space)`"/>
      <circle v-for="n in 38" :key="n" :cx="(n * 73) % 393 + 3" :cy="(n * 47) % 187 + 5" :r="n % 3 === 0 ? 1.3 : .65" fill="#f7e5c4" :opacity=".25 + (n % 4) * .15"/>
      <ellipse cx="202" cy="105" rx="153" ry="29" transform="rotate(-15 202 105)" fill="none" stroke="#c5a465" stroke-width="7" opacity=".6"/>
      <circle cx="202" cy="103" r="74" :fill="`url(#${id}-planet)`"/><circle cx="202" cy="103" r="78" fill="none" stroke="#ffe7a3" stroke-width="1" opacity=".17"/>
      <path d="M154 52Q172 32 194 38L184 58 168 65 177 85 158 97 147 81ZM232 66 250 74 260 95 245 109 229 94 216 100 209 81ZM184 111 204 103 221 118 215 141 199 153 178 137Z" fill="#96763e" opacity=".26"/>
      <g fill="#f7dda2" stroke="#8f713c" stroke-width="1"><path d="M153 48V21H165V44M168 42V9H180V39M183 39V19H195V37M209 38V13H220V41M226 43V25H237V49Z"/><path d="M167 9 174 1 181 9M209 13 215 5 221 13"/></g>
      <path d="M157 25V36M173 15V33M188 22V32M214 17V31M231 29V39" stroke="#6c5970" stroke-width="3" stroke-dasharray="2 3"/>
      <image v-for="i in Math.ceil(count / 5)" :key="i" href="/badges/banana-baron.webp" :x="146 + ((i * 31) % 91)" :y="54 + ((i * 23) % 80)" width="23" height="23" :transform="`rotate(${(i * 37) % 100 - 50},${157 + ((i * 31) % 91)},${65 + ((i * 23) % 80)})`"/>
      <path d="M55 137Q103 165 216 131T350 68" fill="none" stroke="#f6d785" stroke-width="8" stroke-linecap="round"/><path d="M55 137Q103 165 216 131T350 68" fill="none" stroke="#fff3c4" stroke-width="1.5" opacity=".7"/>
      <path d="M250 63V23" stroke="#fff1bb" stroke-width="2"/><path d="M251 23 279 28 276 46 251 41Z" fill="#9a78b6" stroke="#ccb0dd" stroke-width="1"/><image href="/marker.png" x="257" y="27" width="15" height="17"/>
      <g transform="translate(40 59) rotate(-26)"><path d="M0 33-7 45H7Z" fill="#efa55f"/><path d="M-4 36 0 53 4 36Z" fill="#ffe2a1"/><path d="M-9 24-17 35-6 32M9 24 17 35 6 32" fill="#a18bb3"/><path d="M-7 31V11Q-6 1 0-6 6 1 7 11V31Z" fill="#e6d9b9" stroke="#ae9669"/><circle cy="11" r="4" fill="#504368"/><image href="/badges/banana-baron.webp" x="-5" y="19" width="10" height="10"/></g>
      <circle cx="342" cy="38" r="19" fill="#82708f" stroke="#c8aeac" stroke-width="1"/><image href="/marker.png" x="327" y="19" width="31" height="37"/>
      <path d="M303 175H374" stroke="#d0b783" stroke-width="1"/><text x="338" y="187" fill="#d8c29e" text-anchor="middle" font-size="6" font-family="inherit" letter-spacing="2">EMIL-01</text>
      <path d="M79 169H115M97 151V187" stroke="#e7cc90" stroke-width="1" opacity=".5"/>
    </g>
  </svg>
</template>
<style scoped>
.fortune-scene { display:block; width:100%; height:auto; }
</style>
