<script>
import Icon from '@iconify/svelte';
import { createEventDispatcher, onMount } from 'svelte';
import Result from './Result.svelte';
import { fade, slide } from 'svelte/transition';
import { language } from '../stores/language';
import { translations } from '$lib/translations';
import { browser } from '$app/environment';
import { debounce } from 'lodash-es';

export let urlParams = { 
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

const dispatch = createEventDispatcher();

function handleClose() {
    dispatch('close');
}

let idea = false;
let selectedType = '';
let diet = '';
let excludedIngredients = [];
let showAdvanced = false;
let nutritionPrefs = {
  minCarbs: '',
  maxCarbs: '',
  minProtein: '',
  maxProtein: '',
  minFat: '',
  maxFat: '',
  minCalories: '',
  maxCalories: ''
};
let recipeData = null;
let loading = false;
let errorMessage = '';
let showErrorPopup = false;

$: if (showOtherInput) {
        otherIngredient = '';
        ingredientSuggestions = [];
        selectedSuggestion = null;
    }

let otherIngredient = '';
let showOtherInput = false;
let ingredientSuggestions = [];
let loadingSuggestions = false;
let manualIngredients = []; 
let selectedSuggestion = null;

$: allExcludedIngredients = [...excludedIngredients, ...manualIngredients];
$: validSuggestion = otherIngredient.trim().length > 0 && (
    ingredientSuggestions.some(s => s.toLowerCase() === otherIngredient.trim().toLowerCase()) ||
    (selectedSuggestion && selectedSuggestion.toLowerCase() === otherIngredient.trim().toLowerCase())
);
$: t = translations[$language] || translations.en;

const commonIngredients = [
    'peanuts',
    'gluten',
    'dairy',
    'eggs',
    'soy',
    'fish',
    'shellfish',
    'tree nuts'
];

onMount(() => {
    if (browser && urlParams.type && urlParams.recipeId) {
        selectedType = urlParams.type;
        diet = urlParams.diet || '';
        excludedIngredients = urlParams.excludeIngredients || [];
        manualIngredients = [];
        
        showAdvanced = Boolean(
            urlParams.minCarbs || urlParams.maxCarbs || 
            urlParams.minProtein || urlParams.maxProtein || 
            urlParams.minFat || urlParams.maxFat || 
            urlParams.minCalories || urlParams.maxCalories
        );
        
        nutritionPrefs = {
            minCarbs: urlParams.minCarbs || '',
            maxCarbs: urlParams.maxCarbs || '',
            minProtein: urlParams.minProtein || '',
            maxProtein: urlParams.maxProtein || '',
            minFat: urlParams.minFat || '',
            maxFat: urlParams.maxFat || '',
            minCalories: urlParams.minCalories || '',
            maxCalories: urlParams.maxCalories || ''
        };
        idea = true;
        fetchRecipeById(urlParams.recipeId);
    }
});

async function translateText(text, target = $language) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return text || '';
    }

    if (target === 'en') {
        return text;
    }

    const cacheKey = `translation_${text}_en_${target}`;
    const cached = browser ? localStorage.getItem(cacheKey) : null;
    if (cached) return cached;

    try {
        if (!navigator.onLine) {
            throw new Error(t.networkError);
        }

        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${target}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                return text;
            }
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const translatedText = result.responseData?.translatedText || text;
        if (browser) localStorage.setItem(cacheKey, translatedText);
        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRecipeById(recipeId) {
    loading = true;
    errorMessage = '';
    showErrorPopup = false;

    try {
        if (!navigator.onLine) {
            throw new Error(t.networkError);
        }

        const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
        const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Spoonacular Error: ${res.statusText}`);
        }
        const data = await res.json();

        if (!data) {
            throw new Error(t.noRecipeError);
        }

        recipeData = data;
        recipeData.title = await translateText(recipeData.title || '');

        if (recipeData && Array.isArray(recipeData.extendedIngredients)) {
            recipeData.extendedIngredients = await Promise.all(
                recipeData.extendedIngredients.map(async (ing, index) => {
                    try {
                        await delay(index * 150);
                        return {
                            ...ing,
                            original: await translateText(ing.original || '')
                        };
                    } catch (err) {
                        return { ...ing, original: ing.original || '' };
                    }
                })
            );
        } else {
            recipeData.extendedIngredients = [];
        }

        if (recipeData && recipeData.analyzedInstructions?.[0]?.steps) {
            recipeData.analyzedInstructions[0].steps = await Promise.all(
                recipeData.analyzedInstructions[0].steps.map(async (step, index) => {
                    try {
                        await delay(index * 150);
                        return {
                            ...step,
                            step: await translateText(step.step || '')
                        };
                    } catch (err) {
                        return { ...step, step: step.step || '' };
                    }
                })
            );
        } else {
            recipeData.analyzedInstructions = [{ steps: [] }];
        }

        idea = true;
    } catch (error) {
        errorMessage = error.message.includes('Network connection')
            ? t.networkError
            : error.message.includes('No recipes')
            ? t.noRecipeError
            : `${t.translationError} (${error.message})`;
        showErrorPopup = true;
        setTimeout(() => (showErrorPopup = false), 3000);
        idea = false;
        recipeData = null;
    } finally {
        loading = false;
    }
}

async function findIdea() {
    if (!selectedType) {
        errorMessage = t.selectMealTypeError;
        showErrorPopup = true;
        setTimeout(() => (showErrorPopup = false), 3000);
        loading = false;
        return;
    }

    loading = true;
    errorMessage = '';
    showErrorPopup = false;

    let attempts = 0;
    const maxAttempts = 3;

    try {
        if (!navigator.onLine) {
            throw new Error(t.networkError);
        }

        while (attempts < maxAttempts) {
            attempts++;
            const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
            const tags = diet ? `${diet},${selectedType}` : selectedType;
            const excludeParams = allExcludedIngredients.length > 0 ? `&excludeIngredients=${encodeURIComponent(allExcludedIngredients.join(','))}` : '';
            const nutritionParams = [
                nutritionPrefs.minCarbs ? `minCarbs=${nutritionPrefs.minCarbs}` : '',
                nutritionPrefs.maxCarbs ? `maxCarbs=${nutritionPrefs.maxCarbs}` : '',
                nutritionPrefs.minProtein ? `minProtein=${nutritionPrefs.minProtein}` : '',
                nutritionPrefs.maxProtein ? `maxProtein=${nutritionPrefs.maxProtein}` : '',
                nutritionPrefs.minFat ? `minFat=${nutritionPrefs.minFat}` : '',
                nutritionPrefs.maxFat ? `maxFat=${nutritionPrefs.maxFat}` : '',
                nutritionPrefs.minCalories ? `minCalories=${nutritionPrefs.minCalories}` : '',
                nutritionPrefs.maxCalories ? `maxCalories=${nutritionPrefs.maxCalories}` : ''
            ].filter(Boolean).join('&');
            const url = `https://api.spoonacular.com/recipes/random?apiKey=${apiKey}&number=1&tags=${tags}${excludeParams}${nutritionParams ? `&${nutritionParams}` : ''}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Spoonacular Error: ${res.statusText}`);
            }
            const data = await res.json();

            if (!data.recipes || data.recipes.length === 0 || !data.recipes[0]) {
                throw new Error(t.noRecipeError);
            }

            recipeData = data.recipes[0];
            break;
        }

        recipeData.title = await translateText(recipeData.title || '');

        if (recipeData && Array.isArray(recipeData.extendedIngredients)) {
            recipeData.extendedIngredients = await Promise.all(
                recipeData.extendedIngredients.map(async (ing, index) => {
                    try {
                        await delay(index * 150);
                        return {
                            ...ing,
                            original: await translateText(ing.original || '')
                        };
                    } catch (err) {
                        return { ...ing, original: ing.original || '' };
                    }
                })
            );
        } else {
            recipeData.extendedIngredients = [];
        }

        if (recipeData && recipeData.analyzedInstructions?.[0]?.steps) {
            recipeData.analyzedInstructions[0].steps = await Promise.all(
                recipeData.analyzedInstructions[0].steps.map(async (step, index) => {
                    try {
                        await delay(index * 150);
                        return {
                            ...step,
                            step: await translateText(step.step || '')
                        };
                    } catch (err) {
                        return { ...step, step: step.step || '' };
                    }
                })
            );
        } else {
            recipeData.analyzedInstructions = [{ steps: [] }];
        }

        idea = true;

        if (browser && recipeData) {
            const params = new URLSearchParams({
                type: selectedType,
                diet: diet || '',
                recipeId: recipeData.id || '',
                allExcludedIngredients: allExcludedIngredients.join(','),
                minCarbs: nutritionPrefs.minCarbs || '',
                maxCarbs: nutritionPrefs.maxCarbs || '',
                minProtein: nutritionPrefs.minProtein || '',
                maxProtein: nutritionPrefs.maxProtein || '',
                minFat: nutritionPrefs.minFat || '',
                maxFat: nutritionPrefs.maxFat || '',
                minCalories: nutritionPrefs.minCalories || '',
                maxCalories: nutritionPrefs.maxCalories || ''
            });
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
    } catch (error) {
        errorMessage = error.message.includes('Network connection')
            ? t.networkError
            : error.message.includes('No recipes')
            ? t.noRecipeError
            : `${t.translationError} (${error.message})`;
        showErrorPopup = true;
        setTimeout(() => (showErrorPopup = false), 3000);
        idea = false;
        recipeData = null;
    } finally {
        loading = false;
    }
}

