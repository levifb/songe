import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * As regras de segurança testadas contra o emulador de verdade.
 *
 * Estes testes valem mais que os do repositório local: eles provam o que
 * acontece quando alguém ignora o app e fala direto com o banco. Cada `it`
 * abaixo corresponde a uma das ameaças que o briefing listou.
 *
 * Rodar:  npm run rules:test
 */

const PROJECT_ID = 'songe-rules-test'
const LEVI = 'uid-levi'
const ELA = 'uid-ela'
const ESTRANHO = 'uid-estranho'
const CASAL = 'casal-1'
const OUTRO_CASAL = 'casal-2'
const META = 'meta-1'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  // O emulador é falante demais quando uma regra nega algo — e negar é
  // justamente o que a maioria destes testes espera.
  setLogLevel('error')

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()

  // O cenário base é montado ignorando as regras, para que cada teste comece
  // de um estado válido e exercite apenas a operação que está sob suspeita.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()

    await setDoc(doc(db, 'users', LEVI), {
      name: 'Levi', email: 'levi@teste.com', photoUrl: null, coupleId: CASAL, createdAt: new Date(),
    })
    await setDoc(doc(db, 'users', ELA), {
      name: 'Ela', email: 'ela@teste.com', photoUrl: null, coupleId: CASAL, createdAt: new Date(),
    })
    await setDoc(doc(db, 'users', ESTRANHO), {
      name: 'Estranho', email: 'x@teste.com', photoUrl: null, coupleId: OUTRO_CASAL, createdAt: new Date(),
    })

    await setDoc(doc(db, 'couples', CASAL), {
      memberIds: [LEVI, ELA], createdAt: new Date(), activeInviteCode: null,
    })
    await setDoc(doc(db, 'couples', OUTRO_CASAL), {
      memberIds: [ESTRANHO], createdAt: new Date(), activeInviteCode: null,
    })

    await setDoc(doc(db, 'couples', CASAL, 'goals', META), {
      title: 'Meta', description: null, targetCents: 1000000, deadline: null,
      cover: null, gallery: [], status: 'active', achievedAt: null,
      createdBy: LEVI, createdAt: new Date(),
      totalCents: 120000,
      perUserCents: { [LEVI]: 50000, [ELA]: 70000 },
      contributionCount: 2,
    })

    await setDoc(doc(db, 'couples', CASAL, 'contributions', 'aporte-do-levi'), {
      goalId: META, userId: LEVI, amountCents: 50000, date: new Date(),
      note: 'Meu', createdAt: new Date(), editedAt: null,
    })
  })
})

const comoLevi = () => testEnv.authenticatedContext(LEVI).firestore()
const comoEla = () => testEnv.authenticatedContext(ELA).firestore()
const comoEstranho = () => testEnv.authenticatedContext(ESTRANHO).firestore()
const semLogin = () => testEnv.unauthenticatedContext().firestore()

describe('acesso à parceria', () => {
  it('os dois membros leem a parceria', async () => {
    await assertSucceeds(getDoc(doc(comoLevi(), 'couples', CASAL)))
    await assertSucceeds(getDoc(doc(comoEla(), 'couples', CASAL)))
  })

  it('quem está de fora NÃO lê a parceria', async () => {
    await assertFails(getDoc(doc(comoEstranho(), 'couples', CASAL)))
  })

  it('deslogado não lê nada', async () => {
    await assertFails(getDoc(doc(semLogin(), 'couples', CASAL)))
    await assertFails(getDoc(doc(semLogin(), 'couples', CASAL, 'goals', META)))
  })

  it('ninguém apaga a parceria', async () => {
    await assertFails(deleteDoc(doc(comoLevi(), 'couples', CASAL)))
  })

  it('um membro não consegue expulsar o outro', async () => {
    await assertFails(updateDoc(doc(comoLevi(), 'couples', CASAL), { memberIds: [LEVI] }))
  })

  it('nem enfiar uma terceira pessoa', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL), { memberIds: [LEVI, ELA, ESTRANHO] }),
    )
  })
})

