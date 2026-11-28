// 51단계: 초상 뒤 배경. 예전엔 비슷한 갈색 빛 번짐 여섯 가지 중 하나였는데,
// 이제 하는 일과 형편에 따라 서 있는 자리(밭, 대장간, 바다, 가게, 예배당, 궁정, 마탑, 서재, 숲, 뒷골목, 성벽, 집 안)가 보인다.
// 폰 크기에서도 읽히도록 가는 선이 아니라 큰 덩어리(지평선, 창, 아치, 선반, 나무 기둥)로 그린다.
import { f, mixHex, tint, shade } from './portraitKit.js';

const SET_OF = {
  field: ['farmer', 'gardener', 'miller', 'herbalist', 'elder', 'tribe_chief', 'clan_chief'],
  forge: ['smith', 'artificer', 'carpenter', 'mason', 'weaver', 'tailor', 'apprentice', 'goldsmith', 'miner', 'stonekeeper'],
  sea: ['fisher', 'sailor', 'sea_captain', 'pirate', 'pirate_lord', 'sea_priest', 'fishwife'],
  shop: ['merchant', 'innkeeper', 'shopkeeper', 'cook', 'baker', 'fence', 'bard', 'trade_master', 'guildmaster', 'trader', 'shop', 'maid'],
  chapel: ['priest', 'bishop', 'acolyte', 'inquisitor', 'undertaker', 'cleric'],
  court: ['royal', 'lord', 'noble', 'count', 'minister', 'courtier'],
  arcane: ['court_mage', 'hedge_mage', 'alchemist', 'tower_mage'],
  study: ['scholar', 'physician', 'tutor', 'guild_clerk', 'official', 'keeper', 'scribe'],
  woods: ['hunter', 'trapper', 'adventurer', 'delver', 'scout', 'forest_elder'],
  alley: ['beggar', 'laborer', 'prisoner', 'gang_member', 'gang_boss', 'rat_boss', 'dagger'],
  wall: ['soldier', 'guard', 'knight', 'knight_captain', 'old_knight', 'sword_master', 'warden', 'mercenary', 'border_guard', 'demon_warrior'],
};
const JOB_SET = {};
for (const [k, list] of Object.entries(SET_OF)) for (const j of list) JOB_SET[j] = k;

// 바탕 빛깔 (가운데·가장자리). 자리마다 확실히 다른 색 덩어리
const BASE = {
  field: ['#8a9a8a', '#3e4a3a'], forge: ['#5a3420', '#1e120c'], sea: ['#7c90a0', '#2a3644'], shop: ['#7a5a38', '#2e2016'],
  chapel: ['#6e6a66', '#2a2826'], court: ['#6a2a2a', '#26100e'], arcane: ['#3e3a6a', '#141428'], study: ['#5e4a34', '#221a12'],
  woods: ['#4a5a3a', '#18200e'], ash: ['#6a2e26', '#1a0c0c'], alley: ['#5a5a58', '#222224'], wall: ['#8a8070', '#34302a'], home: ['#7a6a52', '#2c241c'],
};

export function settingOf(job, tier, stage, race) {
  let s = stage === 'baby' || stage === 'child' ? (tier >= 3 ? 'court' : 'home') : JOB_SET[job] ?? (tier >= 4 ? 'court' : 'home');
  // 종족 땅의 공기: 엘프는 숲, 드워프는 돌 공방, 마족은 잿빛 붉은 하늘 (흔한 자리일 때만)
  if (s === 'home' || s === 'field') {
    if (race === 'elf') s = 'woods';
    else if (race === 'dwarf') s = 'forge';
    else if (race === 'demon') s = 'ash';
  }
  return s;
}

