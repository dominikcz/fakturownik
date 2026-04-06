import { toast } from '@zerodevx/svelte-toast';

export function clearToasts() {
	toast.pop(0);
}

export function showError(message: string) {
	toast.pop(0);
	toast.push(message, {
		duration: 4000,
		dismissable: true,
		classes: ['toast-error']
	});
}

export function showSuccess(message: string) {
	toast.pop(0);
	toast.push(message, {
		duration: 4000,
		dismissable: true,
		classes: ['toast-success']
	});
}

export function showInfo(message: string) {
	toast.pop(0);
	toast.push(message, {
		duration: 4000,
		dismissable: true,
		classes: ['toast-info']
	});
}
