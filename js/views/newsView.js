// js/views/newsView.js - Lógica para la vista del Lector de Noticias

import * as DOM from '../ui/domElements.js';        // Referencias a elementos HTML
import { state } from '../state.js';                // Estado compartido (artículos, filtros, orden)
import { createElement, parseDateString } from '../utils.js'; // Funciones de utilidad
import { setupTooltipListeners } from '../ui/tooltip.js'; // Lógica de los tooltips

// --- Renderizado de Artículos ---

/**
 * Crea el elemento HTML para un solo artículo.
 * @param {object} article - El objeto del artículo.
 * @param {string|null} [highlightedPolitician=null] - El nombre del político a resaltar.
 * @returns {HTMLElement|null} El elemento <article> creado o null si hay error.
 */
function renderSingleArticle(article, highlightedPolitician = null) {
    // --- Log #1: Inicio y verificación del artículo ---
    console.log(`[renderSingleArticle] Procesando artículo ID: ${article?.id ?? 'N/A'}, Título: ${article?.titulo?.substring(0,30) || 'Sin Título'}... Highlight: ${highlightedPolitician || 'ninguno'}`);
    if (!article) {
        console.error("[renderSingleArticle] Error: Se recibió un objeto de artículo inválido (null o undefined).");
        return null; // No se puede renderizar nada
    }

    const articleDiv = createElement('article', { className: 'article' });

    // --- Estructura básica HTML (sin cambios) ---
    articleDiv.innerHTML = `
        <div class="article-meta">Sección: ${article.seccion || 'N/A'}</div>
        <h2>${article.titulo || 'Sin Título'}</h2>
        ${article.subtitulo ? `<h3>${article.subtitulo}</h3>` : ''}
        <div class="article-meta">
            <span>Autor: ${article.autor || 'N/A'}</span>
            <span>Fecha: ${article.fecha_hora || 'N/A'}</span>
        </div>
        ${article.link_img ? `<img class="article-img" src="${article.link_img}" alt="${article.titulo || 'Imagen'}">` : ''}
        ${article.caption_img ? `<figcaption class="article-img-caption">${article.caption_img}</figcaption>` : ''}
        <div class="article-body"></div>
    `;

    // --- Procesamiento del Cuerpo para Tooltips (Zona Crítica) ---
    const bodyContainer = articleDiv.querySelector('.article-body');
    let spansAddedCount = 0;

    if (!bodyContainer) {
        console.error("[renderSingleArticle] CRÍTICO: No se encontró el contenedor .article-body para el artículo ID:", article.id);
        // Aún así devolvemos el articleDiv con el resto del contenido
        return articleDiv;
    }

    // --- Log #2: Verificar contenido y personas ---
    const bodyContent = article.cuerpo || ''; // Usar 'cuerpo', asegurando que sea string
    const normalizedPersonsInArticle = article.personas_detectadas_normalizadas || [];
    console.log(`[renderSingleArticle] ID: ${article.id} - Cuerpo (primeros 50 chars): "${bodyContent.substring(0,50)}"`);
    console.log(`[renderSingleArticle] ID: ${article.id} - Personas detectadas: [${normalizedPersonsInArticle.join(', ')}]`);

    // --- Check #1: ¿Hay contenido y personas para procesar? ---
    if (bodyContent && normalizedPersonsInArticle.length > 0) {
        console.log(`[renderSingleArticle] ID: ${article.id} - Entrando al bucle de párrafos/personas.`); // Log Entrada Bucle
        const paragraphs = bodyContent.split('\n').filter(p => p.trim() !== '');

        if (paragraphs.length === 0 && bodyContent.trim() !== '') {
            // Caso especial: el cuerpo no tiene saltos de línea pero sí contenido
             console.log(`[renderSingleArticle] ID: ${article.id} - Procesando cuerpo como un solo bloque (sin saltos de línea).`);
             let processedHTML = bodyContent; // Procesar todo el contenido
             let replacementsMadeInBlock = 0;
             normalizedPersonsInArticle.forEach((normPersonName) => {
                 if (!normPersonName || typeof normPersonName !== 'string') return;
                 const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                 const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                 processedHTML = processedHTML.replace(regex, (match) => {
                     spansAddedCount++;
                     replacementsMadeInBlock++;
                     let spanClass = 'person-tooltip';
                     if (highlightedPolitician && normPersonName === highlightedPolitician) {
                         spanClass += ' highlighted-person';
                     }
                     return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                 });
             });
             console.log(`[renderSingleArticle] ID: ${article.id} - Bloque único: Reemplazos: ${replacementsMadeInBlock}`);
             bodyContainer.appendChild(createElement('p', { innerHTML: processedHTML })); // Añadir como un párrafo

        } else {
             // Procesar por párrafos si existen saltos de línea
             paragraphs.forEach((pText, pIndex) => {
                 let processedHTML = pText;
                 let replacementsMadeInParagraph = 0;
                 normalizedPersonsInArticle.forEach((normPersonName) => {
                     if (!normPersonName || typeof normPersonName !== 'string') return;
                     const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                     const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                     processedHTML = processedHTML.replace(regex, (match) => {
                         spansAddedCount++;
                         replacementsMadeInParagraph++;
                         let spanClass = 'person-tooltip';
                         if (highlightedPolitician && normPersonName === highlightedPolitician) {
                             spanClass += ' highlighted-person';
                         }
                         return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                     });
                 });
                 // Log #3: Verificar reemplazos por párrafo
                 console.log(`[renderSingleArticle] ID: ${article.id} - Párrafo ${pIndex}: Reemplazos: ${replacementsMadeInParagraph}`);
                 bodyContainer.appendChild(createElement('p', { innerHTML: processedHTML }));
             });
        }

    } else if (bodyContent) {
        // Si hay cuerpo pero no personas detectadas, añadir como texto plano
         console.log(`[renderSingleArticle] ID: ${article.id} - Hay cuerpo pero no personas detectadas. Añadiendo texto plano.`);
         bodyContent.split('\n').filter(p => p.trim() !== '').forEach(pText => {
             bodyContainer.appendChild(createElement('p', { textContent: pText }));
         });
    } else {
         // Si no hay cuerpo en absoluto
         console.log(`[renderSingleArticle] ID: ${article.id} - No hay contenido en 'cuerpo'.`);
         bodyContainer.innerHTML = '<p><i>Contenido no disponible.</i></p>';
    }

    // Log #4: Conteo final de spans añadidos
    console.log(`[renderSingleArticle] ID: ${article.id} - Finalizado. Spans .person-tooltip añadidos: ${spansAddedCount}`);
    return articleDiv;
}


