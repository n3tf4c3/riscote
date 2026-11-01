import { parseArena, type Arena, type Stage } from './arena.ts';
import { ATRIL_ARENA, BOSQUE_ARENA, BOSS_ARENA } from './boss.ts';
import {
  ENEMY_BORRACHA,
  ENEMY_CARACOL,
  ENEMY_CESTO,
  ENEMY_CORUJA,
  ENEMY_DICIONARIO,
  ENEMY_ENCICLOPEDIA,
  ENEMY_FIANDEIRA,
  ENEMY_GRAMPO,
  ENEMY_GRILO,
  ENEMY_LAGARTA,
  ENEMY_MARCADOR,
  ENEMY_MORCEGO,
  ENEMY_OURICO,
  ENEMY_PERGAMINHO,
  ENEMY_PINHA,
  ENEMY_SALTADOR,
  ENEMY_TINTEIRO,
  ENEMY_TRACA,
} from './world.ts';

// Cada capítulo tem 4 fases e o chefe na 5ª (withBoss, no servidor). A fase 1 ensina tiro, bola e chute
// com inimigos sem habilidade; a 2 traz plataformas novas e mais tipos simples; a 3 liga as primeiras
// habilidades; a 4 junta tudo. Andares a cada 3 células; tubos de tinta nos cantos inferiores (C21).

const T = ENEMY_TRACA;
const S = ENEMY_SALTADOR;
const G = ENEMY_GRAMPO;
const F = ENEMY_FIANDEIRA;
const I = ENEMY_TINTEIRO;
const B = ENEMY_BORRACHA;
// Criaturas da Floresta, cada uma com o papel de um dos de cima e um poder próprio.
const La = ENEMY_LAGARTA;
const Gr = ENEMY_GRILO;
const Pi = ENEMY_PINHA;
const Ce = ENEMY_CESTO;
const Ca = ENEMY_CARACOL;
const Ou = ENEMY_OURICO;
// Criaturas da Biblioteca dos Sonhos, no mesmo esquema.
const Ma = ENEMY_MARCADOR;
const Di = ENEMY_DICIONARIO;
const Pe = ENEMY_PERGAMINHO;
const Mo = ENEMY_MORCEGO;
const Co = ENEMY_CORUJA;
const En = ENEMY_ENCICLOPEDIA;

const stage = (s: Partial<Stage> & Pick<Stage, 'step' | 'roster'>): Stage => ({
  skills: [], base: 4, perPlayer: 1.5, maxOnScreen: 8, spawnDelay: 1, hurryTime: 60, skillCdMult: 1, hints: false, ...s,
});

// Capítulo 1: caderno pautado.

/** Fase 1. Chão inteiro, dois andares longos e um topo curto, sem blocos: só correr, atirar e chutar. */
const MARGEM = [
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '#............E.............#',
  '#..........................#',
  '#..........................#',
  '#.........========.........#',
  '#....E................E....#',
  '#..........................#',
  '#...====================...#',
  '#..........................#',
  '#.E......................E.#',
  '#=========........=========#',
  '#..........................#',
  '#T..........PPPPP.........T#',
  '############################',
];

/** Fase 2. Pirâmide de degraus no meio até um patamar, com plataformas curtas dos lados. */
const ESCADARIA = [
  '#............................#',
  '#.............E..............#',
  '#............................#',
  '#............................#',
  '#..======...======...======..#',
  '#....E.........A........E....#',
  '#............................#',
  '#.=====......####......=====.#',
  '#...A........####........A...#',
  '#............####............#',
  '#..====....########....====..#',
  '#.E........########........E.#',
  '#..........########..........#',
  '#.====...############...====.#',
  '#........############........#',
  '#T..PPP..############..PP...T#',
  '##############################',
];

/** Fase 3. Vão aberto no meio, cruzado por duas pontes finas; torres de plataformas desencontradas. */
const POCO = [
  '#..............................#',
  '#..............E...............#',
  '#..............................#',
  '#..............................#',
  '#.......E..............E.......#',
  '#....=====..========..=====....#',
  '#..............A........A......#',
  '#..E........................E..#',
  '#=====...##..........##...=====#',
  '#..............................#',
  '#..............................#',
  '#...=====..==========..=====...#',
  '#...............A..............#',
  '#..............................#',
  '#======..................======#',
  '#..............................#',
  '#T....PPP..............PP.....T#',
  '################################',
];

