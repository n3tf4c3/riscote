import { defineConfig } from 'vite';

// Playtest remoto por túnel temporário da Cloudflare (docs/playtest-remoto.md):
// o Vite recusa nomes de host desconhecidos, então liberamos só os do túnel.
const tunnelHosts = ['.trycloudflare.com'];

export default defineConfig({
  server: { allowedHosts: tunnelHosts },
  preview: { allowedHosts: tunnelHosts, port: 4173, strictPort: true },
});
