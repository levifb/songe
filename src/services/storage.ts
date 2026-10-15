/** Persistência local do modo de desenvolvimento. Sai de cena quando o Firebase entra. */
const PREFIX = 'songe:v1:'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw, reviveDates) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* Modo privado do Safari pode recusar escrita; a sessão segue em memória. */
  }
}

export function removeJson(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch { /* ignora */ }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value
}
