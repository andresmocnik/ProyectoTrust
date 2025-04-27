// js/views/newsView.js - Lógica para la vista del Lector de Noticias

// --- Importaciones ---
import * as DOM from '../ui/domElements.js';
import { state } from '../state.js';
import { createElement, parseDateString } from '../utils.js';
import { setupTooltipListeners } from '../ui/tooltip.js';

// --- Renderizado de Artículos ---

/**
 * Crea el elemento HTML para un solo artículo.
 */
function renderSingleArticle(article, highlightedPolitician = null) {
    if (!article) {
        console.error("[renderSingleArticle] Error: Se recibió un objeto de artículo inválido (null o undefined).");
        return null;
    }

    const articleDiv = createElement('article', { className: 'article' });

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

    const bodyContainer = articleDiv.querySelector('.article-body');
    let spansAddedCount = 0;

    if (!bodyContainer) {
        console.error("[renderSingleArticle] CRÍTICO: No se encontró el contenedor .article-body para el artículo ID:", article.id);
        return articleDiv;
    }

    const bodyContent = article.cuerpo || '';
    const normalizedPersonsInArticle = article.personas_detectadas_normalizadas || [];

    if (bodyContent && normalizedPersonsInArticle.length > 0) {
        const paragraphs = bodyContent.split('\n').filter(p => p.trim() !== '');

        if (paragraphs.length === 0 && bodyContent.trim() !== '') {
             let processedHTML = bodyContent;
             normalizedPersonsInArticle.forEach((normPersonName) => {
                 if (!normPersonName || typeof normPersonName !== 'string') return;
                 const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                 const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                 const shouldHighlight = highlightedPolitician && normPersonName.toLowerCase() === highlightedPolitician.toLowerCase();
                 processedHTML = processedHTML.replace(regex, (match) => {
                     spansAddedCount++;
                     let spanClass = 'person-tooltip';
                     if (shouldHighlight) {
                         spanClass += ' highlighted-person';
                     }
                     return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                 });
             });
             bodyContainer.appendChild(createElement('p', { innerHTML: processedHTML }));

        } else {
             paragraphs.forEach((pText) => {
                 let processedHTML = pText;
                 normalizedPersonsInArticle.forEach((normPersonName) => {
                     if (!normPersonName || typeof normPersonName !== 'string') return;
                     const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                     const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                     const shouldHighlight = highlightedPolitician && normPersonName.toLowerCase() === highlightedPolitician.toLowerCase();
                     processedHTML = processedHTML.replace(regex, (match) => {
                         spansAddedCount++;
                         let spanClass = 'person-tooltip';
                          if (shouldHighlight) {
                             spanClass += ' highlighted-person';
                         }
                         return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                     });
                 });
                 bodyContainer.appendChild(createElement('p', { innerHTML: processedHTML }));
             });
        }
    } else if (bodyContent) {
         bodyContent.split('\n').filter(p => p.trim() !== '').forEach(pText => {
             bodyContainer.appendChild(createElement('p', { textContent: pText }));
         });
    } else {
         bodyContainer.innerHTML = '<p><i>Contenido no disponible.</i></p>';
    }
    // console.log(`[renderSingleArticle] ID: ${article.id} - Finalizado. Spans .person-tooltip añadidos: ${spansAddedCount}`); // Log opcional
    return articleDiv;
}

/**
 * Renderiza la lista de artículos en el contenedor principal.
 */
export function renderNewsList(articlesToDisplay = state.allArticles, politicianToHighlight = null) {
    if (!DOM.articlesContainer) {
        console.error("[renderNewsList] CRÍTICO: Contenedor de artículos (DOM.articlesContainer) no encontrado.");
        return;
    }

    DOM.articlesContainer.innerHTML = '';

    if (!articlesToDisplay || articlesToDisplay.length === 0) {
        DOM.articlesContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px 0;">No se encontraron artículos que coincidan con los criterios.</p>';
        return;
    }

    let articlesRenderedCount = 0;
    articlesToDisplay.forEach((article, index) => {
        try {
            const articleElement = renderSingleArticle(article, politicianToHighlight);
            if (articleElement) {
                 DOM.articlesContainer.appendChild(articleElement);
                 articlesRenderedCount++;
            } else {
                 console.warn(`[renderNewsList] renderSingleArticle devolvió null para artículo índice ${index}, ID: ${article?.id}`);
            }
        } catch (error) {
            console.error(`[renderNewsList] Error en forEach renderizando artículo ID ${article?.id}:`, error);
        }
    });

    if (typeof setupTooltipListeners === 'function') {
        if (articlesRenderedCount > 0) {
             setupTooltipListeners(DOM.articlesContainer);
        }
    } else {
        console.error("[renderNewsList] Error: setupTooltipListeners no es una función importada correctamente.");
    }
}

