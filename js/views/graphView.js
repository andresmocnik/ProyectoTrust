// js/views/graphView.js - Lógica para la vista del Grafo de Relaciones

import * as DOM from '../ui/domElements.js';
import { state } from '../state.js'; // Podríamos necesitarlo si guardamos datos del grafo
import { switchView } from '../ui/navigation.js'; // Para navegar al hacer clic

let isInitialized = false; // Flag para controlar la inicialización única
let networkInstance = null; // Guardar la instancia de Vis.js

/**
 * Define las opciones de configuración para Vis.js adaptadas al tema oscuro.
 * @returns {object} Objeto de opciones de Vis.js.
 */
function _getVisOptions() {
    // Usar variables CSS o valores directos que coincidan con style.css
    const colors = {
        background: '#1a1d21', // --bg-primary
        nodeBorder: '#8ab4f8', // --color-accent
        nodeBackground: '#2c3035', // --bg-secondary
        nodeHighlightBorder: '#a1c5ff',// --color-accent-hover
        nodeHighlightBackground: '#3a3f44', // --bg-tertiary
        edge: '#5f6368', // --scrollbar-thumb (gris medio)
        edgeHighlight: '#8ab4f8', // --color-accent
        text: '#e8eaed', // --text-primary
    };

    return {
        nodes: {
            shape: 'dot', // Círculos
            scaling: {
                min: 12, // Tamaño mínimo nodo
                max: 60, // Tamaño máximo nodo
                label: { enabled: true, min: 14, max: 30, drawThreshold: 8 } // Mostrar etiquetas en nodos más grandes
            },
            font: {
                size: 14,
                color: colors.text,
                strokeWidth: 0 // Sin borde en el texto
            },
            borderWidth: 2,
            color: {
                border: colors.nodeBorder,
                background: colors.nodeBackground,
                highlight: {
                    border: colors.nodeHighlightBorder,
                    background: colors.nodeHighlightBackground
                },
                hover: { // Usar mismos colores que highlight o unos intermedios
                    border: colors.nodeHighlightBorder,
                    background: colors.nodeHighlightBackground
                }
            },
             shadow: { // Sombra sutil para profundidad
                 enabled: true,
                 color: 'rgba(0, 0, 0, 0.5)',
                 size: 5,
                 x: 2,
                 y: 2
             }
        },
        edges: {
            width: 1, // Ancho base más fino
            scaling: {
                min: 0.5, // Ancho mínimo
                max: 8    // Ancho máximo
            },
            color: {
                color: colors.edge,
                highlight: colors.edgeHighlight,
                hover: colors.edgeHighlight, // Resaltar al pasar mouse
                inherit: false, // No heredar color del nodo
                opacity: 0.5 // Hacerlas semi-transparentes
            },
            smooth: {
                enabled: true,
                type: "continuous", // Curvas suaves
                roundness: 0.4
            },
            hoverWidth: 1.5 // Ancho al hacer hover
            // arrows: { to: { enabled: false } } // Sin flechas por defecto
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based', // Buen algoritmo para redes sociales
            forceAtlas2Based: {
                gravitationalConstant: -50, // Ajustar gravedad
                centralGravity: 0.01,       // Fuerza hacia el centro
                springLength: 100,          // Longitud deseada de aristas
                springConstant: 0.08,       // Rigidez aristas
                damping: 0.6,               // Amortiguación para estabilizar
                avoidOverlap: 0.5           // Evitar solapamiento nodos
            },
            minVelocity: 0.75, // Umbral para considerar estabilizado
            stabilization: { // Permitir más iteraciones para mejor layout
                enabled: true,
                iterations: 500, // Más iteraciones
                updateInterval: 50
            }
        },
        interaction: {
            hover: true,             // Habilitar hover en nodos/aristas
            tooltipDelay: 200,       // Delay corto para tooltips nativos (títulos)
            navigationButtons: false, // Ocultar botones +/-/zoom (usar rueda)
            keyboard: true,          // Permitir navegación teclado
            hideEdgesOnDrag: true,   // Ocultar aristas al arrastrar nodo (mejora perf)
            dragNodes: true          // Permitir arrastrar nodos
        },
        layout: {
            improvedLayout: true // Usar mejora de layout de Vis.js
        }
        // No definimos background aquí, usamos el del div#mynetwork en CSS
    };
}

/**
 * Maneja el evento de clic en un nodo del grafo.
 * Navega a la vista de noticias y filtra por el político seleccionado.
 * @param {object} params - Objeto de evento de Vis.js.
 */
