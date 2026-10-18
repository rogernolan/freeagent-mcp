import {describe, expect, it} from 'vitest';
import {resolveToolSelection, TOOL_TIERS} from './access.js';

const risky = Object.keys(TOOL_TIERS).filter((tool) => TOOL_TIERS[tool] === 'risky');

describe('resolveToolSelection', () => {
	it('enables read and write tools but no risky ones by default', () => {
		const tools = resolveToolSelection();

		expect(tools.has('bank_transactions_list')).toBe(true);
		expect(tools.has('expense_create')).toBe(true);
		expect(tools.has('bank_transaction_explanation_update')).toBe(true);
		for (const tool of risky) {
			expect(tools.has(tool)).toBe(false);
		}
	});

	it('keeps invoices, email and deletes in the risky tier', () => {
		expect(risky).toEqual(expect.arrayContaining([
			'invoice_create',
			'invoice_update',
			'invoice_transition',
			'invoice_send_email',
			'invoice_delete',
			'bill_delete',
			'expense_delete',
			'bank_transaction_explanation_delete',
			'attachment_delete',
		]));
	});

	it('supports tiers, tool names and removals', () => {
		expect(resolveToolSelection('read')).toEqual(new Set(Object.keys(TOOL_TIERS).filter((tool) => TOOL_TIERS[tool] === 'read')));
		expect(resolveToolSelection('all').size).toBe(Object.keys(TOOL_TIERS).length);

		const tools = resolveToolSelection('read, invoice_create, -invoice_pdf_get');
		expect(tools.has('invoice_create')).toBe(true);
		expect(tools.has('invoice_pdf_get')).toBe(false);
		expect(tools.has('expense_create')).toBe(false);

		expect(resolveToolSelection('all,-risky')).toEqual(resolveToolSelection('read,write'));
	});

	it('rejects unknown names and empty selections', () => {
		expect(() => resolveToolSelection('read,invoice_send')).toThrow('Unknown tool or tier "invoice_send"');
		expect(() => resolveToolSelection(' , ')).toThrow('empty');
	});
});
