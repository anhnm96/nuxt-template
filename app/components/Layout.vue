<script setup lang="ts">
const theme = {
  light: {
    id: 'morning',
    orbs: [
      'radial-gradient(circle, rgba(251,146,60,0.32), rgba(249,115,22,0.18))',
      'radial-gradient(circle, rgba(234,88,12,0.20), transparent)',
      'radial-gradient(circle, rgba(253,186,116,0.25), transparent)',
    ],
    bg: 'linear-gradient(135deg, #fffbf7 0%, #fff5ee 40%, #ffe4cc 70%, #ffcba4 100%)',
  },
  dark: {
    id: 'evening',
    orbs: [
      'radial-gradient(circle, #1d4ed8, #0ea5e9)',
      'radial-gradient(circle, #0f766e, #06b6d4)',
      'radial-gradient(circle, #1e40af, #6366f1)',
    ],
    bg: 'radial-gradient(ellipse 80% 60% at 70% 50%, #0f172a 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 20% 80%, #1e3a5f 0%, transparent 60%), linear-gradient(135deg, #060d1a 0%, #0d1f3c 40%, #0a2540 70%, #061220 100%)',
  },
}

const t = theme.dark

const stars = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  delay: Math.random() * 4,
  duration: Math.random() * 3 + 2,
}))
</script>

<template>
  <div class="bg-scene">
    <div class="gradient" :style="{ background: t.bg }" />
    <div
      v-for="(orb, i) in t.orbs" :key="`orb-${i}`"
      class="bg-orb" :class="`orb-${i + 1}`"
      :style="{ background: orb }"
    />
    <div v-if="t.id === 'evening'" class="stars-container">
      <div
        v-for="star in stars" :key="`star-${star.id}`" class="star"
        :style="{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, animationDuration: `${star.duration}s`, animationDelay: `${star.delay}s` }"
      />
    </div>
    <div v-if="t.id === 'morning'" class="clouds-container">
      <div
        v-for="i in 3" :key="`cloud-${i}`" class="cloud"
        :style="{ top: `${15 + (i - 1) * 25}%`, width: `${180 + (i - 1) * 40}px`, height: `${40 + (i - 1) * 10}px`, opacity: 0.02 + (i - 1) * 0.01, animationDuration: `${30 + (i - 1) * 10}s`, animationDelay: `${(i - 1) * 5}s` }"
      />
    </div>
  </div>
</template>

<style>
.bg-scene  { position:fixed; inset:0; z-index:0; pointer-events:none; }
.bg-gradient { position:absolute; inset:0; transition:background 1.2s cubic-bezier(0.4,0,0.2,1); }

.gradient {
  background: radial-gradient(80% 60% at 70% 50%, rgb(15, 23, 42) 0%, transparent 70%), radial-gradient(50% 80% at 20% 80%, rgb(30, 58, 95) 0%, transparent 60%), linear-gradient(135deg, rgb(6, 13, 26) 0%, rgb(13, 31, 60) 40%, rgb(10, 37, 64) 70%, rgb(6, 18, 32) 100%);
}
.bg-orb { position:absolute; border-radius:50%; filter:blur(80px); opacity:0.35; animation:floatOrb 12s ease-in-out infinite; }
.orb-1 { width:600px; height:600px; top:-150px; right:-100px; animation-delay:0s; }
.orb-2 { width:400px; height:400px; bottom:-80px; left:30%; animation-delay:-4s; }
.orb-3 { width:300px; height:300px; top:40%; left:10%; animation-delay:-8s; }
.stars-container { position:absolute; inset:0; overflow:hidden; }
.star   { position:absolute; border-radius:50%; background:white; animation:twinkle ease-in-out infinite; }
.sun-rays { position:absolute; top:-200px; right:-100px; width:600px; height:600px; background:radial-gradient(circle,rgba(250,204,21,0.08) 0%,transparent 70%); animation:pulseSun 6s ease-in-out infinite; }
.clouds-container { position:absolute; inset:0; overflow:hidden; pointer-events:none; }

@keyframes floatOrb   { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,30px) scale(0.95)} }
@keyframes twinkle    { 0%,100%{opacity:0.2} 50%{opacity:1} }
@keyframes pulseSun   { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.15);opacity:1} }
</style>
