import spacy
import json
import os
from collections import defaultdict
import re # Importar módulo de expresiones regulares
from pysentimiento import create_analyzer # MODIFICADO: Importar create_analyzer

# --- Configuración ---
INPUT_JSON_FILE = 'noticiasjson.json'       # Archivo de entrada con los artículos
OUTPUT_JSON_FILE = 'noticias_procesadas.json' # Archivo de salida con personas normalizadas y sentimiento
GRAPH_JSON_FILE = 'graph_data.json'         # Archivo para datos del grafo
MENTIONS_JSON_FILE = 'menciones_por_fecha.json' # Archivo para menciones por fecha
NLP_MODEL = 'es_core_news_lg'               # Modelo spaCy para español
MIN_ARTICLE_APPEARANCES_GRAPH = 5           # Umbral para incluir nodos en el grafo
# MODIFICADO: Configuración para análisis de sentimiento
SENTIMENT_MODEL_NAME = "pysentimiento/robertuito-sentiment-analysis" # Modelo de sentimiento en español

# === Diccionario de Mapeo de Nombres (¡IMPORTANTE AJUSTAR!) ===
# (Tu NAME_MAPPING existente va aquí - sin cambios)
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
     "daniel salomone": "Daniel Salomone", # Añadido del ejemplo
    # ... ¡AÑADIR MUCHOS MÁS DE TU LISTA Y SUS VARIANTES! ...
}
# === FIN NAME_MAPPING ===

# === Lista de Nombres Comunes (¡AÑADIR MÁS!) ===
# (Tu NOMBRES_COMUNES existente va aquí - sin cambios)
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
            data = json.load(f)
        print(f"Datos cargados exitosamente desde '{filepath}'.")
        return data
    except json.JSONDecodeError as e:
        print(f"Error: El archivo '{filepath}' no contiene JSON válido. Error: {e}")
        try:
            print("Intentando leer como JSON Lines...")
            data = []
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
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
    parts = nombre_texto.split()
    if len(parts) == 1:
        return parts[0].lower() in NOMBRES_COMUNES
    return False

def find_and_normalize_persons(article_text, nlp):
    if not article_text or not isinstance(article_text, str):
        return []
    doc = nlp(article_text)
    detected_persons_candidates = {}
    processed_token_indices = set()
    for ent in doc.ents:
        if ent.start in processed_token_indices or ent.end - 1 in processed_token_indices:
            continue
        if ent.label_ == "PER":
            person_name_candidate = ent.text.strip()
            start_char, end_char = ent.start_char, ent.end_char
            next_token_index = ent.end
            if (next_token_index < len(doc) and
                doc[next_token_index].text and
                doc[next_token_index].text[0].isupper() and
                not doc[next_token_index].is_sent_start and
                not doc[next_token_index].is_punct and
                len(doc[next_token_index].text) > 1 and
                es_nombre_pila_probable(person_name_candidate)):
                apellido_probable = doc[next_token_index].text
                combined_name = f"{person_name_candidate} {apellido_probable}"
                if combined_name.lower() in NAME_MAPPING or len(combined_name.split()) == 2 :
                     person_name_candidate = combined_name
                     for i in range(ent.start, next_token_index + 1):
                         processed_token_indices.add(i)
                     end_char = doc[next_token_index].idx + len(doc[next_token_index].text)
            detected_persons_candidates[start_char] = {'text': person_name_candidate, 'end': end_char}
            if start_char not in processed_token_indices:
                 for i in range(ent.start, ent.end):
                      processed_token_indices.add(i)
    normalized_persons = set()
    for start_char in sorted(detected_persons_candidates.keys()):
         candidate_info = detected_persons_candidates[start_char]
         person_name_candidate = candidate_info['text']
         canonical_name = NAME_MAPPING.get(person_name_candidate.lower(), person_name_candidate)
         if len(canonical_name) > 3 and not canonical_name.isdigit():
              normalized_persons.add(canonical_name)
    final_persons = set(normalized_persons)
    to_remove = set()
    person_list = list(normalized_persons)
    for i in range(len(person_list)):
        for j in range(i + 1, len(person_list)):
            p1 = person_list[i]
            p2 = person_list[j]
            if p1 in p2 and es_nombre_pila_probable(p1) and len(p2.split()) > len(p1.split()):
                to_remove.add(p1)
            elif p2 in p1 and es_nombre_pila_probable(p2) and len(p1.split()) > len(p2.split()):
                to_remove.add(p2)
    final_persons.difference_update(to_remove)
    return list(final_persons)

# (Tu función calculate_graph_data va aquí - sin cambios)
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

    print(f"Nodos filtrados para el grafo (>= {min_appearances} artículos): {len(kept_node_ids)}")
    if not kept_node_ids:
        print("Advertencia: Ningún nodo cumple el umbral mínimo. El grafo estará vacío.")
        return {"nodes": [], "edges": []}

    # 3. Calcular co-ocurrencias (aristas) SOLO entre nodos filtrados
    co_occurrences = defaultdict(int)
    for article_id, persons_list_normalized in article_persons_normalized.items():
        filtered_persons_in_article = [p for p in persons_list_normalized if p in kept_node_ids]
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
        total_mentions = person_counts.get(person, unique_article_count)
        node_size = min(10 + total_mentions, 70)
        nodes.append({
            "id": person,
            "label": person,
            "value": node_size,
            "title": f"Aparece en {unique_article_count} artículos"
        })

    edges = []
    for pair, weight in co_occurrences.items():
        if weight > 0:
            edges.append({
                "from": pair[0],
                "to": pair[1],
                "value": weight,
                "title": f"Juntos en {weight} artículos"
            })

    print(f"Grafo final: {len(nodes)} nodos, {len(edges)} aristas.")
    return {"nodes": nodes, "edges": edges}


