import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const defaultLanguage = 'en';

const savedLanguage = browser ? localStorage.getItem('language') || defaultLanguage : defaultLanguage;

export const language = writable(savedLanguage);

if (browser) {
    language.subscribe(value => {
        localStorage.setItem('language', value);
    });
}