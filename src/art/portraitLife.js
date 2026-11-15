// 얼굴에 남는 삶: 그 사람이 살아온 것을 초상에 얹을 재료로 바꾼다.
// - 무슨 옷을 입을 사람인가 (나: 영지·관직·일·갑옷·감옥 / 남: 직업·역할·칭호)
// - 살림 형편 (기운 옷 ↔ 좋은 천)
// - 흉터, 자잘한 흔적, 안대, 지금 다친 곳(붕대·멍·팔걸이)
// - 볕과 바람에 그을린 정도, 고생한 정도
// 규칙은 건드리지 않고 읽기만 한다. 값이 없으면 조용히 넘어간다.
import { hashStr, rngFrom, mixHex, f, clamp, lerp } from './portraitKit.js';

/* ---------- 누구로 그릴까 ---------- */
// 일(WORK id)·역할(role)을 옷차림 이름으로
const ALIAS = {
  shop: 'shopkeeper', trader: 'merchant', cleric: 'priest', clerk: 'guild_clerk', temple_servant: 'acolyte', sea_priest: 'sea_priest', fire_keeper: 'keeper', earth_keeper: 'keeper',
  imperial_soldier: 'soldier', wall_guard: 'soldier', tower_scribe: 'scholar', tower_porter: 'laborer', dwarf_apprentice: 'smith', elf_gardener: 'gardener', fur_trader: 'trapper', artificer: 'artificer',
  senior_knight: 'knight', warrior: 'mercenary', mage: 'hedge_mage', old_sailor: 'sailor', delver: 'delver', island_lord: 'lord', harbor_master: 'official', appraiser: 'official', broker: 'fence',
  recruiter: 'soldier', gatekeeper: 'guard', master: null, father: null, neighbor: null, rival: null, story: null,
};
const PLAIN = new Set(['idle', 'farmer', 'laborer', 'child', undefined, null, '']);
const TITLES = [
  [/황제|여제|국왕|여왕|왕자|공주|대공|공작|후작/, 'royal'], [/백작|자작|남작|영주|성주|섬장|족장/, 'lord'], [/교황|대주교|주교|성흔대장/, 'bishop'], [/심문관/, 'inquisitor'],
  [/수녀|수사|사제|신관/, 'priest'], [/기사단장|장군|대장/, 'knight_captain'], [/기사/, 'knight'], [/용병|전사|투사/, 'mercenary'], [/선장|제독/, 'sea_captain'],
  [/마법사|현자|마탑|마도/, 'court_mage'], [/길드장|상단주/, 'guildmaster'], [/서기|관리|재상|대신|시종/, 'official'], [/모험가/, 'adventurer'],
];

function playerJob(g, p) {
  const life = g.life ?? {};
  if (g.crime?.jailed) return 'prisoner';
  if (g.domain) return 'lord';
  const office = g.court?.office ?? -1;
  if (office >= 0) return office >= 3 ? 'minister' : 'courtier';
  if (g.sea?.pirate) return (g.sea.pirate.rank ?? 0) >= 3 ? 'pirate_lord' : 'pirate';
  if ((g.faith?.rank ?? 0) > 0) return g.faith.rank >= 3 ? 'bishop' : 'priest';
  const jid = life.job?.id;
  if (jid && jid !== 'courtier') return ALIAS[jid] ?? jid;
  if (!PLAIN.has(p.job)) return p.job;
  const circle = g.magic?.certified ?? 0;
  if (circle >= 4) return 'court_mage';
  if (circle >= 2) return 'hedge_mage';
  if (g.sea?.ship) return 'sea_captain';
  const armor = life.gear?.armor ?? 0;
  if (armor >= 6) return 'heavy';
  if (armor >= 2 || (life.stats?.fights ?? 0) >= 8) return 'adventurer';
  if (life.home === 'street') return 'beggar';
  return p.job;
}
function npcJob(p) {
  if (p.role && p.role in ALIAS && ALIAS[p.role] && PLAIN.has(p.job)) return ALIAS[p.role];
  if (p.role && !(p.role in ALIAS) && PLAIN.has(p.job)) return p.role;
  if (p.title) for (const [re, job] of TITLES) if (re.test(p.title)) { if (PLAIN.has(p.job) || job === 'royal' || job === 'inquisitor' || job === 'lord') return job; break; }
  return p.job;
}

