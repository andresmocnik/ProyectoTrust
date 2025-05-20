import json
from collections import Counter, defaultdict
from datetime import datetime
import re
from urllib.parse import urlparse # Para extraer el medio del link
import spacy # Para extracción de temas (noun chunks)
import os

# Cargar modelo spaCy (más pequeño puede ser suficiente si solo es para noun chunks)
# Si ya lo usas grande en el otro script, considera si necesitas NLP_MODEL aquí o uno más ligero.
try:
    nlp = spacy.load("es_core_news_sm") # Modelo más pequeño para noun chunks
except OSError:
    print("Descargando modelo es_core_news_sm...")
    spacy.cli.download("es_core_news_sm")
    nlp = spacy.load("es_core_news_sm")


PROCESSED_ARTICLES_FILE = 'noticias_procesadas.json'
OUTPUT_DIR = 'dashboard_data' # Directorio para guardar los JSONs del dashboard

# Palabras a ignorar para la extracción de temas (personalizar según necesidad)
STOP_WORDS_TEMAS = {
    "gobierno", "presidente", "nacional", "argentina", "país", "ley", "proyecto",
    "diputados", "senadores", "congreso", "política", "economía", "justicia",
    # Nombres de políticos ya capturados por NER (aunque noun_chunks puede incluirlos)
    # Añadir palabras muy comunes y poco informativas del contexto de noticias
    "ser", "haber", "estar", "tener", "hacer", "poder", "decir", "ir", "ver", "dar",
    "saber", "querer", "llegar", "pasar", "deber", "poner", "parecer", "quedar",
    "creer", "hablar", "llevar", "dejar", "seguir", "encontrar", "llamar",
    "día", "mes", "año", "semana", "hoy", "ayer", "mañana",
    # Artículos, preposiciones, etc. (spaCy ya maneja algunos, pero podemos reforzar)
    "el", "la", "los", "las", "un", "una", "unos", "unas", "al", "del",
    "de", "en", "a", "por", "para", "con", "sin", "sobre", "tras", "desde", "hasta"
}