/**
 * Renderiza la lista de artículos en el contenedor principal.
 * @param {Array} [articlesToDisplay=state.allArticles] - La lista de artículos a mostrar.
 * @param {string|null} [politicianToHighlight=null] - Político a resaltar.
 */
export function renderNewsList(articlesToDisplay = state.allArticles, politicianToHighlight = null) {
    console.log(`[renderNewsList] Iniciando renderizado. Artículos: ${articlesToDisplay?.length ?? 0}. Highlight: ${politicianToHighlight || 'ninguno'}`);
    if (!DOM.articlesContainer) {
        console.error("[renderNewsList] CRÍTICO: Contenedor de artículos (DOM.articlesContainer) no encontrado.");
        return;
    }

    DOM.articlesContainer.innerHTML = ''; // Limpiar contenedor

    if (!articlesToDisplay || articlesToDisplay.length === 0) {
        DOM.articlesContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px 0;">No se encontraron artículos que coincidan con los criterios.</p>';
        return;
    }

    // --- Bucle de Renderizado ---
    console.log("[renderNewsList] Entrando al bucle forEach para renderizar artículos...");
    let articlesRenderedCount = 0;
    articlesToDisplay.forEach((article, index) => {
        // console.log(`[renderNewsList] Procesando artículo índice ${index}, ID: ${article?.id}`); // Log opcional detallado
        try {
            const articleElement = renderSingleArticle(article, politicianToHighlight);
            if (articleElement) { // Verificar que no sea null
                 DOM.articlesContainer.appendChild(articleElement);
                 articlesRenderedCount++;
            } else {
                 console.warn(`[renderNewsList] renderSingleArticle devolvió null para artículo índice ${index}, ID: ${article?.id}`);
            }
        } catch (error) {
            console.error(`[renderNewsList] Error en forEach renderizando artículo ID ${article?.id}:`, error);
        }
    });
    console.log(`[renderNewsList] Saliendo del bucle forEach. Artículos renderizados: ${articlesRenderedCount}`);


    // --- Configuración de Tooltips ---
    console.log("[renderNewsList] Llamando a setupTooltipListeners...");
    if (typeof setupTooltipListeners === 'function') {
        if (articlesRenderedCount > 0) { // Solo configurar si se renderizó algo
             setupTooltipListeners(DOM.articlesContainer);
             console.log("[renderNewsList] Llamada a setupTooltipListeners completada.");
        } else {
             console.log("[renderNewsList] No se renderizaron artículos, omitiendo setupTooltipListeners.");
        }
    } else {
        console.error("[renderNewsList] Error: setupTooltipListeners no es una función importada correctamente.");
    }
    console.log("[renderNewsList] Renderizado de lista completado.");
}


