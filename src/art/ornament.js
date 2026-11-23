// 화면에 쓰는 장식 그림 (38단계). 놋쇠 선과 먹선으로 그린 가벼운 SVG 글자열이다.
// 선 빛깔은 currentColor를 따른다: 감싸는 요소의 color(예: var(--brass-dim))로 정하면 된다.
// 화면 코드(src/ui)는 이 글자열을 innerHTML에 넣거나, uri()로 바꿔 CSS 배경에 쓴다. DOM 없이도 돈다.
//
//   corner(kind)            테두리 모서리 하나 (왼쪽 위 기준. 나머지는 CSS로 돌려 쓴다) kind: line | knot | leaf
//   frameCss(o)             네 모서리를 한 번에 붙이는 CSS 조각 (.orn-frame)
//   crest(kind)             머리 장식 (제목 위아래에 놓는 가운데 장식) kind: seal | sun | blade | crown | laurel
//   divider(kind)           구분선 (양쪽으로 가늘어지는 선과 가운데 장식) kind: diamond | knot | dots | plain
//   shield(o)               문장 틀과 문장 (집안 문장, 세력 표) o: { field, metal, split, charge, size }
//   crestFor(text, seed)    문장을 적은 글에서 shield()에 줄 값을 고른다
//   medallion(o)            둥근 틀 (초상·도장 둘레)
//   emptyArt(kind)          빈 화면 그림 kind: quiet | people | letters | chronicle | map | search | grave | road
//   paper(kind)             양피지·가죽 결 (작은 되풀이 무늬의 data URI) kind: parchment | leather | dark
//   uri(svg, color)         SVG 글자열을 CSS url()에 쓸 수 있게 바꾼다
//   ORNAMENT_CSS            위 그림을 쓰는 기본 틀 (도우미가 style.css로 옮겨 다듬어도 된다)

const svg = (w, h, body, o = {}) => `<svg class="orn${o.cls ? ` ${o.cls}` : ''}" viewBox="0 0 ${w} ${h}" width="${o.width ?? w}" height="${o.height ?? h}" fill="none" stroke="currentColor" stroke-width="${o.sw ?? 1.2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s ?? '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const fill = 'fill="currentColor" stroke="none"';

/** SVG 글자열 → CSS url() 안에 넣을 주소. color를 주면 currentColor를 그 빛깔로 굳힌다(배경 그림은 글자색을 못 따른다) */
export function uri(s, color) {
  let x = String(s).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  if (color) x = x.replace(/currentColor/g, color);
  return `url("data:image/svg+xml,${encodeURIComponent(x).replace(/'/g, '%27')}")`;
}

/* ---------- 테두리 모서리 ---------- */
const CORNERS = {
  // 두 줄 꺾쇠와 작은 마름모
  line: `<path d="M1 31V8Q1 1 8 1H31"/><path d="M5 31V11Q5 5 11 5H31" opacity=".45" stroke-width=".8"/><path d="M9 6.2 11.8 9 9 11.8 6.2 9Z" ${fill}/><path d="M1 21h3M21 1v3" stroke-width=".8"/>`,
  // 매듭: 모서리에서 한 번 감아 돈다
  knot: `<path d="M1 31V13Q1 9 5 9H9V5Q9 1 13 1H31"/><path d="M5 31V15Q5 13 7 13H13V7Q13 5 15 5H31" opacity=".5" stroke-width=".8"/><path d="M9 9H5V5H9Z"/><circle cx="7" cy="7" r=".9" ${fill}/><path d="M1 24h3M24 1v3" stroke-width=".8"/>`,
  // 잎: 모서리에서 잎 둘이 갈라진다
  leaf: `<path d="M1 31V7Q1 1 7 1H31"/><path d="M4 4Q13 5 17 12Q10 12 4 4Z" ${fill} opacity=".8"/><path d="M4 4Q5 13 12 17Q12 10 4 4Z" ${fill} opacity=".55"/><path d="M4 4 15 15" stroke-width=".7"/><circle cx="20" cy="4.5" r=".9" ${fill}/><circle cx="4.5" cy="20" r=".9" ${fill}/>`,
};
/** 테두리 모서리 (왼쪽 위). size: 한 변 픽셀 */
export function corner(kind = 'line', size = 28) { return svg(32, 32, CORNERS[kind] ?? CORNERS.line, { width: size, height: size, cls: 'orn-corner' }); }

/**
 * 네 모서리를 붙이는 CSS. 쓰는 법: 요소에 class="orn-frame"(자리잡기 relative는 이 CSS가 준다).
 * o: { kind, size, color, inset } 다른 모양이 필요하면 selector를 바꿔 여러 번 부른다.
 */
export function frameCss({ selector = '.orn-frame', kind = 'line', size = 22, color = '#8a6d38', inset = 3 } = {}) {
  const u = uri(svg(32, 32, CORNERS[kind] ?? CORNERS.line), color);
  const flip = uri(svg(32, 32, `<g transform="translate(32 32) rotate(180)">${CORNERS[kind] ?? CORNERS.line}</g>`), color);
  const tr = uri(svg(32, 32, `<g transform="translate(32 0) scale(-1 1)">${CORNERS[kind] ?? CORNERS.line}</g>`), color);
  const bl = uri(svg(32, 32, `<g transform="translate(0 32) scale(1 -1)">${CORNERS[kind] ?? CORNERS.line}</g>`), color);
  // 선택자를 쉼표로 여럿 주거나 배열로 줘도 된다. 하나씩 나눠 ::before·::after를 붙인다 (괄호 안 쉼표는 그대로 둔다)
  const list = splitSelectors(selector); if (!list.length) return '';
  const each = (suffix) => list.map((x) => x + suffix).join(',');
  return `${each('')}{position:relative}
