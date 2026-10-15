import type { Cents } from '@/lib/money'

export interface User {
  id: string
  name: string
  email: string
  photoUrl: string | null
  coupleId: string | null
  createdAt: Date
}

export interface Couple {
  id: string
  /** Exatamente dois. A regra do banco recusa um terceiro. */
  memberIds: string[]
  createdAt: Date
}

export interface Invite {
  code: string
  coupleId: string
  createdBy: string
  createdAt: Date
  expiresAt: Date
  redeemedBy: string | null
}

/**
 * Uma foto pode vir da biblioteca embutida ou do celular de vocês.
 * O ponto focal guarda onde está o assunto da imagem, para que o
 * recorte em proporções diferentes nunca corte o que importa.
 */
export interface PhotoRef {
  id: string
  kind: 'preset' | 'upload'
  src: string
  /** 0..1 — 0.5/0.5 é o centro. */
  focalX: number
  focalY: number
  /** Crédito da biblioteca livre; vazio nas fotos de vocês. */
  credit?: string
}

export type GoalStatus = 'active' | 'achieved'

export interface Goal {
  id: string
  coupleId: string
  title: string
  description: string | null
  targetCents: Cents
  /** Opcional. Com prazo, o app mostra o ritmo necessário. */
  deadline: Date | null
  cover: PhotoRef | null
  gallery: PhotoRef[]
  status: GoalStatus
  achievedAt: Date | null
  createdBy: string
  createdAt: Date

  /** Agregados mantidos na própria meta — o dashboard abre sem varrer aportes. */
  totalCents: Cents
  perUserCents: Record<string, Cents>
  contributionCount: number
}

export interface Contribution {
  id: string
  goalId: string
  coupleId: string
  /** Dono do aporte. Só ele edita, só ele apaga. */
  userId: string
  amountCents: Cents
  date: Date
  note: string | null
  createdAt: Date
  editedAt: Date | null
}

export type ActivityType = 'contribution' | 'goal_created' | 'goal_achieved' | 'partner_joined'

export interface Activity {
  id: string
  coupleId: string
  type: ActivityType
  actorId: string
  goalId: string | null
  goalTitle: string | null
  amountCents: Cents | null
  createdAt: Date
  /** Quem já viu. Alimenta o badge de novidades. */
  readBy: string[]
}

/**
 * Uma assinatura de push por aparelho. O endpoint é a "caixa postal" que o
 * navegador cria; as chaves criptografam o conteúdo do aviso.
 */
export interface PushSubscriptionRecord {
  /** Derivado do endpoint, para não duplicar o mesmo aparelho. */
  id: string
  endpoint: string
  p256dh: string
  auth: string
  device: string
  /** Gravado junto para que a regra do banco confirme a parceria de uma vez. */
  coupleId: string | null
  createdAt: Date
}
