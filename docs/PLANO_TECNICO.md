# Plano Técnico — Avaliação Back-End Outsera (PO)

Status: **aguardando aprovação** para execução pelo `Developer`.
Contexto: `.agents/project-context.md` · Especificação: `docs/avaliacao_outsera_back_end.md` · Workflow: `.agents/AGENTES.md`.

## 1. Escopo

API REST para consulta dos intervalos entre prêmios consecutivos do produtor na categoria Pior Filme, com carga inicial de `docs/Movielist.csv` em SQLite em memória, execução via Node/TypeScript/Express e inicialização facilitada por Docker.

## 2. Regras de negócio e de dados

| # | Regra |
|---|-------|
| R1 | Ler o CSV no **bootstrap** da aplicação e gravar os dados em SQLite `:memory:`; nenhuma instalação externa de banco. |
| R2 | CSV com delimitador `;` e cabeçalho `year;title;studios;producers;winner`. Aceitar BOM UTF-8 e linhas vazias no fim. |
| R3 | `winner` é vencedor somente quando o valor, após trim, for `yes` (case-insensitive). Os demais indicados são ignorados no cálculo. |
| R4 | `producers` pode conter vários nomes separados por `,`, ` and ` ou `, and `. Dividir por `,`/` and `, aparar espaços e deduplicar nomes dentro do mesmo filme. Preservar a grafia original (sem lowercasing). |
| R5 | `year` deve ser inteiro válido. Ano inválido ou CSV ausente/ilegível = falha no startup com erro claro; nunca iniciar com dados parciais (carga em transação única). |
| R6 | Agrupar vitórias por par **(produtor, ano)** — um produtor com dois filmes vencedores no mesmo ano conta como uma vitória naquele ano. |
| R7 | Para cada produtor com **2 ou mais anos distintos** de vitória, ordenar os anos e formar pares consecutivos: `interval = followingWin - previousWin`. Produtor com um único ano não gera intervalo. |
| R8 | `min` = todos os pares com menor intervalo; `max` = todos os pares com maior intervalo. **Empates devem retornar todos os registros**. Sem nenhum par, retornar `min: []` e `max: []`. |
| R9 | Resposta exatamente no formato da especificação: array de objetos `{ producer, interval, previousWin, followingWin }`. |
| R10 | Nenhum valor do dataset de referência pode ser fixado no código: a avaliação usará outros CSVs no mesmo formato. |

## 3. Regras da API

| # | Regra |
|---|-------|
| A1 | `GET /api/producers/intervals` → `200` + `application/json` com `{ min, max }`. |
| A2 | Rota desconhecida → `404` em JSON; erro interno inesperado → `500` em JSON. Nunca devolver stack trace. |
| A3 | Nível 2 de Richardson:URI como substantivo, verbo HTTP semântico (`GET`), códigos de status corretos. |
| A4 | Porta configurável por `PORT` (padrão `3000`), bind em `0.0.0.0` para funcionar no container. |

## 4. Regras de infraestrutura / Docker

| # | Regra |
|---|-------|
| D1 | SQLite em memória via módulo nativo `node:sqlite` do Node 22, com a flag `--experimental-sqlite` nos scripts. Sem driver nativo de terceiros para compilar na imagem. |
| D2 | `Dockerfile` multi-stage: build com `node:22-alpine` + `npm ci`; runtime com apenas dependências de produção, arquivos compilados e o CSV copiado para `/app/data/Movielist.csv`; executar como usuário `node`. |
| D3 | `docker-compose.yml`: build local, porta `3000:3000`, `CSV_PATH=/app/data/Movielist.csv` e montagem somente-leitura do CSV do repo (trocar o dataset sem rebuild). |
| D4 | `.dockerignore` para `node_modules`, `dist`, `.git`, logs. |
| D5 | README documentando `docker compose up --build`, `npm install && npm test` e o `curl` de verificação. |

## 5. Bibliotecas

