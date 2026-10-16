import {randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createServer} from 'node:http';
import type {FreeAgentSettings} from '../config.js';
import {requestTokens, writeTokenFile} from './token-store.js';

const AUTH_TIMEOUT_MS = 5 * 60_000;

function openBrowser(url: string): void {
	const command = process.platform === 'darwin' ? 'open' : (process.platform === 'win32' ? 'explorer' : 'xdg-open');
	execFile(command, [url], () => {
		// Best effort; the URL is printed too
	});
}

/**
 * Interactive OAuth: sends the user to FreeAgent's approval page, catches the redirect on localhost,
 * exchanges the code and saves the tokens.
 */
export async function runAuthFlow(settings: FreeAgentSettings, port: number): Promise<void> {
	const redirectUri = `http://localhost:${port}/callback`;
	const state = randomBytes(16).toString('hex');
	const authorizeUrl = new URL(`${settings.baseUrl}/approve_app`);
	authorizeUrl.searchParams.set('client_id', settings.clientId);
	authorizeUrl.searchParams.set('response_type', 'code');
	authorizeUrl.searchParams.set('redirect_uri', redirectUri);
	authorizeUrl.searchParams.set('state', state);

	const code = await new Promise<string>((resolve, reject) => {
		const server = createServer((req, res) => {
			const url = new URL(req.url ?? '/', redirectUri);
			if (url.pathname !== '/callback') {
				res.writeHead(404).end();
				return;
			}

			const finish = (status: number, message: string, result: Error | string) => {
				res.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8'}).end(message);
				clearTimeout(timer);
				server.close();
				if (result instanceof Error) {
					reject(result);
				} else {
					resolve(result);
				}
			};

			const error = url.searchParams.get('error');
			const returnedCode = url.searchParams.get('code');
			if (error) {
				finish(400, `FreeAgent returned an error: ${error}. You can close this tab.`, new Error(`Authorization failed: ${error}`));
			} else if (url.searchParams.get('state') !== state) {
				finish(400, 'State mismatch. Please try again.', new Error('OAuth state mismatch'));
			} else if (!returnedCode) {
				finish(400, 'No authorization code received.', new Error('No authorization code in callback'));
			} else {
				finish(200, 'FreeAgent connected. You can close this tab and return to the terminal.', returnedCode);
			}
		});
		const timer = setTimeout(() => {
			server.close();
			reject(new Error('Timed out waiting for FreeAgent authorization'));
		}, AUTH_TIMEOUT_MS);
		server.on('error', reject);
		server.listen(port, '127.0.0.1', () => {
			console.error(`Connecting freeagent-mcp to FreeAgent (${settings.environment}).`);
			console.error(`Make sure ${redirectUri} is a redirect URI for your app at https://dev.freeagent.com\n`);
			console.error(`Opening your browser. If it doesn't open, visit:\n\n${authorizeUrl.toString()}\n`);
			openBrowser(authorizeUrl.toString());
		});
	});

	const tokens = await requestTokens(
		{clientId: settings.clientId, clientSecret: settings.clientSecret, tokenUrl: `${settings.baseUrl}/token_endpoint`},
		{grant_type: 'authorization_code', code, redirect_uri: redirectUri},
	);
	await writeTokenFile(settings.tokenFile, tokens);
	console.error(`Saved FreeAgent tokens to ${settings.tokenFile}`);
	console.error('To bootstrap a remote/Docker deployment, set FREEAGENT_REFRESH_TOKEN to the refresh_token in that file. '
		+ 'Do not then keep using the same tokens locally: the first refresh on either side rotates the token and can lock the other out.');
}
