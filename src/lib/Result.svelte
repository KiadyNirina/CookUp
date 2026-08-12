<script>
import { jsPDF } from 'jspdf';
import { scale, fade } from 'svelte/transition';
import Icon from '@iconify/svelte';
import { createEventDispatcher } from 'svelte';
import { language } from '../stores/language';
import { translations } from '$lib/translations';
import { browser } from '$app/environment';

let scriptLoaded = true;
let pdfLoadError = null;
let copySuccess = false;
let pdfLoading = false;
let showShareOptions = false;
let isFavorite = false;
let showInstagramModal = false;

export let recipeData;
export let selectedType;
export let diets;
export let allExcludedIngredients = [];
export let nutritionPrefs = {
    minCarbs: '',
    maxCarbs: '',
    minProtein: '',
    maxProtein: '',
    minFat: '',
    maxFat: '',
    minCalories: '',
    maxCalories: ''
};
export let loading;
export let onBack;

const dispatch = createEventDispatcher();

$: ingredients = Array.isArray(recipeData?.extendedIngredients) ? recipeData.extendedIngredients.map(ing => decodeHtmlEntities(ing.original || '')) : [];

$: rawSteps = Array.isArray(recipeData?.analyzedInstructions?.[0]?.steps)
  ? recipeData.analyzedInstructions[0].steps.map(step => {
      const original = decodeHtmlEntities(step.step || '');
      const isTooLong = /QUERY LENGTH LIMIT EXCEEDED|MAX ALLOWED QUERY/i.test(original);
      return {
        text: isTooLong
          ? (t.instructionTooLong || 'Cette instruction est trop longue pour être affichée.')
          : original,
        isTooLong
      };
    })
  : [];
$: uiSteps = rawSteps;
$: steps = rawSteps.map(item => item.text);

$: prepTime = recipeData?.readyInMinutes ? `${recipeData.readyInMinutes} ${t.minutes}` : ($language === 'en' ? 'Not specified' : 'Non spécifié');
$: cuisine = Array.isArray(recipeData?.cuisines) && recipeData.cuisines.length > 0 ? recipeData.cuisines.join(', ') : ($language === 'en' ? 'Not specified' : 'Non spécifié');
$: formattedExcludedIngredients = allExcludedIngredients.length > 0 ? allExcludedIngredients.map(ing => t.ingredients[ing.replace(' ', '_')] || ing).join(', ') : ($language === 'en' ? 'None' : 'Aucun');

$: t = translations[$language] || translations.en;

$: formattedMealType = t.mealTypes[selectedType] || ($language === 'en' ? 'meal' : 'repas');
$: formattedDiets = diets.filter(d => d).map(d => t.diets[d] || d).join(', ');
$: mealDescription = formattedDiets ? `${formattedMealType} (${formattedDiets})` : formattedMealType;

$: recipeUrl = browser && recipeData && selectedType ? 
    `${window.location.origin}${window.location.pathname}?` + new URLSearchParams({
        type: selectedType,
        diet: diets[0] || '',
        recipeId: recipeData.id || '',
        excludeIngredients: allExcludedIngredients.join(','),
        minCarbs: nutritionPrefs.minCarbs || '',
        maxCarbs: nutritionPrefs.maxCarbs || '',
        minProtein: nutritionPrefs.minProtein || '',
        maxProtein: nutritionPrefs.maxProtein || '',
        minFat: nutritionPrefs.minFat || '',
        maxFat: nutritionPrefs.maxFat || '',
        minCalories: nutritionPrefs.minCalories || '',
        maxCalories: nutritionPrefs.maxCalories || ''
    }).toString() : '';

function handleFindAnother() {
    dispatch('findAnother');
}

function toggleFavorite() {
    isFavorite = !isFavorite;
}

function copyRecipeLink() {
    if (!browser || !recipeUrl) {
        console.error('Copy link failed: browser or recipeUrl missing', { browser, recipeUrl });
        alert(t.noLinkError || 'No link available to copy.');
        return;
    }

    navigator.clipboard.writeText(recipeUrl).then(() => {
        console.log('Link copied successfully:', recipeUrl);
        copySuccess = true;
        setTimeout(() => copySuccess = false, 2000);
    }).catch(err => {
        console.error('Failed to copy link:', err);
        alert(t.copyLinkError || 'Failed to copy link.');
    });
}