describe('metas', () => {
  it('os dois leem e criam metas', async () => {
    await assertSucceeds(getDoc(doc(comoEla(), 'couples', CASAL, 'goals', META)))
    await assertSucceeds(
      setDoc(doc(comoEla(), 'couples', CASAL, 'goals', 'nova'), {
        title: 'Nova', description: null, targetCents: 500000, deadline: null,
        cover: null, gallery: [], status: 'active', achievedAt: null,
        createdBy: ELA, createdAt: new Date(),
        totalCents: 0, perUserCents: { [ELA]: 0 }, contributionCount: 0,
      }),
    )
  })

  it('quem está de fora não lê a meta', async () => {
    await assertFails(getDoc(doc(comoEstranho(), 'couples', CASAL, 'goals', META)))
  })

  it('não dá para nascer uma meta já com dinheiro dentro', async () => {
    await assertFails(
      setDoc(doc(comoLevi(), 'couples', CASAL, 'goals', 'falsa'), {
        title: 'Falsa', description: null, targetCents: 500000, deadline: null,
        cover: null, gallery: [], status: 'active', achievedAt: null,
        createdBy: LEVI, createdAt: new Date(),
        totalCents: 999999, perUserCents: { [LEVI]: 999999 }, contributionCount: 1,
      }),
    )
  })

  it('não dá para criar meta em nome do parceiro', async () => {
    await assertFails(
      setDoc(doc(comoLevi(), 'couples', CASAL, 'goals', 'forjada'), {
        title: 'Forjada', description: null, targetCents: 500000, deadline: null,
        cover: null, gallery: [], status: 'active', achievedAt: null,
        createdBy: ELA, createdAt: new Date(),
        totalCents: 0, perUserCents: {}, contributionCount: 0,
      }),
    )
  })

  it('objetivo zerado é recusado', async () => {
    await assertFails(updateDoc(doc(comoLevi(), 'couples', CASAL, 'goals', META), { targetCents: 0 }))
  })
})

describe('os totais da meta não podem ser falsificados', () => {
  it('Levi aumenta a PRÓPRIA fatia, e o total acompanha', async () => {
    await assertSucceeds(
      updateDoc(doc(comoLevi(), 'couples', CASAL, 'goals', META), {
        [`perUserCents.${LEVI}`]: 90000,
        totalCents: 160000,
      }),
    )
  })

  it('mas NÃO consegue mexer na fatia dela', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL, 'goals', META), {
        [`perUserCents.${ELA}`]: 999999,
        totalCents: 1049999,
      }),
    )
  })

  it('nem inflar o total sem inflar uma fatia', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL, 'goals', META), { totalCents: 999999 }),
    )
  })

  it('nem transferir a contribuição dela para si', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL, 'goals', META), {
        [`perUserCents.${LEVI}`]: 120000,
        [`perUserCents.${ELA}`]: 0,
        totalCents: 120000,
      }),
    )
  })

  it('nem deixar o total negativo', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL, 'goals', META), {
        [`perUserCents.${LEVI}`]: -200000,
        totalCents: -130000,
      }),
    )
  })

  it('e ninguém reescreve quem criou a meta', async () => {
    await assertFails(
      updateDoc(doc(comoEla(), 'couples', CASAL, 'goals', META), { createdBy: ELA }),
    )
  })
})

