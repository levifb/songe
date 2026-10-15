import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateAuthProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  Timestamp,
  arrayUnion,
  writeBatch,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  limit as queryLimit,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import { newId, newInviteCode } from '@/lib/id'
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
import {
  RepositoryError,
  type CreateContributionInput,
  type CreateGoalInput,
  type Repository,
  type Unsubscribe,
  type UpdateContributionInput,
  type UpdateGoalInput,
} from '../repository'
import { auth, db, storage } from './config'
import { avatarPath, goalPhotoPath, paths } from './paths'
import {
  fromPhoto,
  toDate,
  readActivity,
  readContribution,
  readCouple,
  readGoal,
  readInvite,
  readUser,
} from './mappers'

const INVITE_TTL_MS = 48 * 60 * 60 * 1000
const ACTIVITY_LIMIT = 60

/** Mensagens do Firebase são em inglês e técnicas; aqui viram frases nossas. */
function translate(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error
  const code = (error as { code?: string })?.code ?? ''

  switch (code) {
    case 'auth/email-already-in-use':
      return new RepositoryError('email-in-use', 'Já existe uma conta com este e-mail.')
    case 'auth/invalid-email':
      return new RepositoryError('invalid-email', 'Esse e-mail não parece válido.')
    case 'auth/weak-password':
      return new RepositoryError('weak-password', 'A senha precisa de pelo menos 6 caracteres.')
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new RepositoryError('invalid-credentials', 'E-mail ou senha incorretos.')
    case 'auth/too-many-requests':
      return new RepositoryError('rate-limited', 'Muitas tentativas. Espere um minuto e tente de novo.')
    case 'auth/network-request-failed':
      return new RepositoryError('offline', 'Sem conexão. Tente de novo quando a internet voltar.')
    case 'permission-denied':
      return new RepositoryError('permission-denied', 'Você não tem permissão para isso.')
    case 'unavailable':
      return new RepositoryError('offline', 'Sem conexão com o servidor.')
    default:
      return new RepositoryError('unknown', 'Algo deu errado. Tente de novo.')
  }
}

/**
 * Implementação real: Firebase Auth, Firestore e Storage.
 *
 * O que esta classe NÃO faz é tão importante quanto o que ela faz: ela não é a
 * dona da segurança. Toda checagem aqui existe para dar mensagem decente ao
 * usuário. Quem realmente barra acesso indevido são as regras em
 * `firestore.rules` — elas rodam no servidor e não dependem deste código.
 */
export class FirebaseRepository implements Repository {
  private cachedUser: User | null = null

  private requireUid(): string {
    const uid = auth().currentUser?.uid
    if (!uid) throw new RepositoryError('unauthenticated', 'Sessão expirada. Entre novamente.')
    return uid
  }

  private requireCoupleId(): string {
    const coupleId = this.cachedUser?.coupleId
    if (!coupleId) throw new RepositoryError('no-couple', 'Crie ou entre em uma parceria antes.')
    return coupleId
  }

  /* ── Autenticação ──────────────────────────────────────── */

  onAuthChange(callback: (user: User | null) => void): Unsubscribe {
    let stopProfile: Unsubscribe | null = null

    const stopAuth = onAuthStateChanged(auth(), (firebaseUser: FirebaseUser | null) => {
      stopProfile?.()
      stopProfile = null

      if (!firebaseUser) {
        this.cachedUser = null
        callback(null)
        return
      }

      // O perfil fica em escuta: se a parceria mudar em outro aparelho,
      // esta sessão descobre sozinha.
      stopProfile = onSnapshot(
        paths.user(db(), firebaseUser.uid),
        (snapshot) => {
          const user = snapshot.exists() ? readUser(snapshot) : null
          this.cachedUser = user
          callback(user)
        },
        () => callback(null),
      )
    })

    return () => {
      stopProfile?.()
      stopAuth()
    }
  }

