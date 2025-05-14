// js/ui/navigation.js
import * as DOM from './domElements.js'; // Importamos todas las referencias del DOM

// Importamos funciones de inicialización de vistas (aunque aún no existan o estén vacías)
// Las necesitaremos aquí para inicializar la vista cuando se cambia a ella.
import { state } from '../state.js'; // Importamos el estado global
import { initializeGraph } from '../views/graphView.js';
import { initializeDashboard } from '../views/timeseriesView.js'; // Cambiamos nombre mentalmente
import { renderKeyNews } from '../views/mainView.js';
import { renderNewsList } from '../views/newsView.js';
import { sortArticlesByDate } from '../views/newsView.js';

let currentView = ''; // Variable para guardar el estado de la vista actual
let dashboardInitialized = false; // Para el dashboard

// Función para cerrar la sidebar (la necesitamos aquí también)
function closeSidebar() {
    if (DOM.sidebar && DOM.body) {
        DOM.sidebar.classList.remove('visible');
        DOM.body.classList.remove('sidebar-visible');
        DOM.body.classList.remove('sidebar-overlay-active'); // Quitamos overlay si existe
    }
}

export function switchView(viewName) {
    console.log(`[switchView] Iniciando para: ${viewName}`);
    console.log(`[switchView] currentView (antes):`, currentView);


    if (!DOM.body || currentView === viewName) {
         // Si ya estamos en la vista, al menos cerramos la sidebar si está abierta
         if (DOM.sidebar?.classList.contains('visible')) {
            closeSidebar();
         }
         
    }
    
    currentView = viewName;

    // Elimina clases de vista anteriores y añade la nueva
    DOM.body.classList.remove('view-main', 'view-news', 'view-graph', 'view-timeseries');
    DOM.body.classList.add(`view-${viewName}`);

    console.log(`[switchView] DOM.body.className (después):`, DOM.body.className); 

    // Actualiza el botón activo en la sidebar
    DOM.navButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-view') === viewName);
    });

    console.log(`[switchView] Ejecutando lógica para vista: ${viewName}`); // LOG VISTA ACTIVA
    // Lógica específica al entrar en una vista (inicializaciones lazy)
    if (viewName === 'graph') {
        console.log("[switchView] Inicializando vista del grafo...");
        initializeGraph(); // Llama a la función para cargar/dibujar el grafo
    } else if (viewName === 'timeseries' ) {
        // Aquí iría la inicialización del Dashboard (cargar datos si es necesario, etc.)
        // Por ahora, podemos llamar a una función placeholder
        console.log("[switchView] Inicializando vista del dashboard...");
        initializeDashboard();
        dashboardInitialized = true;
    } else if (viewName === 'main') {
        // Podríamos querer refrescar las noticias clave cada vez que volvemos al inicio
        renderKeyNews();
    } else if (viewName === 'news') {
        // Llama a la función para renderizar la lista COMPLETA de noticias
        // Usará los artículos del state y aplicará filtros/orden actual si existen
        console.log("[switchView] Llamando a sortArticlesByDate para actualizar la vista de noticias...");
        // Idealmente, renderNewsList debería usar el estado de filtro/orden guardado
        // O podemos pasarle los artículos completos y que ella aplique
        sortArticlesByDate(state.currentSort.ascending); // Re-aplica orden y filtro actual
        // renderNewsList(); // Llamar a la función de renderizado principal de newsView
   }


    closeSidebar(); // Cerramos la sidebar después de cambiar de vista

     // Opcional: Scroll al inicio de la página
     //window.scrollTo({ top: 0, behavior: 'smooth' });
     console.log(`[switchView] Navegación completada a: ${viewName}`)
}

export function getCurrentView() {
    return currentView;
}

// Inicializamos la variable currentView basada en la clase inicial del body
// Esto es un fallback por si la inicialización directa falla
if (DOM.body.classList.contains('view-main')) currentView = 'main';
else if (DOM.body.classList.contains('view-news')) currentView = 'news';
// ... etc para otras vistas si fueran default alguna vez