describe('propriedade das contribuições', () => {
  it('Ela VÊ a contribuição do Levi', async () => {
    await assertSucceeds(getDoc(doc(comoEla(), 'couples', CASAL, 'contributions', 'aporte-do-levi')))
  })

  it('mas NÃO consegue editar', async () => {
    await assertFails(
      updateDoc(doc(comoEla(), 'couples', CASAL, 'contributions', 'aporte-do-levi'), {
        amountCents: 1,
      }),
    )
  })

  it('nem apagar', async () => {
    await assertFails(deleteDoc(doc(comoEla(), 'couples', CASAL, 'contributions', 'aporte-do-levi')))
  })

  it('nem passar a contribuição para o nome dela', async () => {
    await assertFails(
      updateDoc(doc(comoEla(), 'couples', CASAL, 'contributions', 'aporte-do-levi'), {
        userId: ELA,
      }),
    )
  })

  it('o Levi edita e apaga o que é dele', async () => {
    await assertSucceeds(
      updateDoc(doc(comoLevi(), 'couples', CASAL, 'contributions', 'aporte-do-levi'), {
        amountCents: 60000,
        editedAt: new Date(),
      }),
    )
    await assertSucceeds(
      deleteDoc(doc(comoLevi(), 'couples', CASAL, 'contributions', 'aporte-do-levi')),
    )
  })

  it('ninguém registra em nome do parceiro', async () => {
    await assertFails(
      setDoc(doc(comoLevi(), 'couples', CASAL, 'contributions', 'forjada'), {
        goalId: META, userId: ELA, amountCents: 50000, date: new Date(),
        note: null, createdAt: new Date(), editedAt: null,
      }),
    )
  })

  it('valor precisa ser positivo', async () => {
    await assertFails(
      setDoc(doc(comoLevi(), 'couples', CASAL, 'contributions', 'zerada'), {
        goalId: META, userId: LEVI, amountCents: 0, date: new Date(),
        note: null, createdAt: new Date(), editedAt: null,
      }),
    )
    await assertFails(
      setDoc(doc(comoLevi(), 'couples', CASAL, 'contributions', 'negativa'), {
        goalId: META, userId: LEVI, amountCents: -100, date: new Date(),
        note: null, createdAt: new Date(), editedAt: null,
      }),
    )
  })

  it('não aceita contribuição para meta que não existe', async () => {
    await assertFails(
      setDoc(doc(comoLevi(), 'couples', CASAL, 'contributions', 'orfa'), {
        goalId: 'meta-fantasma', userId: LEVI, amountCents: 100, date: new Date(),
        note: null, createdAt: new Date(), editedAt: null,
      }),
    )
  })

  it('quem está de fora não lê nem escreve', async () => {
    await assertFails(
      getDoc(doc(comoEstranho(), 'couples', CASAL, 'contributions', 'aporte-do-levi')),
    )
    await assertFails(
      setDoc(doc(comoEstranho(), 'couples', CASAL, 'contributions', 'invasao'), {
        goalId: META, userId: ESTRANHO, amountCents: 100, date: new Date(),
        note: null, createdAt: new Date(), editedAt: null,
      }),
    )
  })
})

describe('perfis', () => {
  it('cada um lê o próprio perfil e o do parceiro', async () => {
    await assertSucceeds(getDoc(doc(comoLevi(), 'users', LEVI)))
    await assertSucceeds(getDoc(doc(comoLevi(), 'users', ELA)))
  })

  it('mas não o de um desconhecido', async () => {
    await assertFails(getDoc(doc(comoLevi(), 'users', ESTRANHO)))
  })

  it('ninguém edita o perfil do outro', async () => {
    await assertFails(updateDoc(doc(comoLevi(), 'users', ELA), { name: 'Outro nome' }))
  })

  it('nem troca o próprio e-mail por baixo dos panos', async () => {
    await assertFails(updateDoc(doc(comoLevi(), 'users', LEVI), { email: 'outro@teste.com' }))
  })

  it('mas pode trocar o próprio nome', async () => {
    await assertSucceeds(updateDoc(doc(comoLevi(), 'users', LEVI), { name: 'Levi F.' }))
  })
})

