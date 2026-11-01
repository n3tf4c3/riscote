# Design system do Riscote (Claude Design)

Cartões HTML autocontidos que alimentam o design system do Riscote no Claude Design (claude.ai/design). A arte final nasce lá a partir desta base (decisão de 2026-10-20).

Cada arquivo é um cartão. A primeira linha (`<!-- @dsCard group="…" -->`) define o grupo no painel. Regras:
- sem CDN, fontes remotas ou scripts;
- cores e medidas copiadas do código real: `apps/client/src/art/` (geradores e `svg.ts`), `apps/client/src/capa.css`, `apps/client/index.html`, `apps/client/src/draw.ts`, `packages/shared/src/world.ts` e `packages/shared/src/arenas.ts`;
- os desenhos entram como SVG embutido com ids de sufixo único (vários desenhos na mesma página não podem dividir ids).

| Grupo | Cartões |
| --- | --- |
| Marca | `marca/riscote.html`: premissa, linguagem e o que não copiar |
| Cores | `cores/papel-e-tinta.html`, `cores/jogadores.html` |
| Fundamentos | `fundamentos/camadas.html`, `fundamentos/escala.html`, `fundamentos/tipografia.html` |
| Personagens | `personagens/jogadores.html` (os cinco riscotes de cartum: poses, expressões, auras e tamanho do jogo), `personagens/inimigos.html` (inimigos, estados, encharcado e o Mata-Borrão), `personagens/floresta.html` (os inimigos e o chefe da Floresta), `personagens/biblioteca.html` (os inimigos e o chefe da Biblioteca) |
| Cenário | `cenario/arena-tinta.html` (as páginas dos capítulos e a mesa do chefe, em duas camadas), `cenario/arena.html` (geometria greybox), `cenario/itens.html`, `cenario/efeitos.html`, `cenario/floresta.html`, `cenario/biblioteca.html`, `cenario/jardim.html`, `cenario/oficina.html` e `cenario/castelo.html` (fases novas em protótipo, com camadas de parallax) |
| Interface | `interface/painel.html` |

A primeira arte (pincel de nanquim) nasceu na prancha "Riscote — personagens" (Claude Design, artifact QnTcq5XpucJxr2GPxGfR3t). Em 2026-10-31 a direção mudou para cartum de traço marinho, cor chapada, sombra dura e rostos expressivos, a pedido do usuário. A fonte é o código: os cartões de marca, cores, personagens, cenário e efeitos saem dos geradores de `apps/client/src/art/`; tipografia, painel e camadas são escritos à mão a partir do CSS. Ao mudar um gerador, refaça o cartão correspondente.

## Publicar ou atualizar

Projeto no Claude Design: **Riscote**, do tipo design system, id `4a754692-cd6e-4804-beb7-20057a938092`. Primeira publicação em 2026-10-20. Atualize sempre este projeto; não crie outro.

1. Uma única vez, numa sessão interativa do Claude Code no terminal desta máquina, autorize o acesso ao Claude Design com `/design-login`.
2. Peça ao agente para sincronizar o design system (skill `design-sync-projeto`). O fluxo é sempre ler → planejar → escrever, enviando só o que mudou e sem apagar a curadoria feita lá.

Quando cores ou tamanhos mudarem no código, atualize o cartão correspondente e sincronize de novo.
