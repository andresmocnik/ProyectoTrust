import spacy
import json
import os # Para manejo de archivos

# --- Configuración ---
INPUT_JSON_FILE = 'noticiasjson.json'
OUTPUT_JSON_FILE = 'noticias_procesadas.json' # Archivo con texto y listas normalizadas
GRAPH_JSON_FILE = 'graph_data.json'          # Archivo específico para el grafo (nodos y aristas)
NLP_MODEL = 'es_core_news_lg'                # Modelo spaCy
MIN_ARTICLE_APPEARANCES = 5                  # <<<--- ¡AJUSTA ESTE UMBRAL SEGÚN TUS PRUEBAS!

# === NUEVO: Diccionario de Mapeo de Nombres ===
# Clave: Variante detectada (en minúsculas) | Valor: Nombre Canónico
NAME_MAPPING = {
    "milei": "Javier Milei",
    "presidente milei": "Javier Milei",
    "javier milei": "Javier Milei", # Añadir nombre completo por si spaCy lo detecta así
    "cristina": "Cristina Kirchner",
    "cristina kirchner": "Cristina Kirchner",
    "cristina fernández de kirchner": "Cristina Kirchner", # Variante más larga
    "cristina fernández": "Cristina Kirchner",
    "cfk": "Cristina Kirchner",
    "schiaretti": "Juan Schiaretti",
    "juan schiaretti": "Juan Schiaretti",
    "caputo": "Luis Caputo",
    "luis caputo": "Luis Caputo",
    "massa": "Sergio Massa",
    "sergio massa": "Sergio Massa",
    "bullrich": "Patricia Bullrich",
    "patricia bullrich": "Patricia Bullrich",
    "alberto fernández": "Alberto Fernández",
    "fernández": "Alberto Fernández", # Usar con precaución si hay otros Fernández relevantes
    "kicillof": "Axel Kicillof",
    "axel kicillof": "Axel Kicillof",
    "llaryora": "Martín Llaryora",
    "martín llaryora": "Martín Llaryora",
    "villarruel": "Victoria Villarruel",
    "victoria villarruel": "Victoria Villarruel",
    "adorni": "Manuel Adorni",
    "manuel adorni": "Manuel Adorni",
    "macri": "Mauricio Macri",
    "mauricio macri": "Mauricio Macri",
    "lijo": "Ariel Lijo",
    "ariel lijo": "Ariel Lijo",
    "menem": "Martín Menem",
    "martín menem": "Martín Menem",
    "karina milei": "Karina Milei", # Asegurarse de mapearla distinto a Javier
    "karina": "Karina Milei",
    "horacio rosatti": "Horacio Rosatti",
    "rosatti": "Horacio Rosatti",
    "ricardo lorenzetti": "Ricardo Lorenzetti",
    "lorenzetti": "Ricardo Lorenzetti",
    "juan carlos maqueda": "Juan Carlos Maqueda",
    "maqueda": "Juan Carlos Maqueda",
    "carlos rosenkrantz": "Carlos Rosenkrantz",
    "rosenkrantz": "Carlos Rosenkrantz",
    "luis petri": "Luis Petri",
    "petri": "Luis Petri",
    "horacio pietragalla": "Horacio Pietragalla",
    "pietragalla": "Horacio Pietragalla",
    "josé ignacio rucci": "José Ignacio Rucci",
    "rucci": "José Ignacio Rucci",
    "estela de carlotto": "Estela de Carlotto",
    "carlotto": "Estela de Carlotto",
    "josé luis espert": "José Luis Espert",
    "espert": "José Luis Espert",
    "josé manuel de la sota": "José Manuel de la Sota",
    "de la sota": "José Manuel de la Sota",
    "manuel garcía mansilla": "Manuel García Mansilla",
    "garcía mansilla": "Manuel García Mansilla",
    "guillermo francos": "Guillermo Francos",
    "francos": "Guillermo Francos",
    "horacio rodríguez larreta": "Horacio Rodríguez Larreta",
    "rodríguez larreta": "Horacio Rodríguez Larreta",
    "larreta": "Horacio Rodríguez Larreta",
    "sergio berni": "Sergio Berni",
    "berni": "Sergio Berni",
    "facundo manes": "Facundo Manes",
    "manes": "Facundo Manes",
    "myrian bregman": "Myriam Bregman", # Corregir posible typo
    "bregman": "Myriam Bregman",
    "martín lousteau": "Martín Lousteau",
    "lousteau": "Martín Lousteau",
    "rodrigo de loredo": "Rodrigo de Loredo",
    "de loredo": "Rodrigo de Loredo",
    "gabriel bornoroni": "Gabriel Bornoroni",
    "bornoroni": "Gabriel Bornoroni",
    # --- REVISA TUS DATOS Y AÑADE MÁS ---
}
# === FIN Diccionario de Mapeo ===


