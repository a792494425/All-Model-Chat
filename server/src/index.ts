import { loadConfig } from './config.js';
import { attachLiveWsUpgrade, createServer } from './createServer.js';

const config = loadConfig();
const server = createServer(config);
attachLiveWsUpgrade(server, config);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`API server listening on port ${config.port}`);
  if (config.enableMcpStdio) {
    console.warn(
      '[mcp] ENABLE_MCP_STDIO is on: any client that can reach this port can run arbitrary commands through stdio MCP servers. Keep the port internal (docker expose / localhost only).',
    );
  }
});

const handleShutdown = (signal: string) => {
  console.log(`API server received ${signal}, closing gracefully...`);
  server.close(() => {
    console.log('API server closed cleanly');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('API server forced exit after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
