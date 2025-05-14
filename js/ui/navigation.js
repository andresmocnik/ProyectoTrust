// js/ui/navigation.js
import * as DOM from './domElements.js';
import { state } from '../state.js';

// Importar funciones de inicialización/renderizado de CADA vista
import { renderKeyNews } from '../views/mainView.js';
// --- IMPORTAR performSearchAndRender ---
import { performSearchAndRender } from '../views/newsView.js'; // Necesitamos llamarla al entrar
// --- FIN IMPORTACIÓN ---
import { initializeGraph } from '../views/graphView.js';
import { initializeDashboard } from '../views/timeseriesView.js';

let currentView = null;
// Flags solo para vistas inicializadas LAZY aquí
let viewsInitialized = {
    // 'main' y 'news' se manejan diferente ahora
    graph: false,
    timeseries: false
};

// Función auxiliar para cerrar la sidebar
function closeSidebar() {
    const sidebar = DOM.getSidebar(); const body = DOM.getBody();
    if (sidebar && body) {
        sidebar.classList.remove('visible');
        body.classList.remove('sidebar-visible');
        body.classList.remove('sidebar-overlay-active');
    }
}

/**
 * Función principal para cambiar entre vistas.
 */
export function switchView(viewName) {
    console.log(`[switchView] Solicitud para cambiar a: ${viewName}. Vista actual: ${currentView}`);
    const body = DOM.getBody();
    if (!body) { console.error("[switchView] Error crítico: body no encontrado."); return; }

    // Permitir re-ejecutar si se selecciona la misma vista
    const previousView = currentView;
    currentView = viewName;

    // Gestionar clases CSS
    if (previousView && previousView !== viewName) body.classList.remove(`view-${previousView}`);
    if (!body.classList.contains(`view-${viewName}`)) body.classList.add(`view-${viewName}`);
    console.log(`[switchView] Clase del body actualizada a: ${body.className}`);

    // Actualizar botón activo en sidebar
    DOM.getNavButtons().forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-view') === viewName);
    });

    // Ejecutar lógica específica CADA VEZ
    console.log(`[switchView] Ejecutando lógica para vista: ${viewName}`);
    try {
        switch (viewName) {
            case 'main':
                if (typeof renderKeyNews === 'function') renderKeyNews();
                else console.warn("renderKeyNews no disponible.");
                break;
            case 'news':
                console.log("[switchView] Preparando vista de noticias (búsqueda)...");
                // La vista fue inicializada en main.js.
                // Ahora, cada vez que entramos, volvemos a llamar a performSearchAndRender
                // para asegurar que se muestren los resultados correctos con los filtros/orden actual.
                if (typeof performSearchAndRender === 'function') {
                    console.log("[switchView] Llamando a performSearchAndRender...");
                    performSearchAndRender(); // <--- LLAMADA CLAVE
                } else {
                    console.warn("[switchView] La función 'performSearchAndRender' no está disponible.");
                }
                break;
            case 'graph':
                if (!viewsInitialized.graph) {
                    if (typeof initializeGraph === 'function') initializeGraph();
                    else console.warn("initializeGraph no disponible.");
                    viewsInitialized.graph = true;
                } else {
                    console.log("[switchView] Vista del grafo ya inicializada.");
                    // Llama a una función de actualización/ajuste si es necesario al re-entrar
                    // if (typeof window.graphNetworkInstance?.fit === 'function') window.graphNetworkInstance.fit();
                }
                break;
            case 'timeseries':
                if (!viewsInitialized.timeseries) {
                    if (typeof initializeDashboard === 'function') initializeDashboard();
                    else console.warn("initializeDashboard no disponible.");
                    viewsInitialized.timeseries = true;
                } else {
                    console.log("[switchView] Vista del dashboard ya inicializada.");
                    // Llama a una función de actualización si es necesario al re-entrar
                }
                break;
            default:
                console.warn(`[switchView] Lógica no encontrada para: ${viewName}`);
        }
    } catch (error) { console.error(`[switchView] Error en lógica para vista '${viewName}':`, error); }

    closeSidebar();
    console.log(`[switchView] Navegación/Ejecución para '${viewName}' completada.`);
}

/** Obtiene la vista actual. */
export function getCurrentView() { return currentView; }

console.log("[Navigation] Módulo cargado.");