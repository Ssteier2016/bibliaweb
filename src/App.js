import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';
import { COMMENTARY } from './data/commentary';
import { CSLEWIS_COMMENTARY } from './data/cslewis';
import { SPURGEON_COMMENTARY } from './data/spurgeon';
import { MATTHEW_HENRY_COMMENTARY } from './data/matthew_henry';
import { CALVIN_COMMENTARY } from './data/calvin';
import { LUTHER_COMMENTARY } from './data/luther';
import { EDWARDS_COMMENTARY } from './data/edwards';
import { ANDREW_MURRAY_COMMENTARY } from './data/andrew_murray';
import { MACARTHUR_COMMENTARY } from './data/macarthur';
import AuthScreen               from './AuthScreen';
import UserMenu                 from './UserMenu';
import CommentsPanel            from './CommentsPanel';
import GenPanel                 from './GenPanel';
import FeedPage                 from './FeedPage';
import TheologicalCommentaries  from './TheologicalCommentaries';
import logo3                    from './logo3.png';
import { onAuthChange, loadUserData, saveUserData, savePresence, followUser, unfollowUser, updateReadingStreak, incrementLike, loadChapterLikes, createPost, uploadPostImage } from './firebase';
import { PROLOGUES }            from './data/prologues';

// Agrupar comentarios teológicos por versículo para mostrarlos dinámicamente en el lector
const THEOLOGIANS_LIST = [
  { id: 'luther', name: 'Martín Lutero', initials: 'ML', color: '#7a4f10', list: LUTHER_COMMENTARY },
  { id: 'calvin', name: 'Juan Calvino', initials: 'JC', color: '#6b1a1a', list: CALVIN_COMMENTARY },
  { id: 'matthew_henry', name: 'Matthew Henry', initials: 'MH', color: '#2d5a27', list: MATTHEW_HENRY_COMMENTARY },
  { id: 'edwards', name: 'Jonathan Edwards', initials: 'JE', color: '#1a4040', list: EDWARDS_COMMENTARY },
  { id: 'spurgeon', name: 'Charles H. Spurgeon', initials: 'SP', color: '#4a1c6e', list: SPURGEON_COMMENTARY },
  { id: 'andrew_murray', name: 'Andrew Murray', initials: 'AM', color: '#3d1a6e', list: ANDREW_MURRAY_COMMENTARY },
  { id: 'cslewis', name: 'C.S. Lewis', initials: 'CS', color: '#6b3a2a', list: CSLEWIS_COMMENTARY },
  { id: 'macarthur', name: 'John MacArthur', initials: 'JM', color: '#0f3a5f', list: MACARTHUR_COMMENTARY }
];

function refToKey(ref) {
  if (!ref) return '';
  const lastSpace = ref.lastIndexOf(' ');
  if (lastSpace === -1) return '';
  const book = ref.substring(0, lastSpace);
  const numbers = ref.substring(lastSpace + 1).replace(':', '_');
  return `${book}_${numbers}`;
}

const THEOLOGICAL_BY_VERSE = (() => {
  const map = {};
  THEOLOGIANS_LIST.forEach(author => {
    author.list.forEach(item => {
      const key = refToKey(item.ref);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push({
        authorId: author.id,
        authorName: author.name,
        initials: author.initials,
        color: author.color,
        titulo: item.titulo,
        texto: item.texto,
        obra: item.obra,
        url: item.url
      });
    });
  });
  return map;
})();

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
  if (!colorId || typeof colorId !== 'string' || colorId.startsWith('[')) return null;
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

