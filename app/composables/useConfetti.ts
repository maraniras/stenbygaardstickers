// Konfetti (canvas-confetti, hentes først når den skal bruges)
export async function shootConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const colors = ['#ffc928', '#ff5a36', '#3f8cff', '#2bb673', '#b48cff']
  const base = { colors, zIndex: 1300, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 45, origin: { y: 0.65 } })
  // To salver fra siderne bagefter
  setTimeout(() => {
    confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } })
    confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } })
  }, 250)
}
