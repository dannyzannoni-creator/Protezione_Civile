import { defineConfig, type Plugin } from 'vite';

/**
 * Plugin che rimuove `type="module"` e `crossorigin` dallo script principale e dal foglio stile,
 * consentendo l'apertura diretta di `/dist/index.html` anche tramite protocollo `file://`
 * oltre che tramite server HTTP (`npm run preview` o `npm start`).
 */
function compatFileProtocolPlugin(): Plugin {
  return {
    name: 'compat-file-protocol',
    enforce: 'post',
    transformIndexHtml(html: string): string {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, '<link rel="stylesheet" href="$1">');
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api/sensori': {
        target: 'https://allertameteo.regione.emilia-romagna.it',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/sensori/, '/o/api/allerta/get-sensor-values-no-time'),
      },
      '/api/serie-stazione': {
        target: 'https://allertameteo.regione.emilia-romagna.it',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/serie-stazione/, '/o/api/allerta/get-time-series/'),
      },
    },
  },
  preview: {
    proxy: {
      '/api/sensori': {
        target: 'https://allertameteo.regione.emilia-romagna.it',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/serie-stazione/, '/o/api/allerta/get-time-series/')
            .replace(/^\/api\/sensori/, '/o/api/allerta/get-sensor-values-no-time'),
      },
      '/api/serie-stazione': {
        target: 'https://allertameteo.regione.emilia-romagna.it',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/serie-stazione/, '/o/api/allerta/get-time-series/'),
      },
    },
  },
  plugins: [compatFileProtocolPlugin()],
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
