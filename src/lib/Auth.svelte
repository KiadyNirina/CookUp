<script>
    import { supabase } from '$lib/supabase';
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import Icon from '@iconify/svelte';
    import { language } from '../stores/language';
    import { translations } from '$lib/translations';
    import { user, upsertUserProfile } from '../stores/auth';
    
    export let onClose;
    const dispatch = createEventDispatcher();

    let email = '';
    let password = '';
    let isSignUp = false;
    let errorMessage = '';
    let loading = false;
    
    $: t = translations[$language] || translations.en;

    async function handleAuth() {
        try {
            loading = true;
            errorMessage = '';
            
            let result;
            if (isSignUp) {
                const { data: existingUsers } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('email', email)
                    .maybeSingle();

                if (existingUsers) {
                    errorMessage = t.auth.emailAlreadyExists;
                    loading = false;
                    return;
                }

                result = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`
                    }
                });

                if (result.error) {
                    if (result.error.message.includes('already registered') || 
                        result.error.message.includes('User already registered') ||
                        result.error.message.includes('email already exists')) {
                        errorMessage = t.auth.emailAlreadyExists || 'This email is already registered.';
                    } else {
                        errorMessage = result.error.message;
                    }
                } else {
                    dispatch('emailSent');
                    
                    email = '';
                    password = '';
                }
            } else {
                result = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
            }

            if (result.error) {
                errorMessage = result.error.message;
            } else {
                dispatch('authSuccess', { user: result.data.user });
                dispatch('close');
                onClose();
            }
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    }

    async function handleGoogleAuth() {
        try {
            loading = true;
            errorMessage = '';
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            });

            if (error) {
                errorMessage = error.message;
            } else {
                dispatch('authSuccess', { user: null });
                dispatch('close');
                onClose();
            }
        } catch (error) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    }

    function toggleAuthMode() {
        isSignUp = !isSignUp;
        errorMessage = '';
    }

    function handleClose() {
        dispatch('close');
        onClose();
    }
</script>

<div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4">
    <div
        class="auth-modal bg-white dark:bg-black p-8 rounded-2xl shadow-2xl max-w-md w-full relative border border-gray-200 dark:border-gray-700"
        transition:fade={{ duration: 150 }}
    >
        <button
            on:click={handleClose}
            class="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
        >
            <Icon icon="mdi:close" class="w-6 h-6" />
        </button>

        <div class="text-center mb-6">
            <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
            </h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {isSignUp ? t.auth.joinUs : t.auth.signInAccess}
            </p>
        </div>

        {#if errorMessage}
            <div class="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 flex items-center border border-red-200 dark:border-red-800">
                <Icon icon="mdi:alert-circle" class="w-5 h-5 mr-2 flex-shrink-0" />
                <span class="text-sm">{errorMessage}</span>
            </div>
        {/if}

        <div class="space-y-5">
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.auth.email}</label>
                <input
                    type="email"
                    id="email"
                    bind:value={email}
                    class="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition-all duration-300 px-4 py-3"
                    placeholder={t.auth.emailPlaceholder}
                    required
                />
            </div>
            <div>
                <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t.auth.password}</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    class="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition-all duration-300 px-4 py-3"
                    placeholder={t.auth.passwordPlaceholder}
                    required
                />
            </div>
            <button
                on:click={handleAuth}
                disabled={loading}
                class="w-full bg-yellow-500 hover:cursor-pointer dark:bg-yellow-600 dark:hover:bg-yellow-500 hover:bg-yellow-600 text-white py-3.5 px-4 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500/30 disabled:opacity-70 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg"
            >
                {#if loading}
                    <Icon icon="mdi:loading" class="w-5 h-5 animate-spin inline-block mr-2" />
                    {t.loading}
                {:else}
                    {isSignUp ? t.auth.signUp : t.auth.login}
                {/if}
            </button>
            
            <div class="relative flex items-center pt-2">
                <div class="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span class="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-xs font-medium">{t.auth.orContinueWith}</span>
                <div class="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            
            <button
                on:click={handleGoogleAuth}
                disabled={loading}
                class="w-full bg-white hover:cursor-pointer dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-xl font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 transition-all duration-300 flex items-center justify-center shadow-sm"
            >
                <Icon icon="mdi:google" class="w-5 h-5 mr-3 text-amber-600" />
                {t.auth.continueWithGoogle}
            </button>
            
            <div class="text-center pt-4">
                <button
                    on:click={toggleAuthMode}
                    class="text-sm text-yellow-600 hover:cursor-pointer dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors font-medium"
                >
                    {isSignUp ? t.auth.alreadyHaveAccount : t.auth.dontHaveAccount}
                </button>
            </div>
        </div>
    </div>
</div>