# API — Intervalos entre prêmios (Pior Filme)

API REST que lê `docs/Movielist.csv` na inicialização, carrega todas as linhas em
SQLite em memória e expõe a consulta de filmes e os produtores com os menores e
maiores intervalos entre prêmios consecutivos.

## Requisitos

- Node.js 22+ (usa `node:sqlite`, com a flag `--experimental-sqlite`) ou Docker.

## Rodando com Docker

```bash
docker compose up --build
```

A API fica em `http://localhost:3000`. O compose monta `./docs/Movielist.csv`
como somente-leitura em `/app/data/Movielist.csv` e define
`CSV_PATH=/app/data/Movielist.csv`. Para usar outro CSV sem rebuild, basta trocar
a origem do volume no `docker-compose.yml`:

```yaml
volumes:
  - ./outro.csv:/app/data/Movielist.csv:ro
```

Para sobrepor `CSV_PATH` diretamente, sem compose:

```bash
docker build -t outsera-api .
docker run --rm -p 3000:3000 \
  -e CSV_PATH=/app/data/outro.csv \
  -v "$PWD/outro.csv:/app/data/outro.csv:ro" \
  outsera-api
```

## Rodando localmente

```bash
npm install
npm run build
npm start
```

Para usar um arquivo de configuração local, copie o exemplo e edite:

```bash
cp .env.example .env
```

Variáveis de ambiente (opcionais):

- `PORT` — porta HTTP (padrão `3000`);
- `LOG_LEVEL` — nível dos logs: `fatal`, `error`, `warn`, `info`, `debug` ou
  `trace` (padrão `info`);
- `CSV_PATH` — caminho do CSV (padrão `docs/Movielist.csv`). Exemplo:

```bash
CSV_PATH=./outro.csv npm start
```

Variáveis já definidas no ambiente (shell, `-e`/`--env-file` do Docker ou
`environment:` do compose) têm precedência sobre o `.env`. Em Docker, use
`CSV_PATH=/app/data/Movielist.csv` no `.env` ou remova essa linha para herdar o
valor da imagem.

## Verificação

```bash
curl http://localhost:3000/api/producers/intervals
```

Resposta esperada com o dataset fornecido:

```json
{
  "min": [{ "producer": "Joel Silver", "interval": 1, "previousWin": 1990, "followingWin": 1991 }],
  "max": [{ "producer": "Matthew Vaughn", "interval": 13, "previousWin": 2002, "followingWin": 2015 }]
}
```

## Consulta de filmes

`GET /api/movies` retorna todas as linhas do CSV como
`{ year, title, studios, producers, winner }`, ordenadas por `year` e `title`.

Filtros opcionais na query, combinados com `AND`:

| Parâmetro | Regra |
|-----------|-------|
| `year` | inteiro exato |
| `title`, `studios`, `producers` | substring case-insensitive (`%` e `_` são literais) |
| `winner` | `true` ou `false` (minúsculos) |

Parâmetro inválido retorna `400` com
`{"error":"Parâmetros de consulta inválidos"}`; parâmetros desconhecidos são
ignorados.

```bash
curl 'http://localhost:3000/api/movies?year=2000&producers=solo&winner=true'
curl 'http://localhost:3000/api/movies?studios=Different&winner=false'
```

## Lista de produtores

`GET /api/producers` retorna `{ producer, wins, years }` para todos os produtores
presentes em filmes carregados ou inseridos, inclusive quem nunca venceu
(`wins: 0`, `years: []`). `wins` conta anos distintos de vitória e `years` vem
ordenado.

Filtros opcionais na query, combinados com `AND`:

| Parâmetro | Regra |
|-----------|-------|
| `name` | substring do nome, case-insensitive |
| `year` | ano de vitória, inteiro de `1` até o ano atual |
| `wins` | quantidade exata de vitórias, inteiro `>= 0` |
| `onlyWinners` | `true` ou `false` (minúsculos); `true` remove quem tem `wins: 0` |
| `sort` | somente `wins_desc` (mais vitórias primeiro) |

Ordem padrão: `producer` ascendente. Com `sort=wins_desc`, ordena por `wins`
decrescente e desempata por `producer` ascendente. Parâmetros desconhecidos são
ignorados; valores inválidos retornam `400` com
`{"error":"Parâmetros de consulta inválidos"}`.

```bash
curl 'http://localhost:3000/api/producers?name=joel&onlyWinners=true'
```

```json
[{ "producer": "Joel Silver", "wins": 2, "years": [1990, 1991] }]
```

## Inserção de filmes

`POST /api/movies` recebe um corpo JSON com `year`, `title`, `studios` e
`producers` obrigatórios:

| Campo | Regra |
|-------|-------|
| `year` | inteiro de `1` até o ano atual |
| `title`, `studios`, `producers` | texto não vazio (aparado antes de gravar) |
| `winner` | opcional: a palavra exata `"yes"` vira `true`; ausente vira `false` |

Qualquer outro valor de `winner` (inclusive `"no"`, `null` ou booleanos) e
chaves desconhecidas são rejeitados. Produtores separados por `,` ou `and`
geram vitórias individualmente quando `winner` é `"yes"`, alimentando os
intervalos. Os dados ficam em SQLite em memória e são perdidos ao reiniciar.

Statuses: `201` com o filme criado, `400` com `{"error":"Corpo inválido"}` ou
`{"error":"Corpo JSON inválido"}`, e `500` com
`{"error":"Internal server error"}`.

```bash
curl -X POST http://localhost:3000/api/movies \
  -H 'Content-Type: application/json' \
  -d '{"year":2024,"title":"Novo Filme","studios":"Novo Estúdio","producers":"P1, P2","winner":"yes"}'
```

## Documentação (Swagger)

Com a API rodando:

- Swagger UI: `http://localhost:3000/api-docs/`
- Especificação OpenAPI: `http://localhost:3000/api/openapi.json`

```bash
curl http://localhost:3000/api/openapi.json
```

## Logs

Todas as rotas são logadas em JSON em stdout, incluindo `/api-docs/` e
`/api/openapi.json`. Cada linha do log de requisição contém somente a URL chamada
e o tempo de resposta em milissegundos (sufixo `ms`). Exemplo:

```json
{"url":"/api/producers/intervals","responseTime":"7 ms"}
```

A variável `LOG_LEVEL` agora é respeitada (padrão `info`). Erros internos da
aplicação continuam sendo registrados com detalhes à parte.

## Testes

```bash
npm install
npm test
```

Os testes são de integração: sobem um servidor HTTP real em porta efêmera com
CSVs temporários (empates, deduplicação, múltiplos produtores e produtor com uma
única vitória) e conferem também o CSV de referência.
