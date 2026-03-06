<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { language } from '../stores/language';
  import { translations } from '$lib/translations';
  import Icon from '@iconify/svelte';
  import Header from '$lib/Header.svelte';
  
  export let status;
  export let error;
  
  let countdown = 10;
  let interval;
  
  $: t = translations[$language] || translations.en;
  
  function goHome() {
    if (interval) clearInterval(interval);
    goto('/');
  }
  
  function goBack() {
    if (interval) clearInterval(interval);
    if (browser && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  }
  
  // Handlers pour le Header
  function handleAuthSuccess() {
  }
  
  function handleAuthClose() {
  }
</script>

<svelte:head>
  <title>{$language === 'fr' ? 'Page non trouvée' : 'Page not found'} - CookUp</title>
</svelte:head>

<div class="font-['NunitoSans'] text-black dark:text-white max-w-7xl mx-auto">
  
  <!-- Header Component -->
  <Header 
    on:authSuccess={handleAuthSuccess}
    on:authClose={handleAuthClose}
  />
  
  <!-- Contenu principal -->
  <div class="flex-1 flex items-center justify-center px-4 py-12">
    <div class="max-w-4xl mx-auto text-center">
      <!-- Code d'erreur avec animation subtle -->
      <div class="relative mb-8">
        <span class="text-[12rem] md:text-[18rem] font-bold text-gray-100 dark:text-gray-800 select-none">
          404
        </span>
        <div class="absolute inset-0 flex items-center justify-center">
          <img 
            src="/img/ramen-96.svg" 
            alt="Lost ramen"
            class="w-32 h-32 md:w-48 md:h-48 opacity-80 dark:opacity-60 animate-float"
          />
        </div>
      </div>
      
      <!-- Message -->
      <h1 class="text-4xl md:text-5xl font-bold mb-4 edu-vic-wa-nt-hand-pre-test">
        {$language === 'fr' ? 'Page introuvable' : 'Page not found'}
      </h1>
      
      <p class="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
        {#if status === 404}
          {$language === 'fr' 
            ? 'La recette que vous cherchez semble avoir disparu de notre cuisine...' 
            : 'The recipe you\'re looking for seems to have left our kitchen...'}
        {:else}
          {$language === 'fr'
            ? 'Oups ! Quelque chose s\'est mal passé.'
            : 'Oops! Something went wrong.'}
        {/if}
      </p>
      
      <!-- Message d'erreur technique (si en dev) -->
      {#if error && import.meta.env?.DEV}
        <div class="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left max-w-2xl mx-auto">
          <p class="text-sm font-mono text-red-600 dark:text-red-400 break-words">
            {error?.message || error}
          </p>
        </div>
      {/if}
      
      <!-- Suggestions -->
      <div class="mb-8 text-gray-600 dark:text-gray-400">
        <p class="mb-2">
          {$language === 'fr' 
            ? 'Vous pourriez être intéressé par :' 
            : 'You might be interested in:'}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="/#breakfast" class="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
            🍳 {$language === 'fr' ? 'Petit-déjeuner' : 'Breakfast'}
          </a>
          <a href="/#dessert" class="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
            🍰 {$language === 'fr' ? 'Desserts' : 'Desserts'}
          </a>
          <a href="/#vegetarian" class="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
            🥗 {$language === 'fr' ? 'Végétarien' : 'Vegetarian'}
          </a>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          on:click={goHome}
          class="px-8 py-4 bg-yellow-600 text-white dark:text-black rounded-xl font-semibold hover:bg-yellow-700 transition-all duration-300 flex items-center gap-2 cursor-pointer min-w-[200px] justify-center"
        >
          <Icon icon="mdi:home" class="text-xl" />
          {$language === 'fr' ? 'Retour à l\'accueil' : 'Back to home'}
        </button>
        
        <button
          on:click={goBack}
          class="px-8 py-4 bg-transparent border-2 border-gray-300 dark:border-gray-700 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-300 flex items-center gap-2 cursor-pointer min-w-[200px] justify-center"
        >
          <Icon icon="mdi:arrow-left" class="text-xl" />
          {$language === 'fr' ? 'Page précédente' : 'Previous page'}
        </button>
      </div>
    </div>
  </div>
  
  <!-- Footer minimal -->
  <div class="w-full max-w-7xl mx-auto p-4 text-center text-sm text-gray-500 dark:text-gray-600">
    {t?.footer}
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
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  
  @media screen and (max-width: 640px) {
    .edu-vic-wa-nt-hand-pre-test {
      font-size: 2rem;
    }
    .text-\[12rem\] {
      font-size: 8rem;
    }
    .w-32 { width: 80px; }
    .h-32 { height: 80px; }
  }
</style>