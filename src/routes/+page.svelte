<script>
    import Icon from "@iconify/svelte";
    import ToggleTheme from "$lib/ThemeToggle.svelte";
    import FormPoppup from "$lib/FormPoppup.svelte";
    import Auth from "$lib/Auth.svelte";
    import { fade } from "svelte/transition";
    import { gsap } from "gsap";
    import { onMount } from "svelte";
    import { language } from "../stores/language";
    import { translations } from "$lib/translations";
    import { browser } from "$app/environment";
    import { goto } from '$app/navigation';
    import { user, initAuth, upsertUserProfile, signOut as signOutAuth } from '../stores/auth';
    import LoginSuccess from "$lib/LoginSuccess.svelte";
    import { supabase } from '$lib/supabase';

    let poppup = false;
    let showAuthModal = false;
    let recipeCount = 0;
    let recipeCountInternational = 0;
    let recipeSection;
    let urlParams = { 
        type: '', 
        diet: '', 
        recipeId: '', 
        excludeIngredients: [],
        minCarbs: '',
        maxCarbs: '',
        minProtein: '',
        maxProtein: '',
        minFat: '',
        maxFat: '',
        minCalories: '',
        maxCalories: ''
    };

    let showLogoutConfirm = false;
    let logoutLoading = false;

    let showLoginSuccess = false;
    let loginSuccessMessage = '';

    let showEmailSent = false;
    let emailSentMessage = '';

    // Variables pour la section de notation
    let rating = 0;
    let comment = '';
    let showRatingSuccess = false;
    let ratingSuccessMessage = '';
    let ratingLoading = false;
    let hoverRating = 0;

    const availableLanguages = [
        { code: 'en', label: 'EN' },
        { code: 'fr', label: 'FR' },
    ];

    onMount(async () => {
        await initAuth();

        // Récupérer langue sauvegardée
        if (browser) {
            const savedLanguage = localStorage.getItem('language');
            if (savedLanguage) $language = savedLanguage;
        }

        // Observer quand on revient sur l'onglet
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                await initAuth();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        gsap.from(".breakfast", {
            y: 30,
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        });

        if (browser && recipeSection) {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        gsap.to({ count: 0 }, {
                            count: 365000,
                            duration: 2.5,
                            ease: "power1.out",
                            onUpdate: function () {
                                recipeCount = Math.round(this.targets()[0].count);
                            }
                        });
                        gsap.to({ count: 0 }, {
                            count: 100,
                            duration: 2.5,
                            ease: "power1.out",
                            onUpdate: function () {
                                recipeCountInternational = Math.round(this.targets()[0].count);
                            }
                        });
                        gsap.fromTo(
                            recipeSection,
                            { opacity: 0, y: 30 },
                            { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
                        );
                        observer.disconnect();
                    }
                },
                { threshold: 0.5 }
            );
            observer.observe(recipeSection);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    });

    // Fonctions
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
        showAuthModal = false;
        
        window.location.reload();
    }

    function goToProfile() {
        goto('/profile');
    }

    function togglePoppup() {
        poppup = !poppup;
        if (!poppup && browser) {
            window.history.replaceState({}, document.title, '/');
            poppup = false;
        }
    }

    function closePoppup() {
        poppup = false;
        if (browser) {
            window.history.replaceState({}, document.title, '/');
        }
    }

    function toggleLanguage(langCode) {
        $language = langCode;
        if (browser) {
            localStorage.setItem('language', langCode);
            window.location.reload();
        }
    }

    function toggleAuthModal() {
        showAuthModal = !showAuthModal;
    }

    function handleOutsideClick(event) {
        if (showAuthModal && !event.target.closest('.auth-modal')) {
            showAuthModal = false;
        }
    }

    function handleAuthSuccess(event) {
        showAuthModal = false;
        showLoginSuccess = true;
        loginSuccessMessage = $language === 'fr' 
            ? 'Connexion réussie ! Bienvenue ' + ($user.email?.split('@')[0] || '') 
            : 'Login successful! Welcome ' + ($user.email?.split('@')[0] || '');

        setTimeout(() => {
            showLoginSuccess = false;
        }, 3000);
    }

    function closeLoginSuccess() {
        showLoginSuccess = false;
        loginSuccessMessage = '';
    }

    function handleAuthClose() {
        showAuthModal = false;
    }

    function handleEmailSent() {
        showAuthModal = false;
        showEmailSent = true;
        emailSentMessage = $language === 'fr' 
            ? 'Email de confirmation envoyé ! Veuillez vérifier votre boîte mail.'
            : 'Confirmation email sent! Please check your inbox.';
    }

    function closeEmailSent() {
        showEmailSent = false;
    }

    // Fonctions pour la notation
    async function submitRating() {
        if (!$user) {
            showAuthModal = true;
            return;
        }

        if (rating < 1 || rating > 5) {
            return;
        }

        try {
            ratingLoading = true;
            const { error } = await supabase
                .from('ratings')
                .insert({
                    user_id: $user.id,
                    rating,
                    comment: comment.trim() || null
                });

            if (error) {
                console.error('Error submitting rating:', error);
                return;
            }

            showRatingSuccess = true;
            ratingSuccessMessage = $language === 'fr'
                ? 'Votre note a été enregistrée avec succès !'
                : 'Your rating has been submitted successfully!';
            rating = 0;
            comment = '';
        } catch (error) {
            console.error('Exception submitting rating:', error);
        } finally {
            ratingLoading = false;
        }
    }

    function setRating(value) {
        rating = value;
    }

    function closeRatingSuccess() {
        showRatingSuccess = false;
        ratingSuccessMessage = '';
    }

    // Gestion du survol des étoiles
    function handleStarHover(star, event) {
        if (ratingLoading) return;
        hoverRating = star;
        gsap.to(`.star-${star}`, {
            scale: 1.2,
            color: document.documentElement.classList.contains('dark') ? '#facc15' : '#d97706',
            duration: 0.2,
            ease: 'power2.out'
        });
        for (let i = 1; i < star; i++) {
            gsap.to(`.star-${i}`, {
                color: document.documentElement.classList.contains('dark') ? '#facc15' : '#d97706',
                scale: 1,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
        for (let i = star + 1; i <= 5; i++) {
            gsap.to(`.star-${i}`, {
                color: document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db',
                scale: 1,
                duration: 0.2,
                ease: 'power2.out'
            });
        }
    }

    function handleStarLeave() {
        if (ratingLoading) return;
        hoverRating = 0;
        for (let i = 1; i <= 5; i++) {
            gsap.to(`.star-${i}`, {
                scale: rating >= i ? 1 : 1,
                color: rating >= i 
                    ? (document.documentElement.classList.contains('dark') ? '#facc15' : '#d97706')
                    : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db'),
                duration: 0.2,
                ease: 'power2.out'
            });
        }
    }

    $: t = translations[$language] || translations.en;
</script>

<svelte:window on:mousedown={handleOutsideClick} />

<div class="text-black dark:text-white max-w-7xl ml-auto mr-auto">
    <div class="transition-all duration-500 ease-in-out fixed w-full max-w-7xl mx-auto flex items-center bg-white dark:bg-black p-2" style="z-index: 1;">
        <p class="text-xl flex items-end">
            <img src="img/black.png" alt="Logo dark" class="block dark:hidden h-12" />
            <img src="img/white.png" alt="Logo light" class="hidden dark:block h-12" />
        </p>
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
                <!-- Utilisateur connecté - Menu profil -->
                <div class="relative group">
                    <button
                        class="bg-yellow-600 text-white dark:text-black px-3 py-1 rounded text-sm font-semibold hover:cursor-pointer hover:bg-yellow-500 transition-all duration-300 flex items-center"
                    >
                        <Icon icon="mdi:account" class="mr-1" />
                        {$user.email?.split('@')[0] || 'Profile'}
                        <Icon icon="mdi:chevron-down" class="ml-1" />
                    </button>
                    
                    <!-- Menu déroulant profil -->
                    <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <button
                            on:click={goToProfile}
                            class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                            <Icon icon="mdi:account-cog" class="mr-2" />
                            {t?.auth.profile || 'Mon Profil'}
                        </button>
                        {#if $user?.email === 'kiady142ram@gmail.com'}
                            <button
                                on:click={() => goto('/admin')}
                                class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            >
                                <Icon icon="mdi:shield-account" class="mr-2" />
                                {t?.admin?.title || 'Administration'}
                            </button>
                        {/if}
                        <button
                            on:click={confirmLogout}
                            class="w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-red-600 dark:text-red-400"
                        >
                            <Icon icon="mdi:logout" class="mr-2" />
                            {t?.auth.logout || 'Déconnexion'}
                        </button>
                    </div>
                </div>
            {:else}
                <!-- Utilisateur non connecté -->
                <button
                    on:click={toggleAuthModal}
                    class="bg-yellow-600 text-white dark:text-black px-3 py-1 rounded text-sm font-semibold hover:cursor-pointer hover:bg-yellow-500 transition-all duration-300 flex items-center"
                >
                    <Icon icon="mdi:account" class="mr-1" />
                    {t?.auth.login || 'Se connecter'} / {t?.auth.signUp || "S'inscrire"}
                </button>
            {/if}
            
            <a href="https://github.com/KiadyNirina/CookUp" target="_blank" class="p-2 rounded hover:bg-gray-200 hover:cursor-pointer dark:hover:bg-gray-700 text-xl active:scale-70">
                <Icon icon="mdi:github" />
            </a>
            <ToggleTheme />
        </div>
    </div>
    
    {#if showAuthModal}
        <div transition:fade={{ duration: 150 }}>
            <Auth on:authSuccess={handleAuthSuccess} on:emailSent={handleEmailSent} on:close={handleAuthClose} />
        </div>
    {/if}
    
    {#if poppup}
        <div transition:fade={{ duration: 150 }}>
            <FormPoppup {urlParams} on:close={closePoppup} />
        </div>
    {/if}

    {#if showLoginSuccess}
        <div transition:fade={{ duration: 150 }}>
            <LoginSuccess message={loginSuccessMessage} on:close={closeLoginSuccess} />
        </div>
    {/if}

    {#if showEmailSent}
        <div 
            class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4"
            transition:fade={{ duration: 150 }}
            on:click={closeEmailSent}
        >
            <div 
                class="email-sent-modal bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
                on:click|stopPropagation
            >
                <div class="text-center">
                    <div class="flex justify-center mb-4">
                        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Icon 
                                icon="mdi:email-check" 
                                class="w-10 h-10 text-blue-600 dark:text-blue-400" 
                            />
                        </div>
                    </div>
                    
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                        {$language === 'fr' ? 'Email envoyé !' : 'Email sent!'}
                    </h2>
                    
                    <p class="text-blue-600 dark:text-blue-400 font-semibold mb-4">
                        📧 {emailSentMessage}
                    </p>
                    
                    <p class="text-gray-600 dark:text-gray-300 text-sm mb-6">
                        {$language === 'fr' 
                            ? 'Vérifiez votre boîte de réception et vos spams.' 
                            : 'Check your inbox and spam folder.'}
                    </p>
                    
                    <button
                        on:click={closeEmailSent}
                        class="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-300 flex items-center justify-center mx-auto"
                    >
                        <Icon icon="mdi:check" class="w-5 h-5 mr-2" />
                        {$language === 'fr' ? 'Compris' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    {#if showRatingSuccess}
        <div 
            class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4"
            transition:fade={{ duration: 150 }}
            on:click={closeRatingSuccess}
        >
            <div 
                class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
                on:click|stopPropagation
            >
                <div class="text-center">
                    <div class="flex justify-center mb-4">
                        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Icon 
                                icon="mdi:star" 
                                class="w-10 h-10 text-green-600 dark:text-green-400" 
                            />
                        </div>
                    </div>
                    
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                        {$language === 'fr' ? 'Note enregistrée !' : 'Rating saved!'}
                    </h2>
                    
                    <p class="text-green-600 dark:text-green-400 font-semibold mb-4">
                        {ratingSuccessMessage}
                    </p>
                    
                    <button
                        on:click={closeRatingSuccess}
                        class="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all duration-300 flex items-center justify-center mx-auto"
                    >
                        <Icon icon="mdi:check" class="w-5 h-5 mr-2" />
                        {$language === 'fr' ? 'Compris' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    {/if}
    
    <div class="h-[100vh] p-[20px] pt-16">
        <div class="header flex h-full items-center">
            <div class="sect1 w-1/2">
                <h1 class="edu-vic-wa-nt-hand-pre-test text-7xl font-extrabold">{t?.headline || 'Loading...'}</h1>
                <p class="dark:font-thin mt-5">
                    {#if $user}
                        {t?.auth.welcomeBack} , {$user.email?.split('@')[0]}
                    {:else}
                        {t?.subheadline || 'Loading...'}
                    {/if}
                </p>
                <button
                    class="button mt-5 flex items-center bg-yellow-600 text-white dark:text-black font-bold p-4 rounded-2xl transition-all duration-300 ease-in-out hover:cursor-pointer hover:text-yellow-600 hover:bg-transparent border-2 hover:border-yellow-600 active:scale-70"
                    on:click={togglePoppup}
                >
                    <Icon icon="mdi:timer-outline" class="mr-1" />
                    {t?.getStarted || 'Get Started'}
                </button>
            </div>
            <div class="sect2 w-1/2 flex items-center">
                <img
                    src="/img/ramen-96.svg"
                    alt={$language === 'en' ? 'Breakfast' : 'Petit déjeuner'}
                    class="breakfast ml-auto"
                />
            </div>
        </div>
    </div>

    <section
        bind:this={recipeSection}
        class="recipe-count-section p-[20px] mt-32 mb-32"
        style="opacity: 0;"
    >
        <div class="max-w-7xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold mb-4 edu-vic-wa-nt-hand-pre-test">
                {t?.recipeCountTitle || 'Loading...'}
            </h2>
            <p class="dark:font-thin mb-12 max-w-2xl mx-auto">
                {t?.recipeCountSubtitle || 'Loading...'}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 px-5">
                <div class="recipe-count p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:food-fork-drink" class="text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipeCount.toLocaleString()} +
                    </p>
                    <p class="dark:font-thin mt-2">
                        {t?.recipeCountTotal || 'Loading...'}
                    </p>
                </div>
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:earth" class="text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipeCountInternational.toLocaleString()} +
                    </p>
                    <p class="dark:font-thin mt-2">
                        {t?.recipeCountInternational || 'Loading...'}
                    </p>
                </div>
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:calendar-refresh" class="text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">Daily</p>
                    <p class="dark:font-thin mt-2">
                        {t?.recipeCountUpdates || 'Loading...'}
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Section de notation -->
    <section class="rating-section p-[20px] mb-32">
        <div class="max-w-7xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold mb-4 edu-vic-wa-nt-hand-pre-test">
                {t?.rating?.title || 'Donnez votre avis'}
            </h2>
            <p class="dark:font-thin mb-12 max-w-2xl mx-auto">
                {t?.rating?.subtitle || 'Partagez votre expérience avec nous !'}
            </p>
            <div class="bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 p-6 max-w-md mx-auto">
                <div class="flex justify-center mb-4">
                    {#each [1, 2, 3, 4, 5] as star}
                        <button
                            on:click={() => setRating(star)}
                            on:mouseenter={(event) => handleStarHover(star, event)}
                            on:mouseleave={handleStarLeave}
                            class="star-{star} text-3xl mx-1 cursor-pointer transition-all duration-200 {rating >= star || hoverRating >= star ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600'}"
                            disabled={ratingLoading}
                        >
                            <Icon icon="mdi:star" />
                        </button>
                    {/each}
                </div>
                <textarea
                    bind:value={comment}
                    placeholder={t?.rating?.commentPlaceholder || 'Laissez un commentaire...'}
                    class="w-full h-24 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition-all duration-300 resize-none"
                    disabled={ratingLoading}
                ></textarea>
                <button
                    on:click={submitRating}
                    disabled={ratingLoading || rating < 1}
                    class="mt-4 w-full bg-yellow-600 cursor-pointer text-white dark:text-black px-4 py-3 rounded-xl font-semibold hover:bg-yellow-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                >
                    {#if ratingLoading}
                        <Icon icon="mdi:loading" class="w-5 h-5 animate-spin mr-2" />
                        {t?.loading || 'Chargement...'}
                    {:else}
                        <Icon icon="mdi:send" class="w-5 h-5 mr-2" />
                        {t?.rating?.submit || 'Envoyer'}
                    {/if}
                </button>
            </div>
        </div>
    </section>

    <div class="footer text-sm text-center p-2 text-gray-600 dark:text-gray-400">
        {@html t?.footer || 'Loading...'}
    </div>

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
                        {t?.auth.logoutConfirmTitle || 'Déconnexion'}
                    </h2>
                    <p class="mt-2 text-gray-600 dark:text-gray-300">
                        {t?.auth.logoutConfirmMessage || 'Êtes-vous sûr de vouloir vous déconnecter ?'}
                    </p>
                </div>

                <div class="flex gap-4 justify-center">
                    <button
                        on:click={cancelLogout}
                        disabled={logoutLoading}
                        class="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-300 disabled:opacity-50"
                    >
                        {t?.auth.cancel || 'Annuler'}
                    </button>
                    
                    <button
                        on:click={signOut}
                        disabled={logoutLoading}
                        class="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                        {#if logoutLoading}
                            <Icon icon="mdi:loading" class="w-5 h-5 animate-spin mr-2" />
                            {t?.auth.loggingOut || 'Déconnexion...'}
                        {:else}
                            <Icon icon="mdi:logout" class="w-5 h-5 mr-2" />
                            {t?.auth.confirmLogout || 'Se déconnecter'}
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
    @import "tailwindcss";
    @custom-variant dark (&:where(.dark, .dark *));
    @font-face {
        font-family: 'NunitoSans';
        src: url('/fonts/NunitoSans.ttf') format('truetype');
        font-style: normal;
    }
    @font-face {
        font-family: 'Pacifico';
        src: url('/fonts/Pacifico-Regular.ttf') format('truetype');
        font-style: normal;
    }
    * {
        font-family: "NunitoSans";
    }
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
    @media screen and (max-width: 640px) {
        .header {
            flex-direction: column;
            justify-content: center;
        }
        .sect1 {
            width: 100%;
            text-align: center;
        }
        .sect2 {
            margin-top: 20px;
            width: 100%;
            text-align: center;
        }
        .sect2 img {
            width: 50%;
            margin-left: auto;
            margin-right: auto;
        }
        .sect1 h1 {
            font-size: 2rem;
        }
        .sect1 p {
            font-size: 12px;
        }
        .button {
            margin-left: auto;
            margin-right: auto;
            font-size: 12px;
        }
        .recipe-count-section h2 {
            font-size: 1.8rem;
        }
        .recipe-count-section p {
            font-size: 12px;
        }
        .recipe-count p:first-child,
        .recipe-count-section .grid > div p:first-child {
            font-size: 1.5rem;
        }
        .recipe-count-section .grid > div p:last-child {
            font-size: 12px;
        }   
        .rating-section h2 {
            font-size: 1.8rem;
        }
        .rating-section p {
            font-size: 12px;
        }   
        .relative.group .absolute {
            right: auto;
            left: 0;
            width: 100%;
        }
    }
    @media screen and (min-width: 641px) and (max-width: 768px) {
        .sect1 h1 {
            font-size: 3rem;
        }
        .sect1 p {
            font-size: 15px;
        }
        .button {
            font-size: 12px;
        }
        .recipe-count-section h2 {
            font-size: 2rem;
        }
        .recipe-count p:first-child,
        .recipe-count-section .grid > div p:first-child {
            font-size: 1.8rem;
        }
        .recipe-count-section .grid > div p:last-child {
            font-size: 12px;
        }
        .rating-section h2 {
            font-size: 2rem;
        }
    }
</style>