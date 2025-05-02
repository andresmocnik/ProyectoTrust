// js/ui/tooltip.js - Lógica para el tooltip de información

import * as DOM from './domElements.js'; // Referencias a elementos del tooltip
import { state } from '../state.js';     // Acceso a la DB de políticos cargada

let tooltipTimeout = null; // Timer para el delay al mostrar

// --- Funciones Helper del Tooltip ---

/**
 * Posiciona el tooltip de forma inteligente cerca del elemento que lo activó.
 * @param {HTMLElement} targetElement - El span .person-tooltip sobre el que se hizo hover.
 */
function positionTooltip(targetElement) {
    // console.log("[positionTooltip] Intentando posicionar."); // Log opcional
    if (!DOM.tooltipPopup || !targetElement) {
        console.error("[positionTooltip] Error: Falta popup o targetElement.");
        return;
    }

    const rect = targetElement.getBoundingClientRect(); // Posición del span relativo al viewport
    const popup = DOM.tooltipPopup;
    const scrollX = window.scrollX || window.pageXOffset; // Scroll horizontal actual
    const scrollY = window.scrollY || window.pageYOffset; // Scroll vertical actual

    // Posición inicial propuesta: Abajo y a la derecha del span
    let top = rect.bottom + scrollY + 8; // 8px de margen inferior
    let left = rect.left + scrollX + 5; // 5px de margen derecho

    // --- Forzar cálculo de dimensiones ---
    // Hacemos el popup invisible pero parte del layout para medirlo
    const originalDisplay = popup.style.display;
    popup.style.visibility = 'hidden';
    popup.style.display = 'block';
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;
    // Restaurar display original antes de calcular posiciones finales
    popup.style.display = originalDisplay; // Volver a como estaba (probablemente 'none')
    popup.style.visibility = 'visible';
    // --- Fin cálculo dimensiones ---

    if (popupWidth === 0 || popupHeight === 0) {
        console.warn("[positionTooltip] El popup tiene dimensiones 0. Ver CSS o contenido.");
    }

    // --- Ajustar posición para que quepa en pantalla ---
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // Margen de seguridad con los bordes

    // Ajustar si se sale por la derecha
    if (left + popupWidth > viewportWidth + scrollX - margin) {
        left = viewportWidth + scrollX - popupWidth - margin;
    }
    // Ajustar si se sale por abajo
    if (top + popupHeight > viewportHeight + scrollY - margin) {
        // Intentar ponerlo arriba del span
        top = rect.top + scrollY - popupHeight - 8; // 8px de margen superior
    }
    // Ajustar si se sale por la izquierda
    if (left < scrollX + margin) {
        left = scrollX + margin;
    }
    // Ajustar si se sale por arriba (si lo movimos arriba)
     if (top < scrollY + margin) {
        top = scrollY + margin;
    }

    // Aplicar posición final asegurando que no sea negativa
    popup.style.left = `${Math.max(0, left)}px`;
    popup.style.top = `${Math.max(0, top)}px`;
    // console.log(`[positionTooltip] Posición final - Top: ${top}px, Left: ${left}px`); // Log opcional
}


/**
 * Muestra el tooltip, buscando primero en la DB local y luego (opcional) en Wikipedia.
 * @param {HTMLElement} targetSpan - El span .person-tooltip que activó el evento.
 */