${each('::before')},${each('::after')}{content:"";position:absolute;inset:${inset}px;pointer-events:none;background-repeat:no-repeat;background-size:${size}px ${size}px}
${each('::before')}{background-image:${u},${tr};background-position:left top,right top}
${each('::after')}{background-image:${bl},${flip};background-position:left bottom,right bottom}`;
}
function splitSelectors(sel) {
  const out = [];
  for (const one of Array.isArray(sel) ? sel : [sel]) {
    let depth = 0, cur = '';
    for (const ch of String(one ?? '')) {
      if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
  }
  return out.map((x) => x.trim()).filter(Boolean);
}

/* ---------- 머리 장식 ---------- */
// 가운데 장식(48x24 안)과 양옆으로 뻗는 선. 너비 200 기준.
const WING = `<path d="M70 12H16M130 12H184" /><path d="M64 15.5H30M136 15.5H170" opacity=".45" stroke-width=".8"/><path d="M16 12 10 12M190 12 184 12" stroke-width=".8" opacity=".6"/><circle cx="6" cy="12" r="1.1" ${fill}/><circle cx="194" cy="12" r="1.1" ${fill}/><path d="M76 12 72 9.5 68 12 72 14.5ZM124 12 128 9.5 132 12 128 14.5Z" ${fill} opacity=".8"/>`;
const CRESTS = {
  // 봉인: 겹친 마름모와 쐐기 넷
  seal: `<path d="M100 2 110 12 100 22 90 12Z"/><path d="M100 6.5 105.5 12 100 17.5 94.5 12Z" ${fill} opacity=".85"/><path d="M84 12h4M112 12h4"/><circle cx="100" cy="12" r="1.2" fill="var(--bg,#17130f)" stroke="none"/>`,
  // 해: 둥근 해와 여덟 빛살
  sun: `<circle cx="100" cy="12" r="4.6"/><circle cx="100" cy="12" r="1.6" ${fill}/><path d="M100 2.5V5M100 19V21.5M90.5 12H93M107 12H109.5M93.3 5.3 95 7M105 17 106.7 18.7M106.7 5.3 105 7M95 17 93.3 18.7"/>`,
  // 검: 세운 검과 날개 같은 가드
  blade: `<path d="M100 1 102.2 5V16H97.8V5Z" ${fill} opacity=".85"/><path d="M92 16Q100 13.5 108 16"/><path d="M100 16V21.5"/><circle cx="100" cy="22.4" r="1.2" ${fill}/><path d="M86 12h6M108 12h6" opacity=".7"/>`,
  // 관: 세 갈래 관
  crown: `<path d="M90 18V8L95 13 100 5 105 13 110 8V18Z"/><path d="M90 18H110" stroke-width="1.6"/><circle cx="100" cy="4" r="1.1" ${fill}/><circle cx="90" cy="7" r="1" ${fill}/><circle cx="110" cy="7" r="1" ${fill}/>`,
  // 월계: 마주 굽은 두 가지
  laurel: `<path d="M100 20Q89 18 88 6"/><path d="M100 20Q111 18 112 6"/>${[[89.4, 9, -60], [90.6, 13, -45], [93.4, 16.4, -25], [110.6, 9, 60], [109.4, 13, 45], [106.6, 16.4, 25]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry="2.8" transform="rotate(${r} ${x} ${y})" ${fill} opacity=".8"/>`).join('')}<circle cx="100" cy="10" r="1.4" ${fill}/>`,
};
/** 머리 장식. width: 픽셀 너비(높이는 비례) */
export function crest(kind = 'seal', width = 200) { return svg(200, 24, WING + (CRESTS[kind] ?? CRESTS.seal), { width, height: Math.round(width * 0.12), cls: 'orn-crest' }); }

/* ---------- 구분선 ---------- */
const DIVS = {
  diamond: `<path d="M12 2 16 6 12 10 8 6Z" ${fill}/><path d="M3 6h3M18 6h3" stroke-width=".9"/>`,
  knot: `<path d="M6 6Q9 1 12 6T18 6"/><path d="M6 6Q9 11 12 6T18 6"/><circle cx="3" cy="6" r=".9" ${fill}/><circle cx="21" cy="6" r=".9" ${fill}/>`,
  dots: `<circle cx="12" cy="6" r="1.6" ${fill}/><circle cx="6" cy="6" r=".9" ${fill} opacity=".7"/><circle cx="18" cy="6" r=".9" ${fill} opacity=".7"/>`,
  plain: '',
};
/** 구분선: 양쪽 선은 CSS(.orn-div)가 긋고, 가운데 장식만 SVG다. HTML 글자열을 돌려준다 */
export function divider(kind = 'diamond') {
  const mid = DIVS[kind] ?? DIVS.diamond;
  return `<div class="orn-div" role="separator">${mid ? svg(24, 12, mid, { cls: 'orn-div-mid' }) : ''}</div>`;
}

/* ---------- 문장 ---------- */
// 방패 꼴 (100x116). 위는 살짝 귀가 서고 아래로 모인다.
const SHIELD = 'M6 8Q28 12 50 4Q72 12 94 8V56Q94 92 50 112Q6 92 6 56Z';
const CHARGES = {
  sword: '<path d="M50 24 54 32V72H46V32Z"/><path d="M36 72H64V77H36Z"/><path d="M47.5 77H52.5V88H47.5Z"/><circle cx="50" cy="91" r="3.4"/>',
  tower: '<path d="M38 88V44H34V32H40V37H46V32H54V37H60V32H66V44H62V88Z"/><path d="M46 88V74Q50 68 54 74V88Z" fill="var(--orn-field,#2b241c)"/>',
  tree: '<path d="M47 90V66H53V90Z"/><path d="M50 26Q70 34 66 52Q74 58 62 68H38Q26 58 34 52Q30 34 50 26Z"/>',
  wolf: '<path d="M30 78 36 52 30 40 42 46 50 38 58 46 70 40 64 52 70 78 58 70 50 86 42 70Z"/><circle cx="43" cy="58" r="2" fill="var(--orn-field,#2b241c)"/><circle cx="57" cy="58" r="2" fill="var(--orn-field,#2b241c)"/>',
  star: '<path d="M50 26 55.5 46 76 46 59.5 58 66 78 50 66 34 78 40.5 58 24 46 44.5 46Z"/>',
  sun: `<circle cx="50" cy="56" r="12"/>${Array.from({ length: 8 }, (_, i) => `<path d="M50 34 53 42H47Z" transform="rotate(${i * 45} 50 56)"/>`).join('')}`,
  wheat: `<path d="M48.6 92V40H51.4V92Z"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="43" cy="${44 + i * 9}" rx="3.2" ry="6.4" transform="rotate(-32 43 ${44 + i * 9})"/><ellipse cx="57" cy="${44 + i * 9}" rx="3.2" ry="6.4" transform="rotate(32 57 ${44 + i * 9})"/>`).join('')}<ellipse cx="50" cy="32" rx="3.2" ry="7"/>`,
  key: '<path d="M50 28A10 10 0 1 0 50 48 10 10 0 1 0 50 28ZM50 33.5A4.5 4.5 0 1 1 50 42.5 4.5 4.5 0 1 1 50 33.5Z" fill-rule="evenodd"/><path d="M47.5 47H52.5V90H47.5Z"/><path d="M52.5 76H61V81H52.5ZM52.5 84H58V89H52.5Z"/>',
  anchor: '<path d="M50 26A5 5 0 1 0 50 36 5 5 0 1 0 50 26ZM50 28.8A2.2 2.2 0 1 1 50 33.2 2.2 2.2 0 1 1 50 28.8Z" fill-rule="evenodd"/><path d="M48 36H52V84H48Z"/><path d="M40 44H60V48H40Z"/><path d="M28 66Q30 86 50 90Q70 86 72 66L66 70Q64 82 50 84Q36 82 34 70Z"/>',
  hammer: '<path d="M34 34H64L70 40V50H34Z"/><path d="M47 50H53V92H47Z"/>',
  book: '<path d="M26 40Q38 36 50 42Q62 36 74 40V80Q62 76 50 82Q38 76 26 80Z"/><path d="M49 42H51V82H49Z" fill="var(--orn-field,#2b241c)"/>',
  flame: '<path d="M50 24Q66 44 62 58Q70 54 68 46Q78 62 70 78Q62 92 50 92Q38 92 30 78Q24 62 38 50Q38 60 44 60Q40 42 50 24Z"/>',
  crown: '<path d="M28 76V44L39 58 50 36 61 58 72 44V76Z"/><path d="M26 80H74V86H26Z"/>',
  stag: '<path d="M44 90 46 66 40 56 44 54 50 62 56 54 60 56 54 66 56 90Z"/><path d="M42 54Q30 46 32 30M38 46Q28 44 26 36M58 54Q70 46 68 30M62 46Q72 44 74 36" fill="none" stroke="var(--orn-metal,#c9a25a)" stroke-width="3.4" stroke-linecap="round"/>',
  raven: '<path d="M26 60Q40 40 60 44L74 38 68 50Q74 70 52 80L44 92 42 80Q30 78 26 60Z"/><circle cx="60" cy="50" r="1.8" fill="var(--orn-field,#2b241c)"/>',
  rose: `${Array.from({ length: 5 }, (_, i) => `<ellipse cx="50" cy="42" rx="9" ry="12" transform="rotate(${i * 72} 50 58)"/>`).join('')}<circle cx="50" cy="58" r="5" fill="var(--orn-field,#2b241c)"/>`,
};
const SPLITS = {
  plain: '',
  pale: '<path d="M50 0V116H100V0Z"/>',                 // 세로로 가름
  fess: '<path d="M0 0H100V46H0Z"/>',                    // 위쪽 띠
  bend: '<path d="M0 0H100L0 100Z"/>',                   // 빗금으로 가름
  chevron: '<path d="M0 116V84L50 44 100 84V116Z"/>',    // 꺾쇠
  chief: '<path d="M0 0H100V30H0Z"/>',                   // 머리띠
};
export const CHARGE_KINDS = Object.keys(CHARGES);
/**
 * 문장. o: { field 바탕색, metal 무늬색, second 가른 쪽 색, split, charge, size, frame(테두리만) }
 * 빛깔은 굳혀 넣는다(문장은 집안마다 제 빛깔이 있다). 테두리 선만 currentColor.
 */
export function shield({ field = '#2b241c', metal = '#c9a25a', second = null, split = 'plain', charge = null, size = 48, frame = false, id = null } = {}) {
  const cid = `orn-sh-${id ?? hashStr(field + metal + split + charge + size).toString(36)}`;
  const inner = frame ? '' : `<g clip-path="url(#${cid})" stroke="none"><path d="M0 0H100V116H0Z" fill="${field}"/>${SPLITS[split] ? `<g fill="${second ?? metal}" opacity="${second ? 1 : 0.28}">${SPLITS[split]}</g>` : ''}${CHARGES[charge] ? `<g fill="${metal}">${CHARGES[charge]}</g>` : ''}<path d="M6 8Q28 12 50 4Q72 12 94 8V30Q50 22 6 40Z" fill="#fff" opacity=".06"/></g>`;
  const body = `<defs><clipPath id="${cid}"><path d="${SHIELD}"/></clipPath></defs>${inner}<path d="${SHIELD}" stroke-width="3"/><path d="M11 13Q30 16.5 50 9.5Q70 16.5 89 13V56Q89 88 50 106.5Q11 88 11 56Z" stroke-width="1" opacity=".5"/>`;
  return `<svg class="orn orn-shield" viewBox="0 0 100 116" width="${size}" height="${Math.round(size * 1.16)}" fill="none" stroke="currentColor" stroke-linejoin="round" aria-hidden="true" focusable="false" style="--orn-field:${field};--orn-metal:${metal}">${body}</svg>`;
}
const FIELDS = ['#5a2326', '#24385a', '#2f4a36', '#3a2f4a', '#2b241c', '#4a3a22', '#1f2a30'];
const METALS = ['#c9a25a', '#cfc8b8', '#b8894a'];
const WORDS = [
  [/사슴|뿔/, 'stag'], [/까마귀|새|매|독수리|날개/, 'raven'], [/검(?![은정])|칼|기사/, 'sword'], [/탑|성|성벽|망루/, 'tower'], [/나무|참나무|숲|가지/, 'tree'], [/늑대|이리|개/, 'wolf'], [/별/, 'star'],
  [/해|태양|햇빛|햇살/, 'sun'], [/밀|이삭|보리|곡식/, 'wheat'], [/열쇠/, 'key'], [/닻|배|바다|물결/, 'anchor'], [/망치|모루|대장/, 'hammer'],
  [/책|붓|깃펜|두루마리/, 'book'], [/불|화염|횃불/, 'flame'], [/관|왕관/, 'crown'], [/장미|꽃/, 'rose'],
];
const SPLIT_KEYS = ['plain', 'plain', 'pale', 'fess', 'bend', 'chevron', 'chief'];
/** 문장을 적은 글(예: "붉은 바탕에 검 한 자루")에서 shield()에 줄 값을 고른다. 같은 글과 seed면 늘 같다 */
export function crestFor(text = '', seed = 0) {
  const t = String(text ?? ''); const h = hashStr(`${t}|${seed}`);
  const charge = WORDS.find(([re]) => re.test(t))?.[1] ?? CHARGE_KINDS[h % CHARGE_KINDS.length];
  const field = /붉|진홍|핏/.test(t) ? '#5a2326' : /푸른|파란|남빛|쪽빛/.test(t) ? '#24385a' : /초록|녹|풀빛/.test(t) ? '#2f4a36' : /검은|검정|먹/.test(t) ? '#1c1a1c' : /보라|자주/.test(t) ? '#3a2f4a' : /흰 바탕|은빛 바탕/.test(t) ? '#5a5a58' : FIELDS[(h >>> 4) % FIELDS.length];
  const metal = /은빛|은색|흰/.test(t) ? '#cfc8b8' : /금|놋|누런/.test(t) ? '#c9a25a' : METALS[(h >>> 9) % METALS.length];
  return { field, metal, charge, split: SPLIT_KEYS[(h >>> 13) % SPLIT_KEYS.length] };
}

/* ---------- 둥근 틀 ---------- */
/** 초상이나 도장 둘레의 둥근 틀. size: 지름. 안은 비어 있다(그림 위에 겹쳐 쓴다) */
export function medallion({ size = 64, ticks = 24 } = {}) {
  let t = '';
  for (let i = 0; i < ticks; i++) { const a = (i / ticks) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r1 = i % 6 === 0 ? 43.2 : 44.6; t += `M${(50 + c * r1).toFixed(1)} ${(50 + s * r1).toFixed(1)}L${(50 + c * 46.6).toFixed(1)} ${(50 + s * 46.6).toFixed(1)}`; }
  return svg(100, 100, `<circle cx="50" cy="50" r="48.4" stroke-width="2"/><circle cx="50" cy="50" r="41.6" stroke-width="1" opacity=".55"/><path d="${t}" stroke-width=".9" opacity=".7"/>${[0, 90, 180, 270].map((d) => `<path d="M50 .4 52.4 3 50 5.6 47.6 3Z" transform="rotate(${d} 50 50)" ${fill}/>`).join('')}`, { width: size, height: size, cls: 'orn-medal' });
}

/* ---------- 빈 화면 그림 ---------- */
// 먹선 소묘 (160x110). 아무것도 없을 때 글 위에 놓는다.
const EMPTY = {
  // 탁자 위의 촛불과 덮인 책
  quiet: `<path d="M24 86H136"/><path d="M34 86V98M126 86V98" opacity=".6"/><path d="M70 86V58H80V86"/><path d="M75 58V52"/><path d="M75 52Q69 44 75 34Q81 44 75 52Z" ${fill} opacity=".85"/><path d="M66 86Q75 80 84 86" opacity=".5"/><path d="M96 86V76H126V86M96 79.5H126" /><path d="M48 86Q46 76 52 74Q58 76 56 86"/><path d="M62 30Q75 14 88 30M56 38Q75 6 94 38" opacity=".3" stroke-dasharray="1 4"/>`,
  // 빈 걸상 둘과 식은 잔
  people: `<path d="M20 92H140"/><path d="M36 92V66H60V92M36 66V44M36 52H60M60 66V60"/><path d="M100 92V66H124V92M124 66V44M100 52H124M100 66V60"/><path d="M68 74H92M72 74V92M88 74V92"/><path d="M76 74V67H84V74M84 69H87V72H84" stroke-width="1"/>`,
  // 봉랍 찍힌 편지와 깃펜
  letters: `<path d="M34 40H112V88H34Z"/><path d="M34 40 73 68 112 40"/><circle cx="73" cy="72" r="7"/><path d="M73 68.5 76 72 73 75.5 70 72Z" ${fill}/><path d="M118 92Q132 60 128 22Q114 44 112 70Z"/><path d="M118 92 124 46" opacity=".6"/><path d="M114 96H124" />`,
  // 펼친 책과 책갈피 끈
  chronicle: `<path d="M22 34Q52 26 80 36Q108 26 138 34V86Q108 78 80 88Q52 78 22 86Z"/><path d="M80 36V88"/><path d="M32 46Q52 41 70 47M32 56Q52 51 70 57M32 66Q52 61 70 67M90 47Q108 41 128 46M90 57Q108 51 128 56" opacity=".45" stroke-width=".9"/><path d="M96 36V20L101 25 106 20V34" ${fill} opacity=".7"/>`,
  // 나침반과 접힌 지도
  map: `<path d="M20 34 54 26 106 36 140 28V84L106 92 54 82 20 90Z"/><path d="M54 26V82M106 36V92" opacity=".5"/><circle cx="80" cy="59" r="15"/><path d="M80 40 84 59 80 78 76 59Z" ${fill} opacity=".85"/><path d="M61 59 80 56 99 59 80 62Z" opacity=".7"/><path d="M30 46Q38 52 34 62T44 78" stroke-dasharray="2 3" opacity=".6"/>`,
  // 등불
  search: `<path d="M68 22H92M72 22Q80 12 88 22"/><path d="M64 38H96L92 30H68Z"/><path d="M66 38V80H94V38"/><path d="M62 80H98V86H62Z"/><path d="M80 70Q73 62 80 50Q87 62 80 70Z" ${fill} opacity=".85"/><path d="M52 60H44M116 60H108M56 42 50 38M104 42 110 38M56 78 50 82M104 78 110 82" opacity=".4"/><path d="M40 96H120" opacity=".5"/>`,
  // 돌무덤과 마른 풀
  grave: `<path d="M16 92H144"/><path d="M62 92V50Q62 34 80 34Q98 34 98 50V92"/><path d="M72 56H88M80 48V68" opacity=".7"/><path d="M34 92Q36 80 30 74M38 92Q40 82 46 78M118 92Q118 82 112 76M124 92Q126 84 132 80" opacity=".6"/><path d="M52 92Q56 86 62 88M98 88Q104 86 108 92" opacity=".5"/>`,
  // 갈림길의 이정표
  road: `<path d="M12 96Q60 86 76 64Q86 50 78 34" opacity=".55"/><path d="M40 98Q84 90 96 70Q112 46 148 44" opacity=".55"/><path d="M92 96V40"/><path d="M92 46H124L130 52 124 58H92Z"/><path d="M92 62H64L58 68 64 74H92Z"/><path d="M84 96H100" />`,
};
export const EMPTY_KINDS = Object.keys(EMPTY);
/** 빈 화면 그림. width: 픽셀 너비 */
export function emptyArt(kind = 'quiet', width = 132) { return svg(160, 110, EMPTY[kind] ?? EMPTY.quiet, { width, height: Math.round(width * 0.6875), sw: 1.4, cls: 'orn-empty' }); }
/** 빈 화면 한 덩이: 그림과 글 한 줄 (text는 이미 안전한 글이어야 한다) */
export function emptyBlock(kind, text = '') { return `<div class="orn-empty-block">${emptyArt(kind)}${text ? `<p>${text}</p>` : ''}</div>`; }

/* ---------- 양피지·가죽 결 ---------- */
// 되풀이하는 작은 무늬. 필터(feTurbulence)는 폰에서 그리는 값이 비싸서 쓰지 않고, 성긴 점과 실금으로만 그린다.
const TEX = {
  parchment: { size: 96, base: null, dots: 46, dot: ['#000', 0.035, '#fff', 0.04], lines: 5, line: ['#3a2a18', 0.05] },
  leather: { size: 72, base: null, dots: 70, dot: ['#000', 0.09, '#fff', 0.03], lines: 9, line: ['#000', 0.08] },
  dark: { size: 96, base: null, dots: 40, dot: ['#000', 0.12, '#e8dcc6', 0.022], lines: 4, line: ['#e8dcc6', 0.02] },
};
const cache = new Map();
/** 결 무늬의 CSS url(). 바탕색 위에 background-image로 겹쳐 쓴다 */
export function paper(kind = 'dark') {
  if (cache.has(kind)) return cache.get(kind);
  const T = TEX[kind] ?? TEX.dark; const s = T.size; let h = hashStr(kind) || 1; const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  let b = '';
  for (let i = 0; i < T.dots; i++) { const lightDot = rnd() < 0.4; b += `<circle cx="${(rnd() * s).toFixed(1)}" cy="${(rnd() * s).toFixed(1)}" r="${(0.5 + rnd() * 1.3).toFixed(2)}" fill="${lightDot ? T.dot[2] : T.dot[0]}" opacity="${(lightDot ? T.dot[3] : T.dot[1]) * (0.6 + rnd() * 0.8)}"/>`; }
  for (let i = 0; i < T.lines; i++) { const x = rnd() * s, y = rnd() * s, a = rnd() * 6.28, l = 6 + rnd() * 16; b += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${(Math.cos(a) * l * 0.5).toFixed(1)} ${(Math.sin(a) * l * 0.5 + 2).toFixed(1)} ${(Math.cos(a) * l).toFixed(1)} ${(Math.sin(a) * l).toFixed(1)}" stroke="${T.line[0]}" stroke-width=".6" opacity="${T.line[1]}" fill="none"/>`; }
  const out = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${b}</svg>`)}")`;
  cache.set(kind, out); return out;
}

