import {z} from 'zod';

export const contactFields = {
	organisation_name: z.string().optional().describe('Company name. Required unless first_name and last_name are given'),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	email: z.string().optional(),
	billing_email: z.string().optional().describe('Where invoices are emailed, if different from email'),
	phone_number: z.string().optional(),
	address1: z.string().optional(),
	address2: z.string().optional(),
	address3: z.string().optional(),
	town: z.string().optional(),
	region: z.string().optional(),
	postcode: z.string().optional(),
	country: z.string().optional().describe('e.g. "United Kingdom"'),
	default_payment_terms_in_days: z.number().int().optional(),
	sales_tax_registration_number: z.string().optional().describe('The contact\'s VAT number'),
	charge_sales_tax: z.string().optional().describe('Whether to charge VAT on invoices to this contact'),
};
