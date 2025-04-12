// Espera a que toda la estructura HTML esté cargada antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {

    // Obtenemos referencias a los elementos HTML que vamos a necesitar manipular
    const articlesContainer = document.getElementById('articles-container'); // Donde van las noticias
    const tooltipPopup = document.getElementById('tooltip-popup');       // El div del popup
    const tooltipImg = document.getElementById('tooltip-img');           // La imagen del popup
    const tooltipDesc = document.getElementById('tooltip-desc');         // El texto del popup

    // --- Información para los Tooltips ---
    // Aquí guardamos los datos de las personas que queremos mostrar en el popup.
    // Más adelante, podrías cargar esto desde otro sitio o archivo.
    const personData = {
        // Usamos una clave simple en minúsculas para cada persona
        "milei": {
            name: "Javier Milei", // Nombre completo
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Javier_Milei_%28cropped%29.jpg/440px-Javier_Milei_%28cropped%29.jpg", // URL de ejemplo de imagen
            desc: "Economista y político argentino, actual Presidente de la Nación Argentina desde diciembre de 2023." // Descripción corta
        },
        "messi": {
            name: "Lionel Messi",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_20180626.jpg/440px-Lionel_Messi_20180626.jpg", // URL de ejemplo
            desc: "Futbolista argentino considerado uno de los mejores de todos los tiempos. Juega como delantero o centrocampista."
        },
        "zielinski": {
            name: "Ricardo Zielinski",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Ricardo_Zielinski_en_abril_de_2019_%28cropped%29.jpg/440px-Ricardo_Zielinski_en_abril_de_2019_%28cropped%29.jpg", // URL de ejemplo
            desc: "Exfutbolista y actual director técnico de fútbol argentino. Ha dirigido varios clubes importantes."
        },
         "coria": { // Añadido para ejemplo
            name: "Guillermo Coria",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Guillermo_Coria_Roland_Garros_2005.jpg/440px-Guillermo_Coria_Roland_Garros_2005.jpg", // URL ejemplo
            desc: "Ex tenista profesional argentino y actual capitán del equipo argentino de Copa Davis."
        },
        
        // Puedes añadir más personas aquí siguiendo el mismo formato
        // "apellido_simple": { name: "Nombre Completo", img: "url_imagen", desc: "Descripción" }
        
        // ANDY: AGREGADAS A MANO... EVENTUALMENTE EVALUAR COMO PODER AUTOMATIZAR 
        "carballo": {
            name: "Diego Carballo",
            img:"https://i0.wp.com/eldiariodelpueblo.com.ar/wp-content/uploads/2024/02/409558962_755350239946088_7615995329144555656_n.jpg?w=1000&ssl=1",
            desc: "​Diego Carballo es el actual intendente de la ciudad de Villa del Rosario, ubicada en la provincia de Córdoba, Argentina. Es contador público y pertenece al partido Juntos por el Cambio. Asumió el cargo tras las elecciones del 4 de junio de 2023."
        },
        "llaryora": {
            name: "Martín Llaryora",
            img: "https://media.diariopopular.com.ar/p/4f463a3d2f84cd68a81f5e4cde1bac27/adjuntos/143/imagenes/008/093/0008093476/1140x0/smart/martin-llaryora-foto-2jpg.jpg", // URL de ejemplo
            desc: "Político argentino, actual Gobernador de la Provincia de Córdoba desde diciembre de 2023."

        },
    };

    // Función para crear elementos HTML de forma segura y fácil
    function createElement(tag, options = {}) {
        const element = document.createElement(tag); // Crea la etiqueta (ej: 'div', 'p', 'img')
        if (options.className) element.className = options.className; // Añade clase CSS si se especifica
        if (options.id) element.id = options.id;                   // Añade ID si se especifica
        if (options.textContent) element.textContent = options.textContent; // Añade texto simple
        if (options.innerHTML) element.innerHTML = options.innerHTML; // Añade HTML interno (usar con cuidado)
        if (options.src) element.src = options.src;                 // Añade fuente para imágenes (src)
        if (options.alt) element.alt = options.alt;                 // Añade texto alternativo para imágenes
        return element; // Devuelve el elemento creado
    }

    // Función para encontrar y resaltar nombres de personas conocidas en un texto
    function highlightPeople(text) {
        let highlightedText = text; // Empezamos con el texto original
        // Recorremos cada persona que tenemos definida en personData
        for (const key in personData) {
            // Creamos una "Expresión Regular" para buscar el nombre completo.
            // Funciona aunque esté en mayúsculas/minúsculas ('gi')
            // y busca la palabra completa ('\\b' significa borde de palabra)
            // Esto evita que encuentre "Milei" dentro de "Smiley", por ejemplo.
            // Maneja nombres con espacios (como "Lionel Messi")
            const regex = new RegExp(`\\b(${personData[key].name.split(' ').join('\\s+')})\\b`, 'gi');
            // Reemplazamos el nombre encontrado por el mismo nombre, pero envuelto
            // en una etiqueta <span> especial que tiene la clase 'person-tooltip'
            // y un atributo 'data-person-key' que guarda la clave ("milei", "messi", etc.)
            highlightedText = highlightedText.replace(
                regex,
                `<span class="person-tooltip" data-person-key="${key}">$1</span>`
                // $1 significa "el texto que coincidió con la búsqueda (el nombre)"
            );
        }
        return highlightedText; // Devolvemos el texto con los nombres resaltados
    }

    // Función para mostrar un artículo en la página
    function displayArticle(article) {
        // Creamos el 'div' principal para este artículo
        const articleDiv = createElement('div', { className: 'article' });

        // Creamos y añadimos la sección, título y subtítulo
        const section = createElement('div', { className: 'article-meta', textContent: `Sección: ${article.seccion || 'N/A'}` });
        const title = createElement('h2', { textContent: article.titulo || 'Sin Título' });
        const subtitle = createElement('h3', { textContent: article.subtitulo || '' });

        // Creamos y añadimos la info de autor y fecha
        const metaDiv = createElement('div', { className: 'article-meta' });
        metaDiv.appendChild(createElement('span', { textContent: `Autor: ${article.autor || 'N/A'}` }));
        metaDiv.appendChild(createElement('span', { textContent: `Fecha: ${article.fecha_hora || 'N/A'}` }));

        // Creamos y añadimos la imagen y su pie de foto (si existen)
        const image = createElement('img', { className: 'article-img', src: article.link_img || '', alt: article.titulo || 'Imagen de noticia' });
        const caption = createElement('figcaption', { className: 'article-img-caption', textContent: article.caption_img || '' });

        // Creamos el contenedor para el cuerpo del artículo
        const bodyDiv = createElement('div', { className: 'article-body' });
        // Dividimos el cuerpo del texto en párrafos (separados por saltos de línea)
        // y eliminamos párrafos vacíos
        const paragraphs = (article.cuerpo || '').split('\n').filter(p => p.trim() !== '');
        // Procesamos cada párrafo
        paragraphs.forEach(pText => {
            // Creamos un elemento <p> y usamos 'innerHTML' porque highlightPeople devuelve HTML
            const pElement = createElement('p', { innerHTML: highlightPeople(pText) });
            bodyDiv.appendChild(pElement); // Añadimos el párrafo al cuerpo
        });

        // Añadimos todas las partes creadas al 'div' principal del artículo
        articleDiv.appendChild(section);
        articleDiv.appendChild(title);
        if (article.subtitulo) articleDiv.appendChild(subtitle); // Solo si hay subtítulo
        articleDiv.appendChild(metaDiv);
        if (article.link_img) articleDiv.appendChild(image);     // Solo si hay imagen
        if (article.caption_img) articleDiv.appendChild(caption); // Solo si hay pie de foto
        articleDiv.appendChild(bodyDiv);

        // Finalmente, añadimos el 'div' completo del artículo al contenedor principal en la página
        articlesContainer.appendChild(articleDiv);
    }

    // --- Activación de los Tooltips ---
    // Esta función se llama DESPUÉS de que los artículos se hayan añadido a la página
    function setupTooltipListeners() {
        // Buscamos TODOS los <span> con la clase 'person-tooltip' que acabamos de crear
        const personSpans = articlesContainer.querySelectorAll('.person-tooltip');

        // Añadimos escuchadores de eventos a cada uno de ellos
        personSpans.forEach(span => {
            // Evento: Cuando el ratón entra sobre el nombre
            span.addEventListener('mouseover', (event) => {
                const personKey = event.target.getAttribute('data-person-key'); // Obtenemos la clave ("milei", "messi"...)
                const data = personData[personKey]; // Buscamos la info en nuestro objeto personData
                if (data) { // Si encontramos datos para esa persona
                    tooltipImg.src = data.img || ''; // Ponemos la URL de la imagen
                    tooltipImg.alt = data.name;     // Texto alternativo de la imagen
                    tooltipDesc.textContent = data.desc; // Ponemos la descripción

                    // Posicionamos el popup cerca del cursor del ratón
                    // Los números (+15, +10) son para que no aparezca exactamente encima
                    tooltipPopup.style.left = `${event.pageX + 15}px`; // Posición horizontal
                    tooltipPopup.style.top = `${event.pageY + 10}px`;  // Posición vertical

                    tooltipPopup.style.display = 'block'; // Hacemos visible el popup
                }
            });

            // Evento: Cuando el ratón sale de encima del nombre
            span.addEventListener('mouseout', () => {
                tooltipPopup.style.display = 'none'; // Ocultamos el popup
            });

            // Opcional: Mover el tooltip si el ratón se mueve MIENTRAS está sobre el nombre
            span.addEventListener('mousemove', (event) => {
                if (tooltipPopup.style.display === 'block') { // Solo si está visible
                    tooltipPopup.style.left = `${event.pageX + 15}px`;
                    tooltipPopup.style.top = `${event.pageY + 10}px`;
                }
            });
        });
    }


    // --- Cargar y Mostrar las Noticias ---
    // Usamos 'fetch' para leer el archivo JSON
    fetch('noticiasjson.json')
        .then(response => { // Cuando el navegador recibe la respuesta...
            if (!response.ok) { // Comprobamos si hubo algún error al cargar el archivo
                throw new Error(`Error HTTP! estado: ${response.status}`);
            }
            return response.json(); // Convertimos la respuesta en datos JavaScript (un array de objetos)
        })
        .then(data => { // Cuando tenemos los datos listos...
            // Mostramos los primeros 2 artículos (puedes cambiar el '2' por otro número)
            const articlesToDisplay = data.slice(0, 2); // 'slice(0, 2)' toma desde el índice 0 hasta (pero sin incluir) el 2
            // Llamamos a la función displayArticle para cada uno de los artículos seleccionados
            articlesToDisplay.forEach(article => {
                displayArticle(article);
            });

            // IMPORTANTE: Una vez que los artículos están en la página, activamos los tooltips
            setupTooltipListeners();
        })
        .catch(error => { // Si ocurre algún error en el proceso...
            console.error('Error al cargar o procesar los datos de noticias:', error);
            // Mostramos un mensaje de error en la página
            articlesContainer.textContent = 'Error al cargar las noticias.';
        });
}); // Fin del addEventListener('DOMContentLoaded')