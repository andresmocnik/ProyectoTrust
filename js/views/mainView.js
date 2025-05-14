// js/views/mainView.js
import * as DOM from '../ui/domElements.js'; // Necesitamos el contenedor
import { state } from '../state.js'; // Necesitamos los artículos
import { switchView } from '../ui/navigation.js'; // Para el botón "Ver Todas" implícito en la tarjeta

// Función para crear el HTML de una tarjeta de noticia
function createNewsCardHTML(article) {
    // Extraer datos del artículo, con valores por defecto
    const title = article.titulo || 'Sin Título';
    const source = article.fuente || 'Fuente desconocida'; // Asume que tienes 'fuente' en tus datos
    const date = article.fecha_hora || ''; // Formatear fecha si es necesario
    const summary = article.subtitulo || article.cuerpo?.substring(0, 100) + '...' || 'No hay resumen disponible.'; // Tomar subtitulo o inicio del cuerpo
    const politicians = article.personas_detectadas_normalizadas || [];
    // Limitar el número de tags de políticos a mostrar (ej. 3)
    const displayedPoliticians = politicians.slice(0, 3);
    const extraPoliticiansCount = politicians.length - displayedPoliticians.length;

    // Generar HTML para los tags de políticos
    let tagsHTML = displayedPoliticians.map(p => `<span class="tag">${p}</span>`).join('');
    if (extraPoliticiansCount > 0) {
        tagsHTML += ` <span class="tag tag-more">+${extraPoliticiansCount}</span>`; // Tag para indicar más
    }
    if (tagsHTML === '') {
        tagsHTML = '<span class="tag tag-none">Sin figuras detectadas</span>'; // Mensaje si no hay políticos
    }

    // Devolver el HTML completo de la tarjeta
    // Añadimos un data-article-id para identificar la noticia si hacemos clic
    // Hacemos que toda la tarjeta sea clickeable hacia la vista de noticias
    return `
        <article class="news-card" data-article-id="${article.id || ''}" role="link" tabindex="0">
            <h3>${title}</h3>
            <div class="meta">${source} - ${date}</div>
            <p class="summary">${summary}</p>
            <div class="tags">
                ${tagsHTML}
            </div>
        </article>
    `;
}

// Función principal para renderizar las noticias clave
export function renderKeyNews() {
    console.log("[renderKeyNews] Iniciando..."); 
    console.log("[renderKeyNews] DOM.keyNewsCardsContainer:", DOM.keyNewsCardsContainer);
    console.log("Renderizando Noticias Clave...");
    if (!DOM.keyNewsCardsContainer) {
        console.error("Error: Contenedor de tarjetas de noticias clave no encontrado.");
        return;
    }

    const container = DOM.keyNewsCardsContainer;
    container.innerHTML = '<p class="loading-placeholder">Cargando noticias clave...</p>'; // Mostrar carga

    if (!state.allArticles || state.allArticles.length === 0) {
        console.warn("No hay artículos disponibles en el estado para mostrar.");
        container.innerHTML = '<p class="loading-placeholder">No hay noticias disponibles.</p>';
        return;
    }

    // Ordenar artículos por fecha (más recientes primero) - Asume que parseDateString existe
    // Necesitaremos mover parseDateString a utils.js
    // Por ahora, asumimos que ya están más o menos ordenados o tomamos los primeros N
    // const sortedArticles = [...state.allArticles].sort((a, b) => /* lógica de ordenación por fecha descendente */);

    // Tomar las primeras 3 noticias (o las que haya si son menos)
    const articlesToDisplay = state.allArticles.slice(0, 3);

    if (articlesToDisplay.length === 0) {
        container.innerHTML = '<p class="loading-placeholder">No hay noticias recientes para mostrar.</p>';
        return;
    }

    // Generar el HTML para cada tarjeta y unirlas
    const cardsHTML = articlesToDisplay.map(createNewsCardHTML).join('');

    // Insertar el HTML en el contenedor
    container.innerHTML = cardsHTML;

    // Añadir event listeners a las tarjetas creadas (delegación)
    container.addEventListener('click', (event) => {
        const card = event.target.closest('.news-card');
        if (card) {
            const articleId = card.dataset.articleId;
            console.log(`Clic en tarjeta de noticia ID: ${articleId}. Navegando a 'news'...`);
            // Aquí podríamos querer filtrar la vista de noticias para mostrar ESTE artículo
            // o simplemente navegar a la vista general de noticias.
            switchView('news');
            // TODO: Scroll o highlight al artículo específico en la vista 'news' si se desea.
        }
    });
     // Hacer las tarjetas accesibles con teclado
     container.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // Evitar scroll con espacio
                card.click(); // Simular clic
            }
        });
    });


    console.log("Noticias Clave renderizadas.");
}