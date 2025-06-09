// js/views/mainView.js

import * as DOM from '../ui/domElements.js';
import { state } from '../state.js';
import { switchView } from '../ui/navigation.js'; // Para el botón "Ver Todas" implícito en la tarjeta

// Función para crear el HTML de una tarjeta de noticia
function createNewsCardHTML(article) {
    // Extraer datos del artículo, con valores por defecto
    const title = article.titulo || 'Sin Título';
    const source = article.fuente || 'Fuente desconocida';
    const date = article.fecha_hora || '';
    const summary = article.subtitulo || article.cuerpo?.substring(0, 100) + '...' || 'No hay resumen disponible.';
    const politicians = article.personas_detectadas_normalizadas || [];
    const imageUrl = article.link_img || null; // <--- OBTENER URL DE LA IMAGEN

    const displayedPoliticians = politicians.slice(0, 3);
    const extraPoliticiansCount = politicians.length - displayedPoliticians.length;

    let tagsHTML = displayedPoliticians.map(p => `<span class="tag">${p}</span>`).join('');
    if (extraPoliticiansCount > 0) {
        tagsHTML += ` <span class="tag tag-more">+${extraPoliticiansCount}</span>`;
    }
    if (tagsHTML === '') {
        tagsHTML = '<span class="tag tag-none">Sin figuras detectadas</span>';
    }

    // --- AÑADIR HTML PARA LA IMAGEN ---
    let imageHTML = '';
    if (imageUrl) {
        // Usaremos un contenedor para la imagen para mejor control con CSS si es necesario
        imageHTML = `
            <div class="news-card-image-container">
                <img src="${imageUrl}" alt="${title}" class="news-card-image">
            </div>
        `;
    }
    // --- FIN HTML IMAGEN ---

    return `
        <article class="news-card" data-article-id="${article.id || ''}" role="link" tabindex="0">
            ${imageHTML} 
                <h3>${title}</h3>
                <div class="meta">${source} - ${date}</div>
                <p class="summary">${summary}</p>
                <div class="tags">
                    ${tagsHTML}
                </div>
            </div>
        </article>
    `;
}

// Función principal para renderizar las noticias clave (sin cambios en esta función, solo en createNewsCardHTML)
export function renderKeyNews() {
    console.log("[renderKeyNews] Iniciando...");
    console.log("[renderKeyNews] DOM.keyNewsCardsContainer:", DOM.keyNewsCardsContainer);
    console.log("Renderizando Noticias Clave...");
    if (!DOM.keyNewsCardsContainer) {
        console.error("Error: Contenedor de tarjetas de noticias clave no encontrado.");
        return;
    }

    const container = DOM.keyNewsCardsContainer;
    container.innerHTML = '<p class="loading-placeholder">Cargando noticias clave...</p>';

    if (!state.allArticles || state.allArticles.length === 0) {
        console.warn("No hay artículos disponibles en el estado para mostrar.");
        container.innerHTML = '<p class="loading-placeholder">No hay noticias disponibles.</p>';
        return;
    }

    // Tomar las primeras 3 noticias
    const articlesToDisplay = state.allArticles.slice(0, 3);

    if (articlesToDisplay.length === 0) {
        container.innerHTML = '<p class="loading-placeholder">No hay noticias recientes para mostrar.</p>';
        return;
    }

    const cardsHTML = articlesToDisplay.map(createNewsCardHTML).join('');
    container.innerHTML = cardsHTML;

    container.addEventListener('click', (event) => {
        const card = event.target.closest('.news-card');
        if (card) {
            const articleId = card.dataset.articleId;
            console.log(`Clic en tarjeta de noticia ID: ${articleId}. Navegando a 'news'...`);
            switchView('news');
            // TODO: Scroll o highlight al artículo específico en la vista 'news'
        }
    });
     container.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });
    });
    console.log("Noticias Clave renderizadas.");
}