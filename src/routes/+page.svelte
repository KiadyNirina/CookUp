<script>
  import Icon from "@iconify/svelte";
  import Header from "$lib/Header.svelte";
  import FormPoppup from "$lib/FormPoppup.svelte";
  import { fade } from "svelte/transition";
  import { gsap } from "gsap";
  import { onMount } from "svelte";
  import { language } from "../stores/language";
  import { translations } from "$lib/translations";
  import { browser } from "$app/environment";
  import { user, initAuth, upsertUserProfile } from '../stores/auth';
  import { supabase } from '$lib/supabase';
  import { triggerAuthOpen } from '$lib/stores/ui';
  import { scrollReveal } from '$lib/actions/scrollReveal.js';

  let poppup = false;
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

  // Rating state
  let rating = 0;
  let comment = '';
  let showRatingSuccess = false;
  let ratingSuccessMessage = '';
  let ratingLoading = false;
  let hoverRating = 0;

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
      const counterObserver = new IntersectionObserver(
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
            counterObserver.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      counterObserver.observe(recipeSection);
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
        pendingUrlParams = pendingUrlParams;
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
    }
  }

  function togglePoppup() {
    if (!$user) {
      $triggerAuthOpen += 1;
      return;
    }
    poppup = !poppup;
    if (!poppup && browser) {
      window.history.replaceState({}, document.title, '/');
    }
  }

  function closePoppup() {
    poppup = false;
    pendingUrlParams = null;
    if (browser) {
      window.history.replaceState({}, document.title, '/');
    }
  }

  function handleAuthSuccess() {
    if (pendingUrlParams) {
      setTimeout(openRecipePopup, 500);
    }
  }

  function handleAuthClose() {
    pendingUrlParams = null;
  }

  async function submitRating() {
    if (!$user) return;
    if (rating < 1 || rating > 5) return;
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
      scale: 1.15,
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
        scale: 1,
        color: rating >= i
          ? (document.documentElement.classList.contains('dark') ? '#facc15' : '#d97706')
          : (document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'),
        duration: 0.2,
        ease: 'power2.out'
      });
    }
  }

  $: t = translations[$language] || translations.en;
</script>

<svelte:head>
  <title>{$language === 'fr' ? 'Accueil' : 'Home'} - CookUp</title>
</svelte:head>

<div class="font-['Montserrat'] max-w-7xl mx-auto">
  <Header on:authSuccess={handleAuthSuccess} on:authClose={handleAuthClose} />
