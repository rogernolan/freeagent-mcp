import {mkdtemp, readFile, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
	describe, expect, it, vi,
} from 'vitest';
import {TokenStore, writeTokenFile} from './token-store.js';

async function tokenFile() {
	return join(await mkdtemp(join(tmpdir(), 'freeagent-mcp-')), 'tokens.json');
}

function tokenEndpoint(...responses: {access_token: string; refresh_token: string}[]) {
	const fn = vi.fn<typeof fetch>();
	for (const body of responses) {
		fn.mockResolvedValueOnce(new Response(JSON.stringify({...body, expires_in: 3600})));
	}

	return fn;
}

const client = {clientId: 'id', clientSecret: 'secret', tokenUrl: 'https://example.test/v2/token_endpoint'};

describe('TokenStore', () => {
	it('returns a valid stored access token without refreshing', async () => {
		const file = await tokenFile();
		await writeTokenFile(file, {access_token: 'a1', refresh_token: 'r1', expires_at: Date.now() + 3_600_000});
		const fetchFn = tokenEndpoint();

		const store = new TokenStore({...client, file, fetch: fetchFn});

		expect(await store.getAccessToken()).toBe('a1');
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('refreshes an expired token, sending client credentials, and persists the rotated refresh token', async () => {
		const file = await tokenFile();
		await writeTokenFile(file, {access_token: 'a1', refresh_token: 'r1', expires_at: Date.now() - 1});
		const fetchFn = tokenEndpoint({access_token: 'a2', refresh_token: 'r2'});

		const store = new TokenStore({...client, file, fetch: fetchFn});

		expect(await store.getAccessToken()).toBe('a2');
		const [url, init] = fetchFn.mock.calls[0]!;
		expect(url).toBe(client.tokenUrl);
		expect((init?.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('id:secret').toString('base64')}`);
		expect(init?.body).toBe('grant_type=refresh_token&refresh_token=r1');
		const saved = JSON.parse(await readFile(file, 'utf8'));
		expect(saved).toMatchObject({access_token: 'a2', refresh_token: 'r2'});
		expect((await stat(file)).mode.toString(8).slice(-3)).toBe('600');
	});

	it('shares one refresh between concurrent callers', async () => {
		const file = await tokenFile();
		await writeTokenFile(file, {access_token: 'a1', refresh_token: 'r1', expires_at: 0});
		const fetchFn = tokenEndpoint({access_token: 'a2', refresh_token: 'r2'});

		const store = new TokenStore({...client, file, fetch: fetchFn});
		const tokens = await Promise.all([store.getAccessToken(), store.getAccessToken(), store.refreshAccessToken()]);

		expect(tokens).toEqual(['a2', 'a2', 'a2']);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('picks up tokens another process refreshed instead of using a stale refresh token', async () => {
		const file = await tokenFile();
		await writeTokenFile(file, {access_token: 'a1', refresh_token: 'r1', expires_at: Date.now() + 3_600_000});
		const fetchFn = tokenEndpoint();
		const store = new TokenStore({...client, file, fetch: fetchFn});
		await store.getAccessToken();

		await writeTokenFile(file, {access_token: 'a2', refresh_token: 'r2', expires_at: Date.now() + 3_600_000});

		expect(await store.refreshAccessToken()).toBe('a2');
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('bootstraps from a seed refresh token when there is no token file', async () => {
		const file = await tokenFile();
		const fetchFn = tokenEndpoint({access_token: 'a1', refresh_token: 'r2'});

		const store = new TokenStore({
			...client, file, fetch: fetchFn, seedRefreshToken: 'seed',
		});

		expect(await store.getAccessToken()).toBe('a1');
		expect(fetchFn.mock.calls[0]![1]?.body).toBe('grant_type=refresh_token&refresh_token=seed');
		expect(JSON.parse(await readFile(file, 'utf8')).refresh_token).toBe('r2');
	});

	it('explains how to authenticate when there are no tokens', async () => {
		const store = new TokenStore({...client, file: await tokenFile()});
		await expect(store.getAccessToken()).rejects.toThrow('freeagent-mcp auth');
	});

	it('surfaces token endpoint errors', async () => {
		const file = await tokenFile();
		await writeTokenFile(file, {access_token: 'a1', refresh_token: 'r1', expires_at: 0});
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"error":"invalid_grant"}', {status: 400}));

		const store = new TokenStore({...client, file, fetch: fetchFn});

		await expect(store.getAccessToken()).rejects.toThrow('400');
	});
});