function handleFindAnother() {
    findIdea();
}

async function fetchIngredientSuggestions(query) {
    if (!query || query.length < 2) {
        ingredientSuggestions = [];
        return;
    }

    loadingSuggestions = true;
    try {
        const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
        const url = `https://api.spoonacular.com/food/ingredients/autocomplete?apiKey=${apiKey}&query=${encodeURIComponent(query)}&number=5`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch suggestions');
        const data = await res.json();
        ingredientSuggestions = data.map(item => item.name);
    } catch (error) {
        ingredientSuggestions = [];
    } finally {
        loadingSuggestions = false;
    }
}

const debouncedFetchSuggestions = debounce(fetchIngredientSuggestions, 300);

function handleOtherIngredientChange(e) {
    otherIngredient = e.target.value;
    selectedSuggestion = null;
    debouncedFetchSuggestions(otherIngredient);
}

function selectSuggestion(suggestion) {
    otherIngredient = suggestion;
    selectedSuggestion = suggestion;
    ingredientSuggestions = [];
}

function addOtherIngredient() {
    const trimmed = otherIngredient.trim().toLowerCase();

    if (!validSuggestion) {
        errorMessage = t.suggestionRequired || 'Veuillez sélectionner un ingrédient dans les suggestions';
        showErrorPopup = true;
        setTimeout(() => (showErrorPopup = false), 3000);
        return;
    }

    if (trimmed && ![...excludedIngredients, ...manualIngredients].includes(trimmed)) {
        manualIngredients = [...manualIngredients, trimmed];
        otherIngredient = '';
        selectedSuggestion = null;
        ingredientSuggestions = [];
        showOtherInput = false;
    }
}

