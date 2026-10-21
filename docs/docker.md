# Riscote em Docker

O servidor de partidas e o cliente rodam em containers, no Docker Desktop deste PC ou num Orange Pi. As imagens são construídas para `linux/amd64` e `linux/arm64`.

| Serviço | Imagem | Porta no computador |
| --- | --- | --- |
| `server`: partidas (Node rodando o TypeScript direto) | `riscote-server` | 2567 |
| `client`: página compilada servida pelo nginx | `riscote-client` | 4173 (`RISCOTE_CLIENT_PORT` muda) |
| `tunel-servidor`, `tunel-cliente`: túneis rápidos da Cloudflare | `cloudflare/cloudflared` | só com `--profile tunel` |

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

- `RISCOTE_BIND`: interface das portas publicadas. Padrão `127.0.0.1`, só este computador. Use `0.0.0.0` para jogar na rede local, como no Orange Pi.
- `RISCOTE_CLIENT_PORT`: porta do cliente (padrão 4173).
- `RISCOTE_IP_HEADER`: cabeçalho com o IP real do jogador, só atrás de um proxy confiável (`cf-connecting-ip` com o túnel). Sem ele, o limite de 20 entradas por minuto conta por endereço do socket. No Docker Desktop do Windows, todos os jogadores podem chegar com o mesmo endereço do Docker.
- `RISCOTE_METRICS`: `1` (padrão) grava métricas do processo a cada 10 s.

## Playtest pela internet

Ver `docs/playtest-remoto.md`.

## Orange Pi

1. Instale o Docker no Orange Pi (sistema de 64 bits).
2. Copie o repositório e rode `docker compose up -d --build` com `RISCOTE_BIND=0.0.0.0`. A imagem é construída no próprio aparelho.
3. Para construir aqui e levar pronta, gere a imagem para ARM:

   ```powershell
   docker buildx build --platform linux/arm64 --target server -t riscote-server:arm64 .
   docker buildx build --platform linux/arm64 --target client -t riscote-client:arm64 .
   ```

O cliente é compilado sempre na arquitetura de quem constrói (o resultado é só HTML e JS); só o servidor depende da arquitetura.

## Por que a imagem é assim

- O Node não remove tipos de arquivos dentro de `node_modules`. Por isso a imagem mantém o workspace do pnpm com o `@riscote/shared` ligado por link, em vez de usar `pnpm deploy`, que copia o pacote para dentro de `node_modules`.
- `init: true` no compose: o Node como processo 1 não trata o sinal de parada, e o `docker compose down` esperaria 10 s.