def load_data(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Datos guardados en {filepath}")

def extract_domain(link):
    try:
        parsed_uri = urlparse(link)
        domain = '{uri.netloc}'.format(uri=parsed_uri)
        # Simplificar dominios comunes
        if domain.startswith('www.'):
            domain = domain[4:]
        # Podrías tener un mapeo más específico si es necesario
        # ej. 'clarin.com', 'lanacion.com.ar', 'pagina12.com.ar'
        return domain
    except Exception:
        return "desconocido"

def get_noun_phrases(text, nlp_model):
    if not text:
        return []
    doc = nlp_model(text.lower()) # Procesar en minúsculas para agrupar mejor
    phrases = []
    for chunk in doc.noun_chunks:
        # Filtrar frases cortas, solo números o que contengan muchas stopwords
        # y que no sean solo nombres de personas (ya los tenemos)
        # Esta heurística se puede mejorar mucho
        clean_chunk_text = " ".join(token.lemma_ for token in chunk if token.lemma_ not in STOP_WORDS_TEMAS and not token.is_punct and not token.is_stop and token.pos_ in ['NOUN', 'PROPN', 'ADJ'])
        if len(clean_chunk_text.split()) >= 2 and len(clean_chunk_text) > 5 and not clean_chunk_text.isdigit():
            phrases.append(clean_chunk_text.strip())
    return phrases


if __name__ == "__main__":
    articles = load_data(PROCESSED_ARTICLES_FILE)
    if not articles:
        print("No se cargaron artículos.")
        exit()

    # --- 1. KPIs ---
    total_articles = len(articles)

    all_persons_mentions = Counter()
    persons_by_article_date = defaultdict(lambda: Counter())
    articles_by_date = Counter()
    topics_counter = Counter() # Para temas principales y emergentes
    topics_by_date = defaultdict(Counter) # Para "tema emergente" más adelante

    # Para Medios vs Políticos
    media_politicians_mentions = defaultdict(lambda: Counter())

    # Para co-ocurrencias (usaremos una estructura para heatmap)
    # (Esta parte es similar a tu 'graph_data.json' pero podríamos reestructurarla)
    all_normalized_persons = set()
    for article in articles:
        for person in article.get('personas_detectadas_normalizadas', []):
            all_normalized_persons.add(person)

    cooccurrence_matrix = {person: {other_person: 0 for other_person in all_normalized_persons} for person in all_normalized_persons}


    for article in articles:
        persons = article.get('personas_detectadas_normalizadas', [])
        all_persons_mentions.update(persons)

        # Extraer fecha y formatear a YYYY-MM-DD si no lo está ya
        date_str = article.get('fecha') # Asumimos formato 'dd-mm-yyyy' o 'yyyy-mm-dd'
        article_date = None
        if date_str:
            try:
                # Intentar parsear ambos formatos comunes
                if re.match(r"^\d{1,2}-\d{1,2}-\d{4}$", date_str.strip()):
                    dt_obj = datetime.strptime(date_str.strip(), "%d-%m-%Y")
                elif re.match(r"^\d{4}-\d{1,2}-\d{1,2}$", date_str.strip()):
                    dt_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d")
                else: # Si hay otro formato, añadir lógica o marcar como inválido
                    print(f"Formato de fecha no reconocido: {date_str} en artículo {article.get('id')}")
                    dt_obj = None

                if dt_obj:
                    article_date = dt_obj.strftime("%Y-%m-%d")
                    articles_by_date[article_date] += 1
                    for person in persons:
                        persons_by_article_date[article_date][person] += 1
            except ValueError:
                print(f"Error parseando fecha: {date_str} en artículo {article.get('id')}")
                pass # O manejar de otra forma

        # Extracción de Temas (usando noun chunks del título y/o cuerpo)
        # Considera si usar solo título, o una parte del cuerpo para eficiencia
        text_for_topics = article.get('titulo', '') + " " + article.get('cuerpo', '')[:500] # Título + primeros 500 carac. del cuerpo
        current_article_topics = get_noun_phrases(text_for_topics, nlp)
        topics_counter.update(current_article_topics)
        if article_date:
            topics_by_date[article_date].update(current_article_topics)


        # Medios vs Políticos
        medio = extract_domain(article.get('link', ''))
        for person in persons:
            media_politicians_mentions[medio][person] += 1

        # Co-ocurrencias
        # Ordenar para que (A,B) sea igual que (B,A) y evitar auto-loops
        sorted_persons = sorted(list(set(persons)))
        for i in range(len(sorted_persons)):
            for j in range(i + 1, len(sorted_persons)):
                p1, p2 = sorted_persons[i], sorted_persons[j]
                if p1 in cooccurrence_matrix and p2 in cooccurrence_matrix[p1]:
                     cooccurrence_matrix[p1][p2] += 1
                     cooccurrence_matrix[p2][p1] += 1 # Simétrico para heatmap


    # KPI: Figura destacada
    figura_destacada = all_persons_mentions.most_common(1)[0][0] if all_persons_mentions else "N/A"

    # KPI: Tema emergente (simplificado como el tema más frecuente en el último X periodo, o global si es complejo)
    # Para "emergente" real, necesitarías comparar con periodos anteriores.
    # Aquí, tomamos el más frecuente globalmente como "Tema principal"
    tema_principal = topics_counter.most_common(1)[0][0] if topics_counter else "N/A"
    # Podrías hacer algo más sofisticado para "emergente", e.g., tema con mayor crecimiento reciente.
    # Por ahora, usaremos el mismo que el principal o el más reciente.
    latest_date = sorted(topics_by_date.keys())[-1] if topics_by_date else None
    tema_emergente = topics_by_date[latest_date].most_common(1)[0][0] if latest_date and topics_by_date[latest_date] else tema_principal

    kpis_data = {
        "total_articulos": total_articles,
        "figura_destacada": figura_destacada,
        "tema_emergente": tema_emergente # O tema_principal si emergente es muy complejo para v1
    }
    save_data(kpis_data, os.path.join(OUTPUT_DIR, 'kpis.json'))

    # --- 2. Gráficos1 ---
    # Artículos procesados vs tiempo
    articles_over_time = [{"date": date, "count": count} for date, count in sorted(articles_by_date.items())]
    save_data(articles_over_time, os.path.join(OUTPUT_DIR, 'articles_over_time.json'))

    # Menciones por político vs tiempo
    # Formato: { politico1: [{date: "YYYY-MM-DD", mentions: X}, ...], politico2: ... }
    # O un formato plano: [{date: "YYYY-MM-DD", politico: "Nombre", mentions: X}] que es más fácil para algunos charts
    mentions_over_time_flat = []
    # Considerar solo los N políticos más mencionados para no saturar el gráfico
    top_N_politicians = [p[0] for p in all_persons_mentions.most_common(10)]

    for date, person_counts in sorted(persons_by_article_date.items()):
        for person, count in person_counts.items():
            if person in top_N_politicians: # Filtrar por top N
                mentions_over_time_flat.append({"date": date, "politico": person, "mentions": count})
    save_data(mentions_over_time_flat, os.path.join(OUTPUT_DIR, 'mentions_politician_over_time.json'))


    # --- 3. Gráficos2 ---
    # Ranking de políticos (Top N)
    ranking_politicians = [{"politico": p, "menciones": m} for p, m in all_persons_mentions.most_common(20)] # Top 20
    save_data(ranking_politicians, os.path.join(OUTPUT_DIR, 'ranking_politicians.json'))

    # Temas principales (Top N)
    temas_principales_data = [{"tema": t, "frecuencia": f} for t, f in topics_counter.most_common(20)] # Top 20
    save_data(temas_principales_data, os.path.join(OUTPUT_DIR, 'temas_principales.json'))

    # --- 4. Gráficos3 ---
    # Mapa de calor con coocurrencias
    # Necesitamos una lista de políticos (labels) y la matriz de datos
    # Filtrar por políticos que aparecen al menos N veces para que el heatmap no sea gigante
    # La lista 'top_N_politicians' podría servir, o una basada en el umbral de tu script original
    min_appearances_heatmap = 5 # Ajusta según necesites
    heatmap_politicians = [p for p, count in all_persons_mentions.items() if count >= min_appearances_heatmap]
    heatmap_matrix_data = []
    if heatmap_politicians:
        # Asegurar el orden para los labels del heatmap
        heatmap_politicians.sort()
        for p1 in heatmap_politicians:
            row = []
            for p2 in heatmap_politicians:
                row.append(cooccurrence_matrix.get(p1, {}).get(p2, 0))
            heatmap_matrix_data.append(row)

    cooccurrence_heatmap_data = {
        "labels": heatmap_politicians,
        "matrix": heatmap_matrix_data
    }
    save_data(cooccurrence_heatmap_data, os.path.join(OUTPUT_DIR, 'cooccurrence_heatmap.json'))


    # Medios vs políticos
    # Formato: { medio1: {politicoA: X, politicoB: Y}, medio2: ... }
    # O una lista plana: [{medio: "M", politico: "P", menciones: N}]
    media_politicians_flat = []
    # Filtrar por los medios y políticos más relevantes si la lista es muy grande
    top_medios = [m[0] for m in Counter(article['medio_procesado'] for article in articles if 'medio_procesado' in article).most_common(10)] if any('medio_procesado' in art for art in articles) else list(media_politicians_mentions.keys())[:10]


    for medio, person_counts in media_politicians_mentions.items():
        # if medio not in top_medios: continue # Opcional: filtrar medios
        for person, count in person_counts.items():
            if person in top_N_politicians: # Opcional: filtrar políticos
                 media_politicians_flat.append({"medio": medio, "politico": person, "menciones": count})
    save_data(media_politicians_flat, os.path.join(OUTPUT_DIR, 'media_vs_politicians.json'))


    print("\nProcesamiento de datos para dashboard completado.")
    print(f"Archivos generados en el directorio: '{OUTPUT_DIR}'")