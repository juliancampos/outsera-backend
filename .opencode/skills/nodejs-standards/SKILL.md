---
name: nodejs-ts-standards
description: Padrões de arquitetura, tipagem estrita e validação para APIs em Node.js e TypeScript. Use ao criar rotas, serviços ou repositórios.
---

# Regras de Desenvolvimento Node.js & TypeScript

Ao escrever ou refatorar código TypeScript neste projeto, siga estas diretrizes:

1. **Tipagem Estrita:**
   - Nunca utilize `any`. Prefira `unknown` com *type guards* ou tipos explícitos.
   - Use `interface` para contratos de objetos e `type` para uniões (*unions*) ou interseções.
2. **Validação de Entrada:**
   - Valide todos os dados externos (body, params, query e variáveis de ambiente) usando **Zod** antes de passá-los para a camada de serviço.
3. **Arquitetura e Fluxo:**
   - Separe responsabilidades em `controllers` (HTTP), `services` (regras de negócio) e `repositories` (acesso a dados).
4. **Assincronicidade:**
   - Utilize `async/await` e evite bloqueios no *Event Loop*.