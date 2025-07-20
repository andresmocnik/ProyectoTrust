import json
from collections import Counter, defaultdict
from datetime import datetime
import re
from urllib.parse import urlparse # Para extraer el medio del link
import spacy # Para extracción de temas (noun chunks)
import os

# Cargar modelo spaCy
try:
    nlp = spacy.load("es_core_news_sm")
except OSError:
    print("Descargando modelo es_core_news_sm...")
    spacy.cli.download("es_core_news_sm")
    nlp = spacy.load("es_core_news_sm")

PROCESSED_ARTICLES_FILE = 'noticias_procesadas.json'
OUTPUT_DIR = 'dashboard_data'

# Palabras a ignorar para la extracción de temas
STOP_WORDS_TEMAS = {
    "gobierno", "presidente", "nacional", "argentina", "país", "ley", "proyecto",
    "diputados", "senadores", "congreso", "política", "economía", "justicia",
    "ser", "haber", "estar", "tener", "hacer", "poder", "decir", "ir", "ver", "dar",
    "saber", "querer", "llegar", "pasar", "deber", "poner", "parecer", "quedar",
    "creer", "hablar", "llevar", "dejar", "seguir", "encontrar", "llamar",
    "día", "mes", "año", "semana", "hoy", "ayer", "mañana",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "al", "del",
    "de", "en", "a", "por", "para", "con", "sin", "sobre", "tras", "desde", "hasta"
}

