import {createRequire} from 'node:module';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll, type Config} from './tools/index.js';

// Library exports
export type {Config} from './tools/index.js';
export {FreeAgentApi, FREEAGENT_BASE_URLS} from './utils/freeagent-api.js';
export {TokenStore} from './auth/token-store.js';

export const {version} = createRequire(__filename)('../package.json') as {version: string};

export function createServer(config: Config): McpServer {
	const server = new McpServer({
		name: 'freeagent-mcp',
		version,
	});

	registerAll(server, config);

	return server;
}