/** Fase 4. Rota de cima pelas tábuas e rota de baixo pelo túnel sob o bloco largo. */
const ANDAIME = [
  '#................................#',
  '#...............E................#',
  '#................................#',
  '#............========............#',
  '#...E........................E...#',
  '#................................#',
  '#.=======................=======.#',
  '#................................#',
  '#................................#',
  '#.......======......======.......#',
  '#...........A...##...A...........#',
  '#...............##...............#',
  '#..........############..........#',
  '#..........############..........#',
  '#.............A.E..A.............#',
  '#.======..................======.#',
  '#................................#',
  '#T.....PPP..............PP......T#',
  '##################################',
];

// Capítulo 3: a Biblioteca dos Sonhos. As páginas eram as de Partituras e mapas (o capítulo 2 até
// 2026-11-01, guardadas para os capítulos novos por decisão do usuário), com ids e nomes novos: os
// andares são livros deitados em fila e os blocos, pilhas de livros. O chefe é o Calhamaço (`ATRIL_ARENA`).
// Só criaturas de lá. Fase 1 sem poder; fase 2 traz o morcego e a coruja, ainda sem poder; fase 3 liga
// o atalho do marca-página, o facho da coruja e o tapete do pergaminho; fase 4 traz a enciclopédia (as
// letras dela valem sempre) e liga as páginas soltas do dicionário e o mergulho do morcego.

/** Fase 1. As estantes: prateleiras compridas com vãos alternados. */
const ESTANTES = [
  '#..............................#',
  '#...............E..............#',
  '#.........============.........#',
  '#..............................#',
  '#...E......................E...#',
  '#============......============#',
  '#..............................#',
  '#..E........................E..#',
  '#====....==============....====#',
  '#..............................#',
  '#..............................#',
  '#===========........===========#',
  '#..............................#',
  '#...............E..............#',
  '#=====....============....=====#',
  '#..............................#',
  '#T............PPPPP...........T#',
  '################################',
];

/** Fase 2. O fichário: prateleiras em zigue-zague nas laterais e uma pilha de livros no meio. */
const FICHARIO = [
  '#............................#',
  '#..............E.............#',
  '#..........========..........#',
  '#...........A....A...........#',
  '#..E......................E..#',
  '#.====........##........====.#',
  '#.............##.............#',
  '#.....====..E.##.E..====.....#',
  '#..........===##===..........#',
  '#.====........##........====.#',
  '#.............##.............#',
  '#.....====..........====.....#',
  '#......A.......E......A......#',
  '#.====....==========....====.#',
  '#............................#',
  '#T...........PPPPP..........T#',
  '##############################',
];

/** Fase 3. O atlas: ilhas de tamanhos diferentes, pilhas no caminho e rotas por cima e por baixo até o topo. */
const ATLAS = [
  '#................................#',
  '#................................#',
  '#................E...............#',
  '#.............======.............#',
  '#...............A................#',
  '#....E......................E....#',
  '#..====...==..........==...====..#',
  '#................................#',
  '#...........E...........E........#',
  '#===....====#=====.....====......#',
  '#................................#',
  '#................................#',
  '#....####.....========.....####..#',
  '#.....A...........A..............#',
  '#................................#',
  '#.========.....##.##......======.#',
  '#................................#',
  '#T......PPPPP...................T#',
  '##################################',
];

/** Fase 4. O arquivo: gavetas em fileiras desencontradas, pouco chão contínuo, e uma prateleira no topo. */
const ARQUIVO = [
  '#................................#',
  '#...............E................#',
  '#................................#',
  '#.........==============.........#',
  '#......E...................E.....#',
  '#................................#',
  '#.....###..###.......###..###....#',
  '#......A...................A.....#',
  '#................................#',
  '#..###..###..########..###..###..#',
  '#...............A................#',
  '#................................#',
  '#.....###..###..###..###..###....#',
  '#................................#',
  '#................................#',
  '#..###..###..###..###..###..###..#',
  '#................................#',
  '#T.....PPP..............PP......T#',
  '##################################',
];

