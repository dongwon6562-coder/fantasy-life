// 42단계 마법 깊게 (도우미스레드3): 계열 고르기(몸에 맞는 계열은 종족·타고난 결에 따라), 영창 줄이기 수련과 무영창,
// 마력 폭주와 대가(탈진·흉터·마력 줄어듦), 내 주문 짓기(이름 붙이기·남에게 가르치기·집안 마도서로 대를 넘음), 서클이 오를 때 장면, 이명.
// 장면·사건·행동 앞머리 sp_. 서클 자체는 game.js circleOf가 정한다(고서클은 여전히 드물고, 7서클 주문은 없다).
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { circleOf, gainSkill, gainStat, playerAge } from '../game.js';
import { EVENTS, age, onRoad, here, stress } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note, chron } from '../adventure/core.js';
import { POWER_BONUS } from '../adventure/combat.js';
import { J } from '../narrative/text.js';
import { deed } from '../repute/index.js';
import { playerRace } from '../races/index.js';
import { makeRng } from '../rng.js';
import { magicState, SCHOOLS, SCHOOL_IDS, schoolName, USE_NAME, madeSpells, strainUp } from './spells.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const spRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 421) ^ Math.imul(mi(g) * 173 + salt + 61, 2654435761)) | 0 });
const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const mage = (g) => !!g.player.manaAwakened && circleOf(g) >= 1 && !busy(g);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
// 「이름」 뒤 조사: qj('잿빛 꽃', '을/를') → 「잿빛 꽃」을
const qj = (n, pair) => `「${n}」${J(n, pair).slice(n.length)}`;
// 사람 이름 뒤 '이라/라'
const ira = (n) => (J(n, '이/가').endsWith('이') ? '이라' : '라');
const mine = (g) => (g.magic?.made ?? []).filter((x) => x.mine && x.learned);

/* ---------- 몸에 맞는 계열 ---------- */
const RACE_AFF = { elf: ['life', 'wind'], dwarf: ['earth', 'fire'], beast: ['wind', 'life'], half_elf: ['life', 'water'], demon: ['shadow', 'fire'], half_demon: ['shadow', 'mind'] };
const STAT_AFF = { str: 'earth', agi: 'wind', int: 'mind', wil: 'fire', cha: 'light', sen: 'water' };
/** 몸에 잘 맞는 계열 둘 [{ id, why }] */
export function affinityOf(g) {
  const sc = Object.fromEntries(SCHOOL_IDS.map((k) => [k, 0])), why = {};
  for (const k of RACE_AFF[playerRace(g)] ?? []) { sc[k] += 2; why[k] ??= '핏줄'; }
  const st = Object.entries(g.player.stats ?? {}).filter(([k]) => STAT_AFF[k]).sort((a, b) => b[1] - a[1]);
  if (st[0]) { sc[STAT_AFF[st[0][0]]] += 1.5; why[STAT_AFF[st[0][0]]] ??= '타고난 결'; }
  if (st[1]) { sc[STAT_AFF[st[1][0]]] += 1; why[STAT_AFF[st[1][0]]] ??= '타고난 결'; }
  if (g.heredity?.gift === 'faith') { sc.light += 1; why.light ??= '깊은 믿음'; }
  return SCHOOL_IDS.filter((k) => sc[k] > 0).sort((a, b) => sc[b] - sc[a]).slice(0, 2).map((id) => ({ id, why: why[id] }));
}