async function showTooltip(targetSpan) {
    console.log("[showTooltip] Iniciando. targetSpan:", targetSpan);

    // Verificar elementos esenciales del DOM
    if (!DOM.tooltipPopup || !DOM.tooltipImg || !DOM.tooltipDesc) {
        console.error("[showTooltip] ERROR CRÍTICO: Elementos del DOM para tooltip (popup, img, desc) no encontrados.");
        return;
    }
    console.log("[showTooltip] DOM Elements (Popup, Img, Desc):", DOM.tooltipPopup, DOM.tooltipImg, DOM.tooltipDesc);

    // Obtener la clave (nombre del político)
    const personKey = targetSpan.getAttribute('data-person-key');
    console.log(`[showTooltip] personKey obtenido: "${personKey}"`);
    if (!personKey) {
         console.warn("[showTooltip] No se encontró 'data-person-key'.");
         hideTooltip(); // Ocultar si no hay clave
         return;
    }

    console.log("[showTooltip] Referencias OK. Posicionando y mostrando 'Cargando...'");
    positionTooltip(targetSpan); // Posicionar antes de mostrar
    DOM.tooltipPopup.style.display = 'block'; // Hacer visible el contenedor

    // Resetear contenido a estado "cargando"
    DOM.tooltipImg.style.display = 'none';
    DOM.tooltipImg.src = '';
    DOM.tooltipImg.alt = 'Cargando...';
    DOM.tooltipDesc.textContent = 'Buscando información...';

    // --- Lógica Principal: DB Local -> Wikipedia ---

    // 1. Buscar en la DB local (state.politiciansDB)
    console.log(`[showTooltip] Buscando "${personKey}" en state.politiciansDB...`);
    const dbData = state.politiciansDB[personKey];

    if (dbData) { // ¡Encontrado en la DB local!
        console.log("[showTooltip] Datos encontrados en DB local.");
        DOM.tooltipDesc.textContent = dbData.description || 'Descripción no disponible.';
        if (dbData.img) {
            DOM.tooltipImg.src = dbData.img;
            DOM.tooltipImg.alt = dbData.name || personKey;
            DOM.tooltipImg.style.display = 'block';
            console.log("[showTooltip] Imagen de DB local aplicada.");
        } else {
            console.log("[showTooltip] No hay imagen en DB local.");
             DOM.tooltipImg.style.display = 'none'; // Asegurar que esté oculta
        }
        // Re-posicionar por si el contenido cambió el tamaño del tooltip
        positionTooltip(targetSpan);
        console.log("[showTooltip] Finalizado con datos de DB local.");
        return; // Terminar aquí, no buscar en Wikipedia
    }

    // 2. Si NO se encontró en la DB local, intentar Fallback a Wikipedia
    console.log(`[showTooltip] "${personKey}" no encontrado en DB local. Intentando fallback a Wikipedia...`);
    try {
        const wikiApiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&titles=${encodeURIComponent(personKey)}&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=100&redirects=1`;
        console.log("[showTooltip] Fetching Wikipedia:", wikiApiUrl);
        DOM.tooltipDesc.textContent = 'Buscando en fuentes externas...'; // Mensaje durante la búsqueda externa

        const response = await fetch(wikiApiUrl);
        console.log("[showTooltip] Respuesta fetch Wikipedia, status:", response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const wikiData = await response.json();
        // console.log("[showTooltip] Datos JSON de Wikipedia:", wikiData); // Log opcional detallado

        const pages = wikiData.query?.pages;
        const pageId = pages ? Object.keys(pages)[0] : null;

        if (pageId && pageId !== "-1" && pages[pageId] && !pages[pageId].missing) { // Verificar que no sea 'missing'
            const page = pages[pageId];
            console.log("[showTooltip] Página de Wikipedia encontrada:", page);
            const description = page.extract;
            const imageUrl = page.thumbnail?.source;

            DOM.tooltipDesc.textContent = description
                ? `${description.substring(0, 250)}${description.length > 250 ? '...' : ''}` // Limitar longitud
                : 'Información no encontrada en Wikipedia.';

            if (imageUrl) {
                DOM.tooltipImg.src = imageUrl;
                DOM.tooltipImg.alt = page.title || personKey;
                DOM.tooltipImg.style.display = 'block';
                console.log("[showTooltip] Imagen de Wikipedia aplicada.");
            } else {
                 DOM.tooltipImg.style.display = 'none';
                 console.log("[showTooltip] No se encontró imagen thumbnail en Wikipedia.");
            }
        } else {
            console.log("[showTooltip] No se encontró página válida/existente en Wikipedia.");
            DOM.tooltipDesc.textContent = 'Información externa no disponible.'; // Mensaje más genérico
            DOM.tooltipImg.style.display = 'none';
        }
        // Re-posicionar después de cargar datos de Wiki
        positionTooltip(targetSpan);
        console.log("[showTooltip] Finalizado con datos de Wikipedia (o no encontrados).");

    } catch (error) {
        console.error(`[showTooltip] Error en fallback a Wikipedia para "${personKey}":`, error);
        DOM.tooltipDesc.textContent = 'Error al buscar información externa.';
        DOM.tooltipImg.style.display = 'none';
        positionTooltip(targetSpan); // Re-posicionar con el mensaje de error
        console.log("[showTooltip] Finalizado con error en fetch Wikipedia.");
    }
} // Fin de showTooltip


/**
 * Oculta el tooltip limpiando el timeout y estableciendo display: none.
 */
function hideTooltip() {
    clearTimeout(tooltipTimeout);
    if (DOM.tooltipPopup) {
        // console.log("[hideTooltip] Ocultando tooltip."); // Log opcional
        DOM.tooltipPopup.style.display = 'none';
    }
}


/**
 * Configura los event listeners necesarios para mostrar/ocultar el tooltip
 * en un contenedor dado (usando delegación de eventos).
 * @param {HTMLElement} containerElement - El elemento contenedor (ej. #articles-container).
 */
export function setupTooltipListeners(containerElement) {
    if (!containerElement) {
        console.warn("setupTooltipListeners: No se proporcionó un contenedor válido.");
        return;
    }
    console.log(`[setupTooltipListeners] Configurando listeners en:`, containerElement);

    // Listener para cuando el mouse ENTRA en un elemento hijo del contenedor
    containerElement.addEventListener('mouseover', (event) => {
        // Buscar el span .person-tooltip más cercano al elemento donde ocurrió el evento
        const targetSpan = event.target.closest('.person-tooltip');
        // console.log('[Tooltip Listener] mouseover detectado en:', event.target); // Log opcional
        if (!targetSpan) return; // Si no estamos sobre un span de persona, no hacer nada
        // console.log('[Tooltip Listener] targetSpan encontrado:', targetSpan); // Log opcional

        // Si ya hay un timeout pendiente para mostrar el tooltip, cancelarlo
        clearTimeout(tooltipTimeout);
        // Iniciar un nuevo timeout: llamar a showTooltip después de 300ms
        tooltipTimeout = setTimeout(() => {
            console.log('[Tooltip Listener] Timeout ejecutado, llamando showTooltip');
            showTooltip(targetSpan);
        }, 300); // Delay de 300ms
    });

    // Listener para cuando el mouse SALE de un elemento hijo del contenedor
    containerElement.addEventListener('mouseout', (event) => {
        // Buscar si el mouse estaba sobre un span .person-tooltip
        const targetSpan = event.target.closest('.person-tooltip');
        // console.log('[Tooltip Listener] mouseout detectado en:', event.target); // Log opcional
        if (targetSpan) {
             // Si salimos del span, cancelar cualquier timeout pendiente para MOSTRAR el tooltip
             // console.log('[Tooltip Listener] Limpiando timeout por mouseout'); // Log opcional
             clearTimeout(tooltipTimeout);
             // NOTA: No llamamos a hideTooltip() inmediatamente aquí.
             // Esto permite al usuario mover el cursor desde el span HACIA el tooltip
             // si quisiera interactuar con él (aunque ahora mismo no sea interactivo).
             // El tooltip se ocultará con los listeners de click y scroll.
        }
    });

    // --- Listeners Globales para OCULTAR el tooltip ---
    // Usar 'capture: true' para detectar estos eventos antes que otros posibles
    // listeners que pudieran detener la propagación (event.stopPropagation()).

    // Ocultar si hacemos clic en cualquier lugar del documento
    document.addEventListener('click', hideTooltip, true);

    // Ocultar si hacemos scroll en la ventana
    window.addEventListener('scroll', hideTooltip, true);
}