# --- Proceso Principal ---
if __name__ == "__main__":
    print(f"Cargando modelo spaCy '{NLP_MODEL}'...")
    try:
        nlp = spacy.load(NLP_MODEL, disable=['parser', 'lemmatizer'])
        print("Modelo spaCy cargado.")
    except OSError:
        print(f"Error: Modelo '{NLP_MODEL}' no encontrado.")
        print(f"Asegúrate de haberlo descargado ejecutando:")
        print(f"python -m spacy download {NLP_MODEL}")
        exit()
    except Exception as e:
        print(f"Error inesperado al cargar el modelo spaCy: {e}")
        exit()

    # MODIFICADO: Cargar el analizador de sentimiento
    print(f"Cargando modelo de análisis de sentimiento '{SENTIMENT_MODEL_NAME}'...")
    try:
        # Usamos 'sentiment' como task. Para otros idiomas o tasks, consultar la doc de pysentimiento
        sentiment_analyzer = create_analyzer(task="sentiment", lang="es")
        print("Modelo de sentimiento cargado.")
    except Exception as e:
        print(f"Error al cargar el modelo de sentimiento: {e}")
        print("Asegúrate de tener 'pysentimiento' y 'torch' instalados.")
        exit()


    articles = load_data(INPUT_JSON_FILE)

    if articles and isinstance(articles, list):
        processed_articles = []
        mentions_by_date_agg = defaultdict(lambda: defaultdict(int))

        print(f"\n--- Iniciando Procesamiento de {len(articles)} Artículos ---")
        for i, article in enumerate(articles):
            if not isinstance(article, dict):
                 print(f"  Saltando item {i+1}: No es un diccionario.")
                 continue
            print(f"  Procesando artículo {i+1}/{len(articles)} (ID: {article.get('id', 'N/A')})...")
            text_to_process = article.get('cuerpo', '')

            # --- Detección y Normalización de Personas ---
            if not text_to_process:
                 print("    Advertencia: Artículo sin 'cuerpo', no se detectarán personas ni sentimiento.")
                 normalized_persons = []
                 sentiment_scores = None # MODIFICADO: Sentimiento nulo si no hay texto
            else:
                 normalized_persons = find_and_normalize_persons(text_to_process, nlp)

                 # --- MODIFICADO: Análisis de Sentimiento ---
                 try:
                     # pysentimiento puede manejar textos largos, pero considera truncar si son EXTREMADAMENTE largos
                     # o si quieres analizar solo un resumen/primeros párrafos para velocidad.
                     # Para artículos de noticias típicos, debería estar bien.
                     prediction = sentiment_analyzer.predict(text_to_process)
                     sentiment_scores = {
                         "etiqueta": prediction.output, # POS, NEG, NEU
                         "positivo": prediction.probas.get("POS", 0.0),
                         "negativo": prediction.probas.get("NEG", 0.0),
                         "neutral": prediction.probas.get("NEU", 0.0)
                     }
                     # print(f"    -> Sentimiento: {sentiment_scores['etiqueta']} (Pos: {sentiment_scores['positivo']:.2f}, Neg: {sentiment_scores['negativo']:.2f}, Neu: {sentiment_scores['neutral']:.2f})")
                 except Exception as e:
                     print(f"    [!] Error al analizar sentimiento: {e}")
                     sentiment_scores = None # Guardar null si hay error

            article['personas_detectadas_normalizadas'] = normalized_persons
            article['sentimiento'] = sentiment_scores # MODIFICADO: Añadir sentimiento al artículo

            # --- Registrar menciones por fecha ---
            article_date_str = article.get('fecha')
            if article_date_str:
                try:
                    if re.match(r"^\d{1,2}-\d{1,2}-\d{4}$", article_date_str.strip()):
                        day, month, year = article_date_str.strip().split('-')
                        formatted_date = f"{year}-{int(month):02d}-{int(day):02d}"
                        for person in normalized_persons:
                            mentions_by_date_agg[person][formatted_date] += 1
                    else:
                         print(f"      [!] Advertencia: Formato de fecha inesperado '{article_date_str}', no se registrará mención.")
                except Exception as e:
                    print(f"      [!] Error procesando fecha '{article_date_str}' o registrando mención: {e}")

            processed_articles.append(article)

        print("\n--- Procesamiento de Artículos Completado ---")

        save_data(processed_articles, OUTPUT_JSON_FILE)
        graph_output_data = calculate_graph_data(processed_articles, MIN_ARTICLE_APPEARANCES_GRAPH)
        save_data(graph_output_data, GRAPH_JSON_FILE)
        save_data(mentions_by_date_agg, MENTIONS_JSON_FILE)
        print(f"Archivo '{MENTIONS_JSON_FILE}' generado.")

    else:
        print("No se cargaron artículos válidos o el archivo de entrada no es una lista.")

    print("\n--- Proceso Finalizado ---")