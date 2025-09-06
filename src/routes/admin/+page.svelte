<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { user, signOut as signOutAuth } from '../../stores/auth';
    import { supabase } from '$lib/supabase';
    import { language } from '../../stores/language';
    import { translations } from '$lib/translations';
    import Icon from '@iconify/svelte';
    import { fade } from 'svelte/transition';
    import { gsap } from 'gsap';
    import ToggleTheme from '$lib/ThemeToggle.svelte';

    let users = [];
    let userCount = 0;
    let errorMessage = '';
    let loading = true;
    let userListSection;
    let showLogoutConfirm = false;
    let logoutLoading = false;

    const availableLanguages = [
        { code: 'en', label: 'EN' },
        { code: 'fr', label: 'FR' },
    ];

    $: t = translations[$language] || translations.en;

    $: isAuthorized = $user?.email === 'kiady142ram@gmail.com';

    onMount(async () => {
        if (!isAuthorized) {
            goto('/');
            return;
        }

        await fetchUsers();

        if (userListSection) {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        gsap.fromTo(
                            userListSection,
                            { opacity: 0, y: 30 },
                            { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }
                        );
                        gsap.to({ count: 0 }, {
                            count: userCount,
                            duration: 2,
                            ease: 'power1.out',
                            onUpdate: function () {
                                userCount = Math.round(this.targets()[0].count);
                            }
                        });
                        observer.disconnect();
                    }
                },
                { threshold: 0.5 }
            );
            observer.observe(userListSection);
        }
    });

    async function fetchUsers() {
        try {
            loading = true;
            const { data, error } = await supabase
                .rpc('get_users_with_confirmation');

            if (error) {
                errorMessage = t?.admin?.errorLoadingUsers || 'Erreur lors du chargement des utilisateurs';
                console.error('Error fetching users:', error);
                return;
            }

            users = data;
            userCount = data.length;
        } catch (error) {
            errorMessage = t?.admin?.errorLoadingUsers || 'Erreur lors du chargement des utilisateurs';
            console.error('Exception fetching users:', error);
        } finally {
            loading = false;
        }
    }

    function toggleLanguage(langCode) {
        $language = langCode;
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', langCode);
            window.location.reload();
        }
    }

    function confirmLogout() {
        showLogoutConfirm = true;
    }

    function cancelLogout() {
        showLogoutConfirm = false;
    }

    async function signOut() {
        logoutLoading = true;
        const result = await signOutAuth();
        if (!result.success) console.error(result.error);
        logoutLoading = false;
        showLogoutConfirm = false;
        goto('/');
    }

    function goToProfile() {
        goto('/profile');
    }
</script>

