# Áudio do Riscote

Direção sonora, inventário, como os arquivos são feitos, prompts para geradores externos, origem e licença, validação e pendências.

## Direção sonora: "a banda da mesa de desenho"

Aprovada pelo usuário em 2026-10-21, depois de ouvir o primeiro lote no jogo.

O Riscote acontece numa folha de papel: bonecos de nanquim, monstros de papelaria, tinta azul que encharca. O som segue a mesma ideia: tudo deve parecer vir de cima de uma mesa de desenho, tocado por uma banda pequena e brincalhona.

- **Clima:** leve, saltitante, cooperativo e com humor. Tensão só quando o jogo pede (borrão, chefe), nunca agressiva. Derrota sem drama: um amigo pode levantar você.
- **Efeitos (foley de papelaria):** tinta molhada (respingo, bolhas, "plic"), papel (folha virando, estalos), pincel e bico de pena (jato, pincelada), madeira oca (chute, carimbo), vidro (tinteiro), plástico (caneta sem carga) e borracha (apagar). Nada de laser, explosão ou bipe eletrônico.
- **Música (instrumental, acústica e "de brinquedo"):** pizzicato de cordas, contrabaixo dedilhado, piano de brinquedo, marimba, glockenspiel, clarinete e bateria de vassourinha; a capa usa caixinha de música e celesta, o capítulo 2 sanfona e assobio, o chefe tuba, tímpano e bloco de madeira. Andamento de 96–150 bpm com swing leve, tonalidades maiores; o chefe vai para ré menor.
- **Um tema só:** os dois capítulos tocam a mesma melodia em roupas diferentes (Fá com piano de brinquedo; Sol com assobio e sanfona), e a capa toca uma versão lenta. O chefe tem tema próprio.
- **Mesma banda nas vinhetas:** arena limpa, capítulo, começo, fim de jogo e a derrota do chefe usam os timbres da trilha.
- **Hierarquia na mixagem:** o próprio jogador na frente (sons de outros jogadores a 55%), perigos com aviso sonoro claro, música por baixo (barramento separado, 50% por padrão) e um limitador suave no fim, para 5 jogadores atirando juntos não estourarem.
- **Durações:** ações repetidas curtas (0,1–0,4 s), reações de 0,5–1 s, vinhetas de 2–5 s e trilhas em loop de 25–40 s.
- **Panorama:** a posição na arena move o som até 60% para o lado; nada fica preso num canal só.

## Inventário

Prioridade: **P0** = primeiro lote (validar a identidade); **P1** = completa o jogo; **P2** = acabamento. "Loop" indica repetição contínua. A duração é a do arquivo, com a cauda do reverb.

### Jogadores

