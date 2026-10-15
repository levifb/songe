#!/usr/bin/env bash
# Songe — assistente de instalação.
#
# Conduz a criação do projeto Firebase, a publicação na Vercel e a instalação
# nos dois celulares. Faz sozinho tudo o que dá para fazer por linha de comando,
# e espera por você nos passos que só existem no navegador.
#
# Rodar:  bash scripts/setup.sh
#
# Pode ser interrompido e retomado: o progresso fica em .songe-setup-state.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

STATE_FILE=".songe-setup-state"
ENV_FILE=".env.local"

# ── Aparência ────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  AMBER=$'\033[38;5;179m'; GREEN=$'\033[38;5;71m'; RED=$'\033[38;5;167m'
else
  BOLD=""; DIM=""; RESET=""; AMBER=""; GREEN=""; RED=""
fi

titulo() { printf '\n%s%s%s\n%s%s%s\n\n' "$BOLD" "$1" "$RESET" "$DIM" "$(printf '─%.0s' $(seq 1 ${#1}))" "$RESET"; }
passo()  { printf '\n%s▸ %s%s\n' "$AMBER$BOLD" "$1" "$RESET"; }
ok()     { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
erro()   { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; }
nota()   { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }

pausa() {
  printf '\n  %sQuando terminar, aperte ENTER para continuar.%s ' "$DIM" "$RESET"
  read -r _
}

perguntar() {
  # perguntar <variável> <pergunta> [validação-regex]
  local __var="$1" __pergunta="$2" __regex="${3:-.+}" __valor=""
  while true; do
    printf '  %s: ' "$__pergunta"
    read -r __valor
    if printf '%s' "$__valor" | grep -Eq "$__regex"; then
      printf -v "$__var" '%s' "$__valor"
      return 0
    fi
    erro "Valor inválido, tente de novo."
  done
}

confirmar() {
  local resposta
  printf '  %s [s/N]: ' "$1"
  read -r resposta
  [ "$resposta" = "s" ] || [ "$resposta" = "S" ]
}

# As CLIs são chamadas pelo arquivo .js, e não pelo atalho em .bin/.
#
# Motivo: no Git Bash (mintty) os programas Node não recebem um terminal de
# verdade — toda pergunta interativa leva resposta vazia e o comando falha na
# hora. Quem conserta isso é o winpty, mas ele só sabe iniciar executáveis do
# Windows, e os atalhos em .bin/ são scripts de shell. Chamando o node.exe
# direto no .js, o winpty funciona e o prompt volta a esperar por você.
FIREBASE_JS="node_modules/firebase-tools/lib/bin/firebase.js"
VERCEL_JS="node_modules/vercel/dist/vc.js"
WEBPUSH_JS="node_modules/web-push/src/cli.js"

usa_winpty() {
  [ -n "${MSYSTEM:-}" ] && command -v winpty >/dev/null 2>&1 && [ -t 0 ]
}

# Comando interativo: precisa de terminal para fazer perguntas.
CLI() {
  if usa_winpty; then
    winpty node "$@"
  else
    node "$@"
  fi
}

# Comando não-interativo: só imprime resultado, dispensa o winpty.
QUIETO() {
  node "$@"
}

feito() { grep -qxF "$1" "$STATE_FILE" 2>/dev/null; }
marcar() { echo "$1" >> "$STATE_FILE"; }

# ── Abertura ─────────────────────────────────────────────────
clear 2>/dev/null || true
titulo "Songe — assistente de instalação"

cat <<'TEXTO'
  Este assistente vai:

    1. criar o projeto Firebase (autenticação, banco e fotos)
    2. publicar as regras de segurança
    3. gerar as chaves das notificações
    4. publicar o app na Vercel
    5. instalar nos dois celulares

  Custo esperado: R$ 0.

  Um aviso antes de começar, para não haver surpresa no meio do caminho:
  o Firebase exige o plano Blaze (cartão cadastrado) para usar o Storage
  desde fevereiro de 2026. O uso de vocês cabe folgado nos 5 GB gratuitos
  permanentes, e o assistente configura um alerta de orçamento. Mas o
  cartão precisa existir na conta.

  Se preferir não cadastrar cartão, dá para pular o Storage — as fotos
  ficam limitadas às da biblioteca. O assistente pergunta na hora.
TEXTO

if ! confirmar "Vamos começar?"; then
  printf '\n  Tudo bem. É só rodar de novo quando quiser.\n\n'
  exit 0
fi

touch "$STATE_FILE"

# ── 1. Pré-requisitos ────────────────────────────────────────
passo "1/8 · Conferindo o que já está instalado"

command -v node >/dev/null 2>&1 || { erro "Node.js não encontrado. Instale em nodejs.org e rode de novo."; exit 1; }
ok "Node.js $(node -v)"

[ -d node_modules ] || { nota "Instalando dependências..."; npm install --silent; }
ok "Dependências instaladas"

# ── 2. Projeto Firebase ──────────────────────────────────────
if feito "firebase-projeto"; then
  ok "Projeto Firebase já configurado"
else
  passo "2/8 · Criando o projeto Firebase"

  cat <<'TEXTO'
  Abra console.firebase.google.com e:

    a) clique em "Criar um projeto"
    b) nome: Songe  (o ID gerado pode ser qualquer coisa)
    c) pode DESATIVAR o Google Analytics — não usamos
    d) espere criar e clique em "Continuar"

  Depois, ainda no console:

    e) menu Criação > Authentication > "Começar"
    f) aba "Sign-in method" > "E-mail/senha" > ativar > Salvar

    g) menu Criação > Firestore Database > "Criar banco de dados"
    h) escolha "Iniciar no modo de produção"
    i) local: southamerica-east1 (São Paulo)

    j) no topo da barra lateral, clique na engrenagem >
       "Configurações do projeto" > role até "Seus apps"
    k) clique no ícone </> (Web), apelido "Songe", NÃO marque Hosting
    l) copie os valores do objeto firebaseConfig que aparecer