const SCHOOL_FEEL = {
  fire: '손바닥이 뜨거워지고 심장이 빨리 뛴다', water: '숨이 깊어지고 귓가에 물소리가 난다', wind: '몸이 가벼워지고 머리카락이 들린다', earth: '발바닥이 땅에 붙는 듯 묵직하다',
  light: '눈꺼풀 안쪽이 하얗게 밝아진다', shadow: '그늘이 내 쪽으로 기우는 것 같다', life: '손끝에서 풀 냄새가 난다', mind: '둘레 사람들의 숨소리가 하나하나 들린다',
};
ACTIONS.push({
  id: 'sp_school',
  name: '계열 정하기',
  icon: 'rune',
  desc: '불·물·바람·흙·빛·그림자·생명·정신 가운데 평생 파고들 계열 하나를 정한다. 몸에 맞는 계열이면 주문이 빨리 는다.',
  available: (g) => mage(g) && playerAge(g) >= 12 && !g.magic?.school && !onRoad(g) && !sceneQueued(g, 'sp_school'),
  run(g) { queueScene(g, 'sp_school'); return '촛불을 하나 켜고 앉아 마력을 손바닥에 모았다.'; },
});
defineScene('sp_school', {
  need: (g) => !g.magic?.school,
  title: () => '여덟 갈래',
  text: (g) => {
    const aff = affinityOf(g);
    return `마력을 천천히 여덟 갈래로 흘려 보았다. 대부분은 물 위에 기름처럼 겉돈다. ${aff.length ? aff.map((a) => `${schoolName(a.id)} 쪽으로 흘리면 ${SCHOOL_FEEL[a.id]}.`).join(' ') : '어느 쪽도 딱히 당기지 않는다. 고르는 대로 길이 될 것이다.'} 한번 정하면 평생 그 길을 판다. 다른 계열의 새 주문은 거의 익힐 수 없다.`;
  },
  choices: (g) => { const aff = affinityOf(g).map((a) => a.id); return SCHOOL_IDS.map((k) => ({ label: `${schoolName(k)}${aff.includes(k) ? ' (몸이 당긴다)' : ''}`, key: k })); },
  resolve(g, rng, s, key) {
    const m = magicState(g), aff = affinityOf(g).map((a) => a.id);
    m.school = key; m.fit = aff.includes(key);
    gainSkill(g, 'magic', 0.8, 'int');
    const foe = SCHOOLS[key].foe && aff.includes(SCHOOLS[key].foe);
    return `${schoolName(key)}의 길로 정했다. ${m.fit ? `마력이 기다렸다는 듯 그쪽으로 쏟아졌다. ${SCHOOL_FEEL[key]}.` : foe ? '마력이 한참 버티다 겨우 그쪽으로 꺾였다. 몸에 맞는 길은 아니다. 그래도 내가 고른 길이다.' : '마력이 천천히 그쪽 결을 따라 흐르기 시작했다.'}`;
  },
});

/* ---------- 영창 줄이기와 무영창 ---------- */
export const chantWord = (v) => (v >= 90 ? '무영창' : v >= 60 ? '한 마디 영창' : v >= 30 ? '짧은 영창' : '긴 영창');
const chantCap = (g) => { const k = g.player.skills.magic ?? 0, w = g.player.stats.wil ?? 0; return k >= 70 && w >= 55 && circleOf(g) >= 3 ? 100 : k >= 45 ? 89 : 59; };
ACTIONS.push({
  id: 'sp_chant',
  name: '영창 줄이기 수련',
  icon: 'magic',
  desc: '주문의 긴 영창을 짧게, 한 마디로, 끝내는 소리 없이 쓰는 수련. 서클과는 다른 솜씨다. 무영창은 드물다.',
  available: (g) => mage(g) && playerAge(g) >= 12 && (g.magic?.chant ?? 0) < chantCap(g) && (g.magic?.known?.length ?? 0) >= 1 && !onRoad(g),
  run(g, rng) {
    const m = magicState(g), was = m.chant, cap = chantCap(g);
    const gain = (rng.float(1, 2.2) + (g.player.stats.wil ?? 0) / 60 + (g.player.skills.magic ?? 0) / 80) * (1 - was / 160);
    m.chant = Math.min(cap, Math.round((was + gain) * 10) / 10);
    strainUp(g, 9); gainSkill(g, 'magic', 0.4, 'wil'); g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 10);
    if (chantWord(m.chant) !== chantWord(was)) {
      if (m.chant >= 90) { renown(g, 6); chron(g, `${g.player.name}, 무영창을 이루다.`, 50); return '입술을 다문 채 손가락만 들었다. 촛불 셋이 한꺼번에 꺼지고, 다시 켜졌다. 소리 한 점 없이. 대륙에 몇 없는 무영창이다.'; }
      if (m.chant >= 60) return '긴 술식을 한 마디로 접었다. "타라." 그 한마디에 불이 붙었다. 스승들이 평생 걸린다던 고개를 하나 넘었다.';
      return '영창 열두 줄을 넉 줄로 줄였다. 혀가 꼬이지 않고 마력이 끊기지 않았다.';
    }
    if (m.chant >= cap) return cap < 90 ? '영창이 더는 줄지 않는다. 마력을 다루는 솜씨가 더 깊어져야 다음 고개가 보일 것이다.' : '더 줄일 영창이 없다.';
    return rng.pick(['같은 주문을 백 번 외웠다. 아흔 번째부터 몇 음절이 저절로 빠졌다.', '입 안으로만 영창을 굴렸다. 마력이 반쯤 흩어졌다. 다시.', '숨 한 번에 술식 하나를 끝내는 연습을 했다. 머리가 핑 돌았다.']);
  },
});
// 영창이 짧을수록 싸움에서 빠르다. 내가 지은 싸움 주문도 조금 더한다
POWER_BONUS.push((g) => {
  const m = g.magic;
  if (!m) return 0;
  const c = circleOf(g);
  return c * (m.chant ?? 0) / 100 * 4 + madeSpells(g).filter((x) => x.use === 'combat' || x.use === 'ward').reduce((a, x) => a + x.circle * (x.use === 'combat' ? 2 : 1), 0);
});

