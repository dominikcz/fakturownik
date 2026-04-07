export interface InvoiceTemplateConfig {
	label: string;
	accent: string;
	thBg: string;
	thColor: string;
	footerBg: string;
	footerBorder: string;
	footerColor: string;
	headerBorder: string;
	metaBg: string;
	totalStyle: 'box' | 'bar';
	titleAccent: boolean;
	partyStyle: 'bordered' | 'flat';
	layout: 'default' | 'modern' | 'elegant';
	headerStyle?: 'side-meta';
	font: string;
	headingFont?: string;
	lineColor: string;
}

export const INVOICE_TEMPLATES: Record<string, InvoiceTemplateConfig> = {
	klasyczny: {
		label: 'Klasyczny',
		accent: '#2563eb',
		thBg: '#cccccc',
		thColor: '#000000',
		footerBg: '#f1f5f9',
		footerBorder: '#1e293b',
		footerColor: '#1e293b',
		headerBorder: '#1e293b',
		metaBg: '#f8fafc',
		totalStyle: 'box',
		titleAccent: false,
		partyStyle: 'flat',
		layout: 'default',
		headerStyle: 'side-meta',
		font: 'Trebuchet MS',
		lineColor: '#e2e8f0'
	},
	nowoczesny: {
		label: 'Nowoczesny',
		accent: '#2563EB',
		thBg: '#1F2937',
		thColor: '#ffffff',
		footerBg: '#1F2937',
		footerBorder: '#1F2937',
		footerColor: '#ffffff',
		headerBorder: '#2563EB',
		metaBg: '#eff6ff',
		totalStyle: 'bar',
		titleAccent: true,
		partyStyle: 'flat',
		layout: 'modern',
		font: 'Inter, Roboto',
		lineColor: '#E5E7EB'
	},
	elegancki: {
		label: 'Elegancki',
		accent: '#C8A951',
		thBg: '#EAE6DF',
		thColor: '#1B4332',
		footerBg: '#faf9f7',
		footerBorder: '#EAE6DF',
		footerColor: '#111827',
		headerBorder: '#EAE6DF',
		metaBg: '#faf9f7',
		totalStyle: 'box',
		titleAccent: false,
		partyStyle: 'flat',
		layout: 'elegant',
		font: "'Source Sans 3', Inter, sans-serif",
		headingFont: "'Playfair Display', Georgia, serif",
		lineColor: '#EAE6DF'
	}
};

export const DEFAULT_INVOICE_TEMPLATE = 'klasyczny';

export function getTemplateConfig(id?: string): InvoiceTemplateConfig {
	return INVOICE_TEMPLATES[id ?? DEFAULT_INVOICE_TEMPLATE] ?? INVOICE_TEMPLATES[DEFAULT_INVOICE_TEMPLATE];
}
