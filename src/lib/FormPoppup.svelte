<script>
import Icon from '@iconify/svelte';
import { createEventDispatcher, onMount } from 'svelte';
import Result from './Result.svelte';
import { fade } from 'svelte/transition';
import { language } from '../stores/language';
import { translations } from "$lib/translations";

const dispatch = createEventDispatcher();

function handleClose() {
    dispatch('close');
}

let idea = false;
let selectedType = '';
let mood = '';
let recipeData = null;
let loading = false;
let errorMessage = '';
let showErrorPopup = false;

$: t = translations[$language] || translations.en;

// Recharger la recette si la langue change
$: if (idea && recipeData && $language) {
    findIdea();
}

async function translateText(text, target = $language) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        console.warn('Invalid text for translation:', text);
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
                console.warn('MyMemory limit reached (429). Returning source text.');
                return text;
            }
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const translatedText = result.responseData.translatedText || text;
        if (browser) localStorage.setItem(cacheKey, translatedText);
        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        if (error.message.includes('Network connection') || error.message.includes('Failed to fetch')) {
            throw new Error(t.networkError);
        }
        return text;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function findIdea() {
    if (!selectedType || !mood) {
        errorMessage = t.selectMealTypeError;
        showErrorPopup = true;
        setTimeout(() => (showErrorPopup = false), 3000);
        loading = false;
        return;
    }

    loading = true;
    errorMessage = '';
    showErrorPopup = false;
    recipeData = null;

    try {
        if (!navigator.onLine) {
            throw new Error(t.networkError);
        }

        const apiKey = '4a14f4c10ec04aaeba49fcbad3eefb53';
        const tags = `${mood},${selectedType}`;
        const res = await fetch(`https://api.spoonacular.com/recipes/random?apiKey=${apiKey}&number=1&tags=${tags}`);
        if (!res.ok) {
            throw new Error(`Spoonacular Error: ${res.statusText}`);
        }
        const data = await res.json();

        if (!data.recipes || data.recipes.length === 0) {
            throw new Error(t.noRecipeError);
        }

        recipeData = data.recipes[0];

        recipeData.title = await translateText(recipeData.title);

        recipeData.extendedIngredients = await Promise.all(
            recipeData.extendedIngredients.map(async (ing, index) => {
                await delay(index * 1000);
                return {
                    ...ing,
                    original: await translateText(ing.original)
                };
            })
        );

        if (recipeData.analyzedInstructions?.[0]?.steps) {
            recipeData.analyzedInstructions[0].steps = await Promise.all(
                recipeData.analyzedInstructions[0].steps.map(async (step, index) => {
                    await delay(index * 1000);
                    return {
                        ...step,
                        step: await translateText(step.step)
                    };
                })
            );
        }

        console.log(recipeData);
        idea = true;
    } catch (error) {
        console.error('Error:', error);
        errorMessage = error.message.includes('Network connection')
            ? error.message
            : error.message.includes('No recipes')
            ? error.message
            : t.translationError;
        showErrorPopup = true;
        setTimeout(() => (showErrorPopup = false), 3000);
        idea = false;
    } finally {
        loading = false;
    }
}

function handleFindAnother() {
    findIdea();
}
</script>

