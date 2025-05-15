<script>
    import { fade } from "svelte/transition";
    import Icon from "@iconify/svelte";

    export let recipeData;
    const ingredients = recipeData.extendedIngredients.map(ing => ing.original);
    const steps = recipeData.analyzedInstructions?.[0]?.steps.map(step => step.step) || [];
    export let onBack;
</script>

<div transition:fade={{ duration: 150 }} class="mt-5">
    <p class="text-base">
        Voici une idée pour votre dîner {recipeData.tags?.includes('low-calorie') ? 'léger' : ''} :
    </p>
    <div class="mt-5 dark:font-thin">
        <div class="mb-3">
            {#each recipeData.tags as tag}
                <span class="bg-gray-300 dark:bg-gray-600 p-2 rounded-full">#{tag}</span>
            {/each}
        </div>
        <img src={recipeData.image} class="border-1 border-gray-400 dark:border-gray-600 rounded-3xl w-full h-full" alt="">
        <div class="mt-5">
            <p><span class="font-bold mr-2">Nom du plat :</span> {recipeData.title}</p>
            <div class="mt-3 flex">
                <span class="font-bold mr-2">Ingrédients :</span> 
                <ul class="list-disc ml-5">
                    {#each ingredients as ingredient}
                        <li>{ingredient}</li>
                    {/each}
                </ul>
            </div>
            <div class="mt-3">
                <span class="font-bold mr-2">Instructions :</span> 
                <ul class="list-decimal ml-5">
                    {#each steps as step}
                        <li>{step}</li>
                    {/each}
                </ul>
            </div>
            <p class="mt-3"><span class="font-bold mr-2">Temps de préparation :</span> {recipeData.prepTime}</p>
            <div class="mt-3 flex">
                <span class="font-bold mr-2">Infos nutritionnelles :</span> 
                <ul class="list-disc ml-5">
                    <!-- <li>Calories : {recipeData.nutrition.calories}</li> -->
                    <!-- <li>Protéines : {recipeData.nutrition.protein}</li>
                    <li>Glucides : {recipeData.nutrition.carbs}</li>
                    <li>Lipides : {recipeData.nutrition.fat}</li> -->
                </ul>
            </div>
        </div>

        <div class="flex justify-end mt-5">
            <button class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex">
                <Icon icon="mdi:puzzle" class="mr-1 text-xl"/>
                Une autre idée
            </button>
            <button class="p-3 rounded-2xl border-2 border-yellow-600 hover:border-yellow-700 dark:hover:border-yellow-800 bg-transparent text-yellow-600 hover:text-yellow-700 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-1" on:click={onBack}>
                <Icon icon="mdi:silverware-fork-knife" class="mr-1 text-xl"/>
                Modifier mes préférences
            </button>
        </div>
    </div>
</div>