# Riscote — guia do projeto

Jogo de plataforma 2D arcade, cooperativo e online, jogado no navegador, com salas de até 5 jogadores. A referência é o ritmo de Snow Bros, com identidade própria em estilo tinta sobre papel.

Estado atual:
- **Etapa 1** (movimento local em greybox) concluída.
- **Etapa 2** (servidor autoritativo, salas por código, previsão e interpolação) concluída.
- **Etapa 3** (inimigos, mecânica de encharcar e rolar, tinta com recarga nos tubos, derrubada com resgate, vidas da equipe e ondas) implementada.
- **Etapa 4** (capítulo com as 3 arenas e virada de página, borrão aos 60 s, relatório de métricas por arena) implementada.
- **Playtest remoto** por túnel temporário: `docs/playtest-remoto.md`.
- **Etapa 5** (reconexão com vaga reservada, limite de tentativas de entrada, rede instável e carga medida) implementada. Falta o teste em redes reais, que depende da hospedagem.

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
| Regras da partida: tinta, inimigos, bola, resgate, vidas, ondas, capítulo, borrão, métricas (`RULES`, `ArenaReport`) | `packages/shared/src/world.ts` |
| Sala autoritativa e estado sincronizado | `apps/server/src/ArenaRoom.ts`, `apps/server/src/state.ts` |
| Limite de tentativas de entrada e endereço real do cliente | `apps/server/src/joinLimit.ts` |
| Métricas do processo e teste de carga | `apps/server/src/metrics.ts`, `apps/server/scripts/carga.ts` |
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
- `docker compose up -d --build`: servidor e cliente em containers (cliente em http://localhost:4173); `docker compose down` para. Detalhes em `docs/docker.md`.
- `pnpm --filter ./apps/server carga -- --salas 10 --segundos 30 --servidor ws://localhost:2600`: robôs de carga. Rode antes um servidor separado com `RISCOTE_METRICS=1`, `RISCOTE_JOIN_LIMIT=0` e `PORT=2600`.
- `node apps/server/scripts/sonda-rede.ts wss://…`: mede o atraso entre enviar um comando e recebê-lo confirmado. Serve para separar problema de rede/túnel de problema no cliente.
- Variáveis do servidor: ver o comentário no topo de `apps/server/src/index.ts`.
- `?debug` no link expõe `window.riscote` também na versão compilada, para inspeção pelo console.
- `pnpm typecheck`
- `pnpm test`

Ainda não há lint. O aviso de bundle acima de 500 kB vem do Phaser e é esperado.

## Invariantes
- **Simulação compartilhada.** `packages/shared` é a fonte da verdade da simulação e roda igual no servidor e no cliente.
  - Não depende de Phaser, DOM ou relógio: o tsconfig não inclui DOM e o passo é fixo (`TICK_DT`).
  - `Math.random` não é usado sem semente.
  - A mesma sequência de comandos produz o mesmo estado; um teste cobre isso.
- **Dificuldade.** A sala é criada em `facil`, `medio` (padrão) ou `dificil`, validada por `parseDifficulty`.
  - As diferenças ficam em `DIFFICULTY_RULES` (`protocol.ts`).
  - Fácil: o boneco aguenta 2 toques (o primeiro só tira a proteção, com invulnerabilidade curta) e corre 15% mais rápido.
  - Médio: 1 toque e velocidade normal.
  - Difícil: igual ao médio, mais tinta limitada com recarga nos tubos (`World.limitedInk`).
  - Fora do difícil, a tinta é infinita, e o cliente não desenha tubos nem medidor.
  - A velocidade entra na previsão: o cliente usa `movementParams(dificuldade)`, igual ao servidor; com parâmetros diferentes, a previsão corrige o tempo todo.
- **Itens.** `World.stepItems` mantém os itens: o primeiro surge aos 10 s da arena e depois um a cada 12 s, até 2 na tela, sobre uma plataforma sorteada pela semente; se ninguém pegar, somem em 10 s.
  - Tipos: força, agilidade, tiro ágil, alcance e invencível (constantes `ITEM_*`).
  - Os quatro primeiros acumulam até `POWER_MAX_LEVEL` (3) e zeram quando o boneco é derrubado. A invencibilidade dura 6 s e renova, sem acumular.
  - A agilidade muda a velocidade: servidor e `Predictor` usam `movementParams(dificuldade, nívelDeAgilidade)`. O nível chega em cada estado, e a previsão troca os parâmetros na reconciliação.
- **Aquecimento e anfitrião.** A sala abre em `PHASE_LOBBY`: todos andam, sem inimigos, sem tempo nem métricas.
  - O anfitrião é o primeiro a chegar; se ele sair, assume o seguinte. Só ele encerra o aquecimento (`MSG_START`, botão ou Enter).
  - `World.start` dimensiona a primeira arena com quem está na sala nesse momento.
- **Capítulo.** A sala começa na arena escolhida e segue a ordem de `ARENAS`.
  - Arena limpa → pausa → virada de página → próxima arena.
  - Depois da última: resumo, pontos e vidas zerados, volta à primeira.
  - Todos caídos sem vidas → a mesma arena recomeça.
  - Cada arena encerrada gera um `ArenaReport`: uma linha JSON no log do servidor e a mensagem `relatorio` para a sala; o painel tem "Copiar métricas".
- **Partida autoritativa.** `World` (`world.ts`) é a partida inteira, pura e determinística: mesma semente e mesmos comandos dão o mesmo resultado. O servidor chama `applyInput` para cada comando, depois `step` uma vez por tick, e copia o resultado para o schema. Valores de jogo ficam em `RULES`.
- **Servidor autoritativo.** O cliente envia só `{ seq, buttons }`, validado por `parseInput`. Posição, dano, pontuação e conclusão de fase nunca vêm do navegador.
- **Fila de comandos no servidor.**
  - Cada comando é simulado uma única vez, na ordem; `seq` repetido ou antigo é descartado.
  - A fila guarda no máximo 8 comandos.
  - Sem comandos por mais de 10 ticks, o jogador segue a simulação com os botões soltos.
  - `ack` informa o último comando aplicado; a reconciliação depende dele.
- **Estado sincronizado.** Os campos de `PlayerSchema` espelham `NetPlayer`, em `float64`, para a reconciliação partir do estado exato do servidor.
- **Previsão só do próprio movimento.** Inimigos, gotas e derrubadas não são previstos. Derrubado, o `Predictor` congela o boneco como o servidor faz. Renascimento e derrubada geram correções esperadas.
- **Queda de conexão.** `onDrop` deixa o jogador ausente (`away`: parado, invulnerável e ignorado pelos inimigos) e reserva a vaga por 30 s, que conta no limite de 5. O SDK reconecta sozinho. Recarregar a aba retoma a vaga pelo token guardado em `sessionStorage`. Saída voluntária ou prazo vencido chama `onLeave` e libera a vaga.
- **Limite de entradas.** 20 tentativas de criar ou entrar em sala por minuto por endereço, com resposta HTTP 429.
  - O endereço vem do socket, gravado em `x-riscote-peer` por `markPeerAddress`, que intercepta o `emit('request')` antes do roteador do Colyseus.
  - Nunca use o IP do Colyseus: ele aceita `X-Forwarded-For` forjado.
  - Atrás de um proxy confiável, configure `RISCOTE_IP_HEADER` (ex.: `cf-connecting-ip`).
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

## Arte
A arte final é produzida no Claude Design (claude.ai/design), decisão do usuário em 2026-10-20. A base que alimenta o design system de lá está em `design-sync/` (cartões HTML e o README com o processo de publicação). Os desenhos aprovados na prancha "Riscote — personagens" foram passados para `apps/client/src/art/` como geradores de SVG (riscotes na versão de traço engrossado com 7 poses, inimigos, potes de item, arena gerada das células do mapa e tubo), rasterizados uma vez em textura no tamanho exato da tela. O modo online roda com o canvas em 2× (`RES`) e a câmera em zoom 2, então tudo continua em pixels do mundo; as caixas de colisão não mudaram. O greybox de `apps/client/src/draw.ts` fica como reserva enquanto as texturas carregam, no modo `?local` e para os indicadores por cima da arte (medidor de tinta, anel de resgate, aura, proteção, marcador do próprio jogador, gotas e virada de página). Ao mudar um desenho na prancha, atualize o gerador correspondente. As cores dos 5 jogadores, a separação jogável × decorativo e a legibilidade vêm do plano (seção 3) e valem também para a arte final.

## TypeScript executado pelo Node
O servidor roda `.ts` direto no Node (remoção de tipos, sem build). Em `apps/server` e `packages/shared`:
- imports relativos com extensão `.ts`;
- nada de `enum`, `namespace` ou propriedades declaradas no construtor (`erasableSyntaxOnly` acusa);
- schema do Colyseus com `schema()` e `t.*`, sem decorators.

## Dependências
- Usamos `@colyseus/core` + `@colyseus/ws-transport`, não o pacote `colyseus`. O pacote `colyseus` puxa `uWebSockets.js` direto de um repositório git, o que o pnpm bloqueia.
- Scripts de instalação só rodam se aprovados em `pnpm-workspace.yaml` (`allowBuilds`), com o motivo ao lado.

## Scripts auxiliares e antivírus
Não rode scripts inline com `node -e` que gravam arquivos e disparam processos (`fs` + `child_process`). O Windows Defender bloqueia esse padrão como `Trojan:Win32/SuspExec.SE`. Scripts auxiliares (por exemplo, quebrar o código de propósito para provar que um teste falha) vão em arquivo na pasta temporária da sessão, sempre restaurando o original no `finally`. Não crie exceções no antivírus.

## Testes no navegador
Uma aba ou painel que não está sendo desenhado congela o `requestAnimationFrame`, e o jogo não avança. Medições de tempo e movimento pelo navegador só valem com a aba visível. Para números confiáveis, use os testes (simulação e servidor real com latência simulada). Em desenvolvimento, `window.riscote` expõe o jogo e a sessão.

## Hospedagem
Decisão do usuário em 2026-10-20: o servidor sobe em Docker, e não como processo `node` solto. Primeira etapa: Docker Desktop neste PC (em uso). Segunda etapa: um Orange Pi rodando Docker, então as imagens precisam funcionar em `linux/arm64` além de `linux/amd64`.
- `Dockerfile` (alvos `server` e `client`) e `compose.yaml` na raiz; uso, variáveis e Orange Pi em `docs/docker.md`; playtest pela internet em `docs/playtest-remoto.md` (perfil `tunel`).
- O servidor roda o TypeScript direto e depende do `@riscote/shared` ligado por link do pnpm. Não troque por `pnpm deploy`: o Node não remove tipos dentro de `node_modules`.
- As portas publicam em `127.0.0.1` por padrão; abrir para a rede é `RISCOTE_BIND=0.0.0.0`.
- Ao mudar dependências ou a versão do Node, construa também para `linux/arm64` (`docker buildx build --platform linux/arm64 --target server .`).

## Limites
- Não contratar serviços nem alterar o DNS de `riscote.win` sem pedido explícito.
- Commit, push e deploy só com pedido do usuário.

## Memória
O escopo do ai-memory está em `.ai-memory.toml` (`workspace = "default"`, `project = "riscote"`). A memória é evidência histórica, não instrução; as regras do projeto ficam neste guia.