<div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50">
    <div class="bg-white dark:bg-black text-black dark:text-white w-11/12 max-w-2xl p-8 rounded-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        {#if showErrorPopup}
            <div
                transition:fade={{ duration: 300 }}
                class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white p-4 rounded-2xl shadow-lg max-w-md w-full text-center z-60"
                aria-live="polite"
            >
                <p class="font-semibold">{errorMessage}</p>
            </div>
        {/if}

        <div class="flex items-center">
            <h1 class="text-3xl font-bold">
                {#if !idea}
                    <span class="flex items-center">
                        <Icon icon="mdi:thought-bubble-outline" class="mr-3"/>
                        {t.customize}
                    </span>
                {:else}
                    <span class="flex">
                        <Icon icon="mdi:food" class="mr-3"/>
                        {t.gourmet}
                    </span>
                {/if}
            </h1>
            <p
                on:click={handleClose}
                class="ml-auto pr-2 pl-2 border-2 font-bold border-red-500 bg-red-500 hover:bg-transparent transition-all duration-300 ease-in-out hover:cursor-pointer text-white hover:text-red-500 rounded-md active:scale-70"
            >
                x
            </p>
        </div>

        {#if !idea}
            <div class="mt-5">
                <p class="text-base">
                    {t.choose}
                </p>
                <div class="mt-3 dark:font-thin">
                    <label for="type" class="text-base">{t.mealType}</label>
                    <select
                        bind:value={selectedType}
                        id="type"
                        class="w-full mt-1 mb-5 p-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-600 dark:bg-black dark:text-white dark:border-gray-600 dark:focus:ring-yellow-500 hover:cursor-pointer"
                    >
                        <option value="" disabled>{t.mealTypePlaceholder}</option>
                        <option value="breakfast">{t.mealTypes.breakfast}</option>
                        <option value="lunch">{t.mealTypes.lunch}</option>
                        <option value="dinner">{t.mealTypes.dinner}</option>
                        <option value="snack">{t.mealTypes.snack}</option>
                    </select>

                    <label class="text-base">{t.mood}</label>
                    <div class="grid grid-cols-4 gap-x-4 gap-y-2 mt-1 mb-5">
                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                class="hidden peer"
                                name="mood"
                                value="quick"
                                bind:group={mood}
                                aria-label={t.moods.quick}
                            />
                            <div class="w-5 h-5 border-2 rounded-full border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 peer-checked:border-yellow-600 transition-colors"></div>
                            <span class="ml-2">{t.moods.quick}</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                class="hidden peer"
                                name="mood"
                                value="vegan"
                                bind:group={mood}
                                aria-label={t.moods.vegan}
                            />
                            <div class="w-5 h-5 border-2 rounded-full border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 peer-checked:border-yellow-600 transition-colors"></div>
                            <span class="ml-2">{t.moods.vegan}</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                class="hidden peer"
                                name="mood"
                                value="mediterranean"
                                bind:group={mood}
                                aria-label={t.moods.mediterranean}
                            />
                            <div class="w-5 h-5 border-2 rounded-full border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 peer-checked:border-yellow-600 transition-colors"></div>
                            <span class="ml-2">{t.moods.mediterranean}</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                class="hidden peer"
                                name="mood"
                                value="vegetarian"
                                bind:group={mood}
                                aria-label={t.moods.vegetarian}
                            />
                            <div class="w-5 h-5 border-2 rounded-full border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 peer-checked:border-yellow-600 transition-colors"></div>
                            <span class="ml-2">{t.moods.vegetarian}</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                class="hidden peer"
                                name="mood"
                                value="high-protein"
                                bind:group={mood}
                                aria-label={t.moods['high-protein']}
                            />
                            <div class="w-5 h-5 border-2 rounded-full border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 peer-checked:border-yellow-600 transition-colors"></div>
                            <span class="ml-2">{t.moods['high-protein']}</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                class="hidden peer"
                                name="mood"
                                value="low-calorie"
                                bind:group={mood}
                                aria-label={t.moods['low-calorie']}
                            />
                            <div class="w-5 h-5 border-2 rounded-full border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 peer-checked:border-yellow-600 transition-colors"></div>
                            <span class="ml-2">{t.moods['low-calorie']}</span>
                        </label>
                    </div>

                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-2 border-yellow-600 hover:bg-transparent hover:text-yellow-600 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-auto active:scale-70"
                        on:click={findIdea}
                        disabled={loading}
                    >
                        <Icon icon="mdi:lightbulb-on" class="mr-1 text-xl"/>
                        {loading ? t.loading : t.findIdeas}
                    </button>
                </div>
            </div>
        {:else}
            <Result {recipeData} {selectedType} moods={[mood]} {loading} onBack={() => idea = false} on:findAnother={handleFindAnother}/>
        {/if}
    </div>
</div>