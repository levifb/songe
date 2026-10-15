import { newId, newInviteCode } from '@/lib/id'
import { recomputeTotals } from '@/domain/goals'
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
import { readJson, writeJson } from './storage'
import {
  RepositoryError,
  type CreateContributionInput,
  type CreateGoalInput,
  type Repository,
  type Unsubscribe,
  type UpdateContributionInput,
  type UpdateGoalInput,
} from './repository'

interface StoredUser extends User {
  passwordHash: string
}

interface StoredSubscription extends PushSubscriptionRecord {
  userId: string
}

interface Db {
  users: StoredUser[]
  pushSubscriptions: StoredSubscription[]
  couples: Couple[]
  invites: Invite[]
  goals: Goal[]
  contributions: Contribution[]
  activities: Activity[]
}

/**
 * Função, e não constante: um objeto compartilhado seria devolvido por
 * referência quando não houvesse nada salvo, e a primeira escrita mutaria
 * o "vazio" de todas as instâncias seguintes.
 */
function emptyDb(): Db {
  return {
    users: [],
    pushSubscriptions: [],
    couples: [],
    invites: [],
    goals: [],
    contributions: [],
    activities: [],
  }
}
const INVITE_TTL_MS = 48 * 60 * 60 * 1000

async function hash(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`songe.local.${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Implementação local, para desenvolver e testar as telas antes de existir um
 * projeto Firebase. Repete de propósito as mesmas regras de permissão que o
 * Firestore vai impor — assim a interface é construída contra as restrições
 * reais, e não contra um servidor complacente que aceita tudo.
 */
export class LocalRepository implements Repository {
  private db: Db = readJson<Db>('db', emptyDb())
  private currentUserId: string | null = readJson<string | null>('session', null)
  private listeners = new Set<() => void>()

  private persist() {
    writeJson('db', this.db)
    writeJson('session', this.currentUserId)
    for (const listener of this.listeners) listener()
  }

  private watch(callback: () => void): Unsubscribe {
    this.listeners.add(callback)
    callback()
    return () => {
      this.listeners.delete(callback)
    }
  }

  private requireUser(): StoredUser {
    const user = this.db.users.find((u) => u.id === this.currentUserId)
    if (!user) throw new RepositoryError('unauthenticated', 'Sessão expirada. Entre novamente.')
    return user
  }

  /** Toda leitura de dados do casal passa por aqui. Ninguém lê parceria alheia. */
  private requireMembership(coupleId: string): StoredUser {
    const user = this.requireUser()
    const couple = this.db.couples.find((c) => c.id === coupleId)
    if (!couple || !couple.memberIds.includes(user.id)) {
      throw new RepositoryError('permission-denied', 'Você não faz parte desta parceria.')
    }
    return user
  }

  private publicUser(user: StoredUser): User {
    const { passwordHash: _hidden, ...rest } = user
    return rest
  }

  /* ── Autenticação ──────────────────────────────────────── */

  onAuthChange(callback: (user: User | null) => void): Unsubscribe {
    return this.watch(() => {
      const user = this.db.users.find((u) => u.id === this.currentUserId)
      callback(user ? this.publicUser(user) : null)
    })
  }

  async signUp({ name, email, password }: { name: string; email: string; password: string }): Promise<User> {
    const normalized = email.trim().toLowerCase()
    if (this.db.users.some((u) => u.email === normalized)) {
      throw new RepositoryError('email-in-use', 'Já existe uma conta com este e-mail.')
    }
    if (password.length < 6) {
      throw new RepositoryError('weak-password', 'A senha precisa de pelo menos 6 caracteres.')
    }

    const user: StoredUser = {
      id: newId(),
      name: name.trim(),
      email: normalized,
      photoUrl: null,
      coupleId: null,
      createdAt: new Date(),
      passwordHash: await hash(password),
    }
    this.db.users.push(user)
    this.currentUserId = user.id
    this.persist()
    return this.publicUser(user)
  }

  async signIn({ email, password }: { email: string; password: string }): Promise<User> {
    const normalized = email.trim().toLowerCase()
    const user = this.db.users.find((u) => u.email === normalized)
    if (!user || user.passwordHash !== (await hash(password))) {
      throw new RepositoryError('invalid-credentials', 'E-mail ou senha incorretos.')
    }
    this.currentUserId = user.id
    this.persist()
    return this.publicUser(user)
  }

  async signOut(): Promise<void> {
    this.currentUserId = null
    this.persist()
  }

  async updateProfile(patch: { name?: string; photoUrl?: string | null }): Promise<void> {
    const user = this.requireUser()
    if (patch.name !== undefined) user.name = patch.name.trim()
    if (patch.photoUrl !== undefined) user.photoUrl = patch.photoUrl
    this.persist()
  }

  /* ── Parceria ──────────────────────────────────────────── */

  async getCouple(coupleId: string): Promise<Couple | null> {
    this.requireMembership(coupleId)
    return this.db.couples.find((c) => c.id === coupleId) ?? null
  }

  async getMembers(coupleId: string): Promise<User[]> {
    this.requireMembership(coupleId)
    const couple = this.db.couples.find((c) => c.id === coupleId)
    if (!couple) return []
    return couple.memberIds
      .map((id) => this.db.users.find((u) => u.id === id))
      .filter((u): u is StoredUser => Boolean(u))
      .map((u) => this.publicUser(u))
  }

  async createCouple(): Promise<{ couple: Couple; invite: Invite }> {
    const user = this.requireUser()

    if (user.coupleId) {
      const existing = this.db.couples.find((c) => c.id === user.coupleId)
      if (existing) {
        const invite = (await this.getActiveInvite(existing.id)) ?? (await this.regenerateInvite(existing.id))
        return { couple: existing, invite }
      }
    }

    const couple: Couple = { id: newId(), memberIds: [user.id], createdAt: new Date() }
    this.db.couples.push(couple)
    user.coupleId = couple.id
    this.persist()
    return { couple, invite: await this.regenerateInvite(couple.id) }
  }

  async getActiveInvite(coupleId: string): Promise<Invite | null> {
    this.requireMembership(coupleId)
    const now = Date.now()
    return (
      this.db.invites.find((i) => i.coupleId === coupleId && !i.redeemedBy && i.expiresAt.getTime() > now) ?? null
    )
  }

  async regenerateInvite(coupleId: string): Promise<Invite> {
    const user = this.requireMembership(coupleId)
    // Um convite vivo por vez: o código antigo morre assim que um novo nasce.
    this.db.invites = this.db.invites.filter((i) => i.coupleId !== coupleId || Boolean(i.redeemedBy))

    const invite: Invite = {
      code: newInviteCode(),
      coupleId,
      createdBy: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      redeemedBy: null,
    }
    this.db.invites.push(invite)
    this.persist()
    return invite
  }

  async redeemInvite(code: string): Promise<Couple> {
    const user = this.requireUser()
    const normalized = code.trim().toUpperCase()
    const invite = this.db.invites.find((i) => i.code === normalized)

    if (!invite) throw new RepositoryError('invalid-code', 'Código não encontrado. Confira as letras.')
    if (invite.redeemedBy) throw new RepositoryError('code-used', 'Este código já foi usado.')
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new RepositoryError('code-expired', 'Este código expirou. Peça um novo.')
    }

    const couple = this.db.couples.find((c) => c.id === invite.coupleId)
    if (!couple) throw new RepositoryError('not-found', 'Parceria não encontrada.')
    if (couple.memberIds.includes(user.id)) throw new RepositoryError('already-member', 'Vocês já estão conectados.')
    if (couple.memberIds.length >= 2) throw new RepositoryError('couple-full', 'Esta parceria já tem duas pessoas.')

    // Quem se cadastra ganha uma parceria só sua, para poder usar o app antes
    // de conectar. Se ela ainda estiver vazia, é descartada aqui — senão a
    // pessoa ficaria presa nela e nunca entraria na parceria de quem convidou.
    if (user.coupleId) {
      const propria = this.db.couples.find((c) => c.id === user.coupleId)
      const sozinha = propria?.memberIds.length === 1 && propria.memberIds[0] === user.id
      const temMetas = this.db.goals.some((g) => g.coupleId === user.coupleId)

      if (!sozinha) {
        throw new RepositoryError('already-paired', 'Você já faz parte de uma parceria com outra pessoa.')
      }
      if (temMetas) {
        throw new RepositoryError(
          'own-goals',
          'Você já tem metas na sua própria parceria. Apague-as antes de entrar nesta.',
        )
      }

      this.db.couples = this.db.couples.filter((c) => c.id !== user.coupleId)
      this.db.invites = this.db.invites.filter((i) => i.coupleId !== user.coupleId)
      this.db.activities = this.db.activities.filter((a) => a.coupleId !== user.coupleId)
    }

    couple.memberIds.push(user.id)
    user.coupleId = couple.id
    invite.redeemedBy = user.id
    this.pushActivity(couple.id, { type: 'partner_joined', actorId: user.id })
    this.persist()
    return couple
  }

  /* ── Metas ─────────────────────────────────────────────── */

  subscribeGoals(coupleId: string, callback: (goals: Goal[]) => void): Unsubscribe {
    return this.watch(() => {
      if (!this.canRead(coupleId)) return callback([])
      callback(
        this.db.goals
          .filter((g) => g.coupleId === coupleId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      )
    })
  }

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const user = this.requireUser()
    if (!user.coupleId) throw new RepositoryError('no-couple', 'Crie ou entre em uma parceria antes.')
    if (input.targetCents <= 0) throw new RepositoryError('invalid-target', 'O objetivo precisa ser maior que zero.')

    const goal: Goal = {
      id: newId(),
      coupleId: user.coupleId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      targetCents: input.targetCents,
      deadline: input.deadline,
      cover: input.cover,
      gallery: [],
      status: 'active',
      achievedAt: null,
      createdBy: user.id,
      createdAt: new Date(),
      totalCents: 0,
      perUserCents: {},
      contributionCount: 0,
    }
    this.db.goals.push(goal)
    this.pushActivity(goal.coupleId, {
      type: 'goal_created',
      actorId: user.id,
      goalId: goal.id,
      goalTitle: goal.title,
    })
    this.persist()
    return goal
  }

  async updateGoal(goalId: string, patch: UpdateGoalInput): Promise<void> {
    const goal = this.db.goals.find((g) => g.id === goalId)
    if (!goal) throw new RepositoryError('not-found', 'Meta não encontrada.')
    this.requireMembership(goal.coupleId)

    if (patch.title !== undefined) goal.title = patch.title.trim()
    if (patch.description !== undefined) goal.description = patch.description?.trim() || null
    if (patch.targetCents !== undefined) goal.targetCents = patch.targetCents
    if (patch.deadline !== undefined) goal.deadline = patch.deadline
    if (patch.cover !== undefined) goal.cover = patch.cover
    if (patch.gallery !== undefined) goal.gallery = patch.gallery

    this.refreshGoalStatus(goal)
    this.persist()
  }

  async deleteGoal(goalId: string): Promise<void> {
    const goal = this.db.goals.find((g) => g.id === goalId)
    if (!goal) return
    this.requireMembership(goal.coupleId)

    this.db.goals = this.db.goals.filter((g) => g.id !== goalId)
    this.db.contributions = this.db.contributions.filter((c) => c.goalId !== goalId)
    this.db.activities = this.db.activities.filter((a) => a.goalId !== goalId)
    this.persist()
  }

  /* ── Contribuições ─────────────────────────────────────── */

  subscribeContributions(coupleId: string, callback: (items: Contribution[]) => void): Unsubscribe {
    return this.watch(() => {
      if (!this.canRead(coupleId)) return callback([])
      callback(
        this.db.contributions
          .filter((c) => c.coupleId === coupleId)
          .sort((a, b) => b.date.getTime() - a.date.getTime()),
      )
    })
  }

  async addContribution(input: CreateContributionInput): Promise<Contribution> {
    const user = this.requireUser()
    const goal = this.db.goals.find((g) => g.id === input.goalId)
    if (!goal) throw new RepositoryError('not-found', 'Meta não encontrada.')
    this.requireMembership(goal.coupleId)
    if (input.amountCents <= 0) throw new RepositoryError('invalid-amount', 'Informe um valor maior que zero.')

    const contribution: Contribution = {
      id: newId(),
      goalId: goal.id,
      coupleId: goal.coupleId,
      userId: user.id,
      amountCents: input.amountCents,
      date: input.date,
      note: input.note?.trim() || null,
      createdAt: new Date(),
      editedAt: null,
    }
    this.db.contributions.push(contribution)

    const wasAchieved = goal.status === 'achieved'
    this.syncGoalTotals(goal)

    this.pushActivity(goal.coupleId, {
      type: 'contribution',
      actorId: user.id,
      goalId: goal.id,
      goalTitle: goal.title,
      amountCents: contribution.amountCents,
    })
    if (!wasAchieved && goal.status === 'achieved') {
      this.pushActivity(goal.coupleId, {
        type: 'goal_achieved',
        actorId: user.id,
        goalId: goal.id,
        goalTitle: goal.title,
      })
    }

    this.persist()
    return contribution
  }

  async updateContribution(id: string, patch: UpdateContributionInput): Promise<void> {
    const user = this.requireUser()
    const contribution = this.db.contributions.find((c) => c.id === id)
    if (!contribution) throw new RepositoryError('not-found', 'Contribuição não encontrada.')
    // A regra central do app: cada um mexe apenas no que registrou.
    if (contribution.userId !== user.id) {
      throw new RepositoryError('permission-denied', 'Só quem registrou pode alterar esta contribuição.')
    }

    if (patch.amountCents !== undefined) {
      if (patch.amountCents <= 0) throw new RepositoryError('invalid-amount', 'Informe um valor maior que zero.')
      contribution.amountCents = patch.amountCents
    }
    if (patch.date !== undefined) contribution.date = patch.date
    if (patch.note !== undefined) contribution.note = patch.note?.trim() || null
    contribution.editedAt = new Date()

    const goal = this.db.goals.find((g) => g.id === contribution.goalId)
    if (goal) this.syncGoalTotals(goal)
    this.persist()
  }

  async deleteContribution(id: string): Promise<void> {
    const user = this.requireUser()
    const contribution = this.db.contributions.find((c) => c.id === id)
    if (!contribution) return
    if (contribution.userId !== user.id) {
      throw new RepositoryError('permission-denied', 'Só quem registrou pode apagar esta contribuição.')
    }

    this.db.contributions = this.db.contributions.filter((c) => c.id !== id)
    const goal = this.db.goals.find((g) => g.id === contribution.goalId)
    if (goal) this.syncGoalTotals(goal)
    this.persist()
  }

  /* ── Fotos ─────────────────────────────────────────────── */

  async uploadPhoto(blob: Blob): Promise<PhotoRef> {
    this.requireUser()
    // Sem bucket no modo local: a imagem vira data URL e mora no navegador.
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new RepositoryError('read-failed', 'Falha ao ler a imagem.'))
      reader.readAsDataURL(blob)
    })
    return { id: newId(), kind: 'upload', src, focalX: 0.5, focalY: 0.5 }
  }

  /* ── Notificações ──────────────────────────────────────── */

  async savePushSubscription(record: PushSubscriptionRecord): Promise<void> {
    const user = this.requireUser()
    this.db.pushSubscriptions = this.db.pushSubscriptions.filter((s) => s.id !== record.id)
    this.db.pushSubscriptions.push({ ...record, coupleId: user.coupleId, userId: user.id })
    this.persist()
  }

  async removePushSubscription(id: string): Promise<void> {
    const user = this.requireUser()
    this.db.pushSubscriptions = this.db.pushSubscriptions.filter(
      (s) => !(s.id === id && s.userId === user.id),
    )
    this.persist()
  }

  async listPartnerPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
    const user = this.requireUser()
    if (!user.coupleId) return []
    const couple = this.db.couples.find((c) => c.id === user.coupleId)
    const partnerId = couple?.memberIds.find((id) => id !== user.id)
    if (!partnerId) return []
    return this.db.pushSubscriptions.filter((s) => s.userId === partnerId)
  }

  /* ── Novidades ─────────────────────────────────────────── */

  subscribeActivities(coupleId: string, callback: (items: Activity[]) => void): Unsubscribe {
    return this.watch(() => {
      if (!this.canRead(coupleId)) return callback([])
      callback(
        this.db.activities
          .filter((a) => a.coupleId === coupleId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 60),
      )
    })
  }

  async markActivitiesRead(coupleId: string): Promise<void> {
    const user = this.requireMembership(coupleId)
    for (const activity of this.db.activities) {
      if (activity.coupleId === coupleId && !activity.readBy.includes(user.id)) {
        activity.readBy.push(user.id)
      }
    }
    this.persist()
  }

  /* ── Internos ──────────────────────────────────────────── */

  private canRead(coupleId: string): boolean {
    try {
      this.requireMembership(coupleId)
      return true
    } catch {
      return false
    }
  }

  private pushActivity(
    coupleId: string,
    input: {
      type: Activity['type']
      actorId: string
      goalId?: string
      goalTitle?: string
      amountCents?: number
    },
  ) {
    this.db.activities.push({
      id: newId(),
      coupleId,
      type: input.type,
      actorId: input.actorId,
      goalId: input.goalId ?? null,
      goalTitle: input.goalTitle ?? null,
      amountCents: input.amountCents ?? null,
      createdAt: new Date(),
      // Quem agiu já viu: ninguém é notificado do próprio aporte.
      readBy: [input.actorId],
    })
  }

  private syncGoalTotals(goal: Goal) {
    const contributions = this.db.contributions.filter((c) => c.goalId === goal.id)
    Object.assign(goal, recomputeTotals(contributions))
    this.refreshGoalStatus(goal)
  }

  private refreshGoalStatus(goal: Goal) {
    const achieved = goal.targetCents > 0 && goal.totalCents >= goal.targetCents
    if (achieved && goal.status !== 'achieved') {
      goal.status = 'achieved'
      goal.achievedAt = new Date()
    } else if (!achieved && goal.status === 'achieved') {
      // Um aporte editado para baixo pode desfazer a conquista.
      goal.status = 'active'
      goal.achievedAt = null
    }
  }
}
