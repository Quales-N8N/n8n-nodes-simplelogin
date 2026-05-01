import { describe, expect, it } from 'vitest';

import {
	collectSimpleLoginPaginated,
	normalizeBaseUrl,
	toSimpleLoginError,
} from '../nodes/SimpleLogin/utils';

describe('collectSimpleLoginPaginated', () => {
	it('collects all pages until last page is shorter than page size', async () => {
		const source = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }));
		const items = await collectSimpleLoginPaginated(async (pageId) => {
			const pageSize = 20;
			const start = pageId * pageSize;
			return source.slice(start, start + pageSize);
		});
		expect(items).toHaveLength(45);
	});

	it('respects limit', async () => {
		const source = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }));
		const items = await collectSimpleLoginPaginated(async (pageId) => {
			const pageSize = 20;
			const start = pageId * pageSize;
			return source.slice(start, start + pageSize);
		}, 12);
		expect(items).toHaveLength(12);
	});
});

describe('toSimpleLoginError', () => {
	it('uses error string from API response', () => {
		const error = toSimpleLoginError({ error: 'request body cannot be empty' }, 400);
		expect(error.message).toContain('request body cannot be empty');
		expect(error.message).toContain('HTTP 400');
	});
});

describe('normalizeBaseUrl', () => {
	it('trims trailing slash', () => {
		expect(normalizeBaseUrl('https://app.simplelogin.io/')).toBe('https://app.simplelogin.io');
	});
});

