<script>
import { scale } from 'svelte/transition';
import Icon from '@iconify/svelte';
import { createEventDispatcher } from 'svelte';

export let recipeData;
export let selectedType;
export let moods;
export let onBack;
export let loading;

const dispatch = createEventDispatcher();

$: ingredients = recipeData?.extendedIngredients?.map(ing => ing.original) || [];
$: steps = recipeData?.analyzedInstructions?.[0]?.steps?.map(step => step.step) || [];
$: prepTime = recipeData?.readyInMinutes || 'Non spécifié';

const mealTypeMap = {
    breakfast: 'petit-déjeuner',
    lunch: 'déjeuner',
    dinner: 'dîner',
    snack: 'collation'
};
const formattedMealType = mealTypeMap[selectedType] || 'repas';

const moodMap = {
    quick: 'rapide',
    vegan: 'végan',
    mediterranean: 'méditerranéen',
    vegetarian: 'végétarien',
    'high-protein': 'protéiné',
    'low-calorie': 'peu calorique'
};
$: formattedMoods = moods.map(m => moodMap[m] || m).join(', ');
$: mealDescription = moods.length > 0 ? `${formattedMealType} ${formattedMoods}` : formattedMealType;

function handleFindAnother() {
    dispatch('findAnother');
}
</script>

<div class="mt-5">
    {#if loading}
        <div
            transition:scale={{ duration: 300, start: 0.9 }}
            class="flex justify-center items-center h-96"
        >
            <div class="flex flex-col items-center">
                <Icon icon="mdi:loading" class="text-yellow-600 text-6xl animate-spin" />
                <p class="text-yellow-600 font-semibold mt-4 text-lg">Chargement d'une nouvelle idée...</p>
            </div>
        </div>
    {:else if recipeData}
        <div transition:scale={{ duration: 300, start: 0.95 }} class="dark:font-thin">
            <p class="text-lg font-semibold">
                Voici une idée pour votre {mealDescription} :
            </p>
            <div class="mt-5">
                <div class="mb-4 flex flex-wrap gap-2">
                    <span class="bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 p-2 rounded-full text-sm font-semibold">
                        {formattedMealType}
                    </span>
                    {#each moods as mood}
                        <span class="bg-gray-300 dark:bg-gray-600 p-2 rounded-full text-sm font-semibold">
                            #{moodMap[mood] || mood}
                        </span>
                    {/each}
                </div>
                <img
                    src={recipeData.image}
                    class="border-1 border-gray-400 dark:border-gray-600 rounded-3xl w-full h-full"
                    alt={recipeData.title || 'Image de la recette'}
                />
                <div class="mt-5">
                    <p><span class="font-bold text-xl mr-2">Nom du plat :</span> {recipeData.title}</p>
                    <div class="mt-3">
                        <span class="font-bold text-xl mr-2">Ingrédients :</span>
                        <ul class="list-disc ml-15 mt-1">
                            {#each ingredients as ingredient}
                                <li>{ingredient}</li>
                            {/each}
                        </ul>
                    </div>
                    <div class="mt-4">
                        <span class="font-bold text-xl mr-2">Instructions :</span>
                        <ul class="list-decimal ml-15 mt-1">
                            {#each steps as step}
                                <li>{step}</li>
                            {/each}
                        </ul>
                    </div>
                    <p class="mt-4"><span class="font-bold text-xl mr-2">Temps de préparation :</span> {prepTime} minutes</p>
                    {#if recipeData.nutrition?.nutrients}
                        <div class="mt-3 flex">
                            <span class="font-bold mr-2">Infos nutritionnelles :</span>
                            <ul class="list-disc ml-5">
                                {#each recipeData.nutrition.nutrients as nutrient}
                                    {#if ['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(nutrient.name)}
                                        <li>{nutrient.name} : {nutrient.amount} {nutrient.unit}</li>
                                    {/if}
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>

                <div class="flex justify-end mt-5">
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex"
                        on:click={handleFindAnother}
                        disabled={loading}
                        aria-label="Charger une autre recette"
                    >
                        <Icon icon="mdi:puzzle" class="mr-1 text-xl"/>
                        Une autre idée
                    </button>
                    <button
                        class="p-3 rounded-2xl border-2 border-yellow-600 hover:border-yellow-700 dark:hover:border-yellow-800 bg-transparent text-yellow-600 hover:text-yellow-700 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-1"
                        on:click={onBack}
                        disabled={loading}
                        aria-label="Modifier les préférences"
                    >
                        <Icon icon="mdi:silverware-fork-knife" class="mr-1 text-xl"/>
                        Modifier mes préférences
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>