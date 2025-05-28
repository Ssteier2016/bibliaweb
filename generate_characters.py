import json

with open('src/data/reina_valera.json', 'r', encoding='utf-8') as f:
    bible_data = json.load(f)

# Copia los 30 personajes de characters.json
characters = [
    {
        "name": "Dios Creador",
        "image": "https://placehold.co/50x50?text=Dios",
        "description": "Creador del universo, descrito en el relato de la creación.",
        "chapter": "Génesis 1"
    },
    
]

output = []
generic_count = 1
for book in bible_data['books']:
    for chapter in book['chapters']:
        char = next((c for c in characters if c['chapter'] == f"{book['name']} {chapter['chapter']}"), None)
        if char:
            output.append(char)
        else:
            output.append({
                "name": f"Personaje {generic_count}",
                "image": f"https://placehold.co/50x50?text=Personaje+{generic_count}",
                "description": f"Figura en {book['name']} {chapter['chapter']}.",
                "chapter": f"{book['name']} {chapter['chapter']}"
            })
            generic_count += 1
        if len(output) >= 1700:
            break
    if len(output) >= 1700:
        break

with open('src/data/characters.json', 'w', encoding='utf-8') as f:
    json.dump(output[:1700], f, ensure_ascii=False, indent=2)
