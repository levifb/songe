import type { Cents } from '@/lib/money'
import type {
  Activity,
  Contribution,
  Couple,
  Goal,
  Invite,
  PhotoRef,
  PushSubscriptionRecord,
  User,
} from '@/domain/types'

export type Unsubscribe = () => void

export interface CreateGoalInput {
  title: string
  description: string | null
  targetCents: Cents
  deadline: Date | null
  cover: PhotoRef | null
}

export interface UpdateGoalInput {
  title?: string
  description?: string | null
  targetCents?: Cents
  deadline?: Date | null
  cover?: PhotoRef | null
  gallery?: PhotoRef[]
}

export interface CreateContributionInput {
  goalId: string
  amountCents: Cents
  date: Date
  note: string | null
}

export interface UpdateContributionInput {
  amountCents?: Cents
  date?: Date
  note?: string | null
}

export class RepositoryError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
  }
}

/**
 * Contrato único entre as telas e onde os dados moram.
 * Hoje existe uma implementação local (desenvolvimento) e o Firebase entra
 * atrás desta mesma interface, sem que nenhuma tela precise mudar.
 */
export interface Repository {
  /* Autenticação */
  onAuthChange(callback: (user: User | null) => void): Unsubscribe
  signUp(input: { name: string; email: string; password: string }): Promise<User>
  signIn(input: { email: string; password: string }): Promise<User>
  signOut(): Promise<void>
  updateProfile(patch: { name?: string; photoUrl?: string | null }): Promise<void>

  /* Parceria */
  getCouple(coupleId: string): Promise<Couple | null>
  getMembers(coupleId: string): Promise<User[]>
  /** Cria a parceria com um único membro e devolve o convite para o outro. */
  createCouple(): Promise<{ couple: Couple; invite: Invite }>
  getActiveInvite(coupleId: string): Promise<Invite | null>
  regenerateInvite(coupleId: string): Promise<Invite>
  redeemInvite(code: string): Promise<Couple>

  /* Metas */
  subscribeGoals(coupleId: string, callback: (goals: Goal[]) => void): Unsubscribe
  createGoal(input: CreateGoalInput): Promise<Goal>
  updateGoal(goalId: string, patch: UpdateGoalInput): Promise<void>
  deleteGoal(goalId: string): Promise<void>

  /* Contribuições */
  subscribeContributions(coupleId: string, callback: (items: Contribution[]) => void): Unsubscribe
  addContribution(input: CreateContributionInput): Promise<Contribution>
  updateContribution(id: string, patch: UpdateContributionInput): Promise<void>
  deleteContribution(id: string): Promise<void>

  /* Fotos */
  /** Recebe a imagem já comprimida e devolve a referência pronta para uso. */
  uploadPhoto(blob: Blob, purpose: 'goalCover' | 'avatar'): Promise<PhotoRef>

  /* Notificações */
  savePushSubscription(record: PushSubscriptionRecord): Promise<void>
  removePushSubscription(id: string): Promise<void>
  /** Para onde mandar o aviso quando você registra algo. */
  listPartnerPushSubscriptions(): Promise<PushSubscriptionRecord[]>

  /* Novidades */
  subscribeActivities(coupleId: string, callback: (items: Activity[]) => void): Unsubscribe
  markActivitiesRead(coupleId: string): Promise<void>
}