</div>
<div class="font-['Montserrat'] text-gray-900 dark:text-gray-100 max-w-7xl mx-auto px-6 sm:px-10 min-h-screen">

  <!-- Popup Recette -->
  {#if poppup}
    <div transition:fade={{ duration: 150 }}>
      <FormPoppup {urlParams} on:close={closePoppup} />
    </div>
  {/if}

  <!-- Modal Succès Note -->
  {#if showRatingSuccess}
    <div class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4" transition:fade={{ duration: 150 }} on:click={closeRatingSuccess}>
      <div class="bg-white dark:bg-gray-900 p-8 rounded-3xl max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-xl" on:click|stopPropagation>
        <div class="text-center">
          <div class="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <Icon icon="mdi:check-circle" class="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          <h2 class="text-2xl font-bold mb-2">{$language === 'fr' ? 'Note enregistrée !' : 'Rating saved!'}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8">{ratingSuccessMessage}</p>
          <button on:click={closeRatingSuccess} class="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors duration-300">
            {$language === 'fr' ? 'Compris' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Hero Section -->
  <div use:scrollReveal={{ once: false }} class="min-h-[85vh] flex items-center pt-20 pb-10">
    <div class="flex flex-col md:flex-row items-center w-full gap-12">
      <div class="w-full md:w-1/2 text-center md:text-left flex flex-col items-center md:items-start">
        <h1 class="font-['Unbounded'] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-tight text-gray-900 dark:text-white">
          {t?.headline || 'Loading...'}
        </h1>
        <p class="mt-6 text-sm text-gray-600 dark:text-gray-400 max-w-lg">
          {#if $user}
            {t?.auth.welcomeBack}, {$user.email?.split('@')[0]}
          {:else}
            {t?.subheadline || 'Loading...'}
          {/if}
        </p>
        <button
          class="mt-10 text-sm flex items-center justify-center gap-2 bg-yellow-600 text-white dark:text-gray-950 font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-yellow-500 active:scale-95 w-auto"
          on:click={togglePoppup}
        >
          <Icon icon="mdi:timer-outline" class="text-xl" />
          {#if $user}
            {t?.getStarted || 'Get Started'}
          {:else}
            {t?.auth.loginBeforeStart || 'Log in'}
          {/if}
        </button>
      </div>
      <div class="w-full md:w-1/2 flex justify-center md:justify-end">
        <img src="/img/ramen-96.svg" alt="Breakfast" class="breakfast object-contain" />
      </div>
    </div>
  </div>

  <!-- Features Section -->
  <section use:scrollReveal={{ once: false }} class="py-24 md:py-32">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-5xl font-['Unbounded'] font-extrabold mb-4 text-gray-900 dark:text-white">
        {t?.features?.title || 'Comment ça marche'}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
        {t?.features?.subtitle || 'Trois étapes simples pour des repas personnalisés'}
      </p>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div class="space-y-10">
        <!-- Étape 1 -->
        <div class="flex gap-6 items-start">
          <div class="flex-shrink-0 w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center text-xl font-bold border border-yellow-100 dark:border-yellow-900/30">
            1
          </div>
          <div>
            <h3 class="text-xl font-bold mb-2">{t?.features?.step1Title || 'Choisissez vos préférences'}</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{t?.features?.step1Desc || 'Type de repas, régime alimentaire, ingrédients à exclure'}</p>
          </div>
        </div>
        <!-- Étape 2 -->
        <div class="flex gap-6 items-start">
          <div class="flex-shrink-0 w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center text-xl font-bold border border-yellow-100 dark:border-yellow-900/30">
            2
          </div>
          <div>
            <h3 class="text-xl font-bold mb-2">{t?.features?.step2Title || 'Obtenez une recette'}</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{t?.features?.step2Desc || 'Notre IA génère une recette adaptée à vos besoins'}</p>
          </div>
        </div>
        <!-- Étape 3 -->
        <div class="flex gap-6 items-start">
          <div class="flex-shrink-0 w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center text-xl font-bold border border-yellow-100 dark:border-yellow-900/30">
            3
          </div>
          <div>
            <h3 class="text-xl font-bold mb-2">{t?.features?.step3Title || 'Cuisinez et savourez'}</h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{t?.features?.step3Desc || 'Instructions détaillées, temps de préparation, valeurs nutritionnelles'}</p>
          </div>
        </div>
      </div>
      <div class="relative flex justify-center">
        <div class="absolute inset-0 bg-yellow-600/5 dark:bg-yellow-400/5 rounded-[3rem] -rotate-3 scale-105 -z-10"></div>
        <img src="/img/cooking-process.svg" alt="Cooking process" class="w-full max-w-md h-auto" />
      </div>
    </div>

    <!-- Advanced Features Section -->
    <div use:scrollReveal={{ once: false }} class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-32">
      <div class="relative order-2 lg:order-1 flex justify-center">
        <div class="absolute inset-0 bg-gray-50 dark:bg-gray-900/30 rounded-[3rem] rotate-3 scale-105 -z-10"></div>
        <img src="/img/meal-planning.svg" alt="Meal planning" class="w-full max-w-md h-auto" />
      </div>
      <div class="order-1 lg:order-2">
        <h3 class="text-3xl font-bold mb-8">{t?.features?.advancedTitle || 'Fonctionnalités avancées'}</h3>
        <ul class="space-y-5">
          <li class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 flex-shrink-0">
              <Icon icon="mdi:check" class="text-yellow-600 dark:text-yellow-400 text-xl" />
            </div>
            <span class="text-gray-700 dark:text-gray-300 font-medium">{t?.features?.feature1 || 'Filtres nutritionnels avancés'}</span>
          </li>
          <li class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 flex-shrink-0">
              <Icon icon="mdi:check" class="text-yellow-600 dark:text-yellow-400 text-xl" />
            </div>
            <span class="text-gray-700 dark:text-gray-300 font-medium">{t?.features?.feature2 || 'Export PDF des recettes'}</span>
          </li>
          <li class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 flex-shrink-0">
              <Icon icon="mdi:check" class="text-yellow-600 dark:text-yellow-400 text-xl" />
            </div>
            <span class="text-gray-700 dark:text-gray-300 font-medium">{t?.features?.feature3 || 'Traduction automatique'}</span>
          </li>
        </ul>
        <a href="/features" class="inline-flex items-center mt-10 text-yellow-600 dark:text-yellow-400 font-semibold hover:opacity-80 transition-opacity gap-2 group">
          {t?.features?.discoverMore || 'Découvrir toutes les fonctionnalités'}
          <Icon icon="mdi:arrow-right" class="transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  </section>

  <!-- Alternative Features (Why choose us) -->
  <section use:scrollReveal={{ y: 30, delay: 0.1, once: false }} class="py-24">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-5xl font-['Unbounded'] font-extrabold mb-4 text-gray-900 dark:text-white">
        {t?.featuresAlt?.title || 'Pourquoi nous choisir'}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
        {t?.featuresAlt?.subtitle || 'Une expérience culinaire simplifiée'}
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center p-8 rounded-3xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 transition-transform duration-300 hover:-translate-y-1">
        <img src="/img/personalized.svg" alt="Personalized" class="w-32 h-32 mx-auto object-contain mb-6" />
        <h3 class="text-xl font-bold mb-3">{t?.featuresAlt?.personalized || 'Personnalisé'}</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm">{t?.featuresAlt?.personalizedDesc || 'Des recettes adaptées à vos goûts et restrictions'}</p>
      </div>
      <div class="text-center p-8 rounded-3xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 transition-transform duration-300 hover:-translate-y-1">
        <img src="/img/quick.svg" alt="Quick" class="w-32 h-32 mx-auto object-contain mb-6" />
        <h3 class="text-xl font-bold mb-3">{t?.featuresAlt?.quick || 'Rapide & simple'}</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm">{t?.featuresAlt?.quickDesc || 'Obtenez une idée de recette en un clic'}</p>
      </div>
      <div class="text-center p-8 rounded-3xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 transition-transform duration-300 hover:-translate-y-1">
        <img src="/img/nutritious.svg" alt="Nutritious" class="w-32 h-32 mx-auto object-contain mb-6" />
        <h3 class="text-xl font-bold mb-3">{t?.featuresAlt?.nutritious || 'Équilibré'}</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm">{t?.featuresAlt?.nutritiousDesc || 'Suivez vos apports nutritionnels'}</p>
      </div>
    </div>
  </section>

  <!-- Recipe Counter Section -->
  <section bind:this={recipeSection} class="py-24">
    <div class="text-center max-w-4xl mx-auto">
      <h2 class="text-3xl sm:text-5xl font-['Unbounded'] font-extrabold mb-4 text-gray-900 dark:text-white">
        {t?.recipeCountTitle || 'Toujours plus de recettes'}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-12 text-lg">
        {t?.recipeCountSubtitle || 'Découvrez une infinité de possibilités.'}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center">
          <div class="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
            <Icon icon="mdi:food-fork-drink" class="text-2xl text-yellow-600 dark:text-yellow-400" />
          </div>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mb-1">{recipeCount.toLocaleString()} +</p>
          <p class="text-sm text-gray-500">{t?.recipeCountTotal || 'Total Recipes'}</p>
        </div>
        <div class="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center">
          <div class="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
            <Icon icon="mdi:earth" class="text-2xl text-yellow-600 dark:text-yellow-400" />
          </div>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mb-1">{recipeCountInternational.toLocaleString()} +</p>
          <p class="text-sm text-gray-500">{t?.recipeCountInternational || 'Cuisines'}</p>
        </div>
        <div class="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center">
          <div class="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
            <Icon icon="mdi:calendar-refresh" class="text-2xl text-yellow-600 dark:text-yellow-400" />
          </div>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mb-1">Daily</p>
          <p class="text-sm text-gray-500">{t?.recipeCountUpdates || 'Updates'}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Rating Section -->
  <section use:scrollReveal={{ y: 30, once: false }} class="py-24">
    <div class="bg-gray-50 dark:bg-gray-900/50 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-8 sm:p-16 flex flex-col md:flex-row items-center gap-12">
      <div class="w-full md:w-1/2 flex justify-center">
        <img src="img/undraw_reviews_ukai.svg" alt="Reviews" class="max-w-[280px] w-full" />
      </div>
      <div class="w-full md:w-1/2">
        <h2 class="text-3xl sm:text-4xl font-['Unbounded'] font-extrabold mb-4 text-gray-900 dark:text-white">
          {t?.rating?.title || 'Donnez votre avis'}
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8 text-lg">
          {t?.rating?.subtitle || 'Partagez votre expérience avec nous !'}
        </p>
        
        <div class="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
          <div class="flex justify-center mb-6 gap-2">
            {#each [1, 2, 3, 4, 5] as star}
              <button
                on:click={() => setRating(star)}
                on:mouseenter={(event) => handleStarHover(star, event)}
                on:mouseleave={handleStarLeave}
                class="star-{star} text-3xl cursor-pointer transition-transform duration-200 {rating >= star || hoverRating >= star ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-200 dark:text-gray-700'}"
                disabled={ratingLoading}
              >
                <Icon icon="mdi:star" />
              </button>
            {/each}
          </div>
          <textarea
            bind:value={comment}
            placeholder={t?.rating?.commentPlaceholder || 'Laissez un commentaire...'}
            class="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-2 focus:ring-yellow-500/50 text-gray-900 dark:text-white placeholder-gray-400 resize-none h-28 mb-4 transition-all"
            disabled={ratingLoading}
          ></textarea>
          <button
            on:click={submitRating}
            disabled={ratingLoading || rating < 1}
            class="w-full bg-yellow-600 text-white dark:text-gray-950 py-3.5 rounded-2xl font-semibold hover:bg-yellow-500 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {#if ratingLoading}
              <Icon icon="mdi:loading" class="animate-spin text-xl" />
              {t?.loading || 'Chargement...'}
            {:else}
              <Icon icon="mdi:send" class="text-xl" />
              {t?.rating?.submit || 'Envoyer'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="w-full py-8 text-center text-sm text-gray-500 border-t border-gray-100 dark:border-gray-800/50 mt-10">
    {t?.footer || '© 2026 CookUp. Tous droits réservés.'}
  </footer>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap');
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