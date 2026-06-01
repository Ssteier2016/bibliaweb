import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { COMMENTARY } from './data/commentary';
import AuthScreen               from './AuthScreen';
import UserMenu                 from './UserMenu';
import CommentsPanel            from './CommentsPanel';
import GenPanel                 from './GenPanel';
import FeedPage                 from './FeedPage';
import TheologicalCommentaries  from './TheologicalCommentaries';
import logo3                    from './logo3.png';
import { onAuthChange, loadUserData, saveUserData, savePresence, followUser, unfollowUser, updateReadingStreak, incrementLike, loadChapterLikes, createPost } from './firebase';

const BOOK_NAMES = {
  gn:'Génesis', ex:'Éxodo', lv:'Levítico', nm:'Números', dt:'Deuteronomio',
  js:'Josué', jud:'Jueces', rt:'Rut', '1sm':'1 Samuel', '2sm':'2 Samuel',
  '1kgs':'1 Reyes', '2kgs':'2 Reyes', '1ch':'1 Crónicas', '2ch':'2 Crónicas',
  ezr:'Esdras', ne:'Nehemías', et:'Ester', job:'Job', ps:'Salmos',
  prv:'Proverbios', ec:'Eclesiastés', so:'Cantares', is:'Isaías',
  jr:'Jeremías', lm:'Lamentaciones', ez:'Ezequiel', dn:'Daniel',
  ho:'Oseas', jl:'Joel', am:'Amós', ob:'Abdías', jn:'Jonás',
  mi:'Miqueas', na:'Nahúm', hk:'Habacuc', zp:'Sofonías', hg:'Hageo',
  zc:'Zacarías', ml:'Malaquías', mt:'Mateo', mk:'Marcos', lk:'Lucas',
  jo:'Juan', act:'Hechos', rm:'Romanos', '1co':'1 Corintios',
  '2co':'2 Corintios', gl:'Gálatas', eph:'Efesios', ph:'Filipenses',
  cl:'Colosenses', '1ts':'1 Tesalonicenses', '2ts':'2 Tesalonicenses',
  '1tm':'1 Timoteo', '2tm':'2 Timoteo', tt:'Tito', phm:'Filemón',
  hb:'Hebreos', jm:'Santiago', '1pe':'1 Pedro', '2pe':'2 Pedro',
  '1jo':'1 Juan', '2jo':'2 Juan', '3jo':'3 Juan', jd:'Judas', re:'Apocalipsis',
};

const BIBLEHUB_BOOK = {
  'Génesis':'genesis','Éxodo':'exodus','Levítico':'leviticus','Números':'numbers',
  'Deuteronomio':'deuteronomy','Josué':'joshua','Jueces':'judges','Rut':'ruth',
  '1 Samuel':'1_samuel','2 Samuel':'2_samuel','1 Reyes':'1_kings','2 Reyes':'2_kings',
  '1 Crónicas':'1_chronicles','2 Crónicas':'2_chronicles','Esdras':'ezra',
  'Nehemías':'nehemiah','Ester':'esther','Job':'job','Salmos':'psalms',
  'Proverbios':'proverbs','Eclesiastés':'ecclesiastes','Cantares':'song_of_songs',
  'Isaías':'isaiah','Jeremías':'jeremiah','Lamentaciones':'lamentations',
  'Ezequiel':'ezekiel','Daniel':'daniel','Oseas':'hosea','Joel':'joel','Amós':'amos',
  'Abdías':'obadiah','Jonás':'jonah','Miqueas':'micah','Nahúm':'nahum',
  'Habacuc':'habakkuk','Sofonías':'zephaniah','Hageo':'haggai','Zacarías':'zechariah',
  'Malaquías':'malachi','Mateo':'matthew','Marcos':'mark','Lucas':'luke','Juan':'john',
  'Hechos':'acts','Romanos':'romans','1 Corintios':'1_corinthians',
  '2 Corintios':'2_corinthians','Gálatas':'galatians','Efesios':'ephesians',
  'Filipenses':'philippians','Colosenses':'colossians',
  '1 Tesalonicenses':'1_thessalonians','2 Tesalonicenses':'2_thessalonians',
  '1 Timoteo':'1_timothy','2 Timoteo':'2_timothy','Tito':'titus','Filemón':'philemon',
  'Hebreos':'hebrews','Santiago':'james','1 Pedro':'1_peter','2 Pedro':'2_peter',
  '1 Juan':'1_john','2 Juan':'2_john','3 Juan':'3_john','Judas':'jude',
  'Apocalipsis':'revelation',
};

const HIGHLIGHT_COLORS = [
  { id: 'yellow', light: '#fef08a', dark: '#78350f', label: 'Amarillo' },
  { id: 'green',  light: '#bbf7d0', dark: '#14532d', label: 'Verde'    },
  { id: 'blue',   light: '#bae6fd', dark: '#1e3a5f', label: 'Azul'     },
  { id: 'pink',   light: '#fecdd3', dark: '#881337', label: 'Rosa'     },
  { id: 'orange', light: '#fed7aa', dark: '#7c2d12', label: 'Naranja'  },
  { id: 'purple', light: '#e9d5ff', dark: '#4c1d95', label: 'Morado'   },
  { id: 'red',    light: '#fca5a5', dark: '#7f1d1d', label: 'Rojo'     },
  { id: 'teal',   light: '#99f6e4', dark: '#134e4a', label: 'Turquesa' },
];

function getHighlightBg(colorId, darkMode) {
  if (!colorId) return null;
  // Color personalizado (hex directo)
  if (colorId.startsWith('#')) {
    if (!darkMode) return colorId;
    const r = parseInt(colorId.slice(1, 3), 16);
    const g = parseInt(colorId.slice(3, 5), 16);
    const b = parseInt(colorId.slice(5, 7), 16);
    return `rgb(${Math.round(r * 0.28)},${Math.round(g * 0.28)},${Math.round(b * 0.28)})`;
  }
  const c = HIGHLIGHT_COLORS.find(x => x.id === colorId);
  return c ? (darkMode ? c.dark : c.light) : null;
}

const COMMENT_TYPES = [
  { key: 'historico',      label: 'Historia',       icon: '📜' },
  { key: 'linguistico',    label: 'Lingüístico',    icon: '🗣️' },
  { key: 'paleontologico', label: 'Paleontológico', icon: '🦕' },
  { key: 'arquitectonico', label: 'Arquitectónico', icon: '🏛️' },
  { key: 'cientifico',     label: 'Científico',     icon: '🔬' },
  { key: 'costumbres',     label: 'Costumbres',     icon: '🏺' },
  { key: 'geografico',     label: 'Geografía',      icon: '🗺️' },
  { key: 'tipologia',      label: 'Tipología',      icon: '🔁' },
  { key: 'comentarios',    label: 'Comentarios',    icon: '💬' },
];