# --- Funciones (load_data, save_data, find_persons_in_article SIN CAMBIOS) ---
def load_data(filepath):
    """Carga los datos JSON desde un archivo."""
    if not os.path.exists(filepath):
        print(f"Error: El archivo de entrada '{filepath}' no existe.")
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Datos cargados exitosamente desde '{filepath}'.")
        return data
    except json.JSONDecodeError:
        print(f"Error: El archivo '{filepath}' no contiene JSON válido.")
        return None
    except Exception as e:
        print(f"Error inesperado al cargar '{filepath}': {e}")
        return None

def save_data(data, filepath):
    """Guarda los datos procesados en un nuevo archivo JSON."""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Datos procesados guardados exitosamente en '{filepath}'.")
    except Exception as e:
        print(f"Error al guardar datos en '{filepath}': {e}")

def find_persons_in_article(article_text, nlp):
    """Encuentra entidades de persona en un texto usando spaCy."""
    if not article_text or not isinstance(article_text, str):
        return []
    doc = nlp(article_text)
    persons = set()
    for ent in doc.ents:
        if ent.label_ == "PER":
            person_name = ent.text.strip()
            if len(person_name) > 2 and not person_name.isdigit():
                 persons.add(person_name)
    return list(persons)

# === NUEVA Función para Normalizar Nombres ===
def normalize_person_list(persons):
    """Normaliza una lista de nombres usando el diccionario NAME_MAPPING."""
    normalized_list = set()
    for person in persons:
        # Busca la variante en minúsculas en el mapeo, si no existe, usa el nombre original
        canonical_name = NAME_MAPPING.get(person.lower(), person.strip())
        # Opcional: podrías añadir más lógica aquí si quieres,
        # por ejemplo, ignorar nombres muy cortos después de intentar normalizar
        if len(canonical_name) > 2: # Pequeño filtro extra
             normalized_list.add(canonical_name)
    return list(normalized_list)
# === FIN Función Normalizar ===

