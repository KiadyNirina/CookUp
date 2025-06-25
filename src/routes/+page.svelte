<script>
    import Icon from "@iconify/svelte";
    import ToggleTheme from "$lib/ThemeToggle.svelte";
    import FormPoppup from "$lib/FormPoppup.svelte";
    import { fade } from "svelte/transition";
    import { gsap } from "gsap";
    import { onMount } from "svelte";
    import { language } from "../stores/language";
    import { translations } from "$lib/translations";
    import { browser } from "$app/environment";

    let bottle;
    let poppup = false;
    let showLanguageDropdown = false;
    let recipeCount = 0;
    let recipeCountInternational = 0;
    let recipeSection;

    const availableLanguages = [
        { code: 'en', label: 'EN' },
        { code: 'fr', label: 'FR' },
    ];

    onMount(() => {
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
                        observer.disconnect();
                    }
                },
                { threshold: 0.5 }
            );
            observer.observe(recipeSection);
        }

        if (browser) {
            const savedLanguage = localStorage.getItem('language');
            if (savedLanguage) {
                $language = savedLanguage;
            }
            const params = new URLSearchParams(window.location.search);
            if (params.get('type') && params.get('mood') && params.get('prepTime') && params.get('recipeId')) {
                poppup = true;
            }
        }
    });

    function togglePoppup() {
        poppup = !poppup;
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
        showLanguageDropdown = false;
    }

    function toggleLanguageDropdown() {
        showLanguageDropdown = !showLanguageDropdown;
    }

    function handleOutsideClick(event) {
        if (showLanguageDropdown && !event.target.closest('.language-dropdown')) {
            showLanguageDropdown = false;
        }
    }

    $: t = translations[$language] || translations.en;
</script>

<svelte:window on:mousedown={handleOutsideClick} />

<div class="text-black dark:text-white max-w-7xl ml-auto mr-auto">
    <div class="transition-all duration-500 ease-in-out fixed w-full max-w-7xl mx-auto flex items-center bg-white dark:bg-black p-2" style="z-index: 100;">
        <p class="text-xl flex items-end">
            <img src="img/black.png" alt="Logo dark" class="block dark:hidden h-12" />
            <img src="img/white.png" alt="Logo light" class="hidden dark:block h-12" />
        </p>
        <div class="flex ml-auto items-center gap-2">
            <div class="relative language-dropdown">
                <button
                    on:click={toggleLanguageDropdown}
                    class="bg-yellow-600 text-white dark:text-black px-3 py-1 rounded text-sm font-semibold hover:cursor-pointer hover:bg-yellow-600 transition-all duration-300 flex items-center"
                    aria-label="Select language"
                >
                    {availableLanguages.find(lang => lang.code === $language)?.label || 'English'}
                    <Icon icon="mdi:chevron-down" class="ml-1" />
                </button>
                {#if showLanguageDropdown}
                    <div
                        class="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-10"
                        transition:fade={{ duration: 150 }}
                    >
                        {#each availableLanguages as lang}
                            <button
                                on:click={() => toggleLanguage(lang.code)}
                                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 {$language === lang.code ? 'bg-gray-100 dark:bg-gray-700' : ''}"
                            >
                                {lang.label}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
            <a href="https://github.com/KiadyNirina/CookUp" target="_blank" class="p-2 rounded hover:bg-gray-200 hover:cursor-pointer dark:hover:bg-gray-700 text-xl active:scale-70">
                <Icon icon="mdi:github" />
            </a>
            <ToggleTheme />
        </div>
    </div>
    {#if poppup}
        <div transition:fade={{ duration: 150 }}>
            <FormPoppup on:close={closePoppup} />
        </div>
    {/if}
    <div class="h-[100vh] p-[20px]">
        <div class="header flex h-full items-center">
            <div class="sect1 w-1/2">
                <h1 class="edu-vic-wa-nt-hand-pre-test text-7xl font-extrabold">{t.headline}</h1>
                <p class="dark:font-thin mt-5">{t.subheadline}</p>
                <button
                    class="button mt-5 flex items-center bg-yellow-600 text-white dark:text-black font-bold p-4 rounded-2xl transition-all duration-300 ease-in-out hover:cursor-pointer hover:text-yellow-600 hover:bg-transparent border-2 hover:border-yellow-600 active:scale-70"
                    on:click={togglePoppup}
                >
                    <Icon icon="mdi:timer-outline" class="mr-1" />
                    {t.getStarted}
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
        class="recipe-count-section p-[20px] h-[100vh] mt-32 mb-32"
    >
        <div class="max-w-7xl mx-auto text-center">
            <h2 class="text-4xl font-extrabold mb-4 edu-vic-wa-nt-hand-pre-test">
                {t.recipeCountTitle}
            </h2>
            <p class="dark:font-thin mb-12 max-w-2xl mx-auto">
                {t.recipeCountSubtitle}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 px-5">
                <div class="recipe-count p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:food-fork-drink" class="text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipeCount.toLocaleString()} +
                    </p>
                    <p class="dark:font-thin mt-2">
                        {t.recipeCountTotal}
                    </p>
                </div>
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:earth" class="text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipeCountInternational.toLocaleString()} +
                    </p>
                    <p class="dark:font-thin mt-2">
                        {t.recipeCountInternational}
                    </p>
                </div>
                <div class="p-6 bg-white dark:bg-black rounded-lg shadow-lg dark:shadow-gray-900 hover:shadow-xl transform transition-all duration-500 hover:scale-105">
                    <Icon icon="mdi:calendar-refresh" class="text-4xl text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                    <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">Daily</p>
                    <p class="dark:font-thin mt-2">
                        {t.recipeCountUpdates}
                    </p>
                </div>
            </div>
        </div>
    </section>

    
    <div class="footer text-sm text-center p-2 text-gray-600 dark:text-gray-400">
        {@html t.footer}
    </div>
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
    .recipe-count-section {
        opacity: 0;
        animation: fadeIn 1s ease-in-out forwards;
        animation-delay: 0.2s;
    }
    @keyframes fadeIn {
        to {
            opacity: 1;
        }
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
    }
</style>