/* ---------- 마력 폭주와 대가 ---------- */
export const strainWord = (v) => (v >= 80 ? '마력이 혈관을 긁는다' : v >= 60 ? '손끝이 저리고 머리가 무겁다' : v >= 30 ? '조금 무리하고 있다' : '맑다');
HOOKS.afterMonth.push((g) => {
  if (!g.magic || g.over) return;
  const m = g.magic;
  m.strain = Math.max(0, Math.round((m.strain - 10 - (g.player.stats.wil ?? 0) / 20) * 10) / 10);
  // 서클이 오르면 장면
  if (!g.player.manaAwakened || !g.life) return;
  const c = circleOf(g);
  if (m.peak == null) { m.peak = c; return; }
  if (c > m.peak) { m.peak = c; if (!sceneQueued(g, 'sp_circle')) queueScene(g, 'sp_circle', { c }); }
});
EVENTS.push({
  id: 'sp_overload', road: true, cooldown: 6,
  cond: (g) => !busy(g) && (g.magic?.strain ?? 0) >= 70 && circleOf(g) >= 1,
  chance: (g) => Math.min(0.9, (g.magic.strain - 55) / 50), weight: 80,
  title: '마력 폭주',
  text: (g) => `아침부터 손끝이 떨렸다. 저녁 무렵, 마력이 원을 벗어나 혈관을 따라 거꾸로 치솟는다. ${circleOf(g) >= 3 ? '둘레의 그릇이 달그락거리고 등잔불이 한쪽으로 눕는다.' : '눈앞이 하얘진다.'} 너무 많이 끌어 썼다.`,
  choices: [
    { label: '이를 악물고 거둬들인다', run: (g, rng) => {
      const m = magicState(g); m.overloads += 1;
      if (rng.chance(0.35 + (g.player.stats.wil ?? 0) / 160)) { m.strain = 30; gainStat(g, 'wil', 0.6); gainSkill(g, 'magic', 1, 'wil'); return '마력을 한 올씩 감아 원 안으로 되돌렸다. 새벽에야 끝났다. 손바닥이 갈라졌지만 그릇은 지켰다.'; }
      m.strain = 20; m.scars += 1; g.player.mana = Math.round(g.player.mana * 0.94 * 10) / 10;
      g.player.injuries.push({ name: '마력에 덴 팔의 흉터', months: 3 });
      return '거둬들이다 놓쳤다. 왼팔을 따라 마력이 터져 나갔다. 팔뚝에 번개 모양 흉터가 남았고, 마력 그릇이 조금 줄어든 게 느껴진다.';
    } },
    { label: '하늘로 흘려보낸다', run: (g) => { const m = magicState(g); m.overloads += 1; m.strain = 0; g.player.fatigue = 100; stress(g, 6); return '창을 열고 두 손을 하늘로 뻗어 마력을 쏟아 냈다. 지붕 위로 빛 기둥이 섰다고 이웃들이 말했다. 사흘을 꼼짝없이 누워 지냈다.'; } },
    { label: '아무 데나 터뜨린다', run: (g, rng) => { const m = magicState(g); m.overloads += 1; m.strain = 10; const lost = Math.min(g.player.money, rng.int(5, 20)); g.player.money -= lost; deed(g, 'kind', -1, '마력을 터뜨려 이웃집을 망가뜨렸다'); return `마당으로 뛰쳐나가 마력을 터뜨렸다. 헛간 지붕이 날아가고 이웃집 창이 깨졌다. 물어 준 값이 은화 ${lost}닢. 사람들이 나를 슬금슬금 피한다.`; } },
  ],
});