function removeManualIngredient(ingredient) {
    manualIngredients = manualIngredients.filter(i => i !== ingredient);
}

function removePredefinedIngredient(ingredient) {
    excludedIngredients = excludedIngredients.filter(i => i !== ingredient);
}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md">
    <div 
        transition:fade={{ duration: 200 }}
        class="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden"
    >
        {#if showErrorPopup}
            <div
                transition:fade={{ duration: 200 }}
                class="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-rose-500 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium"
                aria-live="assertive"
            >
                <Icon icon="mdi:alert-circle-outline" class="text-xl shrink-0" />
                <span>{errorMessage}</span>
            </div>
        {/if}

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
            <h1 class="text-xl font-bold flex items-center gap-2.5">
                {#if !idea}
                    <div class="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Icon icon="mdi:sparkles" class="text-2xl" />
                    </div>
                    <span>{t.customize}</span>
                {:else}
                    <div class="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Icon icon="mdi:silverware-fork-knife" class="text-2xl" />
                    </div>
                    <span>{t.gourmet}</span>
                {/if}
            </h1>
            <button
                on:click={handleClose}
                aria-label="Close modal"
                class="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <Icon icon="mdi:close" class="text-xl" />
            </button>
        </div>

        <!-- Body Scrollable Content -->
        <div class="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
            {#if !idea}
                <p class="text-xs text-black dark:text-white -mt-2">
                    {t.choose}
                </p>

                <!-- Meal Type Selection -->
                <div class="space-y-2">
                    <label for="type" class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                        {t.mealType}
                    </label>
                    <div class="relative">
                        <select
                            bind:value={selectedType}
                            id="type"
                            class="w-full appearance-none bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl px-4 py-3.5 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all cursor-pointer"
                        >
                            <option value="" disabled selected>{t.mealTypePlaceholder}</option>
                            <option value="main course">{t.mealTypes['main_course']}</option>
                            <option value="side dish">{t.mealTypes['side_dish']}</option>
                            <option value="dessert">{t.mealTypes.dessert}</option>
                            <option value="appetizer">{t.mealTypes.appetizer}</option>
                            <option value="salad">{t.mealTypes.salad}</option>
                            <option value="bread">{t.mealTypes.bread}</option>
                            <option value="breakfast">{t.mealTypes.breakfast}</option>
                            <option value="soup">{t.mealTypes.soup}</option>
                            <option value="beverage">{t.mealTypes.beverage}</option>
                            <option value="sauce">{t.mealTypes.sauce}</option>
                            <option value="marinade">{t.mealTypes.marinade}</option>
                            <option value="fingerfood">{t.mealTypes.fingerfood}</option>
                            <option value="snack">{t.mealTypes.snack}</option>
                            <option value="drink">{t.mealTypes.drink}</option>
                        </select>
                        <Icon icon="mdi:chevron-down" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xl text-zinc-400 pointer-events-none" />
                    </div>
                </div>

                <!-- Diet Preferences Chips -->
                <div class="space-y-2">
                    <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 block">
                        {t.diet}
                    </span>
                    <div class="flex flex-wrap gap-2">
                        <label class="cursor-pointer">
                            <input
                                type="radio"
                                class="sr-only peer"
                                name="diet"
                                value=""
                                bind:group={diet}
                            />
                            <span class="inline-flex items-center px-3.5 py-2 rounded-xl text-xs border transition-all duration-200 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 peer-checked:bg-yellow-500/10 peer-checked:border-yellow-500 peer-checked:text-yellow-600 dark:peer-checked:text-yellow-400">
                                {t.dietPlaceholder || 'Any Diet'}
                            </span>
                        </label>
                        {#each ['gluten free', 'ketogenic', 'vegetarian', 'lacto-vegetarian', 'ovo-vegetarian', 'vegan', 'pescatarian', 'paleo', 'primal', 'low FODMAP', 'whole30'] as dietOption}
                            <label class="cursor-pointer">
                                <input
                                    type="radio"
                                    class="sr-only peer"
                                    name="diet"
                                    value={dietOption}
                                    bind:group={diet}
                                />
                                <span class="inline-flex items-center px-3.5 py-2 rounded-xl text-xs border transition-all duration-200 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 text-black dark:text-white peer-checked:bg-yellow-500/10 peer-checked:border-yellow-500 peer-checked:text-yellow-600 dark:peer-checked:text-yellow-400">
                                    {t.diets[dietOption.replace(' ', '_')] || dietOption}
                                </span>
                            </label>
                        {/each}
                    </div>
                </div>

                <!-- Exclude Ingredients Chips -->
                <div class="space-y-3">
                    <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 block">
                        {t.excludeIngredients}
                    </span>
                    <div class="flex flex-wrap gap-2">
                        {#each commonIngredients as ingredient}
                            {@const isChecked = excludedIngredients.includes(ingredient)}
                            <button
                                type="button"
                                on:click={() => {
                                    if (isChecked) {
                                        removePredefinedIngredient(ingredient);
                                    } else {
                                        excludedIngredients = [...excludedIngredients, ingredient];
                                    }
                                }}
                                class={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs border transition-all duration-200 ${
                                    isChecked
                                        ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 text-black dark:text-white hover:border-zinc-300 dark:hover:border-zinc-600'
                                }`}
                            >
                                <Icon icon={isChecked ? 'mdi:check' : 'mdi:plus'} class="text-sm" />
                                <span>{t.ingredientsEx[ingredient.replace(' ', '_')] || ingredient}</span>
                            </button>
                        {/each}

                        <button
                            type="button"
                            on:click={() => (showOtherInput = !showOtherInput)}
                            class={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs border transition-all duration-200 ${
                                showOtherInput
                                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 text-black dark:text-white'
                            }`}
                        >
                            <Icon icon="mdi:dots-horizontal" class="text-sm" />
                            <span>{t.otherIngredient || 'Other'}</span>
                        </button>
                    </div>

                    <!-- Other Ingredient Input -->
                    {#if showOtherInput}
                        <div transition:slide={{ duration: 200 }} class="relative pt-2">
                            <div class="flex gap-2">
                                <input
                                    type="text"
                                    bind:value={otherIngredient}
                                    on:input={handleOtherIngredientChange}
                                    class="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                                    placeholder={t.otherIngredientPlaceholder || 'Enter ingredient to exclude...'}
                                />
                                <button
                                    on:click={addOtherIngredient}
                                    disabled={!otherIngredient.trim() || !validSuggestion}
                                    class="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-2xl transition-all text-xs flex items-center gap-1 shrink-0"
                                >
                                    <span>{t.add || 'Add'}</span>
                                    <Icon icon="mdi:plus" />
                                </button>
                            </div>

                            {#if loadingSuggestions}
                                <div class="absolute z-20 w-full mt-1.5 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700/80 p-3 flex justify-center">
                                    <Icon icon="mdi:loading" class="animate-spin text-yellow-500 text-xl" />
                                </div>
                            {:else if ingredientSuggestions.length > 0}
                                <ul class="absolute z-20 w-full mt-1.5 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700/80 overflow-hidden py-1">
                                    {#each ingredientSuggestions as suggestion}
                                        <li
                                            on:click={() => selectSuggestion(suggestion)}
                                            class="px-4 py-2.5 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 cursor-pointer text-sm font-medium transition-colors"
                                        >
                                            {suggestion}
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
                        </div>
                    {/if}

                    <!-- Combined Excluded List -->
                    {#if allExcludedIngredients.length > 0}
                        <div class="pt-1">
                            <p class="text-xs font-semibold text-zinc-400 mb-2">{t.excludedIngredientsList || 'Excluded ingredients:'}</p>
                            <div class="flex flex-wrap gap-1.5">
                                {#each allExcludedIngredients as ingredient}
                                    <span class="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-xl text-xs font-medium">
                                        {ingredient}
                                        <button
                                            type="button"
                                            on:click={() => {
                                                if (commonIngredients.includes(ingredient)) {
                                                    removePredefinedIngredient(ingredient);
                                                } else {
                                                    removeManualIngredient(ingredient);
                                                }
                                            }}
                                            class="hover:opacity-70 transition-opacity ml-0.5"
                                        >
                                            <Icon icon="mdi:close" />
                                        </button>
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Advanced Settings Toggle -->
                <div class="pt-2">
                    <button
                        type="button"
                        on:click={() => (showAdvanced = !showAdvanced)}
                        class="inline-flex items-center gap-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 transition-colors"
                    >
                        <Icon icon={showAdvanced ? "mdi:chevron-up" : "mdi:tune"} class="text-base" />
                        <span>{t.advancedPrefs || 'Advanced Nutrition Preferences'}</span>
                    </button>

                    {#if showAdvanced}
                        <div transition:slide={{ duration: 250 }} class="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {#each [
                                    { name: 'Carbs', key: 'Carbs', unit: 'g' },
                                    { name: 'Protein', key: 'Protein', unit: 'g' },
                                    { name: 'Fat', key: 'Fat', unit: 'g' },
                                    { name: 'Calories', key: 'Calories', unit: 'kcal' }
                                ] as nutrient}
                                    <div class="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                                        <span class="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                                            {t[nutrient.name.toLowerCase()] || nutrient.name} ({nutrient.unit})
                                        </span>
                                        <div class="grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                bind:value={nutritionPrefs[`min${nutrient.key}`]}
                                                class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                                                placeholder={t.minPlaceholder || 'Min'}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                bind:value={nutritionPrefs[`max${nutrient.key}`]}
                                                class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                                                placeholder={t.maxPlaceholder || 'Max'}
                                            />
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {:else}
                <Result 
                    {recipeData} 
                    {selectedType} 
                    diets={[diet]} 
                    {allExcludedIngredients} 
                    {nutritionPrefs} 
                    {loading} 
                    onBack={() => (idea = false)} 
                    on:findAnother={handleFindAnother}
                />
            {/if}
        </div>

        <!-- Footer Actions -->
        {#if !idea}
            <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end">
                <button
                    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                    on:click={findIdea}
                    disabled={loading}
                >
                    {#if loading}
                        <Icon icon="mdi:loading" class="animate-spin text-xl" />
                        <span>{t.loading}</span>
                    {:else}
                        <Icon icon="mdi:lightbulb-on-outline" class="text-xl" />
                        <span>{t.findIdeas}</span>
                    {/if}
                </button>
            </div>
        {/if}
    </div>
</div>