# Achados de auditoria técnica

Rodada de 21/10/2026 — HEAD observado `dc103fd0f4dcfa66fd7a8976522fabdca1d583f0`, checkout com edições anteriores e concorrentes. Sem alterações de implementação pela auditoria.

| ID | Severidade | Status | Achado | Evidência |
|---|---|---|---|---|
| 1 | média | RESOLVIDO (2026-10-21) | Token de reconexão sem vínculo ao endpoint | Vaga guarda o servidor; `seatForServer` (`protocol.ts`) só a devolve ao mesmo servidor e `loadSeat` (`online.ts`) apaga a de outro ou antiga. Teste "seatForServer" falsificado |
| 2 | média | RESOLVIDO (2026-10-21) | Nome confirmado como gravado após erro de persistência | `RecordBook.saved` (`records.ts` do servidor) vai em `RecordsMessage.saved`; a tela avisa em vez de confirmar. Dois testes em `records.test.ts`, falsificados |
| 3 | média | RESOLVIDO (2026-10-23) | Um só endereço ocupa as 20 salas do servidor e bloqueia a criação para todos | `limitRooms` limita a `ROOMS_PER_ADDRESS` (3) salas vivas por endereço (429 `TOO_MANY_ROOMS`); sala sem comando por 10 min no aquecimento fecha com `CLOSE_LOBBY_IDLE`. 3 testes em `rooms.test.ts`, falsificados; prova repetida: 3 salas e 429. `RISCOTE_IP_HEADER` no Pi confirmado pelo usuário |
| 4 | baixa | RESOLVIDO (2026-10-23) | WebView do app com depuração e acesso universal a `file://` | `App.tsx`: `originWhitelist` só `file://*`, sem `allowUniversalAccessFromFileURLs`, depuração só em `__DEV__`; `app.json`: `allowBackup: false`. APK conferido no emulador e no aparelho do usuário: capa, lista de salas, áudio e sala no aquecimento |
| 5 | baixa | RESOLVIDO (2026-11-06, sem advisory residual ativo) | 3 advisories (2 altas) do conjunto de ferramentas do Expo | `uuid`: o `xcode` 4 não usa mais o `uuid`, e o override `xcode>uuid` saiu em 2026-11-04. `node-forge`: a 1.4.2 já tem a correção, e o aceite (GHSA-86w9-cpqp-85rv) saiu. O resíduo `braces` 3.0.3 (GHSA-vfj7-8cjw-p6xm, antes PARCIAL / ACEITO em 2026-11-04) foi retirado pela fonte oficial em 23/10/2026; a auditoria de 2026-11-06 reclassificou como RESOLVIDO (audit sem supressão: zero alertas). O `ignoreGhsas` ainda está no `pnpm-workspace.yaml`; tirá-lo é limpeza de manutenção. |
| 6 | baixa | RESOLVIDO (2026-10-23) | Recarga por versão nova apaga as escolhas da capa | `online.ts`: `lobbyTouched` (algo digitado ou escolhido e ainda não usado) segura a recarga e só zera ao entrar numa sala. No Edge headless com o build de produção: capa mexida não recarrega e guarda o código; capa intocada recarrega (controle) |
| 7 | baixa | RESOLVIDO (2026-11-04) | Advisories novos no lock além do aceite Expo anterior (auditoria de 30/10) | body-parser 2.4.0 e node-forge 1.4.2 (2026-11-01, na `main` pelo PR #17). Em 2026-11-04: `expo` 58.0.16 → 58.0.22 (`@expo/cli` 58.1.18 não usa mais o `zod`), com `react-native` 0.88.1 e `expo-status-bar` 58.0.4, as versões que ele pede, sem exceção na janela do pnpm; saíram `zod` 3 (alta) e `deepmerge` (baixa). `glob` 13 e `minimatch` 10 (moderadas, só no CLI do Expo): decisão do usuário de atualizar; overrides `glob@13: ^14.0.3` e `minimatch@10: ^11.0.3` no `pnpm-workspace.yaml` (o Expo só usa a API que não mudou). Provas: fingerprint do app com os mesmos 25 arquivos que a cópia isolada com glob 13 (só a config muda, por `./` no caminho), `expo-doctor`, `expo export -p android` e `expo prebuild --platform android`. `pnpm audit`: nenhuma vulnerabilidade conhecida (fora o `braces` aceito no #5). Typecheck e testes (448 shared, 72 servidor) OK. Tirar os overrides quando o Expo pedir glob 14 e minimatch 11. |

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

## Rodada 2026-11-06

HEAD `f94d29fb764ae9bc77b4408c33914b01c7b0b4fb`, árvore inicialmente limpa. Relatório: `C:\Codes\relatorios\riscote\auditoria-2026-11-06.md`; evidências em `evidencias-2026-11-06`. Três agentes auxiliares, revisão/consolidação principal; sem correção de código, commit, push, deploy ou produção.

**4 ativos: 3 médios, 1 baixo; nenhum crítico/alto confirmado. Próximo ID: #12.**

| ID | Severidade | Status | Achado | Evidência |
|---|---|---|---|---|
| 8 | média | RESOLVIDO (2026-11-08) | Sala privada aceita entrada sem código pelo matchmaking | apps/server/src/ArenaRoom.ts:117–122,165–177,197–205; apps/server/src/index.ts:45–46; apps/client/src/online.ts:65–68 |
| 9 | média | PARCIAL (2026-11-08) | Frequência de comandos controla o relógio de movimento e de carga | apps/server/src/ArenaRoom.ts:45–50,117,323–349,359; packages/shared/src/world.ts:1144–1172 |
| 10 | média (potencial) | RESOLVIDO (2026-11-08) | Erro após conexão abandona sala provisória sem encerrá-la | apps/client/src/online.ts:147–159,568–570,607–612,713–735; apps/client/src/net.ts:194–196; apps/server/src/ArenaRoom.ts:232–259 |
| 11 | baixa | RESOLVIDO (2026-11-08) | Soltar uma tecla cancela outro atalho da mesma ação ainda pressionado | apps/client/src/input.ts:9–25,71–84; apps/client/src/OnlineScene.ts:458–468 |

As linhas acima mostram o status atual; o texto da rodada abaixo descreve o estado em 06/11. Resolução na seção seguinte.

#1–#4, #6 e #7 continuam RESOLVIDOS. **#5 passa a RESOLVIDO / sem advisory residual ativo**: GHSA-vfj7-8cjw-p6xm foi retirado em 23/10/2026 por não ser considerado explorável na prática ([fonte oficial](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). O ignore no workspace foi preservado; audit em cópia sem ignore também retornou zero alertas. Não é correção de código aplicada pela auditoria.

Validação: 458 testes shared +73 servidor aprovados; typecheck e build web aprovados. pnpm audit completo/prod/sem supressão sem alertas. Expo install --check retornou1 apenas por recomendar expo~58.0.23 em vez de58.0.22; informação de manutenção, sem vulnerabilidade presumida. Probe real127.0.0.1:2617 confirmou #8 e controle setPrivate; probe puro confirmou #9 (carga3s→1,65s a110 inputs/s, transporte não exercitado); nove cenários com dublês confirmaram ausência de leave em #10 (efeito operacional potencial); aliases confirmaram #11. Sem APK, browser visual, Docker multiarch, carga de produção ou dados reais.

Servidores de teste encerrados. Remoção do TEMP próprio bloqueada pela revisão automática (“blocked by policy”); pasta `%TEMP%\codex-auditoria-riscote-20261106` mantida e documentada. Somente este ledger foi alterado no repositório.


## Resolução 2026-11-08 (achados 8–11)

Correções locais na `main`, um commit por achado (sem push nem deploy). Adendo detalhado no fim de `C:\Codes\relatorios\riscote\auditoria-2026-11-06.md`. Cada teste novo foi falsificado: falha com o arquivo do commit anterior (`git show`) ou com a correção removida por mutação, e o arquivo corrigido foi restaurado idêntico (hash conferido).

| ID | Status | Commit | Resolução e prova |
|---|---|---|---|
| 8 | RESOLVIDO (2026-11-08) | `f565ba7` | `ArenaRoom.onCreate` chama `setPrivate(!open)`: a privada (e a de cliente antigo, sem `open`) sai do matchmaking por nome; só `joinById` com o código entra. Superfície: matchmaking do Colyseus (`join`/`joinOrCreate` por nome). Teste em `rooms.test.ts`: `join('arena')` recusado com duas privadas, `joinById` aceito e, como controle, a aberta continua achada por nome. Sem a correção: "promise resolved … instead of rejecting". |
| 9 | PARCIAL (2026-11-08) | `f19cd42` | Lado rápido corrigido: `Seat.lag` (teto `MAX_LAG` = 10) impede a física e a carga de andarem à frente do relógio da sala; a recuperação de dois por tick só gasta atraso real. Superfície: mensagem `MSG_INPUT` → `ArenaRoom.step`. Testes (sala real, jogador sintético, ticks síncronos): 110/s anda o mesmo que 60/s (sem a correção, 48 passos à frente), carga a 110/s não enche em 150 ticks (sem a correção, 180), atraso guardado tem teto (sem a correção, 108 passos numa janela de 60 ticks); controle: rajada após atraso real continua recuperada. **Pendente: lado lento** (comandos espaçados abaixo de 60/s ainda são aplicados um a um, e o jogador fica em câmera lenta). Bloqueio: os clientes dos testes de rede (`sleep(1000/60)`) mandam ~34/s no Windows, e uma versão com limite cumulativo deu 10–24 correções nesses testes; fechar pede decidir a tolerância para clientes abaixo de 60/s e refazer esses clientes de teste com acumulador de tempo. |
| 10 | RESOLVIDO (2026-11-08) | `5d6e273` | `adoptRoom` (`protocol.ts`) chama `leave()` na sala provisória quando o estado inicial não chega ou a sessão falha antes de assumir, sem esconder o erro original. Superfícies: `enter` do cliente (criar, código, convite, reconexão por token), que também desfaz sessão, plano local, vaga guardada e volta a capa; e `addGuest` (jogador a mais). Testes: `protocol.test.ts` (timeout, erro síncrono com `leave` que falha; controle de sucesso e de recusa antes de conectar; mutação sem `leave`: "expected +0 to be 1") e `cliente-fonte.test.ts` (todas as entradas do `online.ts` passam por `adoptRoom`; com o `online.ts` anterior: "expected … not to match /=\s*await\s+(joining\|sdk\.)/"). Sem ensaio em navegador nem socket real sob atraso. |
| 11 | RESOLVIDO (2026-11-08) | `f65995b` | `HeldKeys` (`packages/shared/src/input.ts`) guarda os códigos segurados e calcula a máscara pelo mapa do modo; o `InputSource` do cliente solta só o código no keyup e limpa no blur e na troca de modo. Superfície: teclado do cliente web (e do app, que embute o mesmo cliente). Testes: `input.test.ts` (D+→ e X+J; controle) e `cliente-fonte.test.ts`; com o `input.ts` anterior: "expected … to match /new HeldKeys\(\)/"; mutação soltando tudo: "expected +0 to be 2" e "expected +0 to be 32". Sem ensaio em navegador. |

Validação final: `pnpm typecheck` PASS nos 4 workspaces; `pnpm test` 458 shared + 73 servidor = 531 antes → 464 shared + 80 servidor = **544** depois (13 novos), 3 rodadas seguidas da suíte do servidor verdes; build web (Vite) PASS para pasta temporária, bundle 1.969,49 kB (aviso >500 kB esperado). Lint: N-A (o projeto não tem lint). Sem migration, env var ou mudança de dependência. Próximo ID livre: #12.
