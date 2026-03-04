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
    let showProfilePopup = false;
    let recipeCount = 0;
    let recipeCountInternational = 0;
    let recipeSection;

    let pendingUrlParams = null;

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

        if (browser) {
            const savedLanguage = localStorage.getItem('language');
            if (savedLanguage) $language = savedLanguage;
            
            checkUrlParams();
        }

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

    function checkUrlParams() {
        if (!browser) return;
        
        const urlSearchParams = new URLSearchParams(window.location.search);
        const hasRecipeParams = urlSearchParams.has('recipeId') || 
                              (urlSearchParams.has('type') && urlSearchParams.has('diet'));
        
        if (hasRecipeParams) {
            pendingUrlParams = {
                type: urlSearchParams.get('type') || '',
                diet: urlSearchParams.get('diet') || '',
                recipeId: urlSearchParams.get('recipeId') || '',
                excludeIngredients: urlSearchParams.get('excludeIngredients')?.split(',') || [],
                minCarbs: urlSearchParams.get('minCarbs') || '',
                maxCarbs: urlSearchParams.get('maxCarbs') || '',
                minProtein: urlSearchParams.get('minProtein') || '',
                maxProtein: urlSearchParams.get('maxProtein') || '',
                minFat: urlSearchParams.get('minFat') || '',
                maxFat: urlSearchParams.get('maxFat') || '',
                minCalories: urlSearchParams.get('minCalories') || '',
                maxCalories: urlSearchParams.get('maxCalories') || ''
            };
            
            if ($user) {
                openRecipePopup();
            } else {
                showAuthModal = true;
            }
        }
    }

    function openRecipePopup() {
        if (pendingUrlParams) {
            urlParams = pendingUrlParams;
            poppup = true;
            pendingUrlParams = null;

            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    $: {
        if ($user && pendingUrlParams) {
            openRecipePopup();
            showAuthModal = false;
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
        showAuthModal = false;
        
        window.location.reload();
    }

    function openProfilePopup() {
        if ($user) {
            showProfilePopup = true;
        }
    }

    function closeProfilePopup() {
        showProfilePopup = false;
    }

    function togglePoppup() {
        if (!$user) {
            showAuthModal = true;
            return;
        }
        poppup = !poppup;
        if (!poppup && browser) {
            window.history.replaceState({}, document.title, '/');
            poppup = false;
        }
    }

    function closePoppup() {
        poppup = false;
        pendingUrlParams = null;
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
        if (showProfilePopup && !event.target.closest('.profile-popup')) {
            showProfilePopup = false;
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
        
        if (pendingUrlParams) {
            setTimeout(openRecipePopup, 500);
        }
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

<div class="font-['NunitoSans'] text-black dark:text-white max-w-7xl mx-auto">
    <!-- Header fixe -->
    <div class="transition-all duration-500 ease-in-out fixed w-full max-w-7xl mx-auto flex items-center bg-white dark:bg-black p-2 z-10">
        <p class="text-xl flex items-end">
            <img src="img/black.png" alt="Logo dark" class="block dark:hidden h-12" />
            <img src="img/white.png" alt="Logo light" class="hidden dark:block h-12" />
        </p>
        <div class="flex ml-auto items-center gap-2">
            <!-- Sélecteur de langue -->
            <div class="relative group">
                <button
                    class="bg-yellow-600 text-white dark:text-black px-3 py-1 rounded text-sm font-semibold hover:cursor-pointer hover:bg-yellow-500 transition-all duration-300 flex items-center"
                    aria-label="Select language"
                >
                    {availableLanguages.find(lang => lang.code === $language)?.label || 'English'}
                    <Icon icon="mdi:chevron-down" class="ml-1" />
                </button>
                <div
                    class="absolute right-0 sm:right-auto sm:left-0 mt-2 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
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
                    
                    <div class="absolute right-0 sm:right-auto sm:left-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <button
                            on:click={openProfilePopup}
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
                class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
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

    {#if showProfilePopup}
        <div 
            class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4"
            transition:fade={{ duration: 150 }}
            on:click={closeProfilePopup}
        >
            <div 
                class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
                on:click|stopPropagation
            >
                <div class="text-center">
                    <div class="flex justify-center mb-4">
                        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Icon 
                                icon="mdi:account" 
                                class="w-10 h-10 text-blue-600 dark:text-blue-400" 
                            />
                        </div>
                    </div>
                    
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                        {t?.auth.profile || 'My Profile'}
                    </h2>
                    
                    <p class="text-gray-600 dark:text-gray-300 mb-2">
                        <strong>{t?.auth.email || 'Email'}:</strong> {$user?.email || 'N/A'}
                    </p>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">
                        <strong>{t?.auth.username || 'Username'}:</strong> {$user?.email?.split('@')[0] || 'N/A'}
                    </p>
                    
                    <button
                        on:click={closeProfilePopup}
                        class="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-300 flex items-center justify-center mx-auto"
                    >
                        <Icon icon="mdi:close" class="w-5 h-5 mr-2" />
                        {$language === 'fr' ? 'Fermer' : 'Close'}
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
    
    <!-- Hero section -->
    <div class="h-screen flex items-center">
        <div class="flex flex-col sm:flex-row items-center mx-auto px-10">
            <div class="w-full sm:w-1/2 text-center sm:text-left">
                <h1 class="font-['Permanent_Marker'] text-4xl sm:text-5xl md:text-7xl font-extrabold">{t?.headline || 'Loading...'}</h1>
                <p class="dark:font-thin mt-5 text-sm sm:text-base">
                    {#if $user}
                        {t?.auth.welcomeBack} , {$user.email?.split('@')[0]}
                    {:else}
                        {t?.subheadline || 'Loading...'}
                    {/if}
                </p>
                <button
                    class="button mt-5 flex items-center justify-center sm:justify-start bg-yellow-600 text-white dark:text-black font-bold p-4 rounded-2xl transition-all duration-300 ease-in-out hover:cursor-pointer hover:text-yellow-600 hover:bg-transparent border-2 hover:border-yellow-600 active:scale-70 mx-auto sm:mx-0 text-sm sm:text-base"
                    on:click={togglePoppup}
                >
                    <Icon icon="mdi:timer-outline" class="mr-1" />
                    {#if $user}
                        {t?.getStarted || 'Get Started'}
                    {:else}
                        {t?.auth.loginBeforeStart || 'Log in'}
                    {/if}
                </button>
            </div>
            <div class="w-full sm:w-1/2 flex items-center mt-5 sm:mt-0">
                <img
                    src="/img/ramen-96.svg"
                    alt={$language === 'en' ? 'Breakfast' : 'Petit déjeuner'}
                    class="breakfast w-1/2 sm:w-auto mx-auto sm:ml-auto"
                />
            </div>
        </div>
    </div>

    <!-- Section Fonctionnalités -->
    <section class="py-28 md:py-36">
        <div class="max-w-7xl mx-auto px-10">
            <div class="text-center mb-20">
                <h2 class="text-4xl sm:text-5xl md:text-6xl font-['Permanent_Marker'] font-extrabold mb-6">
                    {t?.features?.title || 'Comment ça marche'}
                </h2>
                <p class="dark:font-thin text-base sm:text-lg max-w-2xl mx-auto">
                    {t?.features?.subtitle || 'Trois étapes simples pour des repas personnalisés'}
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="space-y-12">
                    <div class="flex gap-4">
                        <div class="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <span class="text-xl font-bold text-yellow-600 dark:text-yellow-400">1</span>
                        </div>
                        <div>
                            <h3 class="text-xl sm:text-2xl font-bold mb-2">{t?.features?.step1Title || 'Choisissez vos préférences'}</h3>
                            <p class="text-sm sm:text-base dark:font-thin">
                                {t?.features?.step1Desc || 'Type de repas, régime alimentaire, ingrédients à exclure'}
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <div class="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <span class="text-xl font-bold text-yellow-600 dark:text-yellow-400">2</span>
                        </div>
                        <div>
                            <h3 class="text-xl sm:text-2xl font-bold mb-2">{t?.features?.step2Title || 'Obtenez une recette'}</h3>
                            <p class="text-sm sm:text-base dark:font-thin">
                                {t?.features?.step2Desc || 'Notre IA génère une recette adaptée à vos besoins'}
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <div class="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <span class="text-xl font-bold text-yellow-600 dark:text-yellow-400">3</span>
                        </div>
                        <div>
                            <h3 class="text-xl sm:text-2xl font-bold mb-2">{t?.features?.step3Title || 'Cuisinez et savourez'}</h3>
                            <p class="text-sm sm:text-base dark:font-thin">
                                {t?.features?.step3Desc || 'Instructions détaillées, temps de préparation, valeurs nutritionnelles'}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="relative">
                    <img 
                        src="/img/cooking-process.svg" 
                        alt="Cooking process illustration"
                        class="w-full h-auto"
                        on:error={(e) => e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Illustration'}
                    />
                    <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-yellow-600/5 dark:bg-yellow-400/5 rounded-full"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-32">
                <div class="relative order-2 lg:order-1">
                    <img 
                        src="/img/meal-planning.svg" 
                        alt="Meal planning illustration"
                        class="w-full h-auto"
                        on:error={(e) => e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Illustration'}
                    />
                </div>

                <div class="order-1 lg:order-2">
                    <h3 class="text-2xl sm:text-3xl font-bold mb-6">{t?.features?.advancedTitle || 'Fonctionnalités avancées'}</h3>
                    
                    <ul class="space-y-4">
                        <li class="flex items-start gap-3">
                            <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                            <span class="text-sm sm:text-base dark:font-thin">{t?.features?.feature1 || 'Filtres nutritionnels avancés'}</span>
                        </li>
                        <li class="flex items-start gap-3">
                            <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                            <span class="text-sm sm:text-base dark:font-thin">{t?.features?.feature2 || 'Export PDF des recettes'}</span>
                        </li>
                        <li class="flex items-start gap-3">
                            <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                            <span class="text-sm sm:text-base dark:font-thin">{t?.features?.feature3 || 'Traduction automatique'}</span>
                        </li>
                        <li class="flex items-start gap-3">
                            <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                            <span class="text-sm sm:text-base dark:font-thin">{t?.features?.feature4 || 'Sauvegarde des préférences'}</span>
                        </li>
                    </ul>

                    <a href="/features" class="inline-flex items-center mt-8 text-yellow-600 dark:text-yellow-400 font-medium hover:gap-2 transition-all text-sm sm:text-base">
                        {t?.features?.discoverMore || 'Découvrir toutes les fonctionnalités'}
                        <Icon icon="mdi:arrow-right" class="ml-1" />
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Section alternative -->
    <section class="py-28 md:py-36">
        <div class="max-w-7xl mx-auto px-10">
            <div class="text-center mb-20">
                <h2 class="text-4xl sm:text-5xl md:text-6xl font-['Permanent_Marker'] font-extrabold mb-6">
                    {t?.featuresAlt?.title || 'Pourquoi nous choisir'}
                </h2>
                <p class="text-base sm:text-lg dark:font-thin max-w-2xl mx-auto">
                    {t?.featuresAlt?.subtitle || 'Une expérience culinaire simplifiée'}
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div class="text-center mb-8 md:mb-0">
                    <div class="mb-8">
                        <img 
                            src="/img/personalized.svg" 
                            alt="Personalized recipes"
                            class="w-48 h-48 sm:w-64 sm:h-64 mx-auto object-contain"
                            on:error={(e) => e.currentTarget.src = 'https://via.placeholder.com/256?text=🎯'}
                        />
                    </div>
                    <h3 class="text-xl sm:text-2xl font-bold mb-3">{t?.featuresAlt?.personalized || 'Personnalisé'}</h3>
                    <p class="text-sm sm:text-base dark:font-thin">
                        {t?.featuresAlt?.personalizedDesc || 'Des recettes adaptées à vos goûts et restrictions'}
                    </p>
                </div>

                <div class="text-center mb-8 md:mb-0">
                    <div class="mb-8">
                        <img 
                            src="/img/quick.svg" 
                            alt="Quick & easy"
                            class="w-48 h-48 sm:w-64 sm:h-64 mx-auto object-contain"
                            on:error={(e) => e.currentTarget.src = 'https://via.placeholder.com/256?text=⚡'}
                        />
                    </div>
                    <h3 class="text-xl sm:text-2xl font-bold mb-3">{t?.featuresAlt?.quick || 'Rapide & simple'}</h3>
                    <p class="text-sm sm:text-base dark:font-thin">
                        {t?.featuresAlt?.quickDesc || 'Obtenez une idée de recette en un clic'}
                    </p>
                </div>

                <div class="text-center">
                    <div class="mb-8">
                        <img 
                            src="/img/nutritious.svg" 
                            alt="Nutritious"
                            class="w-48 h-48 sm:w-64 sm:h-64 mx-auto object-contain"
                            on:error={(e) => e.currentTarget.src = 'https://via.placeholder.com/256?text=🥗'}
                        />
                    </div>
                    <h3 class="text-xl sm:text-2xl font-bold mb-3">{t?.featuresAlt?.nutritious || 'Équilibré'}</h3>
                    <p class="text-sm sm:text-base dark:font-thin">
                        {t?.featuresAlt?.nutritiousDesc || 'Suivez vos apports nutritionnels'}
                    </p>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Section compteur de recettes -->
    <section
        bind:this={recipeSection}
        class="py-28 md:py-36 flex items-center opacity-0"
    >
        <div class="px-10 w-full text-center">
            <h2 class="text-4xl sm:text-5xl md:text-6xl font-['Permanent_Marker'] font-extrabold mb-4">
                {t?.recipeCountTitle || 'Loading...'}
            </h2>
            <p class="dark:font-thin mb-12 max-w-2xl mx-auto text-sm sm:text-base">
                {t?.recipeCountSubtitle || 'Loading...'}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 px-5 sm:px-10">
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:food-fork-drink" class="text-3xl sm:text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipeCount.toLocaleString()} +
                    </p>
                    <p class="dark:font-thin mt-2 text-xs sm:text-sm">
                        {t?.recipeCountTotal || 'Loading...'}
                    </p>
                </div>
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:earth" class="text-3xl sm:text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipeCountInternational.toLocaleString()} +
                    </p>
                    <p class="dark:font-thin mt-2 text-xs sm:text-sm">
                        {t?.recipeCountInternational || 'Loading...'}
                    </p>
                </div>
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:calendar-refresh" class="text-3xl sm:text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">Daily</p>
                    <p class="dark:font-thin mt-2 text-xs sm:text-sm">
                        {t?.recipeCountUpdates || 'Loading...'}
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- Section de notation -->
    <section class="py-28 md:py-36">
        <div class="max-w-7xl mx-auto text-center">
            <div class="flex flex-col md:flex-row items-center justify-center">
                <div class="w-full md:w-1/3 p-4 md:mr-16 mb-8 md:mb-0">
                    <img src="img/undraw_reviews_ukai.svg" alt="" class="max-w-xs mx-auto">
                </div>
                <div class="w-full md:w-1/3">
                    <h2 class="text-3xl sm:text-4xl font-['Permanent_Marker'] font-extrabold mb-4">
                        {t?.rating?.title || 'Donnez votre avis'}
                    </h2>
                    <p class="dark:font-thin mb-12 max-w-2xl mx-auto text-sm sm:text-base">
                        {t?.rating?.subtitle || 'Partagez votre expérience avec nous !'}
                    </p>
                    <div class="bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 p-6 max-w-md mx-auto">
                        <div class="flex justify-center mb-4">
                            {#each [1, 2, 3, 4, 5] as star}
                                <button
                                    on:click={() => setRating(star)}
                                    on:mouseenter={(event) => handleStarHover(star, event)}
                                    on:mouseleave={handleStarLeave}
                                    class="star-{star} text-2xl sm:text-3xl mx-1 cursor-pointer transition-all duration-200 {rating >= star || hoverRating >= star ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600'}"
                                    disabled={ratingLoading}
                                >
                                    <Icon icon="mdi:star" />
                                </button>
                            {/each}
                        </div>
                        <textarea
                            bind:value={comment}
                            placeholder={t?.rating?.commentPlaceholder || 'Laissez un commentaire...'}
                            class="w-full h-24 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition-all duration-300 resize-none text-sm sm:text-base"
                            disabled={ratingLoading}
                        ></textarea>
                        <button
                            on:click={submitRating}
                            disabled={ratingLoading || rating < 1}
                            class="mt-4 w-full bg-yellow-600 cursor-pointer text-white dark:text-black px-4 py-3 rounded-xl font-semibold hover:bg-yellow-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
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
            </div>
        </div>
    </section>

    <!-- Footer -->
    <div class="text-xs sm:text-sm text-center p-2 dark:font-thin">
        {t?.footer || 'Loading...'}
    </div>

    <!-- Modal de confirmation de déconnexion -->
    {#if showLogoutConfirm}
        <div 
            class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4"
            transition:fade={{ duration: 150 }}
        >
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                <div class="text-center mb-6">
                    <Icon 
                        icon="mdi:logout" 
                        class="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" 
                    />
                    <h2 class="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {t?.auth.logoutConfirmTitle || 'Déconnexion'}
                    </h2>
                    <p class="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                        {t?.auth.logoutConfirmMessage || 'Êtes-vous sûr de vouloir vous déconnecter ?'}
                    </p>
                </div>

                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        on:click={cancelLogout}
                        disabled={logoutLoading}
                        class="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-300 disabled:opacity-50 text-sm sm:text-base"
                    >
                        {t?.auth.cancel || 'Annuler'}
                    </button>
                    
                    <button
                        on:click={signOut}
                        disabled={logoutLoading}
                        class="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
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
</style>