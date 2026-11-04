import { EMPTY, SOLID, cellAt, type Arena, type CellPos, type Stage } from './arena.ts';
import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT } from './input.ts';
import { DEFAULT_PARAMS, TICK_DT, TILE, type MovementParams } from './params.ts';
import { createPlayer, stepDowned, stepPlayer, touchesTube, type PlayerState } from './physics.ts';
import { DIFFICULTY_RULES, POWER_MAX_LEVEL, movementParams, type Difficulty } from './protocol.ts';
import type { RunEndReason } from './records.ts';
import { BOSS_APONTADOR, BOSS_CALHAMACO, BOSS_DRAGAO, BOSS_LAPISEIRA, BOSS_REGADOR, BOSS_RULES, Boss, bossKind, isBossArena } from './boss.ts';

/** Regras da etapa 3 (plano, seções 2.3 a 2.7). Valores iniciais, a ajustar em playtest. */
export const RULES = {
  tankSize: 12,
  refillPerSecond: 12,
  shotCooldown: 0.18,
  dropSpeed: 16, // células/s
  dropLife: 0.35, // s
  dropSize: 0.4, // células
  // 2026-11-03: eram 4, 5 e 1,5 s; o usuário achou que demorava muito para derrubar.
  soakToBall: 3,
  soakToBallBigTeam: 4, // com 4 ou 5 jogadores
  soakDecay: 2.2, // s para perder um nível de encharcado
  // 2026-11-04: o usuário achou o jogo rápido; multiplica o andar, o bote e o salto de todos os inimigos.
  enemySpeedMult: 0.88,
  ballTime: 5, // s até a bola se desfazer sozinha
  rollSpeed: 12, // células/s
  rollMaxBounces: 3,
  rollMaxTime: 4,
  burstRadius: 2.5, // células: o respingo da bola estourando encharca quem está perto (diferencial)
  burstSoak: 2,
  maxEnemiesOnScreen: 8,
  spawnDelay: 1,
  clearDelay: 3,
  restartDelay: 2,
  rescueTime: 1,
  respawnTime: 5,
  invulnTime: 2,
  hitInvulnTime: 1.5, // s de invulnerabilidade depois de um toque que não derrubou (modo fácil)
  teamLives: 5,
  scorePerEnemy: 100,
  // Etapa 4: pressão de tempo, virada de página e fim de capítulo (plano, seção 2.4).
  hurryTime: 60, // s na arena até o borrão aparecer
  borraoSpeed: 2.5, // células/s, atravessa paredes e não pode ser derrotado
  turnDelay: 1.2, // s de virada de página
  chapterDelay: 6, // s de resumo no fim do capítulo (no meio da campanha, antes do próximo)
  // Fim de jogo com pontos (capítulo concluído ou equipe sem vidas): pausa para escrever o nome no placar.
  recordDelay: 40, // s no máximo para todos escreverem
  recordShow: 6, // s com o placar na tela depois que todos escreveram
  // Itens que fortalecem o boneco (acumulam até ele ser derrubado, exceto a invencibilidade).
  itemFirstAt: 10, // s na arena até o primeiro item
  itemEvery: 12, // s entre itens
  itemLife: 10, // s até sumir se ninguém pegar
  maxItemsOnScreen: 2,
  itemSize: 0.8, // células
  invincibleTime: 6, // s
  ratePerLevel: 0.75, // multiplica a cadência de tiro por nível
  dropSpeedPerLevel: 0.2, // +20% de velocidade da gota por nível
  rangePerLevel: 0.35, // +35% de alcance da gota por nível
  // Habilidades dos inimigos: cada uma tem um aviso antes de acontecer (no mínimo 0,6 s; mais longo no fácil).
  dashSight: 6, // células à frente, no mesmo andar, para a traça dar o bote
  dashWarn: 0.6, // s parada, tremendo, antes do bote
  dashTime: 0.6, // s de bote
  dashRest: 0.6, // s cansada depois do bote
  dashCooldown: 2.5, // s até poder dar outro bote
  dashSpeedMult: 2.5,
  slamEvery: 3, // a cada tantos saltos, o saltador dá uma pancada
  slamWarn: 0.6, // s agachado antes do salto alto
  slamJumpHeight: 5, // células
  slamRadius: 3, // células que a onda percorre para cada lado, rente ao chão
  slamWaveTime: 0.3, // s até a onda chegar ao fim
  slamWaveBand: 0.75, // células: largura da frente da onda
  slamRest: 0.5, // s parado depois da pancada
  stainEvery: 4, // s entre as manchas do borrão
  stainWarnLead: 0.4, // s em que o borrão se contrai antes de soltar a mancha
  stainWarn: 0.6, // s em que a mancha nova ainda não machuca
  stainLife: 5, // s machucando depois do aviso
  stainSize: 1.1, // células
  maxStains: 4,
  // Inimigos da progressão de fases.
  threadReach: 4, // células que a fiandeira desce no fio, no máximo
  threadSpeed: 2.2, // células/s no fio
  threadPauseDown: 0.8, // s parada embaixo
  threadPauseUp: 1.2, // s parada em cima
  spitSight: 10, // células, no mesmo andar, para o tinteiro cuspir
  spitWarn: 0.7, // s inclinado, com a gota crescendo na boca
  spitAct: 0.2, // s cuspindo
  spitRest: 0.5,
  spitCooldown: 3.5,
  spitSpeed: 7, // células/s, rente ao chão
  spitRange: 9, // células até a gota secar
  spitSize: 0.6, // células
  eraserTurn: 0.8, // s que a borracha leva para virar (enquanto gira, não apaga nada)
  // Capítulo da Floresta (2026-11-01): os poderes das criaturas de lá, todos com aviso antes.
  cocoonWarn: 1, // s no casulo antes de sair borboleta
  flySight: 8, // células até alguém (em qualquer direção) para a lagarta virar borboleta
  flyTime: 4, // s voando
  flySpeed: 3, // células/s na horizontal
  flyClimb: 2.4, // células/s na vertical
  flyWave: 1, // células de balanço para cima e para baixo
  flyCooldown: 7,
  leapWarn: 0.7, // s agachado, com a marca no chão onde o grilo vai cair
  leapTime: 0.8, // s no ar
  leapHeight: 3, // células de arco acima da reta
  leapMin: 2, // células: mais perto que isso, o grilo só pula normal
  leapRest: 0.4,
  sproutEvery: 2.2, // s entre os pinhões que a pinha larga correndo
  sproutWarn: 0.8, // s brotando (ainda não machuca)
  sproutLife: 4, // s machucando
  sproutWidth: 0.8, // células
  sproutHeight: 0.6,
  maxSprouts: 6,
  twigWarn: 0.7, // s com o cesto tremendo antes de soltar o graveto
  twigSight: 8, // células abaixo do cesto
  twigCooldown: 2.5,
  lobWarn: 0.8, // s com a marca onde a seiva vai cair
  lobSight: 9, // células na horizontal
  lobRise: 6, // células para cima ou para baixo
  lobTime: 0.9, // s em voo
  lobCooldown: 3.5,
  hazardGravity: 30, // células/s² (graveto e seiva)
  rollWarn: 0.7, // s se enrolando
  rollSight: 7, // células, no mesmo andar
  rollDashTime: 1.6, // s rolando
  rollSpeedMult: 3.2,
  dizzyTime: 1.5, // s tonto depois de rolar: a tinta pega de todos os lados
  rollCooldown: 4,
  // Capítulo da Biblioteca (2026-11-01): os poderes das criaturas de lá, todos com aviso antes.
  warpWarn: 1, // s sumindo, com a marca onde o marca-página vai aparecer
  warpSight: 10, // células até alguém (em qualquer direção)
  warpMin: 4, // células: mais perto que isso, ele só anda
  warpGap: 3, // células entre o alvo e o ponto onde ele aparece
  warpRest: 0.5, // s parado depois de aparecer
  warpCooldown: 6,
  pagesWarn: 0.7, // s com o dicionário tremendo aberto antes do salto
  pagesCount: 3,
  pagesSpread: 1.4, // células/s na horizontal, para cada lado
  pagesFall: 2.6, // células/s: as páginas caem devagar
  pagesSway: 2.2, // células/s de balanço de um lado para o outro
  pagesLife: 6,
  unrollWarn: 0.7, // s parado, segurando a ponta do pergaminho
  unrollSight: 5, // células à frente, no mesmo andar (o tapete alcança quem ele viu)
  unrollReach: 5.5, // células de tapete
  unrollGrow: 0.25, // s até o tapete abrir inteiro
  unrollTime: 1.3, // s aberto (machucando)
  unrollRest: 0.4, // s enrolando de volta (já não machuca)
  unrollHeight: 0.4, // células: rente ao chão; pular passa
  unrollCooldown: 4,
  diveWarn: 0.8, // s de asas abertas, com a marca no chão onde o morcego vai mergulhar
  diveReach: 4, // células para cada lado
  diveSight: 8, // células abaixo
  diveTime: 1.1, // s do mergulho, ida e volta
  diveRest: 0.5,
  diveCooldown: 4,
  beamWarn: 0.8, // s com a linha tracejada até onde a coruja olha
  beamSight: 9, // células até alguém, em qualquer direção, sem bloco no meio
  beamReach: 14, // células do facho, até bater num bloco
  beamTime: 0.35, // s de facho (machucando)
  beamRest: 0.5,
  beamWidth: 0.4, // células
  beamCooldown: 4,
  lettersWarn: 0.8, // s abrindo a capa: aberta, a tinta pega de frente
  lettersSight: 8, // células, no mesmo andar
  lettersSpeed: 6, // células/s
  lettersRange: 9, // células até a letra sumir
  lettersRest: 0.9, // s ainda aberta depois de atirar
  lettersCooldown: 4.5,
  // Capítulo do Jardim (2026-11-01): os poderes das criaturas de lá, todos com aviso antes.
  flashWarn: 0.9, // s com o vaga-lume acendendo, o círculo marcado
  flashSight: 3, // células até alguém para ele acender
  flashRadius: 2.6, // células do clarão
  flashTime: 0.3, // s de clarão (machucando)
  flashRest: 0.5,
  flashCooldown: 5,
  bubbleWarn: 0.8, // s com as bochechas do sapo inchando
  bubbleSpeed: 2.4, // células/s: a bolha persegue devagar
  bubbleLife: 5,
  dewWarn: 0.7, // s com o besouro parado, preparando o chute
  dewSight: 7, // células à frente, no mesmo andar
  dewSpeed: 7, // células/s rolando
  dewLife: 4,
  dewRest: 0.4,
  dewCooldown: 4,
  swingWarn: 0.8, // s com o sino tremendo no fio
  swingReach: 4, // células para cada lado de alguém embaixo
  swingAngle: 1, // radianos de cada lado
  swingPeriod: 1.2, // s de uma ida e volta
  swingCount: 2, // idas e voltas
  swingRest: 0.5,
  swingCooldown: 4,
  swingDrop: 6, // células/s descendo até o fim do fio, no aviso
  // Capítulo da Oficina Mágica (2026-11-01).
  compassWarn: 0.9, // s com a ponta cravada, o círculo marcado
  compassSight: 3, // células até alguém
  compassReach: 2.5, // células de braço
  compassTime: 0.9, // s de uma volta
  compassWidth: 0.5, // células de grossura do braço
  compassRest: 0.4,
  compassCooldown: 5,
  springWarn: 0.8, // s com a molinha encolhida
  springSpeed: 9, // células/s no ricochete
  springTime: 1.6, // s ricocheteando
  magnetWarn: 0.9, // s com os parafusos marcados no chão
  magnetSight: 6, // células, no mesmo andar
  magnetReach: 5, // células de onde saem os parafusos, para cada lado
  magnetSpeed: 8, // células/s
  magnetCooldown: 4.5,
  plumbWarn: 0.8, // s tremendo no fio, com a marca no chão embaixo
  plumbSight: 8, // células abaixo
  plumbAlign: 1.5, // células para o lado
  plumbSpeed: 16, // células/s caindo
  plumbRise: 6, // células/s voltando
  plumbRadius: 3, // células da onda ao bater
  plumbRest: 0.6,
  plumbCooldown: 4,
  drillWarn: 0.8, // s com a broca girando, apontada para cima
  drillSight: 8, // células acima
  drillAlign: 0.6, // células para o lado
  drillChase: 6, // células: com alguém acima e longe disso para o lado, anda até ficar embaixo
  drillSpeed: 11, // células/s
  drillRange: 10, // células
  drillRest: 0.5,
  drillCooldown: 3.5,
  hammerWarn: 0.9, // s com o martelo erguido (aberto à tinta de frente)
  hammerSight: 7, // células, no mesmo andar
  hammerReach: 8, // células do tremor para cada lado, no mesmo chão
  hammerTime: 0.15, // s de tremor (derruba quem está de pé ali)
  hammerRest: 0.6,
  hammerCooldown: 4.5,
  // Capítulo do Castelo das Nuvens (2026-11-01).
  foxWarn: 0.8, // s farejando o rastro
  foxSight: 7, // células até alguém
  foxDelay: 0.8, // s de atraso no rastro
  foxSpeed: 12, // células/s no máximo, seguindo o rastro
  foxTime: 3, // s seguindo
  foxCooldown: 6,
  balloonWarn: 0.8, // s inchando
  shardCount: 8,
  shardSpeed: 6, // células/s
  shardRange: 5, // células
  planeWarn: 0.8, // s de nariz para cima, mirando
  planeSight: 9, // células até alguém, sem bloco no meio
  planeSpeed: 12, // células/s
  planeTime: 2, // s no máximo em voo
  planeCooldown: 5,
  mobileWarn: 0.8, // s girando no fio
  mobileSight: 8, // células para os lados
  mobileHeight: 0.9, // células acima ou abaixo da altura do móbile (a estrela passa nessa faixa)
  starSpeed: 7, // células/s
  starRange: 9, // células
  mobileRest: 0.5,
  mobileCooldown: 3.5,
  hornWarn: 0.8, // s de bochechas cheias
  hornSight: 9, // células, no mesmo andar
  noteSpeed: 5, // células/s
  noteRange: 10, // células
  noteWave: 1.2, // células de onda para cima e para baixo
  noteFreq: 5, // radianos por segundo da onda
  hornRest: 0.5,
  hornCooldown: 4,
  towerWarn: 1, // s com o portão aberto e as três marcas no chão (aberto, a tinta pega de frente)
  towerSight: 8, // células, no mesmo andar
  arrowDrop: 4, // células acima da marca de onde a flecha cai
  towerRest: 0.8,
  towerCooldown: 4.5,
  geyserWarn: 0.9, // s borbulhando no ponto marcado
  geyserSight: 8, // células na horizontal
  geyserRise: 6, // células para cima ou para baixo
  geyserHeight: 3, // células de jato
  geyserWidth: 1, // células
  geyserTime: 0.6, // s de jato (machucando)
  geyserRest: 0.6,
  geyserCooldown: 4,
  parasolWarn: 0.8, // s com a sombrinha fechando (fechada, a tinta pega de frente)
  parasolSight: 6, // células, no mesmo andar
  parasolDrops: 5,
  parasolSpeed: 7, // células/s das gotinhas
  parasolRest: 0.8,
  parasolCooldown: 4.5,
} as const;

export const ITEM_FORCA = 0;
export const ITEM_AGILIDADE = 1;
export const ITEM_TIRO_AGIL = 2;
export const ITEM_ALCANCE = 3;
export const ITEM_INVENCIVEL = 4;
/** Chance relativa de cada item (a invencibilidade é a mais rara). */
const ITEM_WEIGHTS = [25, 25, 20, 20, 10];

export const ENEMY_TRACA = 0;
export const ENEMY_SALTADOR = 1;
/** A ameaça de tempo: persegue o jogador mais próximo, atravessa paredes e não é encharcada. */
export const ENEMY_BORRAO = 2;
/** Grampo de papel: corre reto e rápido, nunca pula, desce pelos vãos e só vira na parede. */
export const ENEMY_GRAMPO = 3;
/** Aranha de traço fino: sobe e desce num fio preso embaixo de uma plataforma; encharcada, o fio arrebenta. */
export const ENEMY_FIANDEIRA = 4;
/** Pote de nanquim: anda devagar no próprio andar e cospe uma gota rente ao chão depois de um aviso. */
export const ENEMY_TINTEIRO = 5;
/** Borracha de apagar: lenta, vira para quem está mais perto e apaga a tinta que bate na frente. */
export const ENEMY_BORRACHA = 6;

// Criaturas da Floresta (decisão do usuário em 2026-11-01): cada uma tem o papel de um inimigo do
// caderno (`ENEMY_ROLE`), de quem herda o jeito de andar e a física, e um poder só dela.
/** Lagarta-cereja (papel da traça): vira casulo e sai borboleta voando atrás de alguém; depois pousa. */
export const ENEMY_LAGARTA = 7;
/** Grilo-pulante (papel do saltador): marca onde alguém está e dá um salto longo em arco até lá. */
export const ENEMY_GRILO = 8;
/** Pinha-corredora (papel do grampo): correndo, larga pinhões que brotam em espinhos no chão. */
export const ENEMY_PINHA = 9;
/** Bicho-cesto (papel da fiandeira): pendurado, solta gravetos em quem passa embaixo. */
export const ENEMY_CESTO = 10;
/** Caracol-de-seiva (papel do tinteiro): marca onde alguém está e joga a seiva em arco até lá. */
export const ENEMY_CARACOL = 11;
/** Ouriço-escudo (papel da borracha): a frente estoura a tinta; enrola e rola imune; parado, fica tonto. */
export const ENEMY_OURICO = 12;

// Criaturas da Biblioteca dos Sonhos (2026-11-01), no mesmo esquema: o papel de um inimigo do
// caderno e um poder só delas.
/** Marca-página (papel da traça): some e aparece ao lado de alguém, mesmo em outro andar. */
export const ENEMY_MARCADOR = 13;
/** Dicionário (papel do saltador): salta alto e, lá em cima, solta páginas que caem balançando. */
export const ENEMY_DICIONARIO = 14;
/** Pergaminho (papel do grampo): para e desenrola um tapete rente ao chão, à frente. */
export const ENEMY_PERGAMINHO = 15;
/** Morcego-de-biblioteca (papel da fiandeira): do fio, mergulha em quem está embaixo e volta. */
export const ENEMY_MORCEGO = 16;
/** Coruja-de-óculos (papel do tinteiro): marca uma linha até alguém, em qualquer direção, e solta o facho. */
export const ENEMY_CORUJA = 17;
/** Enciclopédia (papel da borracha): fechada, a capa barra a tinta; abre para atirar letras e aí a tinta pega. */
export const ENEMY_ENCICLOPEDIA = 18;

// Criaturas do Jardim das Lanternas (2026-11-01), no mesmo esquema.
/** Vaga-lume (papel da traça): com alguém perto, acende e solta um clarão em círculo. */
export const ENEMY_VAGALUME = 19;
/** Sapo-bolha (papel do saltador): sopra uma bolha que persegue devagar quem está mais perto. */
export const ENEMY_SAPO = 20;
/** Besouro-do-orvalho (papel do grampo): chuta uma gota que rola pelo chão e cai pelos vãos. */
export const ENEMY_BESOURO = 21;
/** Sino-dos-ventos (papel da fiandeira): no fio, balança como um pêndulo largo. */
export const ENEMY_SINO = 22;
/** Chafariz (papel do tinteiro): marca o chão onde alguém está e um jato d'água sobe dali. */
export const ENEMY_CHAFARIZ = 23;
/** Sombrinha (papel da borracha): aberta, barra a tinta de frente; fecha (aí a tinta pega) e abre espirrando gotinhas. */
export const ENEMY_SOMBRINHA = 24;

