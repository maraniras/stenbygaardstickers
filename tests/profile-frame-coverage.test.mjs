import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

test('every photo ellipse covers the entire transparent opening without spilling beyond the frame', async () => {
  const { api: a } = setup(false, ['shared/utils/profile-frames.ts'])
  for (const frame of [
    ...a.SHOP_PROFILE_FRAMES,
    a.profileFrame('parcel-2026'),
    a.profileFrame('doomsday-winner'),
    a.profileFrame('original-winner'),
    a.profileFrame('crossword-2-winner'),
  ]) {
    const { data, info } = await sharp('public' + frame.image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info
    const opening = new Uint8Array(width * height)
    const queue = [Math.floor(height / 2) * width + Math.floor(width / 2)]
    assert.ok(data[queue[0] * channels + 3] < 230, frame.id + ' has an open center')
    opening[queue[0]] = 1
    for (let i = 0; i < queue.length; i++) {
      const pixel = queue[i],
        x = pixel % width,
        y = Math.floor(pixel / width)
      for (const next of [
        x ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ]) {
        if (next < 0 || opening[next] || data[next * channels + 3] >= 230) continue
        opening[next] = 1
        queue.push(next)
      }
    }
    const p = frame.portrait
    const cx = ((p.left + p.width / 2) * width) / 100
    const cy = ((p.top + p.height / 2) * height) / 100
    const rx = (p.width * width) / 200,
      ry = (p.height * height) / 200
    const mask = p.mask
      ? await sharp(
          Buffer.from(
            readFileSync('public' + p.mask, 'utf8').replace(
              /viewBox="[^"]+"/,
              `viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"`,
            ),
          ),
        )
          .ensureAlpha()
          .raw()
          .toBuffer()
      : null
    const covered = (pixel) =>
      Math.hypot(((pixel % width) - cx) / rx, (Math.floor(pixel / width) - cy) / ry) <= 1 &&
      (!mask || mask[pixel * 4 + 3] > 0)
    assert.ok(queue.every(covered), frame.id + ': no empty dark rim inside the opening')
    for (let pixel = 0; pixel < width * height; pixel++) {
      if (!opening[pixel] && data[pixel * channels + 3] < 230)
        assert.equal(covered(pixel), false, frame.id + ': photo stays beneath the artwork')
    }
    // The equipped frame is 144% of the avatar; its photo must follow the same ellipse.
    const avatarStyle = a.profileFramePortraitStyle(frame, 1.44)
    assert.ok(Math.abs((parseFloat(avatarStyle.left) + 22) / 1.44 - p.left) < 0.0001)
    assert.ok(Math.abs(parseFloat(avatarStyle.width) / 1.44 - p.width) < 0.0001)
  }
})
