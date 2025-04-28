// js/main.js - Punto de Entrada Principal

import * as DOM from './ui/domElements.js';        // Importa las funciones getter
import { switchView } from './ui/navigation.js';   // Importar función clave
import { state } from './state.js';
import { loadArticles } from './dataLoader.js';
import { initializeSearchView } from './views/newsView.js'; // La única inicialización que llamamos aquí

/**
 * Función Principal Asíncrona para Inicializar la Aplicación
 */
async function initializeApp() {
    console.log("[main.js] Iniciando aplicación...");
    try {
        // --- 1. Carga de Datos Esenciales ---
        console.log("[main.js] Iniciando carga de artículos...");
        try {
            state.allArticles = await loadArticles();
            console.log(`[main.js] Artículos cargados. Número: ${state.allArticles?.length ?? 0}`);
            if (!Array.isArray(state.allArticles) || state.allArticles.length === 0) {
                console.warn("[main.js] No se cargaron artículos o archivo vacío."); state.allArticles = [];
            }
        } catch (loadError) {
            console.error("[main.js] ERROR CRÍTICO al cargar artículos:", loadError);
            state.allArticles = [];
            const pageContent = DOM.getPageContent(); // Obtener contenedor de página
            if (pageContent) {
                pageContent.innerHTML = `<div class="error-container"><h2>Error de Carga</h2><p>No se pudieron cargar los datos necesarios (${loadError.message}). Intente recargar.</p></div>`;
            }
            return;
        }

        // --- 2. Configurar Listeners Globales ---
        console.log("[main.js] Configurando listeners globales...");
        setupGlobalListeners(); // Llamar a la función helper

        // --- 3. Inicializar Vistas Críticas ---
        console.log("[main.js] Inicializando vistas dependientes...");
        try {
            initializeSearchView();
            console.log("[main.js] Vista de búsqueda inicializada.");
        } catch (viewInitError) {
             console.error("[main.js] Error durante la inicialización de la vista de búsqueda:", viewInitError);
             const newsViewContainer = DOM.getNewsFeedView(); // Obtener contenedor específico
             if (newsViewContainer) newsViewContainer.innerHTML = `<p class="error-message">Error al cargar buscador.</p>`;
        }

        // --- 4. Establecer y Mostrar la Vista Inicial ---
        console.log("[main.js] Estableciendo vista inicial...");
        const initialView = determineInitialView();
        console.log(`[main.js] Vista inicial: ${initialView}`);
        // La primera llamada a switchView ejecutará la lógica de esa vista (ej. renderKeyNews)
        switchView(initialView);

        console.log("[main.js] Aplicación inicializada.");

    } catch (error) {
        console.error("[main.js] Error INESPERADO durante la inicialización:", error);
        const body = DOM.getBody(); // Intentar obtener body para mostrar error
        if (body) {
             body.innerHTML = `<div class="error-container"><h2>Error Inesperado</h2><p>Ocurrió un error al iniciar. Por favor, recarga.</p><p><em>${error.message}</em></p></div>`;
        }
    }
} // Fin de initializeApp

/**
 * Configura los event listeners globales (sidebar, botones de navegación).
 */