| Arquivo | Evento | Descrição | Duração | Variações | Loop | Prioridade | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tiro` | Atirar tinta (o próprio ao apertar; os outros quando a gota aparece) | Clique do bico de pena, jato estreito descendo e o "plic" da gota | 0,4 s | 4 | não | P0 | feito |
| `pulo` | Sair do chão | Pincelada para cima com as cerdas raspando | 0,16 s | 3 | não | P0 | feito |
| `pouso` | Tocar o chão (volume pela altura da queda) | Baque abafado com estalo de papel | 0,13 s | 3 | não | P0 | feito |
| `derrubado` | Jogador derrubado | Respingo de nanquim e um apito que murcha | 0,95 s | 1 | não | P0 | feito |
| `resgate` | Jogador levantado (resgate ou renascimento) | Pizzicato subindo e brilho de papel picado | 1,2 s | 1 | não | P0 | feito |
| `tinta-vazia` | Atirar sem tinta (difícil), no lugar do tiro | Dois cliques de caneta retrátil e um sopro seco, sem bolha | 0,09 s | 2 | não | P1 | feito |
| `recarga` | Tinta subindo no tubo (difícil, só o próprio jogador) | Bolhas e sucção abafada de tinta enchendo o pote | 1,2 s | 1 | sim, enquanto a tinta sobe | P1 | feito |
| `protecao` | Proteção do fácil quebrou (toque sem derrubar) | Bolha estourando, ar escapando e dois toques de vidro descendo | 0,64 s | 1 | não | P1 | feito |
| `estrela` | Invencibilidade (enquanto dura) | Brilho de sinos em loop discreto | 6 s | 1 | sim | P2 | pendente |
| `entrou` | Outro jogador entrou na sala | Dois toques de marimba | 0,4 s | 1 | não | P2 | pendente |

### Inimigos e bola

| Arquivo | Evento | Descrição | Duração | Variações | Loop | Prioridade | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `encharcar` | Gota acerta um inimigo | Respingo molhado com bolhas e baque curto | 0,5 s | 3 | não | P0 | feito |
| `bola` | Inimigo vira bola de tinta | "Glup" subindo de tom com tremido de líquido e um "plop" | 0,7 s | 2 | não | P0 | feito |
| `chute` | Bola chutada | Pancada oca de madeira e zunido da bola saindo | 0,55 s | 2 | não | P0 | feito |
| `estouro` | Bola estoura / inimigo derrubado pela bola | Estouro molhado, pingos e três notas de sino; num combo, cada estouro sobe de altura | 0,9 s | 3 | não | P0 | feito |
| `escapou` | Inimigo sai da bola | Três respingos de sacudida e um "boing" | 0,65 s | 2 | não | P1 | feito |
| `chegada` | Inimigo novo cai na página | Assobio curto descendo e o "ploc" do pingo | 0,63 s | 2 | não | P1 | feito |
| `aviso` | Aviso de habilidade perigosa (bote da traça e do grampo, pancada do saltador, cuspe do tinteiro); o giro da borracha não usa | Caneta batendo no papel, acelerando e subindo | 0,57 s | 1 | não | P1 | feito |
| `pancada` | Saltador pousa a pancada | Baque grave com madeira e a onda de tinta correndo | 0,87 s | 1 | não | P1 | feito |
| `cuspe` | Tinteiro cospe | Tilintar de vidro, gole de nanquim e a cuspida | 0,6 s | 2 | não | P1 | feito |
| `apagar` | Borracha apaga uma gota | Dois traços de borracha, o rangido e o farelo caindo | 0,46 s | 2 | não | P1 | feito |
| `borrao` | O borrão chega (tempo esgotado) | Mancha grave se espalhando, bolhas fundas e clarinete descendo | 2,4 s | 1 | não | P1 | feito |
| `mancha` | Mancha do borrão: o pingo caindo (mais leve e agudo) e quando fica perigosa; também o borrão da chuva do chefe | Pingo pesado de nanquim | 0,47 s | 2 | não | P1 | feito |
| `grampo` | Grampo corre (passos) | Tique metálico de grampeador | 0,1 s | 3 | não | P2 | pendente |
| `fio` | Fiandeira sobe ou desce | Corda dedilhada esticando | 0,5 s | 2 | não | P2 | pendente |

### Chefe (Mata-Borrão)

| Arquivo | Evento | Descrição | Duração | Variações | Loop | Prioridade | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `chefe-entrada` | Primeira batida no chão | Carimbo enorme na mesa e um acorde grave de tuba, tímpano e clarinete | 1,9 s | 1 | não | P1 | feito |
| `chefe-carimbo` | As outras batidas | Carimbo de madeira com feltro e o papel tremendo | 1 s | 2 | não | P1 | feito |
| `chefe-aviso` | Começo de cada golpe (carimbada, onda, chuva) | Madeira rangendo cada vez mais rápido e agudo | 0,75 s | 1 | não | P1 | feito |
| `chefe-golpe` | Bola acerta o chefe | Pancada molhada e abafada em feltro com sino | 0,8 s | 2 | não | P1 | feito |
| `chefe-pesado` | Medidor cheio: fica pesado 3 s | Gemido descendo e bolhas grossas | 1,35 s | 1 | não | P1 | feito |
| `chefe-derrota` | Chefe derrotado (substitui a vinheta de arena limpa na página dele) | Respingos em cascata, rufo e o acorde da banda | 3 s | 1 | não | P1 | feito |
| `chuva` | Borrão da chuva cai | Por enquanto usa `mancha` | 0,4 s | 3 | não | P2 | pendente |

### Itens e interface

| Arquivo | Evento | Descrição | Duração | Variações | Loop | Prioridade | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `item` | Pegar um item | Kalimba subindo o acorde de Fá e brilho | 1,1 s | 1 | não | P0 | feito |
| `item-surge` | Item aparece | Pingo claro e um toque de glockenspiel | 0,4 s | 1 | não | P2 | pendente |
| `clique` | Botões do menu | Clique de caneta retrátil | 0,08 s | 2 | não | P2 | pendente |

### Fases e vinhetas

| Arquivo | Evento | Descrição | Duração | Variações | Loop | Prioridade | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `comecar` | Anfitrião começa a partida (aquecimento → jogo) | Três toques de bloco subindo e o acorde de largada | 2,8 s (1,5 s de som) | 1 | não | P1 | feito |
| `arena-limpa` | Arena limpa (fora da página do chefe) | Subida em tercinas no piano de brinquedo, acorde com glockenspiel | 2,1 s | 1 | não | P0 | feito |
| `pagina` | Virada de página | Folha deslizando, estalos e o ar da página assentando | 1,1 s | 1 | não | P0 | feito |
| `capitulo` | Capítulo concluído | Fanfarra da banda: subida, pergunta e resposta, acorde com rufo e sinos | 4,8 s | 1 | não | P1 | feito |
| `fim-de-jogo` | Equipe sem vidas ou desistência | Quatro notas descendo em cromático (clarinete e tuba) e um "ploc" | 3,1 s | 1 | não | P1 | feito |

### Música

| Arquivo | Momento | Descrição | Duração | Loop | Prioridade | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `caderno-base` + `caderno-camada` | Capítulo 1 (Caderno), incluindo o aquecimento | Fá maior, 136 bpm, swing; base: baixo, pizzicato, piano de brinquedo e vassourinha; camada: marimba, clarinete, ganzá e palmas | 28,2 s | sim | P0 | provisória (procedural) |
| `partituras-base` + `partituras-camada` | Capítulo 2 (Partituras e mapas), incluindo o aquecimento | O mesmo tema em Sol, 140 bpm; assobio na melodia, sanfona nos contratempos; camada: marimba, celesta, ganzá e palmas | 27,4 s | sim | P1 | provisória (procedural) |
| `chefe-base` + `chefe-camada` | Página do Mata-Borrão | Ré menor, 150 bpm, marcha de vilão engraçado: tuba, tímpano, pizzicato grave, clarinete, bloco e piano espetando; camada (da 2ª fase dele): marimba em semicolcheias, ganzá, palmas e rufos | 25,6 s | sim | P1 | provisória (procedural) |
| `capa-base` | Capa e menu | O tema lento na caixinha de música, celesta em arpejo, baixo em mínimas, sem bateria e sem camada | 40 s | sim | P1 | provisória (procedural) |

## Como os arquivos são feitos

### Efeitos e trilhas: síntese procedural (este repositório)

Todos os efeitos e as quatro trilhas são sintetizados por código em `audio/`, sem amostras de terceiros:

| Arquivo | Conteúdo |
| --- | --- |
| `audio/dsp.ts` | Primitivas: ruído com semente, biquad variável, envelopes, bolha (Minnaert), corda dedilhada (Karplus-Strong), sino FM, modos de madeira e metal, osciladores, reverb Schroeder |
| `audio/instrumentos.ts` | A banda: pizzicato, contrabaixo, piano de brinquedo, marimba, glockenspiel, clarinete, caixinha de música, celesta, sanfona, assobio, tuba, tímpano, bloco, bumbo, vassourinha, chimbal, palmas e ganzá |
| `audio/sfx.ts` | Receitas dos efeitos e das vinhetas: camadas, parâmetros, variações, volume no jogo, intervalo mínimo e loop |
| `audio/musica.ts` | Harmonia, melodia e arranjo das trilhas, e a renderização em loop |
| `audio/gerar.ts` | Masters + catálogo do cliente + relatório de verificação |
| `audio/codificar.sh` | Conversão para OGG e MP3 |

Para refazer tudo:

```bash
node audio/gerar.ts
```

```bash
bash audio/codificar.sh
```

- `node audio/gerar.ts tiro pulo` refaz só os nomes indicados; o catálogo sai completo do mesmo jeito.
- A semente é fixa por nome e variação, então o mesmo código gera o mesmo arquivo.
- **Masters:** `audio/masters/` em WAV 48 kHz, 24 bits (efeitos mono, música estéreo), pico em −1 dBFS. Ficam fora do Git (`.gitignore`), porque são refeitos de forma determinística a partir do código.
- **Nível das trilhas:** a base de toda trilha fica em −19 dBFS RMS (o pico da soma das camadas limita a −1 dBFS), para a troca de trilha não mudar o volume.
- **Jogo:** `apps/client/public/audio/{sfx,musica}/`, cada som em OGG Vorbis (q4 nos efeitos, q5 na música) e MP3 (96 kb/s mono nos efeitos, 160 kb/s na música). O navegador usa OGG quando sabe tocar; senão, MP3.
- **Catálogo:** `apps/client/src/audio/catalogo.ts` é gerado (nomes, variações, volume, intervalo mínimo, loop, duração das trilhas e se têm camada). Não edite à mão.
- **Loop sem emenda:** a cauda que passa do fim (notas e reverb) é somada de volta ao começo. Nas trilhas, a pré-rolagem de 50 ms guarda as notas adiantadas pela humanização, e as duas camadas têm exatamente o mesmo comprimento e começam juntas. O mesmo vale para o efeito contínuo `recarga`.
- **Codificação:** o `ffmpeg` roda num container descartável (`alpine:3.22` + pacote oficial `ffmpeg`), sem rede, sem root, só leitura, com a pasta do projeto montada. Nada é instalado no Windows.

### Efeitos com ElevenLabs Sound Effects (opcional, pendente de autorização)

Os efeitos sintetizados cobrem bem o que é tinta, papel e madeira. O ElevenLabs pode melhorar sons de textura difícil de sintetizar: borracha, grampeador, carimbo de feltro e vidro do tinteiro. É serviço pago, então só com autorização e a chave em variável de ambiente (`ELEVENLABS_API_KEY`, nunca no código nem no Git).

Parâmetros sugeridos para todos: `output_format: "pcm_48000"` (vira master WAV), `prompt_influence: 0.6`, 4 gerações por prompt para escolher e editar. Prompts (em inglês, que o modelo segue melhor):

| Arquivo | `duration_seconds` | Prompt |
| --- | --- | --- |
| `apagar` | 0.5 | Close-up foley of a soft pink rubber eraser rubbing quickly back and forth on thick paper, two short strokes, crumbs falling, dry, no reverb |
| `grampo` | 0.5 | Tiny metal stapler click, light and springy, single dry tick, close microphone, no room |
| `chefe-carimbo` | 1.0 | Huge wooden rubber stamp slammed onto a felt desk pad, deep thud with wooden knock, short paper rattle, cartoonish but not violent |
| `cuspe` | 0.6 | Small glass ink bottle tipping and spitting a gulp of thick ink, wet glug and splat on paper |
| `recarga` | 1.0 | Thick ink being sucked up into a fountain pen converter, soft gurgling, bubbles, close-up, loopable texture |
| `borrao` | 2.0 | Large blob of black ink slowly spreading across paper, wet creeping squelch with low rumble, ominous but playful |

Depois de gerar: escolher a melhor tomada, cortar no Audacity (seção abaixo), salvar como `audio/masters/sfx/<nome>-<n>.wav` e acrescentar a entrada em `audio/sfx.ts` (com uma receita que lê o arquivo) antes de codificar.

### Trilha final com Suno (pendente; interface manual)

As quatro trilhas procedurais são provisórias e servem para validar andamento, timbres e mixagem. Para a versão final, os prompts abaixo vão para o Suno no **modo Custom**, com **Instrumental** ligado. Os nomes de artistas ou jogos ficam de fora: a referência ao Snow Bros é só de ritmo, e o projeto proíbe copiar.

| Faixa | Style of Music | Título |
| --- | --- | --- |
| Capítulo 1 | `playful chamber ragtime, pizzicato strings, upright bass, toy piano lead, marimba, brushed snare, light swing, 136 bpm, F major, bouncy, cheerful, cartoon arcade, instrumental, no vocals` | Riscote - Caderno |
| Capítulo 2 | `whimsical folk chamber, accordion lead, whistling melody, pizzicato strings, upright bass, glockenspiel, brushed drums, 140 bpm, G major, adventurous, map-reading mood, instrumental, no vocals` | Riscote - Partituras e mapas |
| Chefe | `quirky villain march, bass clarinet, tuba, low pizzicato, wooden percussion, timpani, toy piano stabs, 150 bpm, D minor, tense but funny, cartoon boss battle, instrumental, no vocals` | Riscote - Mata-Borrão |
| Capa | `gentle music box and celesta, soft pizzicato, warm upright bass, 96 bpm, F major, cozy, sketchbook, inviting, instrumental, no vocals` | Riscote - Capa |

Na caixa de letra, com o modo Instrumental ligado, a estrutura pode ir como marcação, sem palavras cantadas:

```
[Intro - 2 bars]
[Main Theme - 8 bars]
[Main Theme Variation - 8 bars]
[Bridge - 8 bars]
[Main Theme - 8 bars]
[Outro - ends on tonic, no fade]
```

Para cada faixa, gerar 4 versões, escolher pelo ritmo e pela clareza (a melodia não pode cobrir os efeitos) e, quando houver, usar **Get Stems** para separar percussão e acompanhamento (vira a camada de intensidade).

**Exportação e preparação (Audacity):**
1. No Suno, **Download → WAV** (o MP3 serve se o plano não tiver WAV).
2. No Audacity, abrir o WAV, **Faixas → Reamostrar** para 48000 Hz, e ligar a grade em compassos (Andamento do projeto = bpm da faixa).
3. Escolher um trecho de 8 ou 16 compassos sem a introdução nem o final. Começo e fim exatamente em uma cabeça de compasso (**Seleção → Região → Encaixar na grade**).
4. Testar a emenda com **Reproduzir em loop** (Shift+Espaço). Se estalar, copiar os 2 últimos segundos da música original depois do trecho, aplicar **Efeito → Crossfade de faixas** com o começo e colar por cima do início.
5. **Efeito → Normalizar** com pico em −1 dB e sem corrigir DC. Conferir em **Análise → Contrast** que não há saturação.
6. **Arquivo → Exportar → WAV, 24 bits**, como `audio/masters/musica/<nome>-base.wav` (e `<nome>-camada.wav` com as stems, com o mesmo início e comprimento).
7. Rodar `bash audio/codificar.sh` e atualizar a duração do loop em `MUSICAS` (quando a primeira faixa externa chegar, o gerador ganha uma lista de masters externos para não sobrescrevê-los).

### Edição e conferência no Audacity (para qualquer arquivo novo)

- Cortar o silêncio do começo: o ataque precisa vir nos primeiros 5 ms.
- Fade-out de 5–10 ms no fim, para não estalar.
- Pico em −1 dBFS no master; o equilíbrio entre sons fica em `volume` no catálogo, não no arquivo.
- Para loops, conferir a emenda com Reproduzir em loop antes de exportar.

## Integração no jogo

- `apps/client/src/audio/som.ts`: Web Audio com barramentos de música e efeitos sob um volume geral, e um limitador suave no fim.
  - O contexto nasce no primeiro clique, tecla ou toque (regra de autoplay dos navegadores). Até lá, nada toca e nada quebra.
  - Os efeitos são baixados e decodificados nesse momento (cerca de 680 KB em OGG); cada trilha, só quando é pedida (0,5–1,1 MB).
  - Variação sorteada sem repetir a anterior, desvio de ±3% na altura dos sons repetidos, até 6 vozes por som e intervalo mínimo por jogador.
  - Sons de outros jogadores a 55%. Panorama pela posição na arena.
  - `hold` toca um som contínuo enquanto a condição vale (a recarga), e a cena solta todos ao recomeçar.
  - Aba escondida suspende o contexto (o jogo também congela).
  - O Phaser roda com `audio: { noAudio: true }`, sem abrir um segundo contexto.
- `apps/client/src/audio/controles.ts`: painel "Som" com Música e Efeitos (0–100%, curva de potência), um botão para **ligar e desligar a música** e outro para **ligar e desligar os efeitos** (separados; com a música desligada, nenhuma trilha é baixada) e o "Sem som". As preferências ficam no `localStorage` deste navegador.
- Eventos, nos mesmos pontos que já disparam os efeitos visuais (o som só lê o que a simulação mostrou):
  - `anim.ts`: pulo, pouso, derrubado, resgate, encharcar, bola, chute, estouro (combo sobe a altura), escapou, chegada, borrão, aviso, pancada, cuspe e apagar;
  - `bossView.ts`: entrada, carimbo, aviso, golpe, pesado, derrota e o borrão da chuva caindo;
  - `OnlineScene.ts`: tiro ou tinta vazia, recarga, proteção, item, manchas, as vinhetas por fase e a trilha;
  - `online.ts`: a trilha da capa na capa e ao voltar para ela.
- Trilhas: `capa` na capa; na sala, a do capítulo (`caderno` ou `partituras`, já no aquecimento) e `chefe` na página do Mata-Borrão. A camada entra com o borrão (`hurry`) e quando o chefe chega a 60% da vida (a 2ª fase dele). A música abaixa para 30% nas vinhetas e no fim de jogo.

## Origem e licença

| Material | Origem | Licença |
| --- | --- | --- |
| Todos os efeitos e as trilhas `caderno`, `partituras`, `chefe` e `capa` | Sintetizados pelo código de `audio/`, escrito para o projeto em 2026-10-21; sem amostras, gravações ou trechos de terceiros | Do projeto, como o restante do código |
| Melodias e harmonias | Compostas nota a nota em `audio/musica.ts` e `audio/sfx.ts` | Do projeto |
| Ferramentas | `ffmpeg`, `libvorbis` e `libmp3lame` do Alpine, usados só para converter; não entram no jogo | Não se aplicam aos arquivos gerados |
| ElevenLabs (futuro) | Se autorizado | Os termos dependem do plano: conferir na hora o uso comercial e a atribuição exigida no plano gratuito |
| Suno (futuro) | Se autorizado | Nos planos pagos, quem gera fica com a música e pode usar comercialmente; no gratuito, não. Conferir os termos vigentes e guardar o link da faixa e a data |

Cada arquivo externo novo deve entrar nesta tabela com serviço, data, plano, prompt e link.

## Validação

**Automática (feita em 2026-10-21):**
- `node audio/gerar.ts`: os 32 efeitos (53 arquivos com variações) com pico em −1 dBFS e ataque no primeiro 1,5 ms, exceto a página (8 ms, de propósito) e o começo (3,5 ms). Nada passa de 0 dBFS depois da normalização.
- Emendas dos loops: o salto entre a última e a primeira amostra fica entre os percentis 8 e 98 dos saltos do próprio som (`recarga` 97,7; trilhas entre 8 e 96), ou seja, um passo comum e não um estalo.
- Nível das bases das trilhas: −19,2 a −20,3 dBFS RMS.
- No Chrome do painel, com servidor e cliente locais:
  - a capa toca `capa` (uma fonte, sem pedir camada); a sala do capítulo 2 no aquecimento toca `partituras` com as duas camadas;
  - os 53 arquivos de efeito e as trilhas decodificam sem falha e respondem 200;
  - numa partida real (primeiro lote): pulo, pouso, tiro, encharcar, derrubado e resgate; no capítulo 2: começo e chegada;
  - com estados sintéticos nos mesmos métodos do jogo (cena pausada), porque o painel ficou escondido e o jogo rodava a 2 quadros/s:
    - inimigos: chegada, borrão, aviso do bote, pancada, cuspe, escapou, apagar; o giro da borracha não avisa;
    - manchas e proteção: as duas manchas; proteção só quando o toque não derruba;
    - recarga: liga em loop com a tinta subindo e solta quando ela para; não toca quando o tanque enche de uma vez (renascimento);
    - fases: começo, arena limpa, virada, capítulo e fim de jogo; nada na página do chefe limpa nem ao recomeçar;
    - trilhas: capítulo 1 → `caderno`, capítulo 2 → `partituras`, chefe → `chefe`; a camada entra com o borrão e com o chefe a 50% da vida, não a 80%;
    - chefe (o `BossView` do próprio jogo): entrada, aviso, carimbo, golpe, pesado, borrão da chuva e derrota;
  - desligar a música para a trilha e zera o barramento; desligar os efeitos zera o barramento e nada toca; religar volta ao normal;
  - nenhum erro de áudio no console.
- `pnpm typecheck`, `pnpm test` (208 + 55) e `pnpm client:build` passaram; o build leva os 106 arquivos de efeitos e os 14 das trilhas para `dist/`.

**Auditiva:** o usuário ouviu e aprovou a identidade no primeiro lote. Os sons P1 e as trilhas novas ainda não foram ouvidos por ninguém; o agente não consegue ouvir.

## Pendências

1. **Escuta dos P1** pelo usuário, de preferência numa partida real com amigos.
2. Produzir os P2 do inventário.
3. ElevenLabs: só com autorização e `ELEVENLABS_API_KEY`.
4. Suno: geração manual pelos prompts acima, exportação e preparo no Audacity.
5. Teste com 5 jogadores reais e em celular (Safari usa o MP3; conferir a emenda dos loops lá).
6. A sequência de partida completa até o chefe não rodou no navegador em tempo real (o painel estava escondido).