function _handleNodeClick(params) {
    if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]; // ID del nodo es el nombre del político
        console.log(`[graphView] Clic en nodo: ${nodeId}`);

        // Intentar seleccionar en el dropdown de la vista de noticias
        if (DOM.politicianSelect) {
            const optionExists = Array.from(DOM.politicianSelect.options).some(opt => opt.value === nodeId);
            if (optionExists) {
                console.log(`[graphView] Navegando a 'news' y seleccionando ${nodeId}`);
                switchView('news'); // Cambia a la vista de noticias
                // Esperar un instante para que la vista cambie antes de manipular el select
                setTimeout(() => {
                    if (DOM.politicianSelect) { // Volver a verificar por si acaso
                         DOM.politicianSelect.value = nodeId;
                         // Disparar el evento 'change' para que se aplique el filtro
                         DOM.politicianSelect.dispatchEvent(new Event('change'));
                    }
                }, 50); // Pequeño delay
            } else {
                console.warn(`[graphView] Político "${nodeId}" encontrado en grafo pero no en el select de filtro.`);
                alert(`Seleccionado: ${nodeId}\n(No encontrado en el filtro de noticias)`);
            }
        } else {
            console.warn("[graphView] No se encontró el select de políticos para filtrar.");
            alert(`Seleccionado: ${nodeId}`);
        }
    }
}

/**
 * Maneja el evento de clic en una arista del grafo.
 * (Actualmente solo muestra una alerta).
 * @param {object} params - Objeto de evento de Vis.js.
 */
function _handleEdgeClick(params, edgesDataSet, nodesDataSet) {
     if (params.edges.length > 0) {
         const edgeId = params.edges[0];
         const edgeData = edgesDataSet.get(edgeId);
         if (edgeData) {
             const fromNode = nodesDataSet.get(edgeData.from);
             const toNode = nodesDataSet.get(edgeData.to);
             if (fromNode && toNode) {
                 const message = `Relación: ${fromNode.label} - ${toNode.label}\nMencionados juntos en ${edgeData.value || 'N/A'} artículos.`;
                 console.log(`[graphView] Clic en arista: ${fromNode.label} - ${toNode.label}`);
                 alert(message);
             }
         }
     }
}


/**
 * Carga los datos del grafo desde JSON y dibuja la red usando Vis.js.
 * Se ejecuta solo una vez.
 */
async function _loadAndDrawGraph() {
    if (!DOM.graphNetworkContainer) {
        console.error("[graphView] Error: Contenedor '#mynetwork' no encontrado.");
        return;
    }
    // Mostrar mensaje de carga
    DOM.graphNetworkContainer.innerHTML = '<p class="loading-placeholder" style="text-align: center; padding: 50px; color: var(--text-secondary);">Cargando red de influencia...</p>';

    try {
        console.log("[graphView] Cargando graph_data.json...");
        const response = await fetch('graph_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const graphData = await response.json();
        console.log("[graphView] graph_data.json cargado.");

        // Validar datos básicos
        if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
             throw new Error("Formato de graph_data.json inválido.");
        }

        // Limpiar contenedor antes de dibujar
        DOM.graphNetworkContainer.innerHTML = '';

        // Crear datasets de Vis.js
        const nodesDataSet = new vis.DataSet(graphData.nodes);
        const edgesDataSet = new vis.DataSet(graphData.edges);

        // Obtener opciones de configuración
        const options = _getVisOptions();

        // Crear la instancia de la red
        console.log("[graphView] Creando instancia de Vis.Network...");
        networkInstance = new vis.Network(DOM.graphNetworkContainer, { nodes: nodesDataSet, edges: edgesDataSet }, options);
        console.log("[graphView] Instancia de red creada.");

        // Evento cuando la estabilización inicial termina
        networkInstance.once("stabilizationIterationsDone", () => {
            console.log("[graphView] Estabilización inicial completada.");
            // Opcional: Hacer zoom para ajustar todo después de estabilizar
            // networkInstance.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        });

        // Evento de clic (para nodos y aristas)
        networkInstance.on("click", function (params) {
            if (params.nodes.length > 0) {
                _handleNodeClick(params);
            } else if (params.edges.length > 0) {
                _handleEdgeClick(params, edgesDataSet, nodesDataSet);
            }
        });

         // Opcional: Añadir un pequeño delay antes de activar la física para que se vea la carga
         // setTimeout(() => {
         //     networkInstance.startSimulation();
         // }, 200);


    } catch (error) {
        console.error("[graphView] Error al cargar o dibujar el grafo:", error);
        DOM.graphNetworkContainer.innerHTML = `<p class="error-placeholder" style="text-align: center; padding: 50px; color: var(--color-danger);">Error al cargar la red: ${error.message}</p>`;
    }
}

/**
 * Función pública para inicializar la vista del grafo.
 * Llama a _loadAndDrawGraph solo la primera vez.
 */
export function initializeGraph() {
    console.log(`[graphView] Solicitud de inicialización. ¿Ya inicializado? ${isInitialized}`);
    if (!isInitialized) {
        isInitialized = true; // Marcar como inicializado ANTES de empezar la carga
        _loadAndDrawGraph(); // Cargar y dibujar
    } else {
        console.log("[graphView] El grafo ya está inicializado. No se recarga.");
        // Opcional: Si el grafo ya existe, podríamos querer reajustarlo a la vista
        if (networkInstance) {
            // networkInstance.fit(); // Podría ser molesto si el usuario ya hizo zoom/pan
        }
    }
}