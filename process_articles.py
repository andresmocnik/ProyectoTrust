
import spacy
import json
import os # Para manejo de archivos

# --- Configuración ---
INPUT_JSON_FILE = 'noticiasjson.json'
OUTPUT_JSON_FILE = 'noticias_procesadas.json' # Nuevo archivo de salida
# Carga el modelo grande en español de spaCy
# Asegúrate de haberlo descargado con: python -m spacy download es_core_news_lg
NLP_MODEL = 'es_core_news_lg'

# --- Funciones ---
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
            # indent=4 para que sea legible, ensure_ascii=False para caracteres españoles
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Datos procesados guardados exitosamente en '{filepath}'.")
    except Exception as e:
        print(f"Error al guardar datos en '{filepath}': {e}")

def find_persons_in_article(article_text, nlp):
    """Encuentra entidades de persona en un texto usando spaCy."""
    if not article_text or not isinstance(article_text, str):
        return [] # Retorna lista vacía si no hay texto o no es string

    doc = nlp(article_text)
    persons = set() # Usamos un set para evitar duplicados dentro del mismo artículo
    for ent in doc.ents:
        if ent.label_ == "PER": # Filtra solo las entidades etiquetadas como PERSONA
            # Limpiamos un poco el nombre (quitar espacios extra al inicio/final)
            person_name = ent.text.strip()
            # Opcional: Filtrar nombres muy cortos o potencialmente problemáticos
            if len(person_name) > 2 and not person_name.isdigit():
                 persons.add(person_name)
    return list(persons) # Convertimos el set a lista para el JSON

# --- Proceso Principal ---
if __name__ == "__main__":
    print(f"Cargando modelo spaCy '{NLP_MODEL}'...")
    try:
        # Deshabilitar componentes no necesarios puede acelerar el proceso si solo necesitas NER
        # nlp = spacy.load(NLP_MODEL, disable=['parser', 'tagger']) # Descomentar si quieres probar
        nlp = spacy.load(NLP_MODEL)
        print("Modelo cargado.")
    except OSError:
        print(f"Error: Modelo '{NLP_MODEL}' no encontrado.")
        print(f"Asegúrate de haberlo descargado ejecutando:")
        print(f"python -m spacy download {NLP_MODEL}")
        exit() # Salir si no se puede cargar el modelo
    except Exception as e:
        print(f"Error inesperado al cargar el modelo spaCy: {e}")
        exit()


    articles = load_data(INPUT_JSON_FILE)

    if articles:
        processed_articles = []
        print(f"Procesando {len(articles)} artículos...")

        for i, article in enumerate(articles):
            print(f"  Procesando artículo {i+1}/{len(articles)} (ID: {article.get('id', 'N/A')})...")
            # Usamos el campo 'cuerpo' para el análisis. Asegúrate que este campo
            # contenga el texto limpio del artículo. Si 'cuerpo_raw_html' es mejor
            # fuente, necesitarías limpiarlo de HTML antes de pasarlo a spaCy.
            text_to_process = article.get('cuerpo', '')

            # Encuentra las personas en el texto del artículo
            detected_persons = find_persons_in_article(text_to_process, nlp)

            # Añade la lista de personas detectadas al diccionario del artículo
            # NO MODIFICAMOS EL ORIGINAL, creamos una copia o añadimos al vuelo
            article['personas_detectadas'] = detected_persons
            processed_articles.append(article) # Agregamos el artículo modificado a la nueva lista

        print("Procesamiento completado.")
        # Guarda la lista completa de artículos procesados en el nuevo archivo
        save_data(processed_articles, OUTPUT_JSON_FILE)
    else:
        print("No se procesaron artículos debido a errores previos.")