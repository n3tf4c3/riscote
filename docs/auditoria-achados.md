# Achados de auditoria técnica

Rodada de 21/10/2026 — HEAD observado `dc103fd0f4dcfa66fd7a8976522fabdca1d583f0`, checkout com edições anteriores e concorrentes. Sem alterações de implementação pela auditoria.

| ID | Severidade | Status | Achado | Evidência |
|---|---|---|---|---|
| 1 | média | RESOLVIDO (2026-10-21) | Token de reconexão sem vínculo ao endpoint | Vaga guarda o servidor; `seatForServer` (`protocol.ts`) só a devolve ao mesmo servidor e `loadSeat` (`online.ts`) apaga a de outro ou antiga. Teste "seatForServer" falsificado |
| 2 | média | RESOLVIDO (2026-10-21) | Nome confirmado como gravado após erro de persistência | `RecordBook.saved` (`records.ts` do servidor) vai em `RecordsMessage.saved`; a tela avisa em vez de confirmar. Dois testes em `records.test.ts`, falsificados |
| 3 | média | RESOLVIDO (2026-10-23) | Um só endereço ocupa as 20 salas do servidor e bloqueia a criação para todos | `limitRooms` limita a `ROOMS_PER_ADDRESS` (3) salas vivas por endereço (429 `TOO_MANY_ROOMS`); sala sem comando por 10 min no aquecimento fecha com `CLOSE_LOBBY_IDLE`. 3 testes em `rooms.test.ts`, falsificados; prova repetida: 3 salas e 429. `RISCOTE_IP_HEADER` no Pi confirmado pelo usuário |
| 4 | baixa | RESOLVIDO (2026-10-23) | WebView do app com depuração e acesso universal a `file://` | `App.tsx`: `originWhitelist` só `file://*`, sem `allowUniversalAccessFromFileURLs`, depuração só em `__DEV__`; `app.json`: `allowBackup: false`. APK conferido no emulador e no aparelho do usuário: capa, lista de salas, áudio e sala no aquecimento |
| 5 | baixa | PARCIAL / ACEITO (2026-11-04) | 3 advisories (2 altas) do conjunto de ferramentas do Expo | `uuid`: o `xcode` 4 não usa mais o `uuid`, e o override `xcode>uuid` saiu em 2026-11-04. `node-forge`: a 1.4.2 já tem a correção, e o aceite (GHSA-86w9-cpqp-85rv) saiu. Resta `braces` 3.0.3 (GHSA-vfj7-8cjw-p6xm), sem versão corrigida publicada, só no Metro (build do app): aceito em `auditConfig.ignoreGhsas`, reabrir quando sair a correção. |
| 6 | baixa | RESOLVIDO (2026-10-23) | Recarga por versão nova apaga as escolhas da capa | `online.ts`: `lobbyTouched` (algo digitado ou escolhido e ainda não usado) segura a recarga e só zera ao entrar numa sala. No Edge headless com o build de produção: capa mexida não recarrega e guarda o código; capa intocada recarrega (controle) |
| 7 | baixa | PARCIAL (2026-11-04) | Advisories novos no lock além do aceite Expo anterior (auditoria de 30/10) | body-parser 2.4.0 e node-forge 1.4.2 (2026-11-01, entraram na `main` pelo PR #17). Em 2026-11-04 o `expo` subiu de 58.0.16 para 58.0.22 (`@expo/cli` 58.1.18, que não usa mais o `zod`), com `react-native` 0.88.1 e `expo-status-bar` 58.0.4, as versões que o próprio 58.0.22 pede; sem exceção na janela do pnpm (o 58.0.23, de 03/11, ficaria fora dela). Saíram `zod` 3 (alta) e `deepmerge` (baixa). `expo export -p android`, typecheck e testes (448 shared, 72 servidor) OK. Restam `glob` 13.0.6 (GHSA-3g3m-2fjr-6pw4) e `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249), moderadas, via `@expo/cli` e `@expo/fingerprint` (só o CLI do Expo, no PC): a correção é major (glob 14, de 27/10) e o Expo mais novo ainda pede a 13. Decisão do titular: aceitar até o Expo trocar, ou forçar o major com teste do build do app. |

Rodada de 23/10/2026: HEAD `2175e7b`, árvore estável; relatório em `C:\Codes\relatorios\riscote\auditoria-2026-10-23-031418.md`. #1 e #2 conferidos e mantidos como resolvidos.

Relatório completo, recomendações, exemplos e limitações: `C:\Codes\relatorios\riscote\auditoria-2026-10-21.md`. Resolução, validação (212 + 61 testes, typecheck e build) e pendências: adendo de 2026-10-21 no fim do mesmo relatório.

Typecheck passou no instante executado. Build e 7 de 152 testes shared falharam enquanto outros processos editavam arenas/contratos; registrar como validação inconclusiva de revisão estável, não como regressão definitivamente atribuída. Não houve teste de produção ou acesso ao placar real.


## Rodada transversal 2026-10-30 — 200000

HEAD auditado: `d07fd52399251c1b4bac406307f958dcb9dcf567`. Relatório externo: `C:\Codes\relatorios\riscote\auditoria-2026-10-30-200000.md`. Evidências: `C:\Codes\relatorios\riscote\evidencias-2026-10-30-200000.json`.

Auditoria estática e validações selecionadas; sem correção de código, commit, push ou deploy. Falta de prova operacional não foi convertida em vulnerabilidade presumida.

| ID | Achado | Severidade | Status nesta rodada | Evidência |
|---|---|---|---|---|
| 7 | Novos advisories no lock exigem revisão além do aceite Expo anterior | baixa | ABERTO | `pnpm-lock.yaml:1494`; `pnpm-lock.yaml:4882`; `apps/server/src/index.ts:33`; Pacotes afetados confirmados; alcance de exploração pendente. |

Reverificações e decisões históricas: #1 — Correção preservada por leitura; #2 — Correção preservada; #3 — Controle presente; #5 — ACEITO/PARCIAL histórico preservado. O relatório detalha alcance/evidência; provas operacionais antigas não foram repetidas.
