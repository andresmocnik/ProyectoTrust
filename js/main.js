// js/main.js - Punto de Entrada Principal

import * as DOM from './ui/domElements.js';        // Referencias a elementos HTML
import { switchView } from './ui/navigation.js';    // Función para cambiar vistas
import { state } from './state.js';                 // Objeto de estado compartido
import { loadArticles, loadGraphData, loadPoliticiansDB } from './dataLoader.js'; // Funciones para cargar JSONs
import { initializeNewsView } from './views/newsView.js'; // Función de inicialización para la vista de noticias
// Importar inicializadores de otras vistas si es necesario más adelante
// import { initializeGraph } from './views/graphView.js';
// import { initializeDashboard } from './views/timeseriesView.js';

// --- Función de Inicialización Principal ---
async function initializeApp() {
    console.log("[initializeApp] Inicializando aplicación...");

    // --- Carga de Datos Esenciales en Paralelo ---
    console.log("[initializeApp] Iniciando carga de datos (artículos y DB políticos)...");
    try {
        // Promise.all para ejecutar ambas cargas de forma concurrente
        const [articlesData, politiciansData, graphJsonData] = await Promise.all([
             loadArticles(),      // Carga noticias_procesadas.json
             loadPoliticiansDB(), // Carga politicians_db.json
             loadGraphData()
        ]);

        // Guardar artículos en el estado (asegurando que sea un array)
        state.allArticles = Array.isArray(articlesData) ? articlesData : [];
        console.log(`[initializeApp] ${state.allArticles.length} artículos procesados y guardados en state.`);

        // Procesar y guardar políticos como un Mapa/Objeto para búsqueda rápida por nombre
        state.politiciansDB = {}; // Limpiar/inicializar el objeto en el estado
        if (Array.isArray(politiciansData)) {
            politiciansData.forEach(p => {
                // Validar que el objeto y la propiedad 'name' existen antes de añadir
                if (p && typeof p.name === 'string' && p.name.trim() !== '') {
                    state.politiciansDB[p.name.trim()] = p; // Usar nombre como clave (trim para evitar espacios)
                } else {
                    console.warn("[initializeApp] Se encontró un objeto de político inválido o sin nombre en politicians_db.json:", p);
                }
            });
        }
        console.log(`[initializeApp] ${Object.keys(state.politiciansDB).length} políticos procesados y guardados en state.politiciansDB.`);

        state.graphData = graphJsonData; // Guardar datos del grafo 

        // Verificar si la carga de datos esenciales fue exitosa
        if (state.allArticles.length === 0) {
            console.error("[initializeApp] ¡Advertencia! No se cargaron artículos. La funcionalidad principal estará limitada.");
            // Considera mostrar un mensaje más prominente al usuario aquí
        }
        if (Object.keys(state.politiciansDB).length === 0) {
             console.warn("[initializeApp] No se cargó la DB de políticos. Los tooltips no tendrán datos locales.");
             // El fallback (o mensaje de no encontrado) en tooltip.js se encargará
        }

    } catch (error) {
        console.error("[initializeApp] Error CRÍTICO durante la carga de datos inicial:", error);
        // Mostrar un error fatal al usuario, ya que la app no puede funcionar sin datos base
        if(DOM.pageContent) {
             DOM.pageContent.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: 50px; font-size: 1.2em;">Error fatal al cargar los datos necesarios. Por favor, intente recargar la página o contacte al administrador.</p>';
        }
        // Detener completamente la inicialización si falla la carga de datos
        return;
    }

    // --- Configurar Listeners Básicos de UI ---
    console.log("[initializeApp] Configurando listeners de UI básicos...");

    // Listener para abrir sidebar
    DOM.openSidebarBtn?.addEventListener('click', () => {
        if (DOM.sidebar && DOM.body) {
            DOM.sidebar.classList.add('visible');
            DOM.body.classList.add('sidebar-visible');
            // Activar overlay solo en móvil (requiere CSS adicional o JS para detectar tamaño)
            // DOM.body.classList.add('sidebar-overlay-active');
        }
        // console.log("Abrir sidebar click"); // Log opcional
    });

    // Listener para cerrar sidebar
    DOM.closeSidebarBtn?.addEventListener('click', () => {
        if (DOM.sidebar && DOM.body) {
            DOM.sidebar.classList.remove('visible');
            DOM.body.classList.remove('sidebar-visible');
            // DOM.body.classList.remove('sidebar-overlay-active');
        }
        // console.log("Cerrar sidebar click"); // Log opcional
    });

    // Listener para botones de navegación en la sidebar
    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');
            if (view) {
                switchView(view); // Llama a la función importada de navigation.js
            }
        });
    });

     // Listener para botones en la vista principal ('Inicio') que navegan a otras vistas
     DOM.mainViewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-target-view');
            if(targetView) {
                switchView(targetView);
            }
        });
    });

    // Listener para cerrar sidebar al hacer clic fuera
    document.addEventListener('click', (event) => {
        // Solo actuar si la sidebar está visible
        if (!DOM.sidebar?.classList.contains('visible')) return;

        const isClickInsideSidebar = DOM.sidebar.contains(event.target);
        const isClickOnOpenBtn = DOM.openSidebarBtn?.contains(event.target);
        const isClickInsideTooltip = DOM.tooltipPopup?.contains(event.target); // Evitar cierre al clicar tooltip (aunque tiene pointer-events: none)

        // Si el clic NO fue dentro de la sidebar Y NO fue en el botón de abrir Y NO fue en el tooltip
        if (!isClickInsideSidebar && !isClickOnOpenBtn && !isClickInsideTooltip) {
             if (DOM.sidebar && DOM.body) {
                 DOM.sidebar.classList.remove('visible');
                 DOM.body.classList.remove('sidebar-visible');
                 // DOM.body.classList.remove('sidebar-overlay-active');
             }
            // console.log("Cerrar sidebar por clic fuera"); // Log opcional
        }
    });

    console.log("[initializeApp] Listeners de UI configurados.");

    // --- Inicializar Vistas/Componentes que dependen de datos ---
    // Ahora que state.allArticles y state.politiciansDB están (potencialmente) poblados
    console.log("[initializeApp] Inicializando vistas...");
    initializeNewsView(); // Configura listeners de búsqueda/filtro/orden y puebla el select

    // Si tuvieras tooltips en otras partes de la página además de los artículos,
    // podrías inicializarlos aquí apuntando a un contenedor más general:
    // import { setupTooltipListeners } from './ui/tooltip.js';
    // setupTooltipListeners(DOM.pageContent); // Ejemplo

    console.log("[initializeApp] Vistas inicializadas.");

    // --- Establecer la Vista Inicial ---
    // Determinar la vista inicial a partir de la clase del body o usar 'main' por defecto
    const initialView = DOM.body.className.split(' ').find(cls => cls.startsWith('view-'))?.replace('view-', '') || 'main';
    console.log(`[initializeApp] Estableciendo vista inicial: ${initialView}`);
    // switchView se encarga de añadir la clase correcta al body y llamar a la lógica
    // de renderizado inicial de la vista correspondiente (ej. renderKeyNews para 'main')
    switchView(initialView);

    console.log("[initializeApp] Aplicación inicializada correctamente y lista.");
}

// --- Ejecutar Inicialización cuando el DOM esté listo ---
// Asegura que el HTML esté completamente parseado antes de ejecutar initializeApp
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp(); // El DOM ya está listo
}

console.log("Modulo main.js ejecutado."); // Mensaje final de carga del script