// Capítulo 2: a Floresta Encantada (o Bosque das Aparas). Os andares são galhos, os blocos são
// tocos e troncos caídos; o chefe é o Apontador, no bosque dele (`BOSQUE_ARENA`).
// Só criaturas de lá (2026-11-01). Fase 1 sem poder; fase 2 traz o bicho-cesto e o caracol, ainda
// sem poder; fase 3 liga a metamorfose da lagarta, a seiva em arco do caracol e os pinhões da pinha;
// fase 4 traz o ouriço (a bola de espinhos é dele, sempre) e liga o salto longo e os gravetos.

/** Fase 1. A clareira: galhos em quatro andares e um toco no meio, sem fio. */
const CLAREIRA = [
  '#..........................#',
  '#..........................#',
  '#....E................E....#',
  '#..========......========..#',
  '#..........................#',
  '#..........................#',
  '#.......============.......#',
  '#............E.............#',
  '#..........................#',
  '#.=======....##....=======.#',
  '#..........................#',
  '#..........................#',
  '#.....=====........=====...#',
  '#..........................#',
  '#T.........PPPPP..........T#',
  '############################',
];

/** Fase 2. As raízes: um tronco caído no meio, raízes baixas nos cantos e fios sob os galhos. */
const RAIZES = [
  '#............................#',
  '#............................#',
  '#......E..............E......#',
  '#............................#',
  '#...========......========...#',
  '#.....A..................A...#',
  '#..............E.............#',
  '#.=====.....########.....====#',
  '#.............A..............#',
  '#............................#',
  '#......=====........=====....#',
  '#............................#',
  '#............................#',
  '#.###......======.......###..#',
  '#............................#',
  '#T..........PPPPP...........T#',
  '##############################',
];

/** Fase 3. A toca: um tronco oco atravessado no meio, com fios lá dentro, e galhos em cinco andares. */
const TOCA = [
  '#..............................#',
  '#..............................#',
  '#.........E..........E.........#',
  '#.....=======......=======.....#',
  '#.......A..............A.......#',
  '#..............................#',
  '#...======............======...#',
  '#..............E...............#',
  '#..............................#',
  '#.====.....##########.....====.#',
  '#............A....A............#',
  '#..............................#',
  '#...=======##########=======...#',
  '#..............................#',
  '#..............................#',
  '#====......==========......====#',
  '#T.....PPP..............PP....T#',
  '################################',
];

/** Fase 4. As copas: uma copa maciça no alto, um toco no meio e galhos em cinco andares. */
const COPAS = [
  '#................................#',
  '#................................#',
  '#.........E............E.........#',
  '#......=========...=========.....#',
  '#................................#',
  '#...............E................#',
  '#..=====....##########....=====..#',
  '#.............A....A.............#',
  '#...E........................E...#',
  '#.=====......========......=====.#',
  '#................................#',
  '#................................#',
  '#....======...######...======....#',
  '#...............A................#',
  '#................................#',
  '#=======....==========....=======#',
  '#................................#',
  '#T......PPP............PP.......T#',
  '##################################',
];

/** Capítulos: a sala joga as quatro fases de um deles, sempre a partir da primeira, dando a volta. */
export const CHAPTERS: readonly (readonly Arena[])[] = [
  [
    parseArena('margem', 'Margem 28×16', MARGEM, stage({ step: 1, roster: [T, G, T, G], base: 3, perPlayer: 1, maxOnScreen: 4, spawnDelay: 1.5, hurryTime: 75, hints: true })),
    parseArena('escadaria', 'Escadaria 30×17', ESCADARIA, stage({ step: 2, roster: [T, G, S, F, T, G], perPlayer: 1.25, maxOnScreen: 5, spawnDelay: 1.2 })),
    parseArena('poco', 'Poço 32×18', POCO, stage({ step: 3, roster: [T, I, G, T, S, F], skills: [T, I], maxOnScreen: 6 })),
    parseArena('andaime', 'Andaime 34×19', ANDAIME, stage({ step: 4, roster: [T, B, I, S, G, F, T, S], skills: [T, S, I], base: 5 })),
  ],
  [
    parseArena('clareira', 'Clareira 28×16', CLAREIRA, stage({ step: 1, roster: [La, Pi, Gr], base: 3, perPlayer: 1, maxOnScreen: 4, spawnDelay: 1.5, hurryTime: 75, hints: true })),
    parseArena('raizes', 'Raízes 30×17', RAIZES, stage({ step: 2, roster: [La, Pi, Gr, Ce, La, Ca], perPlayer: 1.25, maxOnScreen: 6 })),
    parseArena('toca', 'Toca 32×18', TOCA, stage({ step: 3, roster: [La, Gr, Ca, Pi, Ce, La], skills: [La, Ca, Pi], maxOnScreen: 6 })),
    parseArena('copas', 'Copas 34×19', COPAS, stage({ step: 4, roster: [La, Ou, Ca, Gr, Pi, Ce, Ou, La], skills: [La, Ca, Pi, Gr, Ce], base: 5, skillCdMult: 0.8 })),
  ],
  [
    parseArena('estantes', 'Estantes 32×18', ESTANTES, stage({ step: 1, roster: [Ma, Pe, Di], base: 3, perPlayer: 1, maxOnScreen: 4, spawnDelay: 1.5, hurryTime: 75, hints: true })),
    parseArena('fichario', 'Fichário 30×17', FICHARIO, stage({ step: 2, roster: [Ma, Pe, Di, Mo, Ma, Co], perPlayer: 1.25, maxOnScreen: 6 })),
    parseArena('atlas', 'Atlas 34×19', ATLAS, stage({ step: 3, roster: [Ma, Di, Co, Pe, Mo, Ma], skills: [Ma, Co, Pe], maxOnScreen: 6 })),
    parseArena('arquivo', 'Arquivo 34×19', ARQUIVO, stage({ step: 4, roster: [Ma, En, Co, Di, Pe, Mo, En, Ma], skills: [Ma, Co, Pe, Di, Mo], base: 5, skillCdMult: 0.9 })),
  ],
];

