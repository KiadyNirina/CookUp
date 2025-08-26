<script>
    import { supabase } from '$lib/supabase';
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import Icon from '@iconify/svelte';

    export let onClose;
    const dispatch = createEventDispatcher();

    let email = '';
    let password = '';
    let isSignUp = false;
    let errorMessage = '';
    let loading = false;

    async function handleAuth() {
        try {
            loading = true;
            errorMessage = '';
            
            let result;
            if (isSignUp) {
                result = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/dashboard`
                    }
                });
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
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });

            if (error) {
                errorMessage = error.message;
            } else {
                dispatch('close'); // Dispatch close event on Google auth initiation
                onClose(); // Call onClose to ensure modal closes
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

<div
    class="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full relative"
    transition:fade={{ duration: 150 }}
>
    <button
        on:click={handleClose}
        class="absolute top-4 right-4 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
        aria-label="Close"
    >
        <Icon icon="mdi:close" class="w-6 h-6" />
    </button>

    <div class="text-center mb-6">
        <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white edu-vic-wa-nt-hand-pre-test">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isSignUp ? 'Join us to explore delicious recipes!' : 'Sign in to access your personalized recipes.'}
        </p>
    </div>

    {#if errorMessage}
        <div class="bg-red-100 text-red-700 p-4 rounded-lg mb-6 flex items-center">
            <Icon icon="mdi:alert-circle" class="w-5 h-5 mr-2" />
            {errorMessage}
        </div>
    {/if}

    <div class="space-y-6">
        <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
                type="email"
                id="email"
                bind:value={email}
                class="mt-1 block w-full rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-yellow-600 focus:ring-2 focus:ring-yellow-600 focus:ring-opacity-50 transition-all duration-300"
                placeholder="your@email.com"
                required
            />
        </div>
        <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
                type="password"
                id="password"
                bind:value={password}
                class="mt-1 block w-full rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-yellow-600 focus:ring-2 focus:ring-yellow-600 focus:ring-opacity-50 transition-all duration-300"
                placeholder="••••••••"
                required
            />
        </div>
        <button
            on:click={handleAuth}
            disabled={loading}
            class="w-full bg-yellow-600 text-white dark:text-black py-3 px-4 rounded-lg font-semibold hover:bg-yellow-700 dark:hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-opacity-50 disabled:opacity-50 transition-all duration-300"
        >
            {#if loading}
                <Icon icon="mdi:loading" class="w-5 h-5 animate-spin inline-block mr-2" />
                Loading...
            {:else}
                {isSignUp ? 'Sign Up' : 'Login'}
            {/if}
        </button>
        <button
            on:click={handleGoogleAuth}
            disabled={loading}
            class="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-3 px-4 rounded-lg font-semibold border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-opacity-50 transition-all duration-300 flex items-center justify-center"
        >
            <Icon icon="mdi:google" class="w-5 h-5 mr-2" />
            Continue with Google
        </button>
        <div class="text-center">
            <button
                on:click={toggleAuthMode}
                class="text-sm text-yellow-600 hover:text-yellow-700 dark:hover:text-yellow-500 transition-colors"
            >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
        </div>
    </div>
</div>

<style>
    .edu-vic-wa-nt-hand-pre-test {
        font-family: "Permanent Marker", cursive;
        font-weight: 400;
        font-style: normal;
    }
</style>