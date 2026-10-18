import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {resolveToolSelection, TOOL_TIERS} from './access.js';
import {registerCompanyGet} from './company-get.js';
import {registerCompanyTaxTimelineGet} from './company-tax-timeline-get.js';
import {registerUserMeGet} from './user-me-get.js';
import {registerUsersList} from './users-list.js';
import {registerCategoriesList} from './categories-list.js';
import {registerBankAccountGet} from './bank-account-get.js';
import {registerBankAccountsList} from './bank-accounts-list.js';
import {registerProjectsList} from './projects-list.js';
import {registerVatReturnGet} from './vat-return-get.js';
import {registerVatReturnsList} from './vat-returns-list.js';
import {registerContactCreate} from './contact-create.js';
import {registerContactGet} from './contact-get.js';
import {registerContactUpdate} from './contact-update.js';
import {registerContactsList} from './contacts-list.js';
import {registerInvoiceCreate} from './invoice-create.js';
import {registerInvoiceDelete} from './invoice-delete.js';
import {registerInvoiceGet} from './invoice-get.js';
import {registerInvoicePdfGet} from './invoice-pdf-get.js';
import {registerInvoiceSendEmail} from './invoice-send-email.js';
import {registerInvoiceTransition} from './invoice-transition.js';
import {registerInvoiceUpdate} from './invoice-update.js';
import {registerInvoicesList} from './invoices-list.js';
import {registerBillCreate} from './bill-create.js';
import {registerBillDelete} from './bill-delete.js';
import {registerBillGet} from './bill-get.js';
import {registerBillUpdate} from './bill-update.js';
import {registerBillsList} from './bills-list.js';
import {registerExpenseCreate} from './expense-create.js';
import {registerExpenseDelete} from './expense-delete.js';
import {registerExpenseGet} from './expense-get.js';
import {registerExpenseUpdate} from './expense-update.js';
import {registerExpensesList} from './expenses-list.js';
import {registerBankTransactionExplanationCreate} from './bank-transaction-explanation-create.js';
import {registerBankTransactionExplanationDelete} from './bank-transaction-explanation-delete.js';
import {registerBankTransactionExplanationGet} from './bank-transaction-explanation-get.js';
import {registerBankTransactionExplanationUpdate} from './bank-transaction-explanation-update.js';
import {registerBankTransactionExplanationsList} from './bank-transaction-explanations-list.js';
import {registerBankTransactionGet} from './bank-transaction-get.js';
import {registerBankTransactionsList} from './bank-transactions-list.js';
import {registerAttachmentDelete} from './attachment-delete.js';
import {registerAttachmentGet} from './attachment-get.js';
import {registerProfitAndLossGet} from './profit-and-loss-get.js';
import {registerBalanceSheetGet} from './balance-sheet-get.js';
import {registerTrialBalanceGet} from './trial-balance-get.js';
import {registerCashflowGet} from './cashflow-get.js';

export type {Config} from './types.js';
export {resolveToolSelection, TOOL_TIERS, type ToolTier} from './access.js';

/** Wraps the server so registerTool only registers enabled tools, and refuses tools without a tier */
function gate(server: McpServer, enabled: ReadonlySet<string>): McpServer {
	const registerTool = ((name: string, ...rest: unknown[]) => {
		if (!(name in TOOL_TIERS)) {
			throw new Error(`Tool ${name} has no entry in TOOL_TIERS (src/tools/access.ts)`);
		}

		return enabled.has(name)
			? (server.registerTool as (...args: unknown[]) => unknown)(name, ...rest)
			: undefined;
	}) as McpServer['registerTool'];
	return new Proxy(server, {
		get: (target, prop, receiver) => (prop === 'registerTool' ? registerTool : Reflect.get(target, prop, receiver) as unknown),
	});
}

export function registerAll(mcpServer: McpServer, config: Config): void {
	const server = gate(mcpServer, config.tools ?? resolveToolSelection());
	registerCompanyGet(server, config);
	registerCompanyTaxTimelineGet(server, config);
	registerUserMeGet(server, config);
	registerUsersList(server, config);
	registerCategoriesList(server, config);
	registerBankAccountGet(server, config);
	registerBankAccountsList(server, config);
	registerProjectsList(server, config);
	registerVatReturnGet(server, config);
	registerVatReturnsList(server, config);
	registerContactCreate(server, config);
	registerContactGet(server, config);
	registerContactUpdate(server, config);
	registerContactsList(server, config);
	registerInvoiceCreate(server, config);
	registerInvoiceDelete(server, config);
	registerInvoiceGet(server, config);
	registerInvoicePdfGet(server, config);
	registerInvoiceSendEmail(server, config);
	registerInvoiceTransition(server, config);
	registerInvoiceUpdate(server, config);
	registerInvoicesList(server, config);
	registerBillCreate(server, config);
	registerBillDelete(server, config);
	registerBillGet(server, config);
	registerBillUpdate(server, config);
	registerBillsList(server, config);
	registerExpenseCreate(server, config);
	registerExpenseDelete(server, config);
	registerExpenseGet(server, config);
	registerExpenseUpdate(server, config);
	registerExpensesList(server, config);
	registerBankTransactionExplanationCreate(server, config);
	registerBankTransactionExplanationDelete(server, config);
	registerBankTransactionExplanationGet(server, config);
	registerBankTransactionExplanationUpdate(server, config);
	registerBankTransactionExplanationsList(server, config);
	registerBankTransactionGet(server, config);
	registerBankTransactionsList(server, config);
	registerAttachmentDelete(server, config);
	registerAttachmentGet(server, config);
	registerProfitAndLossGet(server, config);
	registerBalanceSheetGet(server, config);
	registerTrialBalanceGet(server, config);
	registerCashflowGet(server, config);
}