// Criaturas da Oficina Mágica (2026-11-01), no mesmo esquema.
/** Compasso (papel da traça): crava a ponta e gira a perna num círculo em volta. */
export const ENEMY_COMPASSO = 25;
/** Molinha (papel do saltador): encolhe e dispara em linha reta, ricocheteando nas paredes. */
export const ENEMY_MOLA = 26;
/** Ímã-ferradura (papel do grampo): para e puxa dois parafusos que deslizam pelo chão até ele. */
export const ENEMY_IMA = 27;
/** Prumo (papel da fiandeira): do fio, despenca no chão de baixo, solta uma onda e volta. */
export const ENEMY_PRUMO = 28;
/** Furadeira (papel do tinteiro): fica embaixo de quem está acima e dispara a broca para cima. */
export const ENEMY_FURADEIRA = 29;
/** Martelo (papel da borracha): a cabeça barra a tinta; erguido (aí a tinta pega), bate e o chão treme. */
export const ENEMY_MARTELO = 30;

// Criaturas do Castelo das Nuvens (2026-11-01), no mesmo esquema.
/** Raposa de origami (papel da traça): segue o rastro de alguém, um pouco atrasada, atravessando tudo. */
export const ENEMY_RAPOSA = 31;
/** Balãozinho de origami (papel do saltador): incha e estoura em lascas para todos os lados. */
export const ENEMY_BALAO = 32;
/** Aviãozinho de papel (papel do grampo): mira e voa em linha reta até bater. */
export const ENEMY_AVIAO = 33;
/** Móbile de estrelas (papel da fiandeira): gira no fio e atira estrelas para os dois lados. */
export const ENEMY_MOBILE = 34;
/** Cornetinha de papel (papel do tinteiro): sopra notas que avançam em onda. */
export const ENEMY_CORNETA = 35;
/** Torreão (papel da borracha): o portão barra a tinta; aberto (aí a tinta pega), faz cair flechas em três marcas. */
export const ENEMY_TORREAO = 36;

/** Papel de cada criatura nova: o inimigo do caderno de quem ela herda o andar. */
export const ENEMY_ROLE: Readonly<Record<number, number>> = {
  [ENEMY_LAGARTA]: ENEMY_TRACA,
  [ENEMY_GRILO]: ENEMY_SALTADOR,
  [ENEMY_PINHA]: ENEMY_GRAMPO,
  [ENEMY_CESTO]: ENEMY_FIANDEIRA,
  [ENEMY_CARACOL]: ENEMY_TINTEIRO,
  [ENEMY_OURICO]: ENEMY_BORRACHA,
  [ENEMY_MARCADOR]: ENEMY_TRACA,
  [ENEMY_DICIONARIO]: ENEMY_SALTADOR,
  [ENEMY_PERGAMINHO]: ENEMY_GRAMPO,
  [ENEMY_MORCEGO]: ENEMY_FIANDEIRA,
  [ENEMY_CORUJA]: ENEMY_TINTEIRO,
  [ENEMY_ENCICLOPEDIA]: ENEMY_BORRACHA,
  [ENEMY_VAGALUME]: ENEMY_TRACA,
  [ENEMY_SAPO]: ENEMY_SALTADOR,
  [ENEMY_BESOURO]: ENEMY_GRAMPO,
  [ENEMY_SINO]: ENEMY_FIANDEIRA,
  [ENEMY_CHAFARIZ]: ENEMY_TINTEIRO,
  [ENEMY_SOMBRINHA]: ENEMY_BORRACHA,
  [ENEMY_COMPASSO]: ENEMY_TRACA,
  [ENEMY_MOLA]: ENEMY_SALTADOR,
  [ENEMY_IMA]: ENEMY_GRAMPO,
  [ENEMY_PRUMO]: ENEMY_FIANDEIRA,
  [ENEMY_FURADEIRA]: ENEMY_TINTEIRO,
  [ENEMY_MARTELO]: ENEMY_BORRACHA,
  [ENEMY_RAPOSA]: ENEMY_TRACA,
  [ENEMY_BALAO]: ENEMY_SALTADOR,
  [ENEMY_AVIAO]: ENEMY_GRAMPO,
  [ENEMY_MOBILE]: ENEMY_FIANDEIRA,
  [ENEMY_CORNETA]: ENEMY_TINTEIRO,
  [ENEMY_TORREAO]: ENEMY_BORRACHA,
};

/** Os fiapos de cada chefe novo: quem anda (papel da traça) e quem corre (papel do grampo). */
const BOSS_MINIONS: Readonly<Record<number, readonly [number, number]>> = {
  [BOSS_APONTADOR]: [ENEMY_LAGARTA, ENEMY_PINHA],
  [BOSS_CALHAMACO]: [ENEMY_MARCADOR, ENEMY_PERGAMINHO],
  [BOSS_REGADOR]: [ENEMY_VAGALUME, ENEMY_BESOURO],
  [BOSS_LAPISEIRA]: [ENEMY_COMPASSO, ENEMY_IMA],
  [BOSS_DRAGAO]: [ENEMY_RAPOSA, ENEMY_AVIAO],
};

/** O inimigo do caderno que faz o papel deste (ele mesmo, nos do caderno). */
export function enemyRole(kind: number): number {
  return ENEMY_ROLE[kind] ?? kind;
}

/** O que voa e machuca, cuspido ou solto por um inimigo. */
export const SPIT_CUSPE = 0;
export const SPIT_GRAVETO = 1;
export const SPIT_SEIVA = 2;
/** Página solta do dicionário: cai devagar, balançando. */
export const SPIT_PAGINA = 3;
/** Letra da enciclopédia: voa reta, sem gravidade. */
export const SPIT_LETRA = 4;
/** Bolha do sapo: persegue devagar quem está mais perto, atravessando as plataformas. */
export const SPIT_BOLHA = 5;
/** Gota de orvalho do besouro: rola pelo chão, cai pelos vãos e estoura na parede. */
export const SPIT_ORVALHO = 6;
/** Gotinha da sombrinha: sai em leque para cima e cai com gravidade. */
export const SPIT_GOTINHA = 7;
/** Parafuso do ímã: desliza pelo chão até ele. */
export const SPIT_PARAFUSO = 8;
/** Broca da furadeira: sobe reta, atravessando as plataformas. */
export const SPIT_BROCA = 9;
/** Lasca do balãozinho: voa reta, para qualquer lado. */
export const SPIT_ESTILHACO = 10;
/** Estrela do móbile: voa reta para o lado. */
export const SPIT_ESTRELA = 11;
/** Nota da cornetinha: avança em onda (`baseY`, `phase`). */
export const SPIT_NOTA = 12;
/** Flecha do torreão: cai até a marca no chão (`landY`). */
export const SPIT_FLECHA = 13;
export const MODE_WALK = 0;
export const MODE_BALL = 1;
export const MODE_ROLL = 2;
/**
 * Fase da habilidade de um inimigo: aviso, em ação e recuperação. O borrão só usa o aviso;
 * a borracha usa o aviso enquanto gira para o outro lado.
 */
export const SKILL_NONE = 0;
export const SKILL_WARN = 1;
export const SKILL_ACT = 2;
export const SKILL_REST = 3;
export const PHASE_PLAYING = 0;
export const PHASE_CLEAR = 1;
export const PHASE_RESTART = 2;
export const PHASE_TURN = 3;
export const PHASE_CHAPTER = 4;
/** Aquecimento antes do início: todos andam pela arena, sem inimigos, até o anfitrião começar. */
export const PHASE_LOBBY = 5;

export const ENEMY_SIZE = 0.9; // células, nos três modos
export const BORRAO_SIZE = 1.3; // células

/** Métricas de playtest por jogador numa arena (plano, seção 6). */
export interface PlayerArenaStats {
  slot: number;
  kills: number;
  shots: number;
  downSeconds: number;
  /** Parado no chão sem atirar (aproximação de "sem participar"). */
  idleSeconds: number;
  emptyTankSeconds: number;
}

export interface ArenaReport {
  arena: string;
  position: number;
  arenas: number;
  players: number;
  seconds: number;
  outcome: 'limpa' | 'recomeço' | 'desistência';
  hurry: boolean;
  downs: number;
  rescues: number;
  livesUsed: number;
  /** Bolas que derrubaram 2 ou mais inimigos além de si mesmas. */
  combos: number;
  /** Distância média entre os jogadores de pé, em células. */
  spreadCells: number;
  perPlayer: PlayerArenaStats[];
}

/** Fim de jogo com pontos: o que o servidor leva ao placar. */
export interface RunEnd {
  reason: RunEndReason;
  score: number;
  arena: string;
  /** Quem estava na sala, na ordem de chegada. */
  players: string[];
}

interface RunningStats {
  downs: number;
  rescues: number;
  livesUsed: number;
  combos: number;
  spreadSum: number;
  spreadSamples: number;
  perPlayer: Map<string, PlayerArenaStats>;
}

const ENEMY_BASE: Record<number, MovementParams> = {
  [ENEMY_TRACA]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 3.5, groundAccel: 60, groundDecel: 60, airAccel: 20, jumpHeight: 3.6, jumpCutMult: 1,
  },
  [ENEMY_SALTADOR]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 5, airAccel: 40, jumpHeight: 3.8, jumpCutMult: 1,
  },
  [ENEMY_GRAMPO]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 6, groundAccel: 80, groundDecel: 80, airAccel: 30, jumpCutMult: 1,
  },
  // Solta do fio, anda como uma traça sem bote.
  [ENEMY_FIANDEIRA]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 3, groundAccel: 60, groundDecel: 60, airAccel: 20, jumpHeight: 3.6, jumpCutMult: 1,
  },
  [ENEMY_TINTEIRO]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 2, groundAccel: 40, groundDecel: 60, airAccel: 10, jumpCutMult: 1,
  },
  [ENEMY_BORRACHA]: {
    ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
    runSpeed: 2.5, groundAccel: 40, groundDecel: 80, airAccel: 10, jumpCutMult: 1,
  },
};

// As criaturas da Floresta andam como o inimigo do caderno de quem fazem o papel.
for (const [kind, role] of Object.entries(ENEMY_ROLE)) ENEMY_BASE[Number(kind)] = ENEMY_BASE[role]!;

/** Encharcado anda mais devagar: um parâmetro por nível de tinta (todos já com RULES.enemySpeedMult). */
function bySoak(base: MovementParams): MovementParams[] {
  return Array.from({ length: RULES.soakToBallBigTeam + 1 }, (_, soak) => ({
    ...base,
    runSpeed: base.runSpeed * RULES.enemySpeedMult * Math.max(0.4, 1 - 0.15 * soak),
  }));
}

const ENEMY_PARAMS: Record<number, MovementParams[]> = Object.fromEntries(
  Object.entries(ENEMY_BASE).map(([kind, base]) => [kind, bySoak(base)]),
);

/** Bote da traça e salto alto do saltador, também mais lentos quando encharcados. */
const SKILL_PARAMS: Record<number, MovementParams[]> = {
  [ENEMY_TRACA]: bySoak({
    ...ENEMY_BASE[ENEMY_TRACA]!,
    runSpeed: ENEMY_BASE[ENEMY_TRACA]!.runSpeed * RULES.dashSpeedMult, groundAccel: 200,
  }),
  [ENEMY_SALTADOR]: bySoak({ ...ENEMY_BASE[ENEMY_SALTADOR]!, jumpHeight: RULES.slamJumpHeight }),
  // O salto alto do dicionário, de onde caem as páginas.
  [ENEMY_DICIONARIO]: bySoak({ ...ENEMY_BASE[ENEMY_SALTADOR]!, jumpHeight: RULES.slamJumpHeight }),
  // A bola de espinhos do ouriço.
  [ENEMY_OURICO]: bySoak({
    ...ENEMY_BASE[ENEMY_BORRACHA]!,
    runSpeed: ENEMY_BASE[ENEMY_BORRACHA]!.runSpeed * RULES.rollSpeedMult, groundAccel: 200,
  }),
};

export const BALL_PARAMS: MovementParams = {
  ...DEFAULT_PARAMS, playerWidth: ENEMY_SIZE, playerHeight: ENEMY_SIZE,
  runSpeed: RULES.rollSpeed, groundAccel: 2000, groundDecel: 30, airAccel: 2000, jumpCutMult: 1,
};

/**
 * Regras de onda das arenas sem fase (testes e modo local): o comportamento de antes da progressão,
 * com traças e saltadores de habilidade ligada.
 */
export const DEFAULT_STAGE: Stage = {
  step: 0,
  roster: [ENEMY_TRACA, ENEMY_TRACA, ENEMY_SALTADOR],
  skills: [ENEMY_TRACA, ENEMY_SALTADOR],
  base: 4,
  perPlayer: 1.5,
  maxOnScreen: RULES.maxEnemiesOnScreen,
  spawnDelay: RULES.spawnDelay,
  hurryTime: RULES.hurryTime,
  skillCdMult: 1,
  hints: false,
};

/** Segundos de aviso de cada habilidade no modo; o cliente usa os mesmos números para desenhar o aviso. */
export interface WarnTimes {
  dash: number;
  slam: number;
  spit: number;
  stain: number;
  /** Floresta: casulo, salto longo, broto, graveto, seiva em arco e bola de espinhos. */
  cocoon: number;
  leap: number;
  sprout: number;
  twig: number;
  lob: number;
  roll: number;
  /** Biblioteca: atalho, páginas soltas, tapete, mergulho, facho e letras. */
  warp: number;
  pages: number;
  unroll: number;
  dive: number;
  beam: number;
  letters: number;
  /** Jardim: clarão, bolha, gota rolante, balanço, jato e sombrinha. */
  flash: number;
  bubble: number;
  dew: number;
  swing: number;
  geyser: number;
  parasol: number;
  /** Oficina: compasso, mola, ímã, prumo, furadeira e martelo. */
  compass: number;
  spring: number;
  magnet: number;
  plumb: number;
  drill: number;
  hammer: number;
  /** Castelo: raposa, balãozinho, avião, móbile, cornetinha e torreão. */
  fox: number;
  balloon: number;
  plane: number;
  mobile: number;
  horn: number;
  tower: number;
}

