import { beforeEach, describe, expect, it } from 'vitest'
import { LocalRepository } from './localRepository'
import { RepositoryError } from './repository'

/**
 * Estes testes descrevem as permissões do Songe.
 *
 * O `LocalRepository` repete as mesmas regras que o `firestore.rules` impõe no
 * servidor, então o que passa aqui é o comportamento esperado nos dois lados.
 * As regras do Firestore têm a sua própria bateria em `tests/rules`, que roda
 * contra o emulador de verdade.
 */

/**
 * As assinaturas do repositório entregam o valor atual na hora, de forma
 * síncrona. Este atalho pega essa primeira entrega e já se desinscreve.
 */
function lerAgora<T>(subscribe: (callback: (value: T) => void) => () => void): T {
  let capturado!: T
  const parar = subscribe((value) => {
    capturado = value
  })
  parar()
  return capturado
}

let repo: LocalRepository

beforeEach(() => {
  repo = new LocalRepository()
})

async function novaConta(nome: string, email: string) {
  return repo.signUp({ name: nome, email, password: 'senha123' })
}

/** Cria o casal completo e devolve os dois usuários já com a parceria. */
async function casalConectado() {
  await novaConta('Primeiro', 'primeiro@teste.com')
  const { couple, invite } = await repo.createCouple()

  await novaConta('Segundo', 'segundo@teste.com')
  await repo.redeemInvite(invite.code)

  // Os objetos devolvidos por signUp são anteriores à parceria — relemos os
  // dois para que venham com o coupleId preenchido. A sessão termina no
  // primeiro, que é quem a maioria dos cenários usa em seguida.
  const segundo = await entrarComo('segundo@teste.com')
  const primeiro = await entrarComo('primeiro@teste.com')

  return { primeiro, segundo, coupleId: couple.id }
}

/** Entra como alguém que já existe. A senha é sempre a mesma nos testes. */
async function entrarComo(email: string) {
  return repo.signIn({ email, password: 'senha123' })
}

describe('autenticação', () => {
  it('cria a conta e já deixa a pessoa logada', async () => {
    const user = await novaConta('Levi', 'levi@teste.com')
    expect(user.name).toBe('Levi')
    expect(user.coupleId).toBeNull()
  })

  it('recusa e-mail repetido', async () => {
    await novaConta('Levi', 'levi@teste.com')
    await repo.signOut()
    await expect(novaConta('Outro', 'levi@teste.com')).rejects.toThrow(RepositoryError)
  })

  it('recusa senha curta demais', async () => {
    await expect(
      repo.signUp({ name: 'Levi', email: 'a@teste.com', password: '123' }),
    ).rejects.toThrow(/6 caracteres/)
  })

  it('não confunde maiúsculas no e-mail', async () => {
    await novaConta('Levi', 'levi@teste.com')
    await repo.signOut()
    const user = await repo.signIn({ email: 'LEVI@Teste.com', password: 'senha123' })
    expect(user.name).toBe('Levi')
  })

  it('recusa senha errada', async () => {
    await novaConta('Levi', 'levi@teste.com')
    await repo.signOut()
    await expect(repo.signIn({ email: 'levi@teste.com', password: 'errada' })).rejects.toThrow(
      /incorretos/,
    )
  })

  it('nunca devolve o hash da senha junto com o perfil', async () => {
    const user = await novaConta('Levi', 'levi@teste.com')
    expect(user).not.toHaveProperty('passwordHash')
  })
})