- **Runtime:** `express`.
- **Dev:** `typescript`, `@types/node`, `@types/express`.
- **Nativas (sem dependência):** `node:sqlite`, `node:test`, `node:assert`, `fetch` do próprio Node.
- **Não usar:** `csv-parse` (o formato é fixo e não há aspas no dataset), `supertest` (o teste sobe HTTP real), `tsx`/`dotenv` (compilação com `tsc` e env do processo/Docker).

> **Nota (2026-11-25):** `dotenv` passou a ser usado conforme a seção 16; a restrição acima foi supersedida apenas para ele.

## 6. Arquivos a criar

| Arquivo | Responsabilidade |
|---------|------------------|
| `package.json` | Deps e scripts `build`, `start`, `test`, `dev`. |
| `tsconfig.json` | `target ES2022`, `module commonjs`, `rootDir .`, `outDir dist`, `esModuleInterop`. |
| `src/db.ts` | Abertura do SQLite `:memory:`, parse simples do CSV, carga transacional. |
| `src/awards.ts` | Cálculo dos intervalos e empates a partir das vitórias. |
| `src/app.ts` | Factory do app Express com a rota e tratamento de erros/404. |
| `src/server.ts` | Bootstrap: ler `CSV_PATH`/`PORT`, carregar DB, escutar. |
| `test/awards.integration.test.ts` | Testes de integração via servidor HTTP real e CSV temporário. |
| `Dockerfile`, `.dockerignore`, `docker-compose.yml` | Execução da API em container. |
| `.gitignore` | `node_modules/`, `dist/`, logs locais. |
| `README.md` | Instruções de execução local/Docker e testes. |
| `AGENT_LOG.md` | Registro em texto das interações com agentes ( requisito da avaliação ). |

Ação adicional: `git init` na raiz do projeto (hoje não há repositório).

## 7. Checklist do Developer

1. `git init` e criar `.gitignore`.
2. `package.json` + `tsconfig.json`; `npm install`.
3. `src/db.ts`: carga do CSV em SQLite em memória (R1–R5).
4. `src/awards.ts`: intervalos e empates (R6–R8).
5. `src/app.ts` + `src/server.ts`: rota, erros e bootstrap (A1–A4).
6. `test/awards.integration.test.ts`: fixture alternativa com empate, 1-vitória e múltiplos produtores; smoke test com o CSV de referência (R10).
7. Dockerfile/compose e README (D1–D5).
8. Rodar `npm test` e `docker compose up --build` + `curl`.
9. Atualizar `AGENT_LOG.md` com a passagem pelo `Developer`.

## 8. Critérios de aceite (QA / Reviewer)

- Dataset de referência: `min` = `{ producer: "Joel Silver", interval: 1, previousWin: 1990, followingWin: 1991 }`; `max` = `{ producer: "Matthew Vaughn", interval: 13, previousWin: 2002, followingWin: 2015 }`.
- Teste com CSV **diferente** do fornecido, cobrindo empate em `min`/`max`, produtor com uma vitória e produtores separados por `,`/`and`.
- **Somente testes de integração** (sem testes unitários).
- `npm test` e `docker compose up --build` funcionando do zero.
- Nenhum dado do CSV de referência hardcoded na lógica.

## 9. Fora de escopo

Paginação, ordenação configurável, autenticação, persistência em disco, CI e testes unitários. (A rota de leitura de filmes com filtros foi incluída na seção 10.)

## 10. Rota de leitura de filmes com filtros (PO — 2026-11-24)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "crie rota para buscar todos os dados do banco. Nessa mesma rota deve ser possível informar dados para filtrar por year, title, studios, producers e winner".

### Regras

