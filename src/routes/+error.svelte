<script>
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { language } from '../stores/language';
  import { translations } from '$lib/translations';
  import Icon from '@iconify/svelte';
  import Header from '$lib/Header.svelte';
  
  export let status;
  export let error;
  
  $: t = translations[$language] || translations.en;
  
  function goHome() {
    goto('/');
  }
  
  function handleAuthSuccess() {}
  function handleAuthClose() {}
</script>

<svelte:head>
  <title>{$language === 'fr' ? 'Page non trouvée' : 'Page not found'} - CookUp</title>
</svelte:head>

<div class="font-['NunitoSans'] text-black dark:text-white min-h-screen flex flex-col max-w-7xl mx-auto">
  
  <!-- Header Component -->
  <Header 
    on:authSuccess={handleAuthSuccess}
    on:authClose={handleAuthClose}
  />
  
  <!-- Contenu principal centré -->
  <main class="flex-1 flex items-center justify-center px-4 pt-20 pb-12">
    <div class="max-w-2xl mx-auto text-center">
      
      <!-- ✨ Illustration 404 -->
      <div class="mb-8">
        <div class="relative inline-block">
          <!-- Cercle décoratif -->
          <div class="absolute inset-0 bg-yellow-100 dark:bg-yellow-900/20 rounded-full scale-110"></div>
          
          <!-- Image d'illustration -->
          <img 
            src="/img/404.svg" 
            alt="Page not found"
            class="relative w-40 h-40 sm:w-60 sm:h-60 mx-auto object-contain"
          />
        </div>
      </div>
      
      <!-- Titre principal -->
      <h1 class="text-3xl sm:text-4xl font-['Permanent_Marker'] font-extrabold text-yellow-600 mb-4">
        {$language === 'fr' ? 'Oups ! Page introuvable' : 'Oops! Page not found'}
      </h1>
      
      <!-- Message descriptif -->
      <p class="dark:font-thin mt-5 text-sm sm:text-base mb-3">
          {$language === 'fr' 
            ? 'La page que vous recherchez n\'existe pas ou a été déplacée.' 
            : 'The page you\'re looking for doesn\'t exist or has been moved.'}
      </p>
      
      <!-- Message d'erreur technique (dev uniquement) -->
      {#if error && import.meta.env?.DEV}
        <details class="mb-6 text-left max-w-md mx-auto">
          <summary class="cursor-pointer text-sm text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400">
            {$language === 'fr' ? 'Détails techniques' : 'Technical details'}
          </summary>
          <div class="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p class="text-xs font-mono text-red-500 dark:text-red-400 break-all">
              {error?.message || error}
            </p>
          </div>
        </details>
      {/if}
      
      <!-- Bouton unique retour accueil -->
      <button
        on:click={goHome}
        class="group px-8 py-3 bg-yellow-600 text-white dark:text-black rounded-xl font-semibold hover:bg-yellow-700 transition-colors cursor-pointer inline-flex items-center gap-2"
      >
        <Icon icon="mdi:home" class="text-lg group-hover:-translate-y-0.5 transition-transform" />
        {$language === 'fr' ? 'Retour à l\'accueil' : 'Back to home'}
      </button>
      
    </div>
  </main>
  
  <!-- Footer -->
  <footer class="w-full py-4 text-center text-sm text-gray-500 dark:text-gray-600">
    {t?.footer}
  </footer>
  
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
  
  @media screen and (max-width: 640px) {
    .text-3xl { font-size: 1.5rem; }
    .text-4xl { font-size: 1.75rem; }
  }
</style>