// Coordenadas de lugares bíblicos para cada versículo con geografico
const GEO_LUGARES = {
  'Génesis_2_8':    [{ nombre: 'Región del Edén — Mesopotamia', lat: 32.54,   lng: 44.42,  zoom: 7  }],
  'Génesis_11_4':   [{ nombre: 'Babilonia (Babel)', lat: 32.5426, lng: 44.4207, zoom: 10 }],
  'Génesis_12_1':   [
    { nombre: 'Ur de los Caldeos', lat: 30.9626, lng: 46.1029, zoom: 10 },
    { nombre: 'Harán',             lat: 36.8671, lng: 39.0208, zoom: 10 },
    { nombre: 'Canaán',            lat: 31.5,    lng: 35.0,    zoom:  7 },
  ],
  'Génesis_28_10':  [{ nombre: 'Betel', lat: 31.9279, lng: 35.2298, zoom: 13 }],
  'Génesis_37_17':  [{ nombre: 'Dotán', lat: 32.4019, lng: 35.2000, zoom: 13 }],
  'Éxodo_3_1':      [
    { nombre: 'Monte Horeb / Sinaí (trad.)', lat: 28.5395, lng: 33.9752, zoom: 11 },
    { nombre: 'Madián', lat: 28.4167, lng: 35.0000, zoom: 8 },
  ],
  'Éxodo_14_22':    [
    { nombre: 'Lagos Amargos (posible Yam Suph)', lat: 30.3667, lng: 32.3500, zoom: 9 },
    { nombre: 'Golfo de Suez', lat: 29.5, lng: 32.5, zoom: 8 },
  ],
  'Josué_3_17':     [{ nombre: 'Vado de Adán — Tell ed-Damiyeh', lat: 32.1097, lng: 35.5449, zoom: 13 }],
  'Josué_6_1':      [{ nombre: 'Jericó', lat: 31.8607, lng: 35.4607, zoom: 13 }],
  '1 Reyes_18_19':  [{ nombre: 'Monte Carmelo', lat: 32.7381, lng: 34.9663, zoom: 11 }],
  '2 Samuel_5_6':   [{ nombre: 'Ciudad de David — Jerusalén', lat: 31.7684, lng: 35.2327, zoom: 15 }],
  '1 Reyes_10_1':   [
    { nombre: 'Jerusalén (Salomón)', lat: 31.7683, lng: 35.2137, zoom: 13 },
    { nombre: "Saba — Ma'rib (Yemen)", lat: 15.4, lng: 45.3, zoom: 8 },
  ],
  'Salmos_48_1':    [{ nombre: 'Monte Sión — Jerusalén', lat: 31.7767, lng: 35.2345, zoom: 14 }],
  'Salmos_137_1':   [{ nombre: 'Babilonia — ríos del exilio', lat: 32.5426, lng: 44.4207, zoom: 10 }],
  'Daniel_1_1':     [{ nombre: 'Babilonia', lat: 32.5426, lng: 44.4207, zoom: 11 }],
  'Mateo_2_1':      [
    { nombre: 'Belén', lat: 31.7054, lng: 35.2024, zoom: 13 },
    { nombre: 'Jerusalén', lat: 31.7683, lng: 35.2137, zoom: 12 },
  ],
  'Mateo_4_13':     [{ nombre: 'Capernaúm', lat: 32.8806, lng: 35.5760, zoom: 14 }],
  'Mateo_21_1':     [{ nombre: 'Monte de los Olivos', lat: 31.7780, lng: 35.2435, zoom: 14 }],
  'Mateo_27_33':    [{ nombre: 'Gólgota — Basílica del Santo Sepulcro', lat: 31.7784, lng: 35.2296, zoom: 16 }],
  'Juan_4_4':       [
    { nombre: 'Pozo de Jacob — Siquem (Nablus)', lat: 32.2085, lng: 35.2878, zoom: 15 },
  ],
  'Lucas_10_30':    [
    { nombre: 'Jerusalén', lat: 31.7683, lng: 35.2137, zoom: 12 },
    { nombre: 'Jericó', lat: 31.8607, lng: 35.4607, zoom: 12 },
  ],
  'Hechos_2_1':     [{ nombre: 'Jerusalén — Pentecostés', lat: 31.7683, lng: 35.2137, zoom: 14 }],
  'Hechos_9_3':     [
    { nombre: 'Damasco', lat: 33.5138, lng: 36.2765, zoom: 11 },
    { nombre: 'Jerusalén (partida de Saulo)', lat: 31.7683, lng: 35.2137, zoom: 12 },
  ],
  'Hechos_13_4':    [
    { nombre: 'Antioquía de Siria', lat: 36.2025, lng: 36.1604, zoom: 11 },
    { nombre: 'Chipre — Salamina', lat: 35.1667, lng: 33.9167, zoom: 10 },
  ],
  'Apocalipsis_2_1': [
    { nombre: 'Éfeso', lat: 37.9397, lng: 27.3408, zoom: 13 },
    { nombre: 'Esmirna (Izmir)', lat: 38.4192, lng: 27.1287, zoom: 12 },
    { nombre: 'Pérgamo', lat: 39.1222, lng: 27.1833, zoom: 12 },
    { nombre: 'Laodicea', lat: 37.8333, lng: 29.1000, zoom: 13 },
  ],
  'Apocalipsis_16_16': [{ nombre: 'Meguido — Armagedón', lat: 32.5889, lng: 35.1857, zoom: 13 }],

  // ─── Zacarías ──────────────────────────────────────────────
  'Zacarías_9_9':   [{ nombre: 'Monte de los Olivos — entrada mesiánica', lat: 31.7780, lng: 35.2435, zoom: 14 }],

  // ─── Génesis ───────────────────────────────────────────────
  'Génesis_19_24':  [
    { nombre: 'Sodoma y Gomorra — sur del Mar Muerto', lat: 31.0500, lng: 35.4700, zoom: 10 },
    { nombre: 'Mar Muerto', lat: 31.5000, lng: 35.5000, zoom: 9 },
  ],
  'Génesis_22_2':   [{ nombre: 'Monte Moriah — Monte del Templo', lat: 31.7782, lng: 35.2360, zoom: 16 }],

  // ─── Números / Josué ───────────────────────────────────────
  'Números_13_23':  [
    { nombre: 'Valle de Escol — Hebrón', lat: 31.5326, lng: 35.0998, zoom: 13 },
    { nombre: 'Cades-barnea (partida de los espías)', lat: 30.6700, lng: 34.4400, zoom: 11 },
  ],
  'Josué_24_1':     [{ nombre: 'Siquem — lugar del pacto', lat: 32.2225, lng: 35.2628, zoom: 14 }],

  // ─── Jueces / Rut / Samuel ─────────────────────────────────
  'Jueces_4_14':    [
    { nombre: 'Monte Tabor', lat: 32.6872, lng: 35.3919, zoom: 13 },
    { nombre: 'Llanura de Esdraelón — campo de batalla', lat: 32.5833, lng: 35.2833, zoom: 11 },
  ],
  'Rut_1_1':        [
    { nombre: 'Belén', lat: 31.7054, lng: 35.2024, zoom: 13 },
    { nombre: 'Moab', lat: 31.1667, lng: 35.7167, zoom: 9 },
  ],
  '1 Samuel_17_2':  [{ nombre: 'Valle de Ela', lat: 31.7033, lng: 34.9444, zoom: 13 }],

  // ─── Evangelios ────────────────────────────────────────────
  'Mateo_3_1':      [
    { nombre: 'Desierto de Judea', lat: 31.7000, lng: 35.4000, zoom: 10 },
    { nombre: 'Río Jordán — Betabara', lat: 31.8297, lng: 35.5644, zoom: 13 },
  ],
  'Lucas_2_4':      [
    { nombre: 'Nazaret', lat: 32.7028, lng: 35.2956, zoom: 13 },
    { nombre: 'Belén', lat: 31.7054, lng: 35.2024, zoom: 13 },
  ],
  'Lucas_4_16':     [{ nombre: 'Nazaret — sinagoga', lat: 32.7028, lng: 35.2956, zoom: 15 }],
  'Mateo_14_25':    [{ nombre: 'Mar de Galilea', lat: 32.8333, lng: 35.5833, zoom: 11 }],
  'Mateo_26_36':    [{ nombre: 'Getsemaní', lat: 31.7796, lng: 35.2402, zoom: 17 }],
  'Juan_11_1':      [{ nombre: 'Betania — tumba de Lázaro', lat: 31.7697, lng: 35.2627, zoom: 15 }],

  // ─── Hechos ────────────────────────────────────────────────
  'Hechos_17_22':   [
    { nombre: 'Areópago — Atenas', lat: 37.9755, lng: 23.7242, zoom: 16 },
    { nombre: 'Ágora de Atenas', lat: 37.9758, lng: 23.7225, zoom: 16 },
  ],
  'Hechos_18_1':    [{ nombre: 'Corinto', lat: 37.9088, lng: 22.8798, zoom: 13 }],
  'Hechos_27_27':   [
    { nombre: 'Malta — bahía de San Pablo', lat: 35.9375, lng: 14.3754, zoom: 11 },
    { nombre: 'Cesarea Marítima (punto de partida)', lat: 32.5018, lng: 34.8953, zoom: 13 },
  ],

  // ─── Apocalipsis ───────────────────────────────────────────
  'Apocalipsis_1_9': [{ nombre: 'Isla de Patmos', lat: 37.3167, lng: 26.5500, zoom: 12 }],

  // ─── Patriarcas / Pentateuco ───────────────────────────────────
  'Génesis_32_22':   [{ nombre: 'Río Jaboc — vado de Peniel', lat: 32.2167, lng: 35.6000, zoom: 13 }],
  'Génesis_46_28':   [
    { nombre: 'Gosén — delta del Nilo oriental', lat: 30.7500, lng: 31.9167, zoom: 10 },
    { nombre: 'Tell el-Dab\u0027a / Avaris (sede de José)', lat: 30.7833, lng: 31.8333, zoom: 13 },
  ],
  'Éxodo_1_11':      [
    { nombre: 'Pi-Ramsés / Qantir (ciudad de los esclavos)', lat: 30.7959, lng: 31.8231, zoom: 13 },
    { nombre: 'Pitón — Tell el-Maskhuta', lat: 30.5528, lng: 32.0992, zoom: 13 },
  ],
  'Números_22_1':    [{ nombre: 'Llanuras de Moab — frente a Jericó', lat: 31.8500, lng: 35.5500, zoom: 11 }],
  'Deuteronomio_34_1': [
    { nombre: 'Monte Nebo — cima del Pisga', lat: 31.7617, lng: 35.7303, zoom: 13 },
    { nombre: 'Tierra Prometida (panorámica desde Nebo)', lat: 31.7500, lng: 35.2000, zoom: 8 },
  ],

  // ─── Conquista / Monarquía ─────────────────────────────────────
  'Josué_10_12':     [{ nombre: 'Gabaón — El-Jib', lat: 31.8406, lng: 35.1694, zoom: 14 }],
  '1 Reyes_17_9':    [{ nombre: 'Sarepta de Sidón — Sarafand (Líbano)', lat: 33.4578, lng: 35.3019, zoom: 13 }],
  '2 Reyes_5_14':    [
    { nombre: 'Río Jordán — zona norte (Naamán)', lat: 32.6000, lng: 35.5833, zoom: 12 },
    { nombre: 'Damasco (origen de Naamán)', lat: 33.5138, lng: 36.2765, zoom: 11 },
  ],

  // ─── Persia / Profetas ─────────────────────────────────────────
  'Ester_1_2':       [{ nombre: 'Susa — Palacio de Asuero / Shush (Irán)', lat: 32.1907, lng: 48.2566, zoom: 13 }],
  'Jeremías_1_1':    [{ nombre: 'Anatot — Ras el-Kharrubeh (Benjamín)', lat: 31.8167, lng: 35.2667, zoom: 14 }],
  'Ezequiel_1_1':    [
    { nombre: 'Río Quebar — Tel-Abib (Babilonia)', lat: 32.4500, lng: 44.5500, zoom: 10 },
    { nombre: 'Canal nâr kabari (Éufrates sur)', lat: 32.3833, lng: 44.4167, zoom: 9 },
  ],
  'Jonás_1_3':       [
    { nombre: 'Jaffa — puerto de Jonás (Tel Aviv)', lat: 32.0537, lng: 34.7522, zoom: 14 },
    { nombre: 'Nínive — Mosul (Iraq)', lat: 36.3611, lng: 43.1564, zoom: 12 },
  ],

  // ─── Evangelios ────────────────────────────────────────────────
  'Juan_2_1':        [{ nombre: 'Caná de Galilea — Kafr Kanna', lat: 32.7486, lng: 35.3510, zoom: 14 }],
  'Marcos_5_1':      [
    { nombre: 'Kursi — Gadara / costa este del Mar de Galilea', lat: 32.8597, lng: 35.6533, zoom: 14 },
    { nombre: 'Decápolis — región helenística (vista)', lat: 32.6500, lng: 35.8000, zoom: 9 },
  ],
  'Marcos_8_27':     [{ nombre: 'Cesarea de Filipos — Banias', lat: 33.2497, lng: 35.6961, zoom: 14 }],
  'Lucas_19_1':      [{ nombre: 'Jericó — ciudad de Zaqueo', lat: 31.8607, lng: 35.4607, zoom: 14 }],
  'Lucas_24_13':     [
    { nombre: 'Emaús — Emmaus Nicopolis / Latrun', lat: 31.8386, lng: 35.0117, zoom: 13 },
    { nombre: 'Jerusalén (punto de partida)', lat: 31.7683, lng: 35.2137, zoom: 12 },
  ],

  // ─── Hechos / Epístolas ────────────────────────────────────────
  'Hechos_1_9':      [{ nombre: 'Monte de los Olivos — lugar de la Ascensión', lat: 31.7780, lng: 35.2435, zoom: 15 }],
  'Hechos_16_9':     [
    { nombre: 'Troas — puerto de partida hacia Europa', lat: 39.7564, lng: 26.1678, zoom: 13 },
    { nombre: 'Filipos — primera iglesia europea (Macedonia)', lat: 41.0119, lng: 24.2875, zoom: 14 },
  ],
  'Romanos_1_7':     [{ nombre: 'Roma — comunidad cristiana del siglo I', lat: 41.9028, lng: 12.4964, zoom: 12 }],

  // ── Atlas Bíblico — geografía patriarcal ──────────────────────────────────
  'Génesis_11_31':  [
    { nombre: 'Ur de los Caldeos — Tell el-Muqayyar (Irak)', lat: 30.9626, lng: 46.1029, zoom: 11 },
    { nombre: 'Harán — Şanlıurfa (Turquía)', lat: 36.8671, lng: 39.0208, zoom: 11 },
  ],
  'Génesis_12_10':  [
    { nombre: 'Neguev — desierto entre Canaán y Egipto', lat: 30.6700, lng: 34.4400, zoom: 9 },
    { nombre: 'Delta oriental del Nilo — destino de Abraham en Egipto', lat: 30.7500, lng: 31.2500, zoom: 9 },
  ],
  'Génesis_13_12':  [
    { nombre: 'Llanura del Jordán — región de Sodoma (Tall el-Hammam)', lat: 31.8022, lng: 35.6522, zoom: 11 },
    { nombre: 'Mar Muerto — punto más bajo de la Tierra (-417 m)', lat: 31.5000, lng: 35.5000, zoom: 9 },
  ],
  'Génesis_33_18':  [
    { nombre: 'Siquén — Tell Balatah / Nablus', lat: 32.2085, lng: 35.2878, zoom: 14 },
    { nombre: 'Monte Gerizim (881 m)', lat: 32.1981, lng: 35.2717, zoom: 13 },
  ],
  'Génesis_47_11':  [
    { nombre: 'Gosén / Tell el-Dab\'a (Avaris) — delta oriental del Nilo', lat: 30.7833, lng: 31.8333, zoom: 13 },
    { nombre: 'Pi-Ramsés / Qantir — antigua capital ramésida', lat: 30.7959, lng: 31.8231, zoom: 13 },
  ],
};