/* ---------- 서클이 오를 때 ---------- */
const CIRCLE_TEXT = {
  1: '명치 아래에서 마력이 처음으로 원을 그리며 닫혔다. 흩어지던 것이 한 바퀴 돌아 제자리로 온다. 이것이 1서클.',
  2: '첫째 원 바깥에 둘째 원이 겹쳐 돌기 시작했다. 두 원이 맞물리며 낮게 웅웅거린다. 이제 마법사라 불러도 부끄럽지 않다.',
  3: '셋째 원이 닫히던 밤, 온몸의 털이 곤두섰다. 등잔불이 저절로 켜지고 개들이 짖었다. 3서클. 협회가 이름을 적어 두는 문턱이다.',
  4: '넷째 원이 맞물리자 둘레의 마력이 내 쪽으로 쏠렸다. 우물물이 출렁이고 새들이 한꺼번에 날아올랐다. 나라에 손꼽히는 자리다.',
  5: '다섯째 원이 닫히는 데 사흘 밤낮이 걸렸다. 끝났을 때 방 안의 쇠붙이가 모두 녹슬어 있었다. 대륙에서도 이름을 셀 수 있는 사람들만 서는 곳.',
  6: '여섯째 원. 하늘의 구름이 내 머리 위에서 천천히 돌았다. 이 위로는 노아 한 사람만이 올랐다고 한다.',
};
defineScene('sp_circle', {
  need: () => true,
  title: (g, s) => `${s.c}서클`,
  text: (g, s) => CIRCLE_TEXT[Math.min(6, s.c)] ?? CIRCLE_TEXT[6],
  choices: (g, s) => [
    { label: '혼자 조용히 받아들인다', key: 'quiet' },
    { label: s.c >= 3 ? '세상에 알린다' : '집 사람들에게 알린다', key: 'tell' },
    { label: '새 원의 힘을 당장 시험한다', key: 'test' },
  ],
  resolve(g, rng, s, key) {
    const m = magicState(g);
    if (s.c >= 3) chron(g, `${g.player.name}, ${s.c}서클에 오르다.`, 25 + s.c * 6);
    if (key === 'quiet') { gainStat(g, 'wil', 0.5); m.strain = Math.max(0, m.strain - 10); return '아무에게도 말하지 않았다. 밤새 새 원이 도는 소리를 들었다. 나만 아는 일이 하나 늘었다.'; }
    if (key === 'tell') { renown(g, s.c * 2); return s.c >= 3 ? '소문은 사흘 만에 고장 끝까지 갔다. 부탁하러 오는 사람과 시험해 보려는 사람이 함께 늘었다.' : '어머니가 부엌에서 나와 내 손을 오래 잡았다. 아버지는 아무 말 없이 술을 한 잔 따랐다.'; }
    gainSkill(g, 'magic', 1.2, 'int'); strainUp(g, 20);
    return '들판으로 나가 새 원의 힘을 끝까지 끌어 썼다. 땅이 그을리고 손끝이 저렸다. 얼마나 멀리 갈 수 있는지 조금 알았다.';
  },
});

