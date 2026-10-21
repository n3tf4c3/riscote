# Playtest remoto por túnel temporário

Para jogar com pessoas em outras redes sem contratar nada nem mexer no DNS de `riscote.win`. O jogo roda em Docker neste PC (ver `docs/docker.md`) e o túnel rápido da Cloudflare gera endereços públicos aleatórios `*.trycloudflare.com`, válidos enquanto os containers dos túneis estiverem de pé.

Limitações:
- A latência depende da sua internet, principalmente do upload.
- O túnel rápido não tem garantia de disponibilidade.
- Enquanto os túneis estiverem abertos, o cliente e o servidor de partidas ficam acessíveis pela internet. Feche tudo ao terminar.

## A cada playtest

Na raiz do projeto, com o Docker Desktop aberto:

1. Suba tudo, com os túneis e confiando no IP que a Cloudflare informa:

   ```powershell
   $env:RISCOTE_IP_HEADER='cf-connecting-ip'; docker compose --profile tunel up -d --build
   ```

2. Pegue os dois endereços:

   ```powershell
   docker compose logs tunel-servidor tunel-cliente | Select-String trycloudflare
   ```

   O do `tunel-servidor` é **S**; o do `tunel-cliente` é **C**.
3. Abra `https://C/?servidor=wss://S`, sem o `https://` de S. Exemplo: `https://abc.trycloudflare.com/?servidor=wss://xyz.trycloudflare.com`.
4. Crie a sala, clique em **Copiar convite** e mande o link aos amigos. O convite já leva o endereço do servidor.
5. Ao final de cada arena, **Copiar métricas** guarda os números do playtest. Eles também ficam no log: `docker compose logs server | Select-String relatorio`.

## Ao terminar

```powershell
docker compose --profile tunel down
```

Os endereços deixam de existir.

## Sem Docker

Ainda funciona com quatro terminais: `pnpm server` (com `RISCOTE_HOST=127.0.0.1` e `RISCOTE_IP_HEADER=cf-connecting-ip`), `pnpm client:build; pnpm client:preview` e dois `cloudflared tunnel --url …` apontando para as portas 2567 e 4173.