/* ---------- 흉터가 생기는 삶 ---------- */
const MARTIAL = {
  old_knight: 0.9, knight: 0.5, knight_captain: 0.7, guard: 0.28, soldier: 0.4, adventurer: 0.55, sword_master: 0.6, gang_boss: 0.7, rat_boss: 0.6, gang_member: 0.5,
  pirate: 0.7, pirate_lord: 0.95, mercenary: 0.75, heavy: 0.6, hunter: 0.25, trapper: 0.3, sea_captain: 0.35, sailor: 0.15, delver: 0.5, smith: 0.14, inquisitor: 0.15, prisoner: 0.4, beggar: 0.2,
};
const PATCH = { pirate_lord: 0.35, pirate: 0.12, old_knight: 0.08, mercenary: 0.06, adventurer: 0.03, gang_boss: 0.05, delver: 0.04 };
// 볕과 바람을 맞는 일
const OUTDOOR = {
  farmer: 0.7, laborer: 0.6, hunter: 0.7, trapper: 0.8, fisher: 0.9, sailor: 0.9, sea_captain: 0.8, pirate: 0.9, pirate_lord: 0.8, adventurer: 0.5, mercenary: 0.6, guard: 0.35, soldier: 0.5,
  miller: 0.2, smith: 0.35, herbalist: 0.4, gardener: 0.5, knight: 0.3, old_knight: 0.45, beggar: 0.8, delver: 0.2, carpenter: 0.3, heavy: 0.4,
};
const FACE_WORD = /눈|뺨|볼|광대|이마|머리|입술|코|턱|(?<![발손])목|얼굴|귀|화상|덴/;
const SEEDED = ['뺨의 칼자국', '이마의 흉터', '턱의 흉터', '눈가의 흉터', '입술의 흉터', '코의 흉터'];

/**
 * 삶의 흔적. age: 몸 나이, stage: 나이대
 * 돌려주는 것: { job, tier(0 빈털터리 ~ 4 부자), scars[], nicks, patch(-1|0|1), wounds{}, weather, hard, key }
 */
