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

// TODO: Añadir funciones para cargar graph_data.json y menciones_por_fecha.json
// export async function loadGraphData() { ... }
// export async function loadTimeSeriesData() { ... }