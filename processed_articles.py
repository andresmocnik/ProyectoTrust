import spacy
import json
import os
from collections import defaultdict
import re # Importar módulo de expresiones regulares

# --- Configuración ---
INPUT_JSON_FILE = 'noticiasjson.json'       # Archivo de entrada con los artículos
OUTPUT_JSON_FILE = 'noticias_procesadas.json' # Archivo de salida con personas normalizadas
GRAPH_JSON_FILE = 'graph_data.json'         # Archivo para datos del grafo
MENTIONS_JSON_FILE = 'menciones_por_fecha.json' # Archivo para menciones por fecha
NLP_MODEL = 'es_core_news_lg'               # Modelo spaCy para español
MIN_ARTICLE_APPEARANCES_GRAPH = 5           # Umbral para incluir nodos en el grafo

# === Diccionario de Mapeo de Nombres (¡IMPORTANTE AJUSTAR!) ===
# Clave: Variante detectada (en minúsculas) | Valor: Nombre Canónico
# Priorizar nombres completos y combinaciones comunes. Evitar apellidos solos si son ambiguos.
NAME_MAPPING = {
    # Javier Milei
    "milei": "Javier Milei",
    "javier milei": "Javier Milei",
    "presidente milei": "Javier Milei",
    # Cristina Kirchner
    "cristina": "Cristina Kirchner",
    "cristina kirchner": "Cristina Kirchner",
    "cristina fernández de kirchner": "Cristina Kirchner",
    "cristina fernández": "Cristina Kirchner",
    "cfk": "Cristina Kirchner",
    # Alberto Fernández
    "alberto fernández": "Alberto Fernández",
    "fernández, alberto": "Alberto Fernández", # Formato invertido
    # "fernández": "Alberto Fernández", # Evitar si es ambiguo con Aníbal, etc.
    # Alberto Rodríguez Saá
    "alberto rodríguez saá": "Alberto Rodríguez Saá",
    "rodríguez saá": "Alberto Rodríguez Saá", # Apellido compuesto
    # Sergio Massa
    "massa": "Sergio Massa",
    "sergio massa": "Sergio Massa",
    # Patricia Bullrich
    "bullrich": "Patricia Bullrich",
    "patricia bullrich": "Patricia Bullrich",
    # Luis Caputo
    "caputo": "Luis Caputo",
    "luis caputo": "Luis Caputo",
    # Axel Kicillof
    "kicillof": "Axel Kicillof",
    "axel kicillof": "Axel Kicillof",
    # Martín Llaryora
    "llaryora": "Martín Llaryora",
    "martín llaryora": "Martín Llaryora",
    # Victoria Villarruel
    "villarruel": "Victoria Villarruel",
    "victoria villarruel": "Victoria Villarruel",
    # Manuel Adorni
    "adorni": "Manuel Adorni",
    "manuel adorni": "Manuel Adorni",
    # Mauricio Macri
    "macri": "Mauricio Macri",
    "mauricio macri": "Mauricio Macri",
    # Ariel Lijo
    "lijo": "Ariel Lijo",
    "ariel lijo": "Ariel Lijo",
    # Martín Menem
    "menem": "Martín Menem", # Cuidado si aparece Carlos Menem
    "martín menem": "Martín Menem",
    "carlos menem": "Carlos Menem", # Añadir explícitamente
    # Karina Milei
    "karina milei": "Karina Milei",
    "karina": "Karina Milei", # Puede ser ambiguo, usar con precaución
    # Corte Suprema
    "horacio rosatti": "Horacio Rosatti", "rosatti": "Horacio Rosatti",
    "ricardo lorenzetti": "Ricardo Lorenzetti", "lorenzetti": "Ricardo Lorenzetti",
    "juan carlos maqueda": "Juan Carlos Maqueda", "maqueda": "Juan Carlos Maqueda",
    "carlos rosenkrantz": "Carlos Rosenkrantz", "rosenkrantz": "Carlos Rosenkrantz",
    "elena highton de nolasco": "Elena Highton de Nolasco", "highton de nolasco": "Elena Highton de Nolasco", "highton": "Elena Highton de Nolasco",
    # Otros
    "luis petri": "Luis Petri", "petri": "Luis Petri",
    "estela de carlotto": "Estela de Carlotto", "carlotto": "Estela de Carlotto",
    "néstor kirchner": "Néstor Kirchner", # Asegurar que no colisione con CFK si se usa solo "Kirchner"
    "kirchner": "Néstor Kirchner", # O decidir una política (ej. mapear a "Kirchnerismo"?) - Riesgoso
    "máximo kirchner": "Máximo Kirchner",
    "gildo insfrán": "Gildo Insfrán", "insfrán": "Gildo Insfrán",
    "juan schiaretti": "Juan Schiaretti", "schiaretti": "Juan Schiaretti",
    "horacio rodríguez larreta": "Horacio Rodríguez Larreta", "rodríguez larreta": "Horacio Rodríguez Larreta", "larreta": "Horacio Rodríguez Larreta",
    "josé luis espert": "José Luis Espert", "espert": "José Luis Espert",
    "guillermo francos": "Guillermo Francos", "francos": "Guillermo Francos",
    "daniel scioli": "Daniel Scioli", "scioli": "Daniel Scioli",
    "juan grabois": "Juan Grabois", "grabois": "Juan Grabois",
    "myriam bregman": "Myriam Bregman", "bregman": "Myriam Bregman",
    "nicolás del caño": "Nicolás del Caño", "del caño": "Nicolás del Caño",
    "miguel ángel pichetto": "Miguel Ángel Pichetto", "pichetto": "Miguel Ángel Pichetto",
    "facundo manes": "Facundo Manes", "manes": "Facundo Manes",
    "martín lousteau": "Martín Lousteau", "lousteau": "Martín Lousteau",
    "gerardo morales": "Gerardo Morales", "morales": "Gerardo Morales", # Cuidado con otros Morales
    "anibal fernández": "Aníbal Fernández", # Distinguir de Alberto
    "anibal fernandez": "Aníbal Fernández",
     "wado de pedro": "Eduardo “Wado” de Pedro", # Apodo común
     "eduardo de pedro": "Eduardo “Wado” de Pedro",
     "wado": "Eduardo “Wado” de Pedro", # Usar apodo si es muy común
    # ... ¡AÑADIR MUCHOS MÁS DE TU LISTA Y SUS VARIANTES! ...
}
# === FIN NAME_MAPPING ===