export function lifeOf(game, p, age, stage, optScars) {
  const me = !!(p?.isPlayer && game?.player && (game.player.id == null || game.player.id === p.id));
  const kid = stage === 'baby' || stage === 'child';
  const L = { job: p.job, tier: 2, scars: [], nicks: 0, patch: 0, wounds: {}, weather: 0, hard: 0, key: '' };
  const r = rngFrom(hashStr(`life|${p.id}|${p.name}|${p.lastName}`));
  const rScar = r(), rPatch = r(), rSide = r(), rN = r(), rKind = r();

  if (!kid) L.job = me ? playerJob(game, p) : npcJob(p);
  else if (me && game.crime?.jailed) L.job = 'prisoner';

  // 살림
  const money = me ? (game.player.money ?? 0) + (game.player.familyMoney ?? 0) : p.wealth;
  if (Number.isFinite(money)) L.tier = money < (me ? 8 : 0) ? 0 : money < 40 ? 1 : money < 400 ? 2 : money < 2500 ? 3 : 4;
  if (me && game.life?.home === 'street') L.tier = Math.min(L.tier, 0);
  if (me && game.estate?.bankrupt) L.tier = Math.min(L.tier, 1);

  // 흉터
  let named = optScars ?? (me ? game.player.scars : p.scars) ?? [];
  if (!Array.isArray(named)) named = [];
  const face = named.filter((s) => FACE_WORD.test(String(s)));
  const body = named.length - face.length;
  L.scars = face.slice(0, 4);
  L.nicks = Math.min(4, Math.floor(body / 2));
  if (!me && !kid) {
    const lived = clamp((age - 17) / 26);
    const risk = (MARTIAL[L.job] ?? 0) * lived;
    if (rScar < risk) {
      const n = 1 + (rN < risk * 0.5 ? 1 : 0) + (rN < risk * 0.18 ? 1 : 0);
      const start = Math.floor(rKind * SEEDED.length);
      for (let i = 0; i < n && L.scars.length < 3; i++) L.scars.push(SEEDED[(start + i * 2) % SEEDED.length]);
      L.nicks = Math.max(L.nicks, rN < 0.5 ? 1 : 2);
    } else if (rScar < risk * 1.8) L.nicks = Math.max(L.nicks, 1);
    if (L.job === 'smith' && rScar < 0.2 * lived && !L.scars.length) L.scars.push('화상 자국');
    if (rPatch < (PATCH[L.job] ?? 0) * lived) L.patch = rSide < 0.5 ? -1 : 1;
    const hist = p.history;
    if (Array.isArray(hist) && L.scars.length < 3 && hist.some((h) => /흉터|크게 다쳤|불구|한쪽 눈을 잃/.test(String(h?.text ?? '')))) {
      if (hist.some((h) => /한쪽 눈을 잃/.test(String(h?.text ?? '')))) L.patch ||= rSide < 0.5 ? -1 : 1;
      else L.scars.push(SEEDED[Math.floor(rKind * SEEDED.length)]);
    }
  }
  if (me && named.some((s) => /잃은 눈|눈을 잃/.test(String(s)))) L.patch = rSide < 0.5 ? -1 : 1;

  // 지금 다친 곳 (나만)
  if (me) {
    for (const inj of game.player.injuries ?? []) {
      const t = String(inj?.name ?? '');
      if (/머리|이마|두개/.test(t)) L.wounds.head = 1;
      if (/눈/.test(t)) L.wounds.eye = 1;
      if (/맞은|멍|곤봉|주먹|심문소/.test(t)) L.wounds.bruise = 1;
      if (/팔|어깨|손|손가락|쇄골/.test(t)) L.wounds.arm = 1;
      if (/(?<![발손])목|가슴|갈비|옆구리|등에|등의/.test(t)) L.wounds.chest = 1;
      if (/입술|턱|이빨/.test(t)) L.wounds.lip = 1;
      if (/열병|의 열|역병|독|기침/.test(t)) L.wounds.fever = 1;
      if (inj?.mortal) L.wounds.grave = 1;
    }
  }

  // 그을림과 고생
  if (!kid) L.weather = clamp((OUTDOOR[L.job] ?? 0.1) * clamp((age - 15) / 28));
  let hard = L.tier === 0 ? 0.5 : L.tier === 1 ? 0.22 : 0;
  const health = me ? null : p.health;
  if (Number.isFinite(health) && health < 55) hard += (55 - health) / 70;
  if ((game?.world?.famine || game?.world?.plague) && L.tier <= 1) hard += 0.2;
  if (L.job === 'prisoner' || L.job === 'beggar') hard += 0.3;
  if (me) hard += clamp(((game.player.stress ?? 0) - 60) / 120, 0, 0.25);
  L.hard = stage === 'baby' ? 0 : clamp(hard * (kid ? 0.6 : 1));

  const w = L.wounds;
  L.key = `${L.job}|${L.tier}|${L.scars.join(',')}|${L.nicks}|${L.patch}|${Object.keys(w).join('')}|${Math.round(L.weather * 4)}|${Math.round(L.hard * 4)}`;
  return L;
}