describe('parceria', () => {
  it('nasce com uma pessoa e um convite', async () => {
    await novaConta('Levi', 'levi@teste.com')
    const { couple, invite } = await repo.createCouple()
    expect(couple.memberIds).toHaveLength(1)
    expect(invite.code).toHaveLength(6)
    expect(invite.redeemedBy).toBeNull()
  })

  it('conecta as duas pessoas com o código', async () => {
    const { coupleId } = await casalConectado()
    const couple = await repo.getCouple(coupleId)
    expect(couple?.memberIds).toHaveLength(2)
  })

  it('recusa uma terceira pessoa', async () => {
    await novaConta('Primeiro', 'primeiro@teste.com')
    const { couple, invite } = await repo.createCouple()

    await novaConta('Segundo', 'segundo@teste.com')
    await repo.redeemInvite(invite.code)

    // O código já foi usado; um novo convite também não abre espaço.
    await entrarComo('primeiro@teste.com')
    const outro = await repo.regenerateInvite(couple.id)

    await novaConta('Terceiro', 'terceiro@teste.com')
    await expect(repo.redeemInvite(outro.code)).rejects.toThrow(/duas pessoas/)
  })

  it('recusa o mesmo código duas vezes', async () => {
    await novaConta('Primeiro', 'primeiro@teste.com')
    const { invite } = await repo.createCouple()

    await novaConta('Segundo', 'segundo@teste.com')
    await repo.redeemInvite(invite.code)

    await novaConta('Terceiro', 'terceiro@teste.com')
    await expect(repo.redeemInvite(invite.code)).rejects.toThrow(/já foi usado/)
  })

  it('recusa código inexistente', async () => {
    await novaConta('Levi', 'levi@teste.com')
    await expect(repo.redeemInvite('ZZZZZZ')).rejects.toThrow(/não encontrado/)
  })

  it('não deixa quem já tem parceria entrar em outra', async () => {
    const { primeiro } = await casalConectado()

    await novaConta('Terceiro', 'terceiro@teste.com')
    const { invite } = await repo.createCouple()

    await entrarComo(primeiro.email)
    await expect(repo.redeemInvite(invite.code)).rejects.toThrow(/já faz parte/)
  })

  it('aposenta o código anterior ao gerar um novo', async () => {
    await novaConta('Levi', 'levi@teste.com')
    const { couple, invite } = await repo.createCouple()
    const novo = await repo.regenerateInvite(couple.id)

    expect(novo.code).not.toBe(invite.code)

    await novaConta('Outro', 'outro@teste.com')
    await expect(repo.redeemInvite(invite.code)).rejects.toThrow(/não encontrado/)
  })
})

describe('metas', () => {
  it('exige uma parceria antes', async () => {
    await novaConta('Levi', 'levi@teste.com')
    await expect(
      repo.createGoal({ title: 'Meta', description: null, targetCents: 100000, deadline: null, cover: null }),
    ).rejects.toThrow(/parceria/)
  })

  it('recusa objetivo zerado', async () => {
    await casalConectado()
    await expect(
      repo.createGoal({ title: 'Meta', description: null, targetCents: 0, deadline: null, cover: null }),
    ).rejects.toThrow(/maior que zero/)
  })

  it('nasce vazia — nada de meta pré-preenchida', async () => {
    await casalConectado()
    const meta = await repo.createGoal({
      title: 'Nossa meta',
      description: null,
      targetCents: 3000000,
      deadline: null,
      cover: null,
    })
    expect(meta.totalCents).toBe(0)
    expect(meta.contributionCount).toBe(0)
    expect(meta.status).toBe('active')
  })

  it('as duas pessoas enxergam as mesmas metas', async () => {
    const { primeiro, segundo, coupleId } = await casalConectado()

    await entrarComo(primeiro.email)
    await repo.createGoal({
      title: 'Nossa meta',
      description: null,
      targetCents: 100000,
      deadline: null,
      cover: null,
    })

    await entrarComo(segundo.email)
    const vistas = lerAgora<{ title: string }[]>((cb) => repo.subscribeGoals(coupleId, cb))
    expect(vistas.map((g) => g.title)).toEqual(['Nossa meta'])
  })
})

describe('propriedade das contribuições', () => {
  async function cenario() {
    const { primeiro, segundo, coupleId } = await casalConectado()
    await entrarComo(primeiro.email)
    const meta = await repo.createGoal({
      title: 'Meta',
      description: null,
      targetCents: 1000000,
      deadline: null,
      cover: null,
    })
    const meu = await repo.addContribution({
      goalId: meta.id,
      amountCents: 50000,
      date: new Date(),
      note: 'Meu aporte',
    })
    return { primeiro, segundo, coupleId, meta, meu }
  }

  it('carimba o aporte com quem registrou', async () => {
    const { primeiro, meu } = await cenario()
    expect(meu.userId).toBe(primeiro.id)
  })

  it('o parceiro VÊ a contribuição do outro', async () => {
    const { segundo, coupleId } = await cenario()
    await entrarComo(segundo.email)

    const vistas = lerAgora<{ amountCents: number }[]>((cb) => repo.subscribeContributions(coupleId, cb))
    expect(vistas).toHaveLength(1)
    expect(vistas[0].amountCents).toBe(50000)
  })

  it('mas NÃO consegue editar', async () => {
    const { segundo, meu } = await cenario()
    await entrarComo(segundo.email)
    await expect(repo.updateContribution(meu.id, { amountCents: 999999 })).rejects.toThrow(
      /Só quem registrou/,
    )
  })

  it('nem apagar', async () => {
    const { segundo, meu } = await cenario()
    await entrarComo(segundo.email)
    await expect(repo.deleteContribution(meu.id)).rejects.toThrow(/Só quem registrou/)
  })

  it('e a tentativa não altera o total', async () => {
    const { segundo, coupleId, meta, meu } = await cenario()
    await entrarComo(segundo.email)
    await repo.updateContribution(meu.id, { amountCents: 999999 }).catch(() => {})

    const goals = lerAgora<{ id: string; totalCents: number }[]>((cb) => repo.subscribeGoals(coupleId, cb))
    expect(goals.find((g) => g.id === meta.id)?.totalCents).toBe(50000)
  })

  it('quem registrou pode editar, e fica marcado como editado', async () => {
    const { meu } = await cenario()
    await repo.updateContribution(meu.id, { amountCents: 60000 })

    const items = lerAgora<{ id: string; amountCents: number; editedAt: Date | null }[]>((cb) => repo.subscribeContributions(meu.coupleId, cb))
    const atualizada = items.find((c) => c.id === meu.id)!
    expect(atualizada.amountCents).toBe(60000)
    expect(atualizada.editedAt).not.toBeNull()
  })

  it('recusa valor zero ou negativo', async () => {
    const { meta } = await cenario()
    await expect(
      repo.addContribution({ goalId: meta.id, amountCents: 0, date: new Date(), note: null }),
    ).rejects.toThrow(/maior que zero/)
    await expect(
      repo.addContribution({ goalId: meta.id, amountCents: -100, date: new Date(), note: null }),
    ).rejects.toThrow(/maior que zero/)
  })
})

