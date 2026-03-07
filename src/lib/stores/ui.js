import { writable } from 'svelte/store';

export const showAuthModal = writable(false);
export const triggerAuthOpen = writable(0);