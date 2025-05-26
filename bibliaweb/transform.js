const fs = require('fs');
const path = require('path');

// Mapeo de abreviaturas a nombres de libros
const bookMap = {
  "gn": "Génesis", "ex": "Éxodo", "lv": "Levítico", "nm": "Números", "dt": "Deuteronomio",
  "jos": "Josué", "jud": "Jueces", "rt": "Rut", "1sm": "1 Samuel", "2sm": "2 Samuel",
  "1kgs": "1 Reyes", "2kgs": "2 Reyes", "1ch": "1 Crónicas", "2ch": "2 Crónicas",
  "ezr": "Esdras", "neh": "Nehemías", "est": "Ester", "job": "Job", "ps": "Salmos",
  "prv": "Proverbios", "ec": "Eclesiastés", "so": "Cantar de los Cantares", "is": "Isaías",
  "jr": "Jeremías", "lm": "Lamentaciones", "ez": "Ezequiel", "dn": "Daniel", "ho": "Oseas",
  "jl": "Joel", "am": "Amós", "ob": "Abdías", "jn": "Jonás", "mi": "Miqueas", "na": "Nahúm",
  "hk": "Habacuc", "zp": "Sofonías", "hg": "Hageo", "zc": "Zacarías", "ml": "Malaquías",
  "mt": "Mateo", "mk": "Marcos", "lk": "Lucas", "jn": "Juan", "act": "Hechos",
  "ro": "Romanos", "1co": "1 Corintios", "2co": "2 Corintios", "gl": "Gálatas",
  "eph": "Efesios", "php": "Filipenses", "col": "Colosenses", "1th": "1 Tesalonicenses",
  "2th": "2 Tesalonicenses", "1tm": "1 Timoteo", "2tm": "2 Timoteo", "tt": "Tito",
  "phm": "Filemón", "hb": "Hebreos", "jm": "Santiago", "1pe": "1 Pedro", "2pe": "2 Pedro",
  "1jn": "1 Juan", "2jn": "2 Juan", "3jn": "3 Juan", "jd": "Judas", "re": "Apocalipsis"
};

try {
  // Asegurarse de que src/data exista
  const dataDir = path.join(__dirname, 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Carpeta src/data creada');
  }

  // Verificar si es_rvr.json existe
  if (!fs.existsSync('es_rvr.json')) {
    throw new Error('es_rvr.json no encontrado');
  }

  // Leer es_rvr.json
  let rawData = fs.readFileSync('es_rvr.json', 'utf8');
  console.log('es_rvr.json leído, tamaño:', rawData.length, 'caracteres');
  // Eliminar BOM si existe
  if (rawData.charCodeAt(0) === 0xFEFF) {
    rawData = rawData.slice(1);
    console.log('BOM eliminado');
  }

  // Parsear JSON
  let input;
  try {
    input = JSON.parse(rawData);
    console.log('es_rvr.json parseado, libros encontrados:', input.length);
  } catch (parseError) {
    throw new Error(`Error al parsear es_rvr.json: ${parseError.message}`);
  }

  // Validar que input es un array
  if (!Array.isArray(input)) {
    throw new Error('es_rvr.json no es un array de libros');
  }

  // Contadores
  let bookCount = 0;
  let chapterCount = 0;
  let verseCount = 0;

  // Transformar a la estructura de reina_valera.json
  const output = {
    books: input.map(book => {
      if (!book.abbrev || !Array.isArray(book.chapters)) {
        console.error('Libro inválido:', book);
        return null;
      }
      const bookName = bookMap[book.abbrev] || book.abbrev;
      bookCount++;
      console.log(`Procesando libro: ${bookName}`);
      const chapters = book.chapters.map((chapter, chapterIndex) => {
        if (!Array.isArray(chapter)) {
          console.error(`Error en ${bookName} capítulo ${chapterIndex + 1}: estructura inválida`, chapter);
          return null;
        }
        chapterCount++;
        const verses = chapter.map((text, verseIndex) => {
          verseCount++;
          return {
            verse: verseIndex + 1,
            text: text
          };
        });
        return {
          chapter: chapterIndex + 1,
          verses
        };
      }).filter(ch => ch !== null);
      return {
        name: bookName,
        chapters
      };
    }).filter(b => b !== null)
  };

  // Guardar en reina_valera.json
  const outputPath = path.join(dataDir, 'reina_valera.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('¡Transformación de Biblia completa! Archivo guardado en:', outputPath);
  console.log('Total de libros procesados:', bookCount);
  console.log('Total de capítulos procesados:', chapterCount);
  console.log('Total de versículos procesados:', verseCount);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Primeros 100 caracteres de es_rvr.json:', rawData.slice(0, 100));
}
