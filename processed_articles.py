import spacy
import json
import os
from collections import defaultdict, Counter
import re
from pysentimiento import create_analyzer

# --- Configuración ---
INPUT_JSON_FILE = 'noticiasjson.json'
OUTPUT_JSON_FILE = 'noticias_procesadas.json'
GRAPH_JSON_FILE = 'graph_data.json'
MENTIONS_JSON_FILE = 'menciones_por_fecha.json'
POLITICIANS_DB_FILE = 'politicians_db.json'
NLP_MODEL = 'es_core_news_lg'
MIN_ARTICLE_APPEARANCES_GRAPH = 5 
SENTIMENT_MODEL_NAME = "pysentimiento/robertuito-sentiment-analysis"

NAME_MAPPING_MANUAL = {
    "CFK": "Cristina Fernández de Kirchner",
    "Cristina Kirchner": "Cristina Fernández de Kirchner",
    "Wado de Pedro": "Eduardo “Wado” de Pedro",
    "Eduardo de Pedro": "Eduardo “Wado” de Pedro",
    "Wado": "Eduardo “Wado” de Pedro",
    "Fernández, Alberto": "Alberto Fernández",
}

def load_politicians_db(filepath):
    if not os.path.exists(filepath):
        print(f"Error: El archivo de base de datos de políticos '{filepath}' no existe.")
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list) and all(isinstance(p, dict) and 'name' in p for p in data):
            return data
        else:
            print(f"Error: El archivo '{filepath}' no tiene el formato esperado (lista de objetos con 'name').")
            return []
    except Exception as e:
        print(f"Error al cargar o parsear '{filepath}': {e}")
        return []

def generate_name_mapping(politicians_list, manual_mapping):
    generated_mapping = {}
    politicians_by_lastname_simple = defaultdict(list)
    politicians_by_lastname_compound = defaultdict(list)

    for politician in politicians_list:
        canonical_name = politician['name'].strip()
        if not canonical_name:
            continue
        parts = canonical_name.split()
        if len(parts) >= 1:
            if len(parts) > 1:
                simple_lastname = parts[-1]
                politicians_by_lastname_simple[simple_lastname].append(canonical_name)
                if len(parts) > 2:
                    compound_lastname_two_words = " ".join(parts[-2:])
                    politicians_by_lastname_compound[compound_lastname_two_words].append(canonical_name)

    for lastname, names in politicians_by_lastname_simple.items():
        if len(names) == 1 and lastname != names[0]:
            generated_mapping[lastname] = names[0]

    for lastname, names in politicians_by_lastname_compound.items():
        if len(names) == 1 and lastname != names[0]:
            generated_mapping[lastname] = names[0]
            
    final_mapping = {**generated_mapping, **manual_mapping}
    return final_mapping

politicians_database = load_politicians_db(POLITICIANS_DB_FILE)
NAME_MAPPING = generate_name_mapping(politicians_database, NAME_MAPPING_MANUAL)
VALID_CANONICAL_NAMES = set(NAME_MAPPING.values())
for p_obj in politicians_database:
    if p_obj and 'name' in p_obj and p_obj['name'].strip():
        VALID_CANONICAL_NAMES.add(p_obj['name'].strip())

# --- INICIO DE BLOQUE DE INSPECCIÓN ---
print("-" * 50)
print("INSPECCIÓN DE MAPEADOS Y CANÓNICOS:")
if politicians_database: 
    print(f"Base de datos de políticos cargada. Contiene {len(politicians_database)} entradas.")
