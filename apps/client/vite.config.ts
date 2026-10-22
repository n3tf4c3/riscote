import { defineConfig } from 'vite';

// Playtest remoto por túnel temporário da Cloudflare (docs/playtest-remoto.md):
// o Vite recusa nomes de host desconhecidos, então liberamos só os do túnel.
const tunnelHosts = ['.trycloudflare.com'];

// Cada build ganha uma versão; abas abertas comparam a delas com a de versao.json (src/versao.ts).
const versao = Date.now().toString(36);

export default defineConfig({
  server: { allowedHosts: tunnelHosts },
  preview: { allowedHosts: tunnelHosts, port: 4173, strictPort: true },
  define: { __RISCOTE_VERSAO__: JSON.stringify(versao) },
  plugins: [
    {
      name: 'riscote-versao',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao }) });
      },
    },
  ],
});
