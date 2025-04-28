// js/state.js
// Objeto simple para mantener el estado de la aplicación

export const state = {
    // --- Datos Cargados ---
    allArticles: [],        // Array con todos los artículos del JSON cargado
    graphData: null,        // Para los datos del grafo (si se cargan aquí)
    timeSeriesData: null,   // Para los datos de series temporales (si se cargan aquí)

    // --- Estado de Búsqueda/Filtro de Noticias ---
    searchTerm: '',                   // Término actual en la barra de búsqueda
    selectedDateFilter: 'all',        // Filtro de fecha activo: 'all', 'today', 'week', 'month', 'year', 'custom'
    customStartDate: null,            // Fecha de inicio para rango personalizado (objeto Date o null)
    customEndDate: null,              // Fecha de fin para rango personalizado (objeto Date o null)
    selectedSection: '',              // Sección seleccionada (string vacío para 'todas')
    currentSort: {                    // Ordenación actual de los resultados de búsqueda/noticias
        field: 'date',                // Campo por el que se ordena ('date' o 'relevance' si se implementa)
        ascending: false              // Dirección: false = descendente (recientes primero), true = ascendente
    },
    currentPage: 1,                   // Página actual de resultados mostrada
    resultsPerPage: 10,               // Número de resultados por página
    filteredArticles: [],             // <-- IMPORTANTE: Array con TODOS los artículos que coinciden con los filtros (antes de paginar), inicia vacío
    paginatedResults: [],             // Array con los artículos de la página actual a mostrar (calculado desde filteredArticles)
    // --- Fin Estado de Búsqueda ---

    // Puedes añadir estados para otras vistas si es necesario
    // Ejemplo: estado de los selectores del dashboard, etc.
};

console.log("[state.js] Estado inicial configurado."); // Log para confirmar carga