/* ---------- 내 주문 짓기 ---------- */
const SCHOOL_USES = { fire: ['life', 'job', 'combat'], water: ['life', 'heal', 'ward', 'combat'], wind: ['life', 'job', 'ward', 'combat'], earth: ['life', 'job', 'ward', 'combat'], light: ['heal', 'ward', 'combat'], shadow: ['job', 'ward', 'combat'], life: ['life', 'heal', 'job'], mind: ['job', 'ward', 'combat'] };
const NAMES = {
  fire: ['잿빛 꽃', '숯불 바늘', '붉은 혀', '불씨 비', '타는 고리', '여름 아궁이'], water: ['물거울', '서리 바늘', '안개 손', '빗줄기 실', '고요한 물결', '얼음 꽃'],
  wind: ['휘파람 칼', '돛 바람', '깃털 길', '회오리 실', '새벽 바람', '하늘 계단'], earth: ['돌 손바닥', '흙 심장', '바위 울음', '모래 벽', '뿌리 길', '산 그림자'],
  light: ['흰 등불', '새벽 바늘', '빛의 실', '맑은 종', '해 그물', '은빛 원'], shadow: ['밤 장막', '검은 실', '그늘 문', '까마귀 날개', '달 없는 길', '숨은 손'],
  life: ['푸른 손', '새싹 숨', '이슬 실', '되살이 풀', '숲의 맥박', '따뜻한 손'], mind: ['고요한 눈', '꿈의 실', '속삭임 열쇠', '잠의 손', '맑은 거울', '마음 매듭'],
};
const USE_DESC = { life: '살림과 일손을 덜어 주는', heal: '아픈 데를 다스리는', job: '품을 받고 쓰기 좋은', ward: '몸과 집을 지키는', combat: '싸움에 쓰는' };
ACTIONS.push({
  id: 'sp_create',
  name: '주문 짓기',
  icon: 'quill',
  desc: '아는 술식을 뜯어 고쳐 세상에 없던 주문을 짓는다. 이름을 붙이고, 남에게 가르치고, 집안 마도서로 남길 수 있다.',
  available: (g) => mage(g) && playerAge(g) >= 16 && circleOf(g) >= 2 && (g.player.skills.magic ?? 0) >= 35 && !!g.magic?.school && !onRoad(g) && mine(g).length < 3 && !sceneQueued(g, 'sp_create') && !sceneQueued(g, 'sp_name'),
  run(g, rng) {
    const m = magicState(g);
    if (!m.making) { queueScene(g, 'sp_create'); return '빈 공책을 펼치고 아는 술식들을 늘어놓았다.'; }
    const k = m.making;
    k.prog += (0.12 + (g.player.stats.int ?? 0) / 300 + (g.player.skills.magic ?? 0) / 400) * rng.float(0.6, 1.3) / k.circle ** 0.5;
    strainUp(g, 12); gainSkill(g, 'magic', 0.7, 'int'); g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 14);
    if (k.prog >= 1) { queueScene(g, 'sp_name'); return '마지막 고리가 맞물렸다. 술식이 손끝에서 처음 보는 모양으로 피어났다. 이제 이름을 붙일 차례다.'; }
    if (rng.chance(0.12)) { k.prog = Math.max(0, k.prog - 0.15); return '술식이 돌다 거꾸로 감겼다. 공책 한 장이 그을렸다. 며칠 치 셈을 되돌렸다.'; }
    return k.prog < 0.4 ? '술식 셋을 뜯어 이었다 풀었다. 아직 어떤 모양이 될지 모른다.' : k.prog < 0.75 ? '새 술식이 반쯤 돈다. 끝에서 자꾸 흩어진다.' : '거의 다 됐다. 마지막 고리 하나가 들어맞지 않는다.';
  },
});
defineScene('sp_create', {
  need: (g) => !g.magic?.making && !!g.magic?.school,
  title: () => '새 주문',
  text: (g) => `${schoolName(g.magic.school)} 계열 술식들을 늘어놓고 들여다본다. 어디에 쓸 주문을 지을까. 아는 서클보다 높은 주문은 지을 수 없다.`,
  choices: (g) => SCHOOL_USES[g.magic.school].map((u) => ({ label: `${USE_NAME[u]}에 쓸 주문`, key: u })).concat([{ label: '오늘은 접는다', key: 'none' }]),
  resolve(g, rng, s, key) {
    if (key === 'none') return '공책을 덮었다. 술식들은 공책 안에서 기다릴 것이다.';
    const m = magicState(g), c = Math.max(1, Math.min(circleOf(g), 6, rng.int(1, circleOf(g))));
    m.making = { use: key, circle: c, prog: 0, at: mi(g) };
    return `${USE_DESC[key]} ${c}서클 주문을 짓기로 했다. 몇 달, 어쩌면 몇 해가 걸릴 것이다.`;
  },
});
defineScene('sp_name', {
  need: (g) => !!g.magic?.making,
  title: () => '이름 붙이기',
  text: (g) => { const k = g.magic.making; return `새 주문이 손끝에서 돈다. ${schoolName(g.magic.school)} 계열, ${k.circle}서클, ${USE_DESC[k.use]} 주문. 세상 어느 마도서에도 없는 술식이다. 이름을 붙여야 한다.`; },
  choices: (g, s) => {
    const r = spRng(g, 7), used = g.magic.made.map((x) => x.name), pool0 = NAMES[g.magic.school].filter((n) => !used.some((u) => u.endsWith(n))), pool = pool0.length >= 3 ? pool0 : [...NAMES[g.magic.school]];
    s.names ??= [r.pick(pool), `${g.player.name}의 ${r.pick(pool)}`];
    if (s.names.length < 3) { const rest = pool.filter((x) => !s.names.some((n) => n.endsWith(x))); s.names.push(rest[r.int(0, rest.length - 1)]); }
    return s.names.map((n, i) => ({ label: `「${n}」`, key: `n${i}` }));
  },
  resolve(g, rng, s, key) {
    const m = magicState(g), k = m.making;
    if (!k) return '술식이 흩어졌다.';
    const name = s.names?.[Number(key.slice(1))] ?? s.names?.[0] ?? '이름 없는 주문';
    const sp = { id: `made_${m.seq++}`, school: m.school, circle: k.circle, use: k.use, name, desc: `${J(g.player.name, '이/가')} 지은 ${schoolName(m.school)} 계열 ${k.circle}서클 주문. ${USE_DESC[k.use]} 술식이다.`, by: g.player.name, at: g.date.year, mine: true, learned: true, taught: 0 };
    m.made.push(sp); m.making = null;
    renown(g, 3 + k.circle);
    chron(g, `${g.player.name}, 새 주문 ${qj(name, '을/를')} 짓다.`, 30 + k.circle * 5);
    return `공책 맨 위에 「${name}」${ira(name)}고 적었다. 처음 쓴 날짜와 술식의 고리 수도 적었다. 세상에 주문이 하나 늘었다.`;
  },
});
EVENTS.push({
  id: 'sp_teach', cooldown: 24,
  cond: (g) => !busy(g) && !onRoad(g) && age(g) >= 22 && mine(g).length > 0,
  chance: () => 0.06, weight: 40,
  prepare: (g, rng) => { const x = rng.pick(mine(g)); return { id: x.id }; },
  title: '주문을 배우러 온 사람',
  text: (g, c) => { const x = g.magic.made.find((y) => y.id === c.id); return `먼 길을 왔다는 젊은 마법사가 문 앞에 섰다. 「${x?.name ?? '내 주문'}」 이야기를 들었다고 한다. "그 술식을 가르쳐 주십시오. 값은 드리겠습니다."`; },
  choices: [
    { label: '값을 받고 가르친다', run: (g, rng, c) => { const x = g.magic.made.find((y) => y.id === c.id); x.taught += 1; g.player.money += 5 * x.circle; renown(g, 1); return `한 달 동안 술식을 가르쳤다. 은화 ${5 * x.circle}닢을 받았다.${spread(g, x)}`; } },
    { label: '값 없이 가르친다', run: (g, rng, c) => { const x = g.magic.made.find((y) => y.id === c.id); x.taught += 1; deed(g, 'generous', 2, '자기가 지은 주문을 값 없이 가르쳤다'); renown(g, 2); return `값은 됐다고 했다. 젊은 마법사가 공책을 품에 안고 몇 번이고 고개를 숙였다.${spread(g, x)}`; } },
    { label: '내 술식은 내 것이다', run: (g) => { stress(g, -1); return '문을 닫았다. 공책은 자물쇠 달린 상자에 넣었다.'; } },
  ],
});
function spread(g, x) {
  if (x.taught !== 3) return '';
  renown(g, 4); chron(g, `「${x.name}」, 마법사들 사이에 퍼지다.`, 30);
  return ` 이제 ${qj(x.name, '을/를')} 쓰는 마법사가 셋이다. 다른 고장에서도 내 이름과 함께 그 주문 이야기가 돈다고 한다.`;
}

