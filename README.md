# Megasena App (PWA)

App pessoal para Mega-Sena com foco em:
- importacao de historico de concursos (XLSX)
- analises estatisticas reais
- gerenciamento de jogos
- simuladores

## Modo de uso
Este projeto esta configurado para **single-user** (uso pessoal), sem multi-tenant.

## Stack
- React + Vite + TypeScript
- Firebase (Auth anonimo, Firestore, Storage)
- PWA (manifest + service worker)

## Colecoes Firestore
- `draws`: base historica dos concursos
- `imports`: historico de importacoes XLSX
- `bets`: jogos do usuario (proximas fases)
- `simulations`: simulacoes (proximas fases)
- `settings`: configuracoes do app (proximas fases)

## Configuracao local
1. Instale dependencias:
   `npm install`
2. Crie `.env.local` a partir de `.env.example`.
3. Preencha as variaveis Firebase do projeto `megasena-b32bf`.
4. No Firebase Console, habilite `Authentication > Anonymous`.
5. Rode:
   `npm run dev`

## Regras Firestore (single-user)
As regras estao em `firestore.rules` e permitem acesso para sessao autenticada (inclui anonimo).

Para publicar regras e indexes:
- `firebase deploy --only firestore:rules,firestore:indexes`

## Deploy PWA (Firebase Hosting)
1. Build:
   `npm run build`
2. Deploy:
   `firebase deploy --only hosting`

## Deploy via GitHub Pages
1. Gere o build para subpasta do repositório:
   `npm run build:ghpages`
2. Publique o conteúdo da pasta `dist` no branch `gh-pages`.
3. Em `Settings > Pages`, configure:
   - Source: `Deploy from a branch`
   - Branch: `gh-pages` / folder `/ (root)`

### Deploy automatico (recomendado)
- O workflow `.github/workflows/deploy.yml` publica automaticamente no branch `gh-pages` a cada push na `main`.
- Configure os secrets do repositório em `Settings > Secrets and variables > Actions`:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- Mantenha no GitHub Pages:
  - Source: `Deploy from a branch`
  - Branch: `gh-pages` / folder `/ (root)`

## Fase 2 entregue
- [x] Importador XLSX para `draws`
- [x] Dedupe por concurso
- [x] Escrita em lote no Firestore
- [x] Dashboard `Stats` com dados reais

## Fase 3 (parcial) entregue
- [x] CRUD de jogos (`bets`) com fallback local
- [x] Conferencia automatica de jogos no historico
- [x] Resumo de quadras, quinas e senas por carteira
