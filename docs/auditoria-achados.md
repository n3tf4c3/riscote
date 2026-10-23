# Achados de auditoria técnica

Rodada de 21/10/2026 — HEAD observado `dc103fd0f4dcfa66fd7a8976522fabdca1d583f0`, checkout com edições anteriores e concorrentes. Sem alterações de implementação pela auditoria.

| ID | Severidade | Status | Achado | Evidência |
|---|---|---|---|---|
| 1 | média | RESOLVIDO (2026-10-21) | Token de reconexão sem vínculo ao endpoint | Vaga guarda o servidor; `seatForServer` (`protocol.ts`) só a devolve ao mesmo servidor e `loadSeat` (`online.ts`) apaga a de outro ou antiga. Teste "seatForServer" falsificado |
| 2 | média | RESOLVIDO (2026-10-21) | Nome confirmado como gravado após erro de persistência | `RecordBook.saved` (`records.ts` do servidor) vai em `RecordsMessage.saved`; a tela avisa em vez de confirmar. Dois testes em `records.test.ts`, falsificados |
| 3 | média | RESOLVIDO (2026-10-23) | Um só endereço ocupa as 20 salas do servidor e bloqueia a criação para todos | `limitRooms` limita a `ROOMS_PER_ADDRESS` (3) salas vivas por endereço (429 `TOO_MANY_ROOMS`); sala sem comando por 10 min no aquecimento fecha com `CLOSE_LOBBY_IDLE`. 3 testes em `rooms.test.ts`, falsificados; prova repetida: 3 salas e 429. `RISCOTE_IP_HEADER` no Pi confirmado pelo usuário |
| 4 | baixa | RESOLVIDO (2026-10-23) | WebView do app com depuração e acesso universal a `file://` | `App.tsx`: `originWhitelist` só `file://*`, sem `allowUniversalAccessFromFileURLs`, depuração só em `__DEV__`; `app.json`: `allowBackup: false`. APK conferido no emulador e no aparelho do usuário: capa, lista de salas, áudio e sala no aquecimento |
| 5 | baixa | PARCIAL / ACEITO (2026-10-23) | 3 advisories (2 altas) do conjunto de ferramentas do Expo | `uuid` corrigido (`overrides: xcode>uuid: 11.1.1`). `node-forge` (GHSA-86w9-cpqp-85rv) e `braces` (GHSA-vfj7-8cjw-p6xm) sem versão corrigida publicada: aceitos pelo usuário ao pedir o fechamento, em `auditConfig.ignoreGhsas` com o motivo. Reabrir quando sair a correção. `pnpm audit` volta a sair com 0 |
| 6 | baixa | RESOLVIDO (2026-10-23) | Recarga por versão nova apaga as escolhas da capa | `online.ts`: `lobbyTouched` (algo digitado ou escolhido e ainda não usado) segura a recarga e só zera ao entrar numa sala. No Edge headless com o build de produção: capa mexida não recarrega e guarda o código; capa intocada recarrega (controle) |

Rodada de 23/10/2026: HEAD `2175e7b`, árvore estável; relatório em `C:\Codes\relatorios\riscote\auditoria-2026-10-23-031418.md`. #1 e #2 conferidos e mantidos como resolvidos.

Relatório completo, recomendações, exemplos e limitações: `C:\Codes\relatorios\riscote\auditoria-2026-10-21.md`. Resolução, validação (212 + 61 testes, typecheck e build) e pendências: adendo de 2026-10-21 no fim do mesmo relatório.

Typecheck passou no instante executado. Build e 7 de 152 testes shared falharam enquanto outros processos editavam arenas/contratos; registrar como validação inconclusiva de revisão estável, não como regressão definitivamente atribuída. Não houve teste de produção ou acesso ao placar real.
