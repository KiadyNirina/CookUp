<script>
    import { fade, fly } from "svelte/transition";
    import Icon from "@iconify/svelte";
    import { language } from '../stores/language';
    import { translations } from '$lib/translations';
    import { createEventDispatcher } from "svelte";
    
    export let message = '';

    const dispatch = createEventDispatcher();
    
    $: t = translations[$language] || translations.en;
    
    function handleClose() {
        dispatch('close');
    }
</script>

<div 
    class="fixed top-0 left-0 right-0 z-50 p-4 flex justify-center"
    transition:fade={{ duration: 150 }}
>
    <div 
        transition:fly={{ y: -50, duration: 300 }}
        class="login-success-modal bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 flex items-center"
    >
        <div class="mr-4 flex-shrink-0">
            <Icon 
                icon="mdi:check-circle" 
                class="w-10 h-10 text-green-500" 
            />
        </div>
        <div class="flex-grow">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {message || t.auth.loginSuccess}
            </h3>
        </div>
        <button
            on:click={handleClose}
            class="ml-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
        >
            <Icon icon="mdi:close" class="w-5 h-5" />
        </button>
    </div>
</div>

<style>
    .login-success-modal {
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
</style>