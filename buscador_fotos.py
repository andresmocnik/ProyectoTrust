#este archivo se corre para buscar las fotos de wikimedia. luego renombras el archivo a politicians_db.json para no tener que
#repgrogramar todo

import json
import requests
import time # Para añadir delays y ser respetuoso con la API

POLITICIANS_FILE = 'politicians_db.json' # Tu archivo JSON
OUTPUT_FILE = 'politicians_db_updated.json'

def get_wikipedia_image_url(person_name, lang='es', size=200):
    session = requests.Session()
    url = f"https://{lang}.wikipedia.org/w/api.php" # Corregir aquí
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages",
        "titles": person_name.replace(" ", "_"), # Reemplazar espacios para el título de la página
        "pithumbsize": size,
        "origin": "*" # Necesario para CORS si se llama desde el navegador, buena práctica en scripts también
    }
    try:
        response = session.get(url=url, params=params, timeout=10)
        response.raise_for_status() # Lanza un error para códigos 4xx/5xx
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        for page_id in pages:
            if page_id == "-1": # Página no encontrada
                return None
            page_data = pages[page_id]
            if "thumbnail" in page_data and "source" in page_data["thumbnail"]:
                return page_data["thumbnail"]["source"]
            # A veces la imagen principal está directamente en pageimage
            elif "pageimage" in page_data and page_data.get("thumbnail"): # Asegurarse que haya thumbnail
                 # Hay que construir la URL si solo da el nombre del archivo
                 # Esto es más complejo, mejor priorizar el thumbnail.source
                 # Si solo da pageimage (nombre del archivo) ejemplo: "Javier_Milei_presidential_portrait.jpg"
                 # necesitarías construir la URL completa de commons.
                 # Por simplicidad, nos enfocaremos en thumbnail.source que es una URL directa.
                pass
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error en la solicitud para {person_name}: {e}")
        return None
    except json.JSONDecodeError:
        print(f"Error decodificando JSON para {person_name}")
        return None


with open(POLITICIANS_FILE, 'r', encoding='utf-8') as f:
    politicians = json.load(f)

updated_politicians = []
for person in politicians:
    print(f"Procesando: {person['name']}...")
    new_img_url = get_wikipedia_image_url(person['name'])
    if new_img_url:
        print(f"  Nueva imagen encontrada: {new_img_url}")
        person['img'] = new_img_url
    elif person.get('img'): # Si no se encuentra nueva y ya tiene una (aunque no funcione)
        print(f"  No se encontró nueva imagen, manteniendo la existente (puede estar rota): {person['img']}")
    else: # Ni nueva ni existente
         print(f"  No se encontró nueva imagen y no había una existente.")
         person['img'] = None # Asegurar que sea None si no hay imagen

    updated_politicians.append(person)
    time.sleep(0.5) # Ser respetuoso con la API, 1-2 solicitudes por segundo máx.

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(updated_politicians, f, indent=2, ensure_ascii=False)

print(f"\nArchivo actualizado guardado en: {OUTPUT_FILE}")