/* ---------- 그리기: 자잘한 흔적, 멍, 붕대, 안대 ---------- */
// m: 얼굴 치수 { cx, cy, hw, hh, top, chin, eyeY, eyeGap, ew, browY, noseBot, my, mw, nw }
// 돌려주는 것: { skin: 얼굴 살 위(머리카락 아래), over: 머리카락 위, chest: 옷 위 }
export function drawLifeMarks(L, key, m, skin, uid, body) {
  const out = { skin: '', over: '', chest: '' };
  const r = rngFrom(hashStr('mark' + key));
  const pale = mixHex(skin, '#f6e4d8', 0.5), red = mixHex(skin, '#7a3a30', 0.5), dk = mixHex(skin, '#3a1c14', 0.6);
  const side = r() < 0.5 ? -1 : 1;

  // 자잘한 흔적: 큰 흉터는 아니어도 험하게 산 얼굴
  const kinds = ['brow', 'cheek', 'nose', 'chin'];
  const start = Math.floor(r() * kinds.length);
  for (let i = 0; i < L.nicks; i++) {
    const k = kinds[(start + i) % kinds.length]; const s = i % 2 ? -side : side;
    if (k === 'brow') { // 눈썹이 끊긴 자리
      const x = m.cx + s * (m.eyeGap + m.ew * 0.45), y = m.browY;
      out.skin += `<path d="M${f(x - s * 0.5)} ${f(y - 1.7)} L${f(x + s * 0.7)} ${f(y + 1.6)}" stroke="${skin}" stroke-width="0.95" stroke-linecap="round"/><path d="M${f(x - s * 0.5)} ${f(y - 1.7)} L${f(x + s * 0.7)} ${f(y + 1.6)}" stroke="${pale}" stroke-width="0.3" stroke-linecap="round" opacity="0.8"/>`;
    } else if (k === 'cheek') {
      const x = m.cx + s * m.hw * 0.6, y = m.eyeY + m.hh * 0.34;
      out.skin += `<path d="M${f(x)} ${f(y)} l${f(-s * 2.6)} ${f(2.2)}" stroke="${red}" stroke-width="0.6" stroke-linecap="round" opacity="0.6"/><path d="M${f(x)} ${f(y)} l${f(-s * 2.6)} ${f(2.2)}" stroke="${pale}" stroke-width="0.28" stroke-linecap="round" opacity="0.85"/>`;
    } else if (k === 'nose') { // 한 번 부러졌던 콧대
      const y = lerp(m.eyeY, m.noseBot, 0.42);
      out.skin += `<path d="M${f(m.cx - 0.9)} ${f(y - 1.1)} q${f(side * 1.7)} 1.1 ${f(side * 0.4)} 2.5" fill="none" stroke="${dk}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/><path d="M${f(m.cx - 1.6)} ${f(y + 0.2)} l3.2 0.5" stroke="${pale}" stroke-width="0.3" opacity="0.6"/>`;
    } else {
      const x = m.cx + s * m.hw * 0.2, y = m.chin - m.hh * 0.16;
      out.skin += `<path d="M${f(x)} ${f(y)} l${f(s * 1.6)} ${f(2)}" stroke="${red}" stroke-width="0.55" stroke-linecap="round" opacity="0.55"/><path d="M${f(x)} ${f(y)} l${f(s * 1.6)} ${f(2)}" stroke="${pale}" stroke-width="0.26" stroke-linecap="round" opacity="0.85"/>`;
    }
  }

  const w = L.wounds;
  // 멍: 눈가와 광대
  if (w.bruise || w.eye) {
    const s = side, x = m.cx + s * m.eyeGap, y = m.eyeY;
    out.skin += `<g clip-path="url(#${uid}h)"><ellipse cx="${f(x + s * 1)}" cy="${f(y + m.ew * 0.5)}" rx="${f(m.ew * 1.55)}" ry="${f(m.ew * 1.15)}" fill="#4a2a4a" opacity="0.34"/><ellipse cx="${f(x + s * 2)}" cy="${f(y + m.ew * 1.2)}" rx="${f(m.ew * 1.3)}" ry="${f(m.ew * 0.7)}" fill="#6a5a2a" opacity="0.22"/>${w.bruise ? `<ellipse cx="${f(m.cx - s * m.hw * 0.5)}" cy="${f(m.cy + m.hh * 0.5)}" rx="${f(m.hw * 0.2)}" ry="${f(m.hh * 0.1)}" fill="#4a2a4a" opacity="0.22"/>` : ''}</g>`;
  }
  // 터진 입술
  if (w.lip || w.bruise) out.skin += `<path d="M${f(m.cx + side * m.mw * 0.4)} ${f(m.my - 0.9)} l${f(side * 0.5)} 2.4" stroke="#6a1f1a" stroke-width="0.7" stroke-linecap="round" opacity="0.8"/>`;
  // 열: 이마의 땀
  if (w.fever) out.skin += `<g fill="#f4efe4" opacity="0.5"><ellipse cx="${f(m.cx - m.hw * 0.4)}" cy="${f(m.top + m.hh * 0.5)}" rx="0.45" ry="0.7"/><ellipse cx="${f(m.cx + m.hw * 0.2)}" cy="${f(m.top + m.hh * 0.42)}" rx="0.4" ry="0.6"/><ellipse cx="${f(m.cx + m.hw * 0.62)}" cy="${f(m.eyeY - m.hh * 0.05)}" rx="0.4" ry="0.65"/></g>`;

  const linen = '#d6ccb6', linenSh = '#a89c84', ink = '#1c130d';
  // 머리 붕대: 이마를 두른 천, 한쪽에 배어 나온 피
  if (w.head || w.grave) {
    const y = m.top + m.hh * 0.42, hwid = m.hw * 1.02;
    out.over += `<g><path d="M${f(m.cx - hwid)} ${f(y + 1.8)} Q${m.cx} ${f(y - 3.6)} ${f(m.cx + hwid)} ${f(y + 1.8)} L${f(m.cx + hwid)} ${f(y + 6.4)} Q${m.cx} ${f(y + 1)} ${f(m.cx - hwid)} ${f(y + 6.4)}Z" fill="${linen}" stroke="${ink}" stroke-width="0.5" stroke-linejoin="round"/>
      <path d="M${f(m.cx - hwid * 0.9)} ${f(y + 3.6)} Q${m.cx} ${f(y - 1.6)} ${f(m.cx + hwid * 0.9)} ${f(y + 3.4)}" fill="none" stroke="${linenSh}" stroke-width="0.4" opacity="0.8"/>
      <path d="M${f(m.cx + hwid * 0.2)} ${f(y - 1.4)} L${f(m.cx + hwid * 0.42)} ${f(y + 4.2)}" stroke="${linenSh}" stroke-width="0.4" opacity="0.7"/>
      <ellipse cx="${f(m.cx + side * m.hw * 0.5)}" cy="${f(y + 2.4)}" rx="2.3" ry="1.5" fill="#7a2620" opacity="0.6"/><ellipse cx="${f(m.cx + side * m.hw * 0.5)}" cy="${f(y + 2.4)}" rx="1.1" ry="0.7" fill="#4a1410" opacity="0.6"/></g>`;
  }
  // 안대: 잃은 눈
  if (L.patch) {
    const s = L.patch, x = m.cx + s * m.eyeGap, y = m.eyeY, e = m.ew;
    out.over += `<path d="M${f(m.cx - s * m.hw * 0.98)} ${f(m.top + m.hh * 0.5)} L${f(x - s * e * 0.2)} ${f(y - e * 1.0)} M${f(x + s * e * 1.2)} ${f(y - e * 0.3)} L${f(m.cx + s * m.hw * 1.0)} ${f(y + m.hh * 0.02)}" stroke="#15100c" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M${f(x - s * e * 1.25)} ${f(y - e * 0.95)} Q${f(x)} ${f(y - e * 1.5)} ${f(x + s * e * 1.35)} ${f(y - e * 0.7)} Q${f(x + s * e * 1.3)} ${f(y + e * 1.0)} ${f(x)} ${f(y + e * 1.45)} Q${f(x - s * e * 1.3)} ${f(y + e * 0.9)} ${f(x - s * e * 1.25)} ${f(y - e * 0.95)}Z" fill="#1c1612" stroke="#0c0806" stroke-width="0.5" stroke-linejoin="round"/>
      <path d="M${f(x - s * e * 0.8)} ${f(y - e * 0.7)} Q${f(x)} ${f(y - e * 1.1)} ${f(x + s * e * 0.9)} ${f(y - e * 0.5)}" fill="none" stroke="#4a3e34" stroke-width="0.4" opacity="0.8"/>`;
  }
  // 팔걸이 천: 어깨에서 가슴을 가로질러
  if (w.arm && body) {
    const { cx, sw, sy, baseY } = body; const s = side;
    out.chest += `<path d="M${f(cx + s * (sw - 6))} ${f(sy)} L${f(cx - s * sw * 0.55)} 104 L${f(cx - s * sw * 0.1)} 104 L${f(cx + s * (sw - 1))} ${f(sy + 5)}Z" fill="${linen}" stroke="${ink}" stroke-width="0.5" stroke-linejoin="round"/><path d="M${f(cx + s * (sw - 4))} ${f(sy + 3)} L${f(cx - s * sw * 0.36)} 104" stroke="${linenSh}" stroke-width="0.45" opacity="0.8"/>`;
    void baseY;
  }
  // 가슴·목 붕대: 깃 사이로 보이는 감은 천
  if ((w.chest || w.grave) && body) {
    const { cx, nw, baseY } = body;
    out.chest += `<path d="M${f(cx - nw - 1)} ${f(baseY - 1.4)} Q${cx} ${f(baseY + 3.6)} ${f(cx + nw + 1)} ${f(baseY - 1.4)} L${f(cx + nw + 1.2)} ${f(baseY + 1.6)} Q${cx} ${f(baseY + 6.6)} ${f(cx - nw - 1.2)} ${f(baseY + 1.6)}Z" fill="${linen}" stroke="${ink}" stroke-width="0.45"/><path d="M${f(cx - nw)} ${f(baseY + 0.4)} Q${cx} ${f(baseY + 5.2)} ${f(cx + nw)} ${f(baseY + 0.2)}" fill="none" stroke="${linenSh}" stroke-width="0.35"/>`;
  }
  return out;
}
