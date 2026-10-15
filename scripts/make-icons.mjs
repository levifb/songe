/**
 * Ícone do Songe: um pico nevado recortado sobre a luz âmbar.
 * Sem letra — na tela inicial, ao lado de dezenas de outros apps, uma
 * silhueta se reconhece mais rápido que uma inicial.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const mark = (size, padding) => {
  const s = size
  const p = padding * s
  const inner = s - p * 2
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1C232D"/>
      <stop offset="100%" stop-color="#0E1319"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.78" r="0.62">
      <stop offset="0%" stop-color="#EDB86F" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#D4862A" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#D4862A" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${s}" height="${s}" fill="url(#sky)"/>
  <rect width="${s}" height="${s}" fill="url(#glow)"/>

  <g transform="translate(${p}, ${p})">
    <!-- Pico maior, ao fundo -->
    <path d="M ${inner * 0.04} ${inner * 0.86}
             L ${inner * 0.42} ${inner * 0.20}
             L ${inner * 0.62} ${inner * 0.52}
             L ${inner * 0.72} ${inner * 0.40}
             L ${inner * 0.98} ${inner * 0.86} Z"
          fill="#F2F5F8" fill-opacity="0.96"/>
    <!-- Sombra do vale, para o pico não virar um triângulo chapado -->
    <path d="M ${inner * 0.42} ${inner * 0.20}
             L ${inner * 0.62} ${inner * 0.52}
             L ${inner * 0.50} ${inner * 0.86}
             L ${inner * 0.30} ${inner * 0.86} Z"
          fill="#AEBDCE" fill-opacity="0.55"/>
  </g>
</svg>`
}

await mkdir('public/icons', { recursive: true })

const targets = [
  ['icon-192.png', 192, 0.14],
  ['icon-512.png', 512, 0.14],
  // Maskable precisa de margem: o Android recorta em círculo.
  ['icon-maskable-512.png', 512, 0.24],
  // O iOS não aplica máscara nem transparência; este é o da tela de início.
  ['apple-touch-icon.png', 180, 0.13],
]

for (const [name, size, padding] of targets) {
  await sharp(Buffer.from(mark(size, padding))).png().toFile(`public/icons/${name}`)
  console.log(`ok  ${name}  ${size}px`)
}

// Favicon do navegador, em SVG para ficar nítido em qualquer tamanho.
await writeFile('public/icons/icon.svg', mark(64, 0.1))
console.log('ok  icon.svg')
