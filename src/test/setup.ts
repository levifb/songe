import { webcrypto } from 'node:crypto'
import { beforeEach } from 'vitest'

/**
 * O jsdom não traz WebCrypto, e o app usa `randomUUID`, `getRandomValues` e
 * `subtle.digest` de verdade — nada de simulação, para que os testes exercitem
 * o mesmo código que roda no celular.
 */
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

// Cada teste começa com o armazenamento limpo, senão um teste contamina o outro.
beforeEach(() => {
  localStorage.clear()
})
