#!/usr/bin/env node
import {timingSafeEqual} from 'node:crypto';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import express, {type RequestHandler} from 'express';
import {createServer} from './index.js';
import {createApi, loadServerOptions, loadSettings} from './config.js';
import {runAuthFlow} from './auth/oauth-cli.js';

function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

function createAuthMiddleware(authToken: string): RequestHandler {
	const expected = Buffer.from(`Bearer ${authToken}`);
	return (req, res, next) => {
		const provided = Buffer.from(req.headers.authorization ?? '');
		if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
			next();
			return;
		}

		res.status(401).set('WWW-Authenticate', 'Bearer').json({
			jsonrpc: '2.0',
			error: {code: -32001, message: 'Unauthorized'},
			id: null,
		});
	};
}

const transport = process.env.MCP_TRANSPORT || 'stdio';

(async () => {
	if (process.argv[2] === 'auth') {
		await runAuthFlow(loadSettings(), parseInt(process.env.FREEAGENT_REDIRECT_PORT || '8976', 10));
		return;
	}

	// One API client (and token store) shared by every server instance, so token refreshes aren't duplicated
	const api = createApi(loadSettings());
	const options = loadServerOptions();
	console.error(`FreeAgent tools enabled: ${options.tools.size}. Attachment folders: ${options.files.attachmentDirs.join(', ') || 'none'}`);

	if (transport === 'stdio') {
		const server = createServer({api, ...options});
		setupSignalHandlers(async () => server.close());

		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
		console.error('FreeAgent MCP server running on stdio');
	} else if (transport === 'http') {
		const authToken = process.env.MCP_AUTH_TOKEN;
		const allowUnauthenticated = process.env.MCP_ALLOW_UNAUTHENTICATED === 'true';
		if (!authToken && !allowUnauthenticated) {
			throw new Error('freeagent-mcp: No auth token provided for HTTP transport. Set `MCP_AUTH_TOKEN` (clients must then send `Authorization: Bearer <token>`), or set `MCP_ALLOW_UNAUTHENTICATED=true` if the server is secured some other way');
		}

		const app = express();

		app.get('/health', (_req, res) => {
			res.json({status: 'ok'});
		});

		if (authToken) {
			app.use('/mcp', createAuthMiddleware(authToken));
		}

		app.use(express.json({limit: '20mb'}));

		// Stateless: fresh server + transport per request — sharing either misroutes responses on concurrent requests with colliding JSON-RPC IDs (GHSA-345p-7cg4-v4c7).
		app.post('/mcp', async (req, res) => {
			const server = createServer({api, ...options});
			const httpTransport = new StreamableHTTPServerTransport({
				enableJsonResponse: true,
			});
			res.on('close', () => {
				void server.close();
			});
			await server.connect(httpTransport as Transport);
			await httpTransport.handleRequest(req, res, req.body);
		});

		// Stateless mode has no SSE stream or session to delete
		app.all('/mcp', (_req, res) => {
			res.status(405).set('Allow', 'POST').json({
				jsonrpc: '2.0',
				error: {code: -32000, message: 'Method not allowed'},
				id: null,
			});
		});

		const port = parseInt(process.env.PORT || '3000', 10);
		const host = process.env.HOST || '0.0.0.0';
		const httpServer = app.listen(port, host, () => {
			console.error(`FreeAgent MCP server running on http://${host}:${port}/mcp`);
			if (!authToken) {
				console.error('WARNING: HTTP transport has no authentication. Only use behind a reverse proxy or in a secured setup.');
			}
		});

		setupSignalHandlers(async () => {
			httpServer.close();
		});
	} else {
		console.error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
		process.exit(1);
	}
})().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
