import json

with open('src/data/reina_valera.json', 'r', encoding='utf-8') as f:
    bible_data = json.load(f)

# Lista inicial de personajes (ampliar con fuentes)
characters = [
    {"name": "Dios Creador", "description": "Creador del universo.", "chapter": "Génesis 1"},
    {"name": "Marta", "description": "Hermana de María y Lázaro.", "chapter": "Juan 11"},
    # Añadir más desde fuentes
]

output = []
generic_count = 1
for book in bible_data['books']:
    for chapter in book['chapters']:
        # Buscar personaje específico
        char = next((c for c in characters if c['chapter'] == f"{book['name']} {chapter['chapter']}"), None)
        if char:
            char["image"] = f"https://via.placeholder.com/50?text={char['name'].replace(' ', '+')}"
            output.append(char)
        else:
            # Personaje genérico
            output.append({
                "name": f"Personaje {generic_count}",
                "image": f"https://via.placeholder.com/50?text=Personaje+{generic_count}",
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
