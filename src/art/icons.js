// 행동 카드에 쓰는 선 그림 아이콘 (24x24, 색은 글자색을 따름).
// 다른 갈래가 새 행동을 더하면 action.icon에 아래 이름 중 하나를 적거나,
// 적지 않으면 행동 id의 낱말로 짐작한다.

const P = {
  play: '<circle cx="8" cy="5" r="2"/><path d="M8 7v6l-3 6M8 13l3 6M8 9l-4 2M8 9l5-1"/><circle cx="18" cy="16" r="3"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  book: '<path d="M4 5c3-1 6-1 8 1v14c-2-2-5-2-8-1z"/><path d="M20 5c-3-1-6-1-8 1v14c2-2 5-2 8-1z"/>',
  body: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M7 9h10M12 14l-3 6M12 14l3 6"/><path d="M4 8v3M20 8v3"/>',
  sword: '<path d="M14 3h7v7L10 21l-3-3z" /><path d="M5 15l4 4M3 21l3-3M14 10l-1 1"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 7v10M8 11h8"/>',
  meditate: '<circle cx="12" cy="6" r="2"/><path d="M6 19c2-1 4-1 6-1s4 0 6 1M8 18l2-6h4l2 6M10 12l-3 2M14 12l3 2"/><path d="M12 1.5v1M7 3l.7.7M17 3l-.7.7"/>',
  magic: '<path d="M4 20L15 9"/><path d="M15 9l2-2"/><path d="M18 3l.6 1.8L20.5 5.4l-1.9.6L18 8l-.6-2-1.9-.6 1.9-.6z"/><path d="M8 4l.4 1.1 1.1.4-1.1.4L8 7l-.4-1.1L6.5 5.5l1.1-.4z"/><path d="M19 13l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z"/>',
  herb: '<path d="M12 21V9"/><path d="M12 13c-4 0-6-3-6-6 4 0 6 3 6 6zM12 10c3 0 5-2.5 5-5-3 0-5 2.5-5 5zM12 17c3 0 5-2 6-4-3 0-5 1.5-6 4z"/>',
  cook: '<path d="M4 11h16v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 11h20M9 3c-1 2 1 3 0 5M13 3c-1 2 1 3 0 5"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  labor: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7L3 15l3 3 8-8"/><path d="M3 21h6"/>',
  wander: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/><circle cx="12" cy="12" r=".6"/>',
  visit: '<circle cx="8" cy="7" r="3"/><circle cx="16.5" cy="8" r="2.5"/><path d="M2.5 20c.5-4 3-6 5.5-6s5 2 5.5 6M13 14.5c1-.6 2.2-1 3.5-1 2.4 0 4.5 1.8 5 5.5"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M15 4h3l-3 3h3"/>',
  farm: '<path d="M12 21V8"/><path d="M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zM12 8c2-1 3-3 3-5-2 1-3 3-3 5zM12 13c-2-1-3-3-3-5 2 1 3 3 3 5zM12 13c2-1 3-3 3-5-2 1-3 3-3 5zM12 18c-2-1-3-3-3-5 2 1 3 3 3 5zM12 18c2-1 3-3 3-5-2 1-3 3-3 5z"/>',
  pray: '<circle cx="12" cy="9" r="3.5"/><path d="M12 2v1.5M12 14.5V16M5 9h1.5M17.5 9H19M7 4l1 1M17 4l-1 1M7 14l1-1M17 14l-1-1"/><path d="M8 22l4-5 4 5"/>',
  hunt: '<path d="M5 3c6 3 6 15 0 18"/><path d="M5 3v18"/><path d="M3 12h17M17 9l3 3-3 3"/>',
  travel: '<path d="M4 20c4-2 6-6 8-10s5-6 8-6"/><circle cx="4" cy="20" r="1.5"/><path d="M17 3l3 1-1 3"/>',
  smith: '<path d="M3 17h13l2-3H6z"/><path d="M8 17v4M13 17v4M6 21h9"/><path d="M14 4l5 5-2 2-5-5zM12 6L7 11"/>',
  dungeon: '<path d="M4 21V10a8 8 0 0 1 16 0v11"/><path d="M8 21v-9a4 4 0 0 1 8 0v9"/><path d="M2 21h20"/>',
  heart: '<path d="M12 20s-7-4.5-8.5-9A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 4c-1.5 4.5-8.5 9-8.5 9z"/>',
  scroll: '<path d="M7 4h11a2 2 0 0 1 0 4H7"/><path d="M7 4a2 2 0 0 0 0 4v10a2 2 0 0 0 2 2h9V8"/><path d="M10 11h5M10 14h5"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  ship: '<path d="M3 16h18l-3 4H6z"/><path d="M12 3v13M12 4l6 10h-6M12 6l-5 8h5"/>',
};

const BY_ID = {
  play: 'play', help_home: 'home', study: 'book', train_body: 'body', sword_father: 'sword', sword_guard: 'shield',
  meditate: 'meditate', magic_lesson: 'magic', herbs: 'herb', inn_kitchen: 'cook', day_labor: 'labor',
  wander: 'wander', visit: 'visit', rest: 'rest',
};
const WORDS = [
  [/sword|fence|duel|knight/, 'sword'], [/guard|patrol|defen/, 'shield'], [/magic|spell|mana|circle/, 'magic'],
  [/medit|pray|church|temple|faith/, 'pray'], [/herb|potion|alchem/, 'herb'], [/cook|kitchen|bake|inn/, 'cook'],
  [/trade|shop|sell|market|merchant|money/, 'coin'], [/farm|field|harvest|plant/, 'farm'], [/hunt|bow|trap/, 'hunt'],
  [/study|book|letter|read|school/, 'book'], [/train|body|run/, 'body'], [/labor|work|job|craft|carpent/, 'labor'],
  [/smith|forge/, 'smith'], [/dungeon|ruin|delve|explore|adventure|quest/, 'dungeon'], [/travel|move|journey|road/, 'travel'],
  [/court|love|date|marry|confess|propose/, 'heart'], [/visit|talk|friend|meet/, 'visit'], [/rest|sleep/, 'rest'],
  [/noble|court|politic/, 'crown'], [/ship|sea|sail|fish/, 'ship'], [/home|family/, 'home'],
];

export function iconName(action) {
  if (action.icon && P[action.icon]) return action.icon;
  if (BY_ID[action.id]) return BY_ID[action.id];
  for (const [re, n] of WORDS) if (re.test(action.id)) return n;
  return 'scroll';
}

export function icon(name, size = 24) {
  const d = P[name] ?? P.scroll;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

export const actionIcon = (action, size) => icon(iconName(action), size);