| # | Regra |
|---|-------|
| M1 | O banco passa a ter também a tabela `movies` com **todas** as linhas do CSV (`year`, `title`, `studios`, `producers`, `winner` como inteiro 0/1). A tabela `wins` e a rota `/api/producers/intervals` permanecem intactas. |
| M2 | `parseCsv` faz uma única passada e devolve `{ movies, wins }`; `title`, `studios` e `producers` são aparados, preservando a grafia e os separadores originais de `producers`. `winner` é `true` somente para `yes` (case-insensitive). Carga em transação única. |
| M3 | `GET /api/movies` devolve um **array** de objetos `{ year, title, studios, producers, winner: boolean }`, ordenado por `year` e depois `title`. Sem paginação. |
| M4 | Filtros opcionais via query string, combinados com **AND**: `year` (inteiro, igualdade exata); `title`, `studios`, `producers` (substring case-insensitive); `winner` (`true` ou `false`, minúsculos). |
| M5 | Query é validada com **Zod** no controller. Parâmetro inválido → `400` em JSON com `{ error: "Parâmetros de consulta inválidos" }`; parâmetros desconhecidos são ignorados. |
| M6 | Uma única `SELECT` preparada, com cláusulas fixas usando parâmetros nulos quando o filtro ausenta (`instr(lower(coluna), lower(?)) > 0` para texto). **Nenhuma concatenação de SQL**. |
| M7 | Somente testes de integração: ampliar a fixture alternativa com estúdios/títulos distintos em não-vencedores e cobrir cada filtro, combinação de filtros, 400 e a rota antiga (regressão). |
| M8 | README documenta a nova rota, os filtros e um exemplo de `curl`. Docker, `server.ts` e `awards.ts` não mudam. |

### Arquivos a modificar

`src/db.ts` (modelo + repositório), `src/app.ts` (rota + validação/400), `test/awards.integration.test.ts` (testes reaproveitando os helpers existentes), `README.md`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. `src/db.ts`: tabela `movies`, parse em uma passada, método `allMovies(filters)` com prepared statement.
2. `src/app.ts`: schema Zod da query, rota `GET /api/movies`, handler de 400 antes do 404.
3. Testes de integração com a fixture existente ampliada (sem duplicar helpers).
4. README + `AGENT_LOG.md`.
5. `npm test` (todos verdes) e nenhum commit.

### Critérios do Reviewer

- `GET /api/movies` sem filtros retorna **todas** as linhas, inclusive `winner: false`.
- Cada filtro funciona isolado e em combinação; `winner=true/false` correto; `title/studios/producers` case-insensitive sem interpretar `%`/`_` como curinga.
- `year=abc` e `winner=maybe` → 400 em JSON; rota de intervalos continua retornando os mesmos valores de referência.
- Tipagem estrita sem `any`, Zod na query, prepared statement sem SQL concatenado.

## 11. Documentação Swagger / OpenAPI (PO — 2026-11-24)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "implemente o uso do swagger".

### Regras

| # | Regra |
|---|-------|
| S1 | Adicionar `swagger-ui-express` como dependência de runtime e `@types/swagger-ui-express` como devDependency. **Não** usar `swagger-jsdoc`, `zod-to-json-schema` nem CDN: a UI é servida localmente e funciona no Docker. |
| S2 | Especificação OpenAPI **3.0.3** escrita como objeto TypeScript em `src/openapi.ts` (sem exemplos com dados do CSV, para não criar drift): `info`, os dois paths implementados e componentes reutilizáveis `ProducerInterval`, `Intervals`, `Movie` e `Error`. |
| S3 | Montar antes do middleware 404: `GET /api-docs/` serve a UI Swagger e `GET /api/openapi.json` serve o JSON cru, ambos com `200`. Rotas desconhecidas continuam `404`. |
| S4 | A spec deve refletir o código: `/api/producers/intervals` (GET, 200/500) e `/api/movies` (GET com os 5 parâmetros opcionais `year`, `title`, `studios`, `producers`, `winner`, 200/400/500). `winner` é booleano no schema, com valores de query `true`/`false`. |
| S5 | Tipagem estrita sem `any`: se os tipos da lib não casarem com o objeto literal, usar `Parameters<typeof swaggerUi.setup>[0]` ou uma `interface` mínima local — nunca `any`. |
| S6 | Testes **somente de integração**, reaproveitando `withApi`/`get`: `GET /api-docs/` → HTML da Swagger UI; `GET /api/openapi.json` → JSON com os dois paths e os parâmetros esperados. Todos os testes anteriores continuam passando. |
| S7 | README ganha uma seção curta com as duas URLs e o comando de verificação. Nenhuma alteração em `Dockerfile`, `docker-compose.yml`, `server.ts`, `db.ts` ou `awards.ts` (as deps entram no build da imagem via `npm ci`). |