/** 배경 덩어리. 돌려주는 것: { hue(backGlow에 넘길 바탕 빛), base(그라데이션 두 색), art(그림) } */
export function backdrop({ job, tier, stage, race, uid, H, detail, roll = 0.5, roll2 = 0.5 }) {
  const set = settingOf(job, tier ?? 1, stage, race);
  let [c0, c1] = BASE[set];
  // 같은 자리라도 사람마다 빛깔이 조금씩 (해질녘·한낮·흐린 날)
  const shiftTo = ['#d8a060', '#90a8c0', '#a0a090', '#c08070'][Math.floor(roll2 * 4)];
  c0 = mixHex(c0, shiftTo, 0.12); c1 = mixHex(c1, shiftTo, 0.06);
  const A = [];
  const W = 100, hz = H * (0.5 + roll * 0.12);
  const blur = detail ? ` filter="url(#${uid}xs)"` : '';
  // 부드러운 빛 번짐: 필터 대신 둥근 그라데이션 (작은 초상에서도 가장자리가 부드럽다)
  let gn = 0;
  const soft = (x, y, rx, ry, col, op) => { const id = `${uid}bk${gn++}`; return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="${op}"/>${detail ? `<stop offset="0.5" stop-color="${col}" stop-opacity="${f(op * 0.45)}"/>` : ''}<stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})"/>`; };
  const fl = (id) => (detail ? ` filter="url(#${uid}${id})"` : ''); // 작은 초상은 필터 없이
  switch (set) {
    case 'field': {
      const sky = mixHex('#c8d4d8', shiftTo, 0.25);
      A.push(`<rect x="0" y="0" width="${W}" height="${f(hz)}" fill="${sky}" opacity="0.55"/>`);
      A.push(`<path d="M0 ${f(hz - 6)} Q18 ${f(hz - 14)} 34 ${f(hz - 7)} T70 ${f(hz - 9)} T100 ${f(hz - 5)} L100 ${f(hz)} L0 ${f(hz)}Z" fill="#6a7a6a" opacity="0.7"${blur}/>`);
      A.push(`<rect x="0" y="${f(hz)}" width="${W}" height="${f(H - hz)}" fill="${roll > 0.5 ? '#a89050' : '#5e7a40'}" opacity="0.85"/>`);
      let fur = '';
      for (let k = 0; k < 6; k++) fur += `M${f(-10 + k * 4)} ${H} L${f(30 + k * 7)} ${f(hz)} M${f(110 - k * 4)} ${H} L${f(70 - k * 7)} ${f(hz)} `;
      if (detail) A.push(`<path d="${fur}" stroke="${roll > 0.5 ? '#7a6630' : '#3e5a2a'}" stroke-width="1.2" opacity="0.5" fill="none"/>`);
      break;
    }
    case 'forge': {
      A.push(soft(12, H * 0.8, 40, H * 0.42, '#ff8a30', 0.75));
      A.push(soft(10, H * 0.84, 16, H * 0.16, '#ffd070', 0.6));
      // 벽에 걸린 연장 (집게·망치·톱 그림자)
      const tc = '#140a06';
      A.push(`<g fill="${tc}" opacity="0.6"><rect x="78" y="10" width="2" height="22"/><rect x="74" y="8" width="10" height="5" rx="1"/><rect x="88" y="12" width="1.6" height="26"/><path d="M86 36 l5 0 l-1 8 l-3 0Z"/><path d="M68 14 l1.4 0 l0 18 l3 6 l-1.2 0.6 l-3 -6Z"/></g>`);
      A.push(`<rect x="0" y="${f(H * 0.08)}" width="${W}" height="2" fill="${tc}" opacity="0.5"/>`);
      break;
    }
    case 'sea': {
      const sky = mixHex('#b8c8d4', shiftTo, 0.3);
      A.push(`<rect x="0" y="0" width="${W}" height="${f(hz)}" fill="${sky}" opacity="0.6"/>`);
      A.push(`<rect x="0" y="${f(hz)}" width="${W}" height="${f(H - hz)}" fill="#2e4a60" opacity="0.9"/>`);
      let wv = '';
      for (let k = 0; k < 5; k++) { const y = hz + 3 + k * 5; wv += `M0 ${f(y)} q6 -1.6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 `; }
      if (detail) A.push(`<path d="${wv}" stroke="#a8c4d4" stroke-width="0.9" fill="none" opacity="0.45"/>`);
      A.push(`<rect x="0" y="${f(hz - 0.6)}" width="${W}" height="1.4" fill="#e8eef0" opacity="0.5"/>`);
      // 먼 돛배
      const sx = roll > 0.5 ? 82 : 14;
      A.push(`<g fill="#1e2a34" opacity="0.7"><path d="M${sx - 5} ${f(hz - 0.5)} l10 0 l-2 2.4 l-6 0Z"/><path d="M${sx} ${f(hz - 1)} l0 -11 l5.5 10Z"/><path d="M${sx - 0.6} ${f(hz - 1.4)} l0 -8 l-4 7.6Z"/></g>`);
      break;
    }
    case 'shop': {
      // 선반과 단지·병, 등잔 빛
      A.push(soft(22, 16, 30, 26, '#ffc070', 0.6));
      const sc = '#3a2412';
      for (const y of [H * 0.2, H * 0.42]) {
        A.push(`<rect x="62" y="${f(y)}" width="40" height="2.4" fill="${sc}" opacity="0.8"/><rect x="-2" y="${f(y)}" width="22" height="2.4" fill="${sc}" opacity="0.8"/>`);
        let jars = '';
        const cols = ['#8a5a30', '#5a6a4a', '#7a3a2a', '#a08050', '#4a4a5a'];
        for (let k = 0; k < 5; k++) { const x = 66 + k * 7, hgt = 5 + ((k * 7 + Math.floor(roll * 10)) % 4); jars += `<rect x="${f(x)}" y="${f(y - hgt)}" width="5" height="${f(hgt)}" rx="1.6" fill="${cols[(k + Math.floor(roll2 * 5)) % 5]}"/>`; }
        for (let k = 0; k < 2; k++) { const x = 3 + k * 8; jars += `<ellipse cx="${f(x + 2.5)}" cy="${f(y - 3)}" rx="3" ry="3.2" fill="${cols[(k + 2) % 5]}"/>`; }
        if (detail) A.push(`<g opacity="0.75">${jars}</g>`);
        else A.push(`<rect x="64" y="${f(y - 6)}" width="36" height="6" fill="#7a5a3a" opacity="0.6"/>`);
      }
      A.push(`<g opacity="0.85"><path d="M22 4 l0 5" stroke="#2a1a0a" stroke-width="0.8"/><rect x="19" y="9" width="6" height="7" rx="1.2" fill="#ffd890" stroke="#2a1a0a" stroke-width="0.8"/></g>`);
      break;
    }
    case 'chapel': {
      // 뾰족한 아치 창에서 들어오는 빛과 초
      const wx = roll > 0.5 ? 74 : 8, ww = 18, wy = 6, wh = H * 0.42;
      A.push(`<path d="M${wx} ${f(wy + wh)} L${wx} ${f(wy + ww * 0.6)} Q${wx} ${wy} ${wx + ww / 2} ${wy - 2} Q${wx + ww} ${wy} ${wx + ww} ${f(wy + ww * 0.6)} L${wx + ww} ${f(wy + wh)}Z" fill="#e8dcb0" opacity="0.75"/>`);
      A.push(`<path d="M${wx + ww / 2} ${wy - 1} L${wx + ww / 2} ${f(wy + wh)} M${wx} ${f(wy + wh * 0.5)} L${wx + ww} ${f(wy + wh * 0.5)}" stroke="#3a3430" stroke-width="1.6" opacity="0.8"/>`);
      A.push(`<path d="M${wx - 4} ${f(wy + wh + 2)} L${wx + ww + 4} ${f(wy + wh + 2)} L${wx + ww + 30} ${H} L${wx - 30} ${H}Z" fill="#f0e4b8" opacity="0.14"${blur}/>`);
      let st = '';
      for (let k = 0; k < 7; k++) st += `M0 ${f(H * 0.12 * k + 4)} L100 ${f(H * 0.12 * k + 4)} `;
      if (detail) A.push(`<path d="${st}" stroke="#2a2624" stroke-width="0.7" opacity="0.35" fill="none"/>`);
      const cxx = roll > 0.5 ? 14 : 86;
      A.push(`<rect x="${cxx - 1.6}" y="${f(H * 0.5)}" width="3.2" height="12" fill="#e8dcc0" opacity="0.85"/><ellipse cx="${cxx}" cy="${f(H * 0.5 - 2)}" rx="1.4" ry="2.4" fill="#ffd060"/>`);
      A.push(soft(cxx, H * 0.5 - 2, 10, 10, '#ffc050', 0.5));
      break;
    }
    case 'court': {
      // 기둥과 깃발, 금빛 띠
      const bc = ['#7a1e22', '#1e3a6a', '#1e4a32', '#5a2a6a'][Math.floor(roll2 * 4)];
      A.push(`<rect x="0" y="${f(H * 0.66)}" width="${W}" height="${f(H * 0.34)}" fill="#2a1a12" opacity="0.4"/>`);
      for (const x of [4, 86]) A.push(`<rect x="${x}" y="0" width="10" height="${H}" fill="#c8b890" opacity="0.38"/><rect x="${x + 7}" y="0" width="3" height="${H}" fill="#3a2a1a" opacity="0.3"/>`);
      const bx = roll > 0.5 ? 66 : 18;
      A.push(`<path d="M${bx} 0 L${bx + 16} 0 L${bx + 16} ${f(H * 0.5)} L${bx + 8} ${f(H * 0.44)} L${bx} ${f(H * 0.5)}Z" fill="${bc}" opacity="0.9"/><path d="M${bx} 3 L${bx + 16} 3" stroke="#d8b860" stroke-width="1.6"/><circle cx="${bx + 8}" cy="${f(H * 0.22)}" r="4" fill="none" stroke="#d8b860" stroke-width="1.2"/>`);
      break;
    }
    case 'arcane': {
      // 마법진과 별빛
      const rx = roll > 0.5 ? 78 : 22, ry = H * 0.3;
      A.push(soft(rx, ry, 22, 22, '#8ab0ff', 0.35));
      A.push(`<g fill="none" stroke="#b8d0ff" opacity="0.6"><circle cx="${rx}" cy="${f(ry)}" r="13" stroke-width="1"/><circle cx="${rx}" cy="${f(ry)}" r="9" stroke-width="0.7"/><path d="M${rx} ${f(ry - 13)} L${rx + 11.3} ${f(ry + 6.5)} L${rx - 11.3} ${f(ry + 6.5)}Z M${rx} ${f(ry + 13)} L${rx + 11.3} ${f(ry - 6.5)} L${rx - 11.3} ${f(ry - 6.5)}Z" stroke-width="0.6"/></g>`);
      let stars = '';
      for (let k = 0; k < 14; k++) { const x = (k * 37 + roll * 50) % 100, y = (k * 23 + roll2 * 40) % (H * 0.6); stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${k % 3 ? 0.5 : 0.9}"/>`; }
      if (detail) A.push(`<g fill="#e0e8ff" opacity="0.7">${stars}</g>`);
      break;
    }
    case 'study': {
      // 책장: 칸마다 색이 다른 책등
      const cols = ['#6a2a1e', '#2a3a5a', '#4a5a2a', '#7a5a2a', '#3a2a3a', '#8a7a5a'];
      for (const [x0, x1] of [[-2, 24], [74, 102]]) {
        for (let row = 0; row < 4; row++) {
          const y = 4 + row * H * 0.17;
          let books = '', x = x0;
          let k = row * 3 + Math.floor(roll * 6);
          while (x < x1 - 2) { const w = 2.2 + ((k * 5) % 3) * 0.8, hgt = H * 0.13 - ((k * 3) % 3); books += `<rect x="${f(x)}" y="${f(y + H * 0.15 - hgt)}" width="${f(w)}" height="${f(hgt)}" fill="${cols[k % 6]}"/>`; x += w + 0.4; k++; }
          A.push(`${detail ? `<g opacity="0.7">${books}</g>` : `<rect x="${x0}" y="${f(y + 2)}" width="${x1 - x0}" height="${f(H * 0.13)}" fill="${cols[row % 6]}" opacity="0.55"/>`}<rect x="${x0}" y="${f(y + H * 0.15)}" width="${x1 - x0}" height="1.6" fill="#2a1a0e" opacity="0.85"/>`);
        }
      }
      break;
    }
    case 'woods': {
      A.push(`<rect x="0" y="0" width="${W}" height="${f(H * 0.5)}" fill="#a8b890" opacity="0.25"${fl('xw')}/>`);
      const tc = '#1a2210';
      let tr = '';
      const xs = roll > 0.5 ? [4, 16, 80, 92] : [2, 12, 22, 86];
      xs.forEach((x, k) => { const w = 3 + (k % 2) * 3; tr += `<path d="M${x} ${H} L${x + 0.6} 0 L${x + w} 0 L${x + w - 0.4} ${H}Z" opacity="${0.5 + (k % 2) * 0.25}"/>`; });
      A.push(`<g fill="${tc}">${tr}</g>`);
      A.push(`<path d="M0 ${f(H * 0.18)} Q20 ${f(H * 0.05)} 40 ${f(H * 0.12)} T80 ${f(H * 0.08)} T100 ${f(H * 0.16)} L100 0 L0 0Z" fill="#2a3a1a" opacity="0.6"${blur}/>`);
      break;
    }
    case 'alley': {
      // 축축한 벽돌 벽
      let br = '';
      const rows = Math.ceil(H / 6);
      for (let row = 0; row < rows; row++) { const y = row * 6; br += `M0 ${y} L100 ${y} `; for (let k = 0; k < 9; k++) { const x = k * 12 + (row % 2 ? 6 : 0); br += `M${x} ${y} L${x} ${y + 6} `; } }
      if (detail) A.push(`<path d="${br}" stroke="#1e1e1e" stroke-width="0.8" opacity="0.45" fill="none"/>`);
      A.push(`<path d="M${roll > 0.5 ? 70 : 6} 0 q4 ${f(H * 0.3)} -2 ${f(H * 0.6)}" stroke="#2a3a2a" stroke-width="5" opacity="0.3" fill="none"${blur}/>`);
      break;
    }
    case 'wall': {
      // 성벽 위 흉벽과 하늘
      const sky = mixHex('#c0c8cc', shiftTo, 0.3);
      A.push(`<rect x="0" y="0" width="${W}" height="${f(hz)}" fill="${sky}" opacity="0.55"/>`);
      let m = `M0 ${f(hz)} `;
      for (let x = 0; x < 100; x += 12) m += `L${x} ${f(hz - 6)} L${x + 6} ${f(hz - 6)} L${x + 6} ${f(hz)} L${x + 12} ${f(hz)} `;
      m += `L100 ${H} L0 ${H}Z`;
      A.push(`<path d="${m}" fill="#5a5448" opacity="0.85"/>`);
      let st = '';
      for (let y = hz + 5; y < H; y += 6) st += `M0 ${f(y)} L100 ${f(y)} `;
      if (detail) A.push(`<path d="${st}" stroke="#2a2620" stroke-width="0.7" opacity="0.45" fill="none"/>`);
      const fx = roll > 0.5 ? 84 : 14;
      A.push(`<path d="M${fx} ${f(hz - 6)} L${fx} ${f(hz - 30)}" stroke="#2a2018" stroke-width="1"/><path d="M${fx} ${f(hz - 30)} l12 3 l-12 4Z" fill="${['#8a2a1e', '#1e3a6a', '#d8b040'][Math.floor(roll2 * 3)]}" opacity="0.9"/>`);
      break;
    }
    case 'ash': {
      // 마대륙: 붉게 탄 하늘과 뾰족한 검은 바위
      A.push(`<rect x="0" y="0" width="${W}" height="${f(hz)}" fill="#c0603a" opacity="0.35"${fl('xw')}/>`);
      A.push(`<path d="M0 ${f(hz)} L6 ${f(hz - 18)} L11 ${f(hz - 6)} L18 ${f(hz - 26)} L24 ${f(hz - 4)} L34 ${f(hz - 10)} L66 ${f(hz - 8)} L76 ${f(hz - 22)} L82 ${f(hz - 5)} L90 ${f(hz - 30)} L96 ${f(hz - 8)} L100 ${f(hz - 12)} L100 ${H} L0 ${H}Z" fill="#1a1012" opacity="0.85"/>`);
      let em = '';
      for (let k = 0; k < 10; k++) em += `<circle cx="${f((k * 31 + roll * 40) % 100)}" cy="${f((k * 17 + roll2 * 30) % (hz * 0.9))}" r="${k % 3 ? 0.5 : 0.8}"/>`;
      if (detail) A.push(`<g fill="#ffb070" opacity="0.7">${em}</g>`);
      break;
    }
    default: { // home: 회벽과 작은 창
      const wx = roll > 0.5 ? 76 : 6;
      A.push(`<rect x="${wx}" y="10" width="18" height="22" fill="${mixHex('#d8e0d0', shiftTo, 0.3)}" opacity="0.6"/><path d="M${wx + 9} 10 L${wx + 9} 32 M${wx} 21 L${wx + 18} 21" stroke="#3a2a1a" stroke-width="1.4" opacity="0.8"/><rect x="${wx}" y="10" width="18" height="22" fill="none" stroke="#3a2a1a" stroke-width="1.6" opacity="0.8"/>`);
      A.push(`<rect x="0" y="${f(H * 0.08)}" width="${W}" height="3" fill="#3a2a1a" opacity="0.4"/>`);
    }
  }
  return { set, hue: shade(c0, 0.35), c0, c1, art: A.join('') };
}

void tint;