# === calculate_graph_data MODIFICADA para usar nombres normalizados y filtrar ===
def calculate_graph_data(articles_data):
    """Calcula los nodos y aristas para el grafo de relaciones."""
    person_articles = {}
    article_persons_normalized = {} # Usaremos nombres normalizados aquí
    person_counts = {}

    print("Calculando datos para el grafo...")

    # 1. Recopilar apariciones usando nombres NORMALIZADOS
    for article in articles_data:
        article_id = article.get('id', article.get('link'))
        # === USA LA CLAVE CON LOS NOMBRES NORMALIZADOS ===
        persons_in_article_normalized = article.get('personas_detectadas_normalizadas', [])
        article_persons_normalized[article_id] = persons_in_article_normalized

        for person in persons_in_article_normalized: # Itera sobre nombres ya normalizados
            if person not in person_articles:
                person_articles[person] = set()
            person_articles[person].add(article_id)

    # Calcular conteo de artículos por persona (sobre nombres normalizados)
    for person, articles_set in person_articles.items():
        person_counts[person] = len(articles_set)

    # 2. Filtrar nodos y guardar IDs de los que quedan
    filtered_nodes_data = {}
    kept_node_ids = set()
    for person, count in person_counts.items():
        if count >= MIN_ARTICLE_APPEARANCES:
            filtered_nodes_data[person] = count
            kept_node_ids.add(person)
    print(f"Nodos iniciales (personas únicas normalizadas): {len(person_counts)}, Nodos filtrados (>= {MIN_ARTICLE_APPEARANCES} apariciones): {len(kept_node_ids)}")

    # 3. Calcular co-ocurrencias (aristas) SOLO entre nodos filtrados
    co_occurrences = {}
    # Iterar sobre el diccionario con listas YA NORMALIZADAS
    for article_id, persons_list_normalized in article_persons_normalized.items():
        # Filtrar la lista para este artículo AHORA con los nodos que SÍ estarán en el grafo
        filtered_persons_in_article = [p for p in persons_list_normalized if p in kept_node_ids]

        filtered_persons_in_article.sort() # Ordenar para consistencia de pares
        for i in range(len(filtered_persons_in_article)):
            for j in range(i + 1, len(filtered_persons_in_article)):
                person1 = filtered_persons_in_article[i]
                person2 = filtered_persons_in_article[j]
                pair = (person1, person2)
                co_occurrences[pair] = co_occurrences.get(pair, 0) + 1

    # 4. Formatear datos para la librería de grafos (Vis.js)
    nodes = []
    for person, count in filtered_nodes_data.items(): # Usar los datos ya filtrados
        node_size = min(10 + count, 50) # Ajusta la escala como prefieras
        nodes.append({"id": person, "label": person, "value": node_size, "title": f"Aparece en {count} artículos"})

    edges = []
    for pair, weight in co_occurrences.items(): # Usar las co-ocurrencias calculadas
        if weight > 0: # Este filtro ya estaba, pero es bueno mantenerlo
            edges.append({"from": pair[0], "to": pair[1], "value": weight, "title": f"Juntos en {weight} artículos"})

    print(f"Grafo final: {len(nodes)} nodos, {len(edges)} aristas.")
    return {"nodes": nodes, "edges": edges}
# === FIN calculate_graph_data MODIFICADA ===


# --- Proceso Principal (MODIFICADO para incluir normalización) ---
if __name__ == "__main__":
    print(f"Cargando modelo spaCy '{NLP_MODEL}'...")
    try:
        nlp = spacy.load(NLP_MODEL)
        print("Modelo cargado.")
    except OSError:
        print(f"Error: Modelo '{NLP_MODEL}' no encontrado.")
        print(f"Asegúrate de haberlo descargado ejecutando:")
        print(f"python -m spacy download {NLP_MODEL}")
        exit()
    except Exception as e:
        print(f"Error inesperado al cargar el modelo spaCy: {e}")
        exit()

    articles = load_data(INPUT_JSON_FILE)

    if articles:
        processed_articles = []
        print(f"Procesando {len(articles)} artículos...")

        for i, article in enumerate(articles):
            print(f"  Procesando artículo {i+1}/{len(articles)} (ID: {article.get('id', 'N/A')})...")
            text_to_process = article.get('cuerpo', '')

            # 1. Detectar personas
            raw_detected_persons = find_persons_in_article(text_to_process, nlp)

            # 2. Normalizar personas
            normalized_persons = normalize_person_list(raw_detected_persons)

            # 3. Añadir AMBAS listas al artículo (o solo la normalizada si prefieres)
            article['personas_detectadas'] = raw_detected_persons # La lista original de spaCy
            article['personas_detectadas_normalizadas'] = normalized_persons # La lista normalizada
            processed_articles.append(article)

        print("Procesamiento NER y Normalización completado.")
        # Guardar artículos procesados con ambas listas
        save_data(processed_articles, OUTPUT_JSON_FILE)

        # Calcular y guardar los datos específicos para el grafo (usará la lista normalizada)
        graph_output_data = calculate_graph_data(processed_articles)
        save_data(graph_output_data, GRAPH_JSON_FILE)

    else:
        print("No se procesaron artículos debido a errores previos.")