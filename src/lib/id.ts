export function newId(): string {
  return crypto.randomUUID()
}

/**
 * Código de convite: 6 caracteres, sem os que se confundem à mão
 * (0/O, 1/I/L). Alfabeto de 28 símbolos = ~481 milhões de combinações.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