### Arquivos a modificar

`package.json`, `package-lock.json`, `src/openapi.ts` (novo), `src/app.ts`, `test/awards.integration.test.ts`, `README.md`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. `npm install swagger-ui-express` e `npm install -D @types/swagger-ui-express`.
2. Criar `src/openapi.ts` com a spec dos dois endpoints.
3. Montar `/api-docs/` e `/api/openapi.json` em `src/app.ts` antes do 404.
4. Testes de integração das duas rotas de documentação + README + `AGENT_LOG.md`.
5. `npm run build` e `npm test`; nenhum commit.

### Critérios do Reviewer

- Swagger UI abre localmente e no container, sem CDN; `/api/openapi.json` é JSON válido com os dois paths e os parâmetros corretos.
- A spec não contradiz as rotas reais (status, nomes de parâmetros, types).
- Sem `any`, sem dependência desnecessária, sem registro de dados do dataset na spec.
- `npm test` verde e rotas existentes inalteradas.

## 12. Logs estruturados com pino/pino-http (PO — 2026-11-24)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "implemente logs estruturados utilizando pino e pino-http para gerar logs com o tempo de execução da requisição".

> **Nota (2026-11-25):** L4–L6 e o critério de formato desta seção foram superseded pela seção 13; L1–L3 e L7–L9 permanecem válidos.

### Regras

| # | Regra |
|---|-------|
| L1 | Adicionar `pino` e `pino-http` como dependências de runtime. **Não** adicionar `pino-pretty`: em produção o log é JSON em stdout. |
| L2 | Nova env `LOG_LEVEL` validada com **Zod** em `src/server.ts` (enum `fatal|error|warn|info|debug|trace`, padrão `info`). Criar `src/utils/logger.ts` concentrando os imports de `pino` e `pino-http`: expõe `createLogger(level, destination?)` com `redact` de `req.headers.authorization`/`req.headers.cookie` e `requestLogger(logger)` (middleware). Nenhuma leitura direta de `process.env` fora do `server.ts`. |
| L3 | `createApp(repository, logger)` passa a exigir o logger; `requestLogger(logger)` de `src/utils/logger.ts` é o **primeiro** middleware, antes das rotas e do 404 — `app.ts` não importa `pino` nem `pino-http` diretamente. O handler de erros troca `console.error` por `logger.error({ err: error }, ...)`; o startup também usa `logger.info`/`logger.error`. |
| L4 | O log de conclusão padrão do `pino-http` já traz `responseTime` (ms), `req.method`, `req.url` e `res.statusCode`. Não criar header de response-time nem middleware extra só para medir tempo. |
| L5 | Testes **somente de integração**: o helper `withApi` passa um logger silencioso por padrão (sem poluir a saída) e um teste injeta logger com stream de captura, faz uma requisição real e afirma que existe linha JSON com `responseTime` numérico e os campos da requisição. |
| L6 | README documenta `LOG_LEVEL`, um exemplo de linha de log e que todas as rotas (incluindo `/api-docs/` e `/api/openapi.json`) são logadas. Swagger não muda. |
| L7 | Docker sem alteração de arquivos; `LOG_LEVEL` pode ser passada por env no `docker run`/compose como as demais variáveis. |
| L8 | Tipagem estrita sem `any`; nenhum segredo ou corpo de requisição é logado. |
| L9 | A centralização pedida vale para as libs de log: `pino`/`pino-http` são importados **apenas** em `src/utils/logger.ts`; `app.ts`, `server.ts` e os testes importam a fachada local. Express, Zod e Swagger permanecem nos arquivos atuais — centralizá-los seria outra mudança, fora deste escopo. |

### Arquivos a modificar

