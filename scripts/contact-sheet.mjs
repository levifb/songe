/** Folhas de contato numeradas, para escolher as fotos olhando em vez de adivinhando. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const DIR = 'scratch/photo-candidates'
const OUT = 'scratch/sheets'
const COLS = 3
const ROWS = 3
const CELL_W = 420
const CELL_H = 260
const LABEL_H = 26

const manifest = JSON.parse(await readFile(path.join(DIR, 'manifest.json'), 'utf8'))
const OK_LICENSE = /^(CC0|BY 2\.0|BY-SA 2\.0|BY 3\.0|BY-SA 3\.0|BY 4\.0|BY-SA 4\.0)/
const chosen = manifest.filter((m) => OK_LICENSE.test(m.license))

await mkdir(OUT, { recursive: true })
const perSheet = COLS * ROWS
const sheets = Math.ceil(chosen.length / perSheet)
const index = []

for (let s = 0; s < sheets; s++) {
  const batch = chosen.slice(s * perSheet, (s + 1) * perSheet)
  const composites = []

  for (const [i, item] of batch.entries()) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = col * CELL_W
    const y = row * (CELL_H + LABEL_H)

    const buf = await sharp(path.join(DIR, `${item.id}.jpg`))
      .resize(CELL_W - 8, CELL_H - 8, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toBuffer()
    composites.push({ input: buf, left: x + 4, top: y + 4 })

    const label = `${item.id}`
    const svg = `<svg width="${CELL_W}" height="${LABEL_H}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="18" font-family="monospace" font-size="15" fill="#fff">${label}</text></svg>`
    composites.push({ input: Buffer.from(svg), left: x, top: y + CELL_H })
    index.push({ sheet: s + 1, cell: `${row + 1},${col + 1}`, ...item })
  }

  await sharp({
    create: {
      width: COLS * CELL_W,
      height: ROWS * (CELL_H + LABEL_H),
      channels: 3,
      background: '#000',
    },
  })
    .composite(composites)
    .jpeg({ quality: 84 })
    .toFile(path.join(OUT, `sheet-${s + 1}.jpg`))

  console.log(`sheet-${s + 1}.jpg  ->  ${batch.map((b) => b.id).join(', ')}`)
}

await writeFile(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2))
console.log(`\n${chosen.length} candidatas com licença limpa em ${sheets} folhas`)
