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

    // Compteurs séparés du fade-in de section (géré par scrollReveal)
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
        // Auth modal will be shown via Header
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

  // Header event handlers
  function handleAuthSuccess() {
    if (pendingUrlParams) {
      setTimeout(openRecipePopup, 500);
    }
  }

  function handleAuthClose() {
    pendingUrlParams = null;
  }

  async function submitRating() {
    if (!$user) {
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

<svelte:head>
  <title>{$language === 'fr' ? 'Accueil' : 'Home'} - CookUp</title>
</svelte:head>

<div class="font-['Montserrat'] text-black dark:text-white max-w-7xl mx-auto">
  <!-- Header Component -->
  <Header 
    on:authSuccess={handleAuthSuccess}
    on:authClose={handleAuthClose}
  />

  <!-- Recipe Form Popup -->
  {#if poppup}
    <div transition:fade={{ duration: 150 }}>
      <FormPoppup {urlParams} on:close={closePoppup} />
    </div>
  {/if}

  <!-- Rating Success Modal -->
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
              <Icon icon="mdi:star" class="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            {$language === 'fr' ? 'Note enregistrée !' : 'Rating saved!'}
          </h2>
          <p class="text-green-600 dark:text-green-400 font-semibold mb-4">{ratingSuccessMessage}</p>
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

  <!-- Hero Section -->
  <div use:scrollReveal={{ once: false }} class="h-screen flex items-center">
    <div class="flex flex-col sm:flex-row items-center mx-auto px-10">
      <div class="w-full sm:w-1/2 text-center sm:text-left">
        <h1 class="font-['Permanent_Marker'] text-4xl sm:text-5xl md:text-7xl font-extrabold">
          {t?.headline || 'Loading...'}
        </h1>
        <p class="dark:font-thin mt-5 text-sm sm:text-base">
          {#if $user}
            {t?.auth.welcomeBack}, {$user.email?.split('@')[0]}
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

  <!-- Features Section -->
  <section use:scrollReveal={{ once: false }} class="py-28 md:py-36">
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
              <h3 class="text-xl sm:text-2xl font-bold mb-2">
                {t?.features?.step1Title || 'Choisissez vos préférences'}
              </h3>
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
              <h3 class="text-xl sm:text-2xl font-bold mb-2">
                {t?.features?.step2Title || 'Obtenez une recette'}
              </h3>
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
              <h3 class="text-xl sm:text-2xl font-bold mb-2">
                {t?.features?.step3Title || 'Cuisinez et savourez'}
              </h3>
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

      <!-- Advanced Features Section -->
      <div use:scrollReveal={{ once: false }} class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-32">
        <div class="relative order-2 lg:order-1">
          <img
            src="/img/meal-planning.svg"
            alt="Meal planning illustration"
            class="w-full h-auto"
            on:error={(e) => e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Illustration'}
          />
        </div>
        <div class="order-1 lg:order-2">
          <h3 class="text-2xl sm:text-3xl font-bold mb-6">
            {t?.features?.advancedTitle || 'Fonctionnalités avancées'}
          </h3>
          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
              <span class="text-sm sm:text-base dark:font-thin">
                {t?.features?.feature1 || 'Filtres nutritionnels avancés'}
              </span>
            </li>
            <li class="flex items-start gap-3">
              <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
              <span class="text-sm sm:text-base dark:font-thin">
                {t?.features?.feature2 || 'Export PDF des recettes'}
              </span>
            </li>
            <li class="flex items-start gap-3">
              <Icon icon="mdi:check-circle" class="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
              <span class="text-sm sm:text-base dark:font-thin">
                {t?.features?.feature3 || 'Traduction automatique'}
              </span>
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

  <!-- Alternative Features Section -->
  <section use:scrollReveal={{ y: 40, delay: 0.1, once: false }} class="py-28 md:py-36">
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
          <h3 class="text-xl sm:text-2xl font-bold mb-3">
            {t?.featuresAlt?.personalized || 'Personnalisé'}
          </h3>
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
          <h3 class="text-xl sm:text-2xl font-bold mb-3">
            {t?.featuresAlt?.quick || 'Rapide & simple'}
          </h3>
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
          <h3 class="text-xl sm:text-2xl font-bold mb-3">
            {t?.featuresAlt?.nutritious || 'Équilibré'}
          </h3>
          <p class="text-sm sm:text-base dark:font-thin">
            {t?.featuresAlt?.nutritiousDesc || 'Suivez vos apports nutritionnels'}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Recipe Counter Section -->
  <section
    use:scrollReveal={{ y: 40, once: false }}
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

  <!-- Rating Section -->
  <section use:scrollReveal={{ y: 40, once: false }} class="py-28 md:py-36">
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
  <footer class="w-full py-4 text-center text-sm text-gray-500 dark:text-gray-600">
    {t?.footer}
  </footer>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
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