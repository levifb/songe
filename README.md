# Songe

App privado, para duas pessoas, que **registra** quanto cada um destinou a objetivos em comum — a viagem, a reforma, a reserva.

O Songe não movimenta dinheiro, não conecta banco e não faz Pix. O dinheiro continua nas contas de vocês; o app só guarda a conta de quem colocou quanto em cada meta.

## O que ele faz

- **Metas compartilhadas** com foto de capa, valor-alvo, barra de progresso e projeção de quando ela fecha no ritmo atual.
- **Contribuições individuais**: cada pessoa registra as suas, e só ela pode editar ou apagar.
- **Divisão entre os dois** e gráfico acumulado por meta.
- **Atividade recente** e conquistas ao bater uma meta.
- **Notificações push** quando o parceiro registra algo (PWA instalável, funciona offline).
- **Começa vazio**: nenhuma meta é criada automaticamente.

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion |
| Dados e login | Firebase Auth + Firestore (+ Storage para fotos próprias) |
| Push | Service worker + função serverless (`web-push`) na Vercel |
| Testes | Vitest, `@firebase/rules-unit-testing` contra o emulador |

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Sem `.env.local`, o app usa um back-end local no próprio navegador (localStorage): dá para navegar por tudo sem criar conta em serviço nenhum. Para falar com o Firebase de verdade, copie `.env.example` para `.env.local` e preencha com os dados do seu projeto.

### Colocar no ar

```bash
npm run setup
```

O assistente configura Firebase, Vercel, notificações e os celulares, passo a passo. Ele avisa **antes** de qualquer passo que envolva cartão e pode ser interrompido e retomado.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos + build de produção |
| `npm test` | Testes de domínio e permissão |
| `npm run rules:test` | Testes das regras do Firestore no emulador |
| `npm run test:all` | Os dois conjuntos de testes |
| `npm run lint` | Lint com oxlint |
| `npm run typecheck` | Só a checagem de tipos |

## Estrutura

| Pasta | O que vive ali |
|---|---|
| `src/design/` | Design system: tokens de movimento e componentes reusáveis |
| `src/domain/` | Regras de negócio puras (progresso, divisão, projeção, série do gráfico), sem React |
| `src/services/` | Onde os dados moram. `repository.ts` é o contrato; há duas implementações (local e Firebase) |
| `src/app/` | Providers, rotas e a casca com a barra de abas |
| `src/features/` | Uma pasta por assunto: auth, couple, goals, contributions, activity, photos, profile, notifications |
| `src/lib/` | Utilidades: dinheiro, datas, imagem, ids |
| `src/sw.ts` | Service worker: cache offline e recebimento das notificações |
| `api/notify.ts` | Única peça de servidor: envia o push (roda na Vercel) |
| `firestore.rules` | **A autoridade sobre permissão**, executada no servidor do Google |
| `tests/rules/` | Testes das regras contra o emulador |
| `scripts/` | Assistente de setup e utilitários de fotos e ícones |

## Três regras que valem em todo lugar

1. **Dinheiro é sempre inteiro em centavos.** `R$ 500,00` é `50000`. Ponto flutuante só na barra de progresso.
2. **Cada contribuição pertence a quem a registrou.** Só essa pessoa edita ou apaga, e quem garante isso é o banco, não a tela.
3. **Nenhuma meta é criada automaticamente.** O app começa vazio, de propósito.

## Fotos

A biblioteca inicial fica em `public/photos/` e é listada em `src/data/photoLibrary.ts`. Para usar fotos próprias, escolha "Escolher do celular" ao criar ou editar uma meta; a imagem é reduzida no aparelho antes de subir. A capa é cortada em 3:2 (paisagem, tipo 1600×1067).

## Custo

R$ 0 previsto. Um único ponto exige cartão cadastrado: o plano Blaze do Firebase, necessário desde 3 de fevereiro de 2026 para usar o Cloud Storage. O uso cabe nos 5 GB gratuitos permanentes, e o assistente manda configurar um alerta de orçamento de R$ 5. O Blaze **não tem teto rígido de gasto**, só alerta, por isso o assistente também oferece seguir sem Storage, usando apenas as fotos da biblioteca.

Vercel (hospedagem + função de push) e Firebase Auth/Firestore ficam nos planos gratuitos.

## Privacidade

- As regras do Firestore impedem que alguém leia a parceria de outra pessoa, edite a contribuição do parceiro ou falsifique os totais de uma meta. Isso está testado.
- As fotos enviadas ficam no Storage com uma URL que contém um token aleatório. Quem tiver a URL vê a imagem sem passar pelas regras; é assim que o Firebase funciona. Na prática a URL nunca sai do app, e os tokens podem ser revogados no console se isso incomodar.
- A função de notificação não verifica quem a chamou. Ela só envia para assinaturas que o chamador já possui, e essas assinaturas só são legíveis pelas duas pessoas da parceria.
