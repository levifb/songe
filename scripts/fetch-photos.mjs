/**
 * Candidatas a foto da biblioteca do Songe, via Openverse (Flickr + Commons,
 * tudo com licença livre e crédito rastreável).
 *
 *   node scripts/fetch-photos.mjs candidates   -> miniaturas para revisão
 *   node scripts/fetch-photos.mjs final        -> versões grandes das escolhidas
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const UA = 'SongeApp/1.0 (personal two-person savings PWA; non-commercial)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const QUERIES = [
  ['hallstatt', 'hallstatt austria winter'],
  ['montreux', 'montreux lake geneva switzerland'],
  ['paris', 'paris street winter'],
  ['alps', 'swiss alps snow mountains'],
  ['village', 'alpine village snow winter'],
  ['cafe', 'cozy coffee shop window'],
  ['forest', 'snowy forest path winter'],
  ['lights', 'european old town street evening'],
  ['train', 'swiss mountain railway snow'],
  ['chalet', 'wooden chalet snow mountains'],
  ['rooftops', 'snowy rooftops village'],
  ['lake', 'alpine lake mist mountains'],
]

async function get(url, tries = 4) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status !== 429) return res
    await sleep(1500 * 2 ** attempt)
  }
  return fetch(url, { headers: { 'User-Agent': UA } })
}

async function search(term, limit) {
  const url = new URL('https://api.openverse.org/v1/images/')
  url.search = new URLSearchParams({
    q: term,
    license_type: 'all-cc',
    page_size: String(limit),
    mature: 'false',
  }).toString()

  const res = await get(url)
  if (!res.ok) throw new Error(`${term}: HTTP ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

const stripTags = (s) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

const OUT = 'scratch/photo-candidates'
await mkdir(OUT, { recursive: true })
const manifest = []

for (const [slug, term] of QUERIES) {
  await sleep(800)
  let results
  try { results = await search(term, 10) } catch (e) { console.error(e.message); continue }

  const usable = results.filter((r) => r.width >= 1000 && r.width / r.height >= 1.3).slice(0, 4)

  for (const [i, r] of usable.entries()) {
    const id = `${slug}-${i + 1}`
    await sleep(250)
    const img = await get(r.url)
    if (!img.ok) { console.error(`${id}: HTTP ${img.status}`); continue }
    await writeFile(path.join(OUT, `${id}.jpg`), Buffer.from(await img.arrayBuffer()))

    manifest.push({
      id, slug,
      title: stripTags(r.title),
      creator: stripTags(r.creator) || 'desconhecido',
      license: `${(r.license ?? '').toUpperCase()} ${r.license_version ?? ''}`.trim(),
      source: r.foreign_landing_url,
      originalUrl: r.url,
      width: r.width,
      height: r.height,
    })
    console.log(`ok  ${id}  ${manifest.at(-1).license.padEnd(12)}  ${manifest.at(-1).title.slice(0, 60)}`)
  }
}

await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\n${manifest.length} candidatas em ${OUT}`)
