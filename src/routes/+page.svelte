<script>
	import Icon from "@iconify/svelte";
	import ToggleTheme from "$lib/ThemeToggle.svelte";
	import FormPoppup from "$lib/FormPoppup.svelte";
	import { fade } from "svelte/transition";
	import { gsap } from "gsap";
	import { onMount } from "svelte";

	let bottle;
	
	onMount(() => {
		gsap.from(".breakfast", {
			y: 30,
			opacity: 0,
			duration: 1,
			ease: "power2.out"
		});

		gsap.to(".breakfast", {
			y: -10,
			repeat: -1,
			yoyo: true,
			duration: 1,
			ease: "power1.inOut",
			delay: 1
		});
	});

	let poppup = false;

	function togglePoppup() {
		poppup = !poppup;
	}
	function closePoppup() {
		poppup = false;
	}
</script>

<div class="text-black dark:text-white max-w-7xl ml-auto mr-auto">
	<div class="transition-all duration-500 ease-in-out fixed w-full max-w-7xl flex items-center bg-white dark:bg-black p-2">
		<p class="text-xl flex items-end">Cook <span class="logo text-yellow-600 text-2xl">Up</span></p>
		<div class="flex ml-auto">
			<a href="https://github.com/KiadyNirina/CookUp" target="_blank" class="p-2 rounded hover:bg-gray-200 hover:cursor-pointer dark:hover:bg-gray-700 text-xl active:scale-70">
					<Icon icon="mdi:github" />
			</a>
			<ToggleTheme/>
		</div>
	</div>
	{#if poppup}
	<div transition:fade={{ duration: 150 }}>
		<FormPoppup on:close={closePoppup} />
	</div>
	{/if}
	<div class="h-[100vh]">
		<div class="header flex h-full items-center">
			<div class="sect1 w-1/2">
				<h1 class="text-8xl font-extrabold">Fini le casse-tête des repas.</h1>
				<p class="dark:font-thin mt-5">Choisissez un critère, on s’occupe du reste.</p>
				<button
					class="button mt-5 flex items-center bg-yellow-600 text-white dark:text-black font-bold p-4 rounded-full transition-all duration-300 ease-in-out hover:cursor-pointer hover:text-yellow-600 hover:bg-transparent border-2 hover:border-yellow-600 active:scale-70"
					on:click={togglePoppup}
				>
					<Icon icon="mdi:timer-outline" class="mr-1" />
					C’est parti !
				</button>
			</div>
			<div class="sect2 w-1/2">
				<img
					src="/img/breakfast.svg"
					alt="Petit déj"
					class="breakfast"
				/>
			</div>
		</div>
	</div>
	<div class="footer text-sm text-center p-2 text-gray-600 dark:text-gray-400">
		<p>© 2025 by <a href="https://kiadynirina.netlify.app/" target="_blank">KiadyN</a>. Tous droits réservés.</p>
	</div>
</div>

<style>
	@import "tailwindcss";
	@custom-variant dark (&:where(.dark, .dark *));
	@font-face {
		font-family: 'NunitoSans';
		src: url('/fonts/NunitoSans.ttf') format('truetype');
		font-style: normal;
	}
	@font-face {
		font-family: 'Pacifico';
		src: url('/fonts/Pacifico-Regular.ttf') format('truetype');
		font-style: normal;
	}
	*{
		font-family: "NunitoSans";
	}
	.logo {
		font-family: "Pacifico";
	}

	@media screen and (max-width: 640px) {
		.header {
			flex-direction: column;
			justify-content: center;
		}
		.sect1 {
			width: 100%;
			text-align: center;
		}
		.sect2 {
			margin-top: 20px;
			width: 100%;
			text-align: center;
		}
		.sect2 img {
			width: 90%;
			margin-left: auto;
			margin-right: auto;
		}
		.sect1 h1 {
			font-size: 3rem;
		}
		.sect1 p {
			font-size: 12px;
		}
		.button {
			margin-left: auto;
			margin-right: auto;
			font-size: 12px;
		}
		.footer p {
			font-size: 10px;
		}
	}

	@media screen and (min-width: 641px) and (max-width: 768px) {
		.sect1 h1 {
			font-size: 3rem;
		}
		.sect1 p {
			font-size: 15px;
		}
		.button {
			font-size: 12px;
		}
		.footer p {
			font-size: 10px;
		}
	}
</style>