function shareToSocial(platform) {
    if (!browser || !recipeUrl) {
        alert(t.noLinkError || 'No link available to share.');
        return;
    }

    const encodedUrl = encodeURIComponent(recipeUrl);
    const encodedTitle = encodeURIComponent(recipeData?.title || 'Delicious Recipe');
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    let shareUrl;

    switch (platform.toLowerCase()) {
        case 'instagram':
            navigator.clipboard.writeText(`${recipeData?.title || 'Delicious Recipe'} ${recipeUrl}`)
                .then(() => {
                    showInstagramModal = true;
                    shareUrl = 'https://www.instagram.com/';
                    window.open(shareUrl, '_blank');
                })
                .catch(error => {
                    console.error('Failed to copy link for Instagram:', error);
                    alert(t.copyLinkError || 'Failed to copy link. Please try again.');
                });
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/dialog/share?app_id=${appId}&href=${encodedUrl}&quote=${encodedTitle}`;
            window.open(shareUrl, '_blank');
            break;
        case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
            window.open(shareUrl, '_blank');
            break;
        default:
            console.warn('Unsupported platform:', platform);
    }
    showShareOptions = false;
}

async function exportToPDF() {
    console.log('exportToPDF called', { scriptLoaded, recipeData });
    pdfLoading = true;
    if (!scriptLoaded) {
        console.error('jsPDF not available');
        alert(t.pdfLoadError || 'PDF generation failed: Library not available. Please try again.');
        pdfLoading = false;
        return;
    }
    if (!recipeData) {
        console.error('No recipe data available');
        alert(t.noRecipeError || 'No recipe data available to export.');
        pdfLoading = false;
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

        const cuisineText = `${t.cuisine} ${cuisine}`;
        const cuisineLines = doc.splitTextToSize(cuisineText, maxWidth);
        const cuisineHeight = (cuisineLines.length * 12 / 2.83) + (cuisineLines.length * 2);
        totalContentHeight += cuisineHeight + 10;

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

        y = addText(`${t.cuisine} ${cuisine}`, margin, y, 12, true, yellowColor);
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
    } finally {
        pdfLoading = false;
    }
}

function closeInstagramModal() {
    showInstagramModal = false;
}

function decodeHtmlEntities(text) {
  if (!text) return '';

  if (browser) {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  // Fallback minimal côté serveur
  return text
    .replace(/&#xA0;/gi, '\u00A0')
    .replace(/&nbsp;/gi, '\u00A0')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}
</script>

<div class="">
    {#if loading}
        <div
            transition:scale={{ duration: 300, start: 0.9 }}
            class="flex justify-center items-center h-96"
        >
            <div class="flex flex-col items-center">
                <Icon icon="mdi:loading" class="text-yellow-500 text-6xl animate-spin" />
                <p class="text-yellow-600 dark:text-yellow-400 font-semibold mt-4 text-lg">{t.loadingIdea}</p>
            </div>
        </div>
    {:else if recipeData}
        <div transition:scale={{ duration: 300, start: 0.95 }} class="text-zinc-900 dark:text-zinc-100 dark:font-light">
            <p class="text-sm text-zinc-900 dark:text-zinc-100">
                {t.suggestion} {mealDescription}
            </p>
            {#if pdfLoadError}
                <div
                    class="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-2xl flex items-center gap-2"
                    role="alert"
                >
                    <Icon icon="mdi:alert-circle-outline" class="text-xl shrink-0" />
                    <p class="font-medium">
                        {t.pdfLoadError || 'Failed to load PDF library. PDF export is unavailable.'}
                    </p>
                </div>
            {/if}
            <div class="mt-4">
                {#if recipeData.image}
                    <img
                        src={recipeData.image}
                        class="rounded-2xl w-full h-auto shadow-sm border border-zinc-200/80 dark:border-zinc-800/80"
                        alt={recipeData.title || t.recipeImageAlt}
                    />
                {/if}
                <div class="mt-4">
                    <div class="mb-4 flex items-center">
                        <div class="flex flex-wrap gap-2">
                            <span class="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-medium border bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
                                {formattedMealType}
                            </span>
                            {#each diets as diet}
                                {#if diet}
                                    <span class="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-medium border bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300">
                                        #{t.diets[diet] || diet}
                                    </span>
                                {/if}
                            {/each}
                            {#if cuisine && cuisine !== ($language === 'en' ? 'Not specified' : 'Non spécifié')}
                                <span class="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-medium border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                                    {cuisine}
                                </span>
                            {/if}
                        </div>

                        <div class="flex justify-end gap-2 ml-auto">
                            <div class="relative group">
                                <button
                                    class="p-2 text-zinc-400 rounded-full hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                    on:click={toggleFavorite}
                                    aria-label={isFavorite ? (t.removeFavorite || 'Remove from favorites') : (t.addFavorite || 'Add to favorites')}
                                >
                                    {#if isFavorite}
                                        <Icon icon="basil:heart-solid" class="text-yellow-600 dark:text-yellow-400 text-xl" />
                                    {:else}
                                        <Icon icon="basil:heart-outline" class="text-xl" />
                                    {/if}
                                </button>
                                <span class="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg py-1 px-2 shadow-lg">
                                    {isFavorite ? (t.removeFavorite || 'Remove from favorites') : (t.addFavorite || 'Add to favorites')}
                                </span>
                            </div>
                            <div class="relative group">
                                <button
                                    class="p-2 text-zinc-400 rounded-full hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative cursor-pointer"
                                    on:click={copyRecipeLink}
                                    disabled={loading || !recipeUrl}
                                    aria-label={t.copyLink || 'Copy Link'}
                                >
                                    <Icon icon="mdi:link" class="text-xl" />
                                    {#if copySuccess}
                                        <span
                                            in:fade={{ duration: 300 }}
                                            out:fade={{ duration: 300 }}
                                            class="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg"
                                        >
                                            {t.copySuccess || 'Copied!'}
                                        </span>
                                    {/if}
                                </button>
                                <span class="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg py-1 px-2 shadow-lg">
                                    {t.copyLink || 'Copy recipe link'}
                                </span>
                            </div>
                            <div class="relative group">
                                <button
                                    class="p-2 text-zinc-400 rounded-full hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                    on:click={() => showShareOptions = !showShareOptions}
                                    disabled={loading || !recipeUrl}
                                    aria-label={t.share || 'Share'}
                                >
                                    <Icon icon="mdi:share-variant" class="text-xl" />
                                </button>
                                <span class="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg py-1 px-2 shadow-lg">
                                    {t.share || 'Share recipe'}
                                </span>
                                {#if showShareOptions}
                                    <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700/80 overflow-hidden py-1 z-10">
                                        <button
                                            class="text-xs w-full text-left px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center transition-colors cursor-pointer"
                                            on:click={() => shareToSocial('instagram')}
                                            aria-label={t.shareInstagram || 'Share on Instagram'}
                                        >
                                            <Icon icon="mdi:instagram" class="mr-2 text-lg" />
                                            {t.shareInstagram || 'Instagram'}
                                        </button>
                                        <button
                                            class="text-xs w-full text-left px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center transition-colors cursor-pointer"
                                            on:click={() => shareToSocial('facebook')}
                                            aria-label={t.shareFacebook || 'Share on Facebook'}
                                        >
                                            <Icon icon="mdi:facebook" class="mr-2 text-lg" />
                                            {t.shareFacebook || 'Facebook'}
                                        </button>
                                        <button
                                            class="text-xs w-full text-left px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center transition-colors cursor-pointer"
                                            on:click={() => shareToSocial('whatsapp')}
                                            aria-label={t.shareWhatsApp || 'Share on WhatsApp'}
                                        >
                                            <Icon icon="mdi:whatsapp" class="mr-2 text-lg" />
                                            {t.shareWhatsApp || 'WhatsApp'}
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                    <p class="font-semibold text-zinc-900 dark:text-zinc-100 text-center">
                        <span class="text-lg md:text-2xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-transparent bg-clip-text py-2">
                            {recipeData.title || ''}
                        </span>
                    </p>
                    {#if cuisine && cuisine !== ($language === 'en' ? 'Not specified' : 'Non spécifié')}
                        <p class="text-xs mt-4 text-zinc-600 dark:text-zinc-400">
                            <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">{t.cuisine}</span> {cuisine}
                        </p>
                    {/if}
                    {#if ingredients.length > 0}
                        <div class="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 block">{t.ingredients}</span>
                            <ul class="text-xs list-disc ml-6 mt-2 text-zinc-600 dark:text-zinc-400 space-y-1">
                                {#each ingredients as ingredient}
                                    <li>{ingredient}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    {#if steps.length > 0}
                        <div class="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 block">{t.instructions}</span>
                            <ul class="text-xs list-decimal ml-6 mt-2 text-zinc-600 dark:text-zinc-400 space-y-1">
                                {#each uiSteps as step}
                                    <li class:too-long={step.isTooLong}>
                                        {#if step.isTooLong}
                                        <Icon icon="mdi:alert-circle-outline" class="inline-block mr-1 text-red-500" />
                                        {/if}
                                        {step.text}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    <p class="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">{t.prepTime}</span> {prepTime}
                    </p>
                    {#if recipeData.nutrition?.nutrients?.length}
                        <div class="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <span class="text-sm font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 block">{t.nutrition}</span>
                            <ul class="text-xs list-disc ml-6 mt-2 text-zinc-600 dark:text-zinc-400 space-y-1">
                                {#each recipeData.nutrition.nutrients as nutrient}
                                    {#if ['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(nutrient.name)}
                                        <li>{nutrient.name}: {nutrient.amount} {nutrient.unit}</li>
                                    {/if}
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
                <div class="text-xs mt-6 space-y-3 sm:flex sm:flex-wrap sm:justify-end sm:gap-3 sm:space-y-0">
                    <button
                        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                        on:click={exportToPDF}
                        disabled={loading || !scriptLoaded || pdfLoading}
                        aria-label={t.exportPDF}
                    >
                        {#if pdfLoading}
                            <Icon icon="mdi:loading" class="text-lg animate-spin" />
                            {t.exportingPDF || 'Exporting...'}
                        {:else}
                            <Icon icon="mdi:file-pdf-box" class="text-lg" />
                            {t.exportPDF || 'Export to PDF'}
                        {/if}
                    </button>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button
                            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 font-semibold px-5 py-3 rounded-2xl active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                            on:click={handleFindAnother}
                            disabled={loading}
                            aria-label={t.anotherIdea || 'Find Another Idea'}
                        >
                            <Icon icon="mdi:puzzle" class="text-lg" />
                            {t.anotherIdea || 'Another Idea'}
                        </button>
                        <button
                            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 font-semibold px-5 py-3 rounded-2xl active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                            on:click={onBack}
                            disabled={loading}
                            aria-label={t.modifyPrefs || 'Modify Preferences'}
                        >
                            <Icon icon="mdi:silverware-fork-knife" class="text-lg" />
                            {t.modifyPrefs || 'Modify Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    {#if showInstagramModal}
        <div
            class="fixed inset-0 bg-zinc-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            transition:fade={{ duration: 200 }}
        >
            <div
                class="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80"
                transition:scale={{ duration: 200, start: 0.95 }}
            >
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold flex items-center gap-2.5">
                        <div class="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                            <Icon icon="mdi:instagram" class="text-xl" />
                        </div>
                        {t.shareInstagram || 'Share on Instagram'}
                    </h2>
                    <button
                        class="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        on:click={closeInstagramModal}
                        aria-label={t.close || 'Close'}
                    >
                        <Icon icon="mdi:close" class="text-xl" />
                    </button>
                </div>
                <p class="text-zinc-600 dark:text-zinc-400 mb-4 text-xs">
                    {t.instagramShareInstructions ||
                        'The recipe link has been copied to your clipboard. Paste it into an Instagram Story or message to share with your followers. To share with a specific list of followers, use Instagram\'s "Close Friends" feature or send a direct message to your selected contacts.'}
                </p>
                <div class="flex justify-end">
                    <button
                        class="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-all"
                        on:click={closeInstagramModal}
                        aria-label={t.close || 'Close'}
                    >
                        {t.close || 'Close'}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .group:hover .group-hover\\:block {
        display: block;
    }
    .too-long {
        font-style: italic;
        color: #fb3740;
        background: rgba(245, 158, 11, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
    }
</style>