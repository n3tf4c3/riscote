# Design system do Riscote (Claude Design)

Cartões HTML autocontidos que alimentam o design system do Riscote no Claude Design (claude.ai/design). A arte final nasce lá a partir desta base (decisão de 2026-10-20).

Cada arquivo é um cartão. A primeira linha (`<!-- @dsCard group="…" -->`) define o grupo no painel. Regras:
- sem CDN, fontes remotas ou scripts;
- cores e medidas copiadas do código real: `apps/client/src/draw.ts`, `apps/client/index.html`, `packages/shared/src/world.ts` e `packages/shared/src/arenas.ts`.

| Grupo | Cartões |
| --- | --- |
| Marca | `marca/riscote.html`: premissa, linguagem e o que não copiar |
| Cores | `cores/papel-e-tinta.html`, `cores/jogadores.html` |
| Fundamentos | `fundamentos/camadas.html`, `fundamentos/escala.html`, `fundamentos/tipografia.html` |
| Personagens | `personagens/jogadores.html` (figuras de pincel seco, poses, expressões, animação e estados), `personagens/inimigos.html` (inimigos, movimento próprio e ciclo da tinta) |
| Cenário | `cenario/arena-tinta.html` (arena em tinta, em duas camadas), `cenario/arena.html` (geometria greybox), `cenario/itens.html`, `cenario/efeitos.html` (partículas, chacoalhar e transições) |
| Interface | `interface/painel.html` |

A arte aprovada nasceu na prancha "Riscote — personagens" (Claude Design, artifact QnTcq5XpucJxr2GPxGfR3t). Desde 2026-10-20, com o acabamento novo aprovado no jogo, a fonte é o código: os desenhos dos cartões de personagens, itens, efeitos, arena em tinta e marca saem dos geradores de `apps/client/src/art/` (variação 0 da linha viva). Ao mudar um gerador, refaça o cartão correspondente.

## Publicar ou atualizar

Projeto no Claude Design: **Riscote**, do tipo design system, id `4a754692-cd6e-4804-beb7-20057a938092`. Primeira publicação em 2026-10-20. Atualize sempre este projeto; não crie outro.

1. Uma única vez, numa sessão interativa do Claude Code no terminal desta máquina, autorize o acesso ao Claude Design com `/design-login`.
2. Peça ao agente para sincronizar o design system (skill `design-sync-projeto`). O fluxo é sempre ler → planejar → escrever, enviando só o que mudou e sem apagar a curadoria feita lá.

Quando cores ou tamanhos mudarem no código, atualize o cartão correspondente e sincronize de novo.
