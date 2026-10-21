# Riscote em Docker

O servidor de partidas e o cliente rodam em containers, no Docker Desktop deste PC ou num Orange Pi. As imagens são construídas para `linux/amd64` e `linux/arm64`.

| Serviço | Imagem | Porta no computador |
| --- | --- | --- |
| `server`: partidas (Node rodando o TypeScript direto) | `riscote-server` | 2567 |
| `client`: página compilada servida pelo nginx | `riscote-client` | 4173 (`RISCOTE_CLIENT_PORT` muda) |
| `tunel-servidor`, `tunel-cliente`: túneis rápidos da Cloudflare | `cloudflare/cloudflared` | só com `--profile tunel` |
| `tunel-dominio`: túnel nomeado em riscote.win | `cloudflare/cloudflared` | só com `--profile dominio` |

## Subir e parar (raiz do projeto)

```powershell
docker compose up -d --build
```

Abra http://localhost:4173. O cliente procura o servidor em `ws://<mesmo endereço>:2567`.

```powershell
docker compose logs -f server
docker compose down
```

Os relatórios de cada arena e as métricas do processo saem no log do `server` (uma linha JSON cada).

## Variáveis (no terminal antes do `docker compose`, ou num arquivo `.env` local)

- `RISCOTE_BIND`: interface das portas publicadas. Padrão `127.0.0.1`, só este computador. `0.0.0.0` abre para a rede local; não use no Orange Pi (ver abaixo).
- `RISCOTE_CLIENT_PORT`: porta do cliente (padrão 4173).
- `RISCOTE_IP_HEADER`: cabeçalho com o IP real do jogador, só atrás de um proxy confiável (`cf-connecting-ip` com o túnel). Sem ele, o limite de 20 entradas por minuto conta por endereço do socket. No Docker Desktop do Windows, todos os jogadores podem chegar com o mesmo endereço do Docker.
- `RISCOTE_METRICS`: `1` (padrão) grava métricas do processo a cada 10 s.
- `RISCOTE_MAX_ROOMS`: salas abertas ao mesmo tempo (padrão 20, ou seja, 100 jogadores). Acima disso, criar sala recebe "servidor cheio"; entrar pelo código numa sala que já existe continua valendo. `0` desliga (só para teste de carga).
- `CLOUDFLARE_TUNNEL_TOKEN`: token do túnel nomeado em riscote.win (só no `.env`; ver `docs/playtest-remoto.md`).

## Capacidade (limite de salas)

Medição de 2026-10-21 com `apps/server/scripts/carga.ts` (5 robôs por sala, todas na fase mais pesada, o Andaime, com o borrão entrando). Robôs e servidor no mesmo PC de desenvolvimento (i5-12400F, com outras aplicações abertas), servidor em Node fora do Docker:

| Salas (jogadores) | CPU do processo (1 núcleo) | Memória | Tick máximo | Situação |
| --- | --- | --- | --- | --- |
| 40 (200) | 25–29% | 130–160 MB | até ~5 ms, um pico de 28 ms (coleta de lixo) | folga |
| 80 (400) | 32–38% | 165–220 MB | < 1,5 ms | folga |
| 160 (800) | 88–90% | ~307 MB | ~2 ms | no limite |
| 200 (1000) | 93–98% | 309–326 MB | 12–35 ms (passa dos 16,7 ms de um tick) | saturado: a partida atrasa |

Cada sala gasta cerca de 0,5% de um núcleo deste PC e 1,5 a 2 MB. A memória não volta toda quando as salas fecham.

### No Orange Pi 5 (a máquina que vale)

Medição de 2026-10-21 no próprio Pi, sem mexer no jogo no ar:
- um container separado (`riscote-carga`), com a mesma imagem e os mesmos limites, em `127.0.0.1:2610`;
- robôs saindo do PC por um túnel SSH, 60 s por nível, e o servidor reiniciado entre os níveis;
- CPU pela métrica do processo e pelo `docker stats` do container;
- o jogo no ar (`riscote-server-1`) ficou em 0,4 a 1,4% de CPU o tempo todo.

| Salas (jogadores) | CPU do processo (1 núcleo A76) | Memória | Tick máximo | Situação |
| --- | --- | --- | --- | --- |
| 20 (100) | 40–47% | ~115 MB | 1–6 ms | folga |
| 30 (150) | 53–58% | ~115 MB | 1,4–3,2 ms | folga mínima |
| 40 (200) | 69–85%, pico de 94% | ~118 MB | até 3 ms; atraso p99 do laço subindo para 23–25 ms | acima do critério |

No Pi, cada sala custa cerca de 2% de um núcleo, umas três vezes o do PC. A memória não é o gargalo: são ~118 MB com 40 salas, para um limite de 384 MB.

O padrão é **20 salas (100 jogadores)**, decisão do usuário em 2026-10-21. Pela medição, 30 salas ainda ficariam abaixo de ~60% de um núcleo, com tick máximo abaixo de 5 ms. O usuário preferiu ficar em 20, com mais folga para o chefe, a coleta de lixo e os containers do XBrainia.