print(f"Entrada para 'Lemoine' en NAME_MAPPING: {NAME_MAPPING.get('Lemoine')}")
print(f"Entrada para 'Villarruel' en NAME_MAPPING: {NAME_MAPPING.get('Villarruel')}")
print(f"'Lilia Lemoine' en VALID_CANONICAL_NAMES: {'Lilia Lemoine' in VALID_CANONICAL_NAMES}")
print(f"'Victoria Villarruel' en VALID_CANONICAL_NAMES: {'Victoria Villarruel' in VALID_CANONICAL_NAMES}")
# print(f"Primeras 20 entradas de NAME_MAPPING: {dict(list(NAME_MAPPING.items())[:20])}")
# print(f"Primeros 20 nombres en VALID_CANONICAL_NAMES: {list(VALID_CANONICAL_NAMES)[:20]}")
print(f"Total de nombres canónicos válidos: {len(VALID_CANONICAL_NAMES)}")
print(f"Total de entradas en NAME_MAPPING: {len(NAME_MAPPING)}")
print("-" * 50)
# --- FIN DE BLOQUE DE INSPECCIÓN ---

NOMBRES_COMUNES = {
    "Alberto", "Alejandra", "Alejandro", "Alfredo", "Amado", "Anabel", "Anibal",
    "Andrés", "Antonio", "Ariel", "Armando", "Axel", "Beatriz", "Carlos", "Cecilia",
    "Celeste", "Christian", "Claudio", "Cristina", "Daniel", "Damián", "Diego",
    "Diana", "Domingo", "Eduardo", "Elena", "Elisa", "Emilio", "Esteban", "Estela",
    "Eva", "Fabian", "Facundo", "Federico", "Felipe", "Fernando", "Florencia",
    "Gabriel", "Gabriela", "Gerardo", "Gildo", "Gladys", "Graciela", "Guillermo", "Gustavo",
    "Héctor", "Hebe", "Hernán", "Hilda", "Horacio", "Hugo", "Ignacio", "Itai",
    "Javier", "Jonatan", "Jorge", "José", "Juan", "Juliana", "Julio", "Julián",
    "Karina", "Leonardo", "Lilia", "Lucia", "Lucila", "Luis", "Manuel", "Marcela",
    "Marcelo", "Marcos", "Margarita", "María", "Mariano", "Mario", "Martín", "Máximo",
    "Mayra", "Mercedes", "Miguel", "Milagro", "Mónica", "Myriam", "Néstor", "Nicolás",
    "Nilda", "Ofelia", "Omar", "Oscar", "Pablo", "Paolo", "Patricia", "Ramiro",
    "Ramón", "Raúl", "Ricardo", "Roberto", "Rodolfo", "Rogelio", "Romina", "Sabina",
    "Sandra", "Santiago", "Sergio", "Silvina", "Soledad", "Teresa", "Tristán",
    "Vanesa", "Victoria", "Víctor", "Waldo",
}

def load_data(filepath):
    if not os.path.exists(filepath): print(f"Error: '{filepath}' no existe."); return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f: data = json.load(f)
        print(f"Datos cargados desde '{filepath}'.")
        return data
    except json.JSONDecodeError as e_json:
        # print(f"Error JSON en '{filepath}': {e_json}. Intentando leer como JSON Lines...") # Opcional
        try:
            data_list = []
            with open(filepath, 'r', encoding='utf-8') as f_lines:
                for line in f_lines:
                    if line.strip(): data_list.append(json.loads(line))
            # print(f"Leído como JSON Lines desde '{filepath}'.") # Opcional
            return data_list
        except Exception as e_lines: print(f"Error al leer como JSON Lines: {e_lines}"); return None
    except Exception as e_gen: print(f"Error inesperado al cargar '{filepath}': {e_gen}"); return None

def save_data(data, filepath):
    try:
        if os.path.dirname(filepath): os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f: json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Datos guardados en '{filepath}'.")
    except Exception as e: print(f"Error al guardar en '{filepath}': {e}")

def es_nombre_pila_probable(nombre_texto):
    return len(nombre_texto.split()) == 1 and nombre_texto in NOMBRES_COMUNES

