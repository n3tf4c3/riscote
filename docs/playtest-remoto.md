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

## Endereço fixo em riscote.win

Um túnel nomeado da Cloudflare (gratuito) publica a página em `https://riscote.win` e o servidor em `wss://play.riscote.win`. Nessa página o cliente já procura o servidor em `play.riscote.win`, sem `?servidor=` no link. O jogo continua rodando neste PC: com os containers parados, o endereço sai do ar.

Feito em 2026-10-20: túnel `riscote`, rodando no Orange Pi (`docs/docker.md`). Para refazer, no painel da Cloudflare (Networking → Tunnels, não o menu Zero Trust):
1. Crie o túnel (ex.: `riscote`) e copie o token do comando de instalação (o texto longo depois de `--token`). Não instale nada pelo painel. O painel só libera as rotas depois que o conector liga: suba o perfil `dominio` antes do passo 2.
2. Adicione duas rotas do tipo *Published application*. O painel cria os registros DNS:
   - `riscote.win` → HTTP → `client:8080`
   - `play.riscote.win` → HTTP → `server:2567`
3. Na raiz do projeto, crie o arquivo `.env` (fora do Git):

   ```
   CLOUDFLARE_TUNNEL_TOKEN=<token>
   RISCOTE_IP_HEADER=cf-connecting-ip
   ```

Para subir e parar:

```powershell
docker compose --profile dominio up -d --build
docker compose --profile dominio down
```

O token dá acesso ao túnel: quem o tiver publica qualquer coisa nesses endereços. Se vazar, gere outro no painel e troque no `.env`.

## Sem Docker

Ainda funciona com quatro terminais: `pnpm server` (com `RISCOTE_HOST=127.0.0.1` e `RISCOTE_IP_HEADER=cf-connecting-ip`), `pnpm client:build; pnpm client:preview` e dois `cloudflared tunnel --url …` apontando para as portas 2567 e 4173.
