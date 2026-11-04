# Riscote — guia do projeto

Jogo de plataforma 2D arcade, cooperativo e online, jogado no navegador, com salas de até 5 jogadores. A referência é o ritmo de Snow Bros, com identidade própria em cartum de traço marinho sobre papel pautado (desde 2026-10-31; antes, tinta de pincel).

Estado atual:
- **Etapa 1** (movimento local em greybox) concluída.
- **Etapa 2** (servidor autoritativo, salas por código, previsão e interpolação) concluída.
- **Etapa 3** (inimigos, mecânica de encharcar e rolar, tinta com recarga nos tubos, derrubada com resgate, vidas da equipe e ondas) implementada.
- **Etapa 4** (capítulo com as arenas e virada de página, borrão de tempo, relatório de métricas por arena) implementada. Em 2026-10-21 os capítulos passaram a ter 4 fases com dificuldade crescente e inimigos novos, mais o chefe.
- **Capítulos novos** (decisões do usuário em 2026-11-01): depois do Caderno vêm cinco capítulos temáticos (Floresta Encantada, Biblioteca dos Sonhos, Jardim das Lanternas, Oficina Mágica, Castelo das Nuvens), cada um com 4 fases, criaturas próprias com poderes próprios e um chefe próprio na 5ª página. Os seis capítulos estão prontos e jogáveis: Caderno (Mata-Borrão), Floresta (Apontador), Biblioteca (Calhamaço), Jardim (Regador), Oficina (Lapiseira) e Castelo (Dragão-Pipa). Partituras e mapas saiu do menu, e as páginas dele viraram as fases da Biblioteca.
- **Playtest remoto** por túnel temporário: `docs/playtest-remoto.md`.
- **Etapa 5** (reconexão com vaga reservada, limite de tentativas de entrada, rede instável e carga medida) implementada. Falta o teste com jogadores em redes reais.
- **No ar** desde 2026-10-20: `https://riscote.win` (servidor em `play.riscote.win`), pelo túnel `riscote` da Cloudflare, rodando no Orange Pi.

- **Apps de Android e iOS** (`PLANEJAMENTO.md`, seção 9). Decisões do usuário em 2026-10-22: Expo com WebView, com o cliente web embutido, e Android primeiro, numa prova de conceito sem loja. A prova de conceito do Android (`apps/mobile`) roda no emulador; falta o teste no aparelho do usuário.

O planejamento completo fica em `PLANEJAMENTO.md` na raiz (local, fora do Git por decisão do usuário).

## Mapa
| Assunto | Caminho |
| --- | --- |
| Parâmetros de movimento e tick | `packages/shared/src/params.ts` |
| Comandos do jogador (máscara de bits) | `packages/shared/src/input.ts` |
| Arenas: formato, layouts ASCII, capítulos e regras de cada fase (`Stage`) | `packages/shared/src/arena.ts`, `packages/shared/src/arenas.ts` |
| Física de plataforma | `packages/shared/src/physics.ts` |
| Protocolo: sala, código, validação de entrada, mensagens de erro | `packages/shared/src/protocol.ts` |
| Previsão, reconciliação e interpolação | `packages/shared/src/prediction.ts` |
| Regras da partida: tinta, inimigos, bola, resgate, vidas, ondas, capítulo, borrão, métricas (`RULES`, `ArenaReport`) | `packages/shared/src/world.ts` |
| Sala autoritativa e estado sincronizado | `apps/server/src/ArenaRoom.ts`, `apps/server/src/state.ts` |
| Limite de tentativas de entrada e endereço real do cliente | `apps/server/src/joinLimit.ts` |
| Placar de recordes: nome, mensagens, arquivo, tela de fim de jogo, `GET /recordes` e botão da capa | `packages/shared/src/records.ts`, `apps/server/src/records.ts`, `apps/client/src/records.ts` |
| Nome do jogador, sala aberta ou privada, lista da capa (`GET /salas`) e avisos de entrada e saída | `packages/shared/src/protocol.ts` (`RoomSummary`), `apps/server/src/roomList.ts`, `ArenaRoom.summary`, `apps/client/src/online.ts`, `net.ts` (`onPresence`) |
| Métricas do processo e teste de carga | `apps/server/src/metrics.ts`, `apps/server/scripts/carga.ts` |
| Cliente online: entrada em sala, sessão, cena | `apps/client/src/online.ts`, `net.ts`, `OnlineScene.ts` |
| Entrada: modos de teclas, gamepad, controles de toque (direcional e botões) e o desenho deles | `apps/client/src/input.ts`, `toque.ts`, `toque.css`, `art/toque.ts` |
| Capa (tela antes de entrar numa sala): logotipo, cena animada, cartão do menu | `apps/client/src/capa.ts`, `capa.css`, `art/capa.ts` |
| Arte, animação e efeitos do cliente | `apps/client/src/art/`, `anim.ts`, `fx.ts` |
| Visual de cada capítulo (tema do cenário, pele dos inimigos, chefe) | `apps/client/src/art/capitulos.ts`, `art/pele.ts` (interfaces `Pele` e `PeleChefe`), `art/pele-floresta.ts`, `art/chefe-apontador.ts`, `art/pele-biblioteca.ts`, `art/chefe-calhamaco.ts`, `art/pele-jardim.ts`, `art/chefe-regador.ts`, `art/pele-oficina.ts`, `art/chefe-lapiseira.ts`, `art/pele-castelo.ts`, `art/chefe-dragao.ts` |
| Acabamento de giz de cera nos cenários, no papel da página e no palco da capa | `apps/client/src/art/giz.ts` (`aplicarGiz`, `comTremor`, `gizPapelUrl`, `GIZ_*`); `textures.ts` (`ArtSpec.giz`), `main.ts`, `capa.ts` |
| Cenários em camadas (parallax, recorte da frente, base dos tubos) e o ambiente animado | `apps/client/src/art/arena.ts` (`Cenario`), `art/celulas.ts`, `art/floresta.ts`, `biblioteca.ts`, `jardim.ts`, `oficina.ts`, `castelo.ts`; `apps/client/src/ambiente.ts` |
| Chefes (Mata-Borrão, Apontador, Calhamaço, Regador, Lapiseira, Dragão-Pipa): regras, páginas e capítulo; desenho no cliente | `packages/shared/src/boss.ts`; `apps/client/src/bossView.ts`, `art/boss.ts`, `art/chefe-*.ts` |
| Áudio: direção, inventário, prompts, licenças e pendências | `docs/audio.md` |
| Áudio: síntese dos efeitos e da trilha, masters e codificação | `audio/` (`gerar.ts`, `codificar.sh`) |
| Áudio no cliente: motor, eventos, volumes; catálogo gerado | `apps/client/src/audio/` (`som.ts`, `controles.ts`, `catalogo.ts`), `apps/client/public/audio/` |
| Cliente local (`?local`): ajuste de movimento e medições | `apps/client/src/local.ts`, `ArenaScene.ts`, `tuning.ts`, `metrics.ts` |
| App de Android e iOS: WebView com o jogo embutido, plugins que levam o jogo aos assets do Android e mantêm a tela acesa; no cliente, `IN_APP` | `apps/mobile/` (`App.tsx`, `plugins/jogo.js`, `plugins/tela-acesa.js`, `app.json`), `apps/client/src/app.ts` |
| Testes | `packages/shared/test/`, `apps/server/test/` |

