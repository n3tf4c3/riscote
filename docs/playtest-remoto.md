# Playtest remoto por túnel temporário

Para jogar com pessoas em outras redes sem contratar nada nem mexer no DNS de `riscote.win`. O jogo roda no seu PC e o túnel rápido da Cloudflare gera endereços públicos aleatórios `*.trycloudflare.com`, válidos enquanto o comando estiver aberto.

Limitações:
- A latência depende da sua internet, principalmente do upload.
- O túnel rápido não tem garantia de disponibilidade.
- Enquanto os túneis estiverem abertos, o cliente e o servidor de partidas ficam acessíveis pela internet. Feche tudo ao terminar.

## Uma vez só

Instale o `cloudflared`:

```powershell
winget install --id Cloudflare.cloudflared
```

Feche e abra o terminal para o comando entrar no PATH.

## A cada playtest

Use quatro terminais, todos na raiz do projeto. Se houver um servidor de desenvolvimento rodando na porta 2567, pare-o antes.

1. **Servidor de partidas**, ouvindo só local e confiando no IP que a Cloudflare informa:

   ```powershell
   $env:RISCOTE_HOST='127.0.0.1'; $env:RISCOTE_IP_HEADER='cf-connecting-ip'; pnpm server
   ```

2. **Cliente compilado** (mais leve que o modo de desenvolvimento), em http://localhost:4173:

   ```powershell
   pnpm client:build; pnpm client:preview
   ```

3. **Túnel do servidor.** Anote o endereço `https://….trycloudflare.com` que aparece (chamado de **S** abaixo):

   ```powershell
   cloudflared tunnel --url http://localhost:2567
   ```

4. **Túnel do cliente.** Anote o endereço (chamado de **C**):

   ```powershell
   cloudflared tunnel --url http://localhost:4173
   ```

5. Abra `https://C/?servidor=wss://S`, sem o `https://` de S. Exemplo: `https://abc.trycloudflare.com/?servidor=wss://xyz.trycloudflare.com`.
6. Crie a sala, clique em **Copiar convite** e mande o link aos amigos. O convite já leva o endereço do servidor.
7. Ao final de cada arena, **Copiar métricas** guarda os números do playtest.

## Ao terminar

Pare os quatro terminais com Ctrl+C. Os endereços deixam de existir.
