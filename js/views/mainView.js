// js/views/mainView.js - Lógica para la vista principal/inicio

import * as DOM from '../ui/domElements.js'; // Importa las funciones getter
import { state } from '../state.js';
import { createElement, parseDateString } from '../utils.js';
import { switchView } from '../ui/navigation.js';
const moment = window.moment; // Asume carga global

/**
 * Función para crear el HTML de una tarjeta de noticia clave.
 */
function createKeyNewsCardHTML(article) {
    if (!article) return '';
    const title = article.titulo || 'Sin Título';
    const sourceOrSection = article.seccion?.trim() || 'N/A';
    const parsedDate = parseDateString(article.fecha_hora);
    const displayDate = parsedDate && typeof moment !== 'undefined' && moment(parsedDate).isValid()
        ? moment(parsedDate).fromNow()
        : (parsedDate ? parsedDate.toLocaleDateString() : 'Fecha N/A');
    let summary = article.subtitulo || '';
    if (!summary && typeof article.cuerpo === 'string') { summary = article.cuerpo.substring(0, 120) + (article.cuerpo.length > 120 ? '...' : ''); }
    summary = summary || 'No hay resumen disponible.';
    const politicians = article.personas_detectadas_normalizadas || [];
    const displayedPoliticians = politicians.slice(0, 3);
    const extraPoliticiansCount = politicians.length - displayedPoliticians.length;
    let tagsHTML = displayedPoliticians.map(p => `<span class="tag">${p}</span>`).join('');
    if (extraPoliticiansCount > 0) tagsHTML += ` <span class="tag tag-more">+${extraPoliticiansCount}</span>`;
    if (!tagsHTML) tagsHTML = '<span class="tag tag-none">Sin figuras detectadas</span>';
    const articleIdentifier = article.id || `index-${article.index}`; // Asume que 'index' existe
    return ` <article class="news-card" data-article-ref="${articleIdentifier}" role="link" tabindex="0"> <h3>${title}</h3> <div class="meta">${sourceOrSection} - ${displayDate}</div> <p class="summary">${summary}</p> <div class="tags"> ${tagsHTML} </div> </article> `;
}

/**
 * Función principal para renderizar las noticias clave.
 * (MODIFICADA para usar la función getter)
 */
export function renderKeyNews() {
    console.log("[renderKeyNews] Iniciando renderizado...");

    // Obtener el contenedor JUSTO AHORA
    const container = DOM.getKeyNewsCardsContainer();

    // Verificar si se encontró el contenedor
    if (!container) {
        console.warn("[renderKeyNews] Contenedor 'key-news-cards-container' NO encontrado al ejecutar renderKeyNews. Omitiendo.");
        return;
    }

    container.innerHTML = '<p class="loading-placeholder">Cargando noticias clave...</p>';

    if (!Array.isArray(state.allArticles) || state.allArticles.length === 0) {
        console.log("[renderKeyNews] No hay artículos disponibles.");
        container.innerHTML = '<p class="placeholder-message">No hay noticias disponibles.</p>';
        return;
    }

    const sortedArticles = [...state.allArticles].sort((a, b) => { /* ... lógica de ordenación ... */ });
    const keyNewsCount = 3;
    const articlesToShow = sortedArticles.slice(0, keyNewsCount);

    if (articlesToShow.length === 0) {
        container.innerHTML = '<p class="placeholder-message">No hay noticias recientes.</p>';
        return;
    }

    console.log(`[renderKeyNews] Renderizando ${articlesToShow.length} noticias clave.`);
    const cardsHTML = articlesToShow.map(createKeyNewsCardHTML).join('');
    container.innerHTML = cardsHTML;

    // Añadir listeners (delegación en el contenedor)
    container.removeEventListener('click', handleKeyNewsCardClick);
    container.removeEventListener('keydown', handleKeyNewsCardKeydown);
    container.addEventListener('click', handleKeyNewsCardClick);
    container.addEventListener('keydown', handleKeyNewsCardKeydown);

    console.log("[renderKeyNews] Renderizado completado y listeners añadidos.");
}

/**
 * Manejador para clics en las tarjetas de noticias clave (usando delegación).
 */
function handleKeyNewsCardClick(event) {
    const card = event.target.closest('.news-card[data-article-ref]');
    if (card) {
        const articleRef = card.dataset.articleRef;
        console.log(`[handleKeyNewsCardClick] Clic en tarjeta ref: ${articleRef}. Navegando a 'news'...`);
        switchView('news');
    }
}

/**
 * Manejador para eventos de teclado en las tarjetas (accesibilidad).
 */
function handleKeyNewsCardKeydown(event) {
     const card = event.target.closest('.news-card[data-article-ref]');
     if (card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        card.click();
     }
}

console.log("[mainView.js] Módulo cargado."); // Log para confirmar carga del módulo