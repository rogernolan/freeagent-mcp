import {
	mkdir, readFile, rename, writeFile,
} from 'node:fs/promises';
import {dirname} from 'node:path';

export type StoredTokens = {
	access_token: string;
	refresh_token: string;
	/** Epoch milliseconds after which the access token should be treated as expired */
	expires_at: number;
};

type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
};

export type OAuthClientConfig = {
	clientId: string;
	clientSecret: string;
	/** e.g. https://api.freeagent.com/v2/token_endpoint */
	tokenUrl: string;
	fetch?: typeof fetch;
};

// Refresh slightly early so a token doesn't expire mid-request
const EXPIRY_MARGIN_MS = 60_000;

export async function requestTokens(client: OAuthClientConfig, params: Record<string, string>): Promise<StoredTokens> {
	const fetchFn = client.fetch ?? fetch;
	const basic = Buffer.from(`${client.clientId}:${client.clientSecret}`).toString('base64');
	const response = await fetchFn(client.tokenUrl, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		},
		body: new URLSearchParams(params).toString(),
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`FreeAgent token request failed: ${response.status} ${response.statusText} - ${text}`);
	}

	const data = JSON.parse(text) as TokenResponse;
	if (!data.access_token) {
		throw new Error('FreeAgent token response did not include an access_token');
	}

	const refreshToken = data.refresh_token ?? params.refresh_token;
	if (!refreshToken) {
		throw new Error('FreeAgent token response did not include a refresh_token');
	}

	return {
		access_token: data.access_token,
		refresh_token: refreshToken,
		expires_at: Date.now() + ((data.expires_in ?? 3600) * 1000),
	};
}

export async function readTokenFile(file: string): Promise<StoredTokens | undefined> {
	try {
		return JSON.parse(await readFile(file, 'utf8')) as StoredTokens;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			return undefined;
		}

		throw err;
	}
}

export async function writeTokenFile(file: string, tokens: StoredTokens): Promise<void> {
	await mkdir(dirname(file), {recursive: true, mode: 0o700});
	// Write-then-rename so a crash mid-write never leaves a truncated file (losing the rotated refresh token)
	const tmp = `${file}.${process.pid}.tmp`;
	await writeFile(tmp, `${JSON.stringify(tokens, null, 2)}\n`, {mode: 0o600});
	await rename(tmp, file);
}

export type TokenStoreOptions = OAuthClientConfig & {
	file: string;
	/** Used only when the token file doesn't exist yet, e.g. to bootstrap a Docker volume */
	seedRefreshToken?: string | undefined;
};

/**
 * Hands out FreeAgent access tokens, refreshing them when they expire.
 *
 * FreeAgent rotates refresh tokens on every refresh, so each new pair is persisted straight away.
 * Several processes may share one file (e.g. multiple stdio clients), so the file is re-read before
 * refreshing in case another process already did it.
 */
export class TokenStore {
	private tokens: StoredTokens | undefined;
	private refreshing: Promise<StoredTokens> | undefined;

	constructor(private readonly options: TokenStoreOptions) {}

	async getAccessToken(): Promise<string> {
		this.tokens ??= await this.load();
		if (Date.now() < this.tokens.expires_at - EXPIRY_MARGIN_MS) {
			return this.tokens.access_token;
		}

		return this.refreshAccessToken();
	}

	async refreshAccessToken(): Promise<string> {
		this.refreshing ??= this.refresh().finally(() => {
			this.refreshing = undefined;
		});
		this.tokens = await this.refreshing;
		return this.tokens.access_token;
	}

	private async load(): Promise<StoredTokens> {
		const fromFile = await readTokenFile(this.options.file);
		if (fromFile) {
			return fromFile;
		}

		if (this.options.seedRefreshToken) {
			// Expired access token forces a refresh, which persists the result
			return {access_token: '', refresh_token: this.options.seedRefreshToken, expires_at: 0};
		}

		throw new Error(`freeagent-mcp: No FreeAgent tokens found at ${this.options.file}. Run \`freeagent-mcp auth\` to connect your FreeAgent account, or set FREEAGENT_REFRESH_TOKEN`);
	}

	private async refresh(): Promise<StoredTokens> {
		const previous = this.tokens;
		const onDisk = await readTokenFile(this.options.file);
		if (onDisk && previous && onDisk.refresh_token !== previous.refresh_token && Date.now() < onDisk.expires_at - EXPIRY_MARGIN_MS) {
			// Another process refreshed since we loaded
			return onDisk;
		}

		const refreshToken = onDisk?.refresh_token ?? previous?.refresh_token ?? this.options.seedRefreshToken;
		if (!refreshToken) {
			throw new Error('freeagent-mcp: No refresh token available. Run `freeagent-mcp auth`');
		}

		const tokens = await requestTokens(this.options, {grant_type: 'refresh_token', refresh_token: refreshToken});
		await writeTokenFile(this.options.file, tokens);
		return tokens;
	}
}