describe('totais e conquista', () => {
  async function metaCom(alvo: number) {
    const { primeiro, segundo, coupleId } = await casalConectado()
    await entrarComo(primeiro.email)
    const meta = await repo.createGoal({
      title: 'Meta',
      description: null,
      targetCents: alvo,
      deadline: null,
      cover: null,
    })
    return { primeiro, segundo, coupleId, meta }
  }

  function lerMeta(coupleId: string, goalId: string) {
    const goals = lerAgora<
      { id: string; totalCents: number; status: string; perUserCents: Record<string, number> }[]
    >((cb) => repo.subscribeGoals(coupleId, cb))
    return goals.find((g) => g.id === goalId)!
  }

  it('soma as duas pessoas no total da meta', async () => {
    const { primeiro, segundo, coupleId, meta } = await metaCom(1000000)

    await repo.addContribution({ goalId: meta.id, amountCents: 50000, date: new Date(), note: null })
    await entrarComo(segundo.email)
    await repo.addContribution({ goalId: meta.id, amountCents: 70000, date: new Date(), note: null })

    const atual = lerMeta(coupleId, meta.id)
    expect(atual.totalCents).toBe(120000)
    expect(atual.perUserCents[primeiro.id]).toBe(50000)
    expect(atual.perUserCents[segundo.id]).toBe(70000)
  })

  it('marca como conquistada ao cruzar o objetivo', async () => {
    const { coupleId, meta } = await metaCom(100000)
    await repo.addContribution({ goalId: meta.id, amountCents: 100000, date: new Date(), note: null })

    const atual = lerMeta(coupleId, meta.id)
    expect(atual.status).toBe('achieved')
  })

  it('aceita passar do objetivo sem travar', async () => {
    const { coupleId, meta } = await metaCom(100000)
    await repo.addContribution({ goalId: meta.id, amountCents: 130000, date: new Date(), note: null })

    const atual = lerMeta(coupleId, meta.id)
    expect(atual.totalCents).toBe(130000)
    expect(atual.status).toBe('achieved')
  })

  it('reabre a meta se o aporte for corrigido para baixo', async () => {
    const { coupleId, meta } = await metaCom(100000)
    const aporte = await repo.addContribution({
      goalId: meta.id,
      amountCents: 100000,
      date: new Date(),
      note: null,
    })
    expect((lerMeta(coupleId, meta.id)).status).toBe('achieved')

    await repo.updateContribution(aporte.id, { amountCents: 50000 })
    const depois = lerMeta(coupleId, meta.id)
    expect(depois.status).toBe('active')
    expect(depois.totalCents).toBe(50000)
  })

  it('recalcula ao apagar um aporte', async () => {
    const { coupleId, meta } = await metaCom(1000000)
    const a = await repo.addContribution({
      goalId: meta.id,
      amountCents: 50000,
      date: new Date(),
      note: null,
    })
    await repo.addContribution({ goalId: meta.id, amountCents: 30000, date: new Date(), note: null })

    await repo.deleteContribution(a.id)
    const atual = lerMeta(coupleId, meta.id)
    expect(atual.totalCents).toBe(30000)
  })

  it('apaga as contribuições junto com a meta', async () => {
    const { coupleId, meta } = await metaCom(1000000)
    await repo.addContribution({ goalId: meta.id, amountCents: 50000, date: new Date(), note: null })

    await repo.deleteGoal(meta.id)
    const restantes = lerAgora<unknown[]>((cb) => repo.subscribeContributions(coupleId, cb))
    expect(restantes).toHaveLength(0)
  })
})

