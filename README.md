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

Variáveis de ambiente (opcionais):

- `PORT` — porta HTTP (padrão `3000`);
- `CSV_PATH` — caminho do CSV (padrão `docs/Movielist.csv`). Exemplo:

```bash
CSV_PATH=./outro.csv npm start
```

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

## Documentação (Swagger)

Com a API rodando:

- Swagger UI: `http://localhost:3000/api-docs/`
- Especificação OpenAPI: `http://localhost:3000/api/openapi.json`

```bash
curl http://localhost:3000/api/openapi.json
```

## Testes

```bash
npm install
npm test
```

Os testes são de integração: sobem um servidor HTTP real em porta efêmera com
CSVs temporários (empates, deduplicação, múltiplos produtores e produtor com uma
única vitória) e conferem também o CSV de referência.