TEXTO
  pausa

  printf '\n  %sAgora cole cada valor do firebaseConfig:%s\n\n' "$BOLD" "$RESET"
  perguntar FB_API_KEY      "apiKey" '^AIza[A-Za-z0-9_-]{10,}$'
  perguntar FB_AUTH_DOMAIN  "authDomain" '\.firebaseapp\.com$'
  perguntar FB_PROJECT_ID   "projectId" '^[a-z0-9-]{4,}$'
  perguntar FB_BUCKET       "storageBucket" '\.(appspot\.com|firebasestorage\.app)$'
  perguntar FB_SENDER       "messagingSenderId" '^[0-9]{6,}$'
  perguntar FB_APP_ID       "appId" '^1:[0-9]+:web:[a-z0-9]+$'

  cat > "$ENV_FILE" <<EOF
# Gerado por scripts/setup.sh — não versione este arquivo.
VITE_FIREBASE_API_KEY=$FB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$FB_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$FB_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=$FB_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=$FB_SENDER
VITE_FIREBASE_APP_ID=$FB_APP_ID
EOF

  echo "$FB_PROJECT_ID" > .firebase-project-id
  ok "Configuração salva em $ENV_FILE"
  marcar "firebase-projeto"
fi

FB_PROJECT_ID="$(cat .firebase-project-id 2>/dev/null || echo '')"

# ── 3. Storage (o passo do cartão) ───────────────────────────
if feito "firebase-storage"; then
  ok "Storage já resolvido"
else
  passo "3/8 · Fotos de vocês (Firebase Storage)"

  cat <<'TEXTO'
  Aqui é onde o cartão entra. Duas opções:

    A) COM Storage — vocês podem subir as próprias fotos.
       Exige o plano Blaze, que pede cartão de crédito.
       5 GB grátis permanentes; o uso de vocês fica em alguns MB.
       O plano não tem teto rígido de gasto, só alerta — que
       este assistente vai mandar você configurar.

    B) SEM Storage — só as 12 fotos da biblioteca embutida.
       Nenhum cartão. Dá para mudar de ideia depois.
TEXTO

  if confirmar "Quer ativar o Storage (opção A, com cartão)?"; then
    cat <<'TEXTO'

  No console do Firebase:

    a) menu Criação > Storage > "Começar"
    b) ele vai pedir para mudar para o plano Blaze — aceite
    c) escolha o mesmo local do Firestore (southamerica-east1)
    d) modo de produção

  E agora o passo que protege seu bolso:

    e) vá em console.cloud.google.com/billing > Orçamentos e alertas
    f) "Criar orçamento", valor R$ 5, alertas em 50% e 100%
    g) marque para receber e-mail
