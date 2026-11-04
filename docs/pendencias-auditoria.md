# Pendências — auditoria técnica

Atualizado em 04/11/2026. Detalhes em `docs/auditoria-achados.md`.

## Achado parcial

- **#5 (PARCIAL/ACEITO em 04/11):** saíram o aceite do `node-forge` (a 1.4.2 já tem a correção) e o override do `uuid` (o `xcode` 4 não usa mais o pacote). Resta o `braces` 3.0.3, sem versão corrigida publicada, só no Metro (build do app). Fica aceito em `auditConfig.ignoreGhsas`.
- **Próximo patch do Expo:** o 58.0.23 (de 03/11) sai da janela do pnpm em alguns dias. O `expo-doctor` só reclama dele.

## Resolvidos em 04/11

- **#7:** o Expo subiu para 58.0.22, o que tirou o `zod` 3 e o `deepmerge`. O `glob` 13 e o `minimatch` 10 foram forçados para o 14 e o 11 por override (decisão do titular), com o CLI do Expo testado. Os overrides saem quando o Expo pedir as versões novas. `pnpm audit` zerado, fora o `braces` aceito no #5.
- **Branch `fix/body-parser-achado-7`:** os dois commits entraram na `main` pelo PR #17. Não sobra nada no branch.
- **Cópia em `C:\Codes\worktrees\riscote\progressao-fases`:**
  - O conteúdo é o do commit `e2b6c7a`, que entrou na `main` pelo PR #1 em 21/10.
  - A comparação foi arquivo por arquivo, contra todo o histórico da `main`. Os únicos "diferentes" eram de quebra de linha.
  - O `.claude/launch.json` dela é uma versão menor do que o projeto já tem.
  - O Git dela estava quebrado (o repositório não a reconhecia mais como worktree). Apagada em 04/11, com autorização do titular.

## Validações não executadas

- Teste com jogadores em redes reais.
- App de Android no aparelho do usuário: com o Expo 58.0.22, o empacotamento (`expo export -p android`) passou, mas falta gerar o APK e jogar no celular.

## Mobile

- **ADIADO (decisão do titular, 31/10/2026):** nenhuma versão nova nas lojas agora.
