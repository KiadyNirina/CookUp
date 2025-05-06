<script>
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

function handleClose() {
    dispatch('close');
}
</script>

<div class="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 z-50">
        <div class="bg-white dark:bg-gray-900 text-black dark:text-white w-11/12 max-w-2xl p-8 rounded-xl shadow-lg overflow-y-auto max-h-[90vh]">
            <div class="flex items-center">
                <h1 class="text-2xl font-bold">Test</h1>
                <p on:click={handleClose} class="ml-auto pr-2 pl-2 border-2 font-bold border-red-500 bg-red-500 hover:bg-transparent transition-all duration-300 ease-in-out hover:cursor-pointer text-white hover:text-red-500 rounded-md">x</p>
            </div>
            <p class="text-justify leading-relaxed">
                Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quidem iure quae, magnam sequi libero laudantium voluptas et pariatur dolore quaerat esse alias repellendus, deleniti accusantium reiciendis, similique eveniet molestiae quasi illum! Possimus sequi eveniet minus eius, sed recusandae aliquam atque, ratione corrupti, incidunt ut laudantium accusantium natus exercitationem vel commodi doloremque eos. Minima laboriosam cum sint perspiciatis dignissimos officia, vero culpa, a qui soluta earum error aspernatur provident tenetur cupiditate. Dolor debitis officiis dignissimos ullam temporibus facilis dicta, amet ut consequatur consequuntur eius id excepturi? Reprehenderit perferendis nobis cupiditate dignissimos consequatur, odio quibusdam quisquam quam excepturi dicta! Odio, molestias expedita.
            </p>
        </div>
  </div>
  