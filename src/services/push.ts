import { repository } from '@/app/repository'
import type { PushSubscriptionRecord } from '@/domain/types'

/**
 * Notificações do Songe, sem FCM.
 *
 * O caminho é o Web Push puro: o navegador cria uma assinatura, ela é guardada
 * no banco, e quem registra uma contribuição pede a uma função na Vercel que
 * envie o aviso para a assinatura do parceiro. Sem Cloud Functions, sem plano
 * pago, e sem o token do FCM que costuma expirar silenciosamente em PWA no iOS.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushStatus =
  | 'unsupported'      // navegador sem suporte
  | 'needs-install'    // iPhone: só funciona instalado na tela de início
  | 'not-configured'   // falta a chave VAPID
  | 'denied'           // a pessoa recusou
  | 'off'              // suportado, ainda não ativado
  | 'on'

/** No iPhone, o Safari nem deixa pedir permissão fora do app instalado. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Propriedade só do Safari no iOS, ausente da tipagem padrão.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  if (Notification.permission === 'denied') return 'denied'

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

/**
 * Pede permissão e registra a assinatura. Precisa ser chamado a partir de um
 * toque da pessoa — navegador nenhum aceita esse pedido fora de um gesto.
 */
export async function enablePush(): Promise<PushStatus> {
  if (!VAPID_PUBLIC_KEY) return 'not-configured'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // Sem isto o navegador recusa: todo aviso precisa ser visível.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  await repository.savePushSubscription(toRecord(subscription))
  return 'on'
}

export async function disablePush(): Promise<PushStatus> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return 'off'

  await repository.removePushSubscription(deviceId())
  await subscription.unsubscribe()
  return 'off'
}

/**
 * Chamado toda vez que o app abre. Se o navegador trocou a assinatura desde a
 * última vez, o registro é atualizado sem que ninguém precise fazer nada.
 */
export async function refreshPushSubscription(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return

    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return

    await repository.savePushSubscription(toRecord(subscription))
  } catch {
    // Silêncio: isto é manutenção de fundo, nunca deve atrapalhar o uso.
  }
}

interface NotifyPayload {
  title: string
  body: string
  url?: string
}

/**
 * Avisa o parceiro. Falhar aqui nunca pode derrubar o registro da
 * contribuição — o aporte já está salvo, a notificação é um extra.
 */
export async function notifyPartner(payload: NotifyPayload): Promise<void> {
  try {
    const subscriptions = await repository.listPartnerPushSubscriptions()
    if (subscriptions.length === 0) return

    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptions, payload }),
      keepalive: true,
    })
  } catch {
    // Silêncio de propósito.
  }
}

function toRecord(subscription: PushSubscription): PushSubscriptionRecord {
  const json = subscription.toJSON()
  return {
    id: deviceId(),
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
    device: describeDevice(),
    // Preenchido pelo repositório, que é quem sabe a parceria atual.
    coupleId: null,
    createdAt: new Date(),
  }
}

const DEVICE_KEY = 'songe:v1:deviceId'

/**
 * Um identificador por aparelho, não por assinatura.
 *
 * O navegador troca o endereço da assinatura de tempos em tempos, por conta
 * própria. Se o documento fosse identificado pelo endereço, cada troca criaria
 * um registro novo e deixaria o antigo para trás — e os avisos passariam a ser
 * enviados para uma caixa postal morta, sem erro nenhum aparecer. Com um id
 * fixo do aparelho, a atualização simplesmente sobrescreve o registro certo.
 */
function deviceId(): string {
  try {
    const salvo = localStorage.getItem(DEVICE_KEY)
    if (salvo) return salvo
    const novo = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, novo)
    return novo
  } catch {
    // Modo privado sem armazenamento: um id por sessão ainda funciona.
    return crypto.randomUUID()
  }
}

function describeDevice(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Aparelho'
}

/**
 * A chave VAPID viaja em base64url e precisa chegar como bytes.
 * O buffer é criado explicitamente porque `subscribe` exige um ArrayBuffer
 * de verdade, e não o tipo genérico que `Uint8Array.from` devolve.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)

  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