describe('convites', () => {
  const CODIGO = 'ABC234'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'invites', CODIGO), {
        coupleId: OUTRO_CASAL,
        createdBy: ESTRANHO,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        redeemedBy: null,
      })
    })
  })

  it('quem tem o código consegue lê-lo', async () => {
    await assertSucceeds(getDoc(doc(comoLevi(), 'invites', CODIGO)))
  })

  it('deslogado não lê convite nenhum', async () => {
    await assertFails(getDoc(doc(semLogin(), 'invites', CODIGO)))
  })

  it('não dá para criar convite para a parceria de outra pessoa', async () => {
    await assertFails(
      setDoc(doc(comoLevi(), 'invites', 'XYZ789'), {
        coupleId: OUTRO_CASAL,
        createdBy: LEVI,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        redeemedBy: null,
      }),
    )
  })

  it('resgatar só marca quem usou, e só uma vez', async () => {
    await assertSucceeds(updateDoc(doc(comoLevi(), 'invites', CODIGO), { redeemedBy: LEVI }))
    // Agora que já foi usado, ninguém mais o resgata.
    await assertFails(updateDoc(doc(comoEla(), 'invites', CODIGO), { redeemedBy: ELA }))
  })

  it('não dá para resgatar em nome de outra pessoa', async () => {
    await assertFails(updateDoc(doc(comoLevi(), 'invites', CODIGO), { redeemedBy: ELA }))
  })

  it('nem esticar a validade do convite', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'invites', CODIGO), {
        redeemedBy: LEVI,
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      }),
    )
  })
})

describe('entrada na parceria pelo convite', () => {
  const CODIGO_VALIDO = 'JOIN22'
  const CASAL_SOZINHO = 'casal-sozinho'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'couples', CASAL_SOZINHO), {
        memberIds: [ESTRANHO], createdAt: new Date(), activeInviteCode: CODIGO_VALIDO,
      })
      await setDoc(doc(db, 'invites', CODIGO_VALIDO), {
        coupleId: CASAL_SOZINHO,
        createdBy: ESTRANHO,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        redeemedBy: null,
      })
    })
  })

  it('entra apresentando um convite válido', async () => {
    await assertSucceeds(
      updateDoc(doc(comoLevi(), 'couples', CASAL_SOZINHO), {
        memberIds: [ESTRANHO, LEVI],
        joinedWithCode: CODIGO_VALIDO,
        activeInviteCode: null,
      }),
    )
  })

  it('NÃO entra sem apresentar convite', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL_SOZINHO), { memberIds: [ESTRANHO, LEVI] }),
    )
  })

  it('nem inventando um código que não existe', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL_SOZINHO), {
        memberIds: [ESTRANHO, LEVI],
        joinedWithCode: 'FALSO1',
      }),
    )
  })

  it('nem usando o convite para colocar outra pessoa', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'couples', CASAL_SOZINHO), {
        memberIds: [ESTRANHO, ELA],
        joinedWithCode: CODIGO_VALIDO,
      }),
    )
  })
})

describe('assinaturas de notificação', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', ELA, 'pushSubscriptions', 'aparelho-dela'), {
        endpoint: 'https://push.exemplo/abc',
        p256dh: 'k', auth: 'a', device: 'iPhone',
        coupleId: CASAL, createdAt: new Date(),
      })
    })
  })

  it('o parceiro LÊ, para conseguir avisar', async () => {
    await assertSucceeds(getDoc(doc(comoLevi(), 'users', ELA, 'pushSubscriptions', 'aparelho-dela')))
  })

  it('mas não escreve no aparelho do outro', async () => {
    await assertFails(
      updateDoc(doc(comoLevi(), 'users', ELA, 'pushSubscriptions', 'aparelho-dela'), {
        endpoint: 'https://push.invasor/x',
      }),
    )
  })

  it('e quem está de fora não lê', async () => {
    await assertFails(
      getDoc(doc(comoEstranho(), 'users', ELA, 'pushSubscriptions', 'aparelho-dela')),
    )
  })
})

/**
 * Reprodução da sequência EXATA que o app executa.
 *
 * Os testes acima verificam operações isoladas. Estes seguem a ordem real de
 * chamadas do cliente — inclusive as LEITURAS que ele faz antes de escrever.
 * Foi aí que passou o defeito relatado: "você não tem permissão para isso"
 * quando a segunda pessoa digita o código.
 */