function setupGlobalListeners() {
    console.log("[setupGlobalListeners] Configurando...");

    // Obtener elementos una vez para añadir listeners
    const openBtn = DOM.getOpenSidebarBtn();
    const closeBtn = DOM.getCloseSidebarBtn();
    const navButtonsNodeList = DOM.getNavButtons();       // Para la sidebar
    const mainViewButtonsNodeList = DOM.getMainViewButtons(); // Para la vista 'main'

    // Log para verificar si se encontraron los botones
    console.log(`[setupGlobalListeners] Botón Abrir Sidebar encontrado: ${!!openBtn}`);
    console.log(`[setupGlobalListeners] Botón Cerrar Sidebar encontrado: ${!!closeBtn}`);
    console.log(`[setupGlobalListeners] Botones de Navegación (Sidebar) encontrados: ${navButtonsNodeList?.length ?? 0}`);
    console.log(`[setupGlobalListeners] Botones de Vista Principal encontrados: ${mainViewButtonsNodeList?.length ?? 0}`);

    // Listener para abrir Sidebar
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            console.log("[Event] Abrir sidebar click"); // Log de evento
            const sidebar = DOM.getSidebar(); const body = DOM.getBody();
            if (sidebar && body) {
                sidebar.classList.add('visible');
                body.classList.add('sidebar-visible');
                body.classList.add('sidebar-overlay-active');
            }
        });
    } else { console.warn("[setupGlobalListeners] Botón Abrir Sidebar no encontrado."); }

    // Listener para cerrar Sidebar (botón X)
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log("[Event] Cerrar sidebar (X) click"); // Log de evento
            closeSidebar(); // Llama a la función helper
        });
    } else { console.warn("[setupGlobalListeners] Botón Cerrar Sidebar no encontrado."); }

    // Listeners para botones de navegación en Sidebar
    if (navButtonsNodeList && navButtonsNodeList.length > 0) { // Verificar que la lista no esté vacía
        navButtonsNodeList.forEach((button, index) => {
            const view = button.getAttribute('data-view');
            if (view) { // Solo añadir listener si tiene data-view
                 console.log(`[setupGlobalListeners] Añadiendo listener a NavButton #${index}, data-view: ${view}`);
                 // Remover listener previo por si acaso esta función se llamara múltiples veces
                 // (Aunque no debería en este flujo)
                 // button.removeEventListener('click', handleNavButtonClick); // Necesitaría función nombrada
                 button.addEventListener('click', () => { // Usar función anónima está bien aquí
                    console.log(`[Event] Clic en NavButton con data-view=${view}`); // Log DENTRO del listener
                    switchView(view); // Llamar a switchView con el valor de data-view
                 });
            } else {
                 console.warn(`[setupGlobalListeners] NavButton #${index} no tiene atributo data-view.`);
            }
        });
    } else {
        console.warn("[setupGlobalListeners] No se encontraron botones de navegación (NodeList vacía o null).");
    }

    // Listeners para botones en la Vista Principal que cambian de vista
    if (mainViewButtonsNodeList && mainViewButtonsNodeList.length > 0) { // Verificar lista
        mainViewButtonsNodeList.forEach((button, index) => {
            const targetView = button.getAttribute('data-target-view');
            if (targetView) { // Solo añadir si tiene data-target-view
                console.log(`[setupGlobalListeners] Añadiendo listener a MainViewButton #${index}, data-target-view: ${targetView}`);
                button.addEventListener('click', () => {
                    console.log(`[Event] Clic en MainViewButton con data-target-view=${targetView}`);
                    switchView(targetView); // Llamar a switchView con el valor de data-target-view
                });
            } else {
                 console.warn(`[setupGlobalListeners] MainViewButton #${index} no tiene atributo data-target-view.`);
            }
        });
     } else {
         console.warn("[setupGlobalListeners] No se encontraron botones en la vista principal (NodeList vacía o null).");
     }

    // Listener para cerrar Sidebar al hacer clic fuera
    document.addEventListener('click', (event) => {
        const sidebar = DOM.getSidebar(); // Obtener sidebar en el momento del clic
        if (!sidebar?.classList.contains('visible')) return; // Solo si está visible

        const openBtn = DOM.getOpenSidebarBtn(); // Obtener botón abrir
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnOpenBtn = openBtn?.contains(event.target);

        if (!isClickInsideSidebar && !isClickOnOpenBtn) {
             console.log("[Event] Cerrar sidebar (click fuera)");
             closeSidebar();
        }
    });

    console.log("[setupGlobalListeners] Configuración de listeners completada.");
}

/**
 * Función auxiliar para cerrar la sidebar.
 */
function closeSidebar() {
    const sidebar = DOM.getSidebar();
    const body = DOM.getBody();
    if (sidebar && body) {
        sidebar.classList.remove('visible');
        body.classList.remove('sidebar-visible');
        body.classList.remove('sidebar-overlay-active');
    }
}

/**
 * Determina la vista inicial a mostrar.
 */
function determineInitialView() {
    const body = DOM.getBody();
    if (!body) {
        console.warn("[determineInitialView] No se pudo obtener <body>. Usando 'main'.");
        return 'main';
    }
    const viewClass = Array.from(body.classList).find(cls => cls.startsWith('view-'));
    return viewClass ? viewClass.substring(5) : 'main';
}

// --- Ejecutar Inicialización Principal ---
if (document.readyState === 'loading') {
    console.log("[main.js] DOM no listo, añadiendo listener DOMContentLoaded.");
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log("[main.js] DOM listo, ejecutando initializeApp directamente.");
    initializeApp();
}

console.log("Modulo main.js ejecutado.");