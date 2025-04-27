// js/state.js
// Objeto simple para mantener el estado de la aplicación

export const state = {
    allArticles: [],        // Aquí guardaremos los artículos cargados
    graphData: null,        // Para los datos del grafo
    timeSeriesData: null,   // Para los datos de menciones por fecha
    currentSort: { field: 'date', ascending: false }, // Estado inicial de ordenación noticias
    currentFilter: { type: null, value: null },       // Estado inicial de filtro noticias
    // Puedes añadir más estados aquí (ej. vista activa, aunque ya lo manejamos en navigation)
};