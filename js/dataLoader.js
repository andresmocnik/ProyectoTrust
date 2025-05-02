// js/dataLoader.js
// Funciones para cargar datos JSON

// Carga las noticias procesadas
export async function loadArticles() {
    console.log("Cargando noticias_procesadas.json...");
    try {
        const response = await fetch('noticias_procesadas.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(` -> ${data.length} artículos cargados.`);
        if (!Array.isArray(data)) {
            console.error("Error: El formato de noticias_procesadas.json no es un array.");
            return []; // Devuelve array vacío en caso de formato incorrecto
        }
        return data;
    } catch (error) {
        console.error("Error al cargar noticias_procesadas.json:", error);
        // Aquí podrías mostrar un mensaje al usuario en la UI
        return []; // Devuelve array vacío en caso de error
    }
}
// Carga la base de datos de políticos
export async function loadPoliticiansDB() {
    console.log("[dataLoader] Cargando politicians_db.json...");
    try {
        const response = await fetch('politicians_db.json'); // Nombre del nuevo archivo
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) { // El JSON base es un array de objetos
            console.error("[dataLoader] Error: El formato de politicians_db.json no es un array.");
            return []; // Devolver array vacío si el formato es incorrecto
        }
        console.log(`[dataLoader] -> ${data.length} políticos cargados desde DB.`);
        return data; // Devolvemos el array cargado
    } catch (error) {
        console.error("[dataLoader] Error al cargar politicians_db.json:", error);
        return []; // Devolver array vacío en caso de error
    }
}
// js/dataLoader.js (Añadir esta función)

export async function loadGraphData() {
    console.log("[dataLoader] Cargando graph_data.json...");
    try {
        const response = await fetch('graph_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Validación básica del formato
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
             console.error("[dataLoader] Error: Formato de graph_data.json inválido.");
             return null; // O un objeto vacío { nodes: [], edges: [] }
        }
        console.log(`[dataLoader] -> Grafo cargado (${data.nodes.length} nodos, ${data.edges.length} aristas).`);
        return data;
    } catch (error) {
        console.error("[dataLoader] Error al cargar graph_data.json:", error);
        return null; // Indicar fallo
    }
}