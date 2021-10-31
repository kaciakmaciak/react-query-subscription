import type { ViteDevServer } from 'vite';

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function configureFakeApi(server: ViteDevServer) {
  server.middlewares.use('/api/sse', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    for (let i = 0; i < 1000; i++) {
      const data = {
        number: i + 1,
      };
      await sleep(1000);
      res.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
    }
    res.write(`event: complete\ndata: null\n\n`);
  });
}