def find_and_normalize_persons(article_text, nlp):
    # print(f"\n--- find_and_normalize_persons: INICIO para artículo ---") # Descomentar para debug profundo
    if not article_text or not isinstance(article_text, str): return []
    doc = nlp(article_text)
    
    detected_candidates_info = {}
    processed_token_spans = set()

    for ent in doc.ents:
        current_token_span_tuple = (ent.start, ent.end)
        already_processed = False
        for p_span_start, p_span_end in processed_token_spans:
            if max(ent.start, p_span_start) < min(ent.end, p_span_end):
                already_processed = True; break
        if already_processed: continue

        if ent.label_ == "PER":
            original_text_from_spacy = ent.text.strip()
            current_text_for_mapping = original_text_from_spacy
            current_start_char, current_end_char = ent.start_char, ent.end_char
            current_ent_start_token, current_ent_end_token = ent.start, ent.end

            next_token_idx_in_doc = ent.end
            if (next_token_idx_in_doc < len(doc) and doc[next_token_idx_in_doc].text and
                doc[next_token_idx_in_doc].text[0].isupper() and not doc[next_token_idx_in_doc].is_sent_start and
                not doc[next_token_idx_in_doc].is_punct and len(doc[next_token_idx_in_doc].text) > 1 and
                es_nombre_pila_probable(original_text_from_spacy)):
                apellido_probable = doc[next_token_idx_in_doc].text
                combined_name_heuristic = f"{original_text_from_spacy} {apellido_probable}"
                if combined_name_heuristic in NAME_MAPPING or \
                   (len(combined_name_heuristic.split()) == 2 and es_nombre_pila_probable(original_text_from_spacy)):
                     current_text_for_mapping = combined_name_heuristic
                     current_end_char = doc[next_token_idx_in_doc].idx + len(doc[next_token_idx_in_doc].text)
                     current_ent_end_token = next_token_idx_in_doc + 1
            
            # Chequeo de superposición antes de añadir (prioriza el primero encontrado si hay colisión de start_char)
            if current_start_char not in detected_candidates_info:
                 detected_candidates_info[current_start_char] = {
                    'text_for_mapping': current_text_for_mapping,
                    'start_char': current_start_char,
                    'end_char': current_end_char
                }
            processed_token_spans.add((current_ent_start_token, current_ent_end_token))
    
    final_entities_with_info = []
    for start_char_key in sorted(detected_candidates_info.keys()):
         candidate_data = detected_candidates_info[start_char_key]
         text_to_normalize = candidate_data['text_for_mapping']
         normalized_name = NAME_MAPPING.get(text_to_normalize, text_to_normalize)
         if normalized_name in VALID_CANONICAL_NAMES:
              final_entities_with_info.append({
                  "text_original_en_articulo": text_to_normalize,
                  "nombre_normalizado": normalized_name,
                  "start_char": candidate_data['start_char'],
                  "end_char": candidate_data['end_char']
              })
    
    if not final_entities_with_info: return []
    current_normalized_names = {info['nombre_normalizado'] for info in final_entities_with_info}
    names_to_remove = set()
    list_norm_names = list(current_normalized_names)
    for i in range(len(list_norm_names)):
        for j in range(len(list_norm_names)):
            if i == j: continue
            p1, p2 = list_norm_names[i], list_norm_names[j]
            if p1 in p2 and p1 != p2 and es_nombre_pila_probable(p1) and len(p2.split()) > len(p1.split()):
                names_to_remove.add(p1)
    
    result_final = [info for info in final_entities_with_info if info['nombre_normalizado'] not in names_to_remove]
    # print(f"    find_and_normalize_persons devolviendo: {result_final}") # Descomentar para debug profundo
    return result_final

