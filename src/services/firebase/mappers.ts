import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore'
import type { Activity, Contribution, Couple, Goal, Invite, PhotoRef, User } from '@/domain/types'

/**
 * Tradução entre o formato do Firestore e os tipos do domínio.
 * O resto do app nunca vê um Timestamp — só Date.
 */

export function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date()
}

function toDateOrNull(value: unknown): Date | null {
  return value == null ? null : toDate(value)
}

function toPhoto(value: unknown): PhotoRef | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.src !== 'string') return null
  return {
    id: String(raw.id ?? ''),
    kind: raw.kind === 'upload' ? 'upload' : 'preset',
    src: raw.src,
    focalX: typeof raw.focalX === 'number' ? raw.focalX : 0.5,
    focalY: typeof raw.focalY === 'number' ? raw.focalY : 0.5,
    credit: typeof raw.credit === 'string' ? raw.credit : undefined,
  }
}

/** O Firestore recusa `undefined`; campos ausentes viram `null`. */
export function fromPhoto(photo: PhotoRef | null): Record<string, unknown> | null {
  if (!photo) return null
  return {
    id: photo.id,
    kind: photo.kind,
    src: photo.src,
    focalX: photo.focalX,
    focalY: photo.focalY,
    credit: photo.credit ?? null,
  }
}

export function readUser(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData | undefined }): User | null {
  const data = snapshot.data()
  if (!data) return null
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    coupleId: typeof data.coupleId === 'string' ? data.coupleId : null,
    createdAt: toDate(data.createdAt),
  }
}

export function readCouple(snapshot: { id: string; data: () => DocumentData | undefined }): Couple | null {
  const data = snapshot.data()
  if (!data) return null
  return {
    id: snapshot.id,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
    createdAt: toDate(data.createdAt),
  }
}

export function readInvite(snapshot: { id: string; data: () => DocumentData | undefined }): Invite | null {
  const data = snapshot.data()
  if (!data) return null
  return {
    code: snapshot.id,
    coupleId: String(data.coupleId ?? ''),
    createdBy: String(data.createdBy ?? ''),
    createdAt: toDate(data.createdAt),
    expiresAt: toDate(data.expiresAt),
    redeemedBy: typeof data.redeemedBy === 'string' ? data.redeemedBy : null,
  }
}

export function readGoal(snapshot: QueryDocumentSnapshot<DocumentData>, coupleId: string): Goal {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    coupleId,
    title: String(data.title ?? ''),
    description: typeof data.description === 'string' ? data.description : null,
    targetCents: Number(data.targetCents ?? 0),
    deadline: toDateOrNull(data.deadline),
    cover: toPhoto(data.cover),
    gallery: Array.isArray(data.gallery)
      ? data.gallery.map(toPhoto).filter((p): p is PhotoRef => p !== null)
      : [],
    status: data.status === 'achieved' ? 'achieved' : 'active',
    achievedAt: toDateOrNull(data.achievedAt),
    createdBy: String(data.createdBy ?? ''),
    createdAt: toDate(data.createdAt),
    totalCents: Number(data.totalCents ?? 0),
    perUserCents: isCentsMap(data.perUserCents) ? data.perUserCents : {},
    contributionCount: Number(data.contributionCount ?? 0),
  }
}

function isCentsMap(value: unknown): value is Record<string, number> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function readContribution(snapshot: QueryDocumentSnapshot<DocumentData>, coupleId: string): Contribution {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    goalId: String(data.goalId ?? ''),
    coupleId,
    userId: String(data.userId ?? ''),
    amountCents: Number(data.amountCents ?? 0),
    date: toDate(data.date),
    note: typeof data.note === 'string' ? data.note : null,
    createdAt: toDate(data.createdAt),
    editedAt: toDateOrNull(data.editedAt),
  }
}

export function readActivity(snapshot: QueryDocumentSnapshot<DocumentData>, coupleId: string): Activity {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    coupleId,
    type: data.type,
    actorId: String(data.actorId ?? ''),
    goalId: typeof data.goalId === 'string' ? data.goalId : null,
    goalTitle: typeof data.goalTitle === 'string' ? data.goalTitle : null,
    amountCents: typeof data.amountCents === 'number' ? data.amountCents : null,
    createdAt: toDate(data.createdAt),
    readBy: Array.isArray(data.readBy) ? data.readBy.map(String) : [],
  }
}