// Número de libro 1-66 para la API de bolls.life
const BOLLS_SLUG = { ntv: 'NTV', nbla: 'NBLA' };

// Normaliza texto quitando tildes para comparar nombres de libros
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Detecta referencias del tipo "Mateo 3:16", "1 Co 13:4", "Gn 1:1"
function parseVerseRef(query, books) {
  const match = query.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  const [, bookQuery, chStr, verseStr] = match;
  const q = norm(bookQuery);
  const found = books.find(b => {
    const name = norm(b.name);
    return name === q || name.startsWith(q) || norm(b.abbrev) === q;
  });
  if (!found) return null;
  const ch = parseInt(chStr, 10);
  const verse = parseInt(verseStr, 10);
  if (isNaN(ch) || isNaN(verse)) return null;
  if (!found.chapters.find(c => c.chapter === ch)) return null;
  return { book: found.name, chapter: ch, verse };
}

const BOLLS_NUM = {
  gn:1,ex:2,lv:3,nm:4,dt:5,js:6,jud:7,rt:8,'1sm':9,'2sm':10,
  '1kgs':11,'2kgs':12,'1ch':13,'2ch':14,ezr:15,ne:16,et:17,job:18,ps:19,
  prv:20,ec:21,so:22,is:23,jr:24,lm:25,ez:26,dn:27,ho:28,jl:29,am:30,
  ob:31,jn:32,mi:33,na:34,hk:35,zp:36,hg:37,zc:38,ml:39,mt:40,
  mk:41,lk:42,jo:43,act:44,rm:45,'1co':46,'2co':47,gl:48,eph:49,ph:50,
  cl:51,'1ts':52,'2ts':53,'1tm':54,'2tm':55,tt:56,phm:57,hb:58,jm:59,
  '1pe':60,'2pe':61,'1jo':62,'2jo':63,'3jo':64,jd:65,re:66,
};