export const ARENAS: readonly Arena[] = CHAPTERS.flat();

/** Nome de cada capítulo no menu. */
export const CHAPTER_NAMES: readonly string[] = ['Caderno', 'Floresta Encantada', 'Biblioteca dos Sonhos'];

/** A página do chefe de cada capítulo, depois da 4ª fase. */
export const CHAPTER_BOSSES: readonly Arena[] = [BOSS_ARENA, BOSQUE_ARENA, ATRIL_ARENA];

// Greybox da etapa 1: três tamanhos para comparar com 1, 3 e 5 jogadores (plano, seção 2.2).
// Fora dos capítulos; ficam no modo local (`?local`).

const COMPACTA = [
  '#..........................#',
  '#..........................#',
  '#..........................#',
  '#............E.............#',
  '#======....======....======#',
  '#..........................#',
  '#..E...................E...#',
  '#=====...====##====...=====#',
  '#..........................#',
  '#......E...................#',
  '#...========....========...#',
  '#..........................#',
  '#..........................#',
  '#=======....====....=======#',
  '#T..........PPPPP.........T#',
  '############################',
];

const PADRAO = [
  '#..............................#',
  '#..............E...............#',
  '#...........========...........#',
  '#..............................#',
  '#...E......................E...#',
  '#========..............========#',
  '#..............................#',
  '#........E.....................#',
  '#....=========....=========....#',
  '#..............................#',
  '#.E..........................E.#',
  '#======.....########.....======#',
  '#..............................#',
  '#..............................#',
  '#....========......========....#',
  '#..............................#',
  '#T.............PPPPP..........T#',
  '################################',
];

const AMPLA = [
  '#..................................#',
  '#..................................#',
  '#..................................#',
  '#........E.................E.......#',
  '#...==========........==========...#',
  '#..................................#',
  '#................E.................#',
  '#======.....============.....======#',
  '#..................................#',
  '#..E............................E..#',
  '#======...####........####...======#',
  '#..................................#',
  '#...........E......................#',
  '#....==========......==========....#',
  '#..................................#',
  '#..................................#',
  '#======.......========.......======#',
  '#..................................#',
  '#T..............PPPPP.............T#',
  '####################################',
];

export const GREYBOX: readonly Arena[] = [
  parseArena('compacta', 'Compacta 28×16', COMPACTA),
  parseArena('padrao', 'Padrão 32×18', PADRAO),
  parseArena('ampla', 'Ampla 36×20', AMPLA),
];

/**
 * Capítulo da arena escolhida, sempre a partir da 1ª fase: começar no meio quebraria a curva.
 * Arena desconhecida (ou um id antigo do greybox, de links velhos): o capítulo 1.
 */
export function chapterFrom(arenaId: unknown): Arena[] {
  const chapter = CHAPTERS.find((c) => c.some((a) => a.id === arenaId)) ?? CHAPTERS[0]!;
  return [...chapter];
}
