import { LocalRepository } from '@/services/localRepository'
import { FirebaseRepository } from '@/services/firebase/firebaseRepository'
import { isFirebaseConfigured } from '@/services/firebase/config'
import type { Repository } from '@/services/repository'

/**
 * Ponto único de troca de back-end.
 *
 * Com o .env.local preenchido, o app fala com o Firebase de verdade. Sem ele,
 * cai no back-end local — o que permite desenvolver e testar todas as telas
 * sem criar conta em serviço nenhum.
 */
export const repository: Repository = isFirebaseConfigured
  ? new FirebaseRepository()
  : new LocalRepository()

export const backendName = isFirebaseConfigured ? 'firebase' : 'local'
