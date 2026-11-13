import sharp from 'sharp'

/** Rebuild the same private view from cached Esri tiles when dynamic export is unavailable. */
export async function cityAerialTiles({ x, y, half }: { x: number; y: number; half: number }) {
  if (![x, y, half].every(Number.isFinite) || half <= 0) throw new Error('Invalid aerial bounds')
  const circumference = 2 * Math.PI * 6378137
  const resolution = (half * 2) / 700
  const zoom = Math.max(0, Math.min(19, Math.floor(Math.log2(circumference / 256 / resolution))))
  const count = 2 ** zoom
  const scale = (256 * count) / circumference
  const left = Math.floor((x + circumference / 2 - half) * scale)
  const top = Math.floor((circumference / 2 - y - half * 0.7) * scale)
  const right = Math.ceil((x + circumference / 2 + half) * scale)
  const bottom = Math.ceil((circumference / 2 - y + half * 0.7) * scale)
  const firstX = Math.floor(left / 256)
  const firstY = Math.floor(top / 256)
  const lastX = Math.floor((right - 1) / 256)
  const lastY = Math.floor((bottom - 1) / 256)
  if (firstY < 0 || lastY >= count || (lastX - firstX + 1) * (lastY - firstY + 1) > 12)
    throw new Error('Aerial tile bounds exceed limit')
  const requests: Promise<{ input: Buffer; left: number; top: number }>[] = []
  for (let row = firstY; row <= lastY; row++) {
    for (let col = firstX; col <= lastX; col++) {
      const wrappedCol = ((col % count) + count) % count
      requests.push(
        $fetch<ArrayBuffer>(
          `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${row}/${wrappedCol}`,
          { responseType: 'arrayBuffer', timeout: 8_000, retry: 0 },
        ).then((bytes) => ({
          input: Buffer.from(bytes),
          left: (col - firstX) * 256,
          top: (row - firstY) * 256,
        })),
      )
    }
  }
  const tiles = await Promise.all(requests)
  // Rasterize before cropping: composite positions refer to the full tile mosaic.
  const mosaic = await sharp({
    create: {
      width: (lastX - firstX + 1) * 256,
      height: (lastY - firstY + 1) * 256,
      channels: 3,
      background: '#172c38',
    },
  })
    .composite(tiles)
    .png()
    .toBuffer()
  return sharp(mosaic)
    .extract({
      left: left - firstX * 256,
      top: top - firstY * 256,
      width: right - left,
      height: bottom - top,
    })
    .resize(700, 490)
    .jpeg({ quality: 82 })
    .toBuffer()
}
