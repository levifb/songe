/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

/**
 * Service worker do Songe. Faz três coisas:
 *   1. Guarda a casca do app para abrir instantâneo e funcionar offline.
 *   2. Guarda as fotos sob demanda, sem inflar o download inicial.
 *   3. Recebe as notificações de contribuição do parceiro.
 */

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Versão nova assume assim que estiver pronta, sem pedir licença.
void self.skipWaiting()
clientsClaim()

// Fotos: uma vez baixadas, não mudam — a URL sempre carrega um id único.
registerRoute(
  ({ request, url }) => request.destination === 'image' || url.pathname.startsWith('/photos/'),
  new CacheFirst({
    cacheName: 'songe-fotos',
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true }),
    ],
  }),
)

// Fotos que vocês subirem vivem no Storage do Firebase.
registerRoute(
  ({ url }) => url.hostname === 'firebasestorage.googleapis.com',
  new CacheFirst({
    cacheName: 'songe-fotos-nossas',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 180, purgeOnQuotaError: true }),
    ],
  }),
)

registerRoute(
  ({ request }) => request.destination === 'font',
  new StaleWhileRevalidate({ cacheName: 'songe-fontes' }),
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

/* ── Notificações ──────────────────────────────────────────── */

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'Songe', body: 'Tem novidade por aqui.' }

  try {
    if (event.data) payload = { ...payload, ...(event.data.json() as PushPayload) }
  } catch {
    // Push sem corpo legível: o aviso genérico já serve.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // A mesma tag substitui o aviso anterior em vez de empilhar avisos.
      tag: payload.tag ?? 'songe-contribuicao',
      data: { url: payload.url ?? '/' },
      // Sem vibração agressiva: é uma boa notícia, não um alarme.
      silent: false,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Se o Songe já estiver aberto, reaproveita a janela em vez de abrir outra.
      for (const client of clients) {
        if ('focus' in client) {
          void client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
