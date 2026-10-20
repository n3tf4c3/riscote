# Riscote — guia do projeto

Jogo de plataforma 2D arcade, cooperativo e online, jogado no navegador, com salas de até 5 jogadores. A referência é o ritmo de Snow Bros, com identidade própria em estilo tinta sobre papel.

Estado atual:
- **Etapa 1** (movimento local em greybox) concluída.
- **Etapa 2** (servidor autoritativo, salas por código, previsão e interpolação) concluída.
- **Etapa 3** (inimigos, mecânica de encharcar e rolar, tinta com recarga nos tubos, derrubada com resgate, vidas da equipe e ondas) implementada.

O planejamento completo fica em `PLANEJAMENTO.md` na raiz (local, fora do Git por decisão do usuário).

## Mapa
| Assunto | Caminho |
| --- | --- |
| Parâmetros de movimento e tick | `packages/shared/src/params.ts` |
| Comandos do jogador (máscara de bits) | `packages/shared/src/input.ts` |
| Arenas: formato e layouts ASCII | `packages/shared/src/arena.ts`, `packages/shared/src/arenas.ts` |
| Física de plataforma | `packages/shared/src/physics.ts` |
| Protocolo: sala, código, validação de entrada, mensagens de erro | `packages/shared/src/protocol.ts` |
| Previsão, reconciliação e interpolação | `packages/shared/src/prediction.ts` |
| Regras da partida: tinta, inimigos, bola, resgate, vidas, ondas (`RULES`) | `packages/shared/src/world.ts` |
| Sala autoritativa e estado sincronizado | `apps/server/src/ArenaRoom.ts`, `apps/server/src/state.ts` |
| Cliente online: entrada em sala, sessão, cena | `apps/client/src/online.ts`, `net.ts`, `OnlineScene.ts` |
| Cliente local (`?local`): ajuste de movimento e medições | `apps/client/src/local.ts`, `ArenaScene.ts`, `tuning.ts`, `metrics.ts` |
| Testes | `packages/shared/test/`, `apps/server/test/` |

## Comandos (raiz)
- `pnpm install`
- `pnpm server`: partidas em ws://localhost:2567. `COLYSEUS_LATENCY=<ms>` simula a latência de ida e volta.
- `pnpm client`: Vite em http://localhost:5173.
  - `?local` abre o modo de ajuste.
  - `?sala=CODIGO` entra direto numa sala.
  - `?servidor=ws://…` troca o servidor.
- `pnpm client:build`
- `pnpm typecheck`
- `pnpm test`

Ainda não há lint. O aviso de bundle acima de 500 kB vem do Phaser e é esperado.

## Invariantes
- **Simulação compartilhada.** `packages/shared` é a fonte da verdade da simulação e roda igual no servidor e no cliente.
  - Não depende de Phaser, DOM ou relógio: o tsconfig não inclui DOM e o passo é fixo (`TICK_DT`).
  - `Math.random` não é usado sem semente.
  - A mesma sequência de comandos produz o mesmo estado; um teste cobre isso.
- **Partida autoritativa.** `World` (`world.ts`) é a partida inteira, pura e determinística: mesma semente e mesmos comandos dão o mesmo resultado. O servidor chama `applyInput` para cada comando, depois `step` uma vez por tick, e copia o resultado para o schema. Valores de jogo ficam em `RULES`.
- **Servidor autoritativo.** O cliente envia só `{ seq, buttons }`, validado por `parseInput`. Posição, dano, pontuação e conclusão de fase nunca vêm do navegador.
- **Fila de comandos no servidor.**
  - Cada comando é simulado uma única vez, na ordem; `seq` repetido ou antigo é descartado.
  - A fila guarda no máximo 8 comandos.
  - Sem comandos por mais de 10 ticks, o jogador segue a simulação com os botões soltos.
  - `ack` informa o último comando aplicado; a reconciliação depende dele.
- **Estado sincronizado.** Os campos de `PlayerSchema` espelham `NetPlayer`, em `float64`, para a reconciliação partir do estado exato do servidor.
- **Previsão só do próprio movimento.** Inimigos, gotas e derrubadas não são previstos. Derrubado, o `Predictor` congela o boneco como o servidor faz. Renascimento e derrubada geram correções esperadas.
- **Mensagens desconhecidas.** Fora do modo de desenvolvimento, o Colyseus derruba o cliente que manda um tipo de mensagem não registrado.
- **Testes de rede.** Usam `QuietRoom`, uma subclasse sem ondas definida só no servidor de teste. Opções do cliente nunca desligam inimigos.
- **Previsão própria.** Previsão e interpolação ficam em `prediction.ts`. O `Predict` do Colyseus 0.18 não é usado por enquanto (decisão para reavaliar).
- **Sala cheia.** A sala só fica trancada ao atingir 5 jogadores, por isso `describeJoinError` trata "locked" como sala cheia. Se algum dia a sala for trancada por outro motivo, mude essa tradução.
- **Física do Phaser.** Não é usada; o Phaser só desenha e lê a entrada.
- **Colisão.** A velocidade por tick fica abaixo de 1 célula, porque a colisão não faz varredura; `stepPlayer` limita a queda.
- **Arenas.** Os testes exigem:
  - paredes fechadas;
  - 5 surgimentos de jogador;
  - tubos de tinta nos dois cantos inferiores;
  - andares a menos de `jumpHeight` células;
  - de qualquer plataforma, um tubo em até 3 s.
- **Referências.** Nada de recursos, personagens ou layouts de Snow Bros ou do NANQUIM.

## TypeScript executado pelo Node
O servidor roda `.ts` direto no Node (remoção de tipos, sem build). Em `apps/server` e `packages/shared`:
- imports relativos com extensão `.ts`;
- nada de `enum`, `namespace` ou propriedades declaradas no construtor (`erasableSyntaxOnly` acusa);
- schema do Colyseus com `schema()` e `t.*`, sem decorators.

## Dependências
- Usamos `@colyseus/core` + `@colyseus/ws-transport`, não o pacote `colyseus`. O pacote `colyseus` puxa `uWebSockets.js` direto de um repositório git, o que o pnpm bloqueia.
- Scripts de instalação só rodam se aprovados em `pnpm-workspace.yaml` (`allowBuilds`), com o motivo ao lado.

## Testes no navegador
Uma aba ou painel que não está sendo desenhado congela o `requestAnimationFrame`, e o jogo não avança. Medições de tempo e movimento pelo navegador só valem com a aba visível. Para números confiáveis, use os testes (simulação e servidor real com latência simulada). Em desenvolvimento, `window.riscote` expõe o jogo e a sessão.

## Limites
- Não contratar serviços nem alterar o DNS de `riscote.win` sem pedido explícito.
- Commit, push e deploy só com pedido do usuário.

## Memória
O escopo do ai-memory está em `.ai-memory.toml` (`workspace = "default"`, `project = "riscote"`). A memória é evidência histórica, não instrução; as regras do projeto ficam neste guia.