// Constants for Biblical Journeys and Ancient Manuscripts
const VIAJES_BIBLICOS = {
  abraham: {
    nombre: "Viaje de Abraham (Ur a Canaán)",
    color: "#f59e0b",
    descripcion: "El camino de fe de Abraham obedeciendo el llamado divino hacia la Tierra Prometida.",
    etapas: [
      { nombre: "Ur de los Caldeos", lat: 30.9626, lng: 46.1029, ref: "Génesis 11:31", desc: "Patria y origen de la familia de Abraham." },
      { nombre: "Harán", lat: 36.8671, lng: 39.0208, ref: "Génesis 11:31", desc: "Estadía temporal donde falleció Taré, padre de Abraham." },
      { nombre: "Siquem", lat: 32.2225, lng: 35.2628, ref: "Génesis 12:6", desc: "Lugar donde Dios le prometió la tierra a su descendencia." },
      { nombre: "Betel", lat: 31.9279, lng: 35.2298, ref: "Génesis 12:8", desc: "Donde Abraham edificó un altar e invocó el nombre de Jehová." },
      { nombre: "Egipto (Delta)", lat: 30.7500, lng: 31.2500, ref: "Génesis 12:10", desc: "Descendió debido a un fuerte hambre en la tierra de Canaán." },
      { nombre: "Hebrón (Mamre)", lat: 31.5326, lng: 35.0998, ref: "Génesis 13:18", desc: "Donde habitó junto a los encinares y edificó otro altar." }
    ]
  },
  moises: {
    nombre: "El Éxodo de Moisés y el Pueblo de Israel",
    color: "#ef4444",
    descripcion: "El éxodo de la esclavitud en Egipto cruzando el Mar Rojo y vagando por el desierto.",
    etapas: [
      { nombre: "Ramsés (Egipto)", lat: 30.7959, lng: 31.8231, ref: "Éxodo 12:37", desc: "Punto de reunión e inicio de la salida de Egipto." },
      { nombre: "Lagos Amargos (Mar Rojo)", lat: 30.3667, lng: 32.3500, ref: "Éxodo 14:22", desc: "Cruce milagroso del mar en seco." },
      { nombre: "Monte Sinaí (Horeb)", lat: 28.5395, lng: 33.9752, ref: "Éxodo 19:2", desc: "Entrega de la Ley y construcción del Tabernáculo." },
      { nombre: "Cades-barnea", lat: 30.6700, lng: 34.4400, ref: "Números 13:26", desc: "Punto de rebelión donde los espías trajeron un mal informe." },
      { nombre: "Monte Nebo (Moab)", lat: 31.7617, lng: 35.7303, ref: "Deuteronomio 34:1", desc: "Cima desde donde Moisés vio Canaán antes de morir." }
    ]
  },
  jose: {
    nombre: "El Camino de José (Vendido a Egipto)",
    color: "#3b82f6",
    descripcion: "La ruta de José desde su hogar paterno en Canaán hasta su exaltación en Egipto.",
    etapas: [
      { nombre: "Hebrón (Valle)", lat: 31.5326, lng: 35.0998, ref: "Génesis 37:14", desc: "Su hogar familiar y punto de partida por orden de Jacob." },
      { nombre: "Dotán", lat: 32.4019, lng: 35.2000, ref: "Génesis 37:17", desc: "Donde sus hermanos lo arrojaron a la cisterna y lo vendieron." },
      { nombre: "Avaris (Egipto)", lat: 30.7833, lng: 31.8333, ref: "Génesis 41:41", desc: "Capital hicsa donde fue esclavo, prisionero y luego gobernador." },
      { nombre: "Tierra de Gosén", lat: 30.7500, lng: 31.9167, ref: "Génesis 46:28", desc: "Donde Jacob y toda su familia se establecieron en Egipto." }
    ]
  },
  david: {
    nombre: "David: Huida de Saúl y Establecimiento del Reino",
    color: "#ec4899",
    descripcion: "Los viajes y huidas de David perseguido por el rey Saúl hasta su coronación en Jerusalén.",
    etapas: [
      { nombre: "Belén", lat: 31.7054, lng: 35.2024, ref: "1 Samuel 16:13", desc: "Donde Samuel lo ungió en medio de sus hermanos." },
      { nombre: "Valle de Ela", lat: 31.7033, lng: 34.9444, ref: "1 Samuel 17:2", desc: "Lugar de la gran batalla y victoria sobre el gigante Goliat." },
      { nombre: "Gabaa", lat: 31.8236, lng: 35.2289, ref: "1 Samuel 19:9", desc: "La corte real de Saúl donde David sufrió persecuciones." },
      { nombre: "Nob", lat: 31.7924, lng: 35.2447, ref: "1 Samuel 21:1", desc: "Ciudad sacerdotal donde comió los panes de la proposición." },
      { nombre: "Gat (Filistea)", lat: 31.6994, lng: 34.8475, ref: "1 Samuel 21:10", desc: "Se refugió en territorio enemigo y fingió locura para salvarse." },
      { nombre: "Cueva de Adulam", lat: 31.6700, lng: 34.9900, ref: "1 Samuel 22:1", desc: "Lugar de refugio donde formó su ejército de valientes." },
      { nombre: "En-gadi", lat: 31.4500, lng: 35.3833, ref: "1 Samuel 24:1", desc: "Oasis en el desierto donde perdonó la vida a Saúl en la cueva." },
      { nombre: "Siclag", lat: 31.3833, lng: 34.6167, ref: "1 Samuel 27:6", desc: "Ciudad filistea otorgada a David que sirvió de base militar." },
      { nombre: "Hebrón", lat: 31.5326, lng: 35.0998, ref: "2 Samuel 2:1", desc: "Donde David reinó sobre la tribu de Judá por siete años." },
      { nombre: "Jerusalén (Sión)", lat: 31.7767, lng: 35.2345, ref: "2 Samuel 5:7", desc: "Conquista de la fortaleza jebusea y capital eterna de Israel." }
    ]
  },
  saul: {
    nombre: "Saúl: Reinado y Campañas de Batalla",
    color: "#10b981",
    descripcion: "La trayectoria militar y puntos de inflexión del primer rey de Israel.",
    etapas: [
      { nombre: "Gabaa (Gibeah)", lat: 31.8236, lng: 35.2289, ref: "1 Samuel 10:26", desc: "Ciudad de Saúl y capital administrativa de su reinado." },
      { nombre: "Jabes de Galaad", lat: 32.3986, lng: 35.6883, ref: "1 Samuel 11:11", desc: "Primera y brillante victoria militar al rescatar a sus habitantes." },
      { nombre: "Micmas", lat: 31.8753, lng: 35.2636, ref: "1 Samuel 13:23", desc: "Gran batalla contra los filisteos liderada por Jonatán." },
      { nombre: "Nob", lat: 31.7924, lng: 35.2447, ref: "1 Samuel 22:19", desc: "Ordenó la destrucción de la ciudad de sacerdotes en su paranoia." },
      { nombre: "En-gadi", lat: 31.4500, lng: 35.3833, ref: "1 Samuel 24:2", desc: "Fue con 3000 hombres elegidos en busca de David." },
      { nombre: "Endor", lat: 32.6369, lng: 35.3811, ref: "1 Samuel 28:7", desc: "Donde consultó a la médium antes de su batalla final." },
      { nombre: "Monte Gilboa", lat: 32.5028, lng: 35.4372, ref: "1 Samuel 31:4", desc: "Sitio de la derrota de Israel y trágica muerte de Saúl y Jonatán." }
    ]
  },
  jesus: {
    nombre: "Ministerio y Pasión de Jesús",
    color: "#06b6d4",
    descripcion: "El itinerario terrenal del Señor Jesús, desde su infancia hasta su resurrección.",
    etapas: [
      { nombre: "Nazaret", lat: 32.7028, lng: 35.2956, ref: "Lucas 2:39", desc: "Lugar donde Jesús creció y pasó su juventud." },
      { nombre: "Belén", lat: 31.7054, lng: 35.2024, ref: "Lucas 2:4", desc: "Lugar del nacimiento virginal en cumplimiento profético." },
      { nombre: "Río Jordán (Betabara)", lat: 31.8297, lng: 35.5644, ref: "Mateo 3:13", desc: "Su bautismo público y manifestación del Espíritu." },
      { nombre: "Capernaúm", lat: 32.8806, lng: 35.5760, ref: "Mateo 4:13", desc: "Su 'propia ciudad' y centro de su ministerio en Galilea." },
      { nombre: "Cesarea de Filipos (Banias)", lat: 33.2497, lng: 35.6961, ref: "Mateo 16:13", desc: "Confesión mesiánica y promesa de la Iglesia." },
      { nombre: "Jerusalén (Monte de los Olivos)", lat: 31.7780, lng: 35.2435, ref: "Mateo 21:1", desc: "Entrada triunfal y Getsemaní." },
      { nombre: "Gólgota (Jerusalén)", lat: 31.7784, lng: 35.2296, ref: "Mateo 27:33", desc: "Crucifixión, sepultura y resurrección al tercer día." }
    ]
  },
  pablo: {
    nombre: "Pablo: Conversión y Viajes Apostólicos",
    color: "#8b5cf6",
    descripcion: "El camino del Apóstol de los gentiles desde su llamado hasta su viaje final a Roma.",
    etapas: [
      { nombre: "Jerusalén", lat: 31.7683, lng: 35.2137, ref: "Hechos 9:1", desc: "Donde solicitó cartas al Sumo Sacerdote contra los cristianos." },
      { nombre: "Damasco", lat: 33.5138, lng: 36.2765, ref: "Hechos 9:3", desc: "Encuentro con el Cristo resucitado en el camino." },
      { nombre: "Antioquía de Siria", lat: 36.2025, lng: 36.1604, ref: "Hechos 13:1", desc: "Punto de envío misionero al mundo no judío." },
      { nombre: "Atenas (Areópago)", lat: 37.9755, lng: 23.7242, ref: "Hechos 17:22", desc: "Sermón a los filósofos sobre el Dios No Conocido." },
      { nombre: "Éfeso", lat: 37.9397, lng: 27.3408, ref: "Hechos 19:10", desc: "Centro de ministerio por más de dos años y cartas pastorales." },
      { nombre: "Cesarea Marítima", lat: 32.5018, lng: 34.8953, ref: "Hechos 23:33", desc: "Cárcel donde apeló al César como ciudadano romano." },
      { nombre: "Isla de Malta", lat: 35.9375, lng: 14.3754, ref: "Hechos 28:1", desc: "Lugar del naufragio providencial y milagros en la isla." },
      { nombre: "Roma", lat: 41.9028, lng: 12.4964, ref: "Hechos 28:16", desc: "Predicó con denuedo bajo arresto domiciliario y sufrió el martirio." }
    ]
  }
};

