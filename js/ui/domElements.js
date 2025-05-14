// js/ui/domElements.js - Exporta FUNCIONES para obtener elementos del DOM

console.log("[domElements.js] Módulo cargando...");

// --- Elementos Globales ---
export function getBody() { return document.body; }
export function getPageContent() { return document.getElementById('page-content'); }

// --- Vistas Principales (Contenedores) ---
export function getMainView() { return document.getElementById('main-view'); }
export function getNewsFeedView() { return document.getElementById('news-feed-view'); }
export function getGraphView() { return document.getElementById('graph-view'); }
export function getTimeSeriesView() { return document.getElementById('timeseries-view'); }

// --- Sidebar ---
export function getSidebar() { return document.getElementById('sidebar'); }
export function getOpenSidebarBtn() { return document.getElementById('open-sidebar-btn'); }
export function getCloseSidebarBtn() { return document.getElementById('close-sidebar-btn'); }
export function getNavButtons() { return document.querySelectorAll('.sidebar-nav .nav-button'); }

// --- Elementos Vista Búsqueda Noticias ---
export function getMainSearchInput() { return document.getElementById('main-search-input'); }
export function getMainSearchButton() { return document.getElementById('main-search-button'); }
export function getSearchFiltersSidebar() { return document.getElementById('search-filters-sidebar'); }
export function getDateFilterList() { return document.getElementById('date-filter-list'); }
export function getDateStartInput() { return document.getElementById('date-start'); }
export function getDateEndInput() { return document.getElementById('date-end'); }
export function getApplyDateRangeButton() { return document.getElementById('apply-date-range-button'); }
export function getSectionFilterList() { return document.getElementById('section-filter-list'); }
export function getSearchResultsArea() { return document.getElementById('search-results-area'); }
export function getResultsHeader() { return document.getElementById('results-header'); }
export function getResultsCountSpan() { return document.getElementById('results-count-span'); }
export function getSortOrderSelect() { return document.getElementById('sort-order'); }
export function getSearchResultsContainer() { return document.getElementById('search-results-container'); }
export function getPaginationControls() { return document.getElementById('pagination-controls'); }
// IMPORTANTE: Añadir el getter para el select de políticos si _handleNodeClick lo necesita
export function getNewsPoliticianSelect() { return document.getElementById('politician-select'); } // Asumiendo ID 'politician-select'

// --- Tooltip ---
export function getTooltipPopup() { return document.getElementById('tooltip-popup'); }
export function getTooltipImg() { return document.getElementById('tooltip-img'); }
export function getTooltipDesc() { return document.getElementById('tooltip-desc'); }

// --- Grafo ---
// Getter para el contenedor del grafo con logs de depuración
export function getGraphNetworkContainer() {
    console.log(`--- [DOM Getter] Intentando obtener #mynetwork AHORA (${new Date().toLocaleTimeString()}) ---`);
    const graphViewContainer = document.getElementById('graph-view');
    console.log("--- [DOM Getter] Contenedor padre #graph-view encontrado:", graphViewContainer);
    if (graphViewContainer) {
         // Solo intentar obtener estilos si el padre existe
         try {
            const styles = window.getComputedStyle(graphViewContainer);
            console.log("--- [DOM Getter] Estilos display/visibility de #graph-view:", styles.display, styles.visibility);
         } catch (e) {
             console.warn("--- [DOM Getter] No se pudieron obtener estilos computados para #graph-view", e);
         }
    } else {
         console.warn("--- [DOM Getter] ¡El contenedor #graph-view tampoco se encuentra!");
    }

    const element = document.getElementById('mynetwork');
    console.log("--- [DOM Getter] Resultado getElementById('mynetwork'):", element);
    return element;
}

// --- Series Temporales / Dashboard ---
export function getTsControls() { return document.getElementById('timeseries-controls'); }
export function getPoliticianSelectorsContainer() { return document.getElementById('politician-selectors'); }
export function getChartsContainer() { return document.getElementById('charts-container'); }
export function getChartsPlaceholder() { return document.getElementById('charts-placeholder'); }

// --- Vista Principal (Inicio) ---
export function getKeyNewsCardsContainer() { return document.getElementById('key-news-cards-container'); }
export function getMainViewButtons() { return document.querySelectorAll('#main-view .btn[data-target-view]'); }

console.log("[domElements.js] Módulo cargado - Funciones getter exportadas.");