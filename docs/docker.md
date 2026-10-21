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
- `CLOUDFLARE_TUNNEL_TOKEN`: token do túnel nomeado em riscote.win (só no `.env`; ver `docs/playtest-remoto.md`).

## Playtest pela internet

Ver `docs/playtest-remoto.md`.

## Orange Pi

Em uso desde 2026-10-20: Orange Pi 5 (`192.168.15.7`), conta de deploy `codex` (SSH só por chave, `~/.ssh/orangepi5-codex`), projeto em `/home/codex/riscote`. O Pi também roda os containers do XBrainia; as regras dele (baixo consumo, publicações em `127.0.0.1`, filtro nftables) estão em `xbrainia/AGENTS.md` e `xbrainia/docs/SEGURANCA-ORANGEPI.md`.

As imagens são construídas aqui e levadas prontas; o Pi não compila nem baixa nada:

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
docker compose up -d --no-build --pull never
```

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