  async signUp({ name, email, password }: { name: string; email: string; password: string }): Promise<User> {
    try {
      const credential = await createUserWithEmailAndPassword(auth(), email.trim(), password)
      const trimmedName = name.trim()
      await updateAuthProfile(credential.user, { displayName: trimmedName })

      const user: User = {
        id: credential.user.uid,
        name: trimmedName,
        email: email.trim().toLowerCase(),
        photoUrl: null,
        coupleId: null,
        createdAt: new Date(),
      }

      await setDoc(paths.user(db(), user.id), {
        name: user.name,
        email: user.email,
        photoUrl: null,
        coupleId: null,
        createdAt: Timestamp.now(),
      })

      this.cachedUser = user
      return user
    } catch (error) {
      throw translate(error)
    }
  }

  async signIn({ email, password }: { email: string; password: string }): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(auth(), email.trim(), password)
      const snapshot = await getDoc(paths.user(db(), credential.user.uid))
      const user = snapshot.exists() ? readUser(snapshot) : null
      if (!user) throw new RepositoryError('not-found', 'Conta sem perfil. Fale comigo.')
      this.cachedUser = user
      return user
    } catch (error) {
      throw translate(error)
    }
  }

  async signOut(): Promise<void> {
    this.cachedUser = null
    await firebaseSignOut(auth())
  }

  async updateProfile(patch: { name?: string; photoUrl?: string | null }): Promise<void> {
    const uid = this.requireUid()
    const update: Record<string, unknown> = {}
    if (patch.name !== undefined) update.name = patch.name.trim()
    if (patch.photoUrl !== undefined) update.photoUrl = patch.photoUrl
    if (Object.keys(update).length === 0) return

    try {
      await updateDoc(paths.user(db(), uid), update)
      if (patch.name !== undefined && auth().currentUser) {
        await updateAuthProfile(auth().currentUser!, { displayName: patch.name.trim() })
      }
    } catch (error) {
      throw translate(error)
    }
  }

  /* ── Parceria ──────────────────────────────────────────── */

  async getCouple(coupleId: string): Promise<Couple | null> {
    try {
      const snapshot = await getDoc(paths.couple(db(), coupleId))
      return snapshot.exists() ? readCouple(snapshot) : null
    } catch (error) {
      throw translate(error)
    }
  }

  async getMembers(coupleId: string): Promise<User[]> {
    try {
      const couple = await this.getCouple(coupleId)
      if (!couple) return []

      const snapshots = await Promise.all(
        couple.memberIds.map((id) => getDoc(paths.user(db(), id))),
      )
      return snapshots
        .filter((snapshot) => snapshot.exists())
        .map((snapshot) => readUser(snapshot))
        .filter((user): user is User => user !== null)
    } catch (error) {
      throw translate(error)
    }
  }

  async createCouple(): Promise<{ couple: Couple; invite: Invite }> {
    const uid = this.requireUid()

    try {
      if (this.cachedUser?.coupleId) {
        const existing = await this.getCouple(this.cachedUser.coupleId)
        if (existing) {
          const invite = (await this.getActiveInvite(existing.id)) ?? (await this.regenerateInvite(existing.id))
          return { couple: existing, invite }
        }
      }

      const coupleId = newId()
      const couple: Couple = { id: coupleId, memberIds: [uid], createdAt: new Date() }

      await setDoc(paths.couple(db(), coupleId), {
        memberIds: [uid],
        createdAt: Timestamp.now(),
        activeInviteCode: null,
      })
      await updateDoc(paths.user(db(), uid), { coupleId })
      if (this.cachedUser) this.cachedUser = { ...this.cachedUser, coupleId }

      return { couple, invite: await this.regenerateInvite(coupleId) }
    } catch (error) {
      throw translate(error)
    }
  }

  /**
   * O código ativo fica apontado no documento do casal. Sem isso, achar o
   * convite exigiria uma consulta na coleção `invites` — e regra de segurança
   * não consegue inspecionar o filtro de uma consulta, o que obrigaria a
   * liberar a listagem de todos os convites de todos os casais.
   */
  async getActiveInvite(coupleId: string): Promise<Invite | null> {
    try {
      const coupleSnapshot = await getDoc(paths.couple(db(), coupleId))
      const code = coupleSnapshot.data()?.activeInviteCode
      if (typeof code !== 'string' || !code) return null

      const inviteSnapshot = await getDoc(paths.invite(db(), code))
      if (!inviteSnapshot.exists()) return null

      const invite = readInvite(inviteSnapshot)
      if (!invite || invite.redeemedBy || invite.expiresAt.getTime() <= Date.now()) return null
      return invite
    } catch (error) {
      throw translate(error)
    }
  }

  async regenerateInvite(coupleId: string): Promise<Invite> {
    const uid = this.requireUid()

    try {
      // Um convite vivo por vez: o anterior morre antes de o novo nascer.
      const coupleSnapshot = await getDoc(paths.couple(db(), coupleId))
      const previousCode = coupleSnapshot.data()?.activeInviteCode
      if (typeof previousCode === 'string' && previousCode) {
        await deleteDoc(paths.invite(db(), previousCode)).catch(() => {})
      }

      const invite: Invite = {
        code: newInviteCode(),
        coupleId,
        createdBy: uid,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        redeemedBy: null,
      }

      await setDoc(paths.invite(db(), invite.code), {
        coupleId: invite.coupleId,
        createdBy: invite.createdBy,
        createdAt: Timestamp.fromDate(invite.createdAt),
        expiresAt: Timestamp.fromDate(invite.expiresAt),
        redeemedBy: null,
      })
      await updateDoc(paths.couple(db(), coupleId), { activeInviteCode: invite.code })

      return invite
    } catch (error) {
      throw translate(error)
    }
  }

  /**
   * Entrar na parceria de alguém usando o código.
   *
   * Duas armadilhas moram aqui, e as duas custaram um defeito em produção:
   *
   * 1. NÃO se pode ler o documento do casal antes de entrar. Quem ainda não é
   *    membro não tem permissão de leitura — e nem precisa: o convite já diz
   *    qual é a parceria, o `arrayUnion` monta a nova lista no servidor, e a
   *    regra do Firestore valida tudo lá. Ler antes só dava "permissão negada".
   *
   * 2. Quem se cadastra ganha automaticamente uma parceria só sua, para poder
   *    usar o app antes de conectar. Se essa parceria solitária ainda estiver
   *    vazia, ela é descartada aqui — senão a pessoa ficaria presa nela e
   *    jamais conseguiria entrar na parceria de quem a convidou.
   */
  async redeemInvite(code: string): Promise<Couple> {
    const uid = this.requireUid()
    const normalized = code.trim().toUpperCase()

    try {
      const inviteSnapshot = await getDoc(paths.invite(db(), normalized))
      if (!inviteSnapshot.exists()) {
        throw new RepositoryError('invalid-code', 'Código não encontrado. Confira as letras.')
      }

      const invite = readInvite(inviteSnapshot)!
      if (invite.redeemedBy) throw new RepositoryError('code-used', 'Este código já foi usado.')
      if (invite.expiresAt.getTime() < Date.now()) {
        throw new RepositoryError('code-expired', 'Este código expirou. Peça um novo.')
      }

      const userSnapshot = await getDoc(paths.user(db(), uid))
      const parceriaAtual = userSnapshot.data()?.coupleId as string | undefined

      if (parceriaAtual === invite.coupleId) {
        throw new RepositoryError('already-member', 'Vocês já estão conectados.')
      }

      const situacao = parceriaAtual ? await this.inspectOwnCouple(parceriaAtual, uid) : 'descartavel'
      if (situacao === 'tem-parceiro') {
        throw new RepositoryError('already-paired', 'Você já faz parte de uma parceria com outra pessoa.')
      }
      if (situacao === 'tem-metas') {
        throw new RepositoryError(
          'own-goals',
          'Você já tem metas na sua própria parceria. Apague-as antes de entrar nesta.',
        )
      }

      const batch = writeBatch(db())
      batch.update(paths.couple(db(), invite.coupleId), {
        memberIds: arrayUnion(uid),
        // A regra do Firestore lê este campo para confirmar que a entrada
        // foi autorizada por um convite válido.
        joinedWithCode: normalized,
        activeInviteCode: null,
      })
      batch.update(paths.invite(db(), normalized), { redeemedBy: uid })
      batch.update(paths.user(db(), uid), { coupleId: invite.coupleId })
      await batch.commit()

      if (this.cachedUser) this.cachedUser = { ...this.cachedUser, coupleId: invite.coupleId }

      // Agora que ela é membro, a leitura é permitida.
      const coupleSnapshot = await getDoc(paths.couple(db(), invite.coupleId))
      const couple = readCouple(coupleSnapshot)
      if (!couple) throw new RepositoryError('not-found', 'Parceria não encontrada.')

      // Limpeza da parceria solitária abandonada. Falhar aqui deixa um
      // documento órfão e inofensivo — nunca deve derrubar a conexão.
      if (parceriaAtual) await this.discardSoloCouple(parceriaAtual).catch(() => {})

      await this.writeActivity(couple.id, { type: 'partner_joined', actorId: uid })
      return couple
    } catch (error) {
      throw translate(error)
    }
  }

  /** Só uma parceria sua, sozinha e sem metas pode ser abandonada sem perda. */
  private async inspectOwnCouple(
    coupleId: string,
    uid: string,
  ): Promise<'descartavel' | 'tem-parceiro' | 'tem-metas'> {
    try {
      const coupleSnapshot = await getDoc(paths.couple(db(), coupleId))
      const couple = readCouple(coupleSnapshot)
      if (!couple) return 'descartavel'
      if (couple.memberIds.length !== 1 || couple.memberIds[0] !== uid) return 'tem-parceiro'

      const goals = await getDocs(query(paths.goals(db(), coupleId), queryLimit(1)))
      return goals.empty ? 'descartavel' : 'tem-metas'
    } catch {
      // Sem conseguir confirmar que está vazia, o seguro é não descartar nada.
      return 'tem-metas'
    }
  }

  private async discardSoloCouple(coupleId: string): Promise<void> {
    const coupleSnapshot = await getDoc(paths.couple(db(), coupleId))
    const codigo = coupleSnapshot.data()?.activeInviteCode
    if (typeof codigo === 'string' && codigo) {
      await deleteDoc(paths.invite(db(), codigo)).catch(() => {})
    }
    await deleteDoc(paths.couple(db(), coupleId))
  }

  /* ── Metas ─────────────────────────────────────────────── */

  subscribeGoals(coupleId: string, callback: (goals: Goal[]) => void): Unsubscribe {
    return onSnapshot(
      query(paths.goals(db(), coupleId), orderBy('createdAt', 'desc')),
      (snapshot) => callback(snapshot.docs.map((document) => readGoal(document, coupleId))),
      () => callback([]),
    )
  }

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const uid = this.requireUid()
    const coupleId = this.requireCoupleId()
    if (input.targetCents <= 0) {
      throw new RepositoryError('invalid-target', 'O objetivo precisa ser maior que zero.')
    }

    const goal: Goal = {
      id: newId(),
      coupleId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      targetCents: input.targetCents,
      deadline: input.deadline,
      cover: input.cover,
      gallery: [],
      status: 'active',
      achievedAt: null,
      createdBy: uid,
      createdAt: new Date(),
      totalCents: 0,
      // As duas fatias nascem zeradas: a regra do banco compara com o valor
      // anterior, e um campo ausente tornaria essa comparação frágil.
      perUserCents: { [uid]: 0 },
      contributionCount: 0,
    }

    try {
      await setDoc(paths.goal(db(), coupleId, goal.id), {
        title: goal.title,
        description: goal.description,
        targetCents: goal.targetCents,
        deadline: goal.deadline ? Timestamp.fromDate(goal.deadline) : null,
        cover: fromPhoto(goal.cover),
        gallery: [],
        status: 'active',
        achievedAt: null,
        createdBy: uid,
        createdAt: Timestamp.now(),
        totalCents: 0,
        perUserCents: goal.perUserCents,
        contributionCount: 0,
      })

      await this.writeActivity(coupleId, {
        type: 'goal_created',
        actorId: uid,
        goalId: goal.id,
        goalTitle: goal.title,
      })
      return goal
    } catch (error) {
      throw translate(error)
    }
  }

  async updateGoal(goalId: string, patch: UpdateGoalInput): Promise<void> {
    const coupleId = this.requireCoupleId()
    const update: Record<string, unknown> = {}

    if (patch.title !== undefined) update.title = patch.title.trim()
    if (patch.description !== undefined) update.description = patch.description?.trim() || null
    if (patch.targetCents !== undefined) update.targetCents = patch.targetCents
    if (patch.deadline !== undefined) {
      update.deadline = patch.deadline ? Timestamp.fromDate(patch.deadline) : null
    }
    if (patch.cover !== undefined) update.cover = fromPhoto(patch.cover)
    if (patch.gallery !== undefined) {
      update.gallery = patch.gallery.map(fromPhoto).filter(Boolean)
    }
    if (Object.keys(update).length === 0) return

    try {
      // Mudar o objetivo pode concluir ou reabrir a meta.
      await runTransaction(db(), async (transaction) => {
        const goalRef = paths.goal(db(), coupleId, goalId)
        const snapshot = await transaction.get(goalRef)
        if (!snapshot.exists()) throw new RepositoryError('not-found', 'Meta não encontrada.')

        const goal = readGoal(snapshot as never, coupleId)
        const target = (update.targetCents as number | undefined) ?? goal.targetCents
        transaction.update(goalRef, { ...update, ...statusFields(goal.totalCents, target, goal.status) })
      })
    } catch (error) {
      throw translate(error)
    }
  }

  async deleteGoal(goalId: string): Promise<void> {
    const coupleId = this.requireCoupleId()

    try {
      // Sem função de servidor, a limpeza é feita aqui. Para duas pessoas o
      // volume é pequeno; se um dia crescer, isto vira uma Cloud Function.
      const [contributions, activities] = await Promise.all([
        getDocs(query(paths.contributions(db(), coupleId), where('goalId', '==', goalId))),
        getDocs(query(paths.activities(db(), coupleId), where('goalId', '==', goalId))),
      ])

      await Promise.all([
        ...contributions.docs.map((document) => deleteDoc(document.ref)),
        ...activities.docs.map((document) => deleteDoc(document.ref)),
      ])
      await deleteDoc(paths.goal(db(), coupleId, goalId))
    } catch (error) {
      throw translate(error)
    }
  }

  /* ── Contribuições ─────────────────────────────────────── */

  subscribeContributions(coupleId: string, callback: (items: Contribution[]) => void): Unsubscribe {
    return onSnapshot(
      query(paths.contributions(db(), coupleId), orderBy('date', 'desc')),
      (snapshot) => callback(snapshot.docs.map((document) => readContribution(document, coupleId))),
      () => callback([]),
    )
  }

  async addContribution(input: CreateContributionInput): Promise<Contribution> {
    const uid = this.requireUid()
    const coupleId = this.requireCoupleId()
    if (input.amountCents <= 0) {
      throw new RepositoryError('invalid-amount', 'Informe um valor maior que zero.')
    }

    const contribution: Contribution = {
      id: newId(),
      goalId: input.goalId,
      coupleId,
      userId: uid,
      amountCents: input.amountCents,
      date: input.date,
      note: input.note?.trim() || null,
      createdAt: new Date(),
      editedAt: null,
    }

    try {
      const { goalTitle, becameAchieved } = await runTransaction(db(), async (transaction) => {
        const goalRef = paths.goal(db(), coupleId, input.goalId)
        const snapshot = await transaction.get(goalRef)
        if (!snapshot.exists()) throw new RepositoryError('not-found', 'Meta não encontrada.')

        const goal = readGoal(snapshot as never, coupleId)
        const nextTotal = goal.totalCents + input.amountCents

        transaction.set(paths.contribution(db(), coupleId, contribution.id), {
          goalId: contribution.goalId,
          userId: uid,
          amountCents: contribution.amountCents,
          date: Timestamp.fromDate(contribution.date),
          note: contribution.note,
          createdAt: Timestamp.now(),
          editedAt: null,
        })

        transaction.update(goalRef, {
          totalCents: increment(input.amountCents),
          [`perUserCents.${uid}`]: increment(input.amountCents),
          contributionCount: increment(1),
          ...statusFields(nextTotal, goal.targetCents, goal.status),
        })

        return {
          goalTitle: goal.title,
          becameAchieved: goal.status !== 'achieved' && nextTotal >= goal.targetCents && goal.targetCents > 0,
        }
      })

      await this.writeActivity(coupleId, {
        type: 'contribution',
        actorId: uid,
        goalId: input.goalId,
        goalTitle,
        amountCents: input.amountCents,
      })
      if (becameAchieved) {
        await this.writeActivity(coupleId, {
          type: 'goal_achieved',
          actorId: uid,
          goalId: input.goalId,
          goalTitle,
        })
      }

      return contribution
    } catch (error) {
      throw translate(error)
    }
  }

  async updateContribution(id: string, patch: UpdateContributionInput): Promise<void> {
    const uid = this.requireUid()
    const coupleId = this.requireCoupleId()

    try {
      await runTransaction(db(), async (transaction) => {
        const contributionRef = paths.contribution(db(), coupleId, id)
        const snapshot = await transaction.get(contributionRef)
        if (!snapshot.exists()) throw new RepositoryError('not-found', 'Contribuição não encontrada.')

        const contribution = readContribution(snapshot as never, coupleId)
        if (contribution.userId !== uid) {
          throw new RepositoryError('permission-denied', 'Só quem registrou pode alterar esta contribuição.')
        }

        const nextAmount = patch.amountCents ?? contribution.amountCents
        if (nextAmount <= 0) throw new RepositoryError('invalid-amount', 'Informe um valor maior que zero.')
        const delta = nextAmount - contribution.amountCents

        const goalRef = paths.goal(db(), coupleId, contribution.goalId)
        const goalSnapshot = await transaction.get(goalRef)
        if (!goalSnapshot.exists()) throw new RepositoryError('not-found', 'Meta não encontrada.')
        const goal = readGoal(goalSnapshot as never, coupleId)

        const update: Record<string, unknown> = { editedAt: Timestamp.now() }
        if (patch.amountCents !== undefined) update.amountCents = nextAmount
        if (patch.date !== undefined) update.date = Timestamp.fromDate(patch.date)
        if (patch.note !== undefined) update.note = patch.note?.trim() || null
        transaction.update(contributionRef, update)

        if (delta !== 0) {
          transaction.update(goalRef, {
            totalCents: increment(delta),
            [`perUserCents.${uid}`]: increment(delta),
            ...statusFields(goal.totalCents + delta, goal.targetCents, goal.status),
          })
        }
      })
    } catch (error) {
      throw translate(error)
    }
  }

  async deleteContribution(id: string): Promise<void> {
    const uid = this.requireUid()
    const coupleId = this.requireCoupleId()

    try {
      await runTransaction(db(), async (transaction) => {
        const contributionRef = paths.contribution(db(), coupleId, id)
        const snapshot = await transaction.get(contributionRef)
        if (!snapshot.exists()) return

        const contribution = readContribution(snapshot as never, coupleId)
        if (contribution.userId !== uid) {
          throw new RepositoryError('permission-denied', 'Só quem registrou pode apagar esta contribuição.')
        }

        const goalRef = paths.goal(db(), coupleId, contribution.goalId)
        const goalSnapshot = await transaction.get(goalRef)
        transaction.delete(contributionRef)

        if (goalSnapshot.exists()) {
          const goal = readGoal(goalSnapshot as never, coupleId)
          const nextTotal = goal.totalCents - contribution.amountCents
          transaction.update(goalRef, {
            totalCents: increment(-contribution.amountCents),
            [`perUserCents.${uid}`]: increment(-contribution.amountCents),
            contributionCount: increment(-1),
            ...statusFields(nextTotal, goal.targetCents, goal.status),
          })
        }
      })
    } catch (error) {
      throw translate(error)
    }
  }

  /* ── Fotos ─────────────────────────────────────────────── */

  async uploadPhoto(blob: Blob, purpose: 'goalCover' | 'avatar'): Promise<PhotoRef> {
    const uid = this.requireUid()
    const photoId = newId()
    const path =
      purpose === 'avatar' ? avatarPath(uid, photoId) : goalPhotoPath(this.requireCoupleId(), photoId)

    try {
      const reference = storageRef(storage(), path)
      await uploadBytes(reference, blob, {
        contentType: 'image/webp',
        // Um ano de cache: a URL contém um id único, então nunca aponta
        // para uma imagem diferente.
        cacheControl: 'public, max-age=31536000, immutable',
      })

      return {
        id: photoId,
        kind: 'upload',
        src: await getDownloadURL(reference),
        focalX: 0.5,
        focalY: 0.5,
      }
    } catch (error) {
      throw translate(error)
    }
  }

  /* ── Notificações ──────────────────────────────────────── */

  async savePushSubscription(record: PushSubscriptionRecord): Promise<void> {
    const uid = this.requireUid()
    try {
      await setDoc(paths.pushSubscription(db(), uid, record.id), {
        endpoint: record.endpoint,
        p256dh: record.p256dh,
        auth: record.auth,
        device: record.device,
        coupleId: this.cachedUser?.coupleId ?? null,
        createdAt: Timestamp.fromDate(record.createdAt),
      })
    } catch (error) {
      throw translate(error)
    }
  }

  async removePushSubscription(id: string): Promise<void> {
    const uid = this.requireUid()
    try {
      await deleteDoc(paths.pushSubscription(db(), uid, id))
    } catch (error) {
      throw translate(error)
    }
  }

  async listPartnerPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
    const uid = this.requireUid()
    const coupleId = this.cachedUser?.coupleId
    if (!coupleId) return []

    try {
      const couple = await this.getCouple(coupleId)
      const partnerId = couple?.memberIds.find((id) => id !== uid)
      if (!partnerId) return []

      const snapshot = await getDocs(paths.pushSubscriptions(db(), partnerId))
      return snapshot.docs.map((document) => {
        const data = document.data()
        return {
          id: document.id,
          endpoint: String(data.endpoint ?? ''),
          p256dh: String(data.p256dh ?? ''),
          auth: String(data.auth ?? ''),
          device: String(data.device ?? ''),
          coupleId: typeof data.coupleId === 'string' ? data.coupleId : null,
          createdAt: toDate(data.createdAt),
        }
      })
    } catch {
      // Não conseguir avisar o parceiro nunca pode quebrar o registro em si.
      return []
    }
  }

  /* ── Novidades ─────────────────────────────────────────── */

  subscribeActivities(coupleId: string, callback: (items: Activity[]) => void): Unsubscribe {
    return onSnapshot(
      query(paths.activities(db(), coupleId), orderBy('createdAt', 'desc'), queryLimit(ACTIVITY_LIMIT)),
      (snapshot) => callback(snapshot.docs.map((document) => readActivity(document, coupleId))),
      () => callback([]),
    )
  }

  async markActivitiesRead(coupleId: string): Promise<void> {
    const uid = this.requireUid()

    try {
      const snapshot = await getDocs(
        query(
          paths.activities(db(), coupleId),
          orderBy('createdAt', 'desc'),
          queryLimit(ACTIVITY_LIMIT),
        ),
      )
      const unread = snapshot.docs.filter((document) => {
        const readBy = document.data().readBy
        return !Array.isArray(readBy) || !readBy.includes(uid)
      })
      await Promise.all(unread.map((document) => updateDoc(document.ref, { readBy: arrayUnion(uid) })))
    } catch (error) {
      throw translate(error)
    }
  }

  /* ── Internos ──────────────────────────────────────────── */

  private async writeActivity(
    coupleId: string,
    input: {
      type: Activity['type']
      actorId: string
      goalId?: string
      goalTitle?: string
      amountCents?: number
    },
  ): Promise<void> {
    const id = newId()
    await setDoc(doc(paths.activities(db(), coupleId), id), {
      type: input.type,
      actorId: input.actorId,
      goalId: input.goalId ?? null,
      goalTitle: input.goalTitle ?? null,
      amountCents: input.amountCents ?? null,
      createdAt: Timestamp.now(),
      // Quem agiu já viu: ninguém é notificado do próprio registro.
      readBy: [input.actorId],
    })
  }
}

/** Conclui ou reabre a meta conforme o total cruza o objetivo. */
function statusFields(
  totalCents: number,
  targetCents: number,
  currentStatus: Goal['status'],
): Record<string, unknown> {
  const achieved = targetCents > 0 && totalCents >= targetCents

  if (achieved && currentStatus !== 'achieved') {
    return { status: 'achieved', achievedAt: Timestamp.now() }
  }
  if (!achieved && currentStatus === 'achieved') {
    // Um aporte editado para baixo desfaz a conquista.
    return { status: 'active', achievedAt: deleteField() }
  }
  return {}
}
