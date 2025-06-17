<script>
import { jsPDF } from 'jspdf';
import { scale } from 'svelte/transition';
import Icon from '@iconify/svelte';
import { createEventDispatcher } from 'svelte';
import { language } from '../stores/language';
import { translations } from '$lib/translations';
import { browser } from '$app/environment';

let scriptLoaded = true;
let pdfLoadError = null;

export let recipeData;
export let selectedType;
export let moods;
export let maxPrepTime;
export let onBack;
export let loading;

const dispatch = createEventDispatcher();

$: ingredients = Array.isArray(recipeData?.extendedIngredients) ? recipeData.extendedIngredients.map(ing => ing.original || '') : [];
$: steps = Array.isArray(recipeData?.analyzedInstructions?.[0]?.steps) ? recipeData.analyzedInstructions[0].steps.map(step => step.step || '') : [];
$: prepTime = recipeData?.readyInMinutes ? `${recipeData.readyInMinutes} ${t.minutes}` : ($language === 'en' ? 'Not specified' : 'Non spécifié');
$: exceedsPrepTime = maxPrepTime && recipeData?.readyInMinutes && recipeData.readyInMinutes > parseInt(maxPrepTime, 10);

$: t = translations[$language] || translations.en;

$: formattedMealType = t.mealTypes[selectedType] || ($language === 'en' ? 'meal' : 'repas');
$: formattedMoods = moods.map(m => t.moods[m] || m).join(', ');
$: mealDescription = moods.length > 0 ? `${formattedMealType} ${formattedMoods}` : formattedMealType;

function handleFindAnother() {
    dispatch('findAnother');
}

