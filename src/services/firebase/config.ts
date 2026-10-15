import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

/**
 * As chaves do Firebase para web são públicas por natureza — elas identificam
 * o projeto, não autorizam nada. Quem autoriza são as regras do Firestore e do
 * Storage. Mesmo assim ficam em .env.local, fora do repositório.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Sem projeto configurado, o app roda no back-end local. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let storageInstance: FirebaseStorage | null = null

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase não configurado. Preencha o .env.local.')
  }
  app ??= initializeApp(config)
  return app
}

export function auth(): Auth {
  authInstance ??= getAuth(ensureApp())
  return authInstance
}

export function db(): Firestore {
  dbInstance ??= getFirestore(ensureApp())
  return dbInstance
}

export function storage(): FirebaseStorage {
  storageInstance ??= getStorage(ensureApp())
  return storageInstance
}