const ESCRITOS_ANTIGUOS = [
  {
    nombre: "Rollos del Mar Muerto (Gran Rollo de Isaías)",
    lugar: "Cuevas de Qumrán",
    lat: 31.7412,
    lng: 35.4593,
    zoom: 12,
    fecha: "c. 250 a.C. - 68 d.C.",
    desc: "Descubiertos en 1947 por pastores beduinos. Contienen copias del Antiguo Testamento en hebreo mil años más antiguas que los manuscritos masoréticos previamente conocidos, demostrando la fidelidad de la copia bíblica a través de los siglos.",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Great_Isaiah_Scroll.jpg"
  },
  {
    nombre: "Códice Sinaítico (Codex Sinaiticus)",
    lugar: "Monasterio de Santa Catalina",
    lat: 28.5561,
    lng: 33.9760,
    zoom: 11,
    fecha: "c. 330 - 360 d.C.",
    desc: "Manuscrito uncial en griego considerado uno de los textos más puros de las Escrituras. Contiene el Nuevo Testamento completo más antiguo que se conserva y gran parte del Antiguo Testamento (Septuaginta).",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Codex_Sinaiticus_Luke_22%2C20-23%2C20.jpg"
  },
  {
    nombre: "Códice Vaticano (Codex Vaticanus)",
    lugar: "Roma (Biblioteca Vaticana)",
    lat: 41.9022,
    lng: 12.4533,
    zoom: 15,
    fecha: "Siglo IV (c. 325-350 d.C.)",
    desc: "Conservado en el Vaticano desde el siglo XV. Escrito en pergamino en letras mayúsculas, es uno de los manuscritos griegos más antiguos de la Biblia casi completo.",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Codex_Vaticanus_B%2C_2Th_3%2C11-18%2C_He_1%2C1-2%2C2.jpg"
  },
  {
    nombre: "Papiro P52 (Papiro Rylands)",
    lugar: "Oxirrinco (Egipto)",
    lat: 28.5333,
    lng: 30.6500,
    zoom: 10,
    fecha: "c. 125 d.C.",
    desc: "El fragmento físico de manuscrito del Nuevo Testamento más antiguo del mundo que sobrevive. Contiene partes del evangelio de Juan 18 escritos en papiro griego, hallado en las arenas de Egipto.",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/5/50/P52_front.jpg"
  },
  {
    nombre: "Códice de Alepo (Codex Aleppo)",
    lugar: "Alepo (Siria)",
    lat: 36.2021,
    lng: 37.1343,
    zoom: 12,
    fecha: "c. 920 d.C.",
    desc: "El manuscrito más valioso y autorizado del texto masorético hebreo de las Escrituras, anotado por el famoso escriba Aarón ben Asher. Sufrió daños en disturbios en 1947, pero la mayor parte se conserva hoy en Jerusalén.",
    imagen: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Aleppo_Codex_Joshua_1_1.jpg"
  }
];
// Slugs disponibles en bolls.life para versiones en español
// NBLA 2020 no está en bolls.life (copyright); LBLA 1997 es su predecesora directa
const BOLLS_SLUG = { ntv: 'NTV', lbla: 'LBLA', nvi: 'NVI' };

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
  const [text,           setText]           = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [imageType,      setImageType]      = useState('file'); // 'file' o 'url'
  const [imageFile,      setImageFile]      = useState(null);
  const [imagePreview,   setImagePreview]   = useState('');
  const [imageUrlInput,  setImageUrlInput]  = useState('');

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  function removeImageFile() {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview('');
    }
  }

  async function submit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    let imageUrl = null;
    if (imageType === 'file' && imageFile) {
      imageUrl = await uploadPostImage(user.uid, imageFile);
    } else if (imageType === 'url' && imageUrlInput.trim()) {
      imageUrl = imageUrlInput.trim();
    }
    await createPost(user.uid, user.displayName, user.photoURL, text.trim(), {
      book:    bookName,
      chapter: chapter,
      verse:   verse.verse,
      text:    verse.text,
    }, null, imageUrl);
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

        {/* Adjuntar imagen (Archivo o URL) */}
        <div className="new-post-image-section">
          <div className="new-post-image-label">🖼️ Adjuntar imagen (opcional)</div>
          <div className="new-post-image-tabs">
            <button
              type="button"
              className={`new-post-image-tab ${imageType === 'file' ? 'active' : ''}`}
              onClick={() => setImageType('file')}
            >
              📷 Subir archivo
            </button>
            <button
              type="button"
              className={`new-post-image-tab ${imageType === 'url' ? 'active' : ''}`}
              onClick={() => setImageType('url')}
            >
              🔗 Pegar enlace
            </button>
          </div>

          {imageType === 'file' ? (
            <div className="new-post-image-file-upload">
              {!imagePreview ? (
                <label className="new-post-image-upload-label">
                  📂 Seleccionar archivo de imagen...
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div className="new-post-image-preview-container">
                  <img src={imagePreview} alt="Preview" className="new-post-image-preview" />
                  <button type="button" className="new-post-image-remove" onClick={removeImageFile} title="Eliminar imagen">
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="new-post-image-url-input">
              <input
                type="text"
                className="new-post-url-input"
                placeholder="Pegar URL de la imagen (http://...)"
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
              />
              {imageUrlInput.trim() && (
                <div className="new-post-image-preview-container">
                  <img
                    src={imageUrlInput.trim()}
                    alt="Preview URL"
                    className="new-post-image-preview"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      e.target.style.display = 'block';
                    }}
                  />
                  <button type="button" className="new-post-image-remove" onClick={() => setImageUrlInput('')} title="Limpiar enlace">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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

// Helper to get character offset of selection within an element
function getSelectionCharacterOffsetWithin(element) {
  let start = 0;
  let end = 0;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    start = preCaretRange.toString().length;
    end = start + range.toString().length;
  }
  return { start, end };
}

// Helper to render text with partial highlights
function renderHighlightedText(text, highlightVal, darkMode) {
  if (!highlightVal || typeof highlightVal !== 'string') return text;

  let ranges = [];
  try {
    if (highlightVal.startsWith('[')) {
      ranges = JSON.parse(highlightVal);
    }
  } catch (e) {
    ranges = [];
  }

  if (!Array.isArray(ranges) || ranges.length === 0) {
    return text;
  }

  // Sort ranges by start position, filtering out overlaps
  ranges.sort((a, b) => a.start - b.start);

  const result = [];
  let lastIndex = 0;

  for (const r of ranges) {
    if (r.start < lastIndex) continue; // Skip overlaps
    if (r.start > text.length) break;

    // Add text before this highlight segment
    if (r.start > lastIndex) {
      result.push(text.slice(lastIndex, r.start));
    }

    // Add highlighted segment
    const bgColor = getHighlightBg(r.color, darkMode);
    const spanStyle = bgColor ? {
      backgroundColor: bgColor,
      borderRadius: '4px',
      padding: '2px 0px',
      color: darkMode ? '#f5f0eb' : '#1c1917'
    } : {};

    result.push(
      <span key={r.start} style={spanStyle} className={`highlight-span color-${r.color}`}>
        {text.slice(r.start, r.end)}
      </span>
    );

    lastIndex = r.end;
  }

  // Add the remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

// ── VerseCard ─────────────────────────────────────────────────────────────────

function VerseCard({ verse, bookName, chapter, highlight, note, bookmark, onHighlight, onNote, onBookmark, onShare, onLike, likeCount, onPublishToFeed, user, following, onFollowToggle, darkMode, onAskAI }) {
  const [showActions,    setShowActions]    = useState(false);
  const [showColors,     setShowColors]     = useState(false);
  const [showNote,       setShowNote]       = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [showComments,   setShowComments]   = useState(false);
  const [activeTab,      setActiveTab]      = useState(null);
  const [noteVal,        setNoteVal]        = useState(note || '');
  const [copied,         setCopied]         = useState(false);

  function handleSelectColor(colorId) {
    const selection = window.getSelection();
    const verseTextEl = document.querySelector(`#verse-${verse.verse} .verse-text`);
    
    if (selection && !selection.isCollapsed && verseTextEl && verseTextEl.contains(selection.anchorNode)) {
      const { start, end } = getSelectionCharacterOffsetWithin(verseTextEl);
      if (start !== end && end <= verse.text.length) {
        let currentRanges = [];
        try {
          if (highlight && typeof highlight === 'string' && highlight.startsWith('[')) {
            currentRanges = JSON.parse(highlight);
          }
        } catch (e) {}
        
        // Remove overlapping ranges
        currentRanges = currentRanges.filter(r => r.end <= start || r.start >= end);
        
        if (colorId) {
          currentRanges.push({ start, end, color: colorId });
        }
        
        if (currentRanges.length > 0) {
          onHighlight(verse.verse, JSON.stringify(currentRanges));
        } else {
          onHighlight(verse.verse, null);
        }
        
        // Clear selection
        selection.removeAllRanges();
        return;
      }
    }
    
    // Default to whole-verse highlight
    onHighlight(verse.verse, highlight === colorId ? null : colorId);
  }

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
  const theologicalComments = THEOLOGICAL_BY_VERSE[verseKey] || [];

  const allTabs     = COMMENT_TYPES.filter(t => {
    if (t.key === 'comentarios') {
      return (verseData?.comentarios) || (theologicalComments.length > 0);
    }
    return verseData?.[t.key];
  });
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
            <span className="verse-badges">
              {hasCommentary && <span className="verse-badge badge-commentary" title="Tiene comentario">📖</span>}
              {hasRef        && <span className="verse-badge badge-ref"        title="Tiene referencias">🔗</span>}
            </span>
          </span>
          <span className="verse-text">{renderHighlightedText(verse.text, highlight, darkMode)}</span>
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
            className="icon-btn"
            onClick={() => onAskAI?.(verse)}
            title="Preguntar a la IA"
            style={{ fontSize: '1.1rem' }}
          >
            🤖
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
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                handleSelectColor(c.id);
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
              onChange={e => handleSelectColor(e.target.value)}
            />
          </label>
          {highlight && (
            <button
              className="remove-color-btn"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                handleSelectColor(null);
                setShowColors(false);
              }}
            >
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
              {activeTab && (verseData?.[activeTab] || (activeTab === 'comentarios' && theologicalComments.length > 0)) && (
                <div className="commentary-content">
                  <div className="commentary-content-label">
                    {COMMENT_TYPES.find(t => t.key === activeTab)?.icon}{' '}
                    {COMMENT_TYPES.find(t => t.key === activeTab)?.label}
                  </div>
                  
                  {activeTab === 'comentarios' ? (
                    <div className="theologians-wrapper">
                      {verseData?.comentarios && (
                        <div className="exegetical-comment">
                          <p>{verseData.comentarios}</p>
                          {theologicalComments.length > 0 && <hr className="commentary-divider" />}
                        </div>
                      )}
                      
                      {theologicalComments.length > 0 && (
                        <div className="theological-list">
                          <h4 className="theological-title">📖 Comentarios de Teólogos Históricos:</h4>
                          {theologicalComments.map((tc, idx) => (
                            <div key={idx} className="theological-entry" style={{ borderLeft: `4px solid ${tc.color}` }}>
                              <div className="theological-header">
                                <span className="theological-avatar" style={{ backgroundColor: tc.color }}>{tc.initials}</span>
                                <strong className="theological-author">{tc.authorName}</strong>
                                <span className="theological-obra" title={tc.obra}>— {tc.obra}</span>
                              </div>
                              <h5 className="theological-subtitle">{tc.titulo}</h5>
                              <p className="theological-text">{tc.texto}</p>
                              {tc.url && (
                                <a href={tc.url} target="_blank" rel="noopener noreferrer" className="theological-link">
                                  🔗 Leer obra original
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    verseData[activeTab]
                  )}

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

// ── MapaPage — Atlas bíblico pantalla completa ────────────────────────────────

function MapaPage({ onClose, onNavigate, darkMode, books = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef([]);
  const polylineRef     = useRef(null);
  const [activeTab, setActiveTab] = useState('places'); // 'places' | 'journeys' | 'manuscripts'
  const [selectedJourneyKey, setSelectedJourneyKey] = useState(null); // 'abraham', 'moises', etc.
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  function getVerseText(bookName, chapter, verse) {
    const b = books.find(b => b.name === bookName);
    const ch = b?.chapters.find(c => c.chapter === parseInt(chapter));
    return ch?.verses.find(v => v.verse === parseInt(verse))?.text || null;
  }

  const allPlaces = useMemo(() => {
    const result = [];
    Object.entries(GEO_LUGARES).forEach(([verseKey, lugares]) => {
      const parts   = verseKey.split('_');
      const verse   = parts.pop();
      const chapter = parts.pop();
      const book    = parts.join('_');
      lugares.forEach(lugar => {
        result.push({ verseKey, book, chapter, verse, ref: `${book} ${chapter}:${verse}`, ...lugar });
      });
    });
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, []);

  const filtered = search.trim()
    ? allPlaces.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.ref.toLowerCase().includes(search.toLowerCase())
      )
    : allPlaces;

  // Inicialización del Mapa
  useEffect(() => {
    function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = window.L;

      const map = L.map(mapContainerRef.current, {
        center: [31.5, 35.5],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    if (window.L) {
      initMap();
    } else {
      const cssId = 'leaflet-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id   = cssId;
        link.rel  = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, []);

  // Actualización de marcadores y polilíneas reactivas
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    // Limpiar marcadores y polilínea anterior
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (activeTab === 'places') {
      const flagIcon = L.divIcon({
        className: '',
        html: '<span style="font-size:20px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">🚩</span>',
        iconSize: [24, 24],
        iconAnchor: [2, 22],
        popupAnchor: [10, -22],
      });

      allPlaces.forEach(p => {
        const marker = L.marker([p.lat, p.lng], { icon: flagIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:150px;padding:2px 0">
              <strong style="font-size:0.88rem;display:block;margin-bottom:3px">🚩 ${p.nombre}</strong>
              <span style="color:#92400e;font-size:0.75rem;font-weight:600">${p.ref}</span>
            </div>
          `, { maxWidth: 220 });
        markersRef.current.push(marker);
        marker.place = p;
      });
      // Restaurar zoom y centro original para lugares
      map.setView([31.5, 35.5], 6);
    } 
    else if (activeTab === 'journeys' && selectedJourneyKey) {
      const viaje = VIAJES_BIBLICOS[selectedJourneyKey];
      if (viaje) {
        const points = [];
        viaje.etapas.forEach((etapa, idx) => {
          points.push([etapa.lat, etapa.lng]);

          const numIcon = L.divIcon({
            className: '',
            html: `<div style="background:${viaje.color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.45)">${idx + 1}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [0, -13],
          });

          const marker = L.marker([etapa.lat, etapa.lng], { icon: numIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:sans-serif;min-width:180px;max-width:240px;padding:2px 0">
                <strong style="font-size:0.88rem;display:block;margin-bottom:2px;color:${viaje.color}">Etapa ${idx + 1}: ${etapa.nombre}</strong>
                <span style="color:#92400e;font-size:0.73rem;font-weight:700;display:block;margin-bottom:6px">${etapa.ref}</span>
                <p style="font-size:0.8rem;color:var(--text);margin:0;line-height:1.4">${etapa.desc}</p>
              </div>
            `, { maxWidth: 220 });

          markersRef.current.push(marker);
          marker.place = etapa;
        });

        if (points.length > 1) {
          const polyline = L.polyline(points, {
            color: viaje.color,
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 8'
          }).addTo(map);
          polylineRef.current = polyline;

          map.fitBounds(polyline.getBounds(), { padding: [45, 45] });
        }
      }
    }
    else if (activeTab === 'manuscripts') {
      const scrollIcon = L.divIcon({
        className: '',
        html: '<span style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">📜</span>',
        iconSize: [24, 24],
        iconAnchor: [6, 18],
        popupAnchor: [6, -18],
      });

      ESCRITOS_ANTIGUOS.forEach(escrito => {
        const marker = L.marker([escrito.lat, escrito.lng], { icon: scrollIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px;padding:2px 0">
              <strong style="font-size:0.88rem;display:block;margin-bottom:3px">📜 ${escrito.nombre}</strong>
              <span style="color:#4f46e5;font-size:0.75rem;font-weight:700;display:block;margin-bottom:4px">${escrito.lugar}</span>
              <span style="color:#6b7280;font-size:0.7rem;">${escrito.fecha}</span>
            </div>
          `, { maxWidth: 220 });
        markersRef.current.push(marker);
        marker.place = escrito;
      });
      // Centrar para los manuscritos (cubre Medio Oriente, Egipto y Roma)
      map.setView([33.5, 28.5], 5);
    }
  }, [activeTab, selectedJourneyKey, allPlaces]);

  function flyToPlace(p, zoom = 11) {
    setSelected(p);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([p.lat, p.lng], Math.max(p.zoom || zoom, zoom), { duration: 1.2 });

    const foundMarker = markersRef.current.find(m => m.place && m.place.nombre === p.nombre);
    if (foundMarker) {
      if (activeTab === 'places') {
        const text = getVerseText(p.book, p.chapter, p.verse);
        foundMarker.setPopupContent(`
          <div style="font-family:sans-serif;min-width:180px;max-width:260px;padding:2px 0">
            <strong style="font-size:0.88rem;display:block;margin-bottom:2px">🚩 ${p.nombre}</strong>
            <span style="color:#92400e;font-size:0.73rem;font-weight:700">${p.ref}</span>
            ${text ? `<p style="font-size:0.8rem;color:#374151;margin:7px 0 0;line-height:1.45;font-style:italic">"${text}"</p>` : ''}
          </div>
        `);
      } else if (activeTab === 'journeys') {
        const viaje = VIAJES_BIBLICOS[selectedJourneyKey];
        const idx = viaje.etapas.indexOf(p);
        foundMarker.setPopupContent(`
          <div style="font-family:sans-serif;min-width:180px;max-width:240px;padding:2px 0">
            <strong style="font-size:0.88rem;display:block;margin-bottom:2px;color:${viaje.color}">Etapa ${idx + 1}: ${p.nombre}</strong>
            <span style="color:#92400e;font-size:0.73rem;font-weight:700;display:block;margin-bottom:6px">${p.ref}</span>
            <p style="font-size:0.8rem;color:#374151;margin:0;line-height:1.4">${p.desc}</p>
          </div>
        `);
      } else if (activeTab === 'manuscripts') {
        foundMarker.setPopupContent(`
          <div style="font-family:sans-serif;min-width:180px;max-width:240px;padding:2px 0">
            <strong style="font-size:0.88rem;display:block;margin-bottom:3px">📜 ${p.nombre}</strong>
            <span style="color:#4f46e5;font-size:0.75rem;font-weight:700;display:block;margin-bottom:4px">${p.lugar}</span>
            <p style="font-size:0.78rem;color:#4b5563;margin:0;line-height:1.45">${p.desc}</p>
          </div>
        `);
      }
      setTimeout(() => foundMarker.openPopup(), 1000);
    }
  }

  return (
    <div className={`mapa-page${darkMode ? ' dark' : ''}`}>
      <div className="mapa-page-header">
        <button className="mapa-page-back" onClick={onClose}>← Volver</button>
        <span className="mapa-page-title">🚩 Atlas Bíblico</span>
        <span className="mapa-page-count">
          {activeTab === 'places' && `${allPlaces.length} lugares`}
          {activeTab === 'journeys' && `${Object.keys(VIAJES_BIBLICOS).length} rutas`}
          {activeTab === 'manuscripts' && `${ESCRITOS_ANTIGUOS.length} manuscritos`}
        </span>
      </div>

      {/* Selector de pestañas */}
      <div className="mapa-page-tabs" style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
        <button
          className={`mapa-tab-btn ${activeTab === 'places' ? 'active' : ''}`}
          onClick={() => { setActiveTab('places'); setSelected(null); }}
          style={activeTab === 'places' ? { background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' } : { background: 'var(--surface2)', color: 'var(--text2)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📍 Lugares Bíblicos
        </button>
        <button
          className={`mapa-tab-btn ${activeTab === 'journeys' ? 'active' : ''}`}
          onClick={() => { setActiveTab('journeys'); setSelectedJourneyKey(null); setSelected(null); }}
          style={activeTab === 'journeys' ? { background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' } : { background: 'var(--surface2)', color: 'var(--text2)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          🛣️ Viajes y Rutas
        </button>
        <button
          className={`mapa-tab-btn ${activeTab === 'manuscripts' ? 'active' : ''}`}
          onClick={() => { setActiveTab('manuscripts'); setSelected(null); }}
          style={activeTab === 'manuscripts' ? { background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' } : { background: 'var(--surface2)', color: 'var(--text2)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📜 Escritos Antiguos
        </button>
      </div>

      <div ref={mapContainerRef} className="mapa-page-map" />

      <div className="mapa-page-bottom">
        {activeTab === 'places' && (
          <div className="mapa-page-search-row">
            <input
              className="mapa-page-search"
              placeholder="Buscar lugar o versículo…"
              value={search}
              onChange={e => { setSearch(e.target.value); }}
            />
            {search && (
              <button className="mapa-page-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        )}

        <div className="mapa-page-list">
          {activeTab === 'places' && (
            <>
              {filtered.length === 0 && (
                <div className="mapa-page-empty">Sin lugares que coincidan.</div>
              )}
              {filtered.map((p, i) => {
                const isActive = selected === p;
                const verseText = isActive ? getVerseText(p.book, p.chapter, p.verse) : null;
                return (
                  <div
                    key={`${p.verseKey}_${i}`}
                    className={`mapa-page-place-row${isActive ? ' active' : ''}`}
                    onClick={() => flyToPlace(p, 11)}
                  >
                    <div className="mapa-page-place-top">
                      <span className="mapa-page-flag">🚩</span>
                      <div className="mapa-page-place-info">
                        <span className="mapa-page-place-name">{p.nombre}</span>
                        <span className="mapa-page-place-ref">{p.ref}</span>
                      </div>
                      {isActive && (
                        <button
                          className="mapa-page-nav-btn"
                          onClick={e => { e.stopPropagation(); onNavigate(p.book, parseInt(p.chapter)); }}
                        >
                          📖 Ir
                        </button>
                      )}
                    </div>
                    {isActive && verseText && (
                      <p className="mapa-page-verse-text">"{verseText}"</p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'journeys' && (
            <>
              {!selectedJourneyKey ? (
                <div className="journeys-grid" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Selecciona una ruta bíblica:</div>
                  {Object.entries(VIAJES_BIBLICOS).map(([key, viaje]) => (
                    <button
                      key={key}
                      className="journey-card-btn"
                      onClick={() => { setSelectedJourneyKey(key); setSelected(null); }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', background: 'var(--surface2)', borderRadius: '14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.1s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span style={{ color: viaje.color, fontSize: '1.1rem' }}>🛣️</span>
                        <span style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text)', flex: 1, textAlign: 'left' }}>{viaje.nombre}</span>
                        <span style={{ fontSize: '0.75rem', background: viaje.color, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>{viaje.etapas.length} etapas</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text2)', margin: '4px 0 0', lineHeight: '1.4', textAlign: 'left' }}>{viaje.descripcion}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 5 }}>
                    <button onClick={() => { setSelectedJourneyKey(null); setSelected(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                      ← Ver todas las rutas
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: VIAJES_BIBLICOS[selectedJourneyKey].color }}>
                      {VIAJES_BIBLICOS[selectedJourneyKey].nombre}
                    </span>
                  </div>

                  <div style={{ padding: '8px 16px', fontSize: '0.78rem', color: 'var(--text3)', borderBottom: '1px solid var(--border)', lineHeight: '1.4' }}>
                    {VIAJES_BIBLICOS[selectedJourneyKey].descripcion}
                  </div>

                  {VIAJES_BIBLICOS[selectedJourneyKey].etapas.map((etapa, idx) => {
                    const isActive = selected === etapa;
                    return (
                      <div
                        key={idx}
                        className={`mapa-page-place-row${isActive ? ' active' : ''}`}
                        onClick={() => flyToPlace(etapa, 12)}
                      >
                        <div className="mapa-page-place-top" style={{ padding: '10px 16px' }}>
                          <span style={{ background: VIAJES_BIBLICOS[selectedJourneyKey].color, color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0 }}>
                            {idx + 1}
                          </span>
                          <div className="mapa-page-place-info" style={{ marginLeft: '6px' }}>
                            <span className="mapa-page-place-name">{etapa.nombre}</span>
                            <span className="mapa-page-place-ref">{etapa.ref}</span>
                          </div>
                        </div>
                        {isActive && (
                          <p style={{ padding: '0 16px 12px 42px', fontSize: '0.8rem', color: 'var(--text2)', margin: 0, lineHeight: '1.45' }}>
                            {etapa.desc}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'manuscripts' && (
            <div style={{ padding: '12px 0 24px' }}>
              <div style={{ padding: '0 16px 12px', fontSize: '0.8rem', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase' }}>
                Descubrimientos arqueológicos y escritos antiguos:
              </div>
              {ESCRITOS_ANTIGUOS.map((escrito, i) => {
                const isActive = selected === escrito;
                return (
                  <div
                    key={i}
                    className={`mapa-page-place-row${isActive ? ' active' : ''}`}
                    onClick={() => flyToPlace(escrito, 13)}
                    style={{ borderBottom: '1px solid var(--border)', padding: '0' }}
                  >
                    <div className="mapa-page-place-top" style={{ alignItems: 'flex-start', padding: '12px 16px' }}>
                      <span style={{ fontSize: '1.25rem', marginRight: '4px' }}>📜</span>
                      <div className="mapa-page-place-info">
                        <span className="mapa-page-place-name" style={{ whiteSpace: 'normal', fontSize: '0.9rem', fontWeight: '800', lineHeight: '1.3' }}>{escrito.nombre}</span>
                        <span style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: '700', marginTop: '2px' }}>📍 {escrito.lugar}</span>
                        <span style={{ color: 'var(--text3)', fontSize: '0.7rem', marginTop: '1px' }}>🕒 {escrito.fecha}</span>
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ padding: '0 16px 16px 42px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: 0, lineHeight: '1.45' }}>
                          {escrito.desc}
                        </p>
                        {escrito.imagen && (
                          <div style={{ width: '100%', maxHeight: '180px', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                            <img
                              src={escrito.imagen}
                              alt={escrito.nombre}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BookPrologueCard ──────────────────────────────────────────────────────────
// Renders the prologue information at the beginning of each book (Chapter 1)
function BookPrologueCard({ prologue, darkMode, onClose }) {
  return (
    <div className="prologue-card expanded">
      <div className="prologue-header">
        <div className="prologue-title-wrap">
          <span className="prologue-icon">📖</span>
          <div className="prologue-title-text">
            <h3 className="prologue-title">Prólogo de {prologue.libro}</h3>
            <span className="prologue-subtitle">Contexto histórico, autoría y género literario</span>
          </div>
        </div>
        <button className="prologue-toggle-btn" onClick={onClose}>
          Ocultar ✕
        </button>
      </div>

      <div className="prologue-body">
        <div className="prologue-grid">
          <div className="prologue-grid-item">
            <strong>✍️ ¿Quién escribe?</strong>
            <p>{prologue.escritor}</p>
          </div>
          <div className="prologue-grid-item">
            <strong>👥 ¿A quién escribe?</strong>
            <p>{prologue.destinatario}</p>
          </div>
          <div className="prologue-grid-item">
            <strong>📅 ¿En qué momento?</strong>
            <p>{prologue.fecha}</p>
          </div>
          <div className="prologue-grid-item">
            <strong>📍 ¿Dónde se encuentra?</strong>
            <p>{prologue.lugar}</p>
          </div>
        </div>

        <div className="prologue-section">
          <strong>🎭 Género Literario</strong>
          <p className="prologue-genero-badge">{prologue.genero}</p>
        </div>

        <div className="prologue-section">
          <strong>🎯 ¿Qué motiva al autor?</strong>
          <p>{prologue.motivacion}</p>
        </div>

        <div className="prologue-section">
          <strong>📜 ¿Qué ocurre en el libro?</strong>
          <p>{prologue.contenido}</p>
        </div>

        <div className="prologue-section">
          <strong>👤 Biografía del Autor</strong>
          <p>{prologue.biografia}</p>
        </div>

        <div className="prologue-footer">
          <div className="prologue-study-book">
            <span className="study-icon">📚</span>
            <div>
              <span className="study-label">Libro de estudio recomendado:</span>
              <p className="study-name">{prologue.libroEstudio}</p>
            </div>
          </div>
          <a
            href={prologue.enlaceCompra}
            target="_blank"
            rel="noopener noreferrer"
            className="prologue-buy-btn"
          >
            🛒 Comprar en Amazon
          </a>
        </div>
      </div>
    </div>
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
  const [extError,        setExtError]       = useState(false);
  const [dlProgress,      setDlProgress]     = useState(null); // null=inactivo, 0-100=descargando
  const [dlDismissed,    setDlDismissed]    = useState(false);
  const dlCancelRef = useRef(false);
  const [jumpVerse,       setJumpVerse]      = useState(null);
  const [streak,          setStreak]         = useState(0);
  const [privacy,         setPrivacy]        = useState({
    notes: false, highlights: false, bookmarks: false,
    publicProfile: true, followers: true, following: true,
  });
  const [showMenu,           setShowMenu]          = useState(false);
  const [showGen,            setShowGen]           = useState(false);
  const [aiVerseContext,     setAiVerseContext]    = useState(null);
  const [showFeed,           setShowFeed]          = useState(false);
  const [showCommentaries,   setShowCommentaries]  = useState(false);
  const [showMapa,           setShowMapa]          = useState(false);
  const [showBibleMenu,      setShowBibleMenu]     = useState(false);
  const [showPrologue,       setShowPrologue]      = useState(false);
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
        // Guardar perfil y presencia (no sobreescribir photoURL si ya hay una foto cargada en Firestore)
        await savePresence(firebaseUser.uid, {
          displayName: firebaseUser.displayName || data.displayName || '',
          email:       firebaseUser.email || '',
          ...((firebaseUser.photoURL && !data.photoURL) ? { photoURL: firebaseUser.photoURL } : {}),
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

  // Cargar versiones externas desde bolls.life con caché en localStorage del dispositivo
  useEffect(() => {
    const slug = BOLLS_SLUG[translation];
    if (!slug) { setExtVerses({}); setExtError(false); return; }
    const currentBook = books.find(b => b.name === selectedBook);
    if (!currentBook) return;
    const bookNum = BOLLS_NUM[currentBook.abbrev];
    if (!bookNum) return;
    const cacheKey = `${translation}_${bookNum}_${selectedChapter}`;
    const cached = lsGet(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Object.keys(parsed).length > 0) { setExtVerses(parsed); setExtError(false); return; }
      } catch {}
    }
    setExtLoading(true);
    setExtError(false);
    fetch(`https://bolls.life/get-text/${slug}/${bookNum}/${selectedChapter}/`)
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.json(); })
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
        const map = {};
        data.forEach(v => { map[v.verse] = v.text.replace(/<[^>]*>/g, '').trim(); });
        lsSet(cacheKey, JSON.stringify(map));
        setExtVerses(map);
        setExtLoading(false);
      })
      .catch(() => { setExtLoading(false); setExtError(true); setExtVerses({}); });
  }, [translation, selectedBook, selectedChapter, books]);

  // Descarga toda la traducción a localStorage para uso offline
  async function downloadFullTranslation(translationKey) {
    const slug = BOLLS_SLUG[translationKey];
    if (!slug || dlProgress !== null) return;
    const chapters = [];
    for (const b of books) {
      const bookNum = BOLLS_NUM[b.abbrev];
      if (!bookNum) continue;
      for (const ch of b.chapters) {
        chapters.push({ bookNum, chapter: ch.chapter, key: `${translationKey}_${bookNum}_${ch.chapter}` });
      }
    }
    const total = chapters.length;
    let done = 0;
    dlCancelRef.current = false;
    setDlProgress(0);
    for (const item of chapters) {
      if (dlCancelRef.current) { setDlProgress(null); return; }
      if (lsGet(item.key)) { done++; setDlProgress(Math.round(done / total * 100)); continue; }
      try {
        const r = await fetch(`https://bolls.life/get-text/${slug}/${item.bookNum}/${item.chapter}/`);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            const map = {};
            data.forEach(v => { map[v.verse] = v.text.replace(/<[^>]*>/g, '').trim(); });
            lsSet(item.key, JSON.stringify(map));
          }
        }
      } catch {}
      done++;
      setDlProgress(Math.round(done / total * 100));
      await new Promise(res => setTimeout(res, 40)); // evitar rate limit
    }
    if (dlCancelRef.current) { setDlProgress(null); return; }
    lsSet(`bible_full_${translationKey}`, '1');
    setDlProgress(null);
    setExtError(false);
    // Recargar capítulo actual
    const currentBook = books.find(b => b.name === selectedBook);
    if (currentBook) {
      const bookNum = BOLLS_NUM[currentBook.abbrev];
      const cached = lsGet(`${translationKey}_${bookNum}_${selectedChapter}`);
      if (cached) { try { setExtVerses(JSON.parse(cached)); } catch {} }
    }
  }

  function cancelDownload() {
    dlCancelRef.current = true;
    setDlProgress(null);
  }

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
    setShowPrologue(false);
    lsSet('bible_translation', translation);
  }
  function changeChapter(n) {
    setSelectedChapter(n); setSearchQuery('');
    setShowPrologue(false);
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
    return (
      <GenPanel
        onClose={() => { setShowGen(false); setAiVerseContext(null); }}
        darkMode={darkMode}
        initialVerse={aiVerseContext}
      />
    );
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

  if (showMapa) {
    return (
      <MapaPage
        onClose={() => setShowMapa(false)}
        onNavigate={(bookName, ch) => { setShowMapa(false); changeBook(bookName); setTimeout(() => changeChapter(ch), 50); }}
        darkMode={darkMode}
        books={books}
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
                  <button
                    className="bible-menu-item"
                    onClick={() => { setShowBibleMenu(false); setShowMapa(true); }}
                  >
                    <span className="bible-menu-icon">🚩</span>
                    <div>
                      <div className="bible-menu-label">Mapa Bíblico</div>
                      <div className="bible-menu-sub">Atlas de todos los lugares</div>
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
          onChange={e => { setTranslation(e.target.value); setExtVerses({}); setExtError(false); }}
          title="Versión bíblica"
        >
          <option value="rvr">RVR 1960 — Reina-Valera</option>
          <option value="ntv">{extLoading && translation === 'ntv' ? 'NTV (cargando…)' : 'NTV — Nueva Traducción Viviente'}</option>
          <option value="lbla">{extLoading && translation === 'lbla' ? 'LBLA (cargando…)' : 'LBLA — La Biblia de las Américas'}</option>
          <option value="nvi">{extLoading && translation === 'nvi' ? 'NVI (cargando…)' : 'NVI — Nueva Versión Internacional'}</option>
        </select>

        {/* Barra de descarga al dispositivo */}
        {dlProgress !== null && (
          <div className="dl-bar-wrap">
            <div className="dl-bar-header">
              <div className="dl-bar-label">📥 Descargando… {dlProgress}%</div>
              <button className="dl-bar-cancel" onClick={cancelDownload} title="Cancelar descarga">✕</button>
            </div>
            <div className="dl-bar-track"><div className="dl-bar-fill" style={{ width: `${dlProgress}%` }} /></div>
          </div>
        )}

        {/* Botón para descargar versión completa al dispositivo (solo versiones externas no descargadas) */}
        {BOLLS_SLUG[translation] && dlProgress === null && !dlDismissed && !lsGet(`bible_full_${translation}`) && !extError && (
          <div className="dl-full-wrap">
            <button className="dl-full-btn" onClick={() => downloadFullTranslation(translation)}>
              📥 Descargar para leer sin conexión
            </button>
            <button className="dl-full-close" onClick={() => setDlDismissed(true)} title="Cerrar">✕</button>
          </div>
        )}

        {/* Error: versión no disponible */}
        {extError && BOLLS_SLUG[translation] && dlProgress === null && (
          <div className="translation-error">
            ⚠️ No se pudo cargar esta versión.{' '}
            <button className="dl-retry-btn" onClick={() => { setExtError(false); setExtVerses({}); }}>
              Reintentar
            </button>
          </div>
        )}
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
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{selectedBook}</span>
            {selectedChapter === 1 && (() => {
              const bookAbbrev = books.find(b => b.name === selectedBook)?.abbrev;
              const prologue = PROLOGUES[bookAbbrev];
              return prologue ? (
                <button
                  className={`prologue-title-badge ${showPrologue ? 'active' : ''}`}
                  onClick={() => setShowPrologue(!showPrologue)}
                  title="Ver prólogo del libro"
                >
                  Prólogo
                </button>
              ) : null;
            })()}
          </h2>
          <p>Capítulo {selectedChapter} — {chapter?.verses.length || 0} versículos</p>
        </div>

        {selectedChapter === 1 && showPrologue && (() => {
          const bookAbbrev = books.find(b => b.name === selectedBook)?.abbrev;
          const prologue = PROLOGUES[bookAbbrev];
          return prologue ? (
            <BookPrologueCard
              prologue={prologue}
              darkMode={darkMode}
              onClose={() => setShowPrologue(false)}
            />
          ) : null;
        })()}

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
                onAskAI={v => {
                  setAiVerseContext({
                    bookName: selectedBook,
                    chapter: selectedChapter,
                    verse: v.verse,
                    text: v.text
                  });
                  setShowGen(true);
                }}
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
