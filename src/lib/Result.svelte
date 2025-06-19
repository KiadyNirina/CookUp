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
let copySuccess = false;

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

$: recipeUrl = browser && recipeData && selectedType && moods[0] && maxPrepTime ? 
    `${window.location.origin}/?type=${encodeURIComponent(selectedType)}&mood=${encodeURIComponent(moods[0])}&prepTime=${encodeURIComponent(maxPrepTime)}&recipeId=${encodeURIComponent(recipeData.id || '')}` : '';

function handleFindAnother() {
    dispatch('findAnother');
}

function copyRecipeLink() {
    if (browser && recipeUrl) {
        navigator.clipboard.writeText(recipeUrl).then(() => {
            copySuccess = true;
            setTimeout(() => copySuccess = false, 2000);
        }).catch(err => {
            console.error('Failed to copy link:', err);
            alert(t.copyLinkError || 'Failed to copy link.');
        });
    }
}

function shareToSocial(platform) {
    if (!browser || !recipeUrl) return;

    const encodedUrl = encodeURIComponent(recipeUrl);
    const encodedTitle = encodeURIComponent(recipeData.title || 'Delicious Recipe');
    let shareUrl;

    switch (platform) {
        case 'instagram':
            navigator.clipboard.writeText(`${recipeData.title || 'Delicious Recipe'} ${recipeUrl}`)
                .then(() => {
                    shareUrl = 'https://www.instagram.com/';
                    window.open(shareUrl, '_blank');
                })
                .catch(err => {
                    console.error('Failed to copy link for Instagram:', err);
                    alert(t.copyLinkError || 'Failed to copy link.');
                });
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            window.open(shareUrl, '_blank');
            break;
        case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
            window.open(shareUrl, '_blank');
            break;
    }
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

        const yellowColor = '#D97706';
        const textColor = '#000000';

        function addText(text, x, yPos, fontSize, isBold = false, color = textColor, options = {}) {
            doc.setFontSize(fontSize);
            doc.setFont('Times', isBold ? 'bold' : 'normal');
            doc.setTextColor(color);
            const lines = doc.splitTextToSize(text, maxWidth);
            let currentY = yPos;
            for (const line of lines) {
                if (currentY + fontSize / 2.83 > pageHeight - margin - 10) {
                    addFooter();
                    doc.addPage();
                    addHeader();
                    currentY = margin + 10;
                }
                doc.text(line, x, currentY, options);
                currentY += fontSize / 2.83 + 2;
            }
            doc.setTextColor(textColor);
            return currentY;
        }

        function addLine(yPos) {
            doc.setDrawColor(yellowColor);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            return yPos + 5;
        }

        function addHeader() {
            doc.setFontSize(10);
            doc.setFont('Times', 'normal');
            doc.setTextColor(textColor);
            doc.text('CookUp Recipe', margin, 10);
            doc.setDrawColor(yellowColor);
            doc.line(margin, 12, pageWidth - margin, 12);
        }

        function addFooter() {
            doc.setFontSize(8);
            doc.setFont('Times', 'normal');
            doc.setTextColor(textColor);
            const pageNumber = doc.internal.getNumberOfPages();
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const date = new Date().toLocaleDateString($language === 'en' ? 'en-US' : 'fr-FR', dateOptions);
            doc.text(`Page ${pageNumber} | ${t.generatedOn || 'Generated on'} ${date}`, margin, pageHeight - 15);
            const prefixText = t.footerPrefix || 'Generated by CookUp - Discover more recipes at ';
            const urlText = t.footerUrl || 'cookuup.netlify.app';
            const prefixWidth = doc.getTextWidth(prefixText);
            doc.text(prefixText, margin, pageHeight - 5);
            doc.text(urlText, margin + prefixWidth, pageHeight - 5);
            doc.link(margin + prefixWidth, pageHeight - 10, doc.getTextWidth(urlText), 8, { url: 'https://cookuup.netlify.app' });
        }

        let y = margin;

        let logoHeight = 0;
        const logoTargetHeight = 20;
        if (browser) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = '/img/black.png';
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Failed to load logo'));
                    setTimeout(() => reject(new Error('Logo loading timed out')), 10000);
                });
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/png', 0.8);
                const imgWidth = (img.width * logoTargetHeight) / img.height;
                doc.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, logoTargetHeight);
                logoHeight = logoTargetHeight;
                y += logoHeight + 10;
            } catch (err) {
                console.warn('Failed to add logo to PDF:', err.message);
                y += logoHeight + 10;
            }
        }

        let totalContentHeight = 0;
        let recipeImageHeight = 0;

        doc.setFont('Times', 'bold');
        doc.setFontSize(24);
        const titleLines = doc.splitTextToSize(recipeData.title || 'Recipe', maxWidth);
        const titleHeight = (titleLines.length * 24 / 2.83) + (titleLines.length * 2);
        totalContentHeight += titleHeight + 5;

        doc.setFontSize(14);
        const descriptionText = `${t.suggestion} ${mealDescription}`;
        const descriptionLines = doc.splitTextToSize(descriptionText, maxWidth);
        const descriptionHeight = (descriptionLines.length * 14 / 2.83) + (descriptionLines.length * 2);
        totalContentHeight += descriptionHeight + 10;

        if (recipeData.image && browser) {
            try {
                const proxyUrl = `https://cors-anywhere.herokuapp.com/${recipeData.image}`;
                const response = await fetch(proxyUrl, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Origin': 'https://cookuup.netlify.app'
                    }
                });
                if (response.ok) {
                    const blob = await response.blob();
                    const imgData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('Failed to convert image to data URL'));
                        reader.readAsDataURL(blob);
                    });
                    const img = new Image();
                    img.src = imgData;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error('Failed to load image'));
                        setTimeout(() => reject(new Error('Image loading timed out')), 10000);
                    });
                    const imgWidth = 80;
                    recipeImageHeight = (img.height * imgWidth) / img.width;
                    totalContentHeight += recipeImageHeight + 10;
                }
            } catch (err) {
                console.warn('Failed to estimate recipe image height:', err.message);
            }
        }

        y = margin + logoHeight + 10 + ((pageHeight - margin - (margin + logoHeight + 10) - totalContentHeight) / 2);

        doc.setFont('Times', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(yellowColor);
        y = addText(recipeData.title || 'Recipe', pageWidth / 2, y, 24, true, yellowColor, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(textColor);
        y = addText(`${t.suggestion} ${mealDescription}`, pageWidth / 2, y, 14, false, textColor, { align: 'center' });

        if (recipeData.image && browser && recipeImageHeight > 0) {
            try {
                const proxyUrl = `https://cors-anywhere.herokuapp.com/${recipeData.image}`;
                console.log('Fetching image via proxy:', proxyUrl);
                const response = await fetch(proxyUrl, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Origin': 'https://cookuup.netlify.app'
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                const blob = await response.blob();
                const imgData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Failed to convert image to data URL'));
                    reader.readAsDataURL(blob);
                });
                const img = new Image();
                img.src = imgData;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Failed to load image into canvas'));
                    setTimeout(() => reject(new Error('Image loading timed out')), 10000);
                });
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imgWidth = 80;
                const imgHeight = (img.height * imgWidth) / img.width;
                if (y + imgHeight < pageHeight - margin) {
                    doc.addImage(imgData, 'JPEG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight);
                    y += imgHeight + 10;
                }
            } catch (err) {
                console.warn('Failed to add recipe image to PDF:', err.message);
                y = addText('Recipe image could not be included due to server restrictions.', pageWidth / 2, y, 10, false, textColor, { align: 'center' });
            }
        }

        doc.addPage();
        addHeader();
        y = margin + 10;

        y = addText(`${t.dishName} ${recipeData.title || ''}`, margin, y, 14, true, yellowColor);
        y = addLine(y);

        if (ingredients.length > 0) {
            y = addText(t.ingredients, margin, y, 12, true, yellowColor);
            for (const ingredient of ingredients) {
                y = addText(`- ${ingredient}`, margin + 5, y, 10);
            }
            y += 5;
            y = addLine(y);
        }

        if (steps.length > 0) {
            y = addText(t.instructions, margin, y, 12, true, yellowColor);
            steps.forEach((step, index) => {
                y = addText(`${index + 1}. ${step}`, margin + 5, y, 10);
            });
            y += 5;
            y = addLine(y);
        }

        y = addText(`${t.prepTime} ${prepTime}`, margin, y, 12, true, yellowColor);
        y += 5;
        y = addLine(y);

        if (recipeData.nutrition?.nutrients?.length) {
            y = addText(t.nutrition, margin, y, 12, true, yellowColor);
            for (const nutrient of recipeData.nutrition.nutrients) {
                if (['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(nutrient.name)) {
                    y = addText(`- ${nutrient.name}: ${nutrient.amount} ${nutrient.unit}`, margin + 5, y, 10);
                }
            }
            y = addLine(y);
        }

        addFooter();
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
                        <div class="mt-3">
                            <span class="font-bold mr-2">{t.ingredients}</span>
                            <ul class="list-disc ml-10">
                                {#each ingredients as ingredient}
                                    <li>{ingredient}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    {#if steps.length > 0}
                        <div class="mt-3">
                            <span class="font-bold mr-2">{t.instructions}</span>
                            <ul class="list-decimal ml-10">
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

                <div class="flex flex-wrap justify-end mt-5 gap-1">
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-300 ease-in-out hover:cursor-pointer font-bold flex"
                        on:click={exportToPDF}
                        disabled={loading || !scriptLoaded}
                        aria-label={t.exportPDF}
                    >
                        <Icon icon="mdi:file-pdf-box" class="mr-1 text-xl"/>
                        {t.exportPDF || 'Export to PDF'}
                    </button>
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-200 ease-in-out hover:cursor-pointer font-bold flex items-center"
                        on:click={copyRecipeLink}
                        disabled={loading || !recipeUrl}
                        aria-label={t.copyLink || 'Copy Link'}
                    >
                        <Icon icon="mdi:link" class="mr-1 text-xl"/>
                        {copySuccess ? (t.copySuccess || 'Copied!') : (t.copyLink || 'Copy Link')}
                    </button>
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-200 ease-in-out hover:cursor-pointer font-bold flex items-center"
                        on:click={() => shareToSocial('instagram')}
                        disabled={loading || !recipeUrl}
                        aria-label={t.shareInstagram || 'Share on Instagram'}
                    >
                        <Icon icon="mdi:instagram" class="mr-1 text-xl"/>
                        {t.shareInstagram || 'Instagram'}
                    </button>
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-200 ease-in-out hover:cursor-pointer font-bold flex items-center"
                        on:click={() => shareToSocial('facebook')}
                        disabled={loading || !recipeUrl}
                        aria-label={t.shareFacebook || 'Share on Facebook'}
                    >
                        <Icon icon="mdi:facebook" class="mr-1 text-xl"/>
                        {t.shareFacebook || 'Facebook'}
                    </button>
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-200 ease-in-out hover:cursor-pointer font-bold flex items-center"
                        on:click={() => shareToSocial('whatsapp')}
                        disabled={loading || !recipeUrl}
                        aria-label={t.shareWhatsApp || 'Share on WhatsApp'}
                    >
                        <Icon icon="mdi:whatsapp" class="mr-1 text-xl"/>
                        {t.shareWhatsApp || 'WhatsApp'}
                    </button>
                    <button
                        class="bg-yellow-600 p-3 text-white dark:text-black rounded-2xl border-yellow-600 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-all duration-200 ease-in-out hover:cursor-pointer font-bold flex items-center"
                        on:click={handleFindAnother}
                        disabled={loading}
                        aria-label={t.anotherIdea || 'Find Another Idea'}
                    >
                        <Icon icon="mdi:puzzle" class="mr-1 text-xl"/>
                        {t.anotherIdea || 'Another Idea'}
                    </button>
                    <button
                        class="p-3 rounded-2xl border-2 border-yellow-600 hover:border-yellow-700 dark:hover:border-yellow-800 bg-transparent text-yellow-600 hover:text-yellow-700 transition-all duration-200 ease-in-out hover:cursor-pointer font-bold flex items-center"
                        on:click={onBack}
                        disabled={loading}
                        aria-label={t.modifyPrefs || 'Modify Preferences'}
                    >
                        <Icon icon="mdi:silverware-fork-knife" class="mr-1 text-xl"/>
                        {t.modifyPrefs || 'Modify Preferences'}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>