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

