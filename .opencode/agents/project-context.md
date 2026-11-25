# Contexto do Projeto — Avaliação Back-End Outsera

## 1. Visão Geral
Desenvolvimento de uma API RESTful para possibilitar a leitura da lista de indicados e vencedores da categoria **Pior Filme** (*Worst Picture*) do **Golden Raspberry Awards**.

- **Especificação original:** `back-end-ai-test/docs/avaliacao_outsera_back_end.md`
- **Dataset de referência:** `back-end-ai-test/docs/Movielist.csv`
- **Workflow de agentes:** `.agents/AGENTES.md` (Product Owner → Developer → QA & Code Reviewer)

---

## 2. Requisitos Funcionais

### 2.1 Carga Inicial de Dados (CSV → Banco em Memória)
1. Ao iniciar a aplicação, ler o arquivo CSV de filmes e inserir os dados em uma base de dados em memória.
2. Estrutura observada no arquivo `back-end-ai-test/docs/Movielist.csv`:
   - **Delimitador:** ponto e vírgula (`;`).
   - **Colunas (cabeçalho):** `year;title;studios;producers;winner` (207 linhas no arquivo de referência: 1 cabeçalho + 206 registros).
   - **Coluna `winner`:** contém `yes` para os filmes vencedores e fica vazia para os demais indicados.
   - **Coluna `producers`:** pode conter um ou mais produtores por filme, separados por vírgula (`, `) e/ou conjunção (` and `), incluindo casos com vírgula antes do `and` (`, and `). Cada produtor deve ser extraído e associado individualmente para o cálculo de prêmios.
3. **Independência de dados de entrada:** Na avaliação serão utilizados **outros conjuntos de dados com cenários diferentes**. A importação e o cálculo devem ser genéricos e precisos para qualquer CSV válido no mesmo formato, sem valores hardcoded.

### 2.2 Requisito da API — Intervalo de Prêmios
Obter, considerando apenas filmes vencedores (`winner = yes`):
- **`min`:** o(s) produtor(es) que obteve(obtiveram) dois prêmios consecutivos mais rápido (menor intervalo em anos entre duas vitórias consecutivas).
- **`max`:** o(s) produtor(es) com maior intervalo em anos entre dois prêmios consecutivos.

#### Regras e Formato de Resposta
- Cada item representa um par de vitórias consecutivas de um mesmo produtor (`interval = followingWin - previousWin`).
- Produtores com apenas 1 vitória não possuem intervalo e não entram no cálculo.
- Em caso de empate no menor ou no maior intervalo, **todos** os registros empatados devem constar nas listas `min` e/ou `max`.
- **Formato JSON obrigatório:**

```json
{
  "min": [
    {
      "producer": "Producer 1",
      "interval": 1,
      "previousWin": 2008,
      "followingWin": 2009
    },
    {
      "producer": "Producer 2",
      "interval": 1,
      "previousWin": 2018,
      "followingWin": 2019
    }
  ],
  "max": [
    {
      "producer": "Producer 1",
      "interval": 99,
      "previousWin": 1900,
      "followingWin": 1999
    },
    {
      "producer": "Producer 2",
      "interval": 99,
      "previousWin": 2000,
      "followingWin": 2099
    }
  ]
}
```

---

## 3. Requisitos Não Funcionais
1. **Maturidade REST:** A API RESTful deve seguir o **nível 2 de maturidade de Richardson** (recursos bem definidos via URI, uso semântico dos métodos HTTP e códigos de status HTTP adequados).
2. **Testes (regra restritiva):** Devem ser implementados **somente testes de integração**. Os testes devem garantir que os dados retornados pela API estão de acordo com os dados fornecidos na proposta.
3. **Banco de Dados:** Deve estar **em memória** utilizando SGBD embarcado (**SQLite**), sem exigir nenhuma instalação externa.
4. **Documentação (`README`):** O projeto deve conter um `README` com instruções para executar a aplicação e rodar os testes de integração.
5. **Repositório Git:** O código-fonte deve ser disponibilizado em um repositório Git (GitHub, GitLab, Bitbucket, etc.).

---

## 4. Requisitos de Inteligência Artificial e Qualidade
1. **Uso obrigatório de IA:** O uso de ferramentas de inteligência artificial (LLMs, agentes e skills) é obrigatório e faz parte da avaliação.
2. **Registro de interações:** O repositório deve conter o registro das interações com os Agentes em formato de **logs em texto**.
3. **Critérios de código:** A qualidade, organização e desempenho do código serão avaliados pelos mesmos critérios de uma revisão de código tradicional.

---

## 5. Stack Tecnológica Definida
- **Runtime e Linguagem:** Node.js com TypeScript
- **Framework Web:** Express
- **Banco de Dados:** SQLite (em memória)
- **Registro de Interações com Agentes:** logs em texto

---

## 6. Pontos em Aberto para Definição Técnica (PO / Arquitetura)
Antes da implementação, o planejamento técnico deve definir:
- Definição das rotas da API (ex.: endpoint de consulta de intervalos de produtores e eventuais endpoints de leitura de filmes/indicados conforme nível 2 de Richardson).
- Bibliotecas específicas do ecossistema Node.js/TypeScript (driver SQLite, parser de CSV e runner/biblioteca de testes de integração).
- Caminho e convenção de nomenclatura dos arquivos de log em texto para o registro das interações com os Agentes.