def calculate_graph_data(articles_data, min_appearances):
    person_articles = defaultdict(set)
    article_persons_map = {} 
    person_counts = defaultdict(int)
    for i, article_item in enumerate(articles_data):
        article_id = article_item.get('id', f"articulo_{i}")
        entities_info = article_item.get('entities_in_article', [])
        persons_in_article = list(set([info['nombre_normalizado'] for info in entities_info]))
        article_persons_map[article_id] = persons_in_article
        for person in persons_in_article:
            person_articles[person].add(article_id)
            person_counts[person] += 1
    person_unique_counts = {p: len(arts) for p, arts in person_articles.items()}
    filtered_nodes = {p:c for p,c in person_unique_counts.items() if c >= min_appearances}
    kept_ids = set(filtered_nodes.keys())
    if not kept_ids: print("Advertencia: Grafo vacío."); return {"nodes": [], "edges": []}
    co_occur = defaultdict(int)
    for article_id, persons_list in article_persons_map.items():
        filtered_p = sorted([p for p in persons_list if p in kept_ids])
        for i in range(len(filtered_p)):
            for j in range(i + 1, len(filtered_p)):
                co_occur[(filtered_p[i], filtered_p[j])] += 1
    nodes = [{"id": p,"label": p,"value":min(10 + person_counts.get(p,c),70),"title":f"Aparece en {c} artículos"} for p,c in filtered_nodes.items()]
    edges = [{"from":pair[0],"to":pair[1],"value":w,"title":f"Juntos en {w} artículos"} for pair,w in co_occur.items() if w > 0]
    return {"nodes": nodes, "edges": edges}

