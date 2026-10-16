import {
	describe, expect, it, vi,
} from 'vitest';
import {FreeAgentApi, pageInfo, parseBody} from './freeagent-api.js';

const baseUrl = 'https://api.sandbox.freeagent.com/v2';

function setup(...responses: Response[]) {
	const fetchFn = vi.fn<typeof fetch>();
	for (const response of responses) {
		fetchFn.mockResolvedValueOnce(response);
	}

	const tokens = {
		getAccessToken: vi.fn(async () => 'token-1'),
		refreshAccessToken: vi.fn(async () => 'token-2'),
	};
	const sleep = vi.fn(async () => undefined);
	const api = new FreeAgentApi({
		baseUrl, tokens, userAgent: 'test', fetch: fetchFn, sleep,
	});
	return {
		api, fetchFn, tokens, sleep,
	};
}

describe('FreeAgentApi', () => {
	it('sends auth, accept and JSON headers and drops undefined query params', async () => {
		const {api, fetchFn} = setup(new Response('{"contact":{"url":"x"}}'));

		const {data} = await api.request('POST', '/contacts', {query: {a: 1, b: undefined}, body: {contact: {first_name: 'A'}}});

		expect(data).toEqual({contact: {url: 'x'}});
		const [url, init] = fetchFn.mock.calls[0]!;
		expect((url as URL).href).toBe(`${baseUrl}/contacts?a=1`);
		expect(init?.headers).toMatchObject({
			Authorization: 'Bearer token-1', Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'test',
		});
		expect(init?.body).toBe('{"contact":{"first_name":"A"}}');
	});

	it('refreshes the token and retries once on 401', async () => {
		const {api, fetchFn, tokens} = setup(new Response('', {status: 401}), new Response('{"ok":true}'));

		await expect(api.get('/company')).resolves.toMatchObject({data: {ok: true}});

		expect(tokens.refreshAccessToken).toHaveBeenCalledTimes(1);
		expect((fetchFn.mock.calls[1]![1]?.headers as Record<string, string>).Authorization).toBe('Bearer token-2');
	});

	it('waits out Retry-After once on 429', async () => {
		const {api, sleep} = setup(new Response('slow down', {status: 429, headers: {'Retry-After': '7'}}), new Response('{"ok":true}'));

		await expect(api.get('/company')).resolves.toMatchObject({data: {ok: true}});
		expect(sleep).toHaveBeenCalledWith(7000);
	});

	it('does not wait out very long rate limits', async () => {
		const {api, sleep} = setup(new Response('slow down', {status: 429, headers: {'Retry-After': '3600'}}));

		await expect(api.get('/company')).rejects.toThrow('FreeAgent API error: 429');
		expect(sleep).not.toHaveBeenCalled();
	});

	it('includes the response body in errors', async () => {
		const {api} = setup(new Response('{"errors":{"error":{"message":"Contact is required"}}}', {status: 422}));

		await expect(api.post('/invoices', {})).rejects.toThrow('Contact is required');
	});

	describe('resourceUrl', () => {
		const {api} = setup();

		it('builds URLs from IDs', () => {
			expect(api.resourceUrl('contacts', '42')).toBe(`${baseUrl}/contacts/42`);
			expect(api.resourceUrl('categories', '602-1')).toBe(`${baseUrl}/categories/602-1`);
		});

		it('accepts URLs for the same API and collection', () => {
			expect(api.resourceUrl('contacts', `${baseUrl}/contacts/42`)).toBe(`${baseUrl}/contacts/42`);
		});

		it('rejects URLs that would send the token elsewhere', () => {
			expect(() => api.resourceUrl('contacts', 'https://evil.example/v2/contacts/1')).toThrow();
			expect(() => api.resourceUrl('contacts', 'https://api.freeagent.com/v2/contacts/1')).toThrow();
			expect(() => api.resourceUrl('contacts', `${baseUrl}/invoices/1`)).toThrow();
			expect(() => api.resourceUrl('contacts', '../users/me')).toThrow();
		});
	});
});

describe('pageInfo', () => {
	it('reads total count and next link', () => {
		const headers = new Headers({
			'X-Total-Count': '230',
			Link: `<${baseUrl}/invoices?page=3>; rel="next", <${baseUrl}/invoices?page=10>; rel="last"`,
		});
		expect(pageInfo(headers, 2, 25)).toEqual({
			page: 2, per_page: 25, total_count: 230, has_more: true,
		});
	});

	it('reports no more pages without a next link', () => {
		expect(pageInfo(new Headers(), 1, 25)).toEqual({page: 1, per_page: 25, has_more: false});
	});
});

describe('parseBody', () => {
	it('turns an empty body into a success object', () => {
		expect(parseBody('')).toEqual({success: true, message: 'Operation completed successfully'});
	});
});