# === Lista de Nombres Comunes (¡AÑADIR MÁS!) ===
NOMBRES_COMUNES = {
    "alberto", "alejandra", "alejandro", "alfredo", "amado", "anabel", "anibal",
    "andrés", "antonio", "ariel", "armando", "axel", "beatriz",
    "carlos", "cecilia", "celeste", "christian", "claudio", "cristina",
    "daniel", "damián", "diego", "diana", "domingo",
    "eduardo", "elena", "elisa", "emilio", "esteban", "estela", "eva",
    "fabian", "facundo", "federico", "felipe", "fernando", "florencia",
    "gabriel", "gabriela", "gerardo", "gildo", "gladys", "graciela", "guillermo", "gustavo",
    "héctor", "hebe", "hernán", "hilda", "horacio", "hugo",
    "ignacio", "itai", "javier", "jonatan", "jorge", "josé", "juan", "juliana", "julio", "julián",
    "karina", "leonardo", "lilia", "lucia", "lucila", "luis",
    "manuel", "marcela", "marcelo", "marcos", "margarita", "maría", "mariano", "mario",
    "martín", "máximo", "mayra", "mercedes", "miguel", "milagro", "mónica", "myriam",
    "néstor", "nicolás", "nilda",
    "ofelia", "omar", "oscar",
    "pablo", "paolo", "patricia",
    "ramiro", "ramón", "raúl", "ricardo", "roberto", "rodolfo", "rogelio", "romina",
    "sabina", "sandra", "santiago", "sergio", "silvina", "soledad",
    "teresa", "tristán",
    "vanesa", "victoria", "víctor",
    "waldo",
    # Añadir más nombres de pila comunes en Argentina
}
# === FIN NOMBRES_COMUNES ===

# --- Funciones Auxiliares ---

def load_data(filepath):
    """Carga datos JSON desde un archivo."""
    if not os.path.exists(filepath):
        print(f"Error: El archivo de entrada '{filepath}' no existe.")
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            # Leer línea por línea para manejar mejor JSONL o JSON muy grandes si fuera necesario
            # Por ahora, asumimos un solo objeto JSON o un array JSON estándar
            data = json.load(f)
        print(f"Datos cargados exitosamente desde '{filepath}'.")
        return data
    except json.JSONDecodeError as e:
        print(f"Error: El archivo '{filepath}' no contiene JSON válido. Error: {e}")
        # Intentar leer como JSON Lines (un JSON por línea) como fallback
        try:
            print("Intentando leer como JSON Lines...")
            data = []
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip(): # Ignorar líneas vacías
                        data.append(json.loads(line))
            print(f"Leído como JSON Lines exitosamente desde '{filepath}'.")
            return data
        except Exception as e_lines:
             print(f"Error al leer como JSON Lines: {e_lines}")
             return None
    except Exception as e:
        print(f"Error inesperado al cargar '{filepath}': {e}")
        return None

