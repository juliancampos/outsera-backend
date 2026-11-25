---
name: sqlite-best-practices
description: Boas práticas de configuração, concorrência (WAL), queries tipadas e migrations para SQLite em Node.js.
---

# Diretrizes para SQLite em Produção

Sempre que criar conexões, schemas ou queries SQLite neste projeto:

1. **Concorrência e Performance (Obrigatório):**
   - Na inicialização da conexão, execute sempre:
     - `PRAGMA journal_mode = WAL;`
     - `PRAGMA synchronous = NORMAL;`
     - `PRAGMA foreign_keys = ON;`
2. **Queries Seguras:**
   - Nunca concatene strings SQL. Use *Prepared Statements* ou o Query Builder configurado no projeto.
3. **Testes:**
   - Utilize bancos em memória (`:memory:`) para os testes automatizados.
