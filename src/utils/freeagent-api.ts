export type AccessTokenProvider = {
	getAccessToken(): Promise<string>;
	refreshAccessToken(): Promise<string>;
};

export type QueryValue = string | number | boolean | undefined;
export type Query = Record<string, QueryValue>;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ApiResponse<T> = {
	data: T;
	headers: Headers;
};

export type FreeAgentApiOptions = {
	/** e.g. https://api.freeagent.com/v2 */
	baseUrl: string;
	tokens: AccessTokenProvider;
	userAgent: string;
	fetch?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
};

export const FREEAGENT_BASE_URLS = {
	production: 'https://api.freeagent.com/v2',
	sandbox: 'https://api.sandbox.freeagent.com/v2',
} as const;

// Don't stall a tool call for longer than this waiting out a rate limit
const MAX_RETRY_AFTER_SECONDS = 60;

const RESOURCE_ID = /^(?!\.{1,2}$)[\w.-]+$/;

export class FreeAgentApi {
	readonly baseUrl: string;
	private readonly fetchFn: typeof fetch;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(private readonly options: FreeAgentApiOptions) {
		this.baseUrl = options.baseUrl.replace(/\/+$/, '');
		this.fetchFn = options.fetch ?? fetch;
		this.sleep = options.sleep ?? (async (ms) => new Promise((resolve) => {
			setTimeout(resolve, ms);
		}));
	}

	/**
	 * Turns an ID or URL into a FreeAgent resource URL, e.g. ('contacts', '42') → https://api.freeagent.com/v2/contacts/42.
	 * URLs must point at this API and collection, so a tool argument can never send our bearer token elsewhere.
	 */
	resourceUrl(collection: string, idOrUrl: string): string {
		const value = idOrUrl.trim();
		const prefix = `${this.baseUrl}/${collection}/`;
		let id = value;
		if (/^https?:\/\//i.test(value)) {
			if (!value.startsWith(prefix)) {
				throw new Error(`Expected a FreeAgent ${collection} URL starting with ${prefix}, got: ${value}`);
			}

			id = value.slice(prefix.length);
		}

		// One plain path segment: no slashes, %-escapes, query strings or dot segments, which the URL parser would
		// resolve into a different collection (e.g. attachments/../invoices/5)
		if (!RESOURCE_ID.test(id)) {
			throw new Error(`Invalid FreeAgent ${collection} ID or URL: ${value}`);
		}

		return prefix + id;
	}

	async get<T>(path: string, query?: Query): Promise<ApiResponse<T>> {
		return this.request<T>('GET', path, query === undefined ? {} : {query});
	}

	async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>('POST', path, {body});
	}

	async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
		return this.request<T>('PUT', path, {body});
	}

	async delete<T>(path: string): Promise<ApiResponse<T>> {
		return this.request<T>('DELETE', path);
	}

	/** `path` is relative to the base URL (e.g. '/invoices'), or a full resource URL from resourceUrl() */
	async request<T>(method: HttpMethod, path: string, options: {query?: Query; body?: unknown} = {}): Promise<ApiResponse<T>> {
		const url = new URL(path.startsWith(`${this.baseUrl}/`) ? path : `${this.baseUrl}${path}`);
		const base = new URL(this.baseUrl);
		if (url.origin !== base.origin || !url.pathname.startsWith(`${base.pathname.replace(/\/+$/, '')}/`)) {
			throw new Error(`Refusing to call ${url.origin}${url.pathname}: outside the FreeAgent API at ${this.baseUrl}`);
		}

		for (const [key, value] of Object.entries(options.query ?? {})) {
			if (value !== undefined) {
				url.searchParams.set(key, String(value));
			}
		}

		let response = await this.send(method, url, options.body, await this.options.tokens.getAccessToken());

		if (response.status === 401) {
			response = await this.send(method, url, options.body, await this.options.tokens.refreshAccessToken());
		}

		if (response.status === 429) {
			const retryAfter = Number(response.headers.get('retry-after') ?? '');
			if (Number.isFinite(retryAfter) && retryAfter <= MAX_RETRY_AFTER_SECONDS) {
				await this.sleep(Math.max(retryAfter, 1) * 1000);
				response = await this.send(method, url, options.body, await this.options.tokens.getAccessToken());
			}
		}

		const text = await response.text();
		if (!response.ok) {
			throw new Error(`FreeAgent API error: ${response.status} ${response.statusText} - ${text}`);
		}

		return {data: parseBody(text) as T, headers: response.headers};
	}

	private async send(method: HttpMethod, url: URL, body: unknown, accessToken: string): Promise<Response> {
		return this.fetchFn(url, {
			method,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/json',
				'User-Agent': this.options.userAgent,
				...(body === undefined ? {} : {'Content-Type': 'application/json'}),
			},
			...(body === undefined ? {} : {body: JSON.stringify(body)}),
		});
	}
}

export function parseBody(text: string): unknown {
	if (!text.trim()) {
		// Some updates/deletes return no body; keep tool output schemas satisfiable
		return {success: true, message: 'Operation completed successfully'};
	}

	return JSON.parse(text);
}

export type Page = {
	page: number;
	per_page: number;
	total_count?: number;
	has_more: boolean;
};

export function pageInfo(headers: Headers, page: number, perPage: number): Page {
	const total = headers.get('x-total-count');
	const link = headers.get('link') ?? '';
	return {
		page,
		per_page: perPage,
		...(total === null ? {} : {total_count: Number(total)}),
		has_more: /rel=["']?next["']?/.test(link),
	};
}