/* ---------- 기본 틀 ---------- */
export const ORNAMENT_CSS = `
.orn{display:inline-block;vertical-align:middle;flex:none;overflow:visible}
.orn-crest{display:block;margin:0 auto;color:var(--brass-dim,#8a6d38);max-width:100%;height:auto}
.orn-div{display:flex;align-items:center;gap:10px;color:var(--brass-dim,#8a6d38);margin:14px 0}
.orn-div::before,.orn-div::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,currentColor)}
.orn-div::after{background:linear-gradient(270deg,transparent,currentColor)}
.orn-div:empty::before{background:linear-gradient(90deg,transparent,currentColor 50%,transparent)}
.orn-div:empty::after{display:none}
.orn-shield{color:var(--brass-dim,#8a6d38);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.5))}
.orn-medal{color:var(--brass-dim,#8a6d38)}
.orn-empty{color:var(--muted,#a89982);opacity:.55}
.orn-empty-block{display:grid;justify-items:center;gap:10px;padding:22px 12px;text-align:center}
.orn-empty-block p{margin:0;color:var(--muted,#a89982);font-size:14px}
${frameCss()}
${frameCss({ selector: '.orn-frame.knot', kind: 'knot', size: 26 })}
${frameCss({ selector: '.orn-frame.leaf', kind: 'leaf', size: 26 })}`;
