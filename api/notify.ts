import webpush from 'web-push'

/**
 * Única peça de servidor do Songe: uma função na Vercel que assina e entrega
 * a notificação. Ela existe porque a chave privada VAPID não pode viver no
 * aplicativo — qualquer pessoa leria o código-fonte.
 *
 * Nota honesta sobre o modelo de confiança: esta função não valida quem está
 * chamando. Ela só consegue enviar para assinaturas que o chamador já possui,
 * e essas assinaturas só são legíveis pelas duas pessoas da parceria (regra do
 * Firestore). Para um app de duas pessoas isso basta. Se um dia virar público,
 * o passo seguinte é verificar aqui o token de identidade do Firebase.
 */

interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

interface NotifyBody {
  subscriptions: StoredSubscription[]
  payload: { title: string; body: string; url?: string }
}

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const CONTACT = process.env.VAPID_CONTACT ?? 'mailto:songe@example.com'

const MAX_SUBSCRIPTIONS = 8

export async function POST(request: Request): Promise<Response> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return json({ error: 'Chaves VAPID ausentes no servidor.' }, 500)
  }

  let body: NotifyBody
  try {
    body = (await request.json()) as NotifyBody
  } catch {
    return json({ error: 'Corpo inválido.' }, 400)
  }

  const subscriptions = Array.isArray(body.subscriptions)
    ? body.subscriptions.slice(0, MAX_SUBSCRIPTIONS)
    : []
  const title = String(body.payload?.title ?? '').slice(0, 80)
  const message = String(body.payload?.body ?? '').slice(0, 200)

  if (subscriptions.length === 0 || !title || !message) {
    return json({ error: 'Nada para enviar.' }, 400)
  }

  webpush.setVapidDetails(CONTACT, PUBLIC_KEY, PRIVATE_KEY)

  const notification = JSON.stringify({
    title,
    body: message,
    url: typeof body.payload?.url === 'string' ? body.payload.url.slice(0, 200) : '/',
  })

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        notification,
        { TTL: 60 * 60 * 24 },
      ),
    ),
  )

  const delivered = results.filter((result) => result.status === 'fulfilled').length
  // 404 e 410 significam assinatura morta — o app limpa na próxima abertura.
  const expired = results.filter(
    (result) =>
      result.status === 'rejected' &&
      [404, 410].includes((result.reason as { statusCode?: number })?.statusCode ?? 0),
  ).length

  return json({ delivered, expired, total: subscriptions.length })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