TEXTO
    pausa
    ok "Storage ativado"
    marcar "storage-sim"
  else
    nota "Seguindo sem Storage. As fotos da biblioteca continuam funcionando."
    marcar "storage-nao"
  fi
  marcar "firebase-storage"
fi

# ── 4. Regras de segurança ───────────────────────────────────
if feito "regras"; then
  ok "Regras já publicadas"
else
  passo "4/8 · Publicando as regras de segurança"

  if QUIETO "$FIREBASE_JS" login:list 2>&1 | grep -q "No authorized accounts"; then
    nota "Vai abrir o navegador para você entrar na conta Google."
    nota "Se ele perguntar sobre coleta de dados de uso, pode responder o que quiser."
    if ! CLI "$FIREBASE_JS" login; then
      erro "O login não completou."
      nota "Tente à mão, nesta mesma janela:"
      nota "  winpty node node_modules/firebase-tools/lib/bin/firebase.js login"
      nota "Depois rode 'npm run setup' de novo — ele retoma daqui."
      exit 1
    fi
  fi
  ok "Autenticado no Firebase"

  if feito "storage-sim"; then
    ALVOS="firestore:rules,storage"
  else
    ALVOS="firestore:rules"
  fi

  if CLI "$FIREBASE_JS" deploy --only "$ALVOS" --project "$FB_PROJECT_ID"; then
    ok "Regras publicadas — o banco agora recusa acesso indevido"
    marcar "regras"
  else
    erro "Falhou. Confira se o projeto existe e se você entrou na conta certa."
    exit 1
  fi
fi

# ── 5. Chaves das notificações ───────────────────────────────
if feito "vapid"; then
  ok "Chaves de notificação já geradas"
else
  passo "5/8 · Gerando as chaves das notificações"

  VAPID_OUT="$(QUIETO "$WEBPUSH_JS" generate-vapid-keys --json 2>/dev/null)"
  VAPID_PUBLIC="$(printf '%s' "$VAPID_OUT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).publicKey)}catch{}})")"
  VAPID_PRIVATE="$(printf '%s' "$VAPID_OUT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).privateKey)}catch{}})")"

  if [ -z "$VAPID_PUBLIC" ] || [ -z "$VAPID_PRIVATE" ]; then
    erro "Não consegui gerar as chaves. Rode 'npx web-push generate-vapid-keys' e cole abaixo."
    perguntar VAPID_PUBLIC "Chave pública" '.{40,}'
    perguntar VAPID_PRIVATE "Chave privada" '.{20,}'
  fi

  echo "VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC" >> "$ENV_FILE"
  cat > .vapid-private-key <<EOF
$VAPID_PRIVATE
EOF
  ok "Chaves geradas"
  nota "A privada ficou em .vapid-private-key — ela vai só para a Vercel, nunca para o app."
  marcar "vapid"
fi

# ── 6. Publicação na Vercel ──────────────────────────────────
if feito "vercel"; then
  ok "App já publicado"
