// js/main.js - Punto de Entrada Principal

import * as DOM from './ui/domElements.js';
import { switchView } from './ui/navigation.js';
import { state } from './state.js'; // Importar el objeto state
import { loadArticles } from './dataLoader.js'; // Importar el cargador de artículos
import { initializeNewsView } from './views/newsView.js';


// --- Función de Inicialización Principal ---
async function initializeApp() { // Convertimos initializeApp en async
    console.log("Inicializando aplicación...");

    // --- Carga de Datos Esenciales ---
    // Usamos await para asegurar que los artículos se carguen antes de continuar
    state.allArticles = await loadArticles();

    // Si la carga falló o no hay artículos, podríamos mostrar un mensaje y detener
    if (state.allArticles.length === 0) {
        console.warn("No se cargaron artículos. La funcionalidad puede ser limitada.");
        // Opcional: Mostrar mensaje en la UI
        if(DOM.pageContent) {
            // DOM.pageContent.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Error crítico: No se pudieron cargar las noticias.</p>';
            // return; // Detener inicialización si es crítico
        }
    }

    // --- Configurar listeners básicos --- (El código de listeners va aquí, sin cambios)
    DOM.openSidebarBtn?.addEventListener('click', () => {
        if (DOM.sidebar && DOM.body) {
            DOM.sidebar.classList.add('visible');
            DOM.body.classList.add('sidebar-visible');
            DOM.body.classList.add('sidebar-overlay-active');
        }
        console.log("Abrir sidebar click");
    });

    DOM.closeSidebarBtn?.addEventListener('click', () => {
        if (DOM.sidebar && DOM.body) {
            DOM.sidebar.classList.remove('visible');
            DOM.body.classList.remove('sidebar-visible');
            DOM.body.classList.remove('sidebar-overlay-active');
        }
        console.log("Cerrar sidebar click");
    });

    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');
            if (view) {
                switchView(view);
            }
        });
    });

    DOM.mainViewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-target-view');
            if(targetView) {
                switchView(targetView);
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (!DOM.sidebar?.classList.contains('visible')) return;
        const isClickInsideSidebar = DOM.sidebar.contains(event.target);
        const isClickOnOpenBtn = DOM.openSidebarBtn?.contains(event.target);
        if (!isClickInsideSidebar && !isClickOnOpenBtn) {
             if (DOM.sidebar && DOM.body) {
                 DOM.sidebar.classList.remove('visible');
                 DOM.body.classList.remove('sidebar-visible');
                 DOM.body.classList.remove('sidebar-overlay-active');
             }
            console.log("Cerrar sidebar por clic fuera");
        }
    });

    // --- Inicializar Componentes/Vistas que dependen de datos ---
    // Ahora que los datos están en state.allArticles, podemos llamar a funciones
    // que los necesiten. renderKeyNews es llamada por switchView, pero podríamos
    // querer poblar filtros o hacer otros cálculos iniciales aquí.

    // Ejemplo: Poblar el filtro de políticos (moveremos esta lógica a newsView.js luego)
    // populatePoliticianFilter(state.allArticles); // Necesitaríamos crear esta función


    // --- Inicializar Componentes/Vistas que dependen de datos ---
    initializeNewsView();

    // --- Establecer la vista inicial ---
    const initialView = DOM.body.className.split(' ').find(cls => cls.startsWith('view-'))?.replace('view-', '') || 'main';
    console.log(`Intentando cambiar a vista inicial: ${initialView}`);
    console.log('DOM.body existe:', !!DOM.body);
    switchView(initialView); // Llama a switchView, que a su vez llamará a renderKeyNews

    console.log("Aplicación inicializada.");
}

// --- Ejecutar Inicialización ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log("Modulo main.js ejecutado.");