Para subir o limite, meça de novo no Pi do mesmo jeito: `RISCOTE_MAX_ROOMS=0` e `RISCOTE_JOIN_LIMIT=0` no container de carga, que deve ser removido no fim.

## Placar de recordes (volume `riscote_dados`)

O servidor guarda os 15 melhores de cada dificuldade em `/dados/recordes.json`, no volume nomeado `dados` do compose (no Docker, `riscote_dados`). É o único caminho gravável do container; o resto continua só leitura. A imagem cria `/dados` com dono `node`, e um volume novo herda esse dono.

- Sobrevive a `docker compose down`, a `up -d --build` e à troca de imagem. Só `docker compose down -v` ou `docker volume rm riscote_dados` apagam.
- Gravação atômica: o servidor escreve `recordes.json.tmp` e renomeia. Se o arquivo estiver ilegível ao subir, ele é guardado como `recordes.json.ilegivel-<data>` e o placar recomeça vazio; linhas adulteradas (pontuação ou nome inválido) são descartadas ao carregar.
- Fora do Docker, a pasta é `apps/server/dados/` (fora do Git); `RISCOTE_DATA_DIR` troca.

Ver o placar e fazer cópia (PC ou Pi, na pasta do projeto):

```sh
docker compose exec server cat /dados/recordes.json
docker run --rm -v riscote_dados:/dados:ro -v "$PWD":/copia alpine cp /dados/recordes.json /copia/recordes-copia.json
```

Restaurar uma cópia: pare o servidor, copie o arquivo para dentro do volume e suba de novo.

```sh
docker compose stop server
docker run --rm -v riscote_dados:/dados -v "$PWD":/copia alpine sh -c 'cp /copia/recordes-copia.json /dados/recordes.json && chown 1000:1000 /dados/recordes.json'
docker compose start server
```

## Playtest pela internet

Ver `docs/playtest-remoto.md`.

## Orange Pi

Em uso desde 2026-10-20: Orange Pi 5 (`192.168.15.7`), conta de deploy `codex` (SSH só por chave, `~/.ssh/orangepi5-codex`), projeto em `/home/codex/riscote`. O Pi também roda os containers do XBrainia; as regras dele (baixo consumo, publicações em `127.0.0.1`, filtro nftables) estão em `xbrainia/AGENTS.md` e `xbrainia/docs/SEGURANCA-ORANGEPI.md`.

As imagens do riscote são construídas aqui e levadas prontas; o Pi só baixa a imagem oficial do `cloudflared` (`docker compose --profile dominio pull tunel-dominio`):

```powershell
docker buildx build --platform linux/arm64 --target server -t riscote-server:arm64 --load .
docker buildx build --platform linux/arm64 --target client -t riscote-client:arm64 --load .
docker save --platform linux/arm64 -o riscote-arm64.tar riscote-server:arm64 riscote-client:arm64
scp -i ~/.ssh/orangepi5-codex riscote-arm64.tar compose.yaml codex@192.168.15.7:riscote/
```

No Pi (`ssh -i ~/.ssh/orangepi5-codex codex@192.168.15.7`), confira o `sha256sum` do arquivo contra o do PC e então:

```sh
cd ~/riscote
docker load -i riscote-arm64.tar && rm riscote-arm64.tar
docker tag riscote-server:arm64 riscote-server:latest
docker tag riscote-client:arm64 riscote-client:latest
docker compose --profile dominio up -d --no-build --pull never
```

O placar de recordes fica no volume `riscote_dados` do próprio Pi (ver acima): levar imagens novas e o `compose.yaml` não mexe nele. Na primeira subida com o placar, o volume é criado sozinho.

Sem o perfil `dominio`, o túnel fica parado e o jogo só responde pelo encaminhamento SSH.

Para jogar a partir do PC sem abrir nada na LAN, encaminhe as portas por SSH e use http://localhost:4173:

```powershell
ssh -i ~/.ssh/orangepi5-codex -N -L 127.0.0.1:2567:127.0.0.1:2567 -L 127.0.0.1:4173:127.0.0.1:4173 codex@192.168.15.7
```

Lá as portas ficam em `127.0.0.1`. Não use `RISCOTE_BIND=0.0.0.0` no Pi: a entrada pública é o túnel (`--profile dominio`, com o `.env` em `~/riscote`).

O cliente é compilado sempre na arquitetura de quem constrói (o resultado é só HTML e JS); só o servidor depende da arquitetura.

## Por que a imagem é assim

- O Node não remove tipos de arquivos dentro de `node_modules`. Por isso a imagem mantém o workspace do pnpm com o `@riscote/shared` ligado por link, em vez de usar `pnpm deploy`, que copia o pacote para dentro de `node_modules`.
- `init: true` no compose: o Node como processo 1 não trata o sinal de parada, e o `docker compose down` esperaria 10 s.
- Todos os containers rodam sem root, com sistema de arquivos só de leitura (`/tmp` em memória), sem capabilities, com `no-new-privileges` e com limites de memória e de processos. O cliente usa `nginx-unprivileged`, que ouve na 8080. Se um serviço novo precisar gravar, dê a ele um volume ou tmpfs próprio em vez de tirar o `read_only`.
