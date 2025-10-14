import json
import os

def generate_demon_pages():
    # Загружаем demons.json
    with open('data/demons.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        demons = data.get('demons', [])
    
    # Читаем шаблон
    with open('demon-template.html', 'r', encoding='utf-8') as f:
        template = f.read()
    
    # Создаем папку для страниц демонов если её нет
    if not os.path.exists('demons'):
        os.makedirs('demons')
    
    # Генерируем страницы для каждого демона
    for demon in demons:
        filename = f"demon-{demon['id']}.html"
        
        # Заменяем заголовок
        page_content = template.replace(
            '<title>Demon Name - Geometry Dash Demon List</title>',
            f'<title>{demon["name"]} - Geometry Dash Demon List</title>'
        )
        
        # Сохраняем страницу
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(page_content)
        
        print(f'✅ Создана страница: {filename}')
    
    print(f'🎉 Создано {len(demons)} страниц демонов!')

if __name__ == '__main__':
    generate_demon_pages()