def save_data(data, filepath):
    """Guarda datos en un archivo JSON."""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Datos guardados exitosamente en '{filepath}'.")
    except Exception as e:
        print(f"Error al guardar datos en '{filepath}': {e}")

def es_nombre_pila_probable(nombre_texto):
    """Heurística simple para determinar si un texto es probablemente solo un nombre de pila."""
    parts = nombre_texto.split()
    if len(parts) == 1:
        # Comprobar si está en la lista de nombres comunes (ignorando mayúsculas/minúsculas)
        # o si es una palabra corta (podría ser un nombre menos común)
        return parts[0].lower() in NOMBRES_COMUNES # or len(parts[0]) <= 4 # Podríamos ajustar el largo
    return False # Si tiene más de una palabra, no es solo un nombre de pila

def find_and_normalize_persons(article_text, nlp):
    """
    Encuentra entidades de persona, aplica heurística de combinación y normaliza.
    """
    if not article_text or not isinstance(article_text, str):
        return []

    # Pre-procesar texto ligeramente? (ej. quitar saltos de línea excesivos)
    # article_text = re.sub(r'\s*\n\s*', '\n', article_text) # Ejemplo

    doc = nlp(article_text)
    detected_persons_candidates = {} # Usar dict para manejar superposiciones o duplicados iniciales
    processed_token_indices = set() # Para evitar procesar el apellido dos veces

    # Primera pasada: Detectar entidades y aplicar heurística
    for ent in doc.ents:
        if ent.start in processed_token_indices or ent.end - 1 in processed_token_indices:
            continue # Saltar si algún token de esta entidad ya fue usado en una combinación

        if ent.label_ == "PER":
            person_name_candidate = ent.text.strip()
            start_char, end_char = ent.start_char, ent.end_char # Guardar posición original

            # --- HEURÍSTICA: Comprobar siguiente token ---
            # Verificar si la entidad actual es un nombre de pila probable
            # y si el siguiente token parece un apellido
            next_token_index = ent.end
            if (next_token_index < len(doc) and
                doc[next_token_index].text and # Asegurar que el token tiene texto
                doc[next_token_index].text[0].isupper() and
                not doc[next_token_index].is_sent_start and
                not doc[next_token_index].is_punct and
                len(doc[next_token_index].text) > 1 and # Evitar iniciales solas
                es_nombre_pila_probable(person_name_candidate)):

                # Combinar con el siguiente token (probable apellido)
                apellido_probable = doc[next_token_index].text
                combined_name = f"{person_name_candidate} {apellido_probable}"

                # Verificar si la combinación está en nuestro mapeo o parece válida
                if combined_name.lower() in NAME_MAPPING or len(combined_name.split()) == 2 : # Aceptar si está mapeado o tiene 2 partes
                     # print(f"  -> Heurística aplicada: '{ent.text}' + '{apellido_probable}' -> '{combined_name}'")
                     person_name_candidate = combined_name
                     # Marcar los índices de los tokens usados para evitar reprocesarlos
                     for i in range(ent.start, next_token_index + 1):
                         processed_token_indices.add(i)
                     end_char = doc[next_token_index].idx + len(doc[next_token_index].text) # Actualizar fin
                # else:
                     # print(f"  -> Heurística: Combinación '{combined_name}' descartada (no en map y no 2 partes).")

            # Guardar candidato con su posición original (start_char) para desambiguar si hay duplicados
            detected_persons_candidates[start_char] = {'text': person_name_candidate, 'end': end_char}
            # Marcar índices originales como procesados también, por si no se combinó
            if start_char not in processed_token_indices:
                 for i in range(ent.start, ent.end):
                      processed_token_indices.add(i)


    # Segunda pasada: Normalización usando NAME_MAPPING
    normalized_persons = set()
    # Iterar sobre los candidatos guardados (el dict maneja superposiciones por inicio)
    for start_char in sorted(detected_persons_candidates.keys()):
         candidate_info = detected_persons_candidates[start_char]
         person_name_candidate = candidate_info['text']

         # Buscar la forma canónica en el mapeo
         canonical_name = NAME_MAPPING.get(person_name_candidate.lower(), person_name_candidate)

         # Filtro final (longitud, no solo dígitos, etc.)
         # Podríamos añadir filtro para excluir entidades contenidas en otras más largas si fuera necesario
         if len(canonical_name) > 3 and not canonical_name.isdigit():
              normalized_persons.add(canonical_name)

    # Tercera pasada: Eliminar subcadenas/nombres de pila si el nombre completo ya está presente
    final_persons = set(normalized_persons)
    to_remove = set()
    person_list = list(normalized_persons) # Lista para comparar pares
    for i in range(len(person_list)):
        for j in range(i + 1, len(person_list)):
            p1 = person_list[i]
            p2 = person_list[j]
            # Verificar si p1 es subcadena de p2 Y p1 parece nombre de pila
            if p1 in p2 and es_nombre_pila_probable(p1) and len(p2.split()) > len(p1.split()):
                to_remove.add(p1)
            # Verificar si p2 es subcadena de p1 Y p2 parece nombre de pila
            elif p2 in p1 and es_nombre_pila_probable(p2) and len(p1.split()) > len(p2.split()):
                to_remove.add(p2)

    final_persons.difference_update(to_remove)

    return list(final_persons)