export function warnTimes(difficulty: Difficulty): WarnTimes {
  const k = DIFFICULTY_RULES[difficulty].warnMult;
  return {
    dash: RULES.dashWarn * k,
    slam: RULES.slamWarn * k,
    spit: RULES.spitWarn * k,
    stain: RULES.stainWarn * k,
    cocoon: RULES.cocoonWarn * k,
    leap: RULES.leapWarn * k,
    sprout: RULES.sproutWarn * k,
    twig: RULES.twigWarn * k,
    lob: RULES.lobWarn * k,
    roll: RULES.rollWarn * k,
    warp: RULES.warpWarn * k,
    pages: RULES.pagesWarn * k,
    unroll: RULES.unrollWarn * k,
    dive: RULES.diveWarn * k,
    beam: RULES.beamWarn * k,
    letters: RULES.lettersWarn * k,
    flash: RULES.flashWarn * k,
    bubble: RULES.bubbleWarn * k,
    dew: RULES.dewWarn * k,
    swing: RULES.swingWarn * k,
    geyser: RULES.geyserWarn * k,
    parasol: RULES.parasolWarn * k,
    compass: RULES.compassWarn * k,
    spring: RULES.springWarn * k,
    magnet: RULES.magnetWarn * k,
    plumb: RULES.plumbWarn * k,
    drill: RULES.drillWarn * k,
    hammer: RULES.hammerWarn * k,
    fox: RULES.foxWarn * k,
    balloon: RULES.balloonWarn * k,
    plane: RULES.planeWarn * k,
    mobile: RULES.mobileWarn * k,
    horn: RULES.hornWarn * k,
    tower: RULES.towerWarn * k,
  };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function bodyBox(b: PlayerState, p: MovementParams, grow = 0): Box {
  return { x: b.x - grow, y: b.y - grow, w: p.playerWidth * TILE + 2 * grow, h: p.playerHeight * TILE + 2 * grow };
}

export function stainBox(s: { x: number; y: number }): Box {
  const size = RULES.stainSize * TILE;
  return { x: s.x, y: s.y, w: size, h: size };
}

export function spitBox(s: { x: number; y: number }): Box {
  const size = RULES.spitSize * TILE;
  return { x: s.x, y: s.y, w: size, h: size };
}

export function sproutBox(s: { x: number; y: number }): Box {
  return { x: s.x, y: s.y, w: RULES.sproutWidth * TILE, h: RULES.sproutHeight * TILE };
}

/** Tapete do pergaminho: da frente dele até `aimX`, rente ao chão. */
export function unrollBox(e: { x: number; y: number; dir: number; aimX: number }): Box {
  const size = ENEMY_SIZE * TILE;
  const front = e.dir > 0 ? e.x + size : e.x;
  const h = RULES.unrollHeight * TILE;
  return { x: Math.min(front, e.aimX), y: e.y + size - h, w: Math.abs(e.aimX - front), h };
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Facho da coruja: dos olhos dela, na direção do ponto marcado (`aimX`, `aimY`), até bater num bloco
 * ou chegar a `RULES.beamReach`. As plataformas atravessáveis não param o facho.
 */
export function beamLine(arena: Arena, e: { x: number; y: number; aimX: number; aimY: number }): Segment {
  const size = ENEMY_SIZE * TILE;
  const x0 = e.x + size / 2;
  const y0 = e.y + size * 0.35;
  const len = Math.hypot(e.aimX - x0, e.aimY - y0) || 1;
  const ux = (e.aimX - x0) / len;
  const uy = (e.aimY - y0) / len;
  const step = TILE / 4;
  let d = 0;
  while (d < RULES.beamReach * TILE && cellAt(arena, Math.floor((x0 + ux * (d + step)) / TILE), Math.floor((y0 + uy * (d + step)) / TILE)) !== SOLID) d += step;
  return { x0, y0, x1: x0 + ux * d, y1: y0 + uy * d };
}

/** O círculo encosta na caixa (distância do centro ao ponto mais perto dela). */
export function circleHits(box: Box, cx: number, cy: number, r: number): boolean {
  const dx = Math.max(box.x - cx, 0, cx - (box.x + box.w));
  const dy = Math.max(box.y - cy, 0, cy - (box.y + box.h));
  return dx * dx + dy * dy < r * r;
}

/** Jato do chafariz: sobe do chão marcado (`aimX`, `aimY` = altura dos pés) até `geyserHeight` células ou um bloco. */
export function geyserBox(arena: Arena, aimX: number, aimY: number): Box {
  const w = RULES.geyserWidth * TILE;
  const col = Math.floor(aimX / TILE);
  let top = aimY;
  while (top > aimY - RULES.geyserHeight * TILE && cellAt(arena, col, Math.floor((top - 1) / TILE)) !== SOLID) top -= TILE / 4;
  return { x: aimX - w / 2, y: top, w, h: aimY - top };
}

/**
 * Onde caem as três flechas do torreão: a 2, 3,5 e 5 células da frente dele, no chão dele, sem passar do
 * fim do chão. Devolve os x (meio de cada marca); a altura é a dos pés dele.
 */
export function towerSpots(arena: Arena, e: { x: number; y: number; dir: number }): number[] {
  const size = ENEMY_SIZE * TILE;
  const cx = e.x + size / 2;
  const feet = Math.round((e.y + size) / TILE) * TILE;
  const [left, right] = floorSpan(arena, cx, feet, 6);
  return [2, 3.5, 5].map((d) => Math.min(right - TILE / 2, Math.max(left + TILE / 2, cx + e.dir * d * TILE)));
}

/** O segmento, com `half` de folga para cada lado, encosta na caixa. */
export function segmentHits(box: Box, s: Segment, half: number): boolean {
  const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
  const n = Math.max(1, Math.ceil(len / 2));
  for (let i = 0; i <= n; i++) {
    const x = s.x0 + ((s.x1 - s.x0) * i) / n;
    const y = s.y0 + ((s.y1 - s.y0) * i) / n;
    if (x >= box.x - half && x <= box.x + box.w + half && y >= box.y - half && y <= box.y + box.h + half) return true;
  }
  return false;
}

/**
 * Trecho de chão contínuo por onde a onda da pancada corre: a partir de `x`, na linha de chão sob
 * `feetY`, até `cells` células para cada lado, parando no vão ou na parede. Devolve [esquerda, direita] em pixels.
 */
export function floorSpan(arena: Arena, x: number, feetY: number, cells: number): [number, number] {
  const row = Math.round(feetY / TILE);
  const start = Math.floor(x / TILE);
  const open = (col: number) => cellAt(arena, col, row) !== EMPTY && cellAt(arena, col, row - 1) !== SOLID;
  let left = start;
  let right = start;
  while (left > start - cells && open(left - 1)) left--;
  while (right < start + cells && open(right + 1)) right++;
  const reach = cells * TILE;
  return [Math.max(left * TILE, x - reach), Math.min((right + 1) * TILE, x + reach)];
}

export function enemyBox(e: { kind: number; body: { x: number; y: number } }): Box {
  const size = (e.kind === ENEMY_BORRAO ? BORRAO_SIZE : ENEMY_SIZE) * TILE;
  return { x: e.body.x, y: e.body.y, w: size, h: size };
}

function emptyStats(): RunningStats {
  return { downs: 0, rescues: 0, livesUsed: 0, combos: 0, spreadSum: 0, spreadSamples: 0, perPlayer: new Map() };
}

/** Gerador determinístico (mulberry32): mesma semente, mesma partida. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WorldPlayer {
  id: string;
  slot: number;
  body: PlayerState;
  ink: number;
  cooldown: number;
  down: boolean;
  downTime: number;
  rescue: number;
  invuln: number;
  kills: number;
  /** Conexão caiu e a vaga está reservada: parado, invulnerável e ignorado pelos inimigos. */
  away: boolean;
  /** Toques que ainda aguenta antes de cair. */
  hp: number;
  /** Níveis acumulados dos itens (0 a POWER_MAX_LEVEL). */
  strength: number;
  speed: number;
  rate: number;
  range: number;
  /** Segundos restantes de invencibilidade (item). */
  star: number;
  /** Itens pegos (métrica). */
  items: number;
}

export interface Item {
  id: number;
  kind: number;
  x: number;
  y: number;
  ttl: number;
}

export interface Enemy {
  id: number;
  kind: number;
  mode: number;
  body: PlayerState;
  dir: 1 | -1;
  soak: number;
  soakTimer: number;
  ballTime: number;
  rollTime: number;
  bounces: number;
  combo: number;
  kicker: string | null;
  aiTimer: number;
  edgeDecided: boolean;
  wasBlocked: boolean;
  /** Habilidade: fase (SKILL_*), tempo restante na fase e espera até poder usá-la de novo. */
  skill: number;
  skillTimer: number;
  skillCd: number;
  /** Saltos do saltador desde a última pancada. */
  hops: number;
  /** A habilidade (bote, pancada, cuspe) vale para este inimigo: depende da fase. */
  skilled: boolean;
  /** Fiandeira: y do ponto onde o fio se prende (-1 = solta, andando) e o y mais baixo do corpo no fio. */
  anchorY: number;
  threadEnd: number;
  /** Fiandeira: 1 descendo, -1 subindo. */
  vdir: 1 | -1;
  /** Grilo e caracol: o ponto marcado no chão (meio, altura dos pés) para onde vão o salto e a seiva. */
  aimX: number;
  aimY: number;
  /** Grilo: de onde saiu o salto. */
  fromX: number;
  fromY: number;
  /** Segundos no voo da borboleta ou no salto do grilo. */
  clock: number;
}

/** Gota de nanquim cuspida pelo tinteiro: corre rente ao chão; o tiro de tinta a desmancha. */
export interface Spit {
  id: number;
  /** SPIT_*: cuspe rente ao chão, graveto caindo ou seiva em arco (esses dois com gravidade). */
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** Seiva e flecha: altura dos pés no ponto marcado; antes dela, atravessa as plataformas. */
  landY?: number;
  /** Nota: altura do meio da onda e a fase dela. */
  baseY?: number;
  phase?: number;
}

/** Broto de espinho da pinha: brota (aviso) e depois machuca ao toque; um tiro de tinta o arranca. */
export interface Sprout {
  id: number;
  x: number;
  y: number;
  age: number;
}

/** Mancha deixada pelo borrão: inofensiva no aviso, depois machuca ao toque. */
export interface Stain {
  id: number;
  x: number;
  y: number;
  age: number;
}

/** Onda da pancada do saltador, rente ao chão (altura dos pés `y`) entre `left` e `right`. */
export interface Shock {
  x: number;
  y: number;
  left: number;
  right: number;
  age: number;
}

export interface Drop {
  id: number;
  owner: string;
  slot: number;
  x: number;
  y: number;
  vx: number;
  life: number;
  /** Quanto encharca ao acertar (1 + nível de força de quem atirou). */
  power: number;
}

/**
 * Partida autoritativa de uma sala: jogadores, tinta, inimigos, bolas, vidas e ondas.
 * Puro e determinístico: o servidor chama applyInput por comando e step uma vez por tick.
 */
export class World {
  /**
   * As arenas em sequência; limpar a última fecha a partida e volta à primeira. Numa campanha (vários
   * capítulos seguidos), `chapterEnds` marca as páginas que fecham um capítulo no meio do caminho.
   */
  readonly chapter: readonly Arena[];
  private readonly chapterEnds: ReadonlySet<number>;
  /** A pausa de capítulo em curso é a do último: depois dela, a partida recomeça do zero. */
  private campaignOver = false;
  arenaIndex = 0;
  /** Segundos na arena atual (a pressão de tempo começa em RULES.hurryTime). */
  waveTime = 0;
  hurry = false;
  readonly params: MovementParams;
  /** Parâmetros por nível de agilidade (índice = nível). */
  private readonly speedParams: MovementParams[];
  readonly items = new Map<number, Item>();
  private nextItemAt: number = RULES.itemFirstAt;
  readonly players = new Map<string, WorldPlayer>();
  readonly enemies = new Map<number, Enemy>();
  readonly drops = new Map<number, Drop>();
  readonly stains = new Map<number, Stain>();
  readonly spits = new Map<number, Spit>();
  readonly sprouts = new Map<number, Sprout>();
  shocks: Shock[] = [];
  /** Regras da fase atual (quem aparece, ritmo e habilidades ligadas). */
  stage: Stage = DEFAULT_STAGE;
  /** Avisos das habilidades no modo da sala. */
  readonly warn: WarnTimes;
  /** Segundos na arena até o borrão aparecer, já com o piso do modo. */
  hurryTime: number = RULES.hurryTime;
  /** Multiplica o intervalo entre habilidades: modo × fase. */
  private cdMult = 1;
  private spawnPoint = 0;
  private minionCount = 0;
  /** O Mata-Borrão, só na página dele (`BOSS_ARENA`). */
  boss: Boss | null = null;
  lives: number = RULES.teamLives;
  score = 0;
  phase = PHASE_PLAYING;
  phaseTime = 0;
  wave = 0;
  soakToBall: number = RULES.soakToBall;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private spawnCount = 0;
  private waveStarted = false;
  private nextId = 1;
  private readonly rng: () => number;
  private readonly autoWaves: boolean;
  readonly difficulty: Difficulty;
  /** Tinta acaba e recarrega nos tubos: só no modo difícil. */
  readonly limitedInk: boolean;
  readonly hitsToDown: number;
  private stats: RunningStats = emptyStats();
  private reports: ArenaReport[] = [];
  private runEnds: RunEnd[] = [];

  /** `waves: false` desliga ondas, pressão de tempo e progressão (cenários montados à mão nos testes). */
  constructor(chapter: Arena | readonly Arena[], seed: number, options: { waves?: boolean; difficulty?: Difficulty; chapterEnds?: readonly number[] } = {}) {
    this.chapter = Array.isArray(chapter) ? chapter : [chapter as Arena];
    this.chapterEnds = new Set(options.chapterEnds ?? []);
    if (this.chapter.length === 0) throw new Error('capítulo sem arenas');
    this.rng = seededRandom(seed);
    this.autoWaves = options.waves ?? true;
    this.difficulty = options.difficulty ?? 'medio';
    this.limitedInk = DIFFICULTY_RULES[this.difficulty].limitedInk;
    this.hitsToDown = DIFFICULTY_RULES[this.difficulty].hitsToDown;
    this.params = movementParams(this.difficulty);
    this.speedParams = Array.from({ length: POWER_MAX_LEVEL + 1 }, (_, level) => movementParams(this.difficulty, level));
    this.warn = warnTimes(this.difficulty);
    this.phase = this.autoWaves ? PHASE_LOBBY : PHASE_PLAYING;
    this.applyStage();
  }

  /** Lê as regras da fase da arena atual, deslocadas pelo modo da sala. */
  private applyStage(): void {
    const mode = DIFFICULTY_RULES[this.difficulty];
    this.stage = this.arena.stage ?? DEFAULT_STAGE;
    this.cdMult = mode.skillCdMult * this.stage.skillCdMult;
    this.hurryTime = Math.max(this.stage.hurryTime, mode.minHurry);
  }

  /** Sai do aquecimento: a primeira arena é dimensionada com quem está na sala agora. */
  start(): boolean {
    if (this.phase !== PHASE_LOBBY || this.players.size === 0) return false;
    this.startWave();
    return true;
  }

  get arena(): Arena {
    return this.chapter[this.arenaIndex]!;
  }

  /** Inimigos que faltam derrotar; o borrão não conta (não pode ser derrotado). Na página do chefe, só ele importa. */
  get enemiesLeft(): number {
    let count = this.spawnQueue;
    for (const e of this.enemies.values()) if (e.kind !== ENEMY_BORRAO) count++;
    if (this.boss) return this.boss.gone ? 0 : 1 + count;
    return count;
  }

  /** Relatórios das arenas encerradas desde a última chamada. */
  takeReports(): ArenaReport[] {
    const out = this.reports;
    this.reports = [];
    return out;
  }

  /** Fins de jogo com pontos desde a última chamada (o servidor leva ao placar). */
  takeRunEnds(): RunEnd[] {
    const out = this.runEnds;
    this.runEnds = [];
    return out;
  }

  /** Todos escreveram o nome (ou não há quem escreva): a pausa do placar encurta para RULES.recordShow. */
  closeRecords(): void {
    if (this.phase === PHASE_RESTART || this.phase === PHASE_CHAPTER) this.phaseTime = Math.min(this.phaseTime, RULES.recordShow);
  }

  /** O anfitrião desiste: a equipe cai junta e é fim de jogo, como se as vidas tivessem acabado. */
  giveUp(): boolean {
    if (this.phase !== PHASE_PLAYING || !this.waveStarted) return false;
    this.lives = 0;
    for (const p of this.players.values()) if (!p.down) this.knockDown(p);
    this.gameOver('desistencia', 'desistência');
    return true;
  }

  /** Fim de jogo: os pontos vão ao placar e a arena recomeça do zero. */
  private gameOver(reason: RunEndReason, outcome: ArenaReport['outcome']): void {
    if (this.waveStarted) this.report(outcome);
    this.phase = PHASE_RESTART;
    this.phaseTime = this.endRun(reason) ? RULES.recordDelay : RULES.restartDelay;
  }

  /** Fecha a partida para o placar; sem pontos, não há o que registrar. */
  private endRun(reason: RunEndReason): boolean {
    if (!this.waveStarted || this.score <= 0) return false;
    this.runEnds.push({ reason, score: this.score, arena: this.arena.id, players: [...this.players.keys()] });
    return true;
  }

  private playerStats(p: WorldPlayer): PlayerArenaStats {
    let s = this.stats.perPlayer.get(p.id);
    if (!s) {
      s = { slot: p.slot, kills: 0, shots: 0, downSeconds: 0, idleSeconds: 0, emptyTankSeconds: 0 };
      this.stats.perPlayer.set(p.id, s);
    }
    return s;
  }

  addPlayer(id: string, slot: number): WorldPlayer {
    const player: WorldPlayer = {
      id, slot,
      body: createPlayer(this.arena.playerSpawns[slot]!, this.params),
      ink: RULES.tankSize, cooldown: 0,
      down: false, downTime: 0, rescue: 0,
      invuln: RULES.invulnTime, kills: 0, away: false, hp: this.hitsToDown,
      strength: 0, speed: 0, rate: 0, range: 0, star: 0, items: 0,
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  /** Marca ou desmarca a ausência (queda de conexão com vaga reservada). Ao voltar, ganha invulnerabilidade. */
  setAway(id: string, away: boolean): void {
    const p = this.players.get(id);
    if (!p || p.away === away) return;
    p.away = away;
    if (!away) p.invuln = RULES.invulnTime;
  }

  /** Aplica um comando de um jogador: movimento, tiro de tinta ou chute. */
  applyInput(id: string, buttons: number): void {
    const p = this.players.get(id);
    if (!p) return;
    const pressed = buttons & ~p.body.prevButtons;
    if (p.down) {
      stepDowned(p.body, buttons, this.arena, this.speedParams[p.speed]!);
      return;
    }
    stepPlayer(p.body, buttons, this.arena, this.speedParams[p.speed]!);
    if (pressed & BTN_ATTACK) this.attack(p);
  }

  /** Avança o mundo um tick (depois dos comandos do tick). */
  step(): void {
    const dt = TICK_DT;
    this.recordTrails();
    for (const p of this.players.values()) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.star = Math.max(0, p.star - dt);
      if (!p.down && touchesTube(p.body, this.arena, this.params)) {
        p.ink = Math.min(RULES.tankSize, p.ink + RULES.refillPerSecond * dt);
      }
    }

    if (this.phase === PHASE_PLAYING && this.waveStarted) {
      this.waveTime += dt;
      this.measure(dt);
      // Na luta com o chefe não há borrão: o próprio chefe é a pressão.
      if (this.autoWaves && !this.hurry && !this.boss && this.waveTime >= this.hurryTime) this.spawnBorrao();
    }

    this.stepItems(dt);
    this.stepDrops(dt);
    this.stepHazards(dt);
    this.stepEnemies(dt);
    if (this.boss && this.phase === PHASE_PLAYING) this.boss.step(dt);
    this.stepDamage();
    this.stepRescue(dt);
    this.stepSpawns(dt);
    this.stepPhase(dt);
  }

  /**
   * Coloca um inimigo apoiado na célula de baixo de `cell`. A fiandeira, em vez disso, fica pendurada
   * com o topo do corpo em `cell`, que deve estar logo abaixo de uma célula cheia. `skilled` liga a habilidade.
   */
  spawnEnemy(kind: number, cell: CellPos, skilled = true): Enemy {
    // O borrão não usa física: os parâmetros só posicionam o corpo inicial.
    const params = ENEMY_PARAMS[kind]?.[0] ?? BALL_PARAMS;
    const enemy: Enemy = {
      id: this.nextId++, kind, mode: MODE_WALK,
      body: createPlayer(cell, params),
      dir: this.rng() < 0.5 ? -1 : 1,
      soak: 0, soakTimer: 0, ballTime: 0, rollTime: 0, bounces: 0, combo: 0, kicker: null,
      aiTimer: 1 + this.rng() * 2, edgeDecided: false, wasBlocked: false,
      skill: SKILL_NONE, skillTimer: 0, skillCd: 0, hops: 0,
      skilled, anchorY: -1, threadEnd: 0, vdir: 1,
      aimX: 0, aimY: 0, fromX: 0, fromY: 0, clock: 0,
    };
    if (enemyRole(kind) === ENEMY_FIANDEIRA) this.hangFrom(enemy, cell);
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  /** Prende a fiandeira no ponto: desce até perto do primeiro chão embaixo dele, no máximo RULES.threadReach. */
  private hangFrom(e: Enemy, cell: CellPos): void {
    const size = ENEMY_SIZE * TILE;
    let floor = cell.row + 1;
    while (floor < this.arena.rows && cellAt(this.arena, cell.col, floor) === EMPTY) floor++;
    e.anchorY = cell.row * TILE;
    e.threadEnd = Math.max(e.anchorY, Math.min(floor * TILE - size - 2, e.anchorY + RULES.threadReach * TILE));
    e.body.y = e.anchorY;
    e.vdir = 1;
    e.aiTimer = RULES.threadPauseUp;
  }

  /** Coloca um item sobre a célula sólida ou atravessável `cell` (o item fica na célula de cima). */
  spawnItem(kind: number, cell: CellPos): Item {
    const size = RULES.itemSize * TILE;
    const item: Item = {
      id: this.nextId++, kind,
      x: cell.col * TILE + (TILE - size) / 2,
      y: cell.row * TILE - size,
      ttl: RULES.itemLife,
    };
    this.items.set(item.id, item);
    return item;
  }

  /** Itens aparecem de tempos em tempos sobre uma plataforma sorteada; quem encosta pega. */
  private stepItems(dt: number): void {
    if (this.autoWaves && this.phase === PHASE_PLAYING && this.waveStarted && this.waveTime >= this.nextItemAt) {
      this.nextItemAt += RULES.itemEvery;
      if (this.items.size < RULES.maxItemsOnScreen) this.spawnRandomItem();
    }
    const size = RULES.itemSize * TILE;
    for (const item of this.items.values()) {
      if ((item.ttl -= dt) <= 0) {
        this.items.delete(item.id);
        continue;
      }
      const box = { x: item.x, y: item.y, w: size, h: size };
      for (const p of this.players.values()) {
        if (p.down || p.away || !overlaps(box, bodyBox(p.body, this.params))) continue;
        this.pickItem(p, item.kind);
        this.items.delete(item.id);
        break;
      }
    }
  }

  private spawnRandomItem(): void {
    const cells: CellPos[] = [];
    for (let row = 2; row < this.arena.rows; row++) {
      for (let col = 1; col < this.arena.cols - 1; col++) {
        if (cellAt(this.arena, col, row) !== EMPTY && cellAt(this.arena, col, row - 1) === EMPTY) cells.push({ col, row });
      }
    }
    if (cells.length === 0) return;
    const cell = cells[Math.floor(this.rng() * cells.length)]!;
    let roll = this.rng() * ITEM_WEIGHTS.reduce((a, b) => a + b, 0);
    let kind = 0;
    while (roll >= ITEM_WEIGHTS[kind]!) roll -= ITEM_WEIGHTS[kind++]!;
    this.spawnItem(kind, cell);
  }

  private pickItem(p: WorldPlayer, kind: number): void {
    p.items++;
    const up = (level: number) => Math.min(POWER_MAX_LEVEL, level + 1);
    if (kind === ITEM_FORCA) p.strength = up(p.strength);
    else if (kind === ITEM_AGILIDADE) p.speed = up(p.speed);
    else if (kind === ITEM_TIRO_AGIL) p.rate = up(p.rate);
    else if (kind === ITEM_ALCANCE) p.range = up(p.range);
    else if (kind === ITEM_INVENCIVEL) p.star = RULES.invincibleTime;
  }

  /** O borrão surge no alto, no centro, e vem atrás de quem estiver mais perto. */
  spawnBorrao(): Enemy {
    const e = this.spawnEnemy(ENEMY_BORRAO, { col: Math.floor(this.arena.cols / 2), row: 1 });
    e.body.x = (this.arena.cols * TILE - BORRAO_SIZE * TILE) / 2;
    e.body.y = TILE;
    e.skillCd = RULES.stainEvery;
    this.hurry = true;
    return e;
  }

  /** Amostra de métricas por tick (plano, seção 6). */
  private measure(dt: number): void {
    const standing: PlayerState[] = [];
    for (const p of this.players.values()) {
      const s = this.playerStats(p);
      if (p.down) {
        s.downSeconds += dt;
        continue;
      }
      standing.push(p.body);
      if (p.ink < 1) s.emptyTankSeconds += dt;
      if (p.body.vx === 0 && p.body.onGround && p.cooldown === 0) s.idleSeconds += dt;
    }
    if (standing.length < 2) return;
    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < standing.length; i++) {
      for (let j = i + 1; j < standing.length; j++) {
        sum += Math.hypot(standing[i]!.x - standing[j]!.x, standing[i]!.y - standing[j]!.y);
        pairs++;
      }
    }
    this.stats.spreadSum += sum / pairs / TILE;
    this.stats.spreadSamples++;
  }

  private report(outcome: ArenaReport['outcome']): void {
    const round = (v: number) => Math.round(v * 100) / 100;
    this.reports.push({
      arena: this.arena.id,
      position: this.arenaIndex + 1,
      arenas: this.chapter.length,
      players: this.players.size,
      seconds: round(this.waveTime),
      outcome,
      hurry: this.hurry,
      downs: this.stats.downs,
      rescues: this.stats.rescues,
      livesUsed: this.stats.livesUsed,
      combos: this.stats.combos,
      spreadCells: round(this.stats.spreadSamples ? this.stats.spreadSum / this.stats.spreadSamples : 0),
      perPlayer: [...this.stats.perPlayer.values()].map((s) => ({
        ...s,
        downSeconds: round(s.downSeconds),
        idleSeconds: round(s.idleSeconds),
        emptyTankSeconds: round(s.emptyTankSeconds),
      })),
    });
  }

  private attack(p: WorldPlayer): void {
    const reach = bodyBox(p.body, this.params, 2);
    for (const e of this.enemies.values()) {
      if (e.mode === MODE_BALL && overlaps(reach, enemyBox(e))) {
        // Chutar não gasta tinta.
        e.mode = MODE_ROLL;
        e.dir = p.body.facing;
        e.kicker = p.id;
        e.rollTime = 0;
        e.bounces = 0;
        e.combo = 0;
        return;
      }
    }
    if (p.cooldown > 0 || p.ink < 1) return;
    if (this.limitedInk) p.ink -= 1;
    p.cooldown = RULES.shotCooldown * RULES.ratePerLevel ** p.rate;
    this.playerStats(p).shots++;
    const box = bodyBox(p.body, this.params);
    const size = RULES.dropSize * TILE;
    const id = this.nextId++;
    this.drops.set(id, {
      id, owner: p.id, slot: p.slot,
      x: p.body.facing > 0 ? box.x + box.w : box.x - size,
      y: box.y + box.h * 0.35,
      vx: p.body.facing * RULES.dropSpeed * TILE * (1 + RULES.dropSpeedPerLevel * p.rate),
      life: RULES.dropLife * (1 + RULES.rangePerLevel * p.range),
      power: 1 + p.strength,
    });
  }

  private stepDrops(dt: number): void {
    const size = RULES.dropSize * TILE;
    for (const d of this.drops.values()) {
      d.x += d.vx * dt;
      d.life -= dt;
      const col = Math.floor((d.x + size / 2) / TILE);
      const row = Math.floor((d.y + size / 2) / TILE);
      if (d.life <= 0 || cellAt(this.arena, col, row) === 1) {
        this.drops.delete(d.id);
        continue;
      }
      const box = { x: d.x, y: d.y, w: size, h: size };
      if (this.boss?.soakHit(box, d.power)) {
        this.drops.delete(d.id);
        continue;
      }
      // Tinta contra o cuspe do tinteiro (ou o graveto, ou a seiva): as duas se desmancham.
      const spit = [...this.spits.values()].find((s) => overlaps(box, spitBox(s)));
      if (spit) {
        this.spits.delete(spit.id);
        this.drops.delete(d.id);
        continue;
      }
      // Tinta no broto da pinha: arranca o broto.
      const sprout = [...this.sprouts.values()].find((s) => overlaps(box, sproutBox(s)));
      if (sprout) {
        this.sprouts.delete(sprout.id);
        this.drops.delete(d.id);
        continue;
      }
      for (const e of this.enemies.values()) {
        // A tinta não pega no borrão nem na bola rolando.
        if (e.mode === MODE_ROLL || e.kind === ENEMY_BORRAO || !overlaps(box, enemyBox(e))) continue;
        this.drops.delete(d.id);
        // A borracha apaga a gota que vem de frente; de costas, ou enquanto gira, encharca.
        if (e.kind === ENEMY_BORRACHA && e.mode === MODE_WALK && e.skill !== SKILL_WARN && Math.sign(d.vx) === -e.dir) break;
        // O ouriço: enrolando ou rolando, estoura a tinta de qualquer lado; andando, a de frente; tonto, encharca.
        if (e.kind === ENEMY_OURICO && e.mode === MODE_WALK) {
          if (e.skill === SKILL_WARN || e.skill === SKILL_ACT) break;
          if (e.skill === SKILL_NONE && Math.sign(d.vx) === -e.dir) break;
        }
        // A enciclopédia: fechada, a capa barra a tinta de frente; aberta (para atirar), encharca de qualquer lado.
        if (e.kind === ENEMY_ENCICLOPEDIA && e.mode === MODE_WALK && e.skill === SKILL_NONE && Math.sign(d.vx) === -e.dir) break;
        // A sombrinha: aberta (andando, abrindo ou depois), a frente barra a tinta; fechada no aviso, encharca de qualquer lado.
        if (e.kind === ENEMY_SOMBRINHA && e.mode === MODE_WALK && e.skill !== SKILL_WARN && Math.sign(d.vx) === -e.dir) break;
        // O martelo (cabeça à frente) e o torreão (portão): fechados, barram de frente; erguido ou aberto (aviso), encharcam.
        if ((e.kind === ENEMY_MARTELO || e.kind === ENEMY_TORREAO) && e.mode === MODE_WALK && e.skill !== SKILL_WARN && Math.sign(d.vx) === -e.dir) break;
        this.soak(e, d.power);
        break;
      }
    }
  }

  private soak(e: Enemy, amount: number): void {
    e.soak = Math.min(e.soak + amount, RULES.soakToBallBigTeam);
    e.soakTimer = RULES.soakDecay;
    if (e.mode === MODE_BALL) e.ballTime = RULES.ballTime;
    else if (e.mode === MODE_WALK && e.soak >= this.soakToBall) {
      // Virar bola interrompe a habilidade; a fiandeira cai do fio.
      e.mode = MODE_BALL;
      e.ballTime = RULES.ballTime;
      e.skill = SKILL_NONE;
      e.anchorY = -1;
    }
  }

  private stepEnemies(dt: number): void {
    for (const e of this.enemies.values()) {
      if (e.kind === ENEMY_BORRAO) {
        this.chase(e, dt);
      } else if (e.mode === MODE_WALK) {
        if (e.soak > 0 && (e.soakTimer -= dt) <= 0) {
          e.soak--;
          e.soakTimer = RULES.soakDecay;
        }
        // Voo da borboleta e salto do grilo: o corpo segue o caminho, sem a física de andar.
        if (e.skill === SKILL_ACT && e.kind === ENEMY_LAGARTA) {
          this.fly(e, dt);
          continue;
        }
        if (e.skill === SKILL_ACT && e.kind === ENEMY_GRILO) {
          this.leapStep(e, dt);
          continue;
        }
        // Ricochete da molinha, rastro da raposa e voo do avião.
        if (e.skill === SKILL_ACT && e.kind === ENEMY_MOLA) {
          this.ricochet(e, dt);
          continue;
        }
        if (e.skill === SKILL_ACT && e.kind === ENEMY_RAPOSA) {
          this.followTrail(e, dt);
          continue;
        }
        if (e.skill === SKILL_ACT && e.kind === ENEMY_AVIAO) {
          this.flyStraight(e, dt);
          continue;
        }
        if (e.anchorY >= 0) {
          this.hang(e, dt);
          continue;
        }
        const buttons = this.think(e, dt);
        // Bote e salto alto têm parâmetros próprios; o cuspe do tinteiro não muda o passo.
        const params = (e.skill === SKILL_ACT ? SKILL_PARAMS[e.kind] : undefined) ?? ENEMY_PARAMS[e.kind]!;
        stepPlayer(e.body, buttons, this.arena, params[e.soak]!);
        e.wasBlocked = e.body.vx === 0 && (buttons & (BTN_LEFT | BTN_RIGHT)) !== 0;
      } else if (e.mode === MODE_BALL) {
        stepPlayer(e.body, 0, this.arena, BALL_PARAMS);
        if ((e.ballTime -= dt) <= 0) {
          // Escapou: volta a andar, sem tinta.
          e.mode = MODE_WALK;
          e.soak = 0;
        }
      } else {
        stepPlayer(e.body, e.dir > 0 ? BTN_RIGHT : BTN_LEFT, this.arena, BALL_PARAMS);
        e.rollTime += dt;
        if (e.body.vx === 0) {
          e.dir = e.dir > 0 ? -1 : 1;
          e.bounces++;
        }
        const box = enemyBox(e);
        for (const other of this.enemies.values()) {
          if (other === e || other.mode === MODE_ROLL || other.kind === ENEMY_BORRAO) continue;
          if (overlaps(box, enemyBox(other))) {
            e.combo++;
            if (e.combo === 2) this.stats.combos++;
            this.defeat(other, e.kicker, e.combo);
          }
        }
        const damage = this.boss?.ballHit(box, e.combo) ?? 0;
        if (damage > 0) {
          this.hitBoss(e, damage);
          continue;
        }
        if (e.bounces >= RULES.rollMaxBounces || e.rollTime >= RULES.rollMaxTime) this.burst(e);
      }
    }
  }

  /** Fiandeira no fio: parada em cima, desce, parada embaixo, sobe. Encharcada, fica mais lenta. */
  private hang(e: Enemy, dt: number): void {
    const b = e.body;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    if (e.kind === ENEMY_CESTO && this.twigs(e, dt)) return;
    if (e.kind === ENEMY_MORCEGO && this.dive(e, dt)) return;
    if (e.kind === ENEMY_SINO && this.swing(e, dt)) return;
    if (e.kind === ENEMY_PRUMO && this.plumb(e, dt)) return;
    if (e.kind === ENEMY_MOBILE && this.mobileThrow(e, dt)) return;
    if (e.aiTimer > 0) {
      e.aiTimer -= dt;
      return;
    }
    const step = RULES.threadSpeed * TILE * Math.max(0.4, 1 - 0.15 * e.soak) * dt;
    if (e.vdir > 0) {
      b.y = Math.min(e.threadEnd, b.y + step);
      if (b.y >= e.threadEnd) {
        e.vdir = -1;
        e.aiTimer = RULES.threadPauseDown;
      }
    } else {
      b.y = Math.max(e.anchorY, b.y - step);
      if (b.y <= e.anchorY) {
        e.vdir = 1;
        e.aiTimer = RULES.threadPauseUp;
      }
    }
  }

  /**
   * Manchas envelhecem e somem; ondas da pancada correm e acabam; o cuspe corre até secar ou bater;
   * graveto e seiva caem com gravidade até bater num chão (a seiva só no andar marcado); brotos envelhecem.
   */
  private stepHazards(dt: number): void {
    for (const s of this.stains.values()) {
      if ((s.age += dt) >= this.warn.stain + RULES.stainLife) this.stains.delete(s.id);
    }
    for (const s of this.sprouts.values()) {
      if ((s.age += dt) >= this.warn.sprout + RULES.sproutLife) this.sprouts.delete(s.id);
    }
    for (const w of this.shocks) w.age += dt;
    this.shocks = this.shocks.filter((w) => w.age < RULES.slamWaveTime);
    const half = (RULES.spitSize * TILE) / 2;
    for (const s of this.spits.values()) {
      if (s.kind === SPIT_ORVALHO) {
        this.roll(s, dt);
        continue;
      }
      if (s.kind === SPIT_BOLHA) this.steerBubble(s);
      if (s.kind === SPIT_GRAVETO || s.kind === SPIT_SEIVA || s.kind === SPIT_GOTINHA || s.kind === SPIT_FLECHA) s.vy += RULES.hazardGravity * TILE * dt;
      if (s.kind === SPIT_NOTA) {
        s.phase = (s.phase ?? 0) + RULES.noteFreq * dt;
        s.vy = 0;
        s.y = (s.baseY ?? s.y) + Math.sin(s.phase) * RULES.noteWave * TILE;
      }
      // A página cai devagar e balança de um lado para o outro.
      if (s.kind === SPIT_PAGINA) s.vy = Math.min(RULES.pagesFall * TILE, s.vy + RULES.hazardGravity * TILE * dt);
      const sway = s.kind === SPIT_PAGINA ? Math.cos(s.life * 4) * RULES.pagesSway * TILE : 0;
      s.x += (s.vx + sway) * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      const cell = cellAt(this.arena, Math.floor((s.x + half) / TILE), Math.floor((s.y + half) / TILE));
      const falls = s.kind === SPIT_GRAVETO || s.kind === SPIT_SEIVA || s.kind === SPIT_PAGINA || s.kind === SPIT_GOTINHA || s.kind === SPIT_FLECHA;
      const lands = falls && s.vy > 0 && cell !== EMPTY && (s.landY === undefined || s.y + 2 * half >= s.landY - TILE / 2);
      if (s.life <= 0 || cell === SOLID || lands) this.spits.delete(s.id);
    }
  }

  /** Bolha do sapo: vira na direção do meio de quem está mais perto, sempre na mesma velocidade. */
  private steerBubble(s: Spit): void {
    const half = (RULES.spitSize * TILE) / 2;
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      const py = p.body.y + (this.params.playerHeight * TILE) / 2;
      const d = Math.hypot(px - (s.x + half), py - (s.y + half));
      if (d < bestDist) {
        bestDist = d;
        best = { x: px, y: py };
      }
    }
    if (!best || bestDist < 1) return;
    const speed = RULES.bubbleSpeed * TILE;
    s.vx = ((best.x - (s.x + half)) / bestDist) * speed;
    s.vy = ((best.y - (s.y + half)) / bestDist) * speed;
  }

  /**
   * Gota de orvalho: rola pelo chão na direção em que saiu; sem chão embaixo, cai até o próximo; estoura
   * numa parede ou quando seca.
   */
  private roll(s: Spit, dt: number): void {
    const size = RULES.spitSize * TILE;
    s.life -= dt;
    const nx = s.x + s.vx * dt;
    const front = s.vx > 0 ? nx + size : nx;
    if (s.life <= 0 || cellAt(this.arena, Math.floor(front / TILE), Math.floor((s.y + size / 2) / TILE)) === SOLID) {
      this.spits.delete(s.id);
      return;
    }
    s.x = nx;
    const col = Math.floor((s.x + size / 2) / TILE);
    const bottom = s.y + size;
    if (bottom % TILE === 0 && cellAt(this.arena, col, bottom / TILE) !== EMPTY) {
      s.vy = 0;
      return;
    }
    // Sem chão: cai; pousa no topo da primeira célula cheia que a borda de baixo cruzar.
    s.vy = Math.min(s.vy + RULES.hazardGravity * TILE * dt, 15 * TILE);
    const next = bottom + s.vy * dt;
    for (let row = Math.floor(bottom / TILE) + 1; row * TILE <= next; row++) {
      if (cellAt(this.arena, col, row) === EMPTY) continue;
      s.y = row * TILE - size;
      s.vy = 0;
      return;
    }
    s.y = next - size;
  }

  /**
   * Borrão: segue em linha reta o jogador de pé mais próximo, atravessando paredes.
   * De tempos em tempos se contrai (aviso) e solta uma mancha onde está, fora das paredes.
   */
  private chase(e: Enemy, dt: number): void {
    if ((e.skillCd -= dt) <= 0) {
      e.skillCd = RULES.stainEvery;
      this.dropStain(e);
    }
    e.skill = e.skillCd <= RULES.stainWarnLead ? SKILL_WARN : SKILL_NONE;
    const target = this.nearestPlayer(e.body);
    if (!target) return;
    const box = enemyBox(e);
    const dx = target.body.x + (this.params.playerWidth * TILE) / 2 - (box.x + box.w / 2);
    const dy = target.body.y + (this.params.playerHeight * TILE) / 2 - (box.y + box.h / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = Math.min(dist, RULES.borraoSpeed * TILE * dt);
    e.body.x += (dx / dist) * step;
    e.body.y += (dy / dist) * step;
    e.dir = dx >= 0 ? 1 : -1;
  }

  private dropStain(e: Enemy): void {
    const box = enemyBox(e);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    if (this.stains.size >= RULES.maxStains || cellAt(this.arena, Math.floor(cx / TILE), Math.floor(cy / TILE)) === SOLID) return;
    const half = (RULES.stainSize * TILE) / 2;
    const id = this.nextId++;
    this.stains.set(id, { id, x: cx - half, y: cy - half, age: 0 });
  }

  /**
   * IA simples: a traça (e a fiandeira solta do fio) patrulha e às vezes pula ou desce; o saltador pula na
   * direção do jogador mais próximo; o grampo corre reto; o tinteiro anda no próprio andar; a borracha segue
   * quem está mais perto. Habilidades, só quando ligadas na fase: a traça dá o bote em quem estiver à frente
   * no mesmo andar; o saltador, a cada tantos saltos, salta alto e cai com uma onda rente ao chão; o tinteiro
   * cospe. Todas param num aviso antes.
   */
  private think(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    e.skillCd = Math.max(0, e.skillCd - dt);
    const role = enemyRole(e.kind);
    if (e.kind === ENEMY_PINHA) return this.pinha(e);
    if (e.kind === ENEMY_PERGAMINHO) return this.pergaminho(e, dt);
    if (e.kind === ENEMY_BESOURO) return this.besouro(e, dt);
    if (e.kind === ENEMY_IMA) return this.ima(e, dt);
    if (e.kind === ENEMY_AVIAO) return this.aviao(e, dt);
    if (role === ENEMY_GRAMPO) return this.grampo(e);
    if (e.kind === ENEMY_CARACOL) return this.caracol(e, dt);
    if (e.kind === ENEMY_CORUJA) return this.coruja(e, dt);
    if (e.kind === ENEMY_CHAFARIZ) return this.chafariz(e, dt);
    if (e.kind === ENEMY_FURADEIRA) return this.furadeira(e, dt);
    if (e.kind === ENEMY_CORNETA) return this.corneta(e, dt);
    if (role === ENEMY_TINTEIRO) return this.tinteiro(e, dt);
    if (e.kind === ENEMY_OURICO) return this.ourico(e, dt);
    if (e.kind === ENEMY_ENCICLOPEDIA) return this.enciclopedia(e, dt);
    if (e.kind === ENEMY_SOMBRINHA) return this.sombrinha(e, dt);
    if (e.kind === ENEMY_MARTELO) return this.martelo(e, dt);
    if (e.kind === ENEMY_TORREAO) return this.torreao(e, dt);
    if (role === ENEMY_BORRACHA) return this.borracha(e, dt);
    if (role === ENEMY_TRACA || role === ENEMY_FIANDEIRA) {
      if (e.kind === ENEMY_LAGARTA && e.skill !== SKILL_NONE) return this.metamorfose(e, dt);
      if (e.kind === ENEMY_MARCADOR && e.skill !== SKILL_NONE) return this.warp(e, dt);
      if (e.kind === ENEMY_VAGALUME && e.skill !== SKILL_NONE) return this.flash(e, dt);
      if (e.kind === ENEMY_COMPASSO && e.skill !== SKILL_NONE) return this.compass(e, dt);
      if (e.kind === ENEMY_RAPOSA && e.skill !== SKILL_NONE) return this.fox(e, dt);
      // O compasso crava a ponta com alguém perto; a raposa fareja quem está ao alcance.
      if (e.skilled && e.kind === ENEMY_COMPASSO && b.onGround && e.skillCd === 0 && this.preyNear(e, RULES.compassSight)) {
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.compass;
        return 0;
      }
      if (e.skilled && e.kind === ENEMY_RAPOSA && b.onGround && e.skillCd === 0 && this.aimFox(e)) {
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.fox;
        return 0;
      }
      if (e.skill !== SKILL_NONE) return this.dash(e, dt);
      // O vaga-lume acende quando alguém chega perto, em qualquer direção.
      if (e.skilled && e.kind === ENEMY_VAGALUME && b.onGround && e.skillCd === 0 && this.preyNear(e, RULES.flashSight)) {
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.flash;
        return 0;
      }
      // O marca-página, com alguém longe (até em outro andar), some e aparece ao lado dele.
      if (e.skilled && e.kind === ENEMY_MARCADOR && b.onGround && e.skillCd === 0 && this.aimWarp(e)) {
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.warp;
        return 0;
      }
      // A lagarta vira casulo quando alguém chega perto, em qualquer direção.
      if (e.skilled && e.kind === ENEMY_LAGARTA && b.onGround && e.skillCd === 0 && this.preyNear(e, RULES.flySight)) {
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.cocoon;
        return 0;
      }
      if (e.skilled && e.kind === ENEMY_TRACA && b.onGround && e.skillCd === 0 && this.preyInLine(e, RULES.dashSight, true)) {
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.dash;
        return 0;
      }
      let buttons = 0;
      if (b.onGround) {
        if (e.wasBlocked) e.dir = e.dir > 0 ? -1 : 1;
        const edge = this.edgeAhead(e);
        if (edge && !e.edgeDecided && this.rng() < 0.5) e.dir = e.dir > 0 ? -1 : 1;
        e.edgeDecided = edge;
        if ((e.aiTimer -= dt) <= 0) {
          e.aiTimer = 2 + this.rng() * 2;
          buttons |= BTN_JUMP;
        }
      }
      return buttons | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
    }

    if (e.skill !== SKILL_NONE) return e.kind === ENEMY_GRILO ? this.leap(e, dt) : e.kind === ENEMY_DICIONARIO ? this.pagesJump(e, dt) : e.kind === ENEMY_SAPO ? this.blowBubble(e, dt) : e.kind === ENEMY_MOLA ? this.spring(e, dt) : e.kind === ENEMY_BALAO ? this.balloon(e, dt) : this.slam(e, dt);
    if (!b.onGround) return dirButton;
    if ((e.aiTimer -= dt) > 0) return 0;
    e.aiTimer = 0.9 + this.rng() * 0.6;
    const target = this.nearestPlayer(b);
    if (target) {
      e.dir = target.body.x > b.x ? 1 : -1;
      if (target.body.y - b.y > 2 * TILE && b.onOneWay) return BTN_DOWN | BTN_JUMP;
    }
    if (e.skilled && ++e.hops >= Math.max(2, Math.round(RULES.slamEvery * this.cdMult))) {
      e.hops = 0;
      // O grilo marca onde alguém está e salta até lá; perto demais (ou com o alvo no ar), pula normal.
      if (e.kind !== ENEMY_GRILO || this.aimLeap(e)) {
        e.skill = SKILL_WARN;
        e.skillTimer = e.kind === ENEMY_GRILO ? this.warn.leap : e.kind === ENEMY_DICIONARIO ? this.warn.pages : e.kind === ENEMY_SAPO ? this.warn.bubble : e.kind === ENEMY_MOLA ? this.warn.spring : e.kind === ENEMY_BALAO ? this.warn.balloon : this.warn.slam;
        return 0;
      }
    }
    return BTN_JUMP | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
  }

  /** Jogador de pé a até `cells` células (em qualquer direção) do inimigo. */
  private preyNear(e: Enemy, cells: number): boolean {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const cy = e.body.y + size / 2;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      const py = p.body.y + (this.params.playerHeight * TILE) / 2;
      if (Math.hypot(px - cx, py - cy) <= cells * TILE) return true;
    }
    return false;
  }

  /** Alguma célula sólida sob a caixa do inimigo se ele estivesse em (x, y). */
  private solidAt(x: number, y: number): boolean {
    const size = ENEMY_SIZE * TILE - 0.01;
    for (const [dx, dy] of [[0, 0], [size, 0], [0, size], [size, size]] as const) {
      if (cellAt(this.arena, Math.floor((x + dx) / TILE), Math.floor((y + dy) / TILE)) === SOLID) return true;
    }
    return false;
  }

  /** Lagarta: no casulo (aviso) parada; depois do voo, cai até pousar e espera para virar de novo. */
  private metamorfose(e: Enemy, dt: number): number {
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.flyTime;
      e.clock = 0;
      return 0;
    }
    if (e.body.onGround) {
      e.skill = SKILL_NONE;
      e.skillCd = RULES.flyCooldown * this.cdMult;
    }
    return 0;
  }

  /**
   * Borboleta: voa atrás de quem está mais perto, um pouco acima dele, balançando para cima e para baixo,
   * sem entrar nos blocos. No fim do tempo (fora de um bloco), para de voar e cai.
   */
  private fly(e: Enemy, dt: number): void {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.clock += dt;
    e.skillTimer -= dt;
    const target = this.nearestPlayer(b);
    if (target) {
      const tx = target.body.x + (this.params.playerWidth * TILE) / 2 - size / 2;
      const ty = target.body.y - TILE * 0.6 + Math.sin(e.clock * 2.6) * RULES.flyWave * TILE;
      const step = (d: number, max: number) => Math.max(-max, Math.min(max, d));
      const mx = step(tx - b.x, RULES.flySpeed * TILE * dt);
      const my = step(ty - b.y, RULES.flyClimb * TILE * dt);
      if (!this.solidAt(b.x + mx, b.y)) b.x += mx;
      if (!this.solidAt(b.x, b.y + my)) b.y += my;
      if (Math.abs(tx - b.x) > 2) e.dir = tx > b.x ? 1 : -1;
    }
    b.x = Math.min((this.arena.cols - 1) * TILE - size, Math.max(TILE, b.x));
    b.y = Math.min((this.arena.rows - 1) * TILE - size, Math.max(TILE / 2, b.y));
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    if (e.skillTimer <= 0 && !this.solidAt(b.x, b.y)) e.skill = SKILL_REST;
  }

  /**
   * Grilo: mira o meio de quem está mais perto, de pé e longe o bastante (contando a altura: quem
   * está no andar de cima, mesmo bem em cima dele, é alvo do salto).
   */
  private aimLeap(e: Enemy): boolean {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    const target = this.nearestPlayer(b);
    if (!target || !target.body.onGround) return false;
    const tx = target.body.x + (this.params.playerWidth * TILE) / 2;
    const dx = tx - (b.x + size / 2);
    const dy = target.body.y + this.params.playerHeight * TILE - (b.y + size);
    if (Math.hypot(dx, dy) < RULES.leapMin * TILE) return false;
    e.aimX = Math.min((this.arena.cols - 1) * TILE - size / 2, Math.max(TILE + size / 2, tx));
    e.aimY = target.body.y + this.params.playerHeight * TILE;
    if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
    return true;
  }

  /** Grilo: agachado (aviso) → salto (em `leapStep`) → parado um instante. */
  private leap(e: Enemy, dt: number): number {
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      e.skill = SKILL_ACT;
      e.clock = 0;
      e.fromX = e.body.x;
      e.fromY = e.body.y;
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) e.skill = SKILL_NONE;
    return 0;
  }

  /** O salto longo: arco do ponto de partida até a marca, passando por cima do que houver no caminho. */
  private leapStep(e: Enemy, dt: number): void {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.clock += dt;
    const t = Math.min(1, e.clock / RULES.leapTime);
    const toX = e.aimX - size / 2;
    const toY = e.aimY - size;
    const lift = RULES.leapHeight * TILE;
    b.x = e.fromX + (toX - e.fromX) * t;
    b.y = e.fromY + (toY - e.fromY) * t - 4 * lift * t * (1 - t);
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    if (t >= 1) {
      e.skill = SKILL_REST;
      e.skillTimer = RULES.leapRest;
    }
  }

  /** Pinha: corre como o grampo e, de tempos em tempos, larga um pinhão no chão. */
  private pinha(e: Enemy): number {
    if (e.skilled && e.body.onGround && e.skillCd === 0) this.plantSeed(e);
    return this.grampo(e);
  }

  /** Pinhão no chão sob a pinha (longe de outro broto): brota e depois machuca. */
  private plantSeed(e: Enemy): void {
    e.skillCd = RULES.sproutEvery * this.cdMult;
    if (this.sprouts.size >= RULES.maxSprouts) return;
    const size = ENEMY_SIZE * TILE;
    const w = RULES.sproutWidth * TILE;
    const h = RULES.sproutHeight * TILE;
    const cx = e.body.x + size / 2;
    const feet = e.body.y + size;
    for (const s of this.sprouts.values()) if (Math.abs(s.x + w / 2 - cx) < 1.5 * TILE && Math.abs(s.y + h - feet) < 2) return;
    const id = this.nextId++;
    this.sprouts.set(id, { id, x: cx - w / 2, y: feet - h, age: 0 });
  }

  /**
   * Bicho-cesto no fio: com alguém embaixo, treme parado (aviso) e solta um graveto que cai reto.
   * Devolve true enquanto ele fica parado no fio.
   */
  private twigs(e: Enemy, dt: number): boolean {
    e.skillCd = Math.max(0, e.skillCd - dt);
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return true;
      this.dropTwig(e);
      e.skill = SKILL_NONE;
      e.skillCd = RULES.twigCooldown * this.cdMult;
      return true;
    }
    if (!e.skilled || e.skillCd > 0 || !this.preyBelow(e)) return false;
    e.skill = SKILL_WARN;
    e.skillTimer = this.warn.twig;
    return true;
  }

  /** Alguém de pé logo embaixo do cesto, sem bloco no meio. */
  private preyBelow(e: Enemy): boolean {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const bottom = e.body.y + size;
    const col = Math.floor(cx / TILE);
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      if (Math.abs(px - cx) > 0.9 * TILE || p.body.y < bottom || p.body.y - bottom > RULES.twigSight * TILE) continue;
      let clear = true;
      for (let row = Math.floor(bottom / TILE); row < Math.floor(p.body.y / TILE); row++) if (cellAt(this.arena, col, row) === SOLID) clear = false;
      if (clear) return true;
    }
    return false;
  }

  private dropTwig(e: Enemy): void {
    const size = ENEMY_SIZE * TILE;
    const s = RULES.spitSize * TILE;
    const id = this.nextId++;
    this.spits.set(id, { id, kind: SPIT_GRAVETO, x: e.body.x + size / 2 - s / 2, y: e.body.y + size - s / 2, vx: 0, vy: 0, life: 3 });
  }

  /** Caracol: anda devagar; vendo alguém de pé por perto, marca o ponto (aviso) e joga a seiva em arco. */
  private caracol(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        this.launchLob(e);
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.spitAct;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.spitRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.lobCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    const prey = e.skilled && e.skillCd === 0 ? this.preyForLob(e) : null;
    if (prey) {
      const px = prey.body.x + (this.params.playerWidth * TILE) / 2;
      e.aimX = px;
      e.aimY = prey.body.y + this.params.playerHeight * TILE;
      e.dir = px > b.x ? 1 : -1;
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.lob;
      return 0;
    }
    if (e.wasBlocked || this.edgeAhead(e)) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Quem está de pé ao alcance da seiva: perto na horizontal, até algumas células acima ou abaixo. */
  private preyForLob(e: Enemy): WorldPlayer | null {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const feet = e.body.y + size;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const dx = Math.abs(p.body.x + (this.params.playerWidth * TILE) / 2 - cx);
      const dy = Math.abs(p.body.y + this.params.playerHeight * TILE - feet);
      if (dx < TILE || dx > RULES.lobSight * TILE || dy > RULES.lobRise * TILE) continue;
      if (dx + dy < bestDist) {
        bestDist = dx + dy;
        best = p;
      }
    }
    return best;
  }

  /** A seiva sai da boca e cai no ponto marcado em `lobTime` segundos. */
  private launchLob(e: Enemy): void {
    const s = RULES.spitSize * TILE;
    const box = enemyBox(e);
    const sx = e.dir > 0 ? box.x + box.w - s / 2 : box.x - s / 2;
    const sy = box.y - s * 0.2;
    const t = RULES.lobTime;
    const g = RULES.hazardGravity * TILE;
    const tx = e.aimX - s / 2;
    const ty = e.aimY - s;
    const id = this.nextId++;
    this.spits.set(id, { id, kind: SPIT_SEIVA, x: sx, y: sy, vx: (tx - sx) / t, vy: (ty - sy - 0.5 * g * t * t) / t, life: t + 0.4, landY: e.aimY });
  }

  /**
   * Ouriço: vira na hora para quem está mais perto e anda devagar; vendo alguém no mesmo andar, se
   * enrola (aviso), rola rápido até bater ou cansar e fica tonto um tempo. A tinta: veja `stepDrops`.
   */
  private ourico(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.rollDashTime;
      return dirButton;
    }
    if (e.skill === SKILL_ACT) {
      if (e.wasBlocked) e.skillTimer = 0;
      if ((e.skillTimer -= dt) > 0) return dirButton;
      e.skill = SKILL_REST;
      e.skillTimer = RULES.dizzyTime;
      return 0;
    }
    if (e.skill === SKILL_REST) {
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.rollCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    if (e.skillCd === 0) {
      const prey = this.preyInLine(e, RULES.rollSight, false);
      if (prey) {
        e.dir = prey.body.x > b.x ? 1 : -1;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.roll;
        return 0;
      }
    }
    const target = this.nearestPlayer(b);
    if (!target) return 0;
    const dx = target.body.x - b.x;
    if (Math.abs(dx) > TILE) e.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) <= TILE / 2) return 0;
    return dirButton;
  }

  /** Célula vazia, com chão (bloco ou plataforma) logo embaixo: um inimigo cabe de pé ali. */
  private standable(col: number, row: number): boolean {
    if (col < 1 || col >= this.arena.cols - 1 || row < 1 || row >= this.arena.rows - 1) return false;
    return cellAt(this.arena, col, row) === EMPTY && cellAt(this.arena, col, row + 1) !== EMPTY;
  }

  /**
   * Marca-página: escolhe quem está de pé por perto (mas não colado) e marca um ponto no andar dele, a
   * `warpGap` células, do lado de onde o marca-página está; sem lugar para ficar de pé ali, tenta o outro lado.
   */
  private aimWarp(e: Enemy): boolean {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const cy = e.body.y + size / 2;
    const pw = this.params.playerWidth * TILE;
    const ph = this.params.playerHeight * TILE;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const d = Math.hypot(p.body.x + pw / 2 - cx, p.body.y + ph / 2 - cy);
      if (d < RULES.warpMin * TILE || d > RULES.warpSight * TILE || d >= bestDist) continue;
      best = p;
      bestDist = d;
    }
    if (!best) return false;
    const px = best.body.x + pw / 2;
    const row = Math.round((best.body.y + ph) / TILE) - 1;
    const col = Math.floor(px / TILE);
    const near = cx < px ? -1 : 1;
    for (const gap of [RULES.warpGap, RULES.warpGap - 1, RULES.warpGap + 1]) {
      for (const side of [near, -near]) {
        if (!this.standable(col + side * gap, row)) continue;
        e.aimX = (col + side * gap) * TILE + TILE / 2;
        e.aimY = (row + 1) * TILE;
        e.dir = px > e.aimX ? 1 : -1;
        return true;
      }
    }
    return false;
  }

  /** Marca-página: sumindo (aviso) → aparece na marca, virado para o alvo → parado um instante. */
  private warp(e: Enemy, dt: number): number {
    if ((e.skillTimer -= dt) > 0) return 0;
    if (e.skill === SKILL_WARN) {
      const size = ENEMY_SIZE * TILE;
      e.body.x = e.aimX - size / 2;
      e.body.y = e.aimY - size;
      e.body.vx = 0;
      e.body.vy = 0;
      e.skill = SKILL_REST;
      e.skillTimer = RULES.warpRest;
      return 0;
    }
    e.skill = SKILL_NONE;
    e.skillCd = RULES.warpCooldown * this.cdMult;
    return 0;
  }

  /**
   * Dicionário: tremendo aberto (aviso) → salto alto; no alto do salto, solta as páginas → ao cair, parado.
   * `clock` marca se as páginas já saíram.
   */
  private pagesJump(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      const target = this.nearestPlayer(b);
      if (target) e.dir = target.body.x > b.x ? 1 : -1;
      e.skill = SKILL_ACT;
      e.skillTimer = 0;
      e.clock = 0;
      return BTN_JUMP | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
    }
    if (e.skill === SKILL_ACT) {
      e.skillTimer += dt;
      if (!b.onGround && b.vy >= 0 && e.clock === 0) this.dropPages(e);
      if (!b.onGround || e.skillTimer < 0.1) return dirButton;
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) e.skill = SKILL_NONE;
    return 0;
  }

  /** As páginas saem do meio do dicionário, uma para cada lado e uma reta (fora de um bloco ou plataforma). */
  private dropPages(e: Enemy): void {
    const size = ENEMY_SIZE * TILE;
    const s = RULES.spitSize * TILE;
    const x = e.body.x + size / 2 - s / 2;
    const y = e.body.y + size / 2 - s / 2;
    if (cellAt(this.arena, Math.floor((x + s / 2) / TILE), Math.floor((y + s / 2) / TILE)) !== EMPTY) return;
    e.clock = 1;
    const n: number = RULES.pagesCount;
    for (let i = 0; i < n; i++) {
      const id = this.nextId++;
      const vx = (n > 1 ? (2 * i) / (n - 1) - 1 : 0) * RULES.pagesSpread * TILE;
      this.spits.set(id, { id, kind: SPIT_PAGINA, x, y, vx, vy: 0, life: RULES.pagesLife });
    }
  }

  /**
   * Pergaminho: corre como o grampo; com alguém à frente no mesmo andar, para (aviso) e desenrola um
   * tapete rente ao chão até `unrollReach` células (ou até o fim do chão), que machuca enquanto aberto.
   * `aimX` é a ponta do tapete; `fromX`, até onde ele vai.
   */
  private pergaminho(e: Enemy, dt: number): number {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    const front = e.dir > 0 ? b.x + size : b.x;
    if (e.skill === SKILL_WARN) {
      e.aimX = front;
      if ((e.skillTimer -= dt) > 0) return 0;
      const [left, right] = floorSpan(this.arena, front, b.y + size, RULES.unrollReach);
      e.fromX = e.dir > 0 ? Math.min(right, front + RULES.unrollReach * TILE) : Math.max(left, front - RULES.unrollReach * TILE);
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.unrollTime;
      e.clock = 0;
      return 0;
    }
    if (e.skill === SKILL_ACT) {
      e.clock += dt;
      e.aimX = front + (e.fromX - front) * Math.min(1, e.clock / RULES.unrollGrow);
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.unrollRest;
      }
      return 0;
    }
    if (e.skill === SKILL_REST) {
      e.aimX = front + (e.fromX - front) * Math.max(0, e.skillTimer / RULES.unrollRest);
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.unrollCooldown * this.cdMult;
      }
      return 0;
    }
    if (e.skilled && b.onGround && e.skillCd === 0 && this.preyInLine(e, RULES.unrollSight, true)) {
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.unroll;
      e.aimX = front;
      return 0;
    }
    return this.grampo(e);
  }

  /**
   * Morcego no fio: com alguém de pé embaixo (perto na horizontal, sem bloco no meio), abre as asas
   * (aviso, com a marca onde vai mergulhar), mergulha até lá e volta para o fio. Devolve true enquanto
   * o fio fica parado.
   */
  private dive(e: Enemy, dt: number): boolean {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.skillCd = Math.max(0, e.skillCd - dt);
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return true;
      e.skill = SKILL_ACT;
      e.clock = 0;
      e.fromX = b.x;
      e.fromY = b.y;
      return true;
    }
    if (e.skill === SKILL_ACT) {
      e.clock += dt;
      const t = Math.min(1, e.clock / RULES.diveTime);
      const k = Math.sin(Math.PI * t);
      b.x = e.fromX + (e.aimX - size / 2 - e.fromX) * k;
      b.y = e.fromY + (e.aimY - size - e.fromY) * k;
      if (Math.abs(e.aimX - size / 2 - e.fromX) > 1) e.dir = e.aimX - size / 2 > e.fromX ? 1 : -1;
      if (t >= 1) {
        b.x = e.fromX;
        b.y = e.fromY;
        e.skill = SKILL_REST;
        e.skillTimer = RULES.diveRest;
      }
      return true;
    }
    if (e.skill === SKILL_REST) {
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.diveCooldown * this.cdMult;
      }
      return true;
    }
    if (!e.skilled || e.skillCd > 0) return false;
    const prey = this.preyForDive(e);
    if (!prey) return false;
    e.aimX = prey.body.x + (this.params.playerWidth * TILE) / 2;
    e.aimY = prey.body.y + this.params.playerHeight * TILE;
    e.dir = e.aimX > b.x + size / 2 ? 1 : -1;
    e.skill = SKILL_WARN;
    e.skillTimer = this.warn.dive;
    return true;
  }

  /** O segmento entre os dois pontos não passa por nenhum bloco. */
  private clearLine(x0: number, y0: number, x1: number, y1: number): boolean {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (TILE / 4)));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (cellAt(this.arena, Math.floor(x / TILE), Math.floor(y / TILE)) === SOLID) return false;
    }
    return true;
  }

  /** Quem está de pé embaixo do morcego, ao alcance do mergulho e sem bloco no caminho. */
  private preyForDive(e: Enemy): WorldPlayer | null {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const cy = e.body.y + size / 2;
    const bottom = e.body.y + size;
    const pw = this.params.playerWidth * TILE;
    const ph = this.params.playerHeight * TILE;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const px = p.body.x + pw / 2;
      const dx = Math.abs(px - cx);
      const dy = p.body.y + ph - bottom;
      if (dx > RULES.diveReach * TILE || dy < TILE / 2 || dy > RULES.diveSight * TILE || dx + dy >= bestDist) continue;
      if (!this.clearLine(cx, cy, px, p.body.y + ph / 2)) continue;
      best = p;
      bestDist = dx + dy;
    }
    return best;
  }

  /**
   * Coruja: anda devagar sem sair do andar; vendo alguém por perto (em qualquer direção, sem bloco no
   * meio), para, marca a linha até ele (aviso) e solta o facho por ela, que segue até bater num bloco.
   */
  private coruja(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.beamTime;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.beamRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.beamCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    const prey = e.skilled && e.skillCd === 0 ? this.preyForBeam(e) : null;
    if (prey) {
      e.aimX = prey.body.x + (this.params.playerWidth * TILE) / 2;
      e.aimY = prey.body.y + (this.params.playerHeight * TILE) / 2;
      e.dir = e.aimX > b.x + (ENEMY_SIZE * TILE) / 2 ? 1 : -1;
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.beam;
      return 0;
    }
    if (e.wasBlocked || this.edgeAhead(e)) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Quem está ao alcance do olhar da coruja, sem bloco no meio (o mais perto). */
  private preyForBeam(e: Enemy): WorldPlayer | null {
    const size = ENEMY_SIZE * TILE;
    const ex = e.body.x + size / 2;
    const ey = e.body.y + size * 0.35;
    const pw = this.params.playerWidth * TILE;
    const ph = this.params.playerHeight * TILE;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const px = p.body.x + pw / 2;
      const py = p.body.y + ph / 2;
      const d = Math.hypot(px - ex, py - ey);
      if (d < 1.5 * TILE || d > RULES.beamSight * TILE || d >= bestDist || !this.clearLine(ex, ey, px, py)) continue;
      best = p;
      bestDist = d;
    }
    return best;
  }

  /**
   * Enciclopédia: vira na hora para quem está mais perto e anda devagar; vendo alguém no mesmo andar,
   * abre a capa (aviso), atira as letras em leque e fica aberta um tempo antes de fechar. A tinta: veja `stepDrops`.
   */
  private enciclopedia(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        this.fireLetters(e);
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.spitAct;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.lettersRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.lettersCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    // As letras valem sempre (como a bola do ouriço): a capa aberta é a chance de encharcá-la de frente.
    if (e.skillCd === 0) {
      const prey = this.preyInLine(e, RULES.lettersSight, false);
      if (prey) {
        e.dir = prey.body.x > b.x ? 1 : -1;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.letters;
        return 0;
      }
    }
    const target = this.nearestPlayer(b);
    if (!target) return 0;
    const dx = target.body.x - b.x;
    if (Math.abs(dx) > TILE) e.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) <= TILE / 2) return 0;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Três letras saem da página aberta: uma reta e duas subindo em leque. */
  private fireLetters(e: Enemy): void {
    const s = RULES.spitSize * TILE;
    const box = enemyBox(e);
    const x = e.dir > 0 ? box.x + box.w : box.x - s;
    const y = box.y + box.h * 0.45 - s / 2;
    const speed = RULES.lettersSpeed * TILE;
    for (const angle of [0, 0.35, 0.7]) {
      const id = this.nextId++;
      this.spits.set(id, { id, kind: SPIT_LETRA, x, y, vx: e.dir * speed * Math.cos(angle), vy: -speed * Math.sin(angle), life: RULES.lettersRange / RULES.lettersSpeed });
    }
  }

  /** Vaga-lume: acendendo (aviso, parado) → clarão em círculo → apagado um instante → espera. */
  private flash(e: Enemy, dt: number): number {
    if ((e.skillTimer -= dt) > 0) return 0;
    if (e.skill === SKILL_WARN) {
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.flashTime;
    } else if (e.skill === SKILL_ACT) {
      e.skill = SKILL_REST;
      e.skillTimer = RULES.flashRest;
    } else {
      e.skill = SKILL_NONE;
      e.skillCd = RULES.flashCooldown * this.cdMult;
    }
    return 0;
  }

  /** Sapo: bochechas inchando (aviso, parado) → sopra a bolha na direção de quem está mais perto → parado. */
  private blowBubble(e: Enemy, dt: number): number {
    if ((e.skillTimer -= dt) > 0) return 0;
    if (e.skill === SKILL_WARN) {
      const target = this.nearestPlayer(e.body);
      if (target) e.dir = target.body.x > e.body.x ? 1 : -1;
      const s = RULES.spitSize * TILE;
      const box = enemyBox(e);
      const id = this.nextId++;
      this.spits.set(id, {
        id,
        kind: SPIT_BOLHA,
        x: e.dir > 0 ? box.x + box.w : box.x - s,
        y: box.y + box.h * 0.4 - s / 2,
        vx: e.dir * RULES.bubbleSpeed * TILE,
        vy: 0,
        life: RULES.bubbleLife,
      });
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      return 0;
    }
    e.skill = SKILL_NONE;
    return 0;
  }

  /**
   * Besouro: corre como o grampo; com alguém à frente no mesmo andar, para (aviso) e chuta uma gota de
   * orvalho que rola pelo chão para a frente e cai pelos vãos.
   */
  private besouro(e: Enemy, dt: number): number {
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        this.kickDew(e);
        e.skill = SKILL_REST;
        e.skillTimer = RULES.dewRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.dewCooldown * this.cdMult;
      }
      return 0;
    }
    if (e.skilled && e.body.onGround && e.skillCd === 0 && this.preyInLine(e, RULES.dewSight, true)) {
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.dew;
      return 0;
    }
    return this.grampo(e);
  }

  /** A gota sai da frente do besouro, apoiada no chão dele. */
  private kickDew(e: Enemy): void {
    const s = RULES.spitSize * TILE;
    const box = enemyBox(e);
    const feet = Math.round((box.y + box.h) / TILE) * TILE;
    const id = this.nextId++;
    this.spits.set(id, {
      id,
      kind: SPIT_ORVALHO,
      x: e.dir > 0 ? box.x + box.w : box.x - s,
      y: feet - s,
      vx: e.dir * RULES.dewSpeed * TILE,
      vy: 0,
      life: RULES.dewLife,
    });
  }

  /**
   * Sino no fio: com alguém de pé embaixo (perto na horizontal), treme (aviso) e balança como um pêndulo
   * largo, preso no ponto do fio (`aimX`, `anchorY`), e para de novo embaixo dele. Devolve true enquanto
   * o fio fica parado. `fromY` guarda o comprimento do fio até o meio do corpo. No aviso ele desce até o
   * fim do fio, para balançar com o fio inteiro.
   */
  private swing(e: Enemy, dt: number): boolean {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.skillCd = Math.max(0, e.skillCd - dt);
    if (e.skill === SKILL_WARN) {
      b.y = Math.min(e.threadEnd, b.y + RULES.swingDrop * TILE * dt);
      if ((e.skillTimer -= dt) > 0) return true;
      e.skill = SKILL_ACT;
      e.clock = 0;
      e.aimX = b.x + size / 2;
      e.fromY = b.y + size / 2 - e.anchorY;
      return true;
    }
    if (e.skill === SKILL_ACT) {
      e.clock += dt;
      const total = RULES.swingPeriod * RULES.swingCount;
      const t = Math.min(e.clock, total);
      const angle = RULES.swingAngle * Math.sin((2 * Math.PI * t) / RULES.swingPeriod);
      const cx = e.aimX + Math.sin(angle) * e.fromY;
      const cy = e.anchorY + Math.cos(angle) * e.fromY;
      b.x = Math.min((this.arena.cols - 1) * TILE - size, Math.max(TILE, cx - size / 2));
      b.y = cy - size / 2;
      const v = Math.cos((2 * Math.PI * t) / RULES.swingPeriod);
      if (Math.abs(v) > 0.05) e.dir = v > 0 ? 1 : -1;
      if (e.clock >= total) {
        b.x = e.aimX - size / 2;
        b.y = e.anchorY + e.fromY - size / 2;
        e.skill = SKILL_REST;
        e.skillTimer = RULES.swingRest;
      }
      return true;
    }
    if (e.skill === SKILL_REST) {
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.swingCooldown * this.cdMult;
      }
      return true;
    }
    if (!e.skilled || e.skillCd > 0 || !this.preyUnderSwing(e)) return false;
    e.skill = SKILL_WARN;
    e.skillTimer = this.warn.swing;
    return true;
  }

  /** Alguém de pé embaixo do sino, a até `swingReach` células para o lado e ao alcance do balanço. */
  private preyUnderSwing(e: Enemy): boolean {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const bottom = e.body.y + size;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      const dy = p.body.y + this.params.playerHeight * TILE - bottom;
      if (Math.abs(px - cx) <= RULES.swingReach * TILE && dy >= -TILE && dy <= 2 * TILE) return true;
    }
    return false;
  }

  /**
   * Chafariz: anda devagar sem sair do andar; vendo alguém de pé por perto (mesmo em outro andar), marca o
   * chão onde ele está (aviso: borbulha) e o jato sobe dali (`geyserBox`).
   */
  private chafariz(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.geyserTime;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.geyserRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.geyserCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    const prey = e.skilled && e.skillCd === 0 ? this.preyForGeyser(e) : null;
    if (prey) {
      e.aimX = prey.body.x + (this.params.playerWidth * TILE) / 2;
      e.aimY = Math.round((prey.body.y + this.params.playerHeight * TILE) / TILE) * TILE;
      e.dir = e.aimX > b.x ? 1 : -1;
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.geyser;
      return 0;
    }
    if (e.wasBlocked || this.edgeAhead(e)) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Quem está de pé ao alcance do chafariz (o mais perto), em qualquer andar perto do dele. */
  private preyForGeyser(e: Enemy): WorldPlayer | null {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const feet = e.body.y + size;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const dx = Math.abs(p.body.x + (this.params.playerWidth * TILE) / 2 - cx);
      const dy = Math.abs(p.body.y + this.params.playerHeight * TILE - feet);
      if (dx > RULES.geyserSight * TILE || dy > RULES.geyserRise * TILE || dx + dy >= bestDist) continue;
      best = p;
      bestDist = dx + dy;
    }
    return best;
  }

  /**
   * Sombrinha: vira na hora para quem está mais perto e anda devagar; vendo alguém no mesmo andar, fecha
   * (aviso: fechada, a tinta pega de frente) e abre de uma vez, espirrando gotinhas em leque para cima.
   * Vale sempre, sem depender da fase. A tinta: veja `stepDrops`.
   */
  private sombrinha(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        this.splashDrops(e);
        e.skill = SKILL_REST;
        e.skillTimer = RULES.parasolRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.parasolCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    if (e.skillCd === 0) {
      const prey = this.preyInLine(e, RULES.parasolSight, false);
      if (prey) {
        e.dir = prey.body.x > b.x ? 1 : -1;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.parasol;
        return 0;
      }
    }
    const target = this.nearestPlayer(b);
    if (!target) return 0;
    const dx = target.body.x - b.x;
    if (Math.abs(dx) > TILE) e.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) <= TILE / 2) return 0;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** As gotinhas saem do alto da sombrinha em leque, de um lado a outro, todas subindo. */
  private splashDrops(e: Enemy): void {
    const s = RULES.spitSize * TILE;
    const box = enemyBox(e);
    const x = box.x + box.w / 2 - s / 2;
    const y = box.y - s / 2;
    const n: number = RULES.parasolDrops;
    const speed = RULES.parasolSpeed * TILE;
    for (let i = 0; i < n; i++) {
      // De -150° a -30°: para cima, abrindo para os dois lados.
      const angle = -Math.PI * (5 / 6) + (n > 1 ? (i / (n - 1)) * (Math.PI * (2 / 3)) : Math.PI / 3);
      const id = this.nextId++;
      this.spits.set(id, { id, kind: SPIT_GOTINHA, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 3 });
    }
  }


  /** Rastro de cada jogador (meio da base do corpo), do mais antigo ao mais novo, para a raposa. */
  private readonly trails = new Map<number, Array<{ x: number; y: number }>>();

  private recordTrails(): void {
    const keep = Math.ceil(RULES.foxDelay / TICK_DT) + 1;
    for (const p of this.players.values()) {
      let t = this.trails.get(p.slot);
      if (!t) this.trails.set(p.slot, (t = []));
      t.push({ x: p.body.x + (this.params.playerWidth * TILE) / 2, y: p.body.y + this.params.playerHeight * TILE });
      if (t.length > keep) t.shift();
    }
  }

  // --- Oficina Mágica ---

  /**
   * Compasso: crava a ponta (aviso, parado) e gira a perna uma volta inteira em volta de si. A ponta da
   * perna fica em `aimX`/`aimY` (o braço vai do meio dele até ali).
   */
  private compass(e: Enemy, dt: number): number {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const cy = e.body.y + size / 2;
    const reach = RULES.compassReach * TILE;
    if (e.skill === SKILL_WARN) {
      e.aimX = cx + e.dir * reach;
      e.aimY = cy;
      if ((e.skillTimer -= dt) > 0) return 0;
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.compassTime;
      e.clock = 0;
      return 0;
    }
    if (e.skill === SKILL_ACT) {
      e.clock += dt;
      const angle = (e.dir > 0 ? 0 : Math.PI) - e.dir * 2 * Math.PI * Math.min(1, e.clock / RULES.compassTime);
      e.aimX = cx + Math.cos(angle) * reach;
      e.aimY = cy + Math.sin(angle) * reach;
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.compassRest;
      }
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) {
      e.skill = SKILL_NONE;
      e.skillCd = RULES.compassCooldown * this.cdMult;
    }
    return 0;
  }

  /** Molinha: encolhida (aviso, parada) → dispara reta na direção de quem está mais perto → cai e descansa. */
  private spring(e: Enemy, dt: number): number {
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      const size = ENEMY_SIZE * TILE;
      const target = this.nearestPlayer(e.body);
      let dx = e.dir;
      let dy = -1;
      if (target) {
        dx = target.body.x + (this.params.playerWidth * TILE) / 2 - (e.body.x + size / 2);
        dy = target.body.y + (this.params.playerHeight * TILE) / 2 - (e.body.y + size / 2);
      }
      const len = Math.hypot(dx, dy) || 1;
      e.fromX = (dx / len) * RULES.springSpeed * TILE;
      e.fromY = (dy / len) * RULES.springSpeed * TILE;
      if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.springTime;
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) e.skill = SKILL_NONE;
    return 0;
  }

  /** O ricochete: anda reto (`fromX`, `fromY` é a velocidade) e rebate nos blocos e nas paredes; atravessa plataformas. */
  private ricochet(e: Enemy, dt: number): void {
    const b = e.body;
    e.skillTimer -= dt;
    if (this.solidAt(b.x + e.fromX * dt, b.y)) e.fromX = -e.fromX;
    else b.x += e.fromX * dt;
    if (this.solidAt(b.x, b.y + e.fromY * dt)) e.fromY = -e.fromY;
    else b.y += e.fromY * dt;
    if (Math.abs(e.fromX) > 1) e.dir = e.fromX > 0 ? 1 : -1;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    if (e.skillTimer <= 0) {
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
    }
  }

  /**
   * Ímã: corre como o grampo; com alguém no mesmo andar, para e marca dois pontos no chão, um de cada
   * lado (`aimX` à esquerda, `aimY` à direita, os dois em x), e de lá dois parafusos deslizam até ele.
   */
  private ima(e: Enemy, dt: number): number {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        const cx = b.x + size / 2;
        const feet = Math.round((b.y + size) / TILE) * TILE;
        const s = RULES.spitSize * TILE;
        const speed = RULES.magnetSpeed * TILE;
        let longest = 0;
        for (const from of [e.aimX, e.aimY]) {
          const dist = Math.abs(cx - from);
          if (dist < TILE) continue;
          longest = Math.max(longest, dist);
          const id = this.nextId++;
          this.spits.set(id, { id, kind: SPIT_PARAFUSO, x: from - s / 2, y: feet - s, vx: Math.sign(cx - from) * speed, vy: 0, life: (dist - size / 2) / speed });
        }
        e.skill = SKILL_REST;
        e.skillTimer = longest / speed;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.magnetCooldown * this.cdMult;
      }
      return 0;
    }
    if (e.skilled && b.onGround && e.skillCd === 0 && this.preyInLine(e, RULES.magnetSight, false)) {
      const cx = b.x + size / 2;
      const [left, right] = floorSpan(this.arena, cx, b.y + size, RULES.magnetReach);
      e.aimX = Math.max(left + TILE / 2, cx - RULES.magnetReach * TILE);
      e.aimY = Math.min(right - TILE / 2, cx + RULES.magnetReach * TILE);
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.magnet;
      return 0;
    }
    return this.grampo(e);
  }

  /**
   * Prumo no fio: com alguém de pé logo embaixo, treme (aviso, com a marca no chão: `aimY`), despenca até
   * o chão de baixo, solta uma onda dos dois lados, espera e sobe de volta ao fio. Devolve true enquanto
   * o fio fica parado. `clock`: 0 caindo, 1 subindo.
   */
  private plumb(e: Enemy, dt: number): boolean {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.skillCd = Math.max(0, e.skillCd - dt);
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return true;
      e.skill = SKILL_ACT;
      e.clock = 0;
      e.fromY = b.y;
      return true;
    }
    if (e.skill === SKILL_ACT && e.clock === 0) {
      b.y = Math.min(e.aimY - size, b.y + RULES.plumbSpeed * TILE * dt);
      if (b.y >= e.aimY - size) {
        const x = b.x + size / 2;
        const [left, right] = floorSpan(this.arena, x, e.aimY, RULES.plumbRadius);
        this.shocks.push({ x, y: e.aimY, left, right, age: 0 });
        e.skill = SKILL_REST;
        e.skillTimer = RULES.plumbRest;
      }
      return true;
    }
    if (e.skill === SKILL_REST) {
      if ((e.skillTimer -= dt) > 0) return true;
      e.skill = SKILL_ACT;
      e.clock = 1;
      return true;
    }
    if (e.skill === SKILL_ACT) {
      b.y = Math.max(e.fromY, b.y - RULES.plumbRise * TILE * dt);
      if (b.y <= e.fromY) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.plumbCooldown * this.cdMult;
      }
      return true;
    }
    if (!e.skilled || e.skillCd > 0) return false;
    const floor = this.plumbFloor(e);
    if (floor === null) return false;
    e.aimX = b.x + size / 2;
    e.aimY = floor;
    e.skill = SKILL_WARN;
    e.skillTimer = this.warn.plumb;
    return true;
  }

  /** Chão embaixo do prumo (altura dos pés) se alguém está de pé ali, perto da coluna dele; senão null. */
  private plumbFloor(e: Enemy): number | null {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const col = Math.floor(cx / TILE);
    let row = Math.floor((e.body.y + size) / TILE);
    while (row < this.arena.rows - 1 && cellAt(this.arena, col, row) === EMPTY) row++;
    if (cellAt(this.arena, col, row) === EMPTY) return null;
    const floor = row * TILE;
    if (floor - (e.body.y + size) > RULES.plumbSight * TILE) return null;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      if (Math.abs(px - cx) <= RULES.plumbAlign * TILE && Math.abs(p.body.y + this.params.playerHeight * TILE - floor) < TILE / 2) return floor;
    }
    return null;
  }

  /**
   * Furadeira: anda devagar sem sair do andar; com alguém de pé acima dela, vai para baixo dele e, alinhada,
   * para (aviso) e dispara a broca para cima, atravessando as plataformas.
   */
  private furadeira(e: Enemy, dt: number): number {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        const s = RULES.spitSize * TILE;
        const id = this.nextId++;
        this.spits.set(id, { id, kind: SPIT_BROCA, x: b.x + size / 2 - s / 2, y: b.y - s, vx: 0, vy: -RULES.drillSpeed * TILE, life: RULES.drillRange / RULES.drillSpeed });
        e.skill = SKILL_REST;
        e.skillTimer = RULES.drillRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.drillCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    const above = e.skilled && e.skillCd === 0 ? this.preyAbove(e) : null;
    if (above) {
      const dx = above.body.x + (this.params.playerWidth * TILE) / 2 - (b.x + size / 2);
      if (Math.abs(dx) <= RULES.drillAlign * TILE) {
        e.aimX = b.x + size / 2;
        e.aimY = above.body.y + this.params.playerHeight * TILE;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.drill;
        return 0;
      }
      e.dir = dx > 0 ? 1 : -1;
      if (!this.edgeAhead(e) && !e.wasBlocked) return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
      return 0;
    }
    if (e.wasBlocked || this.edgeAhead(e)) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Quem está de pé acima da furadeira, perto o bastante para o lado (o mais perto). */
  private preyAbove(e: Enemy): WorldPlayer | null {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const feet = e.body.y + size;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away || !p.body.onGround) continue;
      const dy = feet - (p.body.y + this.params.playerHeight * TILE);
      const dx = Math.abs(p.body.x + (this.params.playerWidth * TILE) / 2 - cx);
      if (dy < TILE / 2 || dy > RULES.drillSight * TILE || dx > RULES.drillChase * TILE || dx + dy >= bestDist) continue;
      best = p;
      bestDist = dx + dy;
    }
    return best;
  }

  /**
   * Martelo: vira na hora para quem está mais perto e anda devagar; com alguém no mesmo andar, se ergue
   * (aviso: aberto à tinta de frente) e bate: o chão dele treme e derruba quem está de pé ali (`aimX` a
   * `aimY`); quem está no ar escapa. Vale sempre, sem depender da fase.
   */
  private martelo(e: Enemy, dt: number): number {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.hammerTime;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.hammerRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.hammerCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    if (e.skillCd === 0) {
      const prey = this.preyInLine(e, RULES.hammerSight, false);
      if (prey) {
        e.dir = prey.body.x > b.x ? 1 : -1;
        const [left, right] = floorSpan(this.arena, b.x + size / 2, b.y + size, RULES.hammerReach);
        e.aimX = left;
        e.aimY = right;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.hammer;
        return 0;
      }
    }
    const target = this.nearestPlayer(b);
    if (!target) return 0;
    const dx = target.body.x - b.x;
    if (Math.abs(dx) > TILE) e.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) <= TILE / 2) return 0;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  // --- Castelo das Nuvens ---

  /** Raposa: escolhe quem está por perto (de pé) e guarda a vaga dele em `hops`; `aimX`/`aimY` marcam onde ele está. */
  private aimFox(e: Enemy): boolean {
    const size = ENEMY_SIZE * TILE;
    const cx = e.body.x + size / 2;
    const cy = e.body.y + size / 2;
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      const py = p.body.y + (this.params.playerHeight * TILE) / 2;
      const d = Math.hypot(px - cx, py - cy);
      if (d > RULES.foxSight * TILE || d >= bestDist) continue;
      best = p;
      bestDist = d;
    }
    if (!best) return false;
    e.hops = best.slot;
    e.aimX = best.body.x + (this.params.playerWidth * TILE) / 2;
    e.aimY = best.body.y + this.params.playerHeight * TILE;
    return true;
  }

  /** Raposa: farejando (aviso, parada) → segue o rastro (em `followTrail`) → cai e descansa → espera. */
  private fox(e: Enemy, dt: number): number {
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.foxTime;
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) {
      e.skill = SKILL_NONE;
      e.skillCd = RULES.foxCooldown * this.cdMult;
    }
    return 0;
  }

  /** Vai na direção de onde o alvo estava `foxDelay` segundos atrás, sem passar de `foxSpeed`, atravessando tudo. */
  private followTrail(e: Enemy, dt: number): void {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.skillTimer -= dt;
    const target = [...this.players.values()].find((p) => p.slot === e.hops);
    const trail = this.trails.get(e.hops);
    const spot = trail?.[0];
    if (!target || target.down || target.away || !spot || e.skillTimer <= 0) {
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      return;
    }
    const tx = spot.x - size / 2;
    const ty = spot.y - size;
    const dx = tx - b.x;
    const dy = ty - b.y;
    const d = Math.hypot(dx, dy);
    const max = RULES.foxSpeed * TILE * dt;
    const k = d > max ? max / d : 1;
    b.x = Math.min((this.arena.cols - 1) * TILE - size, Math.max(TILE, b.x + dx * k));
    b.y = Math.min((this.arena.rows - 1) * TILE - size, Math.max(0, b.y + dy * k));
    if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
  }

  /** Balãozinho: incha (aviso, parado) → estoura em lascas para todos os lados → parado um instante. */
  private balloon(e: Enemy, dt: number): number {
    if ((e.skillTimer -= dt) > 0) return 0;
    if (e.skill === SKILL_WARN) {
      const s = RULES.spitSize * TILE;
      const size = ENEMY_SIZE * TILE;
      const x = e.body.x + size / 2 - s / 2;
      const y = e.body.y + size / 2 - s / 2;
      const n: number = RULES.shardCount;
      const speed = RULES.shardSpeed * TILE;
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const id = this.nextId++;
        this.spits.set(id, { id, kind: SPIT_ESTILHACO, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: RULES.shardRange / RULES.shardSpeed });
      }
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      return 0;
    }
    e.skill = SKILL_NONE;
    return 0;
  }

  /**
   * Avião: corre como o grampo; vendo alguém por perto sem bloco no meio, para de nariz para cima (aviso,
   * com o ponto marcado em `aimX`/`aimY`) e voa reto naquela direção até bater num bloco ou cansar.
   */
  private aviao(e: Enemy, dt: number): number {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      const dx = e.aimX - (b.x + size / 2);
      const dy = e.aimY - (b.y + size / 2);
      const len = Math.hypot(dx, dy) || 1;
      e.fromX = (dx / len) * RULES.planeSpeed * TILE;
      e.fromY = (dy / len) * RULES.planeSpeed * TILE;
      e.skill = SKILL_ACT;
      e.skillTimer = RULES.planeTime;
      return 0;
    }
    if (e.skill === SKILL_REST) {
      if (b.onGround && (e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.planeCooldown * this.cdMult;
      }
      return 0;
    }
    if (e.skilled && b.onGround && e.skillCd === 0) {
      const prey = this.preyForBeam(e);
      if (prey && Math.hypot(prey.body.x - b.x, prey.body.y - b.y) <= RULES.planeSight * TILE) {
        e.aimX = prey.body.x + (this.params.playerWidth * TILE) / 2;
        e.aimY = prey.body.y + (this.params.playerHeight * TILE) / 2;
        e.dir = e.aimX > b.x + size / 2 ? 1 : -1;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.plane;
        return 0;
      }
    }
    return this.grampo(e);
  }

  /** O voo do avião: reto, atravessando as plataformas; para ao bater num bloco, na borda ou no fim do tempo. */
  private flyStraight(e: Enemy, dt: number): void {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.skillTimer -= dt;
    const nx = b.x + e.fromX * dt;
    const ny = b.y + e.fromY * dt;
    const out = nx < TILE || nx > (this.arena.cols - 1) * TILE - size || ny < 0 || ny > (this.arena.rows - 1) * TILE - size;
    if (e.skillTimer <= 0 || out || this.solidAt(nx, ny)) {
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      b.vx = 0;
      b.vy = 0;
      return;
    }
    b.x = nx;
    b.y = ny;
    if (Math.abs(e.fromX) > 1) e.dir = e.fromX > 0 ? 1 : -1;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
  }

  /**
   * Móbile no fio: com alguém perto da altura dele, para os lados, gira (aviso) e atira uma estrela para cada
   * lado, na altura do meio dele. Devolve true enquanto o fio fica parado.
   */
  private mobileThrow(e: Enemy, dt: number): boolean {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    e.skillCd = Math.max(0, e.skillCd - dt);
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return true;
      const s = RULES.spitSize * TILE;
      const speed = RULES.starSpeed * TILE;
      for (const dir of [-1, 1]) {
        const id = this.nextId++;
        this.spits.set(id, { id, kind: SPIT_ESTRELA, x: b.x + size / 2 - s / 2 + dir * size / 2, y: b.y + size / 2 - s / 2, vx: dir * speed, vy: 0, life: RULES.starRange / RULES.starSpeed });
      }
      e.skill = SKILL_REST;
      e.skillTimer = RULES.mobileRest;
      return true;
    }
    if (e.skill === SKILL_REST) {
      if ((e.skillTimer -= dt) <= 0) {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.mobileCooldown * this.cdMult;
      }
      return true;
    }
    if (!e.skilled || e.skillCd > 0) return false;
    const cx = b.x + size / 2;
    const cy = b.y + size / 2;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const px = p.body.x + (this.params.playerWidth * TILE) / 2;
      const py = p.body.y + (this.params.playerHeight * TILE) / 2;
      if (Math.abs(px - cx) > RULES.mobileSight * TILE || Math.abs(py - cy) > RULES.mobileHeight * TILE) continue;
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.mobile;
      return true;
    }
    return false;
  }

  /** Cornetinha: anda devagar sem sair do andar; com alguém no mesmo andar, para (aviso) e sopra duas notas em onda. */
  private corneta(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        const s = RULES.spitSize * TILE;
        const box = enemyBox(e);
        const x = e.dir > 0 ? box.x + box.w : box.x - s;
        const baseY = box.y + box.h * 0.4 - s / 2;
        for (const phase of [0, Math.PI]) {
          const id = this.nextId++;
          this.spits.set(id, { id, kind: SPIT_NOTA, x, y: baseY, vx: e.dir * RULES.noteSpeed * TILE, vy: 0, life: RULES.noteRange / RULES.noteSpeed, baseY, phase });
        }
        e.skill = SKILL_REST;
        e.skillTimer = RULES.hornRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.hornCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    const prey = e.skilled && e.skillCd === 0 ? this.preyInLine(e, RULES.hornSight, false) : null;
    if (prey) {
      e.dir = prey.body.x > b.x ? 1 : -1;
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.horn;
      return 0;
    }
    if (e.wasBlocked || this.edgeAhead(e)) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /**
   * Torreão: vira na hora para quem está mais perto e anda devagar; com alguém no mesmo andar, abre o portão
   * (aviso: aberto à tinta de frente, com as três marcas no chão, `towerSpots`) e as flechas caem nelas.
   * Vale sempre, sem depender da fase.
   */
  private torreao(e: Enemy, dt: number): number {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        const s = RULES.spitSize * TILE;
        const feet = Math.round((b.y + size) / TILE) * TILE;
        for (const x of towerSpots(this.arena, { x: b.x, y: b.y, dir: e.dir })) {
          const id = this.nextId++;
          this.spits.set(id, { id, kind: SPIT_FLECHA, x: x - s / 2, y: feet - RULES.arrowDrop * TILE, vx: 0, vy: 0, life: 2, landY: feet });
        }
        e.skill = SKILL_REST;
        e.skillTimer = RULES.towerRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.towerCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    if (e.skillCd === 0) {
      const prey = this.preyInLine(e, RULES.towerSight, false);
      if (prey) {
        e.dir = prey.body.x > b.x ? 1 : -1;
        e.skill = SKILL_WARN;
        e.skillTimer = this.warn.tower;
        return 0;
      }
    }
    const target = this.nearestPlayer(b);
    if (!target) return 0;
    const dx = target.body.x - b.x;
    if (Math.abs(dx) > TILE) e.dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) <= TILE / 2) return 0;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }


  /** Grampo: corre reto, nunca pula, desce pelos vãos e só vira na parede. */
  private grampo(e: Enemy): number {
    if (e.body.onGround && e.wasBlocked) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Tinteiro: anda devagar sem sair do andar; vendo alguém nele, vira, inclina (aviso) e cospe. */
  private tinteiro(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill !== SKILL_NONE) {
      if ((e.skillTimer -= dt) > 0) return 0;
      if (e.skill === SKILL_WARN) {
        this.launchSpit(e);
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.spitAct;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.spitRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.spitCooldown * this.cdMult;
      }
      return 0;
    }
    if (!b.onGround) return 0;
    const prey = e.skilled && e.skillCd === 0 ? this.preyInLine(e, RULES.spitSight, false) : null;
    if (prey) {
      e.dir = prey.body.x > b.x ? 1 : -1;
      e.skill = SKILL_WARN;
      e.skillTimer = this.warn.spit;
      return 0;
    }
    if (e.wasBlocked || this.edgeAhead(e)) e.dir = e.dir > 0 ? -1 : 1;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** A gota sai da boca do tinteiro, rente ao chão, na direção em que ele olha. */
  private launchSpit(e: Enemy): void {
    const size = RULES.spitSize * TILE;
    const box = enemyBox(e);
    const id = this.nextId++;
    this.spits.set(id, {
      id,
      kind: SPIT_CUSPE,
      x: e.dir > 0 ? box.x + box.w : box.x - size,
      y: box.y + box.h - size - 1,
      vx: e.dir * RULES.spitSpeed * TILE,
      vy: 0,
      life: RULES.spitRange / RULES.spitSpeed,
    });
  }

  /** Borracha: vai devagar atrás de quem está mais perto; para virar, gira parada por RULES.eraserTurn. */
  private borracha(e: Enemy, dt: number): number {
    const b = e.body;
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      e.skill = SKILL_NONE;
      e.dir = e.dir > 0 ? -1 : 1;
    }
    const target = this.nearestPlayer(b);
    if (!target || !b.onGround) return 0;
    const dx = target.body.x - b.x;
    if (Math.abs(dx) > TILE && Math.sign(dx) !== e.dir) {
      e.skill = SKILL_WARN;
      e.skillTimer = RULES.eraserTurn;
      return 0;
    }
    if (Math.abs(dx) <= TILE / 2) return 0;
    return e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
  }

  /** Bote da traça: aviso parada → corrida rápida (até bater) → cansada → espera. */
  private dash(e: Enemy, dt: number): number {
    if (e.skill === SKILL_ACT && e.wasBlocked) e.skillTimer = 0;
    if ((e.skillTimer -= dt) <= 0) {
      if (e.skill === SKILL_WARN) {
        e.skill = SKILL_ACT;
        e.skillTimer = RULES.dashTime;
      } else if (e.skill === SKILL_ACT) {
        e.skill = SKILL_REST;
        e.skillTimer = RULES.dashRest;
      } else {
        e.skill = SKILL_NONE;
        e.skillCd = RULES.dashCooldown * this.cdMult;
      }
    }
    return e.skill === SKILL_ACT ? (e.dir > 0 ? BTN_RIGHT : BTN_LEFT) : 0;
  }

  /**
   * Jogador de pé no mesmo andar do inimigo, a até `sight` células e sem parede no meio;
   * com `aheadOnly`, só à frente dele.
   */
  private preyInLine(e: Enemy, sight: number, aheadOnly: boolean): WorldPlayer | null {
    const b = e.body;
    const size = ENEMY_SIZE * TILE;
    const feet = b.y + size;
    const row = Math.floor((feet - 1) / TILE);
    const pw = this.params.playerWidth * TILE;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      if (Math.abs(p.body.y + this.params.playerHeight * TILE - feet) > 0.6 * TILE) continue;
      const side = aheadOnly ? e.dir : p.body.x + pw / 2 > b.x + size / 2 ? 1 : -1;
      const gap = side > 0 ? p.body.x - (b.x + size) : b.x - (p.body.x + pw);
      if (gap < -size / 2 || gap > sight * TILE) continue;
      const from = Math.floor((b.x + size / 2) / TILE);
      const to = Math.floor((p.body.x + pw / 2) / TILE);
      let clear = true;
      for (let col = Math.min(from, to); col <= Math.max(from, to); col++) {
        if (cellAt(this.arena, col, row) === SOLID) clear = false;
      }
      if (clear) return p;
    }
    return null;
  }

  /** Pancada do saltador: agachado (aviso) → salto alto rumo ao jogador → ao cair, onda → parado. */
  private slam(e: Enemy, dt: number): number {
    const b = e.body;
    const dirButton = e.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    if (e.skill === SKILL_WARN) {
      if ((e.skillTimer -= dt) > 0) return 0;
      const target = this.nearestPlayer(b);
      if (target) e.dir = target.body.x > b.x ? 1 : -1;
      e.skill = SKILL_ACT;
      e.skillTimer = 0;
      return BTN_JUMP | (e.dir > 0 ? BTN_RIGHT : BTN_LEFT);
    }
    if (e.skill === SKILL_ACT) {
      // skillTimer conta o tempo no ar: o primeiro tick ainda está no chão.
      e.skillTimer += dt;
      if (!b.onGround || e.skillTimer < 0.1) return dirButton;
      const size = ENEMY_SIZE * TILE;
      const x = b.x + size / 2;
      const y = b.y + size;
      const [left, right] = floorSpan(this.arena, x, y, RULES.slamRadius);
      this.shocks.push({ x, y, left, right, age: 0 });
      e.skill = SKILL_REST;
      e.skillTimer = RULES.slamRest;
      return 0;
    }
    if ((e.skillTimer -= dt) <= 0) e.skill = SKILL_NONE;
    return 0;
  }

  private edgeAhead(e: Enemy): boolean {
    const b = e.body;
    const w = ENEMY_SIZE * TILE;
    const footRow = Math.round((b.y + ENEMY_SIZE * TILE) / TILE);
    const col = e.dir > 0 ? Math.floor((b.x + w + 1) / TILE) : Math.floor((b.x - 1) / TILE);
    return cellAt(this.arena, col, footRow) === EMPTY;
  }

  private nearestPlayer(b: PlayerState): WorldPlayer | null {
    let best: WorldPlayer | null = null;
    let bestDist = Infinity;
    for (const p of this.players.values()) {
      if (p.down || p.away) continue;
      const d = Math.abs(p.body.x - b.x) + Math.abs(p.body.y - b.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  private defeat(e: Enemy, kicker: string | null, combo: number): void {
    this.enemies.delete(e.id);
    this.score += RULES.scorePerEnemy * Math.max(1, combo);
    const p = kicker ? this.players.get(kicker) : undefined;
    if (p) {
      p.kills++;
      this.playerStats(p).kills++;
    }
  }

  private burst(ball: Enemy): void {
    const center = enemyBox(ball);
    const cx = center.x + center.w / 2;
    const cy = center.y + center.h / 2;
    this.defeat(ball, ball.kicker, 1);
    for (const e of this.enemies.values()) {
      if (e.mode !== MODE_WALK || e.kind === ENEMY_BORRAO) continue;
      const box = enemyBox(e);
      if (Math.hypot(box.x + box.w / 2 - cx, box.y + box.h / 2 - cy) <= RULES.burstRadius * TILE) {
        this.soak(e, RULES.burstSoak);
      }
    }
  }

  /** Bola rolando acertou o chefe: estoura nele; derrotado, os fiapos secam junto. */
  private hitBoss(ball: Enemy, damage: number): void {
    const boss = this.boss!;
    this.score += BOSS_RULES.scorePerHit * damage;
    this.burst(ball);
    if (boss.alive) return;
    this.score += BOSS_RULES.scoreDefeat;
    for (const e of this.enemies.values()) if (e.kind !== ENEMY_BORRAO) this.enemies.delete(e.id);
  }

  /** O chefe vê o mundo só por aqui: sorteio da partida, alvo mais próximo e os fiapos (traças). */
  private createBoss(players: number): Boss {
    return new Boss(this.arena, players, {
      rng: this.rng,
      nextId: () => this.nextId++,
      nearestTarget: (x, y) => {
        let best: { x: number; y: number } | null = null;
        let bestDist = Infinity;
        for (const p of this.players.values()) {
          if (p.down || p.away) continue;
          const cx = p.body.x + (this.params.playerWidth * TILE) / 2;
          const cy = p.body.y + (this.params.playerHeight * TILE) / 2;
          const d = Math.abs(cx - x) + Math.abs(cy - y);
          if (d < bestDist) {
            bestDist = d;
            best = { x: cx, y: cy };
          }
        }
        return best;
      },
      minions: () => [...this.enemies.values()].filter((e) => e.kind !== ENEMY_BORRAO).length,
      spawnMinion: (cell, phase) => {
        if (this.enemies.size >= RULES.maxEnemiesOnScreen) return;
        // Os fiapos repassam o capítulo: na fase 1 só andam, na 2 dão o bote, na 3 vêm grampos junto.
        // Os do Apontador são criaturas da Floresta (lagartas e pinhas); os do Calhamaço, da Biblioteca.
        const [walker, runner] = BOSS_MINIONS[bossKind(this.arena)] ?? [ENEMY_TRACA, ENEMY_GRAMPO];
        const kind = phase >= 3 && this.minionCount++ % 2 === 1 ? runner : walker;
        // O fiapo acabou de sair do chefe: espera um pouco antes do primeiro bote.
        this.spawnEnemy(kind, cell, phase >= 2).skillCd = RULES.dashCooldown * this.cdMult;
      },
    });
  }

  private stepDamage(): void {
    for (const p of this.players.values()) {
      if (p.down || p.away || p.invuln > 0 || p.star > 0) continue;
      if (!this.touchesHazard(p)) continue;
      if (p.hp > 1) {
        // Modo fácil: o primeiro toque só tira a proteção.
        p.hp--;
        p.invuln = RULES.hitInvulnTime;
        continue;
      }
      this.knockDown(p);
      this.stats.downs++;
    }
  }

  /** Derrubado perde tudo o que acumulou. */
  private knockDown(p: WorldPlayer): void {
    p.down = true;
    p.strength = 0;
    p.speed = 0;
    p.rate = 0;
    p.range = 0;
    p.star = 0;
    p.downTime = 0;
    p.rescue = 0;
    p.body.vx = 0;
    p.body.vy = 0;
  }

  /**
   * Inimigo andando, mancha já firme, cuspe do tinteiro (que se desfaz no golpe) ou a frente da onda
   * da pancada (só pega quem está no chão).
   */
  private touchesHazard(p: WorldPlayer): boolean {
    const box = bodyBox(p.body, this.params);
    for (const e of this.enemies.values()) {
      if (e.mode !== MODE_WALK) continue;
      if (overlaps(box, enemyBox(e))) return true;
      // O tapete aberto do pergaminho e o facho da coruja.
      if (e.skill !== SKILL_ACT) continue;
      if (e.kind === ENEMY_PERGAMINHO && overlaps(box, unrollBox({ x: e.body.x, y: e.body.y, dir: e.dir, aimX: e.aimX }))) return true;
      if (e.kind === ENEMY_COMPASSO && segmentHits(box, { x0: e.body.x + (ENEMY_SIZE * TILE) / 2, y0: e.body.y + (ENEMY_SIZE * TILE) / 2, x1: e.aimX, y1: e.aimY }, (RULES.compassWidth * TILE) / 2)) return true;
      if (e.kind === ENEMY_MARTELO && p.body.onGround && Math.abs(box.y + box.h - (e.body.y + ENEMY_SIZE * TILE)) < TILE / 2 && box.x + box.w > e.aimX && box.x < e.aimY) return true;
      if (e.kind === ENEMY_VAGALUME && circleHits(box, e.body.x + (ENEMY_SIZE * TILE) / 2, e.body.y + (ENEMY_SIZE * TILE) / 2, RULES.flashRadius * TILE)) return true;
      if (e.kind === ENEMY_CHAFARIZ && overlaps(box, geyserBox(this.arena, e.aimX, e.aimY))) return true;
      if (e.kind === ENEMY_CORUJA && segmentHits(box, beamLine(this.arena, { x: e.body.x, y: e.body.y, aimX: e.aimX, aimY: e.aimY }), (RULES.beamWidth * TILE) / 2)) return true;
    }
    if (this.boss?.hurts(box)) return true;
    for (const s of this.stains.values()) {
      if (s.age >= this.warn.stain && overlaps(box, stainBox(s))) return true;
    }
    for (const s of this.sprouts.values()) {
      if (s.age >= this.warn.sprout && overlaps(box, sproutBox(s))) return true;
    }
    for (const s of this.spits.values()) {
      if (!overlaps(box, spitBox(s))) continue;
      this.spits.delete(s.id);
      return true;
    }
    if (!p.body.onGround) return false;
    for (const w of this.shocks) {
      if (Math.abs(box.y + box.h - w.y) > TILE / 2 || box.x >= w.right || box.x + box.w <= w.left) continue;
      const front = RULES.slamRadius * TILE * Math.min(1, (w.age + TICK_DT) / RULES.slamWaveTime);
      const dist = Math.max(0, box.x - w.x, w.x - (box.x + box.w));
      if (dist <= front && dist >= front - RULES.slamWaveBand * TILE) return true;
    }
    return false;
  }

  private stepRescue(dt: number): void {
    for (const p of this.players.values()) {
      if (!p.down) continue;
      p.downTime += dt;
      const area = bodyBox(p.body, this.params, 0.3 * TILE);
      let helped = false;
      for (const o of this.players.values()) {
        if (o !== p && !o.down && !o.away && overlaps(area, bodyBox(o.body, this.params))) helped = true;
      }
      p.rescue = helped ? p.rescue + dt : 0;
      if (p.rescue >= RULES.rescueTime) {
        this.stats.rescues++;
        this.revive(p, false);
      } else if (p.downTime >= RULES.respawnTime && this.lives > 0) {
        this.lives--;
        this.stats.livesUsed++;
        this.revive(p, true);
      }
    }
  }

  private revive(p: WorldPlayer, atSpawn: boolean): void {
    p.down = false;
    p.hp = this.hitsToDown;
    p.downTime = 0;
    p.rescue = 0;
    p.invuln = RULES.invulnTime;
    p.ink = RULES.tankSize;
    if (atSpawn) {
      const prevButtons = p.body.prevButtons;
      p.body = createPlayer(this.safestSpawn(p.slot), this.params);
      p.body.prevButtons = prevButtons;
    }
  }

  /**
   * Renascer longe de quem derruba: entre o surgimento do jogador e as células ao lado
   * dos tubos, a mais distante dos inimigos andando. Empate fica com o surgimento próprio.
   */
  private safestSpawn(slot: number): CellPos {
    const candidates: CellPos[] = [this.arena.playerSpawns[slot]!];
    for (const tube of this.arena.tubes) {
      candidates.push({ col: tube.col + (tube.col < this.arena.cols / 2 ? 1 : -1), row: tube.row });
    }
    let best = candidates[0]!;
    let bestDist = -1;
    for (const c of candidates) {
      let nearest = Infinity;
      for (const e of this.enemies.values()) {
        if (e.mode !== MODE_WALK) continue;
        nearest = Math.min(nearest, Math.hypot(e.body.x - c.col * TILE, e.body.y - c.row * TILE));
      }
      if (nearest > bestDist) {
        bestDist = nearest;
        best = c;
      }
    }
    return best;
  }

  private get maxOnScreen(): number {
    return Math.min(RULES.maxEnemiesOnScreen, this.stage.maxOnScreen);
  }

  private stepSpawns(dt: number): void {
    if (this.phase !== PHASE_PLAYING || this.spawnQueue === 0) return;
    if (this.enemies.size >= this.maxOnScreen) return;
    if ((this.spawnTimer -= dt) > 0) return;
    this.spawnNext();
    this.spawnTimer = this.stage.spawnDelay;
  }

  /** Próximo da fila da fase. A fiandeira vai para um ponto de fio livre; sem nenhum, vem uma traça no lugar. */
  private spawnNext(): void {
    const stage = this.stage;
    let kind = stage.roster[this.spawnCount % stage.roster.length]!;
    this.spawnCount++;
    this.spawnQueue--;
    if (enemyRole(kind) === ENEMY_FIANDEIRA) {
      const anchor = this.freeAnchor();
      if (anchor) {
        this.spawnEnemy(kind, anchor, stage.skills.includes(kind));
        return;
      }
      // Sem ponto de fio livre, vem quem anda no lugar (do mesmo capítulo).
      kind = kind === ENEMY_CESTO ? ENEMY_LAGARTA : kind === ENEMY_MORCEGO ? ENEMY_MARCADOR : kind === ENEMY_SINO ? ENEMY_VAGALUME : kind === ENEMY_PRUMO ? ENEMY_COMPASSO : kind === ENEMY_MOBILE ? ENEMY_RAPOSA : ENEMY_TRACA;
    }
    const points = this.arena.enemySpawns;
    this.spawnEnemy(kind, points[this.spawnPoint++ % points.length]!, stage.skills.includes(kind));
  }

  /** Um ponto de fio sem fiandeira pendurada, a partir de um diferente a cada surgimento. */
  private freeAnchor(): CellPos | null {
    const anchors = this.arena.anchors;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[(this.spawnCount + i) % anchors.length]!;
      const taken = [...this.enemies.values()].some((e) => e.anchorY === a.row * TILE && Math.floor((e.body.x + (ENEMY_SIZE * TILE) / 2) / TILE) === a.col);
      if (!taken) return a;
    }
    return null;
  }

  /**
   * Arena limpa → pausa curta → virada de página → próxima arena; depois da última, resumo do
   * capítulo e volta à primeira. Todos caídos sem vidas → a mesma arena recomeça.
   */
  private stepPhase(dt: number): void {
    if (this.phase === PHASE_LOBBY) return;
    if (this.phase === PHASE_PLAYING) {
      if (this.waveStarted && this.enemiesLeft === 0) {
        this.report('limpa');
        // O borrão vai embora junto com a arena, e as manchas com ele.
        this.enemies.clear();
        this.stains.clear();
        this.spits.clear();
        this.sprouts.clear();
        this.shocks = [];
        this.phase = PHASE_CLEAR;
        this.phaseTime = RULES.clearDelay;
      } else if (this.lives === 0 && this.players.size > 0 && [...this.players.values()].every((p) => p.down || p.away)) {
        this.gameOver('sem-vidas', 'recomeço');
      }
      return;
    }
    if ((this.phaseTime -= dt) > 0) return;

    if (!this.autoWaves) {
      if (this.phase === PHASE_RESTART) this.resetTeam();
      this.phase = PHASE_PLAYING;
      return;
    }
    switch (this.phase) {
      case PHASE_CLEAR:
        if (this.arenaIndex >= this.chapter.length - 1) {
          // Último capítulo: fim da partida, com placar.
          this.phase = PHASE_CHAPTER;
          this.campaignOver = true;
          this.phaseTime = this.endRun('capitulo') ? RULES.recordDelay : RULES.chapterDelay;
        } else if (this.chapterEnds.has(this.arenaIndex)) {
          // Chefe vencido no meio da campanha: resumo e segue para o próximo capítulo com os pontos e as vidas.
          this.phase = PHASE_CHAPTER;
          this.campaignOver = false;
          this.phaseTime = RULES.chapterDelay;
        } else {
          this.phase = PHASE_TURN;
          this.phaseTime = RULES.turnDelay;
        }
        break;
      case PHASE_TURN:
        this.loadArena(this.arenaIndex + 1);
        break;
      case PHASE_CHAPTER:
        if (!this.campaignOver) {
          this.phase = PHASE_TURN;
          this.phaseTime = RULES.turnDelay;
          break;
        }
        this.score = 0;
        this.lives = RULES.teamLives;
        this.loadArena(0);
        break;
      case PHASE_RESTART:
        this.resetTeam();
        this.startWave();
        break;
    }
  }

  private resetTeam(): void {
    this.score = 0;
    this.lives = RULES.teamLives;
    for (const p of this.players.values()) this.revive(p, true);
  }

  /** Vira a página: todos começam juntos nos próprios surgimentos da nova arena. */
  private loadArena(index: number): void {
    this.arenaIndex = index;
    for (const p of this.players.values()) {
      const prevButtons = p.body.prevButtons;
      p.body = createPlayer(this.arena.playerSpawns[p.slot]!, this.params);
      p.body.prevButtons = prevButtons;
      p.down = false;
      p.downTime = 0;
      p.rescue = 0;
      p.invuln = RULES.invulnTime;
      p.ink = RULES.tankSize;
      p.hp = this.hitsToDown;
    }
    this.startWave();
  }

  /**
   * Nova onda: tipos, ritmo e habilidades vêm da fase; quantidade e resistência, de quem está na sala
   * agora (plano, seção 2.6). O modo tira inimigos no fácil, nunca abaixo de 3.
   */
  private startWave(): void {
    this.waveStarted = true;
    this.phase = PHASE_PLAYING;
    this.wave++;
    this.waveTime = 0;
    this.hurry = false;
    this.stats = emptyStats();
    this.enemies.clear();
    this.drops.clear();
    this.items.clear();
    this.stains.clear();
    this.spits.clear();
    this.sprouts.clear();
    this.shocks = [];
    this.nextItemAt = RULES.itemFirstAt;
    this.applyStage();
    const n = Math.max(1, this.players.size);
    this.soakToBall = n >= 4 ? RULES.soakToBallBigTeam : RULES.soakToBall;
    // Na página do chefe não há fila de inimigos: os fiapos saem dele.
    this.boss = isBossArena(this.arena) ? this.createBoss(n) : null;
    const count = Math.round(this.stage.base + this.stage.perPlayer * n);
    this.spawnQueue = this.boss ? 0 : Math.max(Math.min(count, 3), count - DIFFICULTY_RULES[this.difficulty].fewerEnemies);
    this.spawnCount = 0;
    this.spawnPoint = 0;
    this.minionCount = 0;
    this.spawnTimer = this.stage.spawnDelay;
    const initial = Math.min(this.spawnQueue, this.maxOnScreen, this.arena.enemySpawns.length);
    for (let i = 0; i < initial; i++) this.spawnNext();
  }
}
