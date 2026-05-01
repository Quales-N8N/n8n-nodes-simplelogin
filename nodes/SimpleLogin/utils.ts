import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions;

interface SimpleLoginCredentials {
	apiKey: string;
	baseUrl?: string;
}

export interface SimpleLoginRequestOptions {
	method: HttpMethod;
	url: string;
	qs?: Record<string, unknown>;
	body?: unknown;
}

export async function simpleLoginRequest(ctx: Ctx, opts: SimpleLoginRequestOptions): Promise<any> {
	try {
		const credentials = (await (ctx as IExecuteFunctions).getCredentials(
			'simpleLoginApi',
		)) as SimpleLoginCredentials;

		const headers: Record<string, string> = {
			Accept: 'application/json',
			Authentication: String(credentials.apiKey),
		};
		if (typeof opts.body !== 'undefined') {
			headers['Content-Type'] = 'application/json';
		}

		const requestOptions: any = {
			method: opts.method,
			url: `${normalizeBaseUrl(credentials.baseUrl)}${opts.url}`,
			json: true,
			returnFullResponse: true,
			headers,
		};
		if (opts.qs) requestOptions.qs = opts.qs;
		if (typeof opts.body !== 'undefined') requestOptions.body = opts.body;

		const response = await (ctx as IExecuteFunctions).helpers.httpRequest.call(ctx, requestOptions);
		const status = response.statusCode as number;
		if (status >= 200 && status < 300) {
			return response.body;
		}
		throw toSimpleLoginError(response.body, status);
	} catch (error: any) {
		if (error?.response) {
			const status = error.response.statusCode || error.response.status;
			throw toSimpleLoginError(error.response.body || error.response.data, status);
		}
		throw error;
	}
}

export async function collectSimpleLoginPaginated<T>(
	pageFetcher: (pageId: number) => Promise<T[]>,
	limit?: number,
	pageSize = 20,
): Promise<T[]> {
	let pageId = 0;
	const collected: T[] = [];

	while (true) {
		const pageItems = await pageFetcher(pageId);
		if (!pageItems.length) break;

		for (const item of pageItems) {
			collected.push(item);
			if (limit && collected.length >= limit) {
				return collected.slice(0, limit);
			}
		}

		if (pageItems.length < pageSize) break;
		pageId += 1;
	}

	return collected;
}

export function toSimpleLoginError(body: any, status?: number): Error {
	const errorMessage =
		body?.error ||
		(Array.isArray(body?.errors) && body.errors.length > 0
			? body.errors
					.map((entry: unknown) => {
						if (typeof entry === 'string') return entry;
						if (entry && typeof entry === 'object' && 'message' in entry) {
							return String((entry as { message: unknown }).message);
						}
						return JSON.stringify(entry);
					})
					.join('; ')
			: 'SimpleLogin API error');

	const error = new Error(`${errorMessage}${status ? ` (HTTP ${status})` : ''}`) as Error & {
		description?: unknown;
	};
	error.description = body;
	return error;
}

export function normalizeBaseUrl(baseUrl?: string): string {
	const raw = (baseUrl || 'https://app.simplelogin.io').trim();
	if (!raw) return 'https://app.simplelogin.io';
	return raw.replace(/\/$/, '');
}
