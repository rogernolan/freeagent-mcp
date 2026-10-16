import {homedir} from 'node:os';
import {join} from 'node:path';
import {FREEAGENT_BASE_URLS, FreeAgentApi} from './utils/freeagent-api.js';
import {TokenStore} from './auth/token-store.js';
import {version} from './index.js';

export type Env = Record<string, string | undefined>;

export type FreeAgentSettings = {
	environment: keyof typeof FREEAGENT_BASE_URLS;
	baseUrl: string;
	clientId: string;
	clientSecret: string;
	tokenFile: string;
};

function required(env: Env, name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(`freeagent-mcp: Missing ${name}. Create an app at https://dev.freeagent.com and set FREEAGENT_CLIENT_ID and FREEAGENT_CLIENT_SECRET`);
	}

	return value;
}

export function loadSettings(env: Env = process.env): FreeAgentSettings {
	const environment = env.FREEAGENT_ENV ?? 'sandbox';
	if (environment !== 'sandbox' && environment !== 'production') {
		throw new Error(`freeagent-mcp: FREEAGENT_ENV must be "sandbox" or "production", got "${environment}"`);
	}

	return {
		environment,
		baseUrl: env.FREEAGENT_BASE_URL ?? FREEAGENT_BASE_URLS[environment],
		clientId: required(env, 'FREEAGENT_CLIENT_ID'),
		clientSecret: required(env, 'FREEAGENT_CLIENT_SECRET'),
		tokenFile: env.FREEAGENT_TOKEN_FILE ?? join(homedir(), '.config', 'freeagent-mcp', `tokens.${environment}.json`),
	};
}

export function createApi(settings: FreeAgentSettings, env: Env = process.env): FreeAgentApi {
	const tokens = new TokenStore({
		file: settings.tokenFile,
		clientId: settings.clientId,
		clientSecret: settings.clientSecret,
		tokenUrl: `${settings.baseUrl}/token_endpoint`,
		seedRefreshToken: env.FREEAGENT_REFRESH_TOKEN,
	});
	return new FreeAgentApi({
		baseUrl: settings.baseUrl,
		tokens,
		userAgent: `freeagent-mcp/${version}`,
	});
}
