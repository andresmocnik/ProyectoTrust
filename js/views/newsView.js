// js/views/newsView.js - Lógica para la vista del Lector de Noticias

// --- Importaciones ---
import * as DOM from '../ui/domElements.js';
import { state } from '../state.js';
import { createElement, parseDateString } from '../utils.js';
import { setupTooltipListeners } from '../ui/tooltip.js';

// --- Renderizado de Artículos ---

/**
 * Crea el elemento HTML para un solo artículo.
 * AHORA USA article.entities_in_article
 */
function renderSingleArticle(article, highlightedPolitician = null) {
    if (!article) {
        // console.error("[renderSingleArticle] Error: Se recibió un objeto de artículo inválido.");
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
    if (!bodyContainer) {
        // console.error("[renderSingleArticle] CRÍTICO: No se encontró .article-body para ID:", article.id);
        return articleDiv; 
    }

    let bodyContentOriginal = article.cuerpo || '';
    // CAMBIO IMPORTANTE: Usar 'entities_in_article' que contiene objetos con posiciones
    const entitiesInfoList = article.entities_in_article || []; // Ej: [{text_original_en_articulo: "Lemoine", nombre_normalizado: "Lilia Lemoine", start_char: X, end_char: Y}, ...]

    if (bodyContentOriginal && entitiesInfoList.length > 0) {
        // Ordenar entidades por start_char en orden DESCENDENTE para reemplazos correctos
        const sortedEntities = [...entitiesInfoList].sort((a, b) => {
            // Manejar casos donde start_char podría no ser un número o ser undefined
            const startA = typeof a.start_char === 'number' ? a.start_char : -1;
            const startB = typeof b.start_char === 'number' ? b.start_char : -1;
            if (startA === -1 && startB === -1) return 0;
            if (startA === -1) return 1; // Poner los problemáticos al final (o principio si se invierte)
            if (startB === -1) return -1;
            return startB - startA; // Descendente
        });
        
        let processedBodyContent = bodyContentOriginal; // Trabajar sobre una copia

        sortedEntities.forEach(entity => {
            const textOriginalInArticle = entity.text_original_en_articulo; 
            const normalizedNameKey = entity.nombre_normalizado;       
            const start = parseInt(entity.start_char, 10);
            const end = parseInt(entity.end_char, 10);

            if (isNaN(start) || isNaN(end) || start < 0 || end > processedBodyContent.length || start >= end) {
                // console.warn(`[renderSingleArticle] Índices inválidos para entidad:`, entity, `en artículo ID: ${article.id}, contenido len: ${processedBodyContent.length}`);
                return; 
            }

            let spanClass = 'person-tooltip';
            const shouldHighlight = highlightedPolitician && normalizedNameKey && normalizedNameKey.toLowerCase() === highlightedPolitician.toLowerCase();
            if (shouldHighlight) {
                spanClass += ' highlighted-person';
            }

            const spanHTML = `<span class="${spanClass}" data-person-key="${normalizedNameKey}">${textOriginalInArticle}</span>`;
            
            try {
                processedBodyContent = processedBodyContent.substring(0, start) + spanHTML + processedBodyContent.substring(end);
            } catch (e) {
                // console.error("Error durante substring/reemplazo:", e, "start:", start, "end:", end, "len:", processedBodyContent.length, "entity:", entity);
            }
        });
        
        processedBodyContent.split('\n').filter(p => p.trim() !== '').forEach(pText => {
            bodyContainer.appendChild(createElement('p', { innerHTML: pText }));
        });

    } else if (bodyContentOriginal) {
        bodyContentOriginal.split('\n').filter(p => p.trim() !== '').forEach(pText => {
            bodyContainer.appendChild(createElement('p', { textContent: pText }));
        });
    } else {
        bodyContainer.innerHTML = '<p><i>Contenido no disponible.</i></p>';
    }
    return articleDiv;
}


export function renderNewsList(articlesToDisplay = state.allArticles, politicianToHighlight = null) {
    if (!DOM.articlesContainer) {
        return;
    }
    DOM.articlesContainer.innerHTML = '';
    if (!articlesToDisplay || articlesToDisplay.length === 0) {
        DOM.articlesContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px 0;">No se encontraron artículos que coincidan con los criterios.</p>';
        return;
    }
    let articlesRenderedCount = 0;
    articlesToDisplay.forEach((article) => {
        try {
            const articleElement = renderSingleArticle(article, politicianToHighlight);
            if (articleElement) {
                 DOM.articlesContainer.appendChild(articleElement);
                 articlesRenderedCount++;
            }
        } catch (error) {
            console.error(`[renderNewsList] Error renderizando artículo ID ${article?.id}:`, error);
        }
    });
    if (typeof setupTooltipListeners === 'function' && articlesRenderedCount > 0) {
        setupTooltipListeners(DOM.articlesContainer);
    }
}

function populateArticleSelect() {
    if (!DOM.articleSelect) { return; }
    const articles = state.allArticles || [];
    const previousValue = DOM.articleSelect.value;
    DOM.articleSelect.innerHTML = '<option value="">-- Todos los Artículos --</option>';
    articles.forEach((article, index) => {
        if (!article) return;
        DOM.articleSelect.appendChild(createElement('option', {
            value: index.toString(),
            textContent: article.titulo || `Artículo ${index + 1} (Sin título)`
        }));
    });
    if (DOM.articleSelect.querySelector(`option[value="${previousValue}"]`)) {
        DOM.articleSelect.value = previousValue;
    }
}

function populatePoliticianFilter() {
    if (!DOM.politicianSelect) { return; }
    const articles = state.allArticles || [];
    const politicianNames = new Set();
    articles.forEach(article => {
        if (!article) return;
        const entities = article.entities_in_article; 
        (entities || []).forEach(entityInfo => {
            if (entityInfo && entityInfo.nombre_normalizado?.trim()) {
                politicianNames.add(entityInfo.nombre_normalizado.trim());
            }
        });
    });
    const sortedNames = Array.from(politicianNames).sort((a, b) => a.localeCompare(b));
    const previousValue = DOM.politicianSelect.value;
    DOM.politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
    sortedNames.forEach(name => {
        DOM.politicianSelect.appendChild(createElement('option', { value: name, textContent: name }));
    });
    if (sortedNames.includes(previousValue)) {
        DOM.politicianSelect.value = previousValue;
    }
}

function applyFiltersAndRender() {
    if (!DOM.articleSelect || !DOM.politicianSelect || !state.allArticles) return;
    const selectedArticleIndexStr = DOM.articleSelect.value;
    const selectedPolitician = DOM.politicianSelect.value;
    let filteredArticles = [...state.allArticles];
    if (selectedArticleIndexStr !== "") {
        const index = parseInt(selectedArticleIndexStr, 10);
        if (!isNaN(index) && index >= 0 && index < state.allArticles.length) {
            filteredArticles = [state.allArticles[index]];
        } else {
            filteredArticles = [];
        }
    }
    if (selectedPolitician !== "") {
        filteredArticles = filteredArticles.filter(article =>
            (article.entities_in_article || []).some(entityInfo => 
                entityInfo && entityInfo.nombre_normalizado && entityInfo.nombre_normalizado.toLowerCase() === selectedPolitician.toLowerCase()
            )
        );
    }
    renderNewsList(filteredArticles, selectedPolitician);
}

function handleArticleSelectChange() {
    state.currentFilter.articleIndex = DOM.articleSelect?.value !== "" ? DOM.articleSelect.value : null;
    applyFiltersAndRender();
}

function handlePoliticianFilter() {
     state.currentFilter.politician = DOM.politicianSelect?.value || null;
    applyFiltersAndRender();
}

function resetNewsView() {
    if (DOM.articleSelect) DOM.articleSelect.value = '';
    if (DOM.politicianSelect) DOM.politicianSelect.value = '';
    state.currentFilter = { type: null, value: null, articleIndex: null, politician: null };
    sortArticlesByDate();
}

export function sortArticlesByDate(ascending = undefined) {
    const sortAscending = (ascending === undefined) ? state.currentSort.ascending : ascending;
    if (ascending !== undefined) {
        state.currentSort = { field: 'date', ascending: sortAscending };
    }
    (state.allArticles || []).sort((a, b) => {
        const dateA = parseDateString(a?.fecha_hora);
        const dateB = parseDateString(b?.fecha_hora);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; 
        if (!dateB) return -1;
        return sortAscending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
    populateArticleSelect(); 
    applyFiltersAndRender(); 
}

export function initializeNewsView() {
    if (!DOM.articleSelect || !DOM.politicianSelect || !DOM.resetFilterBtn || !DOM.sortNewestBtn || !DOM.sortOldestBtn) {
        console.error("[newsView] Error: No se encontraron todos los elementos de control necesarios en initializeNewsView.");
        return;
    }
    if (state.allArticles?.length > 0) {
        populateArticleSelect();
        populatePoliticianFilter();
    }
    DOM.articleSelect.addEventListener('change', handleArticleSelectChange);
    DOM.politicianSelect.addEventListener('change', handlePoliticianFilter);
    DOM.resetFilterBtn.addEventListener('click', resetNewsView);
    DOM.sortNewestBtn.addEventListener('click', () => sortArticlesByDate(false));
    DOM.sortOldestBtn.addEventListener('click', () => sortArticlesByDate(true));
}