def load_data(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: El archivo {filepath} no fue encontrado.")
        return []

def save_data(data, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Datos guardados en {filepath}")

def extract_domain(link):
    try:
        parsed_uri = urlparse(link)
        domain = '{uri.netloc}'.format(uri=parsed_uri)
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except Exception:
        return "desconocido"

def get_noun_phrases(text, nlp_model):
    if not text: return []
    doc = nlp_model(text.lower())
    phrases = []
    for chunk in doc.noun_chunks:
        clean_chunk_text = " ".join(token.lemma_ for token in chunk if token.lemma_ not in STOP_WORDS_TEMAS and not token.is_punct and not token.is_stop and token.pos_ in ['NOUN', 'PROPN', 'ADJ'])
        if len(clean_chunk_text.split()) >= 2 and len(clean_chunk_text) > 5 and not clean_chunk_text.isdigit():
            phrases.append(clean_chunk_text.strip())
    return phrases

if __name__ == "__main__":
    articles = load_data(PROCESSED_ARTICLES_FILE)
    if not articles:
        print("No se cargaron artículos o el archivo está vacío. Finalizando script.")
        exit()

    # --- Inicialización de Estructuras de Datos ---
    total_articles = len(articles)
    all_persons_mentions = Counter()
    persons_by_article_date = defaultdict(lambda: Counter())
    articles_by_date = Counter()
    topics_counter = Counter()
    topics_by_date = defaultdict(Counter)
    media_politicians_mentions = defaultdict(lambda: Counter())
    sentiment_by_politician = defaultdict(lambda: Counter())
    all_normalized_persons = set()

    for article in articles:
        for entity in article.get('entities_in_article', []):
            all_normalized_persons.add(entity['nombre_normalizado'])

    cooccurrence_matrix = {person: {other_person: 0 for other_person in all_normalized_persons} for person in all_normalized_persons}

    # --- Bucle Principal de Procesamiento ---
    for article in articles:
        entities = article.get('entities_in_article', [])
        persons = [entity['nombre_normalizado'] for entity in entities if 'nombre_normalizado' in entity]
        all_persons_mentions.update(persons)

        date_str = article.get('fecha')
        article_date = None
        if date_str:
            try:
                if re.match(r"^\d{1,2}-\d{1,2}-\d{4}$", date_str.strip()):
                    dt_obj = datetime.strptime(date_str.strip(), "%d-%m-%Y")
                elif re.match(r"^\d{4}-\d{1,2}-\d{1,2}$", date_str.strip()):
                    dt_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d")
                else: dt_obj = None
                if dt_obj:
                    article_date = dt_obj.strftime("%Y-%m-%d")
                    articles_by_date[article_date] += 1
                    for person in persons:
                        persons_by_article_date[article_date][person] += 1
            except (ValueError, TypeError): pass

        text_for_topics = article.get('titulo', '') + " " + article.get('cuerpo', '')[:500]
        current_article_topics = get_noun_phrases(text_for_topics, nlp)
        topics_counter.update(current_article_topics)
        if article_date: topics_by_date[article_date].update(current_article_topics)

        medio = extract_domain(article.get('link', ''))
        for person in persons: media_politicians_mentions[medio][person] += 1
        
        sentiment_data = article.get('sentimiento')
        if sentiment_data and 'etiqueta' in sentiment_data:
            sentiment_label = sentiment_data['etiqueta']
            sentiment_map = {"POS": "positivo", "NEG": "negativo", "NEU": "neutral"}
            clean_label = sentiment_map.get(sentiment_label, "desconocido")
            for person in set(persons): sentiment_by_politician[person][clean_label] += 1

        sorted_persons = sorted(list(set(persons)))
        for i in range(len(sorted_persons)):
            for j in range(i + 1, len(sorted_persons)):
                p1, p2 = sorted_persons[i], sorted_persons[j]
                if p1 in cooccurrence_matrix and p2 in cooccurrence_matrix[p1]:
                     cooccurrence_matrix[p1][p2] += 1
                     cooccurrence_matrix[p2][p1] += 1

    # --- Procesamiento y Guardado de Datos para el Dashboard ---

    # 1. KPIs
    figura_destacada = all_persons_mentions.most_common(1)[0][0] if all_persons_mentions else "N/A"
    tema_principal = topics_counter.most_common(1)[0][0] if topics_counter else "N/A"
    latest_date = sorted(topics_by_date.keys())[-1] if topics_by_date else None
    tema_emergente = topics_by_date[latest_date].most_common(1)[0][0] if latest_date and topics_by_date[latest_date] else tema_principal
    kpis_data = {"total_articulos": total_articles, "figura_destacada": figura_destacada, "tema_emergente": tema_emergente}
    save_data(kpis_data, os.path.join(OUTPUT_DIR, 'kpis.json'))

    # 2. Gráficos de series temporales
    articles_over_time = [{"date": date, "count": count} for date, count in sorted(articles_by_date.items())]
    save_data(articles_over_time, os.path.join(OUTPUT_DIR, 'articles_over_time.json'))

    top_N_politicians = [p[0] for p in all_persons_mentions.most_common(10)]
    mentions_over_time_flat = []
    for date, person_counts in sorted(persons_by_article_date.items()):
        for person, count in person_counts.items():
            if person in top_N_politicians:
                mentions_over_time_flat.append({"date": date, "politico": person, "menciones": count})
    save_data(mentions_over_time_flat, os.path.join(OUTPUT_DIR, 'mentions_politician_over_time.json'))

    # 3. Gráficos de rankings
    ranking_politicians = [{"politico": p, "menciones": m} for p, m in all_persons_mentions.most_common(20)]
    save_data(ranking_politicians, os.path.join(OUTPUT_DIR, 'ranking_politicians.json'))
    temas_principales_data = [{"tema": t, "frecuencia": f} for t, f in topics_counter.most_common(20)]
    save_data(temas_principales_data, os.path.join(OUTPUT_DIR, 'temas_principales.json'))

    # 4. Gráficos de relaciones
    min_appearances_heatmap = 5
    heatmap_politicians = [p for p, count in all_persons_mentions.items() if count >= min_appearances_heatmap]
    heatmap_matrix_data = []
    if heatmap_politicians:
        heatmap_politicians.sort()
        for p1 in heatmap_politicians:
            row = [cooccurrence_matrix.get(p1, {}).get(p2, 0) for p2 in heatmap_politicians]
            heatmap_matrix_data.append(row)
    cooccurrence_heatmap_data = {"labels": heatmap_politicians, "matrix": heatmap_matrix_data}
    save_data(cooccurrence_heatmap_data, os.path.join(OUTPUT_DIR, 'cooccurrence_heatmap.json'))
    media_politicians_flat = []
    for medio, person_counts in media_politicians_mentions.items():
        for person, count in person_counts.items():
            if person in top_N_politicians:
                 media_politicians_flat.append({"medio": medio, "politico": person, "menciones": count})
    save_data(media_politicians_flat, os.path.join(OUTPUT_DIR, 'media_vs_politicians.json'))

    # 5. Sentimiento por volumen
    top_politicians_for_sentiment = [p['politico'] for p in ranking_politicians]
    sentiment_politician_data = []
    for person, counts in sentiment_by_politician.items():
        if person in top_politicians_for_sentiment:
            total_articles_with_sentiment = sum(counts.values())
            sentiment_politician_data.append({
                "politico": person,
                "sentimientos": {
                    "positivo": counts.get("positivo", 0),
                    "negativo": counts.get("negativo", 0),
                    "neutral": counts.get("neutral", 0)
                },
                "articulos_analizados": total_articles_with_sentiment
            })
    sentiment_politician_data.sort(key=lambda x: (x['sentimientos']['negativo'] + x['sentimientos']['positivo'] + x['sentimientos']['neutral']), reverse=True)
    save_data(sentiment_politician_data, os.path.join(OUTPUT_DIR, 'sentiment_per_politician.json'))

    # --- 6. NUEVO: Sentimiento Promedio por Político ---
    average_sentiment_data = []
    for person, counts in sentiment_by_politician.items():
        if person in top_politicians_for_sentiment:
            pos_count = counts.get("positivo", 0)
            neg_count = counts.get("negativo", 0)
            neu_count = counts.get("neutral", 0)
            
            total_articles = pos_count + neg_count + neu_count
            if total_articles > 0:
                # Ponderación: Positivo=1, Neutral=0, Negativo=-1
                weighted_sum = (pos_count * 1) + (neg_count * -1)
                average_score = weighted_sum / total_articles
                
                average_sentiment_data.append({
                    "politico": person,
                    "sentimiento_promedio": average_score
                })

    # Ordenar de más negativo a más positivo
    average_sentiment_data.sort(key=lambda x: x['sentimiento_promedio'])
    save_data(average_sentiment_data, os.path.join(OUTPUT_DIR, 'average_sentiment_politician.json'))

    print("\nProcesamiento de datos para dashboard completado.")
    print(f"Archivos generados en el directorio: '{OUTPUT_DIR}'")