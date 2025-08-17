## AutomacaoBot — Frontend

Interface web do AutomacaoBot, construída com React, TypeScript e Vite.

### Tecnologias
- React 19
- TypeScript
- Vite 6
- ESLint

## Requisitos
- Node.js 18 ou superior (recomendado: 20+)
- npm 9+ (ou pnpm/yarn, se preferir)
- Backend do AutomacaoBot rodando (por padrão em `http://localhost:4000`)

## Instalação
1) Clone o repositório
```bash
git clone <URL_DO_REPOSITORIO>
cd Frontend
```

2) Instale as dependências
```bash
npm install
# ou: pnpm install / yarn
```

3) Configure variáveis de ambiente (opcional porém recomendado)

Este frontend pode consumir APIs e sockets de um backend externo. Por padrão, a tela `Validador` usa `VITE_API_URL` (e cai para `http://localhost:4000` se a variável não existir). Crie um arquivo `.env` ou `.env.local` na raiz do projeto com:
```bash
VITE_API_URL=http://localhost:4000
```

Observações:
- Algumas páginas ainda utilizam `http://localhost:4000` diretamente. Se você hospedar o backend em outra origem, ajuste essas URLs no código ou unifique o uso de `VITE_API_URL`.
- Sempre que mudar o `.env`, reinicie o servidor de desenvolvimento.

## Executando em desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173`.

## Build de produção
```bash
npm run build
```
Os artefatos serão gerados em `dist/`.

### Pré-visualizar a build
```bash
npm run preview
```
Servirá a pasta `dist/` localmente para testes.

## Qualidade de código
```bash
npm run lint
```
A configuração do ESLint já está preparada para TS/React.

## Integração com o Backend
O frontend espera que o backend exponha rotas (e socket) semelhantes às usadas no código:
- Socket.io: conexão no host definido por `VITE_API_URL`
- REST (exemplos):
  - `GET /api/empresas`
  - `GET /api/empresas/:id`
  - `POST /api/empresas`
  - `PUT /api/empresas/:id`
  - `DELETE /api/empresas/:id`
  - `POST /api/upload-cnpj`
  - `GET /api/validacoes/:nomeContabilidade`
  - `POST /api/executar-validacao`
  - `POST /api/salvar-json`
  - `POST /api/pausar-automacao`
  - `POST /api/parar-automacao`
  - `GET /empresas/validacoes/:nomeTratado`

Se o backend estiver em outra origem (domínio/porta diferentes):
- Defina `VITE_API_URL` para apontar para o backend.
- Garanta CORS habilitado no backend para a origem do frontend (ex.: `http://localhost:5173`).

## Scripts
- `dev`: inicia o servidor de desenvolvimento Vite.
- `build`: compila TypeScript e gera a build de produção.
- `preview`: serve a build gerada em `dist/`.
- `lint`: roda o ESLint nos arquivos do projeto.

## Estrutura (resumo)
```
src/
  pages/           # Páginas (Login, Home, Validador, Contabilidades, etc.)
  components/      # Componentes reutilizáveis
  styles/          # SCSS (globais e de páginas)
  App.tsx          # Rotas da aplicação
  main.tsx         # Bootstrap do React
```

## Solução de problemas
- Porta 5173 já em uso: encerre o processo que usa a porta ou inicie com outra porta: `npm run dev -- --port 5174`.
- Variáveis `.env` não aplicam: reinicie `npm run dev` após mudanças.
- CORS ao chamar o backend: habilite CORS no backend e/origins corretas.
- Socket não conecta: verifique `VITE_API_URL`, CORS de websockets e se o servidor socket está ativo.

## Licença
MIT

— Feito com React, TypeScript e Vite.