def calculate_graph_data(articles_data, min_appearances):
    """Calcula los nodos y aristas para el grafo, filtrando por apariciones."""
    print(f"\nCalculando datos del grafo (umbral: {min_appearances} apariciones)...")
    person_articles = defaultdict(set)
    article_persons_normalized = {}
    person_counts = defaultdict(int)

    # 1. Contar apariciones y mapear artículos por persona (NORMALIZADA)
    for i, article in enumerate(articles_data):
        article_id = article.get('id', f"articulo_{i}") # Usar ID si existe, sino generar uno
        persons_in_article = article.get('personas_detectadas_normalizadas', [])
        article_persons_normalized[article_id] = persons_in_article
        for person in persons_in_article:
            person_articles[person].add(article_id)
            person_counts[person] += 1 # Contar cada mención normalizada

    # Calcular conteo de artículos únicos por persona (diferente a menciones totales)
    person_unique_article_counts = {person: len(articles) for person, articles in person_articles.items()}
    print(f"Total de personas únicas normalizadas encontradas: {len(person_unique_article_counts)}")

    # 2. Filtrar nodos (personas) basado en el NÚMERO DE ARTÍCULOS ÚNICOS donde aparecen
    filtered_nodes_data = {}
    kept_node_ids = set()
    for person, unique_count in person_unique_article_counts.items():
        if unique_count >= min_appearances:
            filtered_nodes_data[person] = unique_count # Guardamos el conteo de artículos únicos
            kept_node_ids.add(person)
        # else:
            # print(f"  - Excluyendo nodo: {person} (aparece en {unique_count} artículos)")

    print(f"Nodos filtrados para el grafo (>= {min_appearances} artículos): {len(kept_node_ids)}")
    if not kept_node_ids:
        print("Advertencia: Ningún nodo cumple el umbral mínimo. El grafo estará vacío.")
        return {"nodes": [], "edges": []}

    # 3. Calcular co-ocurrencias (aristas) SOLO entre nodos filtrados
    co_occurrences = defaultdict(int)
    for article_id, persons_list_normalized in article_persons_normalized.items():
        # Filtrar la lista de personas de este artículo para incluir solo los nodos que estarán en el grafo
        filtered_persons_in_article = [p for p in persons_list_normalized if p in kept_node_ids]

        # Generar pares únicos ordenados para evitar duplicados (A,B) vs (B,A)
        filtered_persons_in_article.sort()
        for i in range(len(filtered_persons_in_article)):
            for j in range(i + 1, len(filtered_persons_in_article)):
                person1 = filtered_persons_in_article[i]
                person2 = filtered_persons_in_article[j]
                pair = (person1, person2)
                co_occurrences[pair] += 1

    # 4. Formatear datos para Vis.js
    nodes = []
    for person, unique_article_count in filtered_nodes_data.items():
        # Usar el conteo total de MENCIONES para el tamaño del nodo (value)
        # Usar el conteo de ARTÍCULOS ÚNICOS para el título (tooltip)
        total_mentions = person_counts.get(person, unique_article_count) # Fallback por si acaso
        # Escalar tamaño del nodo basado en menciones totales
        node_size = min(10 + total_mentions, 70) # Ajustar escala como prefieras (antes era 50)
        nodes.append({
            "id": person,
            "label": person,
            "value": node_size, # Tamaño basado en menciones totales
            "title": f"Aparece en {unique_article_count} artículos" # Tooltip basado en artículos únicos
        })

    edges = []
    for pair, weight in co_occurrences.items():
        # Filtrar aristas con peso bajo si se desea (ej. weight > 1)
        if weight > 0: # Mantener todas las conexiones por ahora
            edges.append({
                "from": pair[0],
                "to": pair[1],
                "value": weight, # Grosor basado en co-ocurrencias
                "title": f"Juntos en {weight} artículos"
            })

    print(f"Grafo final: {len(nodes)} nodos, {len(edges)} aristas.")
    return {"nodes": nodes, "edges": edges}


