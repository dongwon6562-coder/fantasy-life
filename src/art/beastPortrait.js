// 짐승 초상: 사람 초상과 같은 둥근 틀에 그린다 (SVG 글자열. 브라우저가 아니어도 된다).
//   beastPortrait({ kind, sub, id, name, age, old, wild }, { size })
//   kind: 'dog' 개 | 'horse' 말 | 'hawk' 매 | 'familiar' 사역마 | 'monster' 마수
//   sub : familiar → 'cat' | 'owl' | 'raven',  monster → 'direwolf' | 'drake' | 'griffin'  (없으면 id로 정해진다)
//   id  : 같은 짐승은 늘 같은 털빛·무늬가 나온다.  old(또는 age가 많음): 주둥이가 센다.  wild: 목줄·굴레 없음
// 다른 갈래가 종류 이름을 다르게 써도 beastKind()가 알아본다 (hound, warhorse, falcon, wolf …).
import { mixh, dark, light } from './sceneKit.js';

const hashS = (s) => { let h = 2166136261; const t = String(s ?? ''); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed, n) => { const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
const pick = (seed, n, arr) => arr[Math.floor(rnd(seed, n) * arr.length) % arr.length];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const KIND_WORDS = [
  ['familiar', /familiar|사역마|cat|고양이|owl|부엉|올빼미|raven|crow|까마귀/i],
  ['monster', /monster|마수|direwolf|dire|warg|drake|wyvern|와이번|griffin|그리핀|beast_|마물/i],
  ['hawk', /hawk|falcon|eagle|매|송골|수리/i],
  ['horse', /horse|pony|steed|mare|stallion|말|군마|조랑/i],
  ['dog', /dog|hound|개|사냥개|mastiff|wolfhound/i],
];
/** 아무 이름이나 받아 다섯 가지 가운데 하나로 */
export function beastKind(k) { const s = String(k ?? ''); for (const [id, re] of KIND_WORDS) if (re.test(s)) return id; return 'dog'; }
const subOf = (kind, raw, seed) => {
  const s = String(raw ?? '');
  if (kind === 'familiar') return /owl|부엉|올빼미/i.test(s) ? 'owl' : /raven|crow|까마귀/i.test(s) ? 'raven' : /cat|고양이/i.test(s) ? 'cat' : pick(seed, 9, ['cat', 'owl', 'raven']);
  if (kind === 'monster') return /drake|wyvern|와이번|용/i.test(s) ? 'drake' : /griffin|그리핀/i.test(s) ? 'griffin' : /wolf|warg|늑대/i.test(s) ? 'direwolf' : pick(seed, 9, ['direwolf', 'drake', 'griffin']);
  return null;
};

/* ---------- 조각 ---------- */
const eye = (x, y, r, iris, o = {}) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${iris}"/>${o.slit ? `<ellipse cx="${x}" cy="${y}" rx="${r * 0.22}" ry="${r * 0.8}" fill="#0a0808"/>` : `<circle cx="${x}" cy="${y}" r="${r * (o.pupil ?? 0.55)}" fill="#0a0808"/>`}<circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.24}" fill="#fff" opacity=".85"/>${o.glow ? `<circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="${o.glow}" opacity=".2"/>` : ''}`;
const shade = (d, a = 0.22) => `<path d="${d}" fill="#0a0810" opacity="${a}"/>`;
const lit = (d, a = 0.14) => `<path d="${d}" fill="#fff4dc" opacity="${a}"/>`;

/** 옆모습 갯과: 개와 큰 늑대가 함께 쓴다 */
function canine(seed, o, v) {
  const { coat, wolf, iris } = v, pale = light(coat, wolf ? 0.28 : 0.45), dk = dark(coat, 0.42);
  const pointed = wolf || rnd(seed, 2) < 0.45, blaze = !wolf && rnd(seed, 3) < 0.4, mask = !wolf && rnd(seed, 4) < 0.35, paleMuzzle = wolf || rnd(seed, 6) < 0.6;
  const ruff = wolf ? Array.from({ length: 8 }, (_, i) => { const y = 50 + i * 7, x = 70 - i * 1.6; return `<path d="M${x + 8} ${y - 4}L${x - 7 - (i % 2) * 3} ${y + 5}L${x + 9} ${y + 6}Z" fill="${i % 2 ? dk : dark(coat, 0.2)}"/>`; }).join('') : '';
  const ears = pointed
    ? `<path d="M75 27L${wolf ? 83 : 81} ${wolf ? 5 : 9}L86 31Z" fill="${dk}"/><path d="M67 28L${wolf ? 71 : 70} ${wolf ? 3 : 7}L80 28Z" fill="${coat}"/><path d="M69.6 25L71 12L77 26Z" fill="#8a5a54" opacity=".65"/>`
    : `<path d="M69 27Q85 29 86 50Q83 60 76 54Q73 42 67 33Z" fill="${dk}"/><path d="M72 31Q82 34 83 49" fill="none" stroke="${dark(coat, 0.6)}" stroke-width=".7" opacity=".6"/>`;
  const mouth = wolf
    ? `<path d="M29 56.4L52 59Q48 68 35 65Q30 62 29 56.4Z" fill="#2a0c0e"/><path d="M31 56.8L32.4 61.6L34.4 57.2ZM37 57.6L38.2 61.6L40 58ZM43 58.2L44 61.6L45.6 58.6Z" fill="#ece6d8"/><path d="M34 64.4L35.4 60.6L37 64.8ZM40 65L41.2 61.8L42.8 65Z" fill="#d8d0bc"/><path d="M35 65Q46 69 54 62L60 62Q52 72 38 69Q34 68 35 65Z" fill="${dark(coat, 0.15)}"/>`
    : `<path d="M26.6 54.4Q38 56.6 53 57.4" fill="none" stroke="#1c1414" stroke-width="1" stroke-linecap="round"/><path d="M40 56.6Q42 60 46 59" fill="none" stroke="#1c1414" stroke-width=".7" opacity=".6"/>`;
  return `
    <path d="M56 100L100 100L96 56Q89 38 75 32L61 46Q63 66 55 82Z" fill="${coat}"/>${shade('M80 38Q93 48 96 62L100 100L84 100Q90 68 80 38Z', 0.28)}
    <path d="M56 100L70 100Q68 82 60 70Q60 78 55 84Z" fill="${pale}" opacity="${blaze || wolf ? 0.6 : 0.25}"/>
    ${ruff}
    ${o.wild || wolf ? '' : `<path d="M57.4 74Q74 84 97.6 75" fill="none" stroke="#5a3422" stroke-width="4.6"/><path d="M57 72Q74 82 97.4 73" fill="none" stroke="#8a5a38" stroke-width=".7"/><circle cx="62" cy="81.6" r="2.2" fill="none" stroke="#c9a25a" stroke-width="1.1"/>`}
    ${ears}
    <path d="M74 24Q62 24 55 34L50 39L28 45Q23 47 24 52Q26 57 32 57L50 61Q60 66 70 60Q82 52 80 38Q79 28 74 24Z" fill="${coat}"/>
    ${paleMuzzle ? `<path d="M50 40L28 45.6Q23 47 24 52Q26 57 32 57L50 61Q56 56 54 46Z" fill="${pale}" opacity=".85"/>` : ''}
    ${mask ? `<path d="M74 24Q62 24 55 34L50 39L46 44Q56 48 64 44Q72 38 74 24Z" fill="${dk}" opacity=".8"/>` : ''}
    ${blaze ? `<path d="M60 28L30 44L31 46.4L61 32Z" fill="${light(coat, 0.6)}"/>` : ''}
    ${shade('M80 38Q82 52 70 60Q60 66 50 61L32 57Q46 56 58 52Q70 46 74 30Q79 32 80 38Z', 0.2)}${lit('M70 25Q60 26 55 34L50 39L34 43.4L54 40Q62 34 70 25Z', 0.16)}
    ${wolf && rnd(seed, 3) < 0.6 ? '<path d="M62 30L58 48" stroke="#b89a8a" stroke-width="1.1" opacity=".8"/><path d="M59 35l3.4 .8M58 40l3.4 .8" stroke="#b89a8a" stroke-width=".7" opacity=".8"/>' : ''}
    ${o.old ? '<path d="M50 40L28 45.6Q23 47 24 52Q26 57 32 57L50 61Q56 56 54 46Z" fill="#dcd8d0" opacity=".55"/><path d="M50 36Q56 33 62 36" stroke="#dcd8d0" stroke-width="1.6" fill="none" opacity=".6"/>' : ''}
    <path d="M24 47.4Q26 45 29.6 46Q30.6 49.6 28 51.6Q24.6 52 24 47.4Z" fill="#120e10"/><ellipse cx="26.6" cy="47.6" rx="1" ry=".6" fill="#fff" opacity=".35"/>
    ${mouth}
    <path d="M50.6 ${wolf ? 38.6 : 37.4}Q56 ${wolf ? 36 : 34.4} 62 ${wolf ? 35.6 : 37}" fill="none" stroke="${dark(coat, 0.65)}" stroke-width="${wolf ? 2.2 : 1.5}" stroke-linecap="round"/>
    ${wolf ? eye(56, 40.4, 2.5, iris, { pupil: 0.42, glow: iris }) : `<ellipse cx="56" cy="40.2" rx="2.5" ry="2.2" fill="${iris}"/><circle cx="56" cy="40.2" r="1.3" fill="#0a0808"/><circle cx="55.2" cy="39.4" r=".7" fill="#fff" opacity=".8"/>`}`;
}
function dog(seed, o) { return canine(seed, o, { coat: pick(seed, 1, ['#7a5a3a', '#2e2a28', '#8a8478', '#b08a58', '#5a4030', '#c8bca4']), iris: pick(seed, 8, ['#5a3a1c', '#4a2e16', '#6a4a22']) }); }
function direwolf(seed, o) { return canine(seed, o, { wolf: true, coat: pick(seed, 1, ['#3a3a40', '#2a2624', '#5a544e', '#4a3a34']), iris: pick(seed, 2, ['#e8a020', '#d83a2a', '#c8e040']) }); }

function horse(seed, o) {
  const coat = pick(seed, 1, ['#6a3e22', '#1e1a1a', '#a8a49c', '#8a4a26', '#c8a878', '#4a3020']), maneC = coat === '#a8a49c' ? '#d8d4cc' : coat === '#c8a878' ? '#ece0c4' : dark(coat, 0.6), dk = dark(coat, 0.35);
  const blaze = rnd(seed, 3) < 0.5, tack = !o.wild;
  return `
    <path d="M56 100L100 100L94 50Q86 32 71 26L60 40Q63 62 54 80Z" fill="${coat}"/>${shade('M78 34Q92 44 94 60L100 100L84 100Q88 66 78 34Z', 0.28)}
    <path d="M71 21Q85 25 95 50L98 76Q90 54 82 42Q77 33 70 30Z" fill="${maneC}"/><path d="M76 26Q88 36 92 56M73 28Q84 40 86 52" stroke="${dark(maneC, 0.3)}" stroke-width=".8" fill="none"/>
    <path d="M73 25L75 9L80 23Z" fill="${dk}"/><path d="M66 24L64 7L74 20Z" fill="${coat}"/><path d="M66.6 21L65.6 12L71 19Z" fill="#8a6058" opacity=".6"/>
    <path d="M70 21Q60 22 52 32L30 58Q25 64 28 70Q32 76 40 73L52 65Q63 58 70 46Q77 34 70 21Z" fill="${coat}"/>
    ${blaze ? `<path d="M61 25L33 57Q30 61 32 64L37 60L64 29Z" fill="#ece6d8" opacity=".9"/>` : ''}
    ${shade('M70 22Q77 34 70 46Q63 58 52 65L40 73Q50 62 58 50Q66 38 66 26Z', 0.2)}${lit('M62 24L36 54L40 54L64 28Z', 0.14)}
    <circle cx="62" cy="45" r="9.5" fill="#0a0810" opacity=".1"/>
    <path d="M69 21Q60 26 58 36Q64 30 71 28Z" fill="${maneC}"/>
    ${o.old ? '<path d="M30 58Q25 64 28 70Q32 76 40 73L44 70Q36 66 34 58Z" fill="#d8d4cc" opacity=".5"/><ellipse cx="57" cy="32" rx="5" ry="3" fill="#d8d4cc" opacity=".3"/>' : ''}
    <ellipse cx="31.4" cy="65" rx="1.6" ry="2.5" transform="rotate(-24 31.4 65)" fill="#0e0a0a"/><path d="M29.4 70.4Q34 71.6 38.6 69" fill="none" stroke="#1c1414" stroke-width=".9" stroke-linecap="round"/>
    <path d="M52.6 33.4Q56.6 30.6 60.6 33" fill="none" stroke="${dk}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="57" cy="35.6" rx="2.9" ry="2.4" fill="#1a100c"/><circle cx="56" cy="34.8" r=".8" fill="#fff" opacity=".8"/>
    ${tack ? `<g fill="none" stroke="#3a2416" stroke-width="1.5" stroke-linecap="round"><path d="M35 53L46.6 64.6"/><path d="M43.6 59.4L66 28"/><path d="M57.6 30L68.6 33.4"/><path d="M41 63.4Q60 80 92 80" stroke-width="1.1"/></g><circle cx="41.4" cy="61.6" r="2" fill="none" stroke="#b8a070" stroke-width="1"/>` : ''}`;
}

/** 옆모습 새: 매, 까마귀, 그리핀이 함께 쓴다 */
function bird(seed, o, v) {
  const { coat, breast, beak, cere, iris, glow, hooked, big } = v, dk = dark(coat, 0.4);
  const speck = breast ? Array.from({ length: 16 }, (_, i) => { const x = 37 + rnd(seed, 30 + i) * 18, y = 66 + rnd(seed, 60 + i) * 30; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l1.4 2.6l1.4 -2.6" fill="none" stroke="${dk}" stroke-width=".8" opacity=".7"/>`; }).join('') : '';
  const bk = hooked
    ? `<path d="M39.6 ${big ? 35 : 36.4}Q${big ? 26 : 30} ${big ? 35 : 37} ${big ? 23 : 27} ${big ? 48 : 46.4}Q${big ? 27 : 30} ${big ? 50 : 47.6} ${big ? 31 : 33} 46Q36 47.6 40.4 46Z" fill="${beak}"/><path d="M40 36Q35.6 36 34.6 40.4L40 42Z" fill="${cere}"/><path d="M30 44Q34 45 39 44.4" fill="none" stroke="#0a0808" stroke-width=".6" opacity=".6"/>`
    : `<path d="M40 35Q28 37 22 44Q30 45.6 40.4 45Z" fill="${beak}"/><path d="M24 43.6Q32 43 40 42.6" fill="none" stroke="#000" stroke-width=".6" opacity=".5"/>`;
  return `
    <path d="M32 100Q29 70 44 56L64 52Q84 64 86 100Z" fill="${coat}"/>
    ${breast ? `<path d="M34 100Q33 76 45 61Q57 70 59 100Z" fill="${breast}"/>${speck}` : ''}
    <path d="M61 55Q85 66 89 100L62 100Q67 78 61 55Z" fill="${dk}"/><path d="M66 64Q78 76 80 96M70 62Q82 72 85 90M64 72Q72 84 72 98" fill="none" stroke="${light(coat, 0.2)}" stroke-width=".8" opacity=".5"/>
    <circle cx="52" cy="40" r="${big ? 16.5 : 15}" fill="${coat}"/>${shade('M54 25Q68 28 67 42Q66 54 56 56Q62 46 60 36Q58 28 54 25Z', 0.24)}${lit('M48 26Q40 28 38 36Q42 30 50 28Z', 0.2)}
    ${v.tufts ? `<path d="M58 28L66 12L64 30Z" fill="${coat}"/><path d="M62 30L72 17L67 33Z" fill="${dk}"/>` : ''}
    ${v.malar ? `<path d="M44 42Q45 51 50 56Q49 48 47 42Z" fill="${dk}" opacity=".7"/>` : ''}
    ${o.old ? '<path d="M40 30Q46 24 54 26Q46 28 42 34Z" fill="#d8d4cc" opacity=".5"/>' : ''}
    ${bk}
    <path d="M39.6 33.4Q46 29.4 54 33" fill="none" stroke="${dark(coat, 0.6)}" stroke-width="2" stroke-linecap="round"/>
    ${eye(46, 37.4, 3.3, iris, { pupil: 0.5, glow })}
    ${v.jess && !o.wild ? '<path d="M40 100L42 92M46 100L47 93" stroke="#5a3422" stroke-width="1.6"/>' : ''}`;
}

function cat(seed, o, glow) {
  const coat = pick(seed, 1, ['#1c1a22', '#22201e', '#3a3640', '#2a2430']), dk = dark(coat, 0.4);
  return `
    <path d="M30 100Q32 76 41 67L59 67Q68 76 70 100Z" fill="${coat}"/>${shade('M52 67L59 67Q68 76 70 100L56 100Z', 0.3)}
    <path d="M33 38L29 13L47 28Z" fill="${coat}"/><path d="M67 38L71 13L53 28Z" fill="${dk}"/><path d="M34 33L32.6 19L42.6 28Z" fill="#7a4a5a" opacity=".7"/><path d="M66 33L67.4 19L57.4 28Z" fill="#5a3444" opacity=".7"/>
    <ellipse cx="50" cy="46" rx="19" ry="17.5" fill="${coat}"/>${shade('M52 29Q69 31 69 47Q67 60 54 63Q61 52 59 41Q58 33 52 29Z', 0.26)}${lit('M47 30Q33 33 32 46Q35 36 41 32Z', 0.16)}
    ${o.old ? '<ellipse cx="50" cy="55" rx="8" ry="5.6" fill="#d8d4cc" opacity=".35"/>' : ''}
    <path d="M36.6 43.4Q41.6 41 46 44.6M63.4 43.4Q58.4 41 54 44.6" fill="none" stroke="#0a0810" stroke-width="1.4" stroke-linecap="round"/>${eye(41.6, 45.6, 2.8, glow, { slit: true, glow })}${eye(58.4, 45.6, 2.8, glow, { slit: true, glow })}
    <path d="M48.4 52.4L51.6 52.4L50 54.6Z" fill="#8a5a66"/><path d="M50 54.6V56.6M50 56.6Q47 59 44.6 57M50 56.6Q53 59 55.4 57" fill="none" stroke="#0a0808" stroke-width=".8" stroke-linecap="round"/>
    <g stroke="#d8d4e0" stroke-width=".45" opacity=".7"><path d="M44 55L28 52M44 56.6L28 58M56 55L72 52M56 56.6L72 58"/></g>`;
}

function owl(seed, o, glow) {
  const coat = pick(seed, 1, ['#6a5440', '#8a8478', '#5a4a3c', '#d8d0c0']), pale = light(coat, 0.45), dk = dark(coat, 0.4);
  const speck = Array.from({ length: 18 }, (_, i) => { const x = 36 + rnd(seed, 30 + i) * 28, y = 70 + rnd(seed, 60 + i) * 26; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l1.5 2.8l1.5 -2.8" fill="none" stroke="${dk}" stroke-width=".8" opacity=".7"/>`; }).join('');
  return `
    <path d="M26 100Q26 70 38 60L62 60Q74 70 74 100Z" fill="${coat}"/><path d="M34 100Q34 78 50 68Q66 78 66 100Z" fill="${pale}"/>${speck}
    <path d="M32 30L27 12L44 24Z" fill="${dk}"/><path d="M68 30L73 12L56 24Z" fill="${dark(coat, 0.5)}"/>
    <ellipse cx="50" cy="43" rx="22" ry="20" fill="${coat}"/>${shade('M54 24Q72 28 72 44Q70 58 56 62Q64 50 62 38Q60 28 54 24Z', 0.22)}
    <circle cx="40.4" cy="43" r="10.4" fill="${light(coat, 0.22)}"/><circle cx="59.6" cy="43" r="10.4" fill="${light(coat, 0.12)}"/><circle cx="40.4" cy="43" r="10.4" fill="none" stroke="${dk}" stroke-width=".6" opacity=".5"/><circle cx="59.6" cy="43" r="10.4" fill="none" stroke="${dk}" stroke-width=".6" opacity=".5"/>
    <path d="M30 37Q40 30 49 39M70 37Q60 30 51 39" fill="none" stroke="${dk}" stroke-width="1.8" stroke-linecap="round"/>
    ${o.old ? '<path d="M40 26Q50 22 60 26Q50 28 40 26Z" fill="#e8e4dc" opacity=".6"/>' : ''}
    ${eye(40.4, 43.6, 3.7, glow, { pupil: 0.56, glow })}${eye(59.6, 43.6, 3.7, glow, { pupil: 0.56, glow })}
    <path d="M47.6 48L52.4 48L50 56Z" fill="#3a3430"/><path d="M50 48V55" stroke="#000" stroke-width=".5" opacity=".4"/>`;
}

function drake(seed, o) {
  const coat = pick(seed, 1, ['#3e5a3a', '#6a2e26', '#4a4a52', '#2e4a5a', '#5a4a2a']), belly = light(coat, 0.4), dk = dark(coat, 0.45), iris = pick(seed, 2, ['#e8c020', '#e86a20', '#a8e040']);
  const scales = Array.from({ length: 26 }, (_, i) => { const x = 62 + rnd(seed, 20 + i) * 30, y = 44 + rnd(seed, 50 + i) * 54; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q2.4 3 4.8 0" fill="none" stroke="${dk}" stroke-width=".8" opacity=".6"/>`; }).join('');
  const spines = Array.from({ length: 7 }, (_, i) => { const t = i / 6, x = 76 + t * 20, y = 26 + t * 50; return `<path d="M${x - 3} ${y + 3}L${x + 5} ${y - 6}L${x + 3} ${y + 6}Z" fill="${dk}"/>`; }).join('');
  return `
    ${spines}
    <path d="M56 100L100 100L96 60Q90 36 74 28L62 42Q64 64 56 82Z" fill="${coat}"/><path d="M56 100L72 100Q70 76 62 56Q62 70 56 82Z" fill="${belly}" opacity=".8"/>${scales}
    ${shade('M82 36Q94 48 96 64L100 100L86 100Q90 68 82 36Z', 0.26)}
    <path d="M70 26L88 8L80 28Z" fill="#d8ccb0"/><path d="M66 23L78 4L74 24Z" fill="#b8ac90"/>
    <path d="M72 22Q62 20 52 30L26 50Q20 55 22 61Q24 64 30 63L36 66Q30 70 32 75Q38 79 46 74L58 66Q68 58 74 46Q79 33 72 22Z" fill="${coat}"/>
    <path d="M30 63L58 56Q52 64 46 68L36 66Z" fill="#2a0e10"/>
    <path d="M32 62.4L33.6 66.4L35.4 61.8ZM38 61.4L39.6 65.6L41.4 60.8ZM44 60.2L45.6 64.6L47.4 59.6ZM50 58.8L51.4 63L53 58.2Z" fill="#ece6d8"/>
    <path d="M36 66.4L37.6 62.8L39.6 66.6ZM42 67L43.6 63.6L45.4 66.6Z" fill="#d8d0bc"/>
    ${shade('M72 22Q79 33 74 46Q68 58 58 66L52 62Q62 52 66 42Q70 32 68 24Z', 0.22)}${lit('M62 24L34 46L40 46L64 28Z', 0.14)}
    <path d="M26 50Q30 46 36 48" fill="none" stroke="${dk}" stroke-width="1"/><ellipse cx="27.6" cy="54.6" rx="1.4" ry="2" transform="rotate(-30 27.6 54.6)" fill="#0e0a0a"/>
    ${o.old ? '<path d="M26 50Q20 55 22 61L30 60Q28 54 34 48Z" fill="#d8d4cc" opacity=".35"/>' : ''}
    <path d="M50 34Q57 29 64 33" fill="none" stroke="${dk}" stroke-width="2.4" stroke-linecap="round"/>
    ${eye(57, 37, 3.2, iris, { slit: true, glow: iris })}`;
}

/* ---------- 틀 ---------- */
const BG = { dog: ['#5a5648', '#33322a', '#1e1c16'], horse: ['#58584e', '#30342e', '#1c1c18'], hawk: ['#56606a', '#2c343c', '#181c20'], familiar: ['#4a4666', '#26243c', '#14121e'], monster: ['#5a403c', '#30201e', '#180e0e'] };
/** 짐승 초상 SVG */
export function beastPortrait(b = {}, opt = {}) {
  const size = opt.size ?? 112, kind = beastKind(b.kind ?? b.species ?? b.type), seed = (hashS(b.id ?? b.name ?? kind) % 9973) + 1;
  const sub = subOf(kind, b.sub ?? b.species ?? b.kind, seed);
  const o = { old: !!b.old || (b.age != null && b.age >= ({ dog: 10, horse: 20, hawk: 12 }[kind] ?? 999)), wild: !!b.wild };
  const glow = pick(seed, 7, ['#8fc0ff', '#b89aff', '#7fe0c0', '#ffd070']);
  let body = '';
  if (kind === 'dog') body = dog(seed, o);
  else if (kind === 'horse') body = horse(seed, o);
  else if (kind === 'hawk') body = bird(seed, o, { coat: pick(seed, 1, ['#6a5240', '#5a4a44', '#4a4a50', '#7a5a3a']), breast: '#e0d4b8', beak: '#34343a', cere: '#d8b040', iris: pick(seed, 2, ['#e8b020', '#d88a20', '#c8a060']), hooked: true, malar: true, jess: true });
  else if (kind === 'familiar') body = sub === 'owl' ? owl(seed, o, glow) : sub === 'raven' ? bird(seed, o, { coat: '#1c1c26', breast: null, beak: '#101014', cere: '#101014', iris: glow, glow, hooked: false }) : cat(seed, o, glow);
  else body = sub === 'drake' ? drake(seed, o) : sub === 'griffin' ? bird(seed, o, { coat: pick(seed, 1, ['#b8904a', '#8a6a3a', '#d8c8a0']), breast: '#c8a060', beak: '#c8a040', cere: '#e8c860', iris: '#e86a20', glow: '#e86a20', hooked: true, big: true, tufts: true }) : direwolf(seed, o);
  const id = `b${seed.toString(36)}${kind[0]}${size}`, [c0, c1, c2] = BG[kind];
  // 사역마 둘레의 마력: 흐린 원과 떠도는 빛
  const aura = kind === 'familiar' ? `<circle cx="50" cy="48" r="34" fill="none" stroke="${glow}" stroke-width=".7" stroke-dasharray="2 5" opacity=".45"/>${Array.from({ length: 7 }, (_, i) => `<circle cx="${(14 + rnd(seed, 80 + i) * 72).toFixed(1)}" cy="${(12 + rnd(seed, 90 + i) * 60).toFixed(1)}" r="${(0.7 + rnd(seed, 70 + i) * 1.1).toFixed(1)}" fill="${glow}" opacity=".8"/>`).join('')}` : '';
  const label = b.name ? `${esc(b.name)} 초상` : '짐승 초상';
  return `<svg class="portrait beast" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${label}"><defs>
    <radialGradient id="${id}g" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${c0}"/><stop offset="0.55" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
    <linearGradient id="${id}l" x1="0" x2="1" y1="0.1" y2="0.4"><stop offset="0" stop-color="#fff0d0" stop-opacity="0.16"/><stop offset="0.4" stop-color="#fff0d0" stop-opacity="0"/><stop offset="1" stop-color="#06040a" stop-opacity="0.34"/></linearGradient>
    <clipPath id="${id}c"><circle cx="50" cy="50" r="47.4"/></clipPath></defs>
    <g clip-path="url(#${id}c)"><rect width="100" height="100" fill="url(#${id}g)"/>${aura}${body}<rect width="100" height="100" fill="url(#${id}l)"/></g>
    <circle cx="50" cy="50" r="48" fill="none" stroke="#0e0a07" stroke-width="2.4" opacity="0.55"/><circle cx="50" cy="50" r="48" fill="none" stroke="#8a6d38" stroke-width="1.5"/><circle cx="50" cy="50" r="46.2" fill="none" stroke="#8a6d38" stroke-width="0.35" opacity="0.6"/></svg>`;
}
