/**
 * Compressão no próprio celular, antes de qualquer upload.
 * Uma foto de 4 MB da câmera vira ~150 KB sem diferença visível numa tela
 * de telefone — e é o que mantém o armazenamento dentro da cota gratuita.
 */
export interface CompressedImage {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

const MAX_EDGE = 1600
const QUALITY = 0.78

export async function compressImage(file: File, maxEdge = MAX_EDGE): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Esse arquivo não é uma imagem.')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não consegui processar a imagem neste navegador.')

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // WebP economiza ~30% sobre JPEG; Safari suporta desde 2020.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  )
  if (!blob) throw new Error('Não consegui comprimir a imagem.')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'))
    reader.readAsDataURL(blob)
  })

  return { blob, dataUrl, width, height }
}