# --- Proceso Principal ---
if __name__ == "__main__":
    print(f"Cargando modelo spaCy '{NLP_MODEL}'...")
    try:
        # Deshabilitar componentes no necesarios puede acelerar un poco
        nlp = spacy.load(NLP_MODEL, disable=['parser', 'lemmatizer']) # Mantenemos NER y tagger (usado por algunas heurísticas)
        print("Modelo spaCy cargado.")
    except OSError:
        print(f"Error: Modelo '{NLP_MODEL}' no encontrado.")
        print(f"Asegúrate de haberlo descargado ejecutando:")
        print(f"python -m spacy download {NLP_MODEL}")
        exit()
    except Exception as e:
        print(f"Error inesperado al cargar el modelo spaCy: {e}")
        exit()

    articles = load_data(INPUT_JSON_FILE)

    if articles and isinstance(articles, list): # Asegurar que sea una lista
        processed_articles = []
        mentions_by_date_agg = defaultdict(lambda: defaultdict(int)) # [político][fecha] = cantidad

        print(f"\n--- Iniciando Procesamiento de {len(articles)} Artículos ---")
        for i, article in enumerate(articles):
            # Validar que 'article' sea un diccionario y tenga 'cuerpo'
            if not isinstance(article, dict):
                 print(f"  Saltando item {i+1}: No es un diccionario.")
                 continue
            print(f"  Procesando artículo {i+1}/{len(articles)} (ID: {article.get('id', 'N/A')})...")
            text_to_process = article.get('cuerpo', '') # Usar 'cuerpo' consistentemente
            if not text_to_process:
                 print("    Advertencia: Artículo sin 'cuerpo', no se detectarán personas.")
                 normalized_persons = []
            else:
                 # Usar la función mejorada
                 normalized_persons = find_and_normalize_persons(text_to_process, nlp)

            # Añadir la lista normalizada al diccionario del artículo
            article['personas_detectadas_normalizadas'] = normalized_persons
            # print(f"    -> Personas finales: {normalized_persons}") # Log opcional

            # --- Registrar menciones por fecha ---
            # Usar 'fecha' o 'fecha_hora', asegurándose de que el formato sea consistente
            # Asumiendo 'fecha' con formato 'dd-mm-aaaa' según el código anterior
            article_date_str = article.get('fecha')
            if article_date_str:
                try:
                    # Validar formato dd-mm-aaaa antes de hacer split
                    if re.match(r"^\d{1,2}-\d{1,2}-\d{4}$", article_date_str.strip()):
                        day, month, year = article_date_str.strip().split('-')
                        # Asegurar formato YYYY-MM-DD para consistencia
                        formatted_date = f"{year}-{int(month):02d}-{int(day):02d}"
                        for person in normalized_persons:
                            mentions_by_date_agg[person][formatted_date] += 1
                    else:
                         print(f"      [!] Advertencia: Formato de fecha inesperado '{article_date_str}', no se registrará mención.")
                except Exception as e:
                    print(f"      [!] Error procesando fecha '{article_date_str}' o registrando mención: {e}")
            # else:
                # print("      Advertencia: Artículo sin 'fecha'.")


            processed_articles.append(article)
            # Limpiar memoria si los artículos son muy grandes?
            # del text_to_process
            # gc.collect() # Requiere 'import gc'

        print("\n--- Procesamiento de Artículos Completado ---")

        # Guardar artículos procesados con la lista de personas normalizadas
        save_data(processed_articles, OUTPUT_JSON_FILE)

        # Calcular y guardar los datos específicos para el grafo
        graph_output_data = calculate_graph_data(processed_articles, MIN_ARTICLE_APPEARANCES_GRAPH)
        save_data(graph_output_data, GRAPH_JSON_FILE)

        # Guardar datos de menciones agregadas por fecha
        save_data(mentions_by_date_agg, MENTIONS_JSON_FILE)
        print(f"Archivo '{MENTIONS_JSON_FILE}' generado.")

    else:
        print("No se cargaron artículos válidos o el archivo de entrada no es una lista.")

    print("\n--- Proceso Finalizado ---")