<div class="text-black dark:text-white max-w-7xl mx-auto">
    <!-- Header -->
    <div class="transition-all duration-500 ease-in-out fixed w-full max-w-7xl mx-auto flex items-center bg-white dark:bg-black p-2" style="z-index: 1;">
        <a href="/" class="text-xl flex items-end">
            <img src="/img/black.png" alt="Logo dark" class="block dark:hidden h-12" />
            <img src="/img/white.png" alt="Logo light" class="hidden dark:block h-12" />
        </a>
        <div class="flex ml-auto items-center gap-2">
            <div class="relative group">
                <button
                    class="bg-yellow-600 text-white dark:text-black px-3 py-1 rounded text-sm font-semibold hover:cursor-pointer hover:bg-yellow-500 transition-all duration-300 flex items-center"
                    aria-label="Select language"
                >
                    {availableLanguages.find(lang => lang.code === $language)?.label || 'English'}
                    <Icon icon="mdi:chevron-down" class="ml-1" />
                </button>
                <div
                    class="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                >
                    {#each availableLanguages as lang}
                        <button
                            on:click={() => toggleLanguage(lang.code)}
                            class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 {$language === lang.code ? 'bg-gray-100 dark:bg-gray-700' : ''}"
                        >
                            {lang.label}
                        </button>
                    {/each}
                </div>
            </div>

            {#if $user}
                <div class="relative group">
                    <button
                        class="bg-yellow-600 text-white dark:text-black px-3 py-1 rounded text-sm font-semibold hover:cursor-pointer hover:bg-yellow-500 transition-all duration-300 flex items-center"
                    >
                        <Icon icon="mdi:account" class="mr-1" />
                        {$user.email?.split('@')[0] || 'Profile'}
                        <Icon icon="mdi:chevron-down" class="ml-1" />
                    </button>
                    <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <button
                            on:click={goToProfile}
                            class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                            <Icon icon="mdi:account-cog" class="mr-2" />
                            {t?.auth?.profile || 'Mon Profil'}
                        </button>
                        <button
                            on:click={() => goto('/admin')}
                            class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                            <Icon icon="mdi:shield-account" class="mr-2" />
                            {t?.admin?.title || 'Administration'}
                        </button>
                        <button
                            on:click={confirmLogout}
                            class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-red-600 dark:text-red-400"
                        >
                            <Icon icon="mdi:logout" class="mr-2" />
                            {t?.auth?.logout || 'Déconnexion'}
                        </button>
                    </div>
                </div>
            {/if}

            <a href="https://github.com/KiadyNirina/CookUp" target="_blank" class="p-2 rounded hover:bg-gray-200 hover:cursor-pointer dark:hover:bg-gray-700 text-xl active:scale-70">
                <Icon icon="mdi:github" />
            </a>
            <ToggleTheme />
        </div>
    </div>

    <!-- Contenu de la page admin -->
    {#if isAuthorized}
        <div class="p-4 pt-20" transition:fade={{ duration: 150 }}>
            <h1 class="text-4xl text-center font-extrabold mb-6 edu-vic-wa-nt-hand-pre-test">
                {t?.admin?.title || 'Administration des utilisateurs'}
            </h1>

            {#if errorMessage}
                <div class="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 flex items-center border border-red-200 dark:border-red-800">
                    <Icon icon="mdi:alert-circle" class="w-5 h-5 mr-2 flex-shrink-0" />
                    <span class="text-sm">{errorMessage}</span>
                </div>
            {/if}

            <section bind:this={userListSection} class="mb-12" style="opacity: 0;">
                <div class="bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 p-6 mb-8">
                    <h2 class="text-2xl font-bold mb-4">
                        {t?.admin?.totalUsers || 'Nombre total d\'utilisateurs'} : 
                        <span class="text-yellow-600 dark:text-yellow-400">{userCount.toLocaleString()}</span>
                    </h2>
                </div>

                {#if loading}
                    <div class="text-center">
                        <Icon icon="mdi:loading" class="w-8 h-8 animate-spin text-yellow-600 dark:text-yellow-400 mx-auto" />
                        <p class="mt-2 text-gray-600 dark:text-gray-300">{t?.loading || 'Chargement...'}</p>
                    </div>
                {:else if users.length > 0}
                    <div class="bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 overflow-hidden">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-gray-100 dark:bg-gray-800">
                                    <th class="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {t?.admin?.username || 'Nom d\'utilisateur'}
                                    </th>
                                    <th class="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {t?.admin?.email || 'Email'}
                                    </th>
                                    <th class="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {t?.admin?.emailConfirmed || 'Email confirmé'}
                                    </th>
                                    <th class="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {t?.admin?.lastUpdated || 'Dernière mise à jour'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each users as user}
                                    <tr class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                                        <td class="p-4 text-sm">{user.username}</td>
                                        <td class="p-4 text-sm">{user.email}</td>
                                        <td class="p-4 text-sm">
                                            {#if user.email_confirmed}
                                                <span class="text-green-600 dark:text-green-400 flex items-center">
                                                    <Icon icon="mdi:check-circle" class="w-5 h-5 mr-1" />
                                                    {t?.admin?.confirmed || 'Confirmé'}
                                                </span>
                                            {:else}
                                                <span class="text-red-600 dark:text-red-400 flex items-center">
                                                    <Icon icon="mdi:close-circle" class="w-5 h-5 mr-1" />
                                                    {t?.admin?.notConfirmed || 'Non confirmé'}
                                                </span>
                                            {/if}
                                        </td>
                                        <td class="p-4 text-sm">
                                            {new Date(user.updated_at).toLocaleString($language === 'fr' ? 'fr-FR' : 'en-US')}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else}
                    <p class="text-center text-gray-600 dark:text-gray-300">
                        {t?.admin?.noUsers || 'Aucun utilisateur trouvé'}
                    </p>
                {/if}
            </section>
        </div>
    {:else}
        <div class="text-center p-4 pt-20" transition:fade={{ duration: 150 }}>
            <p class="text-red-600 dark:text-red-400">
                {t?.admin?.unauthorized || 'Accès non autorisé'}
            </p>
        </div>
    {/if}

    {#if showLogoutConfirm}
        <div 
            class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4"
            transition:fade={{ duration: 150 }}
        >
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                <div class="text-center mb-6">
                    <Icon 
                        icon="mdi:logout" 
                        class="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" 
                    />
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {t?.auth?.logoutConfirmTitle || 'Déconnexion'}
                    </h2>
                    <p class="mt-2 text-gray-600 dark:text-gray-300">
                        {t?.auth?.logoutConfirmMessage || 'Êtes-vous sûr de vouloir vous déconnecter ?'}
                    </p>
                </div>

                <div class="flex gap-4 justify-center">
                    <button
                        on:click={cancelLogout}
                        disabled={logoutLoading}
                        class="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-300 disabled:opacity-50"
                    >
                        {t?.auth?.cancel || 'Annuler'}
                    </button>
                    
                    <button
                        on:click={signOut}
                        disabled={logoutLoading}
                        class="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                        {#if logoutLoading}
                            <Icon icon="mdi:loading" class="w-5 h-5 animate-spin mr-2" />
                            {t?.auth?.loggingOut || 'Déconnexion...'}
                        {:else}
                            <Icon icon="mdi:logout" class="w-5 h-5 mr-2" />
                            {t?.auth?.confirmLogout || 'Se déconnecter'}
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    @import "tailwindcss";
    @custom-variant dark (&:where(.dark, .dark *));
    .edu-vic-wa-nt-hand-pre-test {
        font-family: "Permanent Marker", cursive;
        font-weight: 400;
        font-style: normal;
    }
    .group:hover .group-hover\:visible {
        visibility: visible;
    }
    .group:hover .group-hover\:opacity-100 {
        opacity: 1;
    }
</style>