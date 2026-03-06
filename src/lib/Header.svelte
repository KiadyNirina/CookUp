<script>
  import Icon from "@iconify/svelte";
  import ToggleTheme from "$lib/ThemeToggle.svelte";
  import Auth from "$lib/Auth.svelte";
  import LoginSuccess from "$lib/LoginSuccess.svelte";
  import { fade } from "svelte/transition";
  import { language } from "../stores/language";
  import { translations } from "$lib/translations";
  import { browser } from "$app/environment";
  import { goto } from '$app/navigation';
  import { user, signOut as signOutAuth } from '../stores/auth';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let showAuthModal = false;
  let showProfilePopup = false;
  let showLogoutConfirm = false;
  let logoutLoading = false;
  let showLoginSuccess = false;
  let loginSuccessMessage = '';
  let showEmailSent = false;
  let emailSentMessage = '';

  const availableLanguages = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
  ];

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
    dispatch('authSuccess', event);
  }

  function closeLoginSuccess() {
    showLoginSuccess = false;
    loginSuccessMessage = '';
  }

  function handleAuthClose() {
    showAuthModal = false;
    dispatch('authClose');
  }

  function handleEmailSent() {
    showAuthModal = false;
    showEmailSent = true;
    emailSentMessage = $language === 'fr'
      ? 'Email de confirmation envoyé ! Veuillez vérifier votre boîte mail.'
      : 'Confirmation email sent! Please check your inbox.';
    dispatch('emailSent');
  }

  function closeEmailSent() {
    showEmailSent = false;
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
    dispatch('logout');
    window.location.reload();
  }

  function openProfilePopup() {
    if ($user) {
      showProfilePopup = true;
      dispatch('profileOpen');
    }
  }

  function closeProfilePopup() {
    showProfilePopup = false;
  }

  $: t = translations[$language] || translations.en;
</script>

<svelte:window on:mousedown={handleOutsideClick} />

<header class="transition-all duration-500 ease-in-out fixed w-full max-w-7xl mx-auto flex items-center bg-white dark:bg-black p-2 z-10">
  <p class="text-xl flex items-end">
    <img src="img/black.png" alt="Logo dark" class="block dark:hidden h-12" />
    <img src="img/white.png" alt="Logo light" class="hidden dark:block h-12" />
  </p>
  <div class="flex ml-auto items-center gap-2">
    <!-- Language Selector -->
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
      <!-- Authenticated User Menu -->
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
      <!-- Guest User -->
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
</header>

<!-- Auth Modal -->
{#if showAuthModal}
  <div transition:fade={{ duration: 150 }}>
    <Auth 
      on:authSuccess={handleAuthSuccess} 
      on:emailSent={handleEmailSent} 
      on:close={handleAuthClose} 
      class="auth-modal"
    />
  </div>
{/if}

<!-- Login Success Modal -->
{#if showLoginSuccess}
  <div transition:fade={{ duration: 150 }}>
    <LoginSuccess message={loginSuccessMessage} on:close={closeLoginSuccess} />
  </div>
{/if}

<!-- Email Sent Modal -->
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
            <Icon icon="mdi:email-check" class="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          {$language === 'fr' ? 'Email envoyé !' : 'Email sent!'}
        </h2>
        <p class="text-blue-600 dark:text-blue-400 font-semibold mb-4">📧 {emailSentMessage}</p>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-6">
          {$language === 'fr' ? 'Vérifiez votre boîte de réception et vos spams.' : 'Check your inbox and spam folder.'}
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

<!-- Profile Popup Modal -->
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
            <Icon icon="mdi:account" class="w-10 h-10 text-blue-600 dark:text-blue-400" />
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

<!-- Logout Confirmation Modal -->
{#if showLogoutConfirm}
  <div
    class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50 p-4"
    transition:fade={{ duration: 150 }}
  >
    <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
      <div class="text-center mb-6">
        <Icon icon="mdi:logout" class="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
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