describe('isolamento entre parcerias', () => {
  it('um casal não enxerga as metas do outro', async () => {
    const { coupleId } = await casalConectado()
    await entrarComo('primeiro@teste.com')
    await repo.createGoal({
      title: 'Segredo',
      description: null,
      targetCents: 100000,
      deadline: null,
      cover: null,
    })

    // Uma pessoa completamente de fora, em outra parceria.
    await novaConta('Estranho', 'estranho@teste.com')
    await repo.createCouple()

    const vistas = lerAgora<unknown[]>((cb) => repo.subscribeGoals(coupleId, cb))
    expect(vistas).toHaveLength(0)
  })

  it('nem consegue ler a parceria alheia', async () => {
    const { coupleId } = await casalConectado()
    await novaConta('Estranho', 'estranho@teste.com')
    await expect(repo.getCouple(coupleId)).rejects.toThrow(/não faz parte/)
  })

  it('nem as contribuições', async () => {
    const { coupleId } = await casalConectado()
    await novaConta('Estranho', 'estranho@teste.com')

    const vistas = lerAgora<unknown[]>((cb) => repo.subscribeContributions(coupleId, cb))
    expect(vistas).toHaveLength(0)
  })
})

describe('novidades', () => {
  it('não notifica você sobre o seu próprio registro', async () => {
    const { primeiro, coupleId, meta } = await (async () => {
      const { primeiro, segundo, coupleId } = await casalConectado()
      await entrarComo(primeiro.email)
      const meta = await repo.createGoal({
        title: 'Meta',
        description: null,
        targetCents: 1000000,
        deadline: null,
        cover: null,
      })
      return { primeiro, segundo, coupleId, meta }
    })()

    await repo.addContribution({ goalId: meta.id, amountCents: 50000, date: new Date(), note: null })

    const atividades = lerAgora<{ readBy: string[]; type: string }[]>((cb) => repo.subscribeActivities(coupleId, cb))
    const minha = atividades.find((a) => a.type === 'contribution')!
    expect(minha.readBy).toContain(primeiro.id)
  })

  it('a novidade do parceiro chega como não lida', async () => {
    const { primeiro, segundo, coupleId } = await casalConectado()
    await entrarComo(primeiro.email)
    const meta = await repo.createGoal({
      title: 'Meta',
      description: null,
      targetCents: 1000000,
      deadline: null,
      cover: null,
    })

    await entrarComo(segundo.email)
    await repo.addContribution({ goalId: meta.id, amountCents: 30000, date: new Date(), note: null })

    await entrarComo(primeiro.email)
    const atividades = lerAgora<{ readBy: string[]; type: string }[]>((cb) => repo.subscribeActivities(coupleId, cb))
    const dela = atividades.find((a) => a.type === 'contribution')!
    expect(dela.readBy).not.toContain(primeiro.id)
  })
})

describe('entrar na parceria quando já se tem a automática', () => {
  /**
   * O app cria uma parceria só sua assim que a conta nasce, para que dê para
   * usar tudo antes de conectar. Isso quase impediu a segunda pessoa de entrar.
   */
  it('a parceria solitária e vazia é descartada, e ela entra na dele', async () => {
    await novaConta('Primeiro', 'primeiro@teste.com')
    const { couple, invite } = await repo.createCouple()

    const segunda = await novaConta('Segunda', 'segunda@teste.com')
    // É isto que o app faz sozinho ao criar a conta.
    const propria = await repo.createCouple()
    expect(propria.couple.id).not.toBe(couple.id)

    await repo.redeemInvite(invite.code)

    const atualizada = await entrarComo(segunda.email)
    expect(atualizada.coupleId).toBe(couple.id)

    const juntos = await repo.getCouple(couple.id)
    expect(juntos?.memberIds).toHaveLength(2)
  })

  it('mas recusa se ela já tiver criado metas na própria', async () => {
    await novaConta('Primeiro', 'primeiro@teste.com')
    const { invite } = await repo.createCouple()

    await novaConta('Segunda', 'segunda@teste.com')
    await repo.createCouple()
    await repo.createGoal({
      title: 'Meta só minha',
      description: null,
      targetCents: 100000,
      deadline: null,
      cover: null,
    })

    await expect(repo.redeemInvite(invite.code)).rejects.toThrow(/já tem metas/)
  })

  it('e continua recusando quem já está numa parceria de duas pessoas', async () => {
    const { primeiro } = await casalConectado()

    await novaConta('Terceira', 'terceira@teste.com')
    const { invite } = await repo.createCouple()

    await entrarComo(primeiro.email)
    await expect(repo.redeemInvite(invite.code)).rejects.toThrow(/parceria com outra pessoa/)
  })
})
