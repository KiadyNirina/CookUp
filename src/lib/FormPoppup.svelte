<script>
import Icon from '@iconify/svelte';
import { createEventDispatcher } from 'svelte';
import Result from './Result.svelte';

const dispatch = createEventDispatcher();

function handleClose() {
    dispatch('close');
}

let idea = false;

function findIdea() {
    idea = true;
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
                <p on:click={handleClose} class="ml-auto pr-2 pl-2 border-2 font-bold border-red-500 bg-red-500 hover:bg-transparent transition-all duration-300 ease-in-out hover:cursor-pointer text-white hover:text-red-500 rounded-md">x</p>
            </div>

            {#if !idea}

            <div class="mt-5">
                <p class="text-base">
                    Choisissez vos préférences et laissez-nous vous inspirer.
                </p>
                <div class="mt-3 dark:font-thin">
                    <label for="type" class="text-base">Type de repas :</label>
                    <select name="" id="type" class="w-full mt-1 mb-5 p-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-600 dark:bg-black dark:text-white dark:border-gray-600 dark:focus:ring-yellow-500 hover:cursor-pointer">
                        <option value="">Petit-déjeuner</option>
                        <option value="">Déjeuner</option>
                        <option value="">Dîner</option>
                        <option value="">Collation</option>
                    </select>

                    <label for="" class="text-base">Humeur du repas :</label>
                    <div class="grid grid-cols-4 gap-x-4 gap-y-2 mt-1 mb-5">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Rapide</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Léger</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Gourmand</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Équilibré</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Végétarien</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Protéiné</span>
                        </label>

                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="hidden peer" />
                            <div class="w-5 h-5 border-2 rounded border-gray-300 dark:border-gray-600 peer-checked:bg-yellow-600 transition-colors"></div>
                            <span class="ml-2">Peu calorique</span>
                        </label>
                    </div>

                    <button class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-2 border-yellow-600 hover:bg-transparent hover:text-yellow-600 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-auto" on:click={findIdea}>
                        <Icon icon="mdi:lightbulb-on" class="mr-1 text-xl"/>
                        Trouver des idées
                    </button>
                </div>
            </div>

            {:else} 

                <Result onBack={() => idea = false}/>
            
            {/if}
        </div>
  </div>
  