if __name__ == "__main__":
    print(f"Cargando modelo spaCy '{NLP_MODEL}'...")
    try:
        nlp = spacy.load(NLP_MODEL, disable=['parser', 'lemmatizer'])
        print("Modelo spaCy cargado.")
    except OSError: print(f"Error: Modelo '{NLP_MODEL}' no encontrado. Descárgalo: python -m spacy download {NLP_MODEL}"); exit()
    except Exception as e_spacy: print(f"Error al cargar spaCy: {e_spacy}"); exit()

    print(f"Cargando modelo de sentimiento '{SENTIMENT_MODEL_NAME}'...")
    try:
        sentiment_analyzer = create_analyzer(task="sentiment", lang="es")
        print("Modelo de sentimiento cargado.")
    except Exception as e_sentiment: print(f"Error al cargar modelo de sentimiento: {e_sentiment}"); exit()

    articles_input = load_data(INPUT_JSON_FILE)
    print(f"DEBUG - Carga inicial: Tipo de articles_input: {type(articles_input)}, Longitud si lista: {len(articles_input) if isinstance(articles_input, list) else 'N/A'}")

    if not articles_input or not isinstance(articles_input, list) or len(articles_input) == 0:
        print("Error crítico: No se cargaron artículos o el archivo está vacío. Saliendo."); exit()

    processed_articles_output = []
    mentions_by_date_agg = defaultdict(lambda: defaultdict(int))

    DEBUG_SINGLE_ARTICLE = True 
    TARGET_ARTICLE_ID_OR_INDEX = "ID_O_INDICE_DEL_ARTICULO_DE_PRUEBA" # <<--- REEMPLAZA ESTO

    articles_to_process_in_loop = []
    article_to_debug_found_flag = False # Para saber si el artículo de debug se encontró

    if DEBUG_SINGLE_ARTICLE:
        temp_article_to_debug = None
        if isinstance(TARGET_ARTICLE_ID_OR_INDEX, str):
            for art_item_debug in articles_input:
                if art_item_debug.get("id") == TARGET_ARTICLE_ID_OR_INDEX: temp_article_to_debug = art_item_debug; break
        elif isinstance(TARGET_ARTICLE_ID_OR_INDEX, int) and 0 <= TARGET_ARTICLE_ID_OR_INDEX < len(articles_input):
            temp_article_to_debug = articles_input[TARGET_ARTICLE_ID_OR_INDEX]
        
        if temp_article_to_debug:
            print(f"\n--- MODO DEBUG: PROCESANDO SOLO ARTÍCULO (ID/Índice: {TARGET_ARTICLE_ID_OR_INDEX}) ---")
            articles_to_process_in_loop = [temp_article_to_debug]
            article_to_debug_found_flag = True
        else:
            print(f"ADVERTENCIA MODO DEBUG: No se encontró '{TARGET_ARTICLE_ID_OR_INDEX}'. Se procesarán todos los artículos.")
            articles_to_process_in_loop = articles_input
            # DEBUG_SINGLE_ARTICLE se mantiene True, pero article_to_debug_found_flag es False
    else:
        articles_to_process_in_loop = articles_input
        print(f"\n--- Iniciando Procesamiento de {len(articles_to_process_in_loop)} Artículos ---")

    for i, article_data_item_original in enumerate(articles_to_process_in_loop):
        article_data_item = article_data_item_original.copy()
        if not DEBUG_SINGLE_ARTICLE or article_to_debug_found_flag :
            if not DEBUG_SINGLE_ARTICLE:
                 print(f"  Procesando artículo {i+1}/{len(articles_to_process_in_loop)} (ID: {article_data_item.get('id', 'N/A')})...")
        
        if not isinstance(article_data_item, dict):
             print(f"  Saltando item {i+1}: No es un diccionario."); continue
        
        text_to_process = article_data_item.get('cuerpo', '')
        entities_info_list_for_article = []
        sentiment_scores_dict = None

        if not text_to_process:
             if DEBUG_SINGLE_ARTICLE and article_to_debug_found_flag: print("    Artículo de depuración sin 'cuerpo'.")
        else:
             entities_info_list_for_article = find_and_normalize_persons(text_to_process, nlp)
             try:
                 prediction = sentiment_analyzer.predict(text_to_process)
                 sentiment_scores_dict = {"etiqueta": prediction.output, "positivo": prediction.probas.get("POS", 0.0), "negativo": prediction.probas.get("NEG", 0.0), "neutral": prediction.probas.get("NEU", 0.0)}
             except Exception as e_predict:
                 if DEBUG_SINGLE_ARTICLE and article_to_debug_found_flag: print(f"    [!] Error al analizar sentimiento (DEBUG): {e_predict}")
                 sentiment_scores_dict = None
        
        article_data_item['entities_in_article'] = entities_info_list_for_article
        article_data_item['sentimiento'] = sentiment_scores_dict
        
        normalized_names_for_stats = list(set([info['nombre_normalizado'] for info in entities_info_list_for_article]))
        article_date_str = article_data_item.get('fecha')
        if article_date_str:
            try:
                if re.match(r"^\d{1,2}-\d{1,2}-\d{4}$", article_date_str.strip()):
                    day, month, year = article_date_str.strip().split('-')
                    formatted_date = f"{year}-{int(month):02d}-{int(day):02d}"
                    for person_name in normalized_names_for_stats:
                        mentions_by_date_agg[person_name][formatted_date] += 1
            except Exception: pass
        
        processed_articles_output.append(article_data_item)

    if not processed_articles_output:
        print("No se procesaron artículos (processed_articles_output está vacío). No se guardará nada.")
    elif DEBUG_SINGLE_ARTICLE and article_to_debug_found_flag:
         print(f"\n--- FIN MODO DEBUG: 'entities_in_article' para '{TARGET_ARTICLE_ID_OR_INDEX}':")
         if processed_articles_output: # Debería haber uno
            for entity_info in processed_articles_output[0].get('entities_in_article', []): print(f"  {entity_info}")
            save_data(processed_articles_output, "noticia_debug_procesada.json")
            print("Artículo de depuración guardado en noticia_debug_procesada.json")
    else: 
        print(f"\n--- Procesamiento de {len(processed_articles_output)} Artículos Completado ---")
        save_data(processed_articles_output, OUTPUT_JSON_FILE)
        if processed_articles_output :
            print(f"Calculando datos para visualizaciones para {len(processed_articles_output)} artículos...")
            graph_output_data = calculate_graph_data(processed_articles_output, MIN_ARTICLE_APPEARANCES_GRAPH)
            save_data(graph_output_data, GRAPH_JSON_FILE)
            save_data(mentions_by_date_agg, MENTIONS_JSON_FILE)
        else:
            print("No hay artículos procesados para generar grafo o menciones.")
            
    print("\n--- Proceso Finalizado ---")