import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

async function main() {
  const root = path.resolve(process.cwd())
  const srcPng = path.resolve(root, 'src/assets/images/space-background.png')
  const outDir = path.resolve(root, 'src/assets/images')
  const outAvif = path.resolve(outDir, 'space-background.avif')
  const outWebp = path.resolve(outDir, 'space-background.webp')

  // Ensure input exists
  try {
    await fs.access(srcPng)
  } catch {
    console.error('[assets:optimize] Source not found:', srcPng)
    process.exit(1)
  }

  // Simple, KISS: one pass each with sensible defaults
  // AVIF: cqLevel ~ 35 ≈ good quality, small size
  // WebP: quality ~ 80 ≈ visually lossless for backgrounds
  console.log('[assets:optimize] Reading', srcPng)
  const img = sharp(srcPng)

  console.log('[assets:optimize] Writing AVIF =>', outAvif)
  await img.avif({ quality: 55 }).toFile(outAvif)

  console.log('[assets:optimize] Writing WebP =>', outWebp)
  await img.webp({ quality: 80 }).toFile(outWebp)

  // Report sizes
  const [statPng, statAvif, statWebp] = await Promise.all([
    fs.stat(srcPng),
    fs.stat(outAvif).catch(() => null),
    fs.stat(outWebp).catch(() => null),
  ])

  function kb(n) { return (n / 1024).toFixed(1) + ' KB' }
  console.log('[assets:optimize] Sizes:')
  console.log('  PNG :', statPng ? kb(statPng.size) : '—')
  console.log('  AVIF:', statAvif ? kb(statAvif.size) : '—')
  console.log('  WebP:', statWebp ? kb(statWebp.size) : '—')
}

main().catch((e) => {
  console.error('[assets:optimize] Failed:', e)
  process.exit(1)
})
