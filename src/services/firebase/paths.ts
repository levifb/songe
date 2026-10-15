import { collection, doc, type Firestore } from 'firebase/firestore'

/**
 * Todos os caminhos do banco em um lugar só.
 *
 * Uma diferença proposital em relação ao esboço inicial: as contribuições NÃO
 * ficam aninhadas dentro de cada meta. Elas moram numa coleção plana do casal,
 * com o goalId como campo. O dashboard e o feed precisam de "todas as
 * contribuições do casal" — aninhadas, isso exigiria consulta de grupo de
 * coleção, índice composto e uma segunda camada de regras. Planas, é uma
 * assinatura só.
 *
 *   users/{uid}
 *   users/{uid}/pushSubscriptions/{id}
 *   invites/{code}
 *   couples/{coupleId}
 *   couples/{coupleId}/goals/{goalId}
 *   couples/{coupleId}/contributions/{contributionId}   ← plana, com goalId
 *   couples/{coupleId}/activities/{activityId}
 */
export const paths = {
  user: (db: Firestore, uid: string) => doc(db, 'users', uid),
  pushSubscriptions: (db: Firestore, uid: string) => collection(db, 'users', uid, 'pushSubscriptions'),
  pushSubscription: (db: Firestore, uid: string, id: string) =>
    doc(db, 'users', uid, 'pushSubscriptions', id),

  invite: (db: Firestore, code: string) => doc(db, 'invites', code),
  invites: (db: Firestore) => collection(db, 'invites'),

  couple: (db: Firestore, coupleId: string) => doc(db, 'couples', coupleId),
  couples: (db: Firestore) => collection(db, 'couples'),

  goals: (db: Firestore, coupleId: string) => collection(db, 'couples', coupleId, 'goals'),
  goal: (db: Firestore, coupleId: string, goalId: string) =>
    doc(db, 'couples', coupleId, 'goals', goalId),

  contributions: (db: Firestore, coupleId: string) =>
    collection(db, 'couples', coupleId, 'contributions'),
  contribution: (db: Firestore, coupleId: string, id: string) =>
    doc(db, 'couples', coupleId, 'contributions', id),

  activities: (db: Firestore, coupleId: string) => collection(db, 'couples', coupleId, 'activities'),
  activity: (db: Firestore, coupleId: string, id: string) =>
    doc(db, 'couples', coupleId, 'activities', id),
} as const

/** Caminho da foto no Storage. As regras leem o coupleId daqui. */
export function goalPhotoPath(coupleId: string, photoId: string): string {
  return `couples/${coupleId}/photos/${photoId}.webp`
}

export function avatarPath(uid: string, photoId: string): string {
  return `users/${uid}/avatar/${photoId}.webp`
}