function convertBible(raw) {
  return raw.map(book => ({
    abbrev: book.abbrev,
    name: BOOK_NAMES[book.abbrev] || book.abbrev,
    chapters: book.chapters.map((verses, ci) => ({
      chapter: ci + 1,
      verses: verses.map((text, vi) => ({ verse: vi + 1, text })),
    })),
  }));
}

function lsGet(key) { try { return localStorage.getItem(key) } catch { return null } }
function lsSet(key, val) { try { localStorage.setItem(key, val) } catch {} }

// Convierte estado interno (con prefijos) a objeto Firestore (sin prefijos)
function toFirestore(highlights, notes, bookmarks, shared) {
  const hl = {}, nt = {}, bm = {}, sh = {};
  Object.entries(highlights).forEach(([k, v]) => { if (k.startsWith('hl_')) hl[k.slice(3)] = v; });
  Object.entries(notes).forEach(([k, v]) => { if (k.startsWith('note_')) nt[k.slice(5)] = v; });
  Object.entries(bookmarks).forEach(([k, v]) => { if (k.startsWith('bm_')) bm[k.slice(3)] = v; });
  Object.entries(shared).forEach(([k, v]) => { if (k.startsWith('sh_')) sh[k.slice(3)] = v; });
  return { highlights: hl, notes: nt, bookmarks: bm, shared: sh };
}

// Convierte datos Firestore a estado interno (con prefijos)
function fromFirestore(data) {
  const hl = {}, nt = {}, bm = {}, sh = {};
  Object.entries(data.highlights || {}).forEach(([k, v]) => { hl[`hl_${k}`]   = v; });
  Object.entries(data.notes      || {}).forEach(([k, v]) => { nt[`note_${k}`] = v; });
  Object.entries(data.bookmarks  || {}).forEach(([k, v]) => { bm[`bm_${k}`]   = v; });
  Object.entries(data.shared     || {}).forEach(([k, v]) => { sh[`sh_${k}`]   = v; });
  return {
    hl, nt, bm, sh,
    following:  data.following  || [],
    followers:  data.followers  || [],
    streak:     data.streak     || 0,
    privacy:    data.privacy    || {
      notes: false, highlights: false, bookmarks: false,
      publicProfile: true, followers: true, following: true,
    },
  };
}

// ── Íconos SVG ────────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    </svg>
  );
}

function ReferenceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function PublicCommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function CommentaryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

function FeedPublishIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9"/>
      <path d="M4 4a16 16 0 0 1 16 16"/>
      <circle cx="5" cy="19" r="1" fill="currentColor"/>
    </svg>
  );
}

// ── Modal: publicar versículo en el Feed ──────────────────────────────────────

function PostToFeedModal({ user, verse, bookName, chapter, onClose }) {
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    await createPost(user.uid, user.displayName, user.photoURL, text.trim(), {
      book:    bookName,
      chapter: chapter,
      verse:   verse.verse,
      text:    verse.text,
    });
    onClose();
  }

  return (
    <div className="new-post-overlay" onClick={onClose}>
      <div className="new-post-modal" onClick={e => e.stopPropagation()}>
        <div className="new-post-header">
          <span className="new-post-title">Publicar en el Feed</span>
          <button className="new-post-close" onClick={onClose}>✕</button>
        </div>

        <div className="new-post-verse-preview">
          <span className="new-post-verse-ref">{bookName} {chapter}:{verse.verse}</span>
          <p>"{verse.text}"</p>
        </div>

        <textarea
          className="new-post-textarea"
          placeholder="¿Qué reflexión tenés sobre este versículo?"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          autoFocus
        />

        <button
          className="new-post-submit"
          onClick={submit}
          disabled={!text.trim() || submitting}
        >
          {submitting ? 'Publicando…' : '🌐 Publicar en el Feed'}
        </button>
      </div>
    </div>
  );
}

// ── GeoMap ──────────────────────────────────────────────────────────────────────

