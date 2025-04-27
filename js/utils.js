// js/utils.js - Funciones de Utilidad Generales

/**
 * Crea un elemento HTML con opciones.
 * @param {string} tag - La etiqueta HTML (ej. 'div', 'button').
 * @param {object} [options={}] - Opciones como className, id, textContent, etc.
 * @returns {HTMLElement} El elemento creado.
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    if (options.textContent) element.textContent = options.textContent;
    if (options.innerHTML) element.innerHTML = options.innerHTML;
    if (options.src) element.src = options.src;
    if (options.alt) element.alt = options.alt;
    if (options.title) element.title = options.title; // Añadido para tooltips nativos
    if (options.value) element.value = options.value; // Para inputs/options
    if (options.type) element.type = options.type; // Para inputs
    if (options.placeholder) element.placeholder = options.placeholder; // Para inputs
    if (options.disabled) element.disabled = options.disabled; // Para controles

    // Añadir atributos de datos
    if (options.dataset) {
        for (const key in options.dataset) {
            if (Object.hasOwnProperty.call(options.dataset, key)) {
                element.dataset[key] = options.dataset[key];
            }
        }
    }
    return element;
}

/**
 * Parsea una cadena de fecha/hora en formato 'dd de mes de aaaa,hh:mm' a un objeto Date.
 * @param {string} dateStr - La cadena de fecha/hora.
 * @returns {Date|null} El objeto Date o null si el formato es inválido.
 */
export function parseDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') { return null; }
    const months = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    // Regex mejorada para ser más flexible con espacios y mayúsculas/minúsculas
    const regex = /(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4}),?\s*(\d{1,2}):(\d{2})/;
    const match = dateStr.trim().match(regex);

    if (match) {
        try {
            const day = parseInt(match[1], 10);
            const monthName = match[2].toLowerCase(); // Convertir a minúsculas
            const year = parseInt(match[3], 10);
            const hours = parseInt(match[4], 10);
            const minutes = parseInt(match[5], 10);
            const monthNumber = months[monthName];

            // Validaciones más robustas
            if (monthNumber !== undefined &&
                !isNaN(day) && day > 0 && day <= 31 &&
                !isNaN(year) && year > 1900 && year < 2100 && // Rango de año razonable
                !isNaN(hours) && hours >= 0 && hours <= 23 &&
                !isNaN(minutes) && minutes >= 0 && minutes <= 59)
            {
                // Usar UTC para evitar problemas de zona horaria si las fechas son consistentes
                const date = new Date(Date.UTC(year, monthNumber, day, hours, minutes));
                // Verificar si la fecha creada es válida y coincide con los componentes
                if (!isNaN(date.getTime()) &&
                    date.getUTCDate() === day &&
                    date.getUTCMonth() === monthNumber) {
                    return date;
                } else {
                    console.warn(`[parseDateString] Fecha inválida después de la creación: "${dateStr}"`);
                    return null;
                }
            } else {
                console.warn(`[parseDateString] Componentes de fecha inválidos: "${dateStr}"`);
                return null;
            }
        } catch (e) {
            console.error(`[parseDateString] Error parseando: "${dateStr}"`, e);
            return null;
        }
    }
    console.warn(`[parseDateString] Formato no reconocido: "${dateStr}"`);
    return null;
}


/**
 * Genera un color HSL determinista basado en una cadena (para consistencia).
 * @param {string} str - La cadena de entrada.
 * @returns {string} Un color HSL en formato 'hsl(h, s%, l%)'.
 */
export function stringToHslColor(str, saturation = 75, lightness = 50) {
    let hash = 0;
    if (!str || str.length === 0) return `hsl(0, ${saturation}%, ${lightness}%)`;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }
    const h = Math.abs(hash) % 360; // Asegurar positivo
    const s = saturation + (Math.abs(hash * 7) % 10); // Ligeras variaciones
    const l = lightness + (Math.abs(hash * 13) % 10); // Ligeras variaciones
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Puedes añadir más funciones útiles aquí (ej. debounce, throttle, formateo de números, etc.)