`package.json`, `package-lock.json`, `src/utils/logger.ts` (novo), `src/app.ts`, `src/server.ts`, `test/awards.integration.test.ts`, `README.md`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. `npm install pino pino-http`.
2. Criar `src/utils/logger.ts` com `createLogger(level, destination?)`, `requestLogger(logger)` e redaction.
3. `src/server.ts`: validar `LOG_LEVEL`, criar logger e usá-lo no startup.
4. `src/app.ts`: exigir logger, montar `requestLogger(logger)` primeiro e logar erros com `logger.error`.
5. Ajustar `withApi` para logger silencioso e adicionar teste de captura do log com `responseTime`.
6. README + `AGENT_LOG.md`; `npm run build` e `npm test` verdes; nenhum commit.

### Critérios do Reviewer

- Toda requisição gera exatamente um log estruturado JSON com `responseTime`, método, URL e status; 400/404/500 também logados.
- `LOG_LEVEL` inválida falha no startup com erro claro; nenhuma env lida fora do `server.ts`.
- Authorization/cookie não aparecem no log; sem `console.log`/`console.error` no caminho das requisições.
- `npm test` verde (testes anteriores + novo), sem `any`, sem dependência extra desnecessária, Docker e rotas inalterados.

## 13. Reduzir o log de requisição a URL + tempo (PO — 2026-11-25)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "está sendo gerada muita informação no log. configure o pino para exibir apenas a url chamada e o tempo de resposta".

> **Nota (2026-11-25):** o formato do `responseTime` foi emendado pela seção 14; o restante desta seção permanece válido.

### Regras

| # | Regra |
|---|-------|
| N1 | **Corrigir bug existente:** `createLogger(level, destination?)` em `src/utils/logger.ts:9` ignora o parâmetro e fixa `level: 'info'` com comentário incorreto. Passar a usar o `level` recebido, para que `LOG_LEVEL` validado no `server.ts` finalmente tenha efeito. |
| N2 | `requestLogger(logger)` configura o `pino-http` com `customSuccessObject`/`customErrorObject` retornando **somente** `{ url: req.url, responseTime }`. Sem `req`, `res`, `err`, `method`, `statusCode`, headers, corps ou mensagem. |
| N3 | Mensagem removida via `customSuccessMessage`/`customErrorMessage` retornando `undefined` (os tipos do `pino-http` exigem `string`, então usar um helper tipado com `unknown` — nunca `any`). Metadados padrão também saem da linha: `timestamp: false` e `formatters.level: () => ({})`; `base: undefined` já remove `pid`/`hostname`. Resultado alvo: `{"url":"/api/movies","responseTime":4}`. |
| N4 | Logs de erro do próprio app (`logger.error({ err }, ...)`) continuam existindo para diagnóstico — a redução vale para o log automático de requisição do `pino-http`. A redaction existente pode permanecer como defesa em profundidade. |
| N5 | Atualizar o teste de log em `test/awards.integration.test.ts` para exigir exatamente as chaves `url`/`responseTime`, os valores da requisição e a ausência de `msg`, `req`, `res`, `level`, `time`, `pid` e `hostname`. Manter os headers secretos no teste como garantia de que não vazam. |
| N6 | README: substituir o exemplo de log pelo formato minimalista e registrar que `LOG_LEVEL` agora é respeitada. |
| N7 | Nenhuma dependência nova; `src/app.ts`, `src/server.ts`, Docker, rotas e demais fontes intactos. |

### Arquivos a modificar

`src/utils/logger.ts`, `test/awards.integration.test.ts`, `README.md`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. Corrigir `createLogger` para usar o parâmetro `level` e remover o comentário enganoso.
2. Configurar `requestLogger` com os dois `custom*Object`, os dois `custom*Message` sem mensagem e a supressão de `level`/`time`.
3. Ajustar o teste de captura para o formato exato; rodar `npm test` (8/8) e `npm run build`.
4. README + `AGENT_LOG.md`; nenhum commit.

### Critérios do Reviewer

- Linha de log de requisição contém **apenas** `url` e `responseTime`, inclusive em 400/404/500.
- `LOG_LEVEL` altera o comportamento do logger (nível passa a ser honrado); nenhum segredo/header aparece.
- Erros do handler continuam logados com detalhe; sem `any`, sem dependência nova, sem mudança de rotas/Docker.