## Comandos (raiz)
- `pnpm install`
- `pnpm server`: partidas em ws://localhost:2567. `COLYSEUS_LATENCY=<ms>` simula a latência de ida e volta.
- `pnpm client`: Vite em http://localhost:5173.
  - `?local` abre o modo de ajuste.
  - `?sala=CODIGO` entra direto numa sala.
  - `?servidor=ws://…` troca o servidor.
  - `?tema=floresta` (ou `biblioteca`, `jardim`, `oficina`, `castelo`) veste a arena com outro tema (só o desenho; usado para ver as fases novas em protótipo).
- `pnpm client:build`
- `docker compose up -d --build`: servidor e cliente em containers (cliente em http://localhost:4173); `docker compose down` para. Detalhes em `docs/docker.md`.
- `pnpm --filter ./apps/server carga -- --salas 10 --segundos 30 --servidor ws://localhost:2600`: robôs de carga. Rode antes um servidor separado com `RISCOTE_METRICS=1`, `RISCOTE_JOIN_LIMIT=0`, `RISCOTE_MAX_ROOMS=0` e `PORT=2600`. Medição e limite de salas em `docs/docker.md` (Capacidade).
- `node apps/server/scripts/sonda-rede.ts wss://…`: mede o atraso entre enviar um comando e recebê-lo confirmado. Serve para separar problema de rede/túnel de problema no cliente.
- Variáveis do servidor: ver o comentário no topo de `apps/server/src/index.ts`.
- `?debug` no link expõe `window.riscote` também na versão compilada, para inspeção pelo console.
- `pnpm typecheck`
- `pnpm test`
- App Android (prova de conceito, APK local sem EAS):
  - `pnpm --filter @riscote/mobile jogo`: compila o cliente com `--mode app` em `apps/mobile/web/jogo`;
  - em `apps/mobile`, `pnpm expo prebuild --platform android` (só na primeira vez ou ao mudar `app.json`, plugins ou dependências nativas) e depois `cd android && ./gradlew assembleRelease`;
  - o APK sai em `android/app/build/outputs/apk/release/app-release.apk`, assinado com a chave de depuração (só para instalar à mão).

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
  - O modo desloca a curva das fases sem desfazê-la (2026-10-21): no fácil, avisos 1,42× (`warnTimes`, mínimo 0,85 s), habilidades com intervalo 1,5×, 1 inimigo a menos por fase (nunca abaixo de 3) e borrão aos 90 s; no difícil, intervalo 0,85×.
  - A velocidade entra na previsão: o cliente usa `movementParams(dificuldade)`, igual ao servidor; com parâmetros diferentes, a previsão corrige o tempo todo.
- **Itens.** `World.stepItems` mantém os itens: o primeiro surge aos 10 s da arena e depois um a cada 12 s, até 2 na tela, sobre uma plataforma sorteada pela semente; se ninguém pegar, somem em 10 s.
  - Tipos: força, agilidade, tiro ágil, alcance e invencível (constantes `ITEM_*`).
  - Os quatro primeiros acumulam até `POWER_MAX_LEVEL` (3) e zeram quando o boneco é derrubado. A invencibilidade dura 6 s e renova, sem acumular.
  - Placar no alto da tela (pedido do usuário em 2026-11-01, `OnlineScene.drawHud`): à esquerda, as vidas da equipe em corações (`RULES.teamLives`, cheios os que restam); à direita, os poderes do próprio jogador, com o pote do item e um ponto por nível até `POWER_MAX_LEVEL`, e a invencibilidade com o tempo que falta. O meio fica para a barra do chefe; no aquecimento não aparece. O painel continua com os mesmos números em texto.
  - A agilidade muda a velocidade: servidor e `Predictor` usam `movementParams(dificuldade, nívelDeAgilidade)`. O nível chega em cada estado, e a previsão troca os parâmetros na reconciliação.
- **Aquecimento e anfitrião.** A sala abre em `PHASE_LOBBY`: todos andam, sem inimigos, sem tempo nem métricas.
  - O anfitrião é o primeiro a chegar; se ele sair, assume o seguinte. Só ele encerra o aquecimento (`MSG_START`, botão ou Enter).
  - `World.start` dimensiona a primeira arena com quem está na sala nesse momento.
  - Sem comando de ninguém por `LOBBY_IDLE_MINUTES` (10) no aquecimento, a sala fecha com `CLOSE_LOBBY_IDLE` e a capa explica o motivo. Uma aba visível manda comando a cada quadro; a escondida não, então quem deixa a aba de lado no aquecimento perde a sala.
- **Capítulo.** Decisões do usuário em 2026-10-21 e 2026-11-01: cada capítulo de `CHAPTERS` tem 4 fases (`ARENAS` é a lista de todas), e o chefe dele (`CHAPTER_BOSSES`) fecha o capítulo na 5ª página. Hoje são o Caderno (Margem, Escadaria, Poço, Andaime; Mata-Borrão), a Floresta Encantada (Clareira, Raízes, Toca, Copas; Apontador) a Biblioteca dos Sonhos (Estantes, Fichário, Atlas, Arquivo; Calhamaço) o Jardim das Lanternas (Canteiros, Lago, Ponte, Pérgola; Regador), a Oficina Mágica (Engrenagens, Polias, Prancheta, Esteira; Lapiseira) e o Castelo das Nuvens (Nuvens, Muralha, Torres, Pináculo; Dragão-Pipa). As fases da Biblioteca são as páginas de Partituras e mapas (guardadas desde que esse capítulo saiu do menu), com ids e nomes novos. O menu escolhe o capítulo; a sala sempre começa pela 1ª fase (`chapterFrom`), e id desconhecido ou antigo cai no capítulo 1. Compacta, Padrão e Ampla ficaram só no `?local` (`GREYBOX`). O fundo de cada tema sai de `TEMAS` em `apps/client/src/art/arena.ts` (sem tema, o caderno).
  - Arena limpa → pausa → virada de página → próxima arena.
  - Depois da última: resumo, pontos e vidas zerados, volta à primeira.
  - Todos caídos sem vidas → fim de jogo: pontos zerados e a mesma arena recomeça.
  - Desistir (`MSG_GIVE_UP`, só o anfitrião, só em `PHASE_PLAYING`, botão com dois cliques) → `World.giveUp`: a equipe cai, as vidas zeram e é o mesmo fim de jogo, com motivo `desistencia`.
  - Cada arena encerrada gera um `ArenaReport`: uma linha JSON no log do servidor e a mensagem `relatorio` para a sala; o painel tem "Copiar métricas".
- **Encharcado.** Desde 2026-11-03 (o usuário achou que demorava muito para derrubar), o bicho vira bola com 3 gotas (`soakToBall`; 4 com 4 ou 5 jogadores, `soakToBallBigTeam`) e perde um nível a cada 2,2 s (`soakDecay`); antes eram 4, 5 e 1,5 s.
- **Fases e inimigos.** Cada arena de capítulo traz um `Stage` (`arena.stage`): tipos em ordem de surgimento, habilidades ligadas, quantidade (`base + perPlayer × jogadores`), limite na tela, ritmo e borrão. Sem `stage` (testes, greybox), vale `DEFAULT_STAGE`, o comportamento anterior.
  - Fase 1: traça e grampo (ou saltador), sem habilidade, com dicas de tiro e chute no cliente. Fase 2: mais tipos simples (saltador, fiandeira). Fase 3: tinteiro e as primeiras habilidades (bote, cuspe). Fase 4: tudo junto, com a borracha e a pancada.
  - Inimigos novos em `world.ts`: grampo (corre reto, desce pelos vãos), fiandeira (sobe e desce num fio a partir dos pontos `A` do layout; encharcada, cai como bola), tinteiro (cospe uma gota rente ao chão, `World.spits`; pular escapa e um tiro desmancha) e borracha (apaga a tinta que vem de frente; de costas, girando ou com a bola, cai).
  - `Enemy.skilled` liga a habilidade por inimigo; os fiapos do chefe repassam o capítulo (sem bote na fase 1 dele, com bote na 2, grampos na 3).
  - Toda habilidade perigosa avisa antes: no mínimo 0,6 s; o cliente usa os mesmos tempos de `warnTimes`.
  - Criaturas da Floresta (pedido do usuário em 2026-11-01: monstros característicos, com poderes diferentes, e não os do capítulo 1 com outra roupa). Cada uma tem o papel de um inimigo do caderno (`ENEMY_ROLE`, `enemyRole`), de quem herda o andar, a física e os quadros base, e um poder só dela, com aviso:
    - lagarta-cereja (traça): metamorfose; com alguém a até `flySight`, vira casulo (`cocoonWarn`), sai borboleta voando atrás dele por `flyTime` sem entrar nos blocos e depois cai até pousar; encharcada no ar, vira bola;
    - grilo-pulante (saltador): salto longo; a cada tantos saltos marca o ponto de quem está mais perto (`aimX`/`aimY`, sincronizados), avisa (`leapWarn`) e salta em arco até lá, mesmo em outro andar;
    - pinha-corredora (grampo): semeia pinhões (`World.sprouts`) que brotam (`sproutWarn`) em brotos de espinho; um tiro de tinta arranca o broto;
    - bicho-cesto (fiandeira): com alguém embaixo, treme no fio (`twigWarn`) e solta um graveto que cai reto;
    - caracol-de-seiva (tinteiro): marca o ponto de quem está ao alcance, mesmo em outro andar (`lobWarn`), e joga a seiva em arco; ela só para no andar marcado;
    - ouriço-escudo (borracha): a frente estoura a tinta; sempre (sem depender da fase) se enrola (`rollWarn`) e rola imune à tinta, e parado fica tonto (`dizzyTime`), quando a tinta pega de qualquer lado.
    - Graveto e seiva são `Spit` com `kind` (`SPIT_*`) e gravidade; o tiro de tinta desmancha os dois.
    - Na curva da Floresta, a fase 2 traz o cesto e o caracol sem poder; a 3 liga lagarta, caracol e pinha; a 4 traz o ouriço e liga grilo e cesto. O teste de progressão vale pelo papel de cada uma. Os fiapos do Apontador são lagartas e pinhas.
    - Testes em `packages/shared/test/floresta.test.ts`.
  - Criaturas da Biblioteca dos Sonhos (2026-11-01), no mesmo esquema:
    - marca-página (traça): atalho; com alguém de pé a mais de `warpMin` e até `warpSight` células (mesmo em outro andar), marca um ponto de pé no andar dele a `warpGap` células (`aimX`/`aimY`), some parado (`warpWarn`) e aparece lá; quem pisou na marca no aviso é derrubado. O cliente não interpola esse salto (`Interpolator`, `snapDist`);
    - dicionário (saltador): páginas soltas; a cada tantos saltos treme aberto (`pagesWarn`), salta alto e, no alto, solta `pagesCount` páginas que caem devagar (`pagesFall`), balançando;
    - pergaminho (grampo): tapete; com alguém à frente no mesmo andar a até `unrollSight`, para (`unrollWarn`) e desenrola um tapete rente ao chão até `unrollReach` células ou o fim do chão (`unrollBox`, a ponta em `aimX`); pular por cima passa;
    - morcego-de-biblioteca (fiandeira): mergulho; do fio, com alguém de pé embaixo e sem bloco no meio, abre as asas (`diveWarn`) com a marca no chão, mergulha até lá e volta para o fio;
    - coruja-de-óculos (tinteiro): facho; com alguém em qualquer direção a até `beamSight` sem bloco no meio, marca a linha (`beamWarn`) e solta o facho por ela (`beamLine`, atravessa plataformas e para no bloco); quem sai da linha escapa;
    - enciclopédia (borracha): fechada, a capa barra a tinta de frente; sempre (sem depender da fase), com alguém no mesmo andar, abre (`lettersWarn`), atira três letras em leque e fica aberta (`lettersRest`): aberta, a tinta pega de qualquer lado.
    - Página e letra são `Spit` (`SPIT_PAGINA`, `SPIT_LETRA`); o tiro de tinta desmancha as duas.
    - Na curva da Biblioteca, a fase 2 traz o morcego e a coruja sem poder; a 3 liga marca-página, coruja e pergaminho; a 4 traz a enciclopédia e liga dicionário e morcego. Os fiapos do Calhamaço são marca-páginas e pergaminhos.
    - Testes em `packages/shared/test/biblioteca.test.ts`.
  - Criaturas do Jardim das Lanternas (2026-11-01), no mesmo esquema:
    - vaga-lume (traça): clarão; com alguém a até `flashSight`, acende parado (`flashWarn`) e solta um clarão em círculo de `flashRadius` (`circleHits`); escapa quem sai do círculo;
    - sapo-bolha (saltador): bolha; a cada tantos saltos incha as bochechas (`bubbleWarn`) e sopra uma bolha (`SPIT_BOLHA`) que persegue devagar quem está mais perto (`bubbleSpeed`), atravessando as plataformas, por `bubbleLife`;
    - besouro-do-orvalho (grampo): gota rolante; com alguém à frente no mesmo andar, para (`dewWarn`) e chuta uma gota (`SPIT_ORVALHO`) que rola pelo chão, cai pelos vãos para os andares de baixo e estoura na parede;
    - sino-dos-ventos (fiandeira): balanço; com alguém de pé embaixo, treme e desce até o fim do fio (`swingWarn`) e balança como pêndulo (`swingAngle`, `swingPeriod`, `swingCount`), preso em `aimX`/`anchorY`;
    - chafariz (tinteiro): jato; marca o chão de quem está de pé por perto, mesmo em outro andar (`geyserWarn`), e o jato sobe dali (`geyserBox`, `geyserHeight`, para em bloco);
    - sombrinha (borracha): aberta, barra a tinta de frente; sempre, com alguém no mesmo andar, fecha (`parasolWarn`: fechada, a tinta pega de qualquer lado) e abre espirrando `parasolDrops` gotinhas (`SPIT_GOTINHA`) em leque para cima.
    - Na curva do Jardim, a fase 2 traz o sino e o chafariz sem poder; a 3 liga vaga-lume, chafariz e besouro; a 4 traz a sombrinha e liga sapo e sino. Os fiapos do Regador são vaga-lumes e besouros.
    - Testes em `packages/shared/test/jardim.test.ts`.
  - Criaturas da Oficina Mágica (2026-11-01), no mesmo esquema:
    - compasso (traça): giro; com alguém a até `compassSight`, crava a ponta (`compassWarn`) e gira a perna uma volta inteira (`compassReach`; a ponta da perna em `aimX`/`aimY`);
    - molinha (saltador): ricochete; a cada tantos saltos encolhe (`springWarn`) e dispara reta para quem está mais perto, rebatendo nos blocos e paredes por `springTime`, atravessando plataformas;
    - ímã-ferradura (grampo): parafusos; com alguém no mesmo andar, marca dois pontos no chão (`aimX` à esquerda, `aimY` à direita) e dois `SPIT_PARAFUSO` deslizam até ele;
    - prumo (fiandeira): queda; com alguém de pé logo embaixo, treme (`plumbWarn`), despenca até o chão (`aimY`), solta uma onda curta (`World.shocks`) e sobe de volta;
    - furadeira (tinteiro): broca; com alguém de pé no andar de cima, vai para baixo dele e dispara um `SPIT_BROCA` para cima, atravessando plataformas;
    - martelo (borracha): a cabeça barra a tinta de frente; sempre, com alguém no mesmo andar, se ergue (`hammerWarn`: aberto à tinta) e bate: derruba quem está de pé no trecho de chão dele (`aimX` a `aimY`); quem está no ar escapa.
    - Na curva da Oficina, a fase 2 traz o prumo e a furadeira sem poder; a 3 liga compasso, furadeira e ímã; a 4 traz o martelo e liga molinha e prumo. Os fiapos da Lapiseira são compassos e ímãs. Testes em `packages/shared/test/oficina.test.ts`.
  - Criaturas do Castelo das Nuvens (2026-11-01), no mesmo esquema:
    - raposa de origami (traça): rastro; fareja (`foxWarn`) e por `foxTime` vai atrás de onde o alvo esteve `foxDelay` segundos antes (`World.trails`, gravado no começo de cada passo), sem passar de `foxSpeed`, atravessando tudo; quem para é alcançado;
    - balãozinho de origami (saltador): estouro; a cada tantos saltos incha (`balloonWarn`) e estoura em `shardCount` `SPIT_ESTILHACO` para todos os lados;
    - aviãozinho de papel (grampo): voo; vendo alguém sem bloco no meio, mira (`planeWarn`, a marca em `aimX`/`aimY`) e voa reto até bater num bloco ou cansar, atravessando plataformas;
    - móbile de estrelas (fiandeira): estrelas; com alguém na altura dele (`mobileHeight`), gira (`mobileWarn`) e atira um `SPIT_ESTRELA` para cada lado;
    - cornetinha de papel (tinteiro): notas; com alguém no mesmo andar, sopra duas `SPIT_NOTA` que avançam em onda (`baseY`, `phase`, `noteWave`);
    - torreão (borracha): o portão barra a tinta de frente; sempre, com alguém no mesmo andar, abre (`towerWarn`: aberto à tinta) e faz cair `SPIT_FLECHA` nas três marcas de `towerSpots`.
    - Na curva do Castelo, a fase 2 traz o móbile e a cornetinha sem poder; a 3 liga raposa, cornetinha e avião; a 4 traz o torreão e liga balãozinho e móbile (`skillCdMult` 0,85, o mais duro). Os fiapos do Dragão-Pipa são raposas e aviões. Testes em `packages/shared/test/castelo.test.ts`.
- **Chefe.** Decisões do usuário em 2026-10-20 e 2026-11-01: cada capítulo tem o seu chefe, numa página própria fora de `ARENAS` (`BOSS_ARENAS`); o servidor monta o capítulo com `withBoss(fases, 4, CHAPTER_BOSSES[i])`. O Mata-Borrão é o do capítulo 1 (`mesa`); o Apontador, o da Floresta (`bosque`); o Calhamaço, o da Biblioteca (`atril`); o Regador, o do Jardim (`coreto`); a Lapiseira, a da Oficina (`bancada`); o Dragão-Pipa, o do Castelo (`torre`). O tipo vem da página (`bossKind`), e todos têm a estrutura do Mata-Borrão mais um golpe próprio (`BOSS_ATTACKS`). Regras e valores em `boss.ts` (`BOSS_RULES`).
  - Apara-bumerangue (Apontador): 0,9 s de aviso marcando a faixa na altura de quem está mais perto (`targetY`, sincronizado), depois a apara sai da boca, corre pela faixa até a parede e volta; some na mão dele, e some junto quando ele cai. Escapa quem sai da faixa.
  - Virada de página (Calhamaço): 1,2 s de aviso; a página sai da parede do outro lado de quem está mais perto dele e varre a arena inteira até a parede oposta, com uma fresta na altura de quem está mais perto da parede de saída (`targetY`; a parede em `targetX`). São dois `HAZARD_PAGE`, acima e abaixo da fresta, correndo juntos. Só passa quem está na fresta; não vem outra página enquanto uma varre.
  - Enxurrada (Regador): 1,3 s de aviso com o nível da água marcado (`targetY` = `floodLevel`, um pouco abaixo do topo da plataforma mais baixa da página); a água (`HAZARD_FLOOD`, um retângulo do chão até o nível) sobe, fica `floodHold` e escoa. Quem ficou no chão é derrubado; quem está numa plataforma fica seco. Não vem outra enquanto a água está alta. O servidor copia também largura e altura dos perigos a cada tick, porque a água muda de tamanho.
  - Traçado (Lapiseira): risca `lineCount` retas de borda a borda (`HAZARD_LINE`: de (x, y) a (x + w, y + h)), a primeira passando por quem está mais perto; tracejadas no aviso (`wait`, `lineWindup`) e de grafite por `lineTime`. Escapa quem sai das linhas.
  - Redemoinho (Dragão-Pipa): um anel (`HAZARD_RING`: centro x, y; raio w; meio da brecha h, em radianos) cresce a partir dele depois do aviso (`ringWindup`), com a brecha (`ringGap` para cada lado) apontada para quem estava mais perto; `ringHits` ignora quem está na brecha. Não vem outro anel enquanto um cresce.
  - Vida 6 + 3 por jogador. Só bola chutada tira vida (1 + inimigos levados no caminho). A tinta enche o medidor de encharcado; cheio, ele fica pesado 3 s: parado, inofensivo e levando o dobro.
  - Fases aos 60% e 25% da vida. Carimbada, onda e chuva (só da fase 2) sempre têm um aviso de 0,7 s ou mais antes de machucar. Na entrada ninguém toma dano.
  - Na página dele não há fila de inimigos nem borrão de tempo; os fiapos (traças) saem dele e somem quando ele cai.
  - O cliente desenha o chefe em `bossView.ts` (avisos, barra de vida, letreiro, virada da página) com a arte de `art/boss.ts`.
- **Placar de recordes.** Decisões do usuário em 2026-10-20: entra no placar o capítulo concluído e a equipe sem vidas, quando há pontos. A desistência também entra (2026-10-21).
  - `World.endRun` gera um `RunEnd` e a pausa vira `RULES.recordDelay` (40 s); o servidor chama `closeRecords` quando todos escreveram, e a pausa cai para `RULES.recordShow`.
  - A linha é da equipe: pontuação da sala e um nome por jogador, na ordem de chegada; quem não escreve fica como "Jogador N".
  - Um placar por dificuldade, com os 15 melhores (`RECORDS_MAX`) de todas as salas do servidor. Empate não desloca quem chegou antes.
  - O navegador manda só `{ name }` (`MSG_NAME`), validado por `parseRecordName` (até 12 letras ou números, espaço, ponto, hífen e sublinhado); uma vez por jogador e por fim de jogo, com até `RECORD_NAME_TRIES` tentativas. A pontuação vem sempre do `World`.
  - O cliente põe os nomes na tela só com `textContent`.
  - Na capa, "Ver recordes" (pedido do usuário em 2026-10-23) abre o placar das três dificuldades, buscado a cada abertura em `GET /recordes` (`serveJson`, cache de 1 s, CORS aberto) e validado no navegador por `parseRecordsBoard`.
  - Arquivo `recordes.json` em `RISCOTE_DATA_DIR` (no Docker, o volume `riscote_dados` em `/dados`), gravado por troca atômica; linhas inválidas são descartadas ao carregar.
- **Nomes e salas abertas.** Pedido do usuário em 2026-10-21.
  - A capa tem "Seu nome" (lembrado em `localStorage`, `riscote.nome.v1`), mandado como `{ name }` nas opções de criar ou entrar e validado por `parseRecordName`; sem nome ou inválido, o servidor usa "Jogador N". O nome vai em `PlayerSchema.name` e não entra na simulação.
  - Quem entrou com nome já vai com ele para o placar e não fica em `waiting`.
  - Criar sala escolhe Aberta (padrão do menu) ou Privada. O servidor só abre com `open: true`: cliente antigo, sem o campo, cria sala privada.
  - `GET /salas` (`serveRoomList`, cache de 1 s, CORS aberto) lista as salas do processo: a aberta com código e nomes; a privada só com contagem, capítulo, modo e página, nunca código nem nomes. As duas trazem a capacidade e as vagas livres pela internet (`capacity`, `vacant`); sem vaga pela internet, a capa mostra "Cheia". A capa consulta a cada 5 s, só com a aba visível, e entra pelo `joinById` de sempre (o limite de entradas vale igual).
  - Na partida, o cliente compara os jogadores a cada estado e mostra bilhetes "X entrou/saiu da sala", "perdeu a conexão", "voltou", com a cor do boneco; o painel lista quem está na sala. Tudo com `textContent`.
- **App (`apps/mobile`).** Prova de conceito de 2026-10-22, só Android por enquanto.
  - A WebView abre `file:///android_asset/jogo/index.html`. O Chromium não faz `fetch` de `file://`, e o som é carregado assim; um adaptador injetado em `App.tsx` lê esses arquivos por `XMLHttpRequest`. O jogo em si não sabe disso.
  - Com `IN_APP` (build `--mode app`), o cliente pula o aviso de só computador e a checagem de versão nova, usa `wss://play.riscote.win`, esconde o link do modo local e faz o convite apontar para `https://riscote.win/`.
  - Tela deitada e barras do sistema escondidas vêm do `app.json` e do `App.tsx`; `android/`, `web/` e `dist/` são gerados e ficam fora do Git.
  - Tela acesa: `plugins/tela-acesa.js` liga `FLAG_KEEP_SCREEN_ON` no `onCreate` da `MainActivity`, sem depender do JS. O `useKeepAwake` ligava pelo JS uma vez só, e a falha era engolida (no aparelho do usuário a tela desligava no meio da partida, 2026-10-23).
  - WebView endurecida (auditoria de 2026-10-23, achado 4): só `file://*` navega dentro do app (o resto abre no navegador do sistema), sem acesso universal a `file://`, depuração só em `__DEV__` e `allowBackup: false`.
  - O workspace usa `nodeLinker: hoisted` (convenção da casa para Expo): com a estrutura isolada do pnpm, o build C++ do React Native no Windows trava. O `Dockerfile` copia também `apps/mobile/package.json`, porque o lockfile só confere com todos os pacotes.
- **Versão nova do cliente.** Pedido do usuário em 2026-10-22. Cada build grava uma versão no JS (`__RISCOTE_VERSAO__`) e em `versao.json` (plugin em `apps/client/vite.config.ts`). A aba consulta `versao.json` a cada 2 min e quando muda de visibilidade (`src/versao.ts`); se mudou, recarrega só na capa, fora de sala, sem conexão em andamento, sem campo em foco e sem nada digitado ou escolhido na capa que ainda não foi usado para entrar (`lobbyTouched`, achado 6 da auditoria de 2026-10-23), e tira o `?sala=` da URL para não voltar à sala sozinha. Quem está jogando recarrega ao voltar para a capa. Uma tentativa por versão (`sessionStorage`), para um `index.html` velho em cache não causar recarga em série. Em desenvolvimento não faz nada.
- **Partida autoritativa.** `World` (`world.ts`) é a partida inteira, pura e determinística: mesma semente e mesmos comandos dão o mesmo resultado. O servidor chama `applyInput` para cada comando, depois `step` uma vez por tick, e copia o resultado para o schema. Valores de jogo ficam em `RULES`.
- **Servidor autoritativo.** O cliente envia só `{ seq, buttons }`, validado por `parseInput`. Posição, dano, pontuação e conclusão de fase nunca vêm do navegador.
- **Controles.** Teclado, gamepad e toque viram a mesma máscara `BTN_*` em `InputSource.buttons()`; nenhum deles muda simulação ou protocolo.
  - Som e modos de teclas ficam recolhidos no botão "Configurações" do painel (`<details id="config">`, fechado por padrão, pedido do usuário em 2026-10-22). Modos de teclas ("Teclas") salvos por navegador em `localStorage` (`riscote.teclas.v1`). Padrão: setas ou WASD, ↑/Espaço/Z/K pulam (a seta para cima pula desde 2026-10-23, a pedido do usuário; o W continua sem uso), X/J atiram. ASD (decisão do usuário em 2026-10-21): A/D andam, S desce, J e Espaço pulam, K atira; setas, Z e X ficam de fora. Trocar de modo zera as teclas seguradas.
  - Mais jogadores na mesma tela (pedido do usuário em 2026-11-01): no painel, "Mais um jogador no controle" espera o próximo controle livre apertar um botão (`InputSource.armClaim`); esse controle passa a ser só do jogador novo (`claimed`, fora dos botões do primeiro), que entra na mesma sala numa vaga própria (`LocalGuest`: outra conexão, outro `OnlineSession`, nome do primeiro com o número). A cena avança cada um no mesmo passo fixo e desenha os da tela pela previsão deles, com o marcador de jogador local. O teclado e o toque ficam com o primeiro. "Tirar", a saída do primeiro ou recarregar a aba tiram o jogador a mais (ele sai de vez no `pagehide`, sem vaga reservada). Ele não tem campo de nome no placar: fica com o nome que já tem ("Ana 2" ou "Jogador N") e o manda sozinho, para não segurar a pausa do fim de jogo.
  - Vagas da sala (pedido do usuário em 2026-11-01): ao criar, a capa escolhe quantos jogam neste computador (`local`, 1 a 5) e quantas vagas ficam para a internet (`online`, até o que sobra); a sala comporta `local + online` (`parseSeats`, `maxClients`). O navegador sorteia uma chave (`localKey`, `parseLocalKey`), que nunca vai para o estado nem para a lista. No `ArenaRoom.onAuth`, quem criou e quem entra com a chave ocupam as vagas locais; os outros, só as da internet (recusa `ONLINE_FULL`). Com as locais cheias, quem tem a chave usa uma da internet. A vaga é contada já no `onAuth` (`kinds`), para duas entradas ao mesmo tempo não passarem juntas. Quando todos do computador saem de vez, as vagas locais passam para a internet. Depois de entrar, o painel já espera o controle de cada jogador local escolhido. Quem entra pelo código pode pôr jogadores a mais, mas eles ocupam vagas da internet. Cliente antigo, sem os campos: 1 local e 4 pela internet.
  - Os textos de controles da capa e do painel seguem o modo por `body[data-teclas]` (classes `teclas-padrao`, `teclas-asd`); no toque valem os de `.so-toque`. As dicas da fase 1 e o letreiro do aquecimento perguntam ao `InputSource` (`attackName`, `touchVisible`).
  - Celular e tablet fora do navegador (decisão do usuário em 2026-10-22, até os apps de Android e iOS): com `(pointer: coarse) and (hover: none)`, `bootOnline` mostra só a capa com o aviso `#so-computador` (e o código do convite, se veio um) e não conecta nem lista salas. O código de toque abaixo fica guardado para os apps.
  - Toque (`toque.ts`): direcional (lados e baixo; o jogo não usa o `BTN_UP`) e botões Pular e Atirar por cima do canvas, só com `body.toque` e fora da capa. Aparecem sozinhos em `pointer: coarse` ou no primeiro toque e somem ao apertar uma tecla do jogo. Cada dedo é um ponteiro com captura, então andar, pular e atirar juntos funcionam, e segurar Pular pula mais alto. Um toque nos botões dura pelo menos 50 ms (`MIN_TAP_MS`), para não se perder entre ticks.
  - Layout: o Phaser desenha em `#tela`, dentro do `#game`. No celular em pé, `#tela` segue a proporção da arena (`--tela-aspecto`, definido em `startGame`), os controles ficam numa faixa logo abaixo e o painel vem depois. Deitado (altura até 500 px), a arena ocupa a tela, os controles ficam nos cantos e o painel desce. Na capa, `#tela` fica `visibility: hidden`, nunca `display: none`: o Phaser nasce antes de a capa sair e, medindo 0×0, ficaria preso em tamanho zero.
  - Na emulação do navegador, o toque só liga abaixo de 768 px de largura; para testar deitado, use algo como 740×360.
- **Fila de comandos no servidor.**
  - Cada comando é simulado uma única vez, na ordem; `seq` repetido ou antigo é descartado.
  - A fila guarda no máximo 8 comandos.
  - Sem comandos por mais de 10 ticks, o jogador segue a simulação com os botões soltos.
  - `ack` informa o último comando aplicado; a reconciliação depende dele.
- **Estado sincronizado.** Os campos de `PlayerSchema` espelham `NetPlayer`, em `float64`, para a reconciliação partir do estado exato do servidor.
- **Previsão só do próprio movimento.** Inimigos, gotas e derrubadas não são previstos. Derrubado, o boneco não obedece aos comandos, mas cai até pousar num chão (`stepDowned`, no servidor e no `Predictor`): derrubado no ar, ficaria fora do alcance do resgate (pedido do usuário em 2026-11-01). Renascimento e derrubada geram correções esperadas.
- **Queda de conexão.** `onDrop` deixa o jogador ausente (`away`: parado, invulnerável e ignorado pelos inimigos) e reserva a vaga por 30 s, que conta na capacidade da sala (local ou da internet, a que ele ocupava). O SDK reconecta sozinho. Recarregar a aba retoma a vaga pelo token guardado em `sessionStorage`. Saída voluntária ou prazo vencido chama `onLeave` e libera a vaga.
- **Limite de entradas.** 20 tentativas de criar ou entrar em sala por minuto por endereço, com resposta HTTP 429.
  - O endereço vem do socket, gravado em `x-riscote-peer` por `markPeerAddress`, que intercepta o `emit('request')` antes do roteador do Colyseus.
  - Nunca use o IP do Colyseus: ele aceita `X-Forwarded-For` forjado.
  - Atrás de um proxy confiável, configure `RISCOTE_IP_HEADER` (ex.: `cf-connecting-ip`).
- **Limite de salas.** Decisão do usuário em 2026-10-21: no máximo `RISCOTE_MAX_ROOMS` salas abertas (padrão 20, ou seja, 100 jogadores, escolhido pelo usuário com folga sobre a medição no Orange Pi), contadas por `processMetrics.rooms` mais as que estão sendo criadas (`limitRooms` em `joinLimit.ts`).
  - Acima disso, criar sala responde HTTP 503 com `SERVER_FULL`; entrar pelo código numa sala existente continua valendo.
  - Cada endereço mantém no máximo `ROOMS_PER_ADDRESS` (3) salas abertas criadas por ele; a seguinte responde HTTP 429 com `TOO_MANY_ROOMS` (auditoria de 2026-10-23, achado 3: um só endereço lotava as 20). Depende do endereço real: atrás do túnel, `RISCOTE_IP_HEADER=cf-connecting-ip`, senão todos dividem as mesmas 3.
  - O número vem da medição com robôs no próprio Pi (`docs/docker.md`, seção Capacidade). Para subir o padrão, meça de novo lá.
- **Mensagens desconhecidas.** Fora do modo de desenvolvimento, o Colyseus derruba o cliente que manda um tipo de mensagem não registrado.
- **Testes de rede.** Usam `QuietRoom`, uma subclasse sem ondas definida só no servidor de teste. Opções do cliente nunca desligam inimigos.
- **Previsão própria.** Previsão e interpolação ficam em `prediction.ts`. O `Predict` do Colyseus 0.18 não é usado por enquanto (decisão para reavaliar).
- **Sala cheia.** A sala só fica trancada ao atingir a capacidade dela (`local + online`, no máximo 5), por isso `describeJoinError` trata "locked" como sala cheia (`ROOM_FULL`). Se algum dia a sala for trancada por outro motivo, mude essa tradução.
- **Física do Phaser.** Não é usada; o Phaser só desenha e lê a entrada.
- **Colisão.** A velocidade por tick fica abaixo de 1 célula, porque a colisão não faz varredura; `stepPlayer` limita a queda.
- **Arenas.** Os testes exigem:
  - paredes fechadas;
  - 5 surgimentos de jogador;
  - tubos de tinta nos dois cantos inferiores;
  - andares a menos de `jumpHeight` células;
  - de qualquer plataforma, um tubo em até 3 s;
  - toda célula onde dá para ficar de pé alcançável a partir dos surgimentos (no médio e no fácil), e os inimigos pousando onde os jogadores chegam;
  - pontos de fio (`A`) presos embaixo de uma célula cheia, com chão alcançável a até `threadReach + 1` células;
  - pelo menos 12 células de chão por jogador, e nenhuma fase parecida demais com outra do mesmo tamanho;
  - a curva do capítulo (`arenas.test.ts`, "progressão do capítulo").
- **Referências.** Nada de recursos, personagens ou layouts de Snow Bros ou do NANQUIM.

## Arte
A arte final é produzida no Claude Design (claude.ai/design), decisão do usuário em 2026-10-20. A base que alimenta o design system de lá está em `design-sync/` (cartões HTML e o README com o processo de publicação). Os desenhos vivem em `apps/client/src/art/` como geradores de SVG, rasterizados uma vez em textura no tamanho exato da tela.

Direção de cartum (pedido do usuário em 2026-10-31, a partir de quadros de um vídeo explicativo ilustrado): traço azul-marinho (`INK`, `#1f2433`) de espessura constante em tudo o que é jogável, cor chapada com uma segunda tinta de sombra ou barriga e um risco de brilho branco, sombra dura deslocada (`shadowFilter` e `url(#sombra)` em `art/svg.ts`), papel pautado (`PAPER` `#f6f1e7`, pauta `#e3dbca`) e rostos expressivos (`eye`, `openMouth`, `blush`). Não há mais textura de ruído nem pinceladas (`stroke`, filtros `tinta`/`seco`/`tecido`/`borra`); a linha viva ficou com uma variação só (`BOIL = 1`), e as chaves e a troca continuam no código.
- Giz de cera nos cenários (pedido do usuário em 2026-11-03, a partir de quadros de um plataforma de 16 bits desenhado a giz; só a técnica, sem copiar nada): sem trocar tema, cor nem composição, todo cenário ganha riscos diagonais curtos num tom mais claro e num mais escuro da própria cor, mais pontinhos de papel. Os riscos e o grão são um ladrilho desenhado uma vez e passado no canvas depois de rasterizar (`aplicarGiz`, pelo `ArtSpec.giz`); com filtro de ruído no SVG custava ~200 ms por camada, assim ~50 ms. As camadas longe, meio e frente têm também a borda tremida no SVG (`comTremor`, uma oitava, antes do recorte da frente). As peças jogáveis ganham os riscos, mas nunca o tremor (a colisão é a do desenho). Bonecos e inimigos continuam de cartum limpo. Fora da arena, o giz vai também no papel da página (`gizPapelUrl`, `--giz-papel` no `body`, feito no boot em `main.ts`), no palco da capa (rasterizado com `GIZ_JOGAVEL` e trocado quando fica pronto) e no enfeite atrás da bisnaga (`GIZ_PECA`). Só a textura e o visual vêm da referência; regras, mecânicas e fases continuam as do Riscote (decisão do usuário em 2026-11-03).
- Riscotes (`art/riscote.ts`): crianças de cabeção com moletom na cor do jogador, crachá branco, calça cinza e tênis branco; pele, cabelo e acessório por vaga (chapéu de festa, cachecol, antena, capuz de gato, boina). Gente, e não bicho, para nunca serem confundidos com um monstro. Cada pose tem uma expressão: sorriso parado, olhos felizes piscando, garra na corrida, "uau" no pulo, susto na queda, grito ao atirar e tontura (olhos em X e estrelas) derrubado. 12 poses, corrida de 6 quadros.
- `PLAYER_COLORS` (`draw.ts`) foram avivadas: laranja, azul-céu, amarelo, verde-água e roxo; `PLAYER_GLOWS` são os tons claros de cada uma.
- Monstros (`art/enemies.ts`), em cor chapada e com emoção: traça magenta com listras amarelas (travessa e, no bote, brava), saltador índigo-violeta (bobo, furioso na pancada), grampo verde e azul-petróleo (ranzinza), fiandeira vermelha e bordô (matreira), tinteiro de vidro âmbar com nanquim (atrevido, de bochechas cheias no cuspe), borracha com frente rosa-choque e costas lima (zangada), borrão e mancha quase pretos com brilho roxo e olhos vermelhos. A bola tem cara de pânico.
- Mata-Borrão (`art/boss.ts`): feltro verde, madeira cereja e puxador laranja, com uma emoção por pose.
- Arenas (`art/arena.ts`): papel pautado com os rabiscos do tema em bege apagado; as atravessáveis são etiquetas arredondadas de cor chapada, uma cor por tema, e os sólidos são blocos marinho arredondados, todos com contorno e sombra dura.
- Fases novas com profundidade (conceito de 2026-11-01, inspirado na composição de cenário dos plataformas de fantasia de 16 bits, sem copiar nada): um tema com `cenario` troca o caderno por céu parado e camadas longe, meio e frente, com a aparência própria de sólidos, atravessáveis e pontos `A`. A câmera é fixa, então o parallax desloca as camadas pelo centro da equipe (`OnlineScene.moveParallax`); a arena jogável não se move, e a frente é recortada nas paredes, no chão e na faixa de cima livre (`frenteRecorte`), atrás de itens e bonecos. A Floresta Encantada (`art/floresta.ts`) já veste o capítulo 2, a Biblioteca dos Sonhos (`art/biblioteca.ts`), o 3, e o Jardim das Lanternas (`art/jardim.ts`, entardecer: peças jogáveis com um segundo contorno cor de papel por fora do marinho), o 4, a Oficina Mágica e o Castelo das Nuvens, o 5 e o 6. Notas dos cenários: Oficina Mágica (`art/oficina.ts`; o Riscador desenha o castelo da fase seguinte, nunca a arena, para não criar plataformas-fantasma) e Castelo das Nuvens (`art/castelo.ts`; as plataformas são nuvens brancas de topo reto e contorno marinho, e as do fundo são redondas, lilases e sem marinho), com cartões em `design-sync/cenario/`. Geometria das células em `art/celulas.ts`.
  - Na virada de página, as camadas da folha que sai correm para a esquerda em velocidades diferentes (`VIRADA` em `OnlineScene.ts`), sempre cobertas pela folha nova.
  - O ambiente animado (`ambiente.ts`: folhas, sementes, poeira dourada, vaga-lumes, pétalas, faíscas, fiapos de nuvem) é só desenho, atrás das plataformas, e se agita quando a tela chacoalha.
  - Cada tema tem um enfeite atrás da bisnaga de tinta (`baseTubo`, só no difícil); a bisnaga continua a mesma.
- Pele dos capítulos (decisão do usuário em 2026-11-01): os inimigos de cada capítulo têm desenho próprio e as mesmas regras, no mesmo quadro, apoio e tamanho dos originais (`Pele`); as texturas ganham o prefixo da pele (`vestir`, `ArtSpec.tex`) e as chaves lógicas continuam as mesmas. Na Floresta, a pele veste as criaturas próprias (que usam os quadros de quem fazem o papel) e `art/floresta-poderes.ts` desenha os poderes (casulo, borboleta, bola de espinhos, ouriço tonto, brotos, graveto, seiva), carregados só no capítulo (`VisualCapitulo.poderes`). Na Biblioteca, igual: `art/pele-biblioteca.ts` (com a enciclopédia aberta e o morcego mergulhando) e `art/biblioteca-poderes.ts` (página solta, letras, ponta do tapete); o tapete do pergaminho, o facho da coruja e a página da virada do Calhamaço são desenhados com Graphics nas caixas da simulação. No Jardim, `art/pele-jardim.ts` (com a sombrinha fechada) e `art/jardim-poderes.ts` (bolha, orvalho, gotinha e as cores da água: verde-água, nunca o azul da tinta); o clarão, o jato e a água da enxurrada são Graphics. Bola, borrão, mancha e gota são iguais em todos. Na Oficina e no Castelo, igual (`pele-oficina.ts` com o martelo erguido, `oficina-poderes.ts`; `pele-castelo.ts` com o avião voando e o torreão aberto, `castelo-poderes.ts`); a perna do compasso, o tremor do martelo, as retas da Lapiseira e o anel do Dragão-Pipa são Graphics. Cartões: `design-sync/personagens/floresta.html`, `biblioteca.html`, `jardim.html`, `oficina.html` e `castelo.html`.
- Auras (`art/auras.ts`), desenhadas atrás do boneco, com o centro 22 px acima dos pés:
  - invencível: halo amarelo com raios e estrelas; pulsa, solta brilhos e pisca no último 1,5 s;
  - proteção do fácil: bolha na cor do jogador.
  - O greybox mantém os contornos retangulares como reserva.
- Interface (`capa.css`, `toque.css`, `index.html`, `art/capa.ts`, `art/toque.ts`): cartões brancos e etiquetas com contorno marinho e sombra dura; chip marinho com texto amarelo para logotipo, código da sala e pontuação. Só fontes do sistema: arredondada pesada (`--titulo`, `--rounded`) e manuscrita nas legendas (`--manuscrito`).
- O azul da tinta (`#2f6fd6`) é só do encharcado, da bola, da gota e dos tubos; nenhum corpo usa essa cor.

A animação (`anim.ts`: compressão, esticamento, respiração, piscada) e os efeitos (`fx.ts`: respingos, poeira, chacoalhar) só leem o que a simulação já mostrou e nunca mudam posição, caixa ou regra. A rasterização (`art/textures.ts`) passa por uma fila em fatias de ~8 ms e a capa já adianta bonecos e inimigos. O palco da capa desenha os bonecos num canvas a partir de bitmaps feitos uma vez (`rasterSvg`): trocar o `src` de imagens SVG a cada quadro deixava a capa a ~10 qps no celular (2026-10-22); o canvas do Phaser é transparente e o pote de tinta (`#carregando`) cobre a espera, para a entrada na sala não travar nem ficar preta. O modo online roda com o canvas em 2× (`RES`) e a câmera em zoom 2, então tudo continua em pixels do mundo; as caixas de colisão não mudaram. O greybox de `apps/client/src/draw.ts` fica como reserva enquanto as texturas carregam, no modo `?local` e para os indicadores por cima da arte (medidor de tinta, anel de resgate, aura, proteção, marcador do próprio jogador, anel de cor das gotas e virada de página). Ao mudar um desenho, atualize o gerador e refaça o cartão correspondente em `design-sync/`. A separação jogável × decorativo e a legibilidade vêm do plano (seção 3).

## Áudio
Detalhes em `docs/audio.md`. Como os efeitos visuais, o som só lê o que a simulação já mostrou e é disparado nos mesmos pontos (`anim.ts`, `bossView.ts`, `OnlineScene.ts`); nunca muda regra, posição ou tempo. O contexto de áudio nasce no primeiro gesto do usuário, e o Phaser roda com `noAudio`. Música e efeitos têm volumes separados no painel e podem ser desligados um sem o outro (desligada, a música nem é baixada). Os sons são gerados por `node audio/gerar.ts` e `bash audio/codificar.sh`; o catálogo (`catalogo.ts`) sai do gerador e não é editado à mão. Os masters em `audio/masters/` ficam fora do Git. As quatro trilhas atuais (capa, dois capítulos e chefe) são provisórias; a final depende de geração externa autorizada. Os capítulos novos tocam a segunda trilha (`partituras`) até ganharem a deles.

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
Decisão do usuário em 2026-10-20: o servidor sobe em Docker, e não como processo `node` solto. Primeira etapa: Docker Desktop neste PC. Segunda etapa, em uso desde 2026-10-20: o Orange Pi 5 que também roda o XBrainia, em `linux/arm64`; as imagens precisam funcionar também em `linux/amd64`. Deploy e cuidados do Pi em `docs/docker.md` (seção Orange Pi); lá as portas ficam só em `127.0.0.1`, e a entrada pública é o túnel.
- Containers endurecidos: sem root, só leitura, sem capabilities, `no-new-privileges` e limites de memória e processos (âncora `x-endurecido` no `compose.yaml`).
- `Dockerfile` (alvos `server` e `client`) e `compose.yaml` na raiz; uso, variáveis e Orange Pi em `docs/docker.md`; playtest pela internet em `docs/playtest-remoto.md` (perfil `tunel`, endereços temporários; perfil `dominio`, túnel nomeado com a página em `riscote.win` e o servidor em `play.riscote.win`, a pedido do usuário em 2026-10-20). O token do túnel fica só no `.env` local.
- O servidor roda o TypeScript direto e depende do `@riscote/shared` ligado por link do pnpm. Não troque por `pnpm deploy`: o Node não remove tipos dentro de `node_modules`.
- As portas publicam em `127.0.0.1` por padrão; abrir para a rede é `RISCOTE_BIND=0.0.0.0`.
- O servidor grava só no volume `riscote_dados` (`/dados`, placar de recordes); `docker compose down -v` apaga o placar. Backup e restauração em `docs/docker.md`.
- Ao mudar dependências ou a versão do Node, construa também para `linux/arm64` (`docker buildx build --platform linux/arm64 --target server .`).

## Limites
- Não contratar serviços nem alterar o DNS de `riscote.win` sem pedido explícito.
- Commit, push e deploy só com pedido do usuário.

## Memória
O escopo do ai-memory está em `.ai-memory.toml` (`workspace = "default"`, `project = "riscote"`). A memória é evidência histórica, não instrução; as regras do projeto ficam neste guia.