describe('sequência real do cliente', () => {
  const NOVA = 'uid-nova-pessoa'
  const CODIGO = 'ENTRA1'
  const CASAL_DELE = 'casal-dele'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      // Ela acabou de criar a conta: tem perfil, ainda não tem parceria.
      await setDoc(doc(db, 'users', NOVA), {
        name: 'Nova', email: 'nova@teste.com', photoUrl: null, coupleId: null, createdAt: new Date(),
      })
      // Ele já criou a parceria dele e gerou um convite.
      await setDoc(doc(db, 'couples', CASAL_DELE), {
        memberIds: [LEVI], createdAt: new Date(), activeInviteCode: CODIGO,
      })
      await setDoc(doc(db, 'invites', CODIGO), {
        coupleId: CASAL_DELE, createdBy: LEVI, createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), redeemedBy: null,
      })
    })
  })

  const comoNova = () => testEnv.authenticatedContext(NOVA).firestore()

  it('ela consegue criar a PRÓPRIA parceria e gerar o próprio código', async () => {
    const db = comoNova()
    const meuCasal = 'casal-dela'

    await assertSucceeds(
      setDoc(doc(db, 'couples', meuCasal), {
        memberIds: [NOVA], createdAt: new Date(), activeInviteCode: null,
      }),
    )
    await assertSucceeds(updateDoc(doc(db, 'users', NOVA), { coupleId: meuCasal }))
    await assertSucceeds(
      setDoc(doc(db, 'invites', 'MEUCOD'), {
        coupleId: meuCasal, createdBy: NOVA, createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000), redeemedBy: null,
      }),
    )
    await assertSucceeds(updateDoc(doc(db, 'couples', meuCasal), { activeInviteCode: 'MEUCOD' }))
    // E consegue ler o código de volta, que é o que a tela mostra.
    await assertSucceeds(getDoc(doc(db, 'couples', meuCasal)))
    await assertSucceeds(getDoc(doc(db, 'invites', 'MEUCOD')))
  })

  it('ela lê o convite dele pelo código', async () => {
    await assertSucceeds(getDoc(doc(comoNova(), 'invites', CODIGO)))
  })

  it('ela NÃO lê a parceria dele antes de entrar — e o app não tenta mais', async () => {
    // Foi este o defeito: `redeemInvite` lia o casal dentro da transação, e a
    // regra negava. Agora o cliente não lê; o arrayUnion e a regra fazem tudo.
    await assertFails(getDoc(doc(comoNova(), 'couples', CASAL_DELE)))
  })

  it('ela entra sem nunca ter lido a parceria dele', async () => {
    const db = comoNova()
    await assertSucceeds(
      updateDoc(doc(db, 'couples', CASAL_DELE), {
        memberIds: [LEVI, NOVA],
        joinedWithCode: CODIGO,
        activeInviteCode: null,
      }),
    )
    await assertSucceeds(updateDoc(doc(db, 'invites', CODIGO), { redeemedBy: NOVA }))
    await assertSucceeds(updateDoc(doc(db, 'users', NOVA), { coupleId: CASAL_DELE }))

    // E agora que é membro, passa a enxergar a parceria e as metas.
    await assertSucceeds(getDoc(doc(db, 'couples', CASAL_DELE)))
  })

  it('ela descarta a parceria solitária que o app criou para ela', async () => {
    const meuCasal = 'casal-dela-vazio'
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'couples', meuCasal), {
        memberIds: [NOVA], createdAt: new Date(), activeInviteCode: null,
      })
    })
    // Sem isto ela ficaria presa na própria parceria, sem nunca entrar na dele.
    await assertSucceeds(deleteDoc(doc(comoNova(), 'couples', meuCasal)))
  })

  it('mas não consegue descartar uma parceria que tem duas pessoas', async () => {
    await assertFails(deleteDoc(doc(comoEla(), 'couples', CASAL)))
  })

  it('nem descartar a parceria solitária de outra pessoa', async () => {
    await assertFails(deleteDoc(doc(comoNova(), 'couples', OUTRO_CASAL)))
  })
})
