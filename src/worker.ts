import { httpServerHandler } from 'cloudflare:node';

// iconv-lite's browser mapping removes its Node stream helpers, while the
// Workers Node compatibility layer exposes process.versions.node. Hide that
// Node marker before loading Express so iconv-lite uses its non-Node path.
Object.defineProperty(process.versions, 'node', {
  configurable: true,
  value: undefined,
});

const { createApiApp } = await import('../server');

// The Express app remains the canonical API implementation. Cloudflare's
// Node compatibility layer adapts its listener to the Worker fetch runtime.
const app = createApiApp();
app.listen(3000);

export default httpServerHandler({ port: 3000 });