function GeoMap({ lugares }) {
  const [sel, setSel]         = useState(0);
  const [showMap, setShowMap] = useState(false);
  if (!lugares || lugares.length === 0) return null;
  const place    = lugares[sel];
  const embedSrc = `https://maps.google.com/maps?q=${place.lat},${place.lng}&z=${place.zoom || 10}&output=embed&hl=es`;
  const openUrl  = `https://www.google.com/maps?q=${place.lat},${place.lng}&z=${place.zoom || 10}`;
  return (
    <div className="geo-map-block">
      <div className="geo-map-chips">
        <span className="geo-map-pin">📍</span>
        {lugares.map((l, i) => (
          <button
            key={i}
            className={`geo-place-chip${sel === i ? ' active' : ''}`}
            onClick={() => { setSel(i); setShowMap(true); }}
          >
            {l.nombre}
          </button>
        ))}
      </div>
      {!showMap ? (
        <button className="geo-map-load-btn" onClick={() => setShowMap(true)}>
          🗺️ Ver en mapa
        </button>
      ) : (
        <>
          <div className="geo-map-frame">
            <iframe
              key={sel}
              title={place.nombre}
              src={embedSrc}
              width="100%"
              height="240"
              style={{ border: 'none', borderRadius: '10px', display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="geo-map-open-link"
          >
            ↗ Abrir <strong>{place.nombre}</strong> en Google Maps
          </a>
        </>
      )}
    </div>
  );
}

// ── VerseCard ─────────────────────────────────────────────────────────────────

function VerseCard({ verse, bookName, chapter, highlight, note, bookmark, onHighlight, onNote, onBookmark, onShare, onLike, likeCount, onPublishToFeed, user, following, onFollowToggle, darkMode }) {
  const [showActions,    setShowActions]    = useState(false);
  const [showColors,     setShowColors]     = useState(false);
  const [showNote,       setShowNote]       = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [showComments,   setShowComments]   = useState(false);
  const [activeTab,      setActiveTab]      = useState(null);
  const [noteVal,        setNoteVal]        = useState(note || '');
  const [copied,         setCopied]         = useState(false);

  const verseKey   = `${bookName}_${chapter}_${verse.verse}`;
  const commentKey = verseKey;
  const verseData  = COMMENTARY[commentKey];
  const bhBook     = BIBLEHUB_BOOK[bookName];
  const biblehubUrl = bhBook ? `https://biblehub.com/${bhBook}/${chapter}-${verse.verse}.htm` : null;

  // Resuelve la fuente para el tab activo:
  // 1. Si el comentario tiene fuentes por tab → usa esa
  // 2. Si no, fallback a BibleHub (referencia cruzada general)
  function resolveSource(tab) {
    const tabFuente = verseData?.fuentes?.[tab];
    if (tabFuente) {
      if (typeof tabFuente === 'string' && tabFuente.startsWith('http')) {
        return { url: tabFuente, label: '🔗 Ver fuente' };
      }
      if (typeof tabFuente === 'object') return tabFuente;
      // Texto de atribución sin URL
      return { url: null, label: `📖 ${tabFuente}` };
    }
    return biblehubUrl ? { url: biblehubUrl, label: '🔗 Referencias en BibleHub' } : null;
  }

  function toggleActions() {
    const next = !showActions;
    setShowActions(next);
    if (!next) {
      setShowColors(false);
      setShowNote(false);
      setShowCommentary(false);
      setShowComments(false);
    }
  }
  const allTabs     = verseData ? COMMENT_TYPES.filter(t => verseData[t.key]) : [];
  const nonRefTabs  = allTabs.filter(t => t.key !== 'referencia');
  const hasRef      = !!verseData?.referencia;
  const hasCommentary = nonRefTabs.length > 0;

  useEffect(() => { setNoteVal(note || '') }, [note]);

  function handleReference() {
    const alreadyOpen = showCommentary && activeTab === 'referencia';
    if (alreadyOpen) { setShowCommentary(false); }
    else { setActiveTab('referencia'); setShowCommentary(true); }
    setShowColors(false); setShowNote(false);
  }

  function handleCommentary() {
    const alreadyOpen = showCommentary && activeTab !== 'referencia';
    if (alreadyOpen) { setShowCommentary(false); }
    else { setActiveTab(nonRefTabs[0]?.key || null); setShowCommentary(true); }
    setShowColors(false); setShowNote(false);
  }

  function handleNoteBlur() { onNote(verse.verse, noteVal); }

  async function handleShare() {
    const text = `${bookName} ${chapter}:${verse.verse}\n"${verse.text}"\n— Biblia Reina-Valera`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${bookName} ${chapter}:${verse.verse}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      onShare?.(verse.verse);
    } catch {}
  }

  const bgColor = getHighlightBg(highlight, darkMode);
  const highlightStyle = bgColor
    ? { backgroundColor: bgColor, borderRadius: '10px', color: darkMode ? '#f5f0eb' : '#1c1917' }
    : {};

  return (
    <div id={`verse-${verse.verse}`} className="verse-card">
      <div className="verse-body" style={highlightStyle}>
        <div className="verse-text-row">
          <span className="verse-num">
            {verse.verse}
            {(hasCommentary || hasRef) && (
              <span className="verse-badges">
                {hasCommentary && <span className="verse-badge badge-commentary" title="Tiene comentario">📖</span>}
                {hasRef        && <span className="verse-badge badge-ref"        title="Tiene referencias">🔗</span>}
              </span>
            )}
          </span>
          <span className="verse-text">{verse.text}</span>
          {(showActions || likeCount > 0) && (
            <button
              className={`heart-btn ${likeCount > 0 ? 'has-likes' : ''}`}
              onClick={e => { e.stopPropagation(); onLike?.(verseKey); }}
              title="Me gusta"
            >
              {likeCount > 0 ? '♥' : '♡'}
              {likeCount > 0 && <span className="heart-count">{likeCount}</span>}
            </button>
          )}
          <button
            className={`expand-btn ${showActions ? 'open' : ''}`}
            onClick={toggleActions}
            title="Opciones"
          >
            <ChevronIcon />
          </button>
        </div>
      </div>

      {note && !showNote && (
        <div className="existing-note">📝 {note}</div>
      )}

      {showActions && (
        <div className="verse-actions">
          <button
            className={`icon-btn ${highlight ? 'active' : ''}`}
            onClick={() => { setShowColors(v => !v); setShowNote(false); setShowCommentary(false); }}
            title="Subrayar"
          >
            <HighlightIcon />
          </button>

          <button
            className={`icon-btn ${(note || showNote) ? 'active' : ''}`}
            onClick={() => { setShowNote(v => !v); setShowColors(false); setShowCommentary(false); }}
            title={note ? 'Ver nota' : 'Agregar nota'}
          >
            <NoteIcon />
          </button>

          <button
            className={`icon-btn ${bookmark ? 'active bookmark-active' : ''}`}
            onClick={() => onBookmark(verse.verse)}
            title={bookmark ? 'Quitar marcador' : 'Guardar'}
          >
            <BookmarkIcon filled={!!bookmark} />
          </button>

          <button
            className={`icon-btn ${showCommentary && activeTab === 'referencia' ? 'active' : ''}`}
            onClick={handleReference}
            title="Referencias cruzadas"
          >
            <ReferenceIcon />
          </button>

          <button
            className={`icon-btn ${copied ? 'active' : ''}`}
            onClick={handleShare}
            title={copied ? '¡Copiado!' : 'Compartir'}
          >
            <ShareIcon />
          </button>

          {hasCommentary && (
            <button
              className={`icon-btn ${showCommentary && activeTab !== 'referencia' ? 'active' : ''}`}
              onClick={handleCommentary}
              title="Comentario"
            >
              <CommentaryIcon />
            </button>
          )}

          <button
            className={`icon-btn ${showComments ? 'active' : ''}`}
            onClick={() => { setShowComments(v => !v); setShowColors(false); setShowNote(false); setShowCommentary(false); }}
            title="Comentarios públicos"
          >
            <PublicCommentIcon />
          </button>

          {user && !user.isAnonymous && (
            <button
              className="icon-btn"
              onClick={() => onPublishToFeed?.(verse)}
              title="Publicar en el Feed"
            >
              <FeedPublishIcon />
            </button>
          )}
        </div>
      )}

      {showColors && (
        <div className="color-picker">
          <span className="color-label">Color:</span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              className={`color-dot ${highlight === c.id ? 'selected' : ''}`}
              style={{ backgroundColor: darkMode ? c.dark : c.light }}
              title={c.label}
              onClick={() => {
                onHighlight(verse.verse, highlight === c.id ? null : c.id);
                if (highlight === c.id) setShowColors(false);
              }}
            />
          ))}
          <label
            className={`color-dot color-custom-swatch ${highlight?.startsWith('#') ? 'selected' : ''}`}
            style={{ background: highlight?.startsWith('#') ? getHighlightBg(highlight, darkMode) : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}
            title="Color personalizado"
          >
            <input
              type="color"
              className="color-custom-input"
              value={highlight?.startsWith('#') ? highlight : '#fbbf24'}
              onChange={e => onHighlight(verse.verse, e.target.value)}
            />
          </label>
          {highlight && (
            <button className="remove-color-btn" onClick={() => { onHighlight(verse.verse, null); setShowColors(false); }}>
              ✕ Quitar
            </button>
          )}
        </div>
      )}

      {showNote && (
        <div className="note-panel">
          <textarea
            className="note-textarea"
            placeholder="Escribe tu nota sobre este versículo…"
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            onBlur={handleNoteBlur}
            autoFocus
          />
          <div className="note-saved">
            {noteVal.trim() ? '✓ Se guarda automáticamente' : 'Escribe para guardar'}
          </div>
        </div>
      )}

      {showComments && (
        <CommentsPanel
          verseKey={`${bookName}_${chapter}_${verse.verse}`}
          user={user}
          following={following}
          onFollowToggle={onFollowToggle}
        />
      )}

      {showCommentary && (
        <div className="commentary-panel">
          {activeTab === 'referencia' ? (
            <div className="commentary-content">
              <div className="commentary-content-label">📖 Referencias cruzadas</div>
              {hasRef
                ? verseData.referencia
                : <span className="no-ref-text">Sin referencias cruzadas disponibles.</span>
              }
              {hasCommentary && (
                <button className="see-commentary-link" onClick={() => setActiveTab(nonRefTabs[0]?.key)}>
                  Ver comentario completo →
                </button>
              )}
              {biblehubUrl && (
                <a href={biblehubUrl} target="_blank" rel="noopener noreferrer" className="commentary-source">
                  🔗 Ver en BibleHub
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="commentary-tabs">
                {nonRefTabs.map(t => (
                  <button
                    key={t.key}
                    className={`commentary-tab ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
                {hasRef && (
                  <button className="commentary-tab" onClick={() => setActiveTab('referencia')}>
                    📖 Ref.
                  </button>
                )}
              </div>
              {activeTab && verseData?.[activeTab] && (
                <div className="commentary-content">
                  <div className="commentary-content-label">
                    {COMMENT_TYPES.find(t => t.key === activeTab)?.icon}{' '}
                    {COMMENT_TYPES.find(t => t.key === activeTab)?.label}
                  </div>
                  {verseData[activeTab]}
                  {activeTab === 'geografico' && GEO_LUGARES[commentKey] && (
                    <GeoMap lugares={GEO_LUGARES[commentKey]} />
                  )}
                  {(() => {
                    const src = resolveSource(activeTab);
                    if (!src) return null;
                    if (src.url) return (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="commentary-source">
                        {src.label}
                      </a>
                    );
                    return <span className="commentary-source">{src.label}</span>;
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Avatar del usuario ────────────────────────────────────────────────────────

function UserAvatar({ user, photoURLOverride, onClick }) {
  const isGuest  = !user || user.isAnonymous;
  const photoURL = photoURLOverride || user?.photoURL;
  if (photoURL) {
    return (
      <button className="avatar-btn" onClick={onClick} title="Mi perfil">
        <img src={photoURL} alt="avatar" className="avatar-img" />
      </button>
    );
  }
  return (
    <button className="avatar-btn" onClick={onClick} title="Mi perfil">
      <span className="avatar-initials">
        {isGuest ? '👤' : (user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
      </span>
    </button>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [user,            setUser]           = useState(undefined); // undefined = cargando
  const [books,           setBooks]          = useState([]);
  const [bibleLoading,    setBibleLoading]   = useState(true);
  const [darkMode,        setDarkMode]       = useState(() => {
    const saved = lsGet('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [selectedBook,    setSelectedBook]   = useState('');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchQuery,     setSearchQuery]    = useState('');
  const [highlights,      setHighlights]     = useState({});
  const [notes,           setNotes]          = useState({});
  const [bookmarks,       setBookmarks]      = useState({});
  const [shared,          setShared]         = useState({});
  const [following,       setFollowing]      = useState([]);
  const [followers,       setFollowers]      = useState([]);
  const [likes,           setLikes]          = useState({});
  const [translation,     setTranslation]    = useState(() => lsGet('bible_translation') || 'rvr');
  const [extVerses,       setExtVerses]      = useState({});
  const [extLoading,      setExtLoading]     = useState(false);
  const [jumpVerse,       setJumpVerse]      = useState(null);
  const [streak,          setStreak]         = useState(0);
  const [privacy,         setPrivacy]        = useState({
    notes: false, highlights: false, bookmarks: false,
    publicProfile: true, followers: true, following: true,
  });
  const [showMenu,           setShowMenu]          = useState(false);
  const [showGen,            setShowGen]           = useState(false);
  const [showFeed,           setShowFeed]          = useState(false);
  const [showCommentaries,   setShowCommentaries]  = useState(false);
  const [showBibleMenu,      setShowBibleMenu]     = useState(false);
  const [feedPost,           setFeedPost]          = useState(null); // { verse, bookName, chapter }
  const [userPhotoURL,       setUserPhotoURL]      = useState(null);
  const [globalSearch,       setGlobalSearch]      = useState('');
  const [installPrompt,      setInstallPrompt]     = useState(null);
  const [showInstallBanner,  setShowInstallBanner] = useState(false);
  const [showUpdateBanner,   setShowUpdateBanner]  = useState(false);
  const swRegRef = useRef(null);

  // Detectar si es iOS y no está instalada
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const [showIOSHint, setShowIOSHint] = useState(() =>
    isIOS && !isStandalone && !localStorage.getItem('ios_hint_dismissed')
  );

  // Captura el evento de instalación (Android/Chrome)
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Detectar actualización del SW
  useEffect(() => {
    const handler = e => { swRegRef.current = e.detail?.reg; setShowUpdateBanner(true); };
    window.addEventListener('swUpdateAvailable', handler);
    return () => window.removeEventListener('swUpdateAvailable', handler);
  }, []);

  async function handleInstallPWA() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
    setShowInstallBanner(false);
  }

  function handleApplyUpdate() {
    if (swRegRef.current?.waiting) swRegRef.current.waiting.postMessage('SKIP_WAITING');
    setShowUpdateBanner(false);
    window.location.reload();
  }

  // Aplicar tema
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    lsSet('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Guardar preferencia de traducción
  useEffect(() => { lsSet('bible_translation', translation); }, [translation]);

  // Cargar Biblia
  useEffect(() => {
    fetch('/es_rvr.json')
      .then(r => r.json())
      .then(raw => {
        const converted = convertBible(raw);
        setBooks(converted);
        setSelectedBook(converted[0]?.name || '');
        setBibleLoading(false);
      })
      .catch(() => setBibleLoading(false));
  }, []);

  // Auth state + carga de datos
  useEffect(() => {
    return onAuthChange(async (firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        const data = await loadUserData(firebaseUser.uid);
        const { hl, nt, bm, sh, following, followers, streak, privacy } = fromFirestore(data);
        setHighlights(hl); setNotes(nt); setBookmarks(bm); setShared(sh);
        setFollowing(following); setFollowers(followers); setStreak(streak); setPrivacy(privacy);
        // Cargar foto desde Firestore (base64 no cabe en Firebase Auth)
        if (data.photoURL) setUserPhotoURL(data.photoURL);
        // Racha de lectura
        const newStreak = await updateReadingStreak(firebaseUser.uid, streak, data.lastReadDate);
        setStreak(newStreak);
        // Guardar perfil y presencia (no sobreescribir photoURL si Auth la tiene vacía)
        await savePresence(firebaseUser.uid, {
          displayName: firebaseUser.displayName || data.displayName || '',
          email:       firebaseUser.email || '',
          ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL } : {}),
          createdAt:   data.createdAt || firebaseUser.metadata.creationTime || new Date().toISOString(),
        });
      } else if (firebaseUser?.isAnonymous) {
        const hl = {}, nt = {}, bm = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith('hl_'))   hl[k] = lsGet(k);
          if (k?.startsWith('note_')) nt[k] = lsGet(k);
          if (k?.startsWith('bm_'))   bm[k] = lsGet(k);
        }
        setHighlights(hl); setNotes(nt); setBookmarks(bm); setShared({}); setFollowing([]); setFollowers([]);
      } else {
        setHighlights({}); setNotes({}); setBookmarks({}); setShared({}); setFollowing([]); setFollowers([]);
      }
      setUser(firebaseUser);
    });
  }, []);

  // Actualizar presencia cada 2 minutos
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const id = setInterval(() => savePresence(user.uid, {}), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  // Cargar corazones del capítulo actual
  useEffect(() => {
    const chapterData = books.find(b => b.name === selectedBook)
      ?.chapters.find(c => c.chapter === selectedChapter);
    if (!chapterData) return;
    loadChapterLikes(selectedBook, selectedChapter, chapterData.verses).then(setLikes);
  }, [selectedBook, selectedChapter, books]);

  // Cargar versiones externas (NTV, NBLA) desde bolls.life API con caché en localStorage
  useEffect(() => {
    const slug = BOLLS_SLUG[translation];
    if (!slug) { setExtVerses({}); return; }
    const currentBook = books.find(b => b.name === selectedBook);
    if (!currentBook) return;
    const bookNum = BOLLS_NUM[currentBook.abbrev];
    if (!bookNum) return;
    const cacheKey = `${translation}_${bookNum}_${selectedChapter}`;
    const cached = lsGet(cacheKey);
    if (cached) {
      try { setExtVerses(JSON.parse(cached)); return; } catch {}
    }
    setExtLoading(true);
    fetch(`https://bolls.life/get-text/${slug}/${bookNum}/${selectedChapter}/`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        data.forEach(v => { map[v.verse] = v.text.replace(/<[^>]*>/g, '').trim(); });
        lsSet(cacheKey, JSON.stringify(map));
        setExtVerses(map);
        setExtLoading(false);
      })
      .catch(() => setExtLoading(false));
  }, [translation, selectedBook, selectedChapter, books]);

  // Scroll al versículo objetivo tras navegar con referencia "Libro cap:ver"
  useEffect(() => {
    if (!jumpVerse) return;
    const doScroll = () => {
      const el = document.getElementById(`verse-${jumpVerse}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('verse-jump-flash');
        setTimeout(() => { el.classList.remove('verse-jump-flash'); }, 2200);
      }
      setJumpVerse(null);
    };
    const t = setTimeout(doScroll, 150);
    return () => clearTimeout(t);
  }, [jumpVerse]);

  // Sincronizar con Firestore cuando cambia el usuario
  async function syncFirestore(hl, nt, bm, sh, uid) {
    if (!uid) return;
    await saveUserData(uid, toFirestore(hl, nt, bm, sh));
  }

  const isCloud = user && !user.isAnonymous;

  const book         = books.find(b => b.name === selectedBook);
  const chapter      = book?.chapters.find(c => c.chapter === selectedChapter);
  const rawVerses    = chapter?.verses || [];
  const displayVerses = rawVerses
    .map(v => ({
      ...v,
      text: (BOLLS_SLUG[translation] && extVerses[v.verse]) ? extVerses[v.verse] : v.text,
    }))
    .filter(v => !searchQuery.trim() || v.text.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalChapters = book?.chapters.length || 1;

  // Búsqueda global — escanea todos los libros cuando se activa
  const globalResults = React.useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 3) return [];
    const results = [];
    for (const b of books) {
      for (const ch of b.chapters) {
        for (const v of ch.verses) {
          if (v.text.toLowerCase().includes(q)) {
            results.push({ bookName: b.name, chapter: ch.chapter, verse: v.verse, text: v.text });
            if (results.length >= 60) return results;
          }
        }
      }
    }
    return results;
  }, [globalSearch, books]);

  function changeBook(name) {
    setSelectedBook(name); setSelectedChapter(1); setSearchQuery('');
    lsSet('bible_translation', translation);
  }
  function changeChapter(n) {
    setSelectedChapter(n); setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleHighlight = useCallback((verseNum, colorId) => {
    const key = `hl_${selectedBook}_${selectedChapter}_${verseNum}`;
    let newHl;
    if (colorId) {
      lsSet(key, colorId);
      newHl = { ...highlights, [key]: colorId };
    } else {
      localStorage.removeItem(key);
      newHl = { ...highlights }; delete newHl[key];
    }
    setHighlights(newHl);
    if (isCloud) syncFirestore(newHl, notes, bookmarks, shared, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  const handleNote = useCallback((verseNum, text) => {
    const key = `note_${selectedBook}_${selectedChapter}_${verseNum}`;
    let newNt;
    if (text?.trim()) {
      lsSet(key, text);
      newNt = { ...notes, [key]: text };
    } else {
      localStorage.removeItem(key);
      newNt = { ...notes }; delete newNt[key];
    }
    setNotes(newNt);
    if (isCloud) syncFirestore(highlights, newNt, bookmarks, shared, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  const handleBookmark = useCallback((verseNum) => {
    const key = `bm_${selectedBook}_${selectedChapter}_${verseNum}`;
    let newBm;
    if (bookmarks[key]) {
      localStorage.removeItem(key);
      newBm = { ...bookmarks }; delete newBm[key];
    } else {
      lsSet(key, '1');
      newBm = { ...bookmarks, [key]: '1' };
    }
    setBookmarks(newBm);
    if (isCloud) syncFirestore(highlights, notes, newBm, shared, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  const handleFollowToggle = useCallback(async (targetUid) => {
    if (!user || user.isAnonymous) return;
    const isFollowing = following.includes(targetUid);
    if (isFollowing) {
      await unfollowUser(user.uid, targetUid);
      setFollowing(f => f.filter(uid => uid !== targetUid));
    } else {
      await followUser(user.uid, targetUid);
      setFollowing(f => [...f, targetUid]);
    }
  }, [user, following]);

  const handleLike = useCallback(async (verseKey) => {
    if (!user || user.isAnonymous) return;
    setLikes(prev => ({ ...prev, [verseKey]: (prev[verseKey] || 0) + 1 }));
    await incrementLike(verseKey);
  }, [user]);

  const handleNoteAtRef = useCallback((bookName, chapterNum, verseNum, noteText) => {
    const key = `note_${bookName}_${chapterNum}_${verseNum}`;
    let newNt;
    if (noteText?.trim()) {
      lsSet(key, noteText);
      newNt = { ...notes, [key]: noteText };
    } else {
      localStorage.removeItem(key);
      newNt = { ...notes }; delete newNt[key];
    }
    setNotes(newNt);
    if (isCloud) syncFirestore(highlights, newNt, bookmarks, shared, user.uid);
  }, [highlights, notes, bookmarks, shared, user, isCloud]);

  const handleShare = useCallback((verseNum) => {
    const key = `sh_${selectedBook}_${selectedChapter}_${verseNum}`;
    const newSh = { ...shared, [key]: new Date().toISOString() };
    setShared(newSh);
    if (isCloud) syncFirestore(highlights, notes, bookmarks, newSh, user.uid);
  }, [selectedBook, selectedChapter, highlights, notes, bookmarks, shared, user, isCloud]);

  // ── Loading / Auth ──────────────────────────────────────────────────────────

  const authLoading = user === undefined;
  const loading = authLoading || bibleLoading;

  if (loading) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="loader">
          <div className="loader-icon"><img src={logo3} alt="Bibl.ia" style={{ width: 72, height: 72, objectFit: 'contain' }} /></div>
          <div>Cargando Bibl.ia…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen darkMode={darkMode} />;
  }

  if (showGen) {
    return <GenPanel onClose={() => setShowGen(false)} darkMode={darkMode} />;
  }

  if (showFeed) {
    return (
      <FeedPage
        user={user}
        books={books}
        onSaveNote={handleNoteAtRef}
        onClose={() => setShowFeed(false)}
        darkMode={darkMode}
      />
    );
  }

  if (showCommentaries) {
    return (
      <TheologicalCommentaries
        onClose={() => setShowCommentaries(false)}
        darkMode={darkMode}
        currentUser={user}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Banner de actualización disponible */}
      {showUpdateBanner && (
        <div className="pwa-banner pwa-banner-update">
          <span>🔄 Nueva versión disponible</span>
          <button className="pwa-banner-btn" onClick={handleApplyUpdate}>Actualizar</button>
          <button className="pwa-banner-close" onClick={() => setShowUpdateBanner(false)}>✕</button>
        </div>
      )}

      {/* Banner de instalación Android/Chrome */}
      {showInstallBanner && !isStandalone && (
        <div className="pwa-banner pwa-banner-install">
          <span>📲 Instalá Bibl.ia en tu celular</span>
          <button className="pwa-banner-btn" onClick={handleInstallPWA}>Instalar</button>
          <button className="pwa-banner-close" onClick={() => setShowInstallBanner(false)}>✕</button>
        </div>
      )}

      {/* Instrucción para iOS (Add to Home Screen) */}
      {showIOSHint && (
        <div className="pwa-banner pwa-banner-ios">
          <span>📲 Para instalar: tocá <strong>Compartir</strong> → <strong>Agregar a inicio</strong></span>
          <button className="pwa-banner-close" onClick={() => {
            localStorage.setItem('ios_hint_dismissed', '1');
            setShowIOSHint(false);
          }}>✕</button>
        </div>
      )}

      <header className="header">
        <div className="header-title">
          <span>✝️</span>
          Bibl.ia
        </div>
        <div className="header-actions">
          <button
            className="theme-btn"
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* ── Menú Biblia ── */}
          <div className="bible-menu-wrapper">
            <button
              className="bible-menu-trigger"
              onClick={() => setShowBibleMenu(v => !v)}
              title="Menú Bibl.ia"
            >
              <img src={logo3} alt="Bibl.ia" className="bible-menu-logo" />
            </button>
            {showBibleMenu && (
              <>
                <div className="bible-menu-backdrop" onClick={() => setShowBibleMenu(false)} />
                <div className="bible-menu-dropdown">
                  <button
                    className="bible-menu-item"
                    onClick={() => { setShowBibleMenu(false); setShowFeed(true); }}
                  >
                    <span className="bible-menu-icon">🌐</span>
                    <div>
                      <div className="bible-menu-label">Feed Bíblico</div>
                      <div className="bible-menu-sub">Reflexiones de la comunidad</div>
                    </div>
                  </button>
                  <button
                    className="bible-menu-item"
                    onClick={() => { setShowBibleMenu(false); setShowGen(true); }}
                  >
                    <span className="bible-menu-icon">✨</span>
                    <div>
                      <div className="bible-menu-label">Gen — IA Bíblica</div>
                      <div className="bible-menu-sub">Asistente bíblico con Groq</div>
                    </div>
                  </button>
                  <button
                    className="bible-menu-item"
                    onClick={() => { setShowBibleMenu(false); setShowCommentaries(true); }}
                  >
                    <span className="bible-menu-icon">📚</span>
                    <div>
                      <div className="bible-menu-label">Comentarios Teológicos</div>
                      <div className="bible-menu-sub">MacArthur y otros autores</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <UserAvatar user={user} photoURLOverride={userPhotoURL} onClick={() => setShowMenu(true)} />
        </div>
      </header>

      <nav className="nav-bar">
        <div className="nav-selects">
          <select className="nav-select" value={selectedBook} onChange={e => changeBook(e.target.value)}>
            {books.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <select className="nav-select" value={selectedChapter} onChange={e => changeChapter(Number(e.target.value))}>
            {book?.chapters.map(c => (
              <option key={c.chapter} value={c.chapter}>Capítulo {c.chapter}</option>
            ))}
          </select>
        </div>
        <select
          className="translation-select"
          value={translation}
          onChange={e => { setTranslation(e.target.value); setExtVerses({}); }}
          title="Versión bíblica"
        >
          <option value="rvr">RVR 1960 — Reina-Valera</option>
          <option value="ntv">{extLoading && translation === 'ntv' ? 'NTV (cargando…)' : 'NTV — Nueva Traducción Viviente'}</option>
          <option value="nbla">{extLoading && translation === 'nbla' ? 'NBLA (cargando…)' : 'NBLA — Nueva Biblia de las Américas'}</option>
        </select>
        <div className="nav-chapter-bar">
          <button className="nav-btn" disabled={selectedChapter <= 1} onClick={() => changeChapter(selectedChapter - 1)}>
            ← Anterior
          </button>
          <span className="nav-chapter-label">
            {selectedBook} · {selectedChapter} / {totalChapters}
          </span>
          <button className="nav-btn" disabled={selectedChapter >= totalChapters} onClick={() => changeChapter(selectedChapter + 1)}>
            Siguiente →
          </button>
        </div>
      </nav>

      {/* Breadcrumb sticky — muestra libro y capítulo mientras se hace scroll */}
      <div className="sticky-breadcrumb">
        <span className="sticky-bc-book">{selectedBook}</span>
        <span className="sticky-bc-sep">·</span>
        <span className="sticky-bc-chap">Cap. {selectedChapter}</span>
        <span className="sticky-bc-of">/ {totalChapters}</span>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar… o ir a Juan 3:16"
          value={globalSearch || searchQuery}
          onChange={e => {
            if (globalSearch) setGlobalSearch(e.target.value);
            else setSearchQuery(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const q = e.target.value.trim();
              const ref = parseVerseRef(q, books);
              if (ref) {
                setGlobalSearch(''); setSearchQuery('');
                if (ref.book !== selectedBook) {
                  changeBook(ref.book);
                  setTimeout(() => { changeChapter(ref.chapter); setTimeout(() => setJumpVerse(ref.verse), 100); }, 80);
                } else if (ref.chapter !== selectedChapter) {
                  changeChapter(ref.chapter);
                  setTimeout(() => setJumpVerse(ref.verse), 100);
                } else {
                  setJumpVerse(ref.verse);
                }
                return;
              }
              if (q.length >= 3) { setGlobalSearch(q); setSearchQuery(''); }
            }
            if (e.key === 'Escape') { setGlobalSearch(''); setSearchQuery(''); }
          }}
        />
        {(globalSearch || searchQuery) && (
          <button className="search-clear-btn" onClick={() => { setGlobalSearch(''); setSearchQuery(''); }} title="Limpiar búsqueda">×</button>
        )}
        <button
          className="search-global-btn"
          onClick={() => {
            const q = (globalSearch || searchQuery).trim();
            const ref = parseVerseRef(q, books);
            if (ref) {
              setGlobalSearch(''); setSearchQuery('');
              if (ref.book !== selectedBook) {
                changeBook(ref.book);
                setTimeout(() => { changeChapter(ref.chapter); setTimeout(() => setJumpVerse(ref.verse), 100); }, 80);
              } else if (ref.chapter !== selectedChapter) {
                changeChapter(ref.chapter);
                setTimeout(() => setJumpVerse(ref.verse), 100);
              } else {
                setJumpVerse(ref.verse);
              }
              return;
            }
            if (q.length >= 3) { setGlobalSearch(q); setSearchQuery(''); }
          }}
          title="Buscar en toda la Biblia"
        >🔍</button>
      </div>

      {globalSearch && (
        <div className="global-results">
          <div className="global-results-header">
            {globalResults.length === 0
              ? `Sin resultados para "${globalSearch}"`
              : `${globalResults.length === 60 ? '60+' : globalResults.length} resultado${globalResults.length !== 1 ? 's' : ''} para "${globalSearch}"`}
          </div>
          {globalResults.map((r, i) => (
            <button
              key={i}
              className="global-result-item"
              onClick={() => {
                setGlobalSearch('');
                setSearchQuery('');
                changeBook(r.bookName);
                setTimeout(() => changeChapter(r.chapter), 50);
              }}
            >
              <span className="global-result-ref">{r.bookName} {r.chapter}:{r.verse}</span>
              <span className="global-result-text">{r.text}</span>
            </button>
          ))}
        </div>
      )}

      <div className="verses-container">
        <div className="chapter-title">
          <h2>{selectedBook}</h2>
          <p>Capítulo {selectedChapter} — {chapter?.verses.length || 0} versículos</p>
        </div>

        {displayVerses.length === 0 ? (
          <div className="no-results">
            {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Capítulo sin versículos'}
          </div>
        ) : (
          displayVerses.map(verse => {
            const hlKey   = `hl_${selectedBook}_${selectedChapter}_${verse.verse}`;
            const noteKey = `note_${selectedBook}_${selectedChapter}_${verse.verse}`;
            const bmKey   = `bm_${selectedBook}_${selectedChapter}_${verse.verse}`;
            return (
              <VerseCard
                key={verse.verse}
                verse={verse}
                bookName={selectedBook}
                chapter={selectedChapter}
                highlight={highlights[hlKey] || null}
                note={notes[noteKey] || ''}
                bookmark={!!bookmarks[bmKey]}
                likeCount={likes[`${selectedBook}_${selectedChapter}_${verse.verse}`] || 0}
                onHighlight={handleHighlight}
                onNote={handleNote}
                onBookmark={handleBookmark}
                onShare={handleShare}
                onLike={handleLike}
                onPublishToFeed={v => setFeedPost({ verse: v, bookName: selectedBook, chapter: selectedChapter })}
                user={user}
                following={following}
                onFollowToggle={handleFollowToggle}
                darkMode={darkMode}
              />
            );
          })
        )}

        {/* ── Navegación al final del capítulo ── */}
        {!searchQuery && (
          <div className="chapter-bottom-nav">
            <button
              className="nav-btn"
              disabled={selectedChapter <= 1}
              onClick={() => changeChapter(selectedChapter - 1)}
            >
              ← Anterior
            </button>
            <span className="nav-chapter-label">
              {selectedBook} · {selectedChapter} / {totalChapters}
            </span>
            <button
              className="nav-btn"
              disabled={selectedChapter >= totalChapters}
              onClick={() => changeChapter(selectedChapter + 1)}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {showMenu && (
        <UserMenu
          user={user}
          books={books}
          bookmarks={bookmarks}
          highlights={highlights}
          notes={notes}
          shared={shared}
          following={following}
          followers={followers}
          streak={streak}
          privacy={privacy}
          onPrivacyChange={setPrivacy}
          darkMode={darkMode}
          onClose={() => setShowMenu(false)}
          onNavigate={(bookName, chapterNum) => {
            changeBook(bookName);
            setTimeout(() => changeChapter(chapterNum), 50);
          }}
          onFollowingChange={setFollowing}
          onPhotoUpdate={url => setUserPhotoURL(url)}
        />
      )}

      {feedPost && (
        <PostToFeedModal
          user={user}
          verse={feedPost.verse}
          bookName={feedPost.bookName}
          chapter={feedPost.chapter}
          onClose={() => setFeedPost(null)}
        />
      )}
    </div>
  );
}
