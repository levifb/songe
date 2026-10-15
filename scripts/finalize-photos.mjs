/**
 * Pega as candidatas escolhidas, busca a maior versão disponível no Flickr,
 * e gera para cada uma: WebP grande (capa), WebP pequeno (miniatura) e um
 * LQIP minúsculo em base64 para o blur-up enquanto a foto carrega.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const UA = 'SongeApp/1.0 (personal two-person savings PWA; non-commercial)'
const DIR = 'scratch/photo-candidates'
const OUT = 'public/photos'

/** id da candidata -> identidade dentro do app */
const PICKS = [
  ['hallstatt-2', 'vila-no-lago',       'Vila no lago',          0.5, 0.5],
  ['hallstatt-3', 'luzes-na-montanha',  'Luzes na montanha',     0.5, 0.55],
  ['lights-2',    'praca-ao-anoitecer', 'Praça ao anoitecer',    0.5, 0.55],
  ['cafe-1',      'cafe-da-esquina',    'Café da esquina',       0.5, 0.5],
  ['village-1',   'picos-ao-entardecer','Picos ao entardecer',   0.5, 0.55],
  ['alps-1',      'mar-de-nuvens',      'Mar de nuvens',         0.5, 0.5],
  ['forest-1',    'bosque-em-silencio', 'Bosque em silêncio',    0.5, 0.5],
  ['forest-4',    'trilha-de-pinheiros','Trilha de pinheiros',   0.5, 0.5],
  ['train-3',     'trem-na-neve',       'Trem na neve',          0.45, 0.5],
  ['rooftops-3',  'telhados-nevados',   'Telhados nevados',      0.5, 0.5],
  ['paris-1',     'rua-na-chuva',       'Rua na chuva',          0.5, 0.5],
  ['lake-3',      'lago-em-nevoa',      'Lago em névoa',         0.5, 0.5],
]

const manifest = JSON.parse(await readFile(path.join(DIR, 'manifest.json'), 'utf8'))
const byId = new Map(manifest.map((m) => [m.id, m]))
await mkdir(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Flickr serve tamanhos por sufixo. Tentamos do maior ao menor. */
async function fetchLargest(url) {
  const candidates = /_b\.jpg$/.test(url)
    ? [url.replace(/_b\.jpg$/, '_k.jpg'), url.replace(/_b\.jpg$/, '_h.jpg'), url]
    : [url]

  for (const candidate of candidates) {
    const res = await fetch(candidate, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      const meta = await sharp(buf).metadata()
      return { buf, width: meta.width, height: meta.height, url: candidate }
    }
    await sleep(200)
  }
  throw new Error(`sem versão utilizável: ${url}`)
}

const library = []

for (const [candidateId, id, title, focalX, focalY] of PICKS) {
  const source = byId.get(candidateId)
  if (!source) { console.error(`faltando: ${candidateId}`); continue }

  await sleep(400)
  const { buf, width, url } = await fetchLargest(source.originalUrl)

  const base = sharp(buf).rotate()
  await base.clone().resize(1600, null, { withoutEnlargement: true })
    .webp({ quality: 78 }).toFile(path.join(OUT, `${id}.webp`))
  await base.clone().resize(640, null, { withoutEnlargement: true })
    .webp({ quality: 72 }).toFile(path.join(OUT, `${id}@sm.webp`))

  const lqip = await base.clone().resize(20).blur(1).webp({ quality: 40 }).toBuffer()

  library.push({
    id, title, focalX, focalY,
    src: `/photos/${id}.webp`,
    thumb: `/photos/${id}@sm.webp`,
    lqip: `data:image/webp;base64,${lqip.toString('base64')}`,
    credit: `${source.creator} · ${source.license} · via ${new URL(source.source).hostname}`,
    sourceUrl: source.source,
  })

  console.log(`ok  ${id.padEnd(22)} ${width}px  ${url.slice(-14)}`)
}

await writeFile('scratch/photo-library.json', JSON.stringify(library, null, 2))
console.log(`\n${library.length} fotos em ${OUT}`)