else
  passo "6/8 · Publicando na Vercel"

  if ! QUIETO "$VERCEL_JS" whoami >/dev/null 2>&1; then
    nota "Vai abrir o navegador para você entrar (conta do GitHub ou e-mail)."
    if ! CLI "$VERCEL_JS" login; then
      erro "O login não completou."
      nota "Tente à mão, nesta mesma janela:"
      nota "  winpty node node_modules/vercel/dist/vc.js login"
      nota "Depois rode 'npm run setup' de novo — ele retoma daqui."
      exit 1
    fi
  fi
  ok "Autenticado na Vercel"

  # O nome vai pronto e em minúsculas: a Vercel recusa maiúsculas, e descobrir
  # isso no meio de um formulário interativo custa uma tentativa perdida.
  #
  # A vinculação não-interativa só aceita projeto que já existe, então ele é
  # criado antes. Se já existir de uma tentativa anterior, o erro é ignorado.
  nota "Criando o projeto 'songe' na Vercel."
  QUIETO "$VERCEL_JS" project add songe >/dev/null 2>&1

  if CLI "$VERCEL_JS" link --yes --project songe; then
    ok "Projeto vinculado"
  else
    nota "Não deu com o nome pronto. Vamos pelo modo interativo."
    nota "IMPORTANTE: o nome do projeto tem que ser tudo em MINÚSCULAS."
    nota "Sugestão: songe"
    CLI "$VERCEL_JS" link || { erro "Não consegui vincular o projeto."; exit 1; }
  fi

  passo "Passando as variáveis para a Vercel"
  FALHARAM=""
  while IFS='=' read -r chave valor; do
    case "$chave" in
      VITE_*)
        # Uma segunda tentativa: a primeira chamada da sessão às vezes falha
        # enquanto a Vercel ainda está resolvendo o projeto recém-criado.
        enviar() { printf '%s' "$valor" | QUIETO "$VERCEL_JS" env add "$chave" production --force >/dev/null 2>&1; }
        if enviar || { sleep 2; enviar; }
        then
          ok "$chave"
        else
          erro "$chave"
          FALHARAM="$FALHARAM $chave"
        fi
        ;;
    esac
  done < "$ENV_FILE"

  if [ -n "$FALHARAM" ]; then
    erro "Estas variáveis não subiram:$FALHARAM"
    nota "Sem elas o app publicado não conversa com o Firebase, e os dados"
    nota "de vocês não sincronizam entre os dois celulares."
    nota "Rode 'npm run setup' de novo para tentar mais uma vez."
    exit 1
  fi

  # A chave privada e a pública que a função de push usa no servidor.
  VAPID_PUBLIC="$(grep '^VITE_VAPID_PUBLIC_KEY=' "$ENV_FILE" | cut -d= -f2-)"
  printf '%s' "$VAPID_PUBLIC" | QUIETO "$VERCEL_JS" env add VAPID_PUBLIC_KEY production --force >/dev/null 2>&1
  printf '%s' "$(cat .vapid-private-key)" | QUIETO "$VERCEL_JS" env add VAPID_PRIVATE_KEY production --force >/dev/null 2>&1
  ok "Chaves das notificações enviadas"

  nota "Publicando..."
  if CLI "$VERCEL_JS" --prod; then
    ok "No ar"
    marcar "vercel"
  else
    erro "A publicação falhou. Veja a mensagem acima."
    exit 1
  fi
fi

# ── 7. Domínio autorizado no Firebase ────────────────────────
if feito "dominio"; then
  ok "Domínio já autorizado"
else
  passo "7/8 · Autorizando o endereço no Firebase"

  cat <<'TEXTO'
  O Firebase só aceita login vindo de endereços que você autorizar.

    a) console.firebase.google.com > Authentication > Settings
    b) aba "Domínios autorizados" > "Adicionar domínio"
    c) cole o endereço .vercel.app que a Vercel acabou de mostrar
       (só o domínio, sem https:// e sem barra no final)
TEXTO
  pausa
  ok "Domínio autorizado"
  marcar "dominio"
fi

# ── 8. Instalação nos celulares ──────────────────────────────
passo "8/8 · Instalando nos dois celulares"

cat <<'TEXTO'
  ANDROID (o seu)
    1. abra o endereço no Chrome
    2. menu ⋮ > "Instalar app" (ou "Adicionar à tela inicial")
    3. abra pelo ícone novo

  IPHONE (o dela)  ← a ordem importa
    1. abra o endereço no SAFARI (não funciona pelo Chrome)
    2. toque em Compartilhar, na barra de baixo
    3. role e escolha "Adicionar à Tela de Início"
    4. abra pelo ícone novo
    5. em Nós > Ajustes > Notificações, toque em "Ligar avisos"

  As notificações no iPhone SÓ funcionam depois do passo 4. Enquanto o
  Songe estiver aberto no navegador, o Safari nem deixa pedir permissão.

  Por último: um de vocês cria a conta, vai em Nós > Convidar parceira e
  manda o código de 6 letras. A outra pessoa cria a conta dela e digita
  o código. Pronto.
TEXTO

titulo "Tudo pronto"
printf '  O Songe está no ar e é de vocês.\n'
printf '  %sPara publicar mudanças depois: npx vercel --prod%s\n\n' "$DIM" "$RESET"