// --- Filtros y Ordenación ---

/**
 * NUEVA FUNCIÓN: Puebla el dropdown de filtro por artículo.
 * (VERSIÓN CON LOGS - MANTENIDA)
 */
function populateArticleSelect() {
    // --- LOG DE DIAGNÓSTICO 3 ---
    console.log("[populateArticleSelect] Ejecutando. Verificando DOM.articleSelect:", DOM.articleSelect);
    if (!DOM.articleSelect) {
        console.error("[populateArticleSelect] ¡Select de artículo no encontrado en DOM!");
        return;
    }
    const articles = state.allArticles || [];
    // --- LOG DE DIAGNÓSTICO 4 ---
    console.log(`[populateArticleSelect] Número de artículos a procesar: ${articles.length}`);

    const previousValue = DOM.articleSelect.value;
    DOM.articleSelect.innerHTML = '<option value="">-- Todos los Artículos --</option>';
    let optionsAdded = 0;

    articles.forEach((article, index) => {
        if (!article) {
            console.warn(`[populateArticleSelect] Artículo en índice ${index} es null o undefined.`);
            return; // Saltar este artículo
        }
        // --- LOG DE DIAGNÓSTICO 5 (opcional, puede ser mucho output) ---
        // console.log(` -> Añadiendo artículo índice ${index}: ${article.titulo}`);
        DOM.articleSelect.appendChild(createElement('option', {
            value: index.toString(),
            textContent: article.titulo || `Artículo ${index + 1} (Sin título)`
        }));
        optionsAdded++;
    });

    if (DOM.articleSelect.querySelector(`option[value="${previousValue}"]`)) {
        DOM.articleSelect.value = previousValue;
    }
    console.log(`[populateArticleSelect] Finalizado. Opciones añadidas: ${optionsAdded}. Total en select: ${DOM.articleSelect.options.length}`);
}

/**
 * Puebla el dropdown de filtro por político.
 * (VERSIÓN CON LOGS - MANTENIDA)
 */
function populatePoliticianFilter() {
    // --- LOG DE DIAGNÓSTICO 6 ---
    console.log("[populatePoliticianFilter] Ejecutando. Verificando DOM.politicianSelect:", DOM.politicianSelect);
     if (!DOM.politicianSelect) {
        console.error("[populatePoliticianFilter] ¡Select de político no encontrado en DOM!");
        return;
    }
    const articles = state.allArticles || [];
    const politicianNames = new Set();
    let checkedArticles = 0;

    articles.forEach(article => {
        if (!article) return;
        checkedArticles++;
        const personas = article.personas_detectadas_normalizadas;
        // --- LOG DE DIAGNÓSTICO 7 (opcional) ---
        // console.log(` -> Políticos en artículo ${article.id || 'N/A'}:`, personas);
        (personas || []).forEach(name => {
            if (name?.trim()) {
                politicianNames.add(name.trim());
            }
        });
    });

    const sortedNames = Array.from(politicianNames).sort((a, b) => a.localeCompare(b));
    // --- LOG DE DIAGNÓSTICO 8 ---
    console.log(`[populatePoliticianFilter] Artículos revisados: ${checkedArticles}. Nombres únicos encontrados: ${sortedNames.length}`, sortedNames);

    const previousValue = DOM.politicianSelect.value;
    DOM.politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
    let optionsAdded = 0;

    sortedNames.forEach(name => {
        DOM.politicianSelect.appendChild(createElement('option', { value: name, textContent: name }));
        optionsAdded++;
    });
    if (sortedNames.includes(previousValue)) {
        DOM.politicianSelect.value = previousValue;
    }
     console.log(`[populatePoliticianFilter] Finalizado. Opciones añadidas: ${optionsAdded}. Total en select: ${DOM.politicianSelect.options.length}`);
}

// (Aquí estaba la definición duplicada de populateArticleSelect - ELIMINADA)
// (Aquí estaba la definición duplicada de populatePoliticianFilter - ELIMINADA)


/**
 * Función centralizada para aplicar filtros (artículo Y político) y renderizar.
 */
