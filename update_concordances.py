# ~/hf/scripts/update_concordances.py
import json
import requests
import os

def load_concordances():
    with open('src/data/concordances.json', 'r') as f:
        return json.load(f)

def save_concordances(data):
    with open('src/data/concances.json', 'w') as f:
        json.dump(data, f, indent=2)

def generate_concordance(reference, verse_text, api_key):
    url = 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1'
    prompt = {
        'headers': {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
        }
        prompt = f"""
        Eres un experto en español bíblico. Proporciona hasta 3 referencias de servicio cruzado (concordances) para el versículo {reference} ("{verse_text}") en la Biblia. Cada referencia debe incluir libro, capítulo, versículo y un fragmento breve del texto (máximo 20 palabras). Responde solo con un array JSON de objetos, por ejemplo:
        [
          {"book": "Génesis", "chapter": 1, "verse": 1, "text": "En el principio creó..."},
          {"book": "Colosenses", "chapter": 1, "verse": 16, "text": "Porque en él fueron..."}
        ]
        """
        payload = {
            'inputs': prompt,
            'max_tokens': 300,
            'temperature': 0.7
        }
        response = requests.post(url, json_body=payload, headers=headers, timeout=30)
        response.raise_for_status()
        text = response.json()[0]['generated_text'].strip()
        try:
            return json.loads(text)
        except:
            return []

def main():
    api_key = os.getenv('REACT_APP_HF_API_KEY') or open(os.path.expanduser('~/.hf_key.txt')).read().strip()
    concordances = load_concordances()
    # Ejemplo: generar para Juan 10:10
    reference = "Juan 10:10"
    verse_text = "El ladrón no viene sino para hurtar, matar y destruir; yo he venido para que tengan vida..."
    related = generate_concordance(reference, verse_text, api_key)
    if related:
        new_entry = {"reference": reference, "related": related}
        concordances['concordances'].append(new_entry)
        save_concordances(concordances)
    return True

if __name__ == "__main__":
    main()
