// js/ui/domElements.js
export const body = document.body;
export const pageContent = document.getElementById('page-content');

// Vistas principales
export const mainView = document.getElementById('main-view');
export const newsFeedView = document.getElementById('news-feed-view');
export const graphView = document.getElementById('graph-view');
export const timeSeriesView = document.getElementById('timeseries-view'); // Aunque sea dashboard

// Sidebar
export const sidebar = document.getElementById('sidebar');
export const openSidebarBtn = document.getElementById('open-sidebar-btn');
export const closeSidebarBtn = document.getElementById('close-sidebar-btn');
export const navButtons = document.querySelectorAll('.sidebar-nav .nav-button');

// --- Controles Vista Noticias (MODIFICADO) ---
export const articlesContainer = document.getElementById('articles-container');
// export const articleSearchInput = document.getElementById('article-search-input'); // <-- ELIMINADO O COMENTADO
// export const articleSearchBtn = document.getElementById('article-search-btn');     // <-- ELIMINADO O COMENTADO
export const articleSelect = document.getElementById('article-select'); // <-- AÑADIDO
export const politicianSelect = document.getElementById('politician-select'); // Ya estaba bien
export const resetFilterBtn = document.getElementById('reset-filter-btn'); // Ya estaba bien
export const sortNewestBtn = document.getElementById('sort-newest-btn');   // Ya estaba bien
export const sortOldestBtn = document.getElementById('sort-oldest-btn');   // Ya estaba bien
// --- Fin Controles Vista Noticias ---

// Tooltip
export const tooltipPopup = document.getElementById('tooltip-popup');
export const tooltipImg = document.getElementById('tooltip-img');
export const tooltipDesc = document.getElementById('tooltip-desc');

// Grafo
export const graphNetworkContainer = document.getElementById('mynetwork');

// Series Temporales / Dashboard
export const tsControls = document.getElementById('timeseries-controls');
export const politicianSelectorsContainer = document.getElementById('politician-selectors');
export const chartsContainer = document.getElementById('charts-container');
export const chartsPlaceholder = document.getElementById('charts-placeholder');

// Vista Principal (Inicio)
export const keyNewsCardsContainer = document.getElementById('key-news-cards-container');
export const mainViewButtons = document.querySelectorAll('#main-view .btn[data-target-view]');

// --- Log de Verificación (Opcional pero útil) ---
// console.log("DOM Elements Selected:", {
//     articleSelect: !!articleSelect, // Debería ser true
//     politicianSelect: !!politicianSelect, // Debería ser true
//     // articleSearchInput: !!articleSearchInput // Debería ser false o undefined si se eliminó
// });