## 14. Evidenciar a unidade do `responseTime` (PO — 2026-11-25)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "quer que evidencie em qual unidade está o valor do response time. Por exemplo 7 ms".

### Regras

| # | Regra |
|---|-------|
| U1 | Manter **exatamente** as chaves `url` e `responseTime`. Não criar campo `responseTimeUnit` nem outro campo — o objetivo continua sendo um log mínimo. |
| U2 | Em `src/utils/logger.ts`, `requestLogObject` passa a retornar `responseTime` como string no formato `<inteiro> ms` (ex.: `"7 ms"`). O número já vem do `pino-http`; apenas acrescentar o sufixo, sem criar nova medição de tempo. |
| U3 | O mesmo formato vale para sucesso e erro: `customSuccessObject` e `customErrorObject` continuam usando o mesmo helper. |
| U4 | Atualizar o teste de captura em `test/awards.integration.test.ts`: manter as chaves exatas, a URL e os headers secretos; trocar a asserção de `number` por regex `/^\d+ ms$/` (com checagem de que o número é finito/não negativo). Continuar esperando o evento de log, sem `setTimeout`. |
| U5 | README: exemplo passa a `{"url":"/api/producers/intervals","responseTime":"7 ms"}` e o texto deixa claro que `ms` significa milissegundos. Demais parágrafos inalterados. |
| U6 | Nenhuma dependência nova; `src/app.ts`, `src/server.ts`, Docker, rotas e demais fontes intactos. |

### Arquivos a modificar

`src/utils/logger.ts`, `test/awards.integration.test.ts`, `README.md`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. Formatar `responseTime` como `` `${ms} ms` `` no helper de `src/utils/logger.ts`.
2. Ajustar o teste para aceitar string no formato `<inteiro> ms`, preservando as demais asserções.
3. Atualizar o README e o status da seção 14 para `aprovado`; rodar `npm run build` e `npm test` (8/8).
4. Registrar a Interação 21 no `AGENT_LOG.md`; nenhum commit.

### Critérios do Reviewer

- Linha de log contém apenas `url` e `responseTime`, inclusive em 400/404/500.
- `responseTime` é string no formato `<inteiro> ms`; valores secretos continuam ausentes.
- Sem `any`, sem dependência nova, sem mudança de rotas/Docker; `npm test` 8/8.

## 15. Separar a aplicação em pastas (PO — 2026-11-25)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "separe em pastas os arquivos da aplicação. server, db, controller, routes e service. O app deve importar de um outro arquivo as rotas, e as rotas devem importar de outros arquivos os controllers".

> **Nota:** seções anteriores que citam `src/app.ts`, `src/server.ts`, `src/db.ts`, `src/awards.ts` ou `src/openapi.ts` devem ser lidas com os novos caminhos desta seção. Comportamento, rotas, respostas e logs não mudam.

### Regras

| # | Regra |
|---|-------|
| D1 | Estrutura alvo: `src/server/` (`app.ts`, `server.ts`), `src/db/repository.ts`, `src/controller/` (`movies.ts`, `producers.ts`), `src/routes/` (`index.ts`, `openapi.ts`), `src/service/awards.ts`. `src/utils/logger.ts` permanece onde está. Usar `git mv` para preservar histórico. |
| D2 | `src/server/app.ts` mantém `createApp(repository, logger)`: `requestLogger` continua sendo o **primeiro** middleware, depois vem `createRoutes(repository)`, e só então 404 e 500. O app **não** define rotas nem valida query: importa as rotas de `../routes`. |
| D3 | `src/routes/index.ts` exporta `createRoutes(repository): Router` e registra `/api/producers/intervals`, `/api/movies`, `/api/openapi.json` e `/api-docs`, nessa ordem. As rotas importam os controllers de `../controller/*`; os endpoints de documentação usam `../routes/openapi` e `swagger-ui-express` diretamente, sem controller extra. |
| D4 | `src/controller/producers.ts` chama `getProducerIntervals(repository.allWins())`. `src/controller/movies.ts` mantém o schema Zod da query (movido do app), responde `400` em JSON se inválido e chama `repository.allMovies(parsed.data)`. Ambos Retornam `RequestHandler` tipado, sem `any`. |
| D5 | `src/service/awards.ts` contém a lógica atual de intervalos e importa tipos de `../db/repository`. `src/db/repository.ts` contém o repositório atual, inalterado. |
| D6 | `src/server/server.ts` mantém a validação Zod de `PORT`/`CSV_PATH`/`LOG_LEVEL` e o bootstrap; nenhuma leitura de `process.env` fora dele. Ajustar `package.json` (`main` e script `start`) e `Dockerfile` (`CMD`) para `dist/src/server/server.js`. |
| D7 | Atualizar os imports do teste de integração (`../src/service/awards`, `../src/server/app`, `../src/db/repository`) sem mudificar asserções. Nenhuma dependência nova; `npm test` permanece 8/8; Docker, README e comportamento das rotas inalterados. |

