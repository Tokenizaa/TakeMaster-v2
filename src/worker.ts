import { httpServerHandler } from 'cloudflare:node';

import { createApiApp } from '../server';

// The Express app remains the canonical API implementation. Cloudflare's
// Node compatibility layer adapts its listener to the Worker fetch runtime.
const app = createApiApp();
app.listen(3000);

export default httpServerHandler({ port: 3000 });
