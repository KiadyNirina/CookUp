<script>
    import { fade } from "svelte/transition";
    import Icon from "@iconify/svelte";

    export let onBack;
</script>

<div transition:fade={{ duration: 150 }} class="mt-5">
    <p class="text-base">
        Voici une idée pour votre dîner léger :
    </p>
    <div class="mt-5 dark:font-thin">
        <div class="mb-3">
            <span class="bg-gray-300 dark:bg-gray-600 p-2 rounded-full">#Végétarien</span>
            <span class="bg-gray-300 dark:bg-gray-600 p-2 rounded-full">#Rapide</span>
            <span class="bg-gray-300 dark:bg-gray-600 p-2 rounded-full">#Diner</span>
        </div>
        <img src="https://spoonacular.com/recipeImages/1234567-556x370.jpg" class="border-1 border-gray-400 dark:border-gray-600 rounded-3xl w-full h-full" alt="">
        <div class="mt-5">
            <p><span class="font-bold mr-2">Nom du plat :</span> Salade tiède de quinoa aux légumes rôtis</p>
            <div class="mt-3 flex">
                <span class="font-bold mr-2">Ingrédients :</span> 
                <ul class="list-disc ml-5">
                    <li>120g de quinoa</li>
                    <li>1 courgette</li>
                    <li>1 poivron rouge</li>
                    <li>1 carotte</li>
                    <li>Huile d’olive</li>
                    <li>Jus de citron</li>
                    <li>Herbes de Provence</li>
                    <li>Sel & poivre</li>
                </ul>
            </div>
            <div class="mt-3">
                <span class="font-bold mr-2">Instructions :</span> 
                <ul class="list-decimal ml-5">
                    <li>Faire cuire le quinoa selon les instructions.</li>
                    <li>Couper les légumes en dés et les faire rôtir au four 25 min à 200°C.</li>
                    <li>Mélanger le tout dans un grand saladier avec un filet d’huile d’olive et de citron.</li>
                    <li>Servir tiède.</li>
                </ul>
            </div>
            <p class="mt-3"><span class="font-bold mr-2">Temps de préparation :</span> 15 min de préparation</p>
            <div class="mt-3 flex">
                <span class="font-bold mr-2">Infos nutritionnelles :</span> 
                <ul class="list-disc ml-5">
                    <li>Calories : 320 kcal</li>
                    <li>Protéines : 9g</li>
                    <li>Glucides : 35g</li>
                    <li>Lipides : 14g</li>
                </ul>
            </div>
        </div>

        <div class="flex justify-end mt-5">
            <button class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-2 border-yellow-600 hover:bg-transparent hover:text-yellow-600 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex">
                <Icon icon="mdi:puzzle" class="mr-1 text-xl"/>
                Une autre idée
            </button>
            <button class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-2 border-yellow-600 hover:bg-transparent hover:text-yellow-600 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-1" on:click={onBack}>
                <Icon icon="mdi:silverware-fork-knife" class="mr-1 text-xl"/>
                Modifier mes préférences
            </button>
        </div>
    </div>
</div>