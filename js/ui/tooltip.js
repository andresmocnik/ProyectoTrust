// js/ui/tooltip.js - Lógica para el tooltip de información

import * as DOM from './domElements.js';

// Datos manuales (pueden venir de config.js o state.js si crecen mucho)
const personData = {
    "Juan Schiaretti": {
        name: "Juan Schiaretti",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Juan_Schiaretti_%28cropped%29.jpg/440px-Juan_Schiaretti_%28cropped%29.jpg",
        desc: "Político argentino, miembro del Partido Justicialista, que desempeñó como Gobernador de la Provincia de Córdoba durante tres períodos no consecutivos (2007-2011, 2015-2019 y 2019-2023)."
    },
     "Alberto Fernández": {
         name: "Alberto Fernández",
         img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Alberto_Fernandez_en_2019.jpg/440px-Alberto_Fernandez_en_2019.jpg",
         desc: "Abogado y político argentino, Presidente de la Nación Argentina entre 2019 y 2023."
     },
     // Ejemplo sin imagen para probar
     "Coco Sily": {
        name: "Coco Sily",
        desc: "Actor, humorista y presentador de televisión argentino."
     }
    // ... (Añade más si es necesario) ...
};

let tooltipTimeout = null; // Para gestionar el retraso al mostrar

// --- Funciones del Tooltip ---

/**
 * Posiciona el tooltip cerca del elemento target.
 * (Esta función se asume correcta por ahora, pero si fallara, podría detener la ejecución)
 */
function positionTooltip(targetElement) {
    // Log para verificar si esta función se llama y si los elementos son válidos
    // console.log("[positionTooltip] Intentando posicionar. Popup:", DOM.tooltipPopup, "Target:", targetElement);
    if (!DOM.tooltipPopup || !targetElement) {
        console.error("[positionTooltip] Error: Falta popup o targetElement.");
        return;
    }

    const rect = targetElement.getBoundingClientRect();
    const popup = DOM.tooltipPopup;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let top = rect.bottom + scrollY + 5;
    let left = rect.left + scrollX + 5;

    // --- Forzar cálculo de dimensiones ---
    // Guardar display original para restaurarlo
    const originalDisplay = popup.style.display;
    popup.style.visibility = 'hidden'; // Ocultar visualmente
    popup.style.display = 'block';    // Ponerlo en el layout para medir
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;
    // Restaurar display original antes de calcular posiciones finales
    popup.style.display = originalDisplay === 'block' ? 'block' : 'none';
    popup.style.visibility = 'visible'; // Hacerlo visible de nuevo
    // --- Fin cálculo dimensiones ---

    // Si después del cálculo, las dimensiones son 0, puede haber un problema CSS
    if (popupWidth === 0 || popupHeight === 0) {
        console.warn("[positionTooltip] El popup tiene dimensiones 0. ¿Está oculto por CSS o aún no tiene contenido?");
    }

    // Ajustes de posición (lógica sin cambios)
    if (left + popupWidth > window.innerWidth + scrollX - 10) { left = window.innerWidth + scrollX - popupWidth - 10; }
    if (top + popupHeight > window.innerHeight + scrollY - 10) { top = rect.top + scrollY - popupHeight - 5; }
    if (left < scrollX + 10) { left = scrollX + 10; }
    if (top < scrollY + 10) { top = scrollY + 10; }

    // Aplicar posición final
    popup.style.left = `${Math.max(0, left)}px`; // Asegurar que no sea negativo
    popup.style.top = `${Math.max(0, top)}px`;  // Asegurar que no sea negativo
    // console.log(`[positionTooltip] Posición final - Top: ${top}px, Left: ${left}px`); // Log opcional
}


/**
 * Muestra el tooltip con la información correcta.
 */
