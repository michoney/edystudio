import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-preview', import.meta.url)),
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { host: '127.0.0.1', port: 8767, strictPort: true },
});
await server.listen();
server.printUrls();