// --- Filtros y Ordenación (Sin cambios respecto a la versión funcional anterior) ---

function populatePoliticianFilter() {
    console.log("[newsView] Poblando filtro de políticos...");
    const politicianNames = new Set();
    (state.allArticles || []).forEach(article => {
        (article.personas_detectadas_normalizadas || []).forEach(name => {
            if (name?.trim()) politicianNames.add(name.trim());
        });
    });
    const sortedNames = Array.from(politicianNames).sort((a, b) => a.localeCompare(b));

    if (DOM.politicianSelect) {
        const previousValue = DOM.politicianSelect.value;
        DOM.politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
        sortedNames.forEach(name => {
            DOM.politicianSelect.appendChild(createElement('option', { value: name, textContent: name }));
        });
        if (sortedNames.includes(previousValue)) {
            DOM.politicianSelect.value = previousValue;
        }
        // console.log(`[newsView] Filtro poblado con ${sortedNames.length} políticos.`); // Log opcional
    } else {
        console.warn("[newsView] Dropdown de filtro de políticos no encontrado.");
    }
}

function handleArticleSearch() {
    if (!DOM.articleSearchInput) return;
    const searchTerm = DOM.articleSearchInput.value.trim();
    console.log(`[newsView] Iniciando búsqueda con término: "${searchTerm}"`);
    if(DOM.politicianSelect) DOM.politicianSelect.value = "";
    state.currentFilter = { type: searchTerm ? 'search' : null, value: searchTerm };
    sortArticlesByDate();
}

function handlePoliticianFilter() {
    if (!DOM.politicianSelect) return;
    const selectedPolitician = DOM.politicianSelect.value;
    console.log(`[newsView] Filtrando por político: "${selectedPolitician}"`);
    if(DOM.articleSearchInput) DOM.articleSearchInput.value = "";
    state.currentFilter = { type: selectedPolitician ? 'politician' : null, value: selectedPolitician };
    sortArticlesByDate();
}

function resetNewsView() {
    console.log("[newsView] Reseteando filtros/búsqueda.");
    if(DOM.articleSearchInput) DOM.articleSearchInput.value = '';
    if(DOM.politicianSelect) DOM.politicianSelect.value = '';
    state.currentFilter = { type: null, value: null };
    sortArticlesByDate(state.currentSort.ascending);
}

export function sortArticlesByDate(ascending = state.currentSort.ascending) {
    console.log(`[newsView] Actualizando vista: Orden=${ascending ? 'asc' : 'desc'}, Filtro=${state.currentFilter.type || 'ninguno'}`);
    state.currentSort = { field: 'date', ascending: ascending };

    const sortedArticles = [...(state.allArticles || [])].sort((a, b) => {
        const dateA = parseDateString(a.fecha_hora);
        const dateB = parseDateString(b.fecha_hora);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });

    let articlesToDisplay = sortedArticles;
    let politicianToHighlight = null;

    if (state.currentFilter.type === 'search' && state.currentFilter.value) {
        const searchTerm = state.currentFilter.value.toLowerCase();
        articlesToDisplay = sortedArticles.filter(article =>
            (article.titulo || '').toLowerCase().includes(searchTerm) ||
            (article.subtitulo || '').toLowerCase().includes(searchTerm) ||
            (article.cuerpo || '').toLowerCase().includes(searchTerm)
        );
    } else if (state.currentFilter.type === 'politician' && state.currentFilter.value) {
        const selectedPolitician = state.currentFilter.value;
        articlesToDisplay = sortedArticles.filter(article =>
            (article.personas_detectadas_normalizadas || []).includes(selectedPolitician)
        );
        politicianToHighlight = selectedPolitician;
    }

    renderNewsList(articlesToDisplay, politicianToHighlight);
    // Scroll opcional
    // DOM.articlesContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// --- Inicialización de la Vista ---

export function initializeNewsView() {
    console.log("[newsView] Inicializando listeners...");
    if (state.allArticles?.length > 0) {
        populatePoliticianFilter();
    } else {
        console.warn("[newsView] No hay artículos en el estado para poblar el filtro inicial.");
    }

    DOM.articleSearchBtn?.addEventListener('click', handleArticleSearch);
    DOM.articleSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleArticleSearch(); }
    });
    DOM.politicianSelect?.addEventListener('change', handlePoliticianFilter);
    DOM.resetFilterBtn?.addEventListener('click', resetNewsView);
    DOM.sortNewestBtn?.addEventListener('click', () => sortArticlesByDate(false));
    DOM.sortOldestBtn?.addEventListener('click', () => sortArticlesByDate(true));
    console.log("[newsView] Listeners configurados.");
}