function applyFiltersAndRender() {
    if (!DOM.articleSelect || !DOM.politicianSelect || !state.allArticles) {
        console.error("[applyFiltersAndRender] Faltan elementos DOM (selects) o datos (allArticles).");
        return;
    }

    const selectedArticleIndexStr = DOM.articleSelect.value;
    const selectedPolitician = DOM.politicianSelect.value;

    // console.log(`[applyFiltersAndRender] Aplicando filtros - Índice Artículo: '${selectedArticleIndexStr || 'Todos'}', Político: '${selectedPolitician || 'Todos'}'`);

    let filteredArticles = [...state.allArticles];

    if (selectedArticleIndexStr !== "") {
        const index = parseInt(selectedArticleIndexStr, 10);
        if (!isNaN(index) && index >= 0 && index < state.allArticles.length) {
            filteredArticles = [state.allArticles[index]];
            // console.log(` -> Filtro Artículo aplicado: Mostrando solo índice ${index}`);
        } else {
            // console.warn(` -> Índice de artículo inválido: ${selectedArticleIndexStr}. Mostrando 0 artículos por seguridad.`);
            filteredArticles = [];
        }
    }
    // else {
        // console.log(" -> Filtro Artículo: No aplicado (Todos).");
    // }

    if (selectedPolitician !== "") {
        // console.log(` -> Aplicando filtro Político: "${selectedPolitician}" sobre ${filteredArticles.length} artículos.`);
        filteredArticles = filteredArticles.filter(article =>
            (article.personas_detectadas_normalizadas || []).some(person => person.toLowerCase() === selectedPolitician.toLowerCase())
        );
        // console.log(` -> Después del filtro Político, quedan: ${filteredArticles.length} artículos.`);
    }
    // else {
        // console.log(" -> Filtro Político: No aplicado (Todos).");
    // }

    renderNewsList(filteredArticles, selectedPolitician);
}

/**
 * Maneja el evento de cambio en el select de artículos.
 */
function handleArticleSelectChange() {
    // console.log("[newsView] Cambio en selección de artículo."); // Log opcional
    state.currentFilter.articleIndex = DOM.articleSelect?.value !== "" ? DOM.articleSelect.value : null;
    applyFiltersAndRender();
}

/**
 * Maneja el evento de cambio en el select de políticos.
 */
function handlePoliticianFilter() {
    // console.log("[newsView] Cambio en selección de político."); // Log opcional
     state.currentFilter.politician = DOM.politicianSelect?.value || null;
    applyFiltersAndRender();
}

/**
 * Resetea ambos filtros (artículo y político) y muestra todos los artículos ordenados.
 */
function resetNewsView() {
    console.log("[newsView] Reseteando filtros.");
    if (DOM.articleSelect) DOM.articleSelect.value = '';
    if (DOM.politicianSelect) DOM.politicianSelect.value = '';
    state.currentFilter = { type: null, value: null, articleIndex: null, politician: null };
    sortArticlesByDate(); // Llama a sort para re-renderizar todo con la ordenación actual
}

/**
 * Ordena los artículos según el estado, repuebla el select de artículos y aplica filtros.
 */
export function sortArticlesByDate(ascending = undefined) {
    const sortAscending = (ascending === undefined) ? state.currentSort.ascending : ascending;
    // console.log(`[sortArticlesByDate] Iniciando ordenación: ${sortAscending ? 'asc' : 'desc'}`);

    if (ascending !== undefined) {
        state.currentSort = { field: 'date', ascending: sortAscending };
    }

    // Ordenar la lista completa en state.allArticles
    (state.allArticles || []).sort((a, b) => { // Añadir chequeo por si allArticles es null/undefined brevemente
        const dateA = parseDateString(a?.fecha_hora); // Añadir chequeo en a y b
        const dateB = parseDateString(b?.fecha_hora);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return sortAscending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });

    // Volver a poblar el select de artículos DESPUÉS de ordenar
    populateArticleSelect();

    // Aplicar los filtros ACTUALES y renderizar
    // console.log("[sortArticlesByDate] Ordenación completada. Llamando a applyFiltersAndRender...");
    applyFiltersAndRender();
}

// --- Inicialización de la Vista ---

/**
 * Configura los event listeners para los controles de la vista de noticias.
 */
export function initializeNewsView() {
    console.log("[initializeNewsView] Inicializando listeners...");
    if (!DOM.articleSelect || !DOM.politicianSelect || !DOM.resetFilterBtn || !DOM.sortNewestBtn || !DOM.sortOldestBtn) {
        console.error("[newsView] Error: No se encontraron todos los elementos de control necesarios.");
        return;
    }

    console.log(`[initializeNewsView] Verificando state.allArticles antes de poblar. Longitud: ${state.allArticles?.length ?? 'undefined'}`);

    if (state.allArticles?.length > 0) {
        console.log("[initializeNewsView] Llamando a populateArticleSelect y populatePoliticianFilter...");
        populateArticleSelect();
        populatePoliticianFilter();
    } else {
        console.warn("[initializeNewsView] No se poblarán los selects porque state.allArticles está vacío o no es un array.");
    }

    DOM.articleSelect.addEventListener('change', handleArticleSelectChange);
    DOM.politicianSelect.addEventListener('change', handlePoliticianFilter);
    DOM.resetFilterBtn.addEventListener('click', resetNewsView);
    DOM.sortNewestBtn.addEventListener('click', () => sortArticlesByDate(false));
    DOM.sortOldestBtn.addEventListener('click', () => sortArticlesByDate(true));

    console.log("[newsView] Listeners configurados.");
}