### Arquivos a modificar

Mover: `src/app.ts` → `src/server/app.ts`, `src/server.ts` → `src/server/server.ts`, `src/db.ts` → `src/db/repository.ts`, `src/awards.ts` → `src/service/awards.ts`, `src/openapi.ts` → `src/routes/openapi.ts`.
Criar: `src/controller/movies.ts`, `src/controller/producers.ts`, `src/routes/index.ts`.
Ajustar: `package.json`, `Dockerfile`, `test/awards.integration.test.ts`, `docs/PLANO_TECNICO.md`, `AGENT_LOG.md`.

### Checklist do Developer

1. `git mv` dos cinco arquivos e criação dos três novos, conforme D1–D5.
2. Ajustar imports internos e o entrypoint em `package.json`/`Dockerfile` (D6).
3. Ajustar imports do teste; rodar `npm run build` e `npm test` (8/8).
4. Atualizar o status da seção 15 e registrar a Interação 24 no `AGENT_LOG.md`; nenhum commit.

### Critérios do Reviewer

- `src/server/app.ts` não declara rotas nem validação de query; importa `createRoutes` de `../routes`.
- `src/routes/index.ts` registra as quatro rotas e importa os controllers de `../controller/*`.
- `requestLogger` continua primeiro; 404/500 continuam depois das rotas; logs seguem `{ url, responseTime: "<n> ms" }`.
- Entrypoint compilado `dist/src/server/server.js` existe e é usado por `npm start` e Docker.
- Sem dependência nova, sem `any`, sem mudança de comportamento; `npm test` 8/8.

## 16. Configuração via `.env` (PO — 2026-11-25)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "quero incluir um arquivo `.env` para configuração. crie a implementação e um arquivo `.env.example`".

### Regras

| # | Regra |
|---|-------|
| E1 | Adicionar `dotenv` como dependência de runtime. Em `src/server/server.ts`, importar `'dotenv/config'` como **primeira linha**, antes de qualquer leitura/validação de env, para que `.env` seja carregado antes do `envSchema.parse(process.env)`. Nenhum outro arquivo lê `.env`. |
| E2 | Comportamento do `dotenv` padrão é preservado: variável já existente no `process.env` (shell, `docker run -e`/`--env-file`, `environment:` do compose) **não** é sobrescrita pelo `.env`. Assim, os overrides atuais continuam funcionando. |
| E3 | Criar `.env.example` versionado com as três variáveis já existentes: `PORT=3000`, `LOG_LEVEL=info` e `CSV_PATH=docs/Movielist.csv`, com um comentário curto de que dentro do Docker o caminho deve ser `/app/data/Movielist.csv` (ou a linha deve ser removida). **Não** criar nem versionar um `.env` real. |
| E4 | `.gitignore`: adicionar `.env` (sem ignorar `.env.example`). `.dockerignore`: adicionar `.env` para que nenhuma configuração local entre na imagem. `docker-compose.yml` e `Dockerfile` não mudam. |
| E5 | README: ensinar `cp .env.example .env`, explicar a precedência do item E2 e o ajuste de `CSV_PATH` para Docker. Manter a documentação existente de variáveis e exemplos de `CSV_PATH`. |
| E6 | Nenhuma mudança em `app.ts`, rotas, controllers, service, db, logger, respostas, logs ou testes. Sem nova dependência além de `dotenv`; sem `any`. Não é necessário novo teste automatizado: a mudança é um import de configuração; validar manualmente com `.env` presente e com variável de shell sobrepondo o arquivo. |