async function exportToPDF() {
    console.log('exportToPDF called', { scriptLoaded, recipeData });
    if (!scriptLoaded) {
        console.error('jsPDF not available');
        alert(t.pdfLoadError || 'PDF generation failed: Library not available. Please try again.');
        return;
    }
    if (!recipeData) {
        console.error('No recipe data available');
        alert(t.noRecipeError || 'No recipe data available to export.');
        return;
    }

    try {
        console.log('Generating PDF for recipe:', recipeData.title);
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - 2 * margin;
        let y = margin;

        const yellowColor = '#D97706';
        const textColor = '#000000';

        function addText(text, x, fontSize, isBold = false, color = textColor) {
            doc.setFontSize(fontSize);
            doc.setFont('Times', isBold ? 'bold' : 'normal');
            doc.setTextColor(color);
            const lines = doc.splitTextToSize(text, maxWidth);
            for (const line of lines) {
                if (y + fontSize / 2.83 > pageHeight - margin - 10) {
                    addFooter();
                    doc.addPage();
                    addHeader();
                    y = margin + 10;
                }
                doc.text(line, x, y);
                y += fontSize / 2.83 + 2;
            }
            doc.setTextColor(textColor);
            return y;
        }

        // Helper function to add a horizontal line
        function addLine() {
            doc.setDrawColor(yellowColor);
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
        }

        // Header function
        function addHeader() {
            doc.setFontSize(10);
            doc.setFont('Times', 'normal');
            doc.setTextColor(textColor);
            doc.text('Recipe App', margin, 10);
            doc.setDrawColor(yellowColor);
            doc.line(margin, 12, pageWidth - margin, 12);
        }

        // Footer function with page number and date
        function addFooter() {
            doc.setFontSize(8);
            doc.setFont('Times', 'normal');
            doc.setTextColor(textColor);
            const pageNumber = doc.internal.getNumberOfPages();
            const date = new Date().toLocaleDateString($language === 'en' ? 'en-US' : 'fr-FR');
            doc.text(`Page ${pageNumber} | Generated on ${date}`, margin, pageHeight - 5);
        }

        // Cover page
        doc.setFont('Times', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(yellowColor);
        doc.text(recipeData.title || 'Recipe', pageWidth / 2, pageHeight / 3, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(textColor);
        doc.text(`${t.suggestion} ${mealDescription}`, pageWidth / 2, pageHeight / 3 + 10, { align: 'center' });

        // Add recipe image if available
        if (recipeData.image && browser) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = recipeData.image;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Failed to load image'));
                    setTimeout(() => reject(new Error('Image loading timed out')), 5000);
                });
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const imgWidth = 80;
                const imgHeight = (img.height * imgWidth) / img.width;
                if (pageHeight / 3 + 20 + imgHeight < pageHeight - margin) {
                    doc.addImage(imgData, 'JPEG', (pageWidth - imgWidth) / 2, pageHeight / 3 + 20, imgWidth, imgHeight);
                }
            } catch (err) {
                console.warn('Failed to add image to PDF:', err.message);
            }
        }

        doc.addPage();
        addHeader();
        y = margin + 10;

        // Dish Name
        y = addText(`${t.dishName} ${recipeData.title || ''}`, margin, 14, true, yellowColor);
        addLine();

        // Ingredients
        if (ingredients.length > 0) {
            y = addText(t.ingredients, margin, 12, true, yellowColor);
            for (const ingredient of ingredients) {
                y = addText(`- ${ingredient}`, margin + 5, 10);
            }
            y += 5;
            addLine();
        }

        // Instructions
        if (steps.length > 0) {
            y = addText(t.instructions, margin, 12, true, yellowColor);
            steps.forEach((step, index) => {
                y = addText(`${index + 1}. ${step}`, margin + 5, 10);
            });
            y += 5;
            addLine();
        }

        // Preparation Time
        y = addText(`${t.prepTime} ${prepTime}`, margin, 12, true, yellowColor);
        y += 5;
        addLine();

        // Nutritional Info
        if (recipeData.nutrition?.nutrients?.length) {
            y = addText(t.nutrition, margin, 12, true, yellowColor);
            for (const nutrient of recipeData.nutrition.nutrients) {
                if (['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(nutrient.name)) {
                    y = addText(`- ${nutrient.name}: ${nutrient.amount} ${nutrient.unit}`, margin + 5, 10);
                }
            }
            addLine();
        }

        // Add footer to the last page
        addFooter();

        // Save the PDF
        doc.save(`${recipeData.title || 'recipe'}.pdf`);
        console.log('PDF generated and downloaded');
    } catch (err) {
        console.error('PDF error:', err.message, err.stack);
        alert(`${t.pdfGenerationError || 'Failed to generate PDF.'} (${err.message})`);
    }
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
                <p class="text-yellow-600 font-semibold mt-4 text-lg">{t.loadingIdea}</p>
            </div>
        </div>
    {:else if recipeData}
        <div transition:scale={{ duration: 300, start: 0.95 }} class="dark:font-thin">
            <p class="text-lg font-semibold">
                {t.suggestion} {mealDescription} :
            </p>
            {#if exceedsPrepTime}
                <div
                    class="mt-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded-lg"
                    role="alert"
                >
                    <p class="font-semibold">
                        {t.prepTimeWarning} {maxPrepTime} {t.minutes}, {t.prepTimeWarning2} {recipeData.readyInMinutes} {t.minutes}.
                    </p>
                </div>
            {/if}
            {#if pdfLoadError}
                <div
                    class="mt-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded-lg"
                    role="alert"
                >
                    <p class="font-semibold">
                        {t.pdfLoadError || 'Failed to load PDF library. PDF export is unavailable.'}
                    </p>
                </div>
            {/if}
            <div class="mt-5">
                <div class="mb-4 flex flex-wrap gap-2">
                    <span class="bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 p-2 rounded-full text-sm font-semibold">
                        {formattedMealType}
                    </span>
                    {#each moods as mood}
                        <span class="bg-gray-300 dark:bg-gray-600 p-2 rounded-full text-sm font-semibold">
                            #{t.moods[mood] || mood}
                        </span>
                    {/each}
                </div>
                {#if recipeData.image}
                    <img
                        src={recipeData.image}
                        class="border-1 border-gray-400 dark:border-gray-600 rounded-3xl w-full h-full"
                        alt={recipeData.title || t.recipeImageAlt}
                    />
                {/if}
                <div class="mt-5">
                    <p><span class="font-bold mr-2">{t.dishName}</span> {recipeData.title || ''}</p>
                    {#if ingredients.length > 0}
                        <div class="mt-3 flex">
                            <span class="font-bold mr-2">{t.ingredients}</span>
                            <ul class="list-disc ml-5">
                                {#each ingredients as ingredient}
                                    <li>{ingredient}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    {#if steps.length > 0}
                        <div class="mt-3">
                            <span class="font-bold mr-2">{t.instructions}</span>
                            <ul class="list-decimal ml-5">
                                {#each steps as step}
                                    <li>{step}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    <p class="mt-3"><span class="font-bold mr-2">{t.prepTime}</span> {prepTime}</p>
                    {#if recipeData.nutrition?.nutrients?.length}
                        <div class="mt-3 flex">
                            <span class="font-bold mr-2">{t.nutrition}</span>
                            <ul class="list-disc ml-5">
                                {#each recipeData.nutrition.nutrients as nutrient}
                                    {#if ['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(nutrient.name)}
                                        <li>{nutrient.name}: ${nutrient.amount} ${nutrient.unit}</li>
                                    {/if}
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>

                <div class="flex justify-end mt-5">
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex"
                        on:click={exportToPDF}
                        disabled={loading || !scriptLoaded}
                        aria-label={t.exportPDF}
                    >
                        <Icon icon="mdi:file-pdf-box" class="mr-1 text-xl"/>
                        {t.exportPDF}
                    </button>
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-1"
                        on:click={handleFindAnother}
                        disabled={loading}
                        aria-label={t.anotherIdea}
                    >
                        <Icon icon="mdi:puzzle" class="mr-1 text-xl"/>
                        {t.anotherIdea}
                    </button>
                    <button
                        class="p-3 rounded-2xl border-2 border-yellow-600 hover:border-yellow-700 dark:hover:border-yellow-800 bg-transparent text-yellow-600 hover:text-yellow-700 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex ml-1"
                        on:click={onBack}
                        disabled={loading}
                        aria-label={t.modifyPrefs}
                    >
                        <Icon icon="mdi:silverware-fork-knife" class="mr-1 text-xl"/>
                        {t.modifyPrefs}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>