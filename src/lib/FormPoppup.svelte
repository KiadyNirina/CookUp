<script>
import Icon from '@iconify/svelte';
import { createEventDispatcher } from 'svelte';
import Result from './Result.svelte';

const dispatch = createEventDispatcher();

function handleClose() {
    dispatch('close');
}

let idea = false;
let selectedType = '';
let moods = [];
let recipeData = null;
let loading = false;
let errorMessage = '';

function handleMoodChange(mood, e) {
    if (e.target.checked) {
        moods = [...moods, mood];
    } else {
        moods = moods.filter(m => m !== mood);
    }
}

async function translateText(text, source = 'en', target = 'fr') {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        console.warn('Texte invalide pour traduction:', text);
        return text || '';
    }

    // Vérifier le cache
    const cacheKey = `translation_${text}_${source}_${target}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                console.warn('Limite MyMemory atteinte (429). Retour au texte source.');
                return text; // Fallback sur le texte source
            }
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const translatedText = result.responseData.translatedText || text;
        localStorage.setItem(cacheKey, translatedText); // Stocker dans le cache
        return translatedText;
    } catch (error) {
        console.error('Erreur de traduction:', error);
        return text; // Fallback sur le texte source en cas d'erreur
    }
}

// Fonction pour ajouter un délai entre les requêtes
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function findIdea() {
    loading = true;
    errorMessage = '';
    const apiKey = '4a14f4c10ec04aaeba49fcbad3eefb53';
    const tags = moods.join(',');

    try {
        const res = await fetch(`https://api.spoonacular.com/recipes/random?apiKey=${apiKey}&number=1&tags=${tags},${selectedType}`);
        if (!res.ok) throw new Error('Erreur Spoonacular');
        const data = await res.json();
        recipeData = data.recipes[0];

        // Traduire le titre
        recipeData.title = await translateText(recipeData.title);

        // Traduire les ingrédients avec un délai pour éviter les limites
        recipeData.extendedIngredients = await Promise.all(
            recipeData.extendedIngredients.map(async (ing, index) => {
                await delay(index * 1000); // 1 seconde d'écart
                return {
                    ...ing,
                    original: await translateText(ing.original)
                };
            })
        );

        // Traduire les étapes avec un délai
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
        console.error('Erreur:', error);
        errorMessage = 'Erreur lors de la récupération ou traduction. Les données sont affichées en anglais.';
        idea = true; // Afficher quand même les données non traduites
    } finally {
        loading = false;
    }
}

function handleFindAnother() {
    findIdea(); // Relancer la recherche pour une nouvelle recette
}
</script>

<div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50">
    <div class="bg-white dark:bg-black text-black dark:text-white w-11/12 max-w-2xl p-8 rounded-4xl shadow-lg overflow-y-auto max-h-[90vh]">
        <div class="flex items-center">
            <h1 class="text-3xl font-bold">
                {#if !idea}
                    <span class="flex items-center">
                        <Icon icon="mdi:thought-bubble-outline" class="mr-3"/>
                        Personnalisez votre suggestion
                    </span>
                {:else}
                    <span class="flex">
                        <Icon icon="mdi:food" class="mr-3"/>
                        Suggestion gourmande
                    </span>
                {/if}
            </h1>
            <p on:click={handleClose} class="ml-auto pr-2 pl-2 border-2 font-bold border-red-500 bg-red-500 hover:bg-transparent transition-all duration-300 ease-in-out hover:cursor-pointer text-white hover:text-red-500 rounded-md active:scale-70">x</p>
        </div>

        {#if errorMessage}
            <p class="text-red-500 mt-3">{errorMessage}</p>
        {/if}

        {#if !idea}
            <div class="mt-5">
                <p class="text-base">
                    Choisissez vos préférences et laissez-nous vous inspirer.
                </p>
                <div class="mt-3 dark:font-thin">
                    <label for="type" class="text-base">Type de repas :</label>
                    <select bind:value={selectedType} name="" id="type" class="w-full mt-1 mb-5 p-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-600 dark:bg-black dark:text-white dark:border-gray-600 dark:focus:ring-yellow-500 hover:cursor-pointer">
                        <option value="" disabled>Selectionnez le type de repas</option>
                        <option value="breakfast">Petit-déjeuner</option>
                        <option value="lunch">Déjeuner</option>
                        <option value="dinner">Dîner</option>
                        <option value="snack">Collation</option>
                    </select>

                    <label for="" class="text-base">Humeur du repas :</label>
                    <div class="grid grid-cols-4 gap-x-4 gap-y-2 mt-1 mb-5">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" on:change={(e) => handleMoodChange('quick', e)}/>
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Rapide</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" on:change={(e) => handleMoodChange('vegan', e)}/>
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Végan</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" on:change={(e) => handleMoodChange('mediterranean', e)}/>
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Méditerranéen</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" on:change={(e) => handleMoodChange('vegetarian', e)}/>
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Végétarien</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" on:change={(e) => handleMoodChange('high-protein', e)}/>
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Protéiné</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" on:change={(e) => handleMoodChange('low-calorie', e)}/>
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Peu calorique</span>
                        </label>
                    </div>

                    <button class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-2 border-yellow-600 hover:bg-transparent hover:text-yellow-600 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-auto active:scale-70" on:click={findIdea}>
                        <Icon icon="mdi:lightbulb-on" class="mr-1 text-xl"/>
                        {loading ? "Chargement..." : "Trouver des idées"}
                    </button>
                </div>
            </div>
        {:else}
            <Result {recipeData} onBack={() => idea = false} on:findAnother={handleFindAnother}/>
        {/if}
    </div>
</div>