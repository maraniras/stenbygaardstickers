<script setup lang="ts">
defineProps<{ shape: number }>()
</script>
<template>
  <svg
    class="sport-wrap"
    viewBox="0 0 140 110"
    fill="none"
    aria-hidden="true"
  >
    <g
      v-if="shape === 20"
      stroke-linejoin="round"
    >
      <g transform="rotate(12 40 55)">
        <path
          d="M28 7Q40 1 51 9L53 45L66 98Q43 109 12 98L24 45Z"
          fill="var(--paper)"
          stroke="#fff7"
          stroke-width="2"
        />
        <path
          d="M29 14Q39 8 48 15L47 37Q39 43 29 36Z"
          fill="#0003"
          stroke="#fff5"
          stroke-width="2"
        />
        <path
          d="M30 49L23 92M42 49L47 94"
          stroke="#fff5"
          stroke-width="4"
        />
        <path
          d="M20 64L57 60M39 42L39 100"
          stroke="#f2d28b"
          stroke-width="8"
        />
        <path
          d="M17 98Q39 104 63 98"
          stroke="#0003"
          stroke-width="4"
        />
      </g>
      <g transform="rotate(-12 101 55)">
        <path
          d="M89 7Q101 1 112 9L114 45L127 98Q104 109 73 98L85 45Z"
          fill="var(--paper)"
          stroke="#fff7"
          stroke-width="2"
        />
        <path
          d="M90 14Q100 8 109 15L108 37Q100 43 90 36Z"
          fill="#0003"
          stroke="#fff5"
          stroke-width="2"
        />
        <path
          d="M91 49L84 92M103 49L108 94"
          stroke="#fff5"
          stroke-width="4"
        />
        <path
          d="M81 64L118 60M100 42L100 100"
          stroke="#f2d28b"
          stroke-width="8"
        />
        <path
          d="M78 98Q100 104 124 98"
          stroke="#0003"
          stroke-width="4"
        />
      </g>
    </g>
    <g
      v-else-if="shape === 21"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M111 83H120Q132 83 132 69V13H119"
        stroke="#0004"
        stroke-width="16"
      />
      <path
        d="M111 80H120Q129 80 129 67V11H119"
        stroke="var(--paper)"
        stroke-width="12"
      />
      <path
        d="M123 25H135M123 46H135"
        stroke="#f2d28b"
        stroke-width="6"
      />
      <path
        d="M7 42Q21 21 49 35L61 37Q91 22 112 43L110 71Q91 91 67 75L59 66L51 75Q24 91 9 71Z"
        fill="var(--paper)"
        stroke="#fff7"
        stroke-width="3"
      />
      <path
        d="M18 44Q32 34 49 43L49 64Q30 79 19 65ZM69 44Q87 34 103 45L101 65Q86 78 70 65Z"
        fill="#ffffff28"
        stroke="#0003"
        stroke-width="3"
      />
      <path
        d="M13 55H110M59 36V75"
        stroke="#f2d28b"
        stroke-width="7"
      />
      <path
        d="M24 42L43 66M77 43L96 67"
        stroke="#fff5"
        stroke-width="3"
        stroke-dasharray="5 5"
      />
    </g>
    <g v-else-if="shape === 22">
      <circle
        cx="70"
        cy="55"
        r="49"
        fill="var(--paper)"
        stroke="#fff7"
        stroke-width="2"
      />
      <circle
        cx="70"
        cy="55"
        r="42"
        stroke="#0003"
        stroke-width="5"
      />
      <circle
        cx="70"
        cy="55"
        r="47"
        stroke="#ffffff60"
        stroke-width="3"
        stroke-dasharray="4 5"
      />
      <path
        d="M70 14V96M29 55H111M41 26L99 84M41 84L99 26"
        stroke="#fff7"
        stroke-width="2"
      />
      <path
        d="M70 7V103M21 55H119"
        stroke="#f2d28b"
        stroke-width="9"
      />
      <circle
        cx="70"
        cy="55"
        r="9"
        fill="var(--paper)"
        stroke="#f2d28b"
        stroke-width="3"
      />
      <path
        d="M40 26L50 33M90 77L102 84"
        stroke="#ffffff70"
        stroke-width="6"
      />
    </g>
    <g
      v-else-if="shape === 23"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M39 70L57 101L78 100L107 68"
        stroke="#0004"
        stroke-width="10"
      />
      <path
        d="M39 70L57 101L78 100L107 68"
        stroke="var(--paper)"
        stroke-width="6"
      />
      <path
        d="M9 68Q11 16 60 9Q107 2 130 54L118 69L78 82L33 79Z"
        fill="var(--paper)"
        stroke="#fff7"
        stroke-width="2"
      />
      <path
        d="M29 52Q35 28 52 24M60 46Q65 22 78 20M88 45Q89 26 99 26"
        stroke="#0004"
        stroke-width="9"
      />
      <path
        d="M37 14L54 78M82 11L96 75M13 59L126 56"
        stroke="#f2d28b"
        stroke-width="8"
      />
      <path
        d="M15 70L48 76L80 76L117 65"
        stroke="#ffffff60"
        stroke-width="3"
      />
      <rect
        x="60"
        y="94"
        width="17"
        height="12"
        rx="3"
        fill="#f2d28b"
      />
    </g>
    <g
      v-else-if="shape === 24"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M15 45L4 23L24 26M125 45L136 23L115 26"
        stroke="#0004"
        stroke-width="11"
      />
      <path
        d="M15 43L4 21L24 24M125 43L136 21L115 24"
        stroke="var(--paper)"
        stroke-width="8"
      />
      <path
        d="M8 39Q70 18 132 39L120 79Q94 95 77 72L70 61L63 72Q45 95 20 79Z"
        fill="var(--paper)"
        stroke="#fff7"
        stroke-width="3"
      />
      <path
        d="M19 43Q69 27 121 43L112 72Q92 83 77 58H63Q48 83 28 72Z"
        fill="#ffffff22"
        stroke="#0003"
        stroke-width="3"
      />
      <path
        d="M36 34L44 81M96 34L88 81M13 53L127 53"
        stroke="#f2d28b"
        stroke-width="7"
      />
      <path
        d="M54 39L30 65M111 43L91 65"
        stroke="#fff6"
        stroke-width="3"
        stroke-dasharray="5 4"
      />
    </g>
    <g
      v-else-if="shape === 25"
      stroke-linejoin="round"
    >
      <path
        d="M5 54L23 47L41 20Q68 11 91 23L111 46L132 54L135 85H5Z"
        fill="var(--paper)"
        stroke="#fff7"
        stroke-width="2"
      />
      <path
        d="M31 45L47 26H67V45ZM75 26L88 29L102 45H75Z"
        fill="#ffffff25"
        stroke="#0003"
        stroke-width="3"
      />
      <path
        d="M7 63H132M66 18V86"
        stroke="#f2d28b"
        stroke-width="9"
      />
      <path
        d="M11 54H23M118 54H129"
        stroke="#ffffff70"
        stroke-width="6"
      />
      <circle
        cx="33"
        cy="83"
        r="18"
        fill="var(--paper)"
        stroke="#0004"
        stroke-width="5"
      />
      <circle
        cx="107"
        cy="83"
        r="18"
        fill="var(--paper)"
        stroke="#0004"
        stroke-width="5"
      />
      <path
        d="M20 83H46M33 70V96M94 83H120M107 70V96"
        stroke="#f2d28b"
        stroke-width="6"
      />
      <path
        d="M7 91H15M51 91H88M126 91H135"
        stroke="#fff5"
        stroke-width="3"
      />
    </g>
  </svg>
</template>
<style scoped>
.sport-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 5px 4px #0003);
}
</style>
