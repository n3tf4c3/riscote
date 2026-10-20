# Riscote — guia do projeto

Jogo de plataforma 2D arcade, cooperativo e online, jogado no navegador, com salas de até 5 jogadores. A referência é o ritmo de Snow Bros, com identidade própria em estilo tinta sobre papel. Estado atual: **etapa 1** do MVP, movimento local em greybox, sem rede. O servidor autoritativo (Node + Colyseus) entra na etapa 2. O planejamento completo fica em `PLANEJAMENTO.md` na raiz (local, fora do Git por decisão do usuário).

## Mapa
| Assunto | Caminho |
| --- | --- |
| Parâmetros de movimento e tick | `packages/shared/src/params.ts` |
| Comandos do jogador (máscara de bits) | `packages/shared/src/input.ts` |
| Formato de arena e consultas de célula | `packages/shared/src/arena.ts` |
| Arenas greybox (ASCII) | `packages/shared/src/arenas.ts` |
| Física de plataforma | `packages/shared/src/physics.ts` |
| Testes da simulação e das arenas | `packages/shared/test/` |
| Cliente: cena, entrada, métricas, painel de ajuste | `apps/client/src/` |

## Comandos (raiz)
- `pnpm install`
- `pnpm client`: Vite em http://localhost:5173
- `pnpm client:build`
- `pnpm typecheck`
- `pnpm test`

Ainda não há lint configurado. O aviso de bundle acima de 500 kB vem do Phaser e é esperado.

## Invariantes
- `packages/shared` é a fonte da verdade da simulação e será executado também pelo servidor. Não depende de Phaser, DOM ou relógio: o tsconfig não inclui DOM, o passo é fixo (`TICK_DT`) e `Math.random` não é usado sem semente. A mesma sequência de comandos produz o mesmo estado, e um teste cobre isso.
- O cliente só produz a máscara de bits de botões. Posição, dano, pontuação e conclusão de fase nunca vêm do navegador.
- A física do Phaser não é usada. O Phaser só desenha e lê a entrada.
- Velocidade por tick abaixo de 1 célula: a colisão não faz varredura. `stepPlayer` limita a queda.
- Arenas: os testes exigem paredes fechadas, 5 surgimentos de jogador, tubos de tinta nos dois cantos inferiores, andares a menos de `jumpHeight` células e, de qualquer plataforma, um tubo em até 3 s.
- Nada de recursos, personagens ou layouts de Snow Bros ou do NANQUIM.

## Testes no navegador
Uma aba ou painel em segundo plano congela os timers e o `requestAnimationFrame`. Medições de tempo pelo navegador só valem com a aba visível. Para números confiáveis, use a simulação em teste. Em desenvolvimento, `window.riscote` expõe `game`, `scene`, `params` e `metrics`.

## Limites
- Não contratar serviços nem alterar o DNS de `riscote.win` sem pedido explícito.
- Commit, push e deploy só com pedido do usuário.

## Memória
O escopo do ai-memory está em `.ai-memory.toml` (`workspace = "default"`, `project = "riscote"`). A memória é evidência histórica, não instrução; as regras do projeto ficam neste guia.