async function showTooltip(targetSpan) {
    // Log #1: Verificar inicio y targetSpan (ya vimos que targetSpan llega bien)
    console.log("[showTooltip] Iniciando showTooltip. targetSpan:", targetSpan);

    // Log #2: Verificar CADA elemento del DOM individualmente (CRUCIAL)
    console.log("[showTooltip] DOM.tooltipPopup:", DOM.tooltipPopup);   // OK en tu log anterior
    console.log("[showTooltip] DOM.tooltipImg:", DOM.tooltipImg);     // ¿Es null?
    console.log("[showTooltip] DOM.tooltipDesc:", DOM.tooltipDesc);    // ¿Es null?

    // Check #1: Detenerse si falta algún elemento esencial del tooltip
    if (!DOM.tooltipPopup || !DOM.tooltipImg || !DOM.tooltipDesc) {
        console.error("[showTooltip] ERROR CRÍTICO: Uno o más elementos del DOM para el tooltip son null. Verifica IDs en HTML y domElements.js.");
        // Ocultar si accidentalmente quedó visible de un intento anterior
        if(DOM.tooltipPopup) DOM.tooltipPopup.style.display = 'none';
        return; // Detener ejecución aquí si falta algo
    }

    // Check #2: Verificar y obtener personKey (ya vimos que targetSpan llega bien)
    const personKey = targetSpan.getAttribute('data-person-key');
    console.log(`[showTooltip] personKey obtenido: "${personKey}"`); // Verificar valor

    if (!personKey) {
         console.warn("[showTooltip] No se encontró 'data-person-key' en el targetSpan:", targetSpan);
         hideTooltip(); // Ocultar si no hay clave
         return;
    }

    // Log #3: Confirmar que las referencias básicas están bien antes de continuar
    console.log("[showTooltip] Referencias básicas OK. Procediendo...");

    // Log #4: Justo antes de llamar a positionTooltip
    console.log("[showTooltip] Llamando a positionTooltip...");
    try {
        positionTooltip(targetSpan); // Envolvemos en try/catch por si falla
        console.log("[showTooltip] positionTooltip ejecutado."); // Log si positionTooltip no lanza error
    } catch (error) {
        console.error("[showTooltip] Error durante positionTooltip:", error);
        hideTooltip(); // Ocultar si falla el posicionamiento
        return;
    }

    // Log #5: Justo antes de hacer visible el popup
    console.log("[showTooltip] Estableciendo display: block...");
    DOM.tooltipPopup.style.display = 'block';

    // Log #6: Justo antes de resetear contenido
    console.log("[showTooltip] Reseteando contenido (img/desc)...");
    try {
        // Es crucial que DOM.tooltipImg y DOM.tooltipDesc NO sean null aquí
        DOM.tooltipImg.style.display = 'none';
        DOM.tooltipImg.src = '';
        DOM.tooltipImg.alt = 'Cargando...';
        DOM.tooltipDesc.textContent = 'Buscando información...';
        console.log("[showTooltip] Contenido reseteado.");
    } catch(error) {
         console.error("[showTooltip] Error al resetear contenido (¿Img o Desc son null?):", error);
         hideTooltip();
         return;
    }


    // Log #7: Buscar en datos manuales
    console.log(`[showTooltip] Buscando datos manuales para "${personKey}"...`);
    const manualData = personData[personKey]; // Búsqueda case-sensitive
    if (manualData) {
        console.log("[showTooltip] Datos manuales encontrados.");
        DOM.tooltipDesc.textContent = manualData.desc || 'Información no disponible.';
        if (manualData.img) {
            DOM.tooltipImg.src = manualData.img;
            DOM.tooltipImg.alt = manualData.name || personKey;
            DOM.tooltipImg.style.display = 'block';
            console.log("[showTooltip] Imagen manual establecida.");
        } else {
            console.log("[showTooltip] No hay imagen en datos manuales.");
        }
        // Re-posicionar después de añadir contenido manual (el tamaño pudo cambiar)
        console.log("[showTooltip] Reposicionando después de datos manuales...");
        positionTooltip(targetSpan);
        return; // No buscar en Wikipedia
    }

    // Log #8: Si no hay datos manuales, intentar Wikipedia
    console.log(`[showTooltip] No hay datos manuales para "${personKey}", buscando en Wikipedia...`);
    try {
        const wikiApiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&titles=${encodeURIComponent(personKey)}&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=100&redirects=1`;
        console.log("[showTooltip] Fetching Wikipedia:", wikiApiUrl); // Log de la URL
        const response = await fetch(wikiApiUrl);
        console.log("[showTooltip] Respuesta fetch recibida, status:", response.status); // Log del status
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const wikiData = await response.json();
        console.log("[showTooltip] Datos JSON de Wikipedia parseados:", wikiData); // Log de los datos crudos

        const pages = wikiData.query?.pages;
        const pageId = pages ? Object.keys(pages)[0] : null;

        if (pageId && pageId !== "-1" && pages[pageId]) {
            const page = pages[pageId];
            console.log("[showTooltip] Página de Wikipedia encontrada:", page);
            const description = page.extract;
            const imageUrl = page.thumbnail?.source;

            DOM.tooltipDesc.textContent = description
                ? `${description.substring(0, 250)}${description.length > 250 ? '...' : ''}`
                : 'Información no encontrada.';

            if (imageUrl) {
                DOM.tooltipImg.src = imageUrl;
                DOM.tooltipImg.alt = page.title || personKey;
                DOM.tooltipImg.style.display = 'block';
                console.log("[showTooltip] Imagen de Wikipedia establecida.");
            } else {
                 console.log("[showTooltip] No se encontró imagen thumbnail en Wikipedia.");
            }
        } else {
            console.log("[showTooltip] No se encontró página válida en Wikipedia.");
            DOM.tooltipDesc.textContent = 'Información no encontrada en Wikipedia.';
        }
        // Re-posicionar después de cargar datos de Wiki
        console.log("[showTooltip] Reposicionando después de datos de Wikipedia...");
        positionTooltip(targetSpan);

    } catch (error) {
        console.error(`[showTooltip] Error buscando info para "${personKey}" en Wikipedia:`, error);
        DOM.tooltipDesc.textContent = 'Error al buscar información.';
         // Re-posicionar incluso si hay error (para que el mensaje de error se vea)
        positionTooltip(targetSpan);
    }
}


/**
 * Oculta el tooltip.
 */
function hideTooltip() {
    clearTimeout(tooltipTimeout);
    if (DOM.tooltipPopup) {
        // console.log("[hideTooltip] Ocultando tooltip."); // Log opcional
        DOM.tooltipPopup.style.display = 'none';
    }
}


/**
 * Inicializa los listeners del tooltip en un contenedor específico.
 */
export function setupTooltipListeners(containerElement) {
    if (!containerElement) {
        console.warn("setupTooltipListeners: No se proporcionó un contenedor.");
        return;
    }
    console.log(`[setupTooltipListeners] Configurando listeners en:`, containerElement);

    containerElement.addEventListener('mouseover', (event) => {
        const targetSpan = event.target.closest('.person-tooltip');
        // console.log('[Tooltip Listener] mouseover detectado en:', event.target); // Log opcional
        if (!targetSpan) return;
        // console.log('[Tooltip Listener] targetSpan encontrado:', targetSpan); // Log opcional

        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            console.log('[Tooltip Listener] Timeout ejecutado, llamando showTooltip');
            showTooltip(targetSpan);
        }, 300);
    });

    containerElement.addEventListener('mouseout', (event) => {
        const targetSpan = event.target.closest('.person-tooltip');
        // console.log('[Tooltip Listener] mouseout detectado en:', event.target); // Log opcional
        if (targetSpan) {
             // console.log('[Tooltip Listener] Limpiando timeout por mouseout'); // Log opcional
             clearTimeout(tooltipTimeout);
             // Considerar ocultar con un pequeño delay aquí si se quiere
             // setTimeout(hideTooltip, 100);
        }
    });

    // Ocultar tooltip si hacemos clic en cualquier lugar o scrolleamos
    document.addEventListener('click', hideTooltip, true); // Usar captura
    window.addEventListener('scroll', hideTooltip, true); // Usar captura
}