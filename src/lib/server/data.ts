import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Settings, Client, Invoice } from '$lib/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const INVOICES_DIR = path.join(DATA_DIR, 'invoices');

function ensureDir(dir: string): void {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

export function readJson<T>(filePath: string): T | null {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

export function writeJson<T>(filePath: string, data: T): void {
	ensureDir(path.dirname(filePath));
	const json = JSON.stringify(data, null, 2);
	const tmpFile = filePath + '.tmp.' + process.pid;
	fs.writeFileSync(tmpFile, json, 'utf-8');
	fs.renameSync(tmpFile, filePath);
}

// --- Settings ----------------------------------------------------------------

const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: Settings = {
	seller: {
		nip: '',
		name: '',
		address: '',
		city: '',
		postalCode: ''
	},
	invoiceNumberTemplate: 'x/m/rrrr',
	defaultFont: 'Trebuchet MS',
	ksef: {
		environment: 'TEST',
		nip: ''
	},
	nextInvoiceNumber: 1,
	defaultPaymentDays: 14,
	nipLookupOrder: ['gus', 'biala_lista', 'vies']
};

export function getSettings(): Settings {
	ensureDir(DATA_DIR);
	const data = readJson<Settings>(SETTINGS_PATH);
	if (!data) {
		writeJson(SETTINGS_PATH, DEFAULT_SETTINGS);
		return { ...DEFAULT_SETTINGS };
	}
	// migracja: uzupełnij brakujące pole dla starych plików settings.json
	if (!data.nipLookupOrder) {
		data.nipLookupOrder = ['gus', 'biala_lista', 'vies'];
	}
	if (data.defaultPaymentDays == null) {
		data.defaultPaymentDays = 14;
	}
	return data;
}

export function saveSettings(settings: Settings): void {
	writeJson(SETTINGS_PATH, settings);
}

// --- Clients -----------------------------------------------------------------

const CLIENTS_PATH = path.join(DATA_DIR, 'clients.json');

export function getClients(): Client[] {
	ensureDir(DATA_DIR);
	return readJson<Client[]>(CLIENTS_PATH) ?? [];
}

export function saveClients(clients: Client[]): void {
	writeJson(CLIENTS_PATH, clients);
}

// --- Invoices -----------------------------------------------------------------

export function listInvoices(): Invoice[] {
	ensureDir(INVOICES_DIR);
	const files = fs.readdirSync(INVOICES_DIR).filter((f) => f.endsWith('.json'));
	const invoices: Invoice[] = [];
	for (const file of files) {
		const inv = readJson<Invoice>(path.join(INVOICES_DIR, file));
		if (inv) invoices.push(inv);
	}
	return invoices.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

export function getInvoice(id: string): Invoice | null {
	ensureDir(INVOICES_DIR);
	return readJson<Invoice>(path.join(INVOICES_DIR, `${id}.json`));
}

export function saveInvoice(invoice: Invoice): void {
	ensureDir(INVOICES_DIR);
	writeJson(path.join(INVOICES_DIR, `${invoice.id}.json`), invoice);
}

export function deleteInvoice(id: string): boolean {
	const filePath = path.join(INVOICES_DIR, `${id}.json`);
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
		return true;
	}
	return false;
}

export { DATA_DIR, INVOICES_DIR };