/* ---------- 이명 ---------- */
const TITLES = {
  fire: ['붉은 손', '잿빛 불꽃', '아궁이의'], water: ['서리 눈', '안개 걸음', '빗소리'], wind: ['바람 칼', '휘파람', '돛대 위의'], earth: ['돌 어깨', '산의 목소리', '흙 묻은'],
  light: ['새벽 지팡이', '흰 등불', '종소리'], shadow: ['그림자 장갑', '밤 까마귀', '등 뒤의'], life: ['푸른 손', '숨 돌려주는', '이슬'], mind: ['고요한 눈', '속 읽는', '잠의'],
  none: ['떠돌이', '촛불', '잿빛 망토'],
};
export function titleOptions(g) {
  const m = g.magic, r = spRng(g, 13), base = [...TITLES[m.school ?? 'none']];
  const out = [];
  if ((m.chant ?? 0) >= 90) out.push('말 없는');
  if (mine(g).length) out.push(`「${mine(g)[0].name}」의`);
  while (out.length < 2) { const t = base.splice(r.int(0, base.length - 1), 1)[0]; if (!t) break; out.push(t); }
  return out.slice(0, 2);
}
export const titled = (g) => (g.magic?.title ? `${g.magic.title} ${g.player.name}` : null);
EVENTS.push({
  id: 'sp_epithet', cooldown: 60,
  cond: (g) => !busy(g) && !g.magic?.title && circleOf(g) >= 3 && age(g) >= 20 && ((L(g).renown ?? 0) >= 15 || (g.magic?.works ?? 0) >= 25 || mine(g).length > 0 || (g.magic?.chant ?? 0) >= 90),
  chance: () => 0.12, weight: 45,
  prepare: (g) => ({ opts: titleOptions(g) }),
  title: '사람들이 부르는 이름',
  text: (g, c) => `장터에서 아이들이 나를 보고 수군거린다. 주막에선 내가 없는 자리에서도 나를 '${c.opts[0]} ${g.player.name}'${ira(g.player.name)} 부른다고 한다.${c.opts[1] ? ` 다른 고장에선 '${c.opts[1]} ${g.player.name}'${ira(g.player.name)}고도 한다.` : ''}`,
  choices: [
    { label: (g, c) => `'${c.opts[0]}', 그렇게 불리는 게 싫지 않다`, run: (g, rng, c) => { g.magic.title = c.opts[0]; renown(g, 3); chron(g, `${g.player.name}, '${c.opts[0]} ${g.player.name}'${ira(g.player.name)} 불리다.`, 30); return `그 뒤로 편지 겉봉에도 '${c.opts[0]} ${g.player.name}'${ira(g.player.name)}고 적혀 왔다.`; } },
    { label: (g, c) => `'${c.opts[1] ?? c.opts[0]}' 쪽이 낫다`, run: (g, rng, c) => { const t = c.opts[1] ?? c.opts[0]; g.magic.title = t; renown(g, 3); chron(g, `${g.player.name}, '${t} ${g.player.name}'${ira(g.player.name)} 불리다.`, 30); return `내 입으로 그렇게 말하고 다니진 않았지만, 어느새 '${t}' 쪽이 굳었다.`; } },
    { label: '이름 따위 필요 없다', run: (g) => { stress(g, 1); return '못 들은 척했다. 사람들은 내가 듣든 말든 저희끼리 부를 것이다.'; } },
  ],
});

HOOKS.migrate.push((g) => { if (g.magic) { magicState(g); if (g.magic.peak == null && g.player?.manaAwakened) g.magic.peak = circleOf(g); } });
void here; void SCHOOLS;