### Arquivos a modificar

`package.json`, `package-lock.json`, `src/server/server.ts`, `.env.example` (novo), `.gitignore`, `.dockerignore`, `README.md`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. `npm install dotenv` e adicionar `import 'dotenv/config'` no topo de `src/server/server.ts`.
2. Criar `.env.example` e ajustar `.gitignore`/`.dockerignore`.
3. Atualizar README, status da seção 16 e `AGENT_LOG.md` (Interação 27).
4. Rodar `npm run build` e `npm test` (8/8); validar `npm start` com `.env` copiado e com override de shell; nenhum commit.

### Critérios do Reviewer

- `dotenv/config` é a primeira instrução de `src/server/server.ts` e não aparece em outro arquivo.
- `.env` está ignorado por Git e Docker; `.env.example` está versionado com as três variáveis e o aviso sobre Docker.
- Variável de shell/Docker continua prevalecendo sobre `.env`; Zod e defaults intactos.
- `npm test` 8/8, `npm run build` limpo, sem `any`, sem mudança de rotas/respostas/logs; `npm audit` sem vulnerabilidades novas.

## 17. Substituir o último `console` por logger (PO — 2026-11-25)

Status: **aprovado** para o `Developer`. Solicitação do usuário: "altere todos os console. para utilizar o logger com o pino".

### Regras

| # | Regra |
|---|-------|
| C1 | Substituir o único `console.error` restante em `src/server/server.ts` (`main().catch`) por `logger.error({ err: error }, 'Falha na inicialização')`. Manter `process.exitCode = 1`. |
| C2 | Criar o logger no escopo do módulo, **antes** de `main()`, para que o `.catch` também tenha logger mesmo quando a validação do env falha. Derivar o nível de `envSchema.shape.LOG_LEVEL.safeParse(process.env.LOG_LEVEL)`, com fallback `info` se o valor for inválido; remover a criação duplicada dentro de `main()` e reaproveitar o mesmo logger no startup e no `server.on('error')`. |
| C3 | Nenhum `console.log`/`console.error`/`console.warn` em `src/` ou `test/` — grep deve retornar zero. Menções históricas em `docs/PLANO_TECNICO.md`/`AGENT_LOG.md` são registros, não código, e não precisam ser reescritas. |
| C4 | Sem dependência nova, sem `any`, sem mudança em app, rotas, controllers, service, db, `utils/logger.ts`, README, Docker ou testes. Em caso de env inválido, a saída passa a ser JSON estruturado em vez de texto puro. |
| C5 | Não adicionar teste automatizado: a alteração é uma linha de log mais a movimentação da criação do logger. Validar manualmente com env inválido (ex.: `PORT=abc npm start`) e com env válido. |

### Arquivos a modificar

`src/server/server.ts`, `docs/PLANO_TECNICO.md` e `AGENT_LOG.md`.

### Checklist do Developer

1. Mover/criar o logger no topo de `src/server/server.ts` com nível validado/fallback e remover a criação interna.
2. Trocar `console.error` do `.catch` por `logger.error({ err: error }, ...)`.
3. Rodar grep de `console.` em `src/` e `test/`, `npm run build` e `npm test` (8/8) e validar manualmente env inválido/válido.
4. Atualizar o status da seção 17 e registrar a Interação 29 no `AGENT_LOG.md`; nenhum commit.

### Critérios do Reviewer

- Grep zero para `console.` em código-fonte e testes; `pino` continua isolado em `src/utils/logger.ts`.
- Logger existe antes de `main()`; falha de validação do env gera linha JSON via logger; `LOG_LEVEL` válido continua honrado.
- Sem `any`, sem deps novas, sem mudança de comportamento das rotas/logs de requisição; `npm test` 8/8.

