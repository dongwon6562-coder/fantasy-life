// 정령과 얽히는 일: 알아보는 눈을 뜨고, 엘프·드워프에게 보는 법을 배우고, 정령의 자리에 가서 계약을 맺는다.
// 계약은 힘을 주고 조건을 지운다. 정령은 변덕스럽게 무언가를 요구한다. 조건을 어기면 은혜가 줄고, 끝내 계약이 깨지면 그 집안에 무언가 온다.
// 교단은 정령 계약을 이교로 보고, 마탑은 재고 싶어 한다. 마력이 적게 태어난 사람에게 더 잘 열린다.
// 새 행동은 뜻 있는 형편에서만: 눈을 뜬 뒤 엘프·드워프 고장에서(배우기), 똑바로 보는 눈으로 정령의 자리 앞 고장에서(계약).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat, gainSkill } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed, addNotoriety } from '../crime.js';
import { POWER_BONUS } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { PLACES } from '../places.js';
import { SP, SPIRITS, SPIRIT_IDS, clamp, mi, splog, spiritAt, spiritName, bornSight, pactOf, placeName } from './state.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const st = (g, k) => g.player.stats[k] ?? 0;
const sea = (pl) => PLACES[pl]?.realm === 'sea';
const holy = (pl) => PLACES[pl]?.realm === 'holy';

/* ---------- 눈을 뜬다 ---------- */
EVENTS.push({
  id: 'spirit_glimpse', cooldown: 24, weight: 4,
  chance: (g) => (bornSight(g) ? 0.35 : 0.08),
  cond: (g) => free(g) && SP(g).sight === 0 && !!spiritAt(here(g)),
  prepare: (g) => ({ id: spiritAt(here(g)) }),
  title: '거기 무언가 있다',
  text: (g, c) => ({
    sp_water: '은잎 마을 아이들이 호숫가에서 돌을 던지고 놀았다. 물결이 퍼지다가, 한가운데에서 거꾸로 모여들었다. 아이들은 아무것도 못 본 얼굴이다. 나만 보았다.',
    sp_fire: '대장간 화덕의 불이 한순간 사람 손 모양으로 일어섰다가 주저앉았다. 망치질하던 드워프는 고개도 들지 않았다. 나만 보았다.',
    sp_wind: '절벽 쪽에서 불어온 바람이 내 귀 옆에서 멈췄다. 멈춘 채로 숨을 쉬었다. 등대지기가 나를 보더니 아무 말 없이 성호를 그었다.',
    sp_earth: '성벽 밑 돌바닥이 발바닥 아래에서 한 번 부풀었다 가라앉았다. 옆의 수비병은 아무렇지 않게 창을 고쳐 쥐었다. 나만 느꼈다.',
  }[c.id]),
  choices: [
    { label: '눈을 돌린다', run: () => '못 본 것으로 했다. 그날 밤 잠이 오지 않았다.' },
    { label: '똑바로 본다', run: (g, rng, c) => {
      const S = SP(g);
      if (bornSight(g) || check(rng, st(g, 'wil') + st(g, 'sen') / 2, 75)) { S.sight = 1; S.me.seen += 1; splog(g, `${spiritName(c.id)}: 처음 보았다.`); return `똑바로 보았다. 그것도 나를 보았다. 눈이 마주친 것은 아닌데, 보였다는 것을 알았다. 그 뒤로 ${placeName(here(g))}의 공기가 전과 다르게 느껴진다. ${(g.player.manaPotential ?? 0.5) < 0.3 ? '마력이 적은 눈이라 오히려 가리는 것이 없다고, 나중에 누가 말해 주었다.' : ''}`.trim(); }
      return '보려 할수록 흐려졌다. 머릿속에서 무언가가 그것을 덮었다. 마력이 많은 사람의 눈은 오히려 정령을 못 본다는 말이 있다.';
    } },
  ],
});

/* ---------- 보는 법을 배운다: 엘프와 드워프 ---------- */
const TEACH = { silverleaf: 'elf', hammer: 'dwarf' };
ACTIONS.push({
  id: 'spirit_learn', name: '정령 보는 법을 청한다', icon: 'book',
  desc: '얼핏 본 것을 똑바로 보는 법. 엘프와 드워프는 그 법을 대대로 지켜 왔다. 아무에게나 가르치지는 않는다.',
  available: (g) => free(g) && SP(g).sight === 1 && !!TEACH[here(g)] && !sceneQueued(g, 'spirit_learn'),
  run(g) { queueScene(g, 'spirit_learn', { pl: here(g) }, { first: true }); return '정령을 본다는 노인을 찾아 문을 두드렸다.'; },
});
defineScene('spirit_learn', {
  title: (g, s) => (TEACH[s.pl] === 'elf' ? '은잎 마을의 물가 노래' : '쇠망치 골의 불 앞 침묵'),
  text: (g, s) => (TEACH[s.pl] === 'elf'
    ? '나무 위 집의 늙은 엘프가 오래 나를 보았다. "인간이 본다고? 드문 일이군. 보는 법은 노래로 전한다. 사흘 밤을 호숫가에서 한 소절도 틀리지 않고 부르면 가르쳐 주지. 틀리면 호수가 너를 기억한다."'
    : '수염이 허리까지 내려온 드워프 장로가 화덕 앞에 앉아 있었다. "불을 본다는 놈이 일 년에 하나씩은 와. 대개는 거짓말이지. 은화 마흔 닢을 화덕에 넣어라. 그리고 하루 낮밤을 불 앞에서 눈을 감지 마라."'),
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.pl || SP(g).sight !== 1) return [];
    return [{ label: '물러난다', key: 'leave' }, TEACH[s.pl] === 'elf' ? { label: '사흘 밤을 부른다', key: 'sing' } : { label: '은화 마흔 닢을 넣고 앉는다', key: 'sit', show: canSpend(g, 40) }].filter((c) => c.show !== false);
  },
  resolve(g, rng, s, key) {
    const S = SP(g);
    if (key === 'leave') return '고개를 숙이고 나왔다. 아직은 아니다.';
    if (S.sight !== 1) return '이미 지난 일이다.';
    tired(g, 25);
    if (key === 'sit' && !spend(g, 40)) return '돈이 모자랐다.';
    const race = g.player.race ?? 'human';
    const ok = check(rng, st(g, 'wil') + st(g, 'sen') / 2 + (race === TEACH[s.pl] ? 25 : 0), 80);
    if (!ok) { stress(g, 8); if (key === 'sing') injure(g, '물가 이슬에 든 한기', 2); else injure(g, '불 앞에서 덴 눈', 2); return key === 'sing' ? '셋째 밤 새벽에 한 소절을 놓쳤다. 호수가 잔물결 하나 없이 고요해졌다. 노인은 등을 돌렸다. "다음 해에 다시 오게. 호수가 잊어 준다면."' : '해 질 녘에 눈을 감고 말았다. 장로는 은화를 돌려주지 않았다. "불은 기다려 주지 않아."'; }
    S.sight = 2;
    deed(g, 'loyal', 2, null, here(g));
    return key === 'sing' ? '셋째 밤이 끝날 때 호수 위로 무언가가 몸을 일으켰다가 가라앉았다. 처음으로 그것의 윤곽을 끝까지 보았다. 노인이 말했다. "이제 너도 본다. 보는 사람은 보이기도 한다는 걸 잊지 마라."' : '새벽에 화덕 속에서 불이 아닌 것이 움직였다. 눈을 감지 않았다. 그것도 눈을 감지 않았다. 장로가 처음으로 웃었다. "됐다. 이제 불을 함부로 대하지 마라. 불이 너를 안다."';
  },
});

/* ---------- 계약을 맺는다 ---------- */
ACTIONS.push({
  id: 'spirit_seek', name: '정령의 자리로 간다', icon: 'magic',
  desc: '똑바로 보는 눈으로, 정령이 사는 자리까지 간다. 그것과 마주하고, 원하면 계약을 청한다.',
  available: (g) => free(g) && SP(g).sight >= 2 && !!spiritAt(here(g)) && !pactOf(g) && SP(g).curse?.id !== spiritAt(here(g)) && !sceneQueued(g, 'spirit_meet'),
  run(g) { const id = spiritAt(here(g)); queueScene(g, 'spirit_meet', { id }, { first: true }); return `${SPIRITS[id].home} 쪽으로 혼자 길을 잡았다. 길잡이는 중간에서 돌아갔다.`; },
});
defineScene('spirit_meet', {
  title: (g, s) => spiritName(s.id),
  text: (g, s) => `${SPIRITS[s.id].desc} ${SPIRITS[s.id].meet} 그것이 바라는 것: ${SPIRITS[s.id].term} 그것이 주는 것: ${SPIRITS[s.id].gift}`,
  choices: (g, s) => (free(g) && here(g) === SPIRITS[s.id].from && !pactOf(g) && SP(g).sight >= 2 ? [{ label: '물러난다', key: 'leave' }, { label: '계약을 청한다', key: 'pact' }] : []),
  resolve(g, rng, s, key) {
    const S = SP(g), d = SPIRITS[s.id], x = S.spirits[s.id];
    if (key === 'leave') return '뒷걸음질로 물러났다. 그것은 쫓아오지 않았다. 다만 내가 어디 사는지 이제 안다.';
    if (pactOf(g)) return '이미 다른 것과 묶여 있다.';
    const v = st(g, 'wil') + S.sight * 12 + bornSight(g) * 15 + (x.mood / 5) + rng.int(-10, 10);
    if (v < 95) {
      injure(g, `${d.kind}의 정령이 남긴 손자국`, 3); stress(g, 15);
      x.mood = clamp(x.mood - 10, -100, 100);
      return `그것이 다가왔다. 너무 가까이. ${d.kind === '물' ? '폐에 물이 찼다.' : d.kind === '불' ? '살갗이 부풀었다.' : d.kind === '바람' ? '숨이 빨려 나갔다.' : '갈비뼈가 안으로 눌렸다.'} 정신을 차렸을 때 나는 그 자리 밖에 쓰러져 있었다. 그것은 나를 받지 않았다. 받지 않은 것이 다행인지도 모른다.`;
    }
    S.pact = { id: s.id, since: mi(g), favor: 60, breaches: 0, lastPlace: here(g), placeSince: mi(g), owed: 0 };
    S.me.pacts += 1; x.pacts += 1;
    splog(g, `${spiritName(s.id)}: 계약을 맺었다.`);
    note(g, `${J(spiritName(s.id), '과/와')} 계약을 맺었다.`);
    chron(g, `${J(g.player.name, '이/가')} ${J(spiritName(s.id), '과/와')} 계약을 맺었다는 말이 돈다.`, 80);
    return `손을 내밀었다. 그것이 손바닥에 닿았다. ${d.kind === '물' ? '차갑고 무겁다.' : d.kind === '불' ? '뜨겁지 않았다. 그게 더 무서웠다.' : d.kind === '바람' ? '아무것도 닿지 않았는데 손금이 바뀌었다.' : '손바닥 밑에서 맥이 뛰었다. 내 것이 아니다.'} 약속은 말로 하지 않았다. 몸에 새겨졌다. ${d.term}`;
  },
});

// 힘: 은혜가 남아 있는 동안
POWER_BONUS.push((g) => { const p = g.spirit?.pact; return p && p.favor >= 30 ? SPIRITS[p.id]?.power ?? 0 : 0; });

/* ---------- 계약을 깬다 ---------- */
export function breakPact(g, why) {
  const S = SP(g), p = S.pact;
  if (!p) return false;
  S.pact = null; S.me.broken += 1;
  S.spirits[p.id].mood = clamp(S.spirits[p.id].mood - 40, -100, 100);
  S.curse = { id: p.id, until: mi(g) + 12 * 15, heavy: true };
  splog(g, `${spiritName(p.id)}: 계약이 깨졌다 (${why}).`);
  note(g, `${J(spiritName(p.id), '과/와')} 맺은 계약이 깨졌다.`);
  chron(g, `${J(g.player.name, '이/가')} ${J(spiritName(p.id), '과/와')} 맺은 계약을 깼다. 그 집안에 무언가 온다고들 한다.`, 70);
  return true;
}
function breach(g, text) {
  const p = SP(g).pact;
  if (!p) return;
  p.breaches += 1; p.favor = clamp(p.favor - 25, 0, 100);
  note(g, text);
  stress(g, 6);
  if (p.favor <= 0 || p.breaches >= 4) breakPact(g, '조건을 거듭 어김');
}

/* ---------- 달마다: 조건, 선물, 깨진 계약이 남긴 것 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (!g.spirit || g.over) return;
  const S = SP(g), p = S.pact, P = g.player;
  if (p) {
    const pl = here(g);
    if (pl !== p.lastPlace) { p.lastPlace = pl; p.placeSince = mi(g); }
    if (p.id === 'sp_fire') { if (canSpend(g, 3)) spend(g, 3); else breach(g, '화덕에 먹일 은화가 없었다. 불이 낮아졌다. 화산 쪽에서 무언가 고개를 돌렸다.'); }
    if (p.id === 'sp_wind' && mi(g) - p.placeSince >= 24) { p.placeSince = mi(g); breach(g, `${placeName(pl)}에 두 해를 머물렀다. 밤에 바람이 문을 세 번 두드리고 갔다.`); }
    if (p.id === 'sp_earth' && sea(pl) && !p.seaWarned) { p.seaWarned = true; breach(g, '배에 올랐다. 발밑이 땅이 아니게 된 순간, 멀리서 무언가 숨을 멈췄다.'); }
    if (p.id === 'sp_earth' && !sea(pl)) p.seaWarned = false;
    if (p.id === 'sp_water' && g.date.month === 10 && !sceneQueued(g, 'spirit_tithe')) queueScene(g, 'spirit_tithe', {});
    if (!S.pact) return;
    // 선물
    if (p.favor >= 30) {
      if (p.id === 'sp_water' && g.date.month % 3 === 0 && P.injuries.length) { P.injuries.sort((a, b) => a.months - b.months); P.injuries.shift(); }
      if (p.id === 'sp_fire') { gainSkill(g, 'smithing', 0.3, 'str'); gainStat(g, 'str', 0.05); }
      if (p.id === 'sp_wind') gainStat(g, 'agi', 0.06);
      if (p.id === 'sp_earth') { P.fatigue = clamp(P.fatigue - 2, 0, 100); P.stress = clamp(P.stress - 1, 0, 100); }
    }
    p.favor = clamp(p.favor + 0.4, 0, 100);
    // 변덕
    if (!sceneQueued(g, 'spirit_whim') && rng.chance(0.03)) queueScene(g, 'spirit_whim', { id: p.id });
  }
  const c = S.curse;
  if (c) {
    if (mi(g) >= c.until) { S.curse = null; note(g, `${spiritName(c.id)}의 손이 마침내 집안에서 떠났다.`); return; }
    const k = c.heavy ? 1 : 0.5;
    if (c.id === 'sp_water') stress(g, 2 * k);
    if (c.id === 'sp_fire' && rng.chance(0.03 * k)) { const lost = Math.floor((P.money ?? 0) * 0.15); P.money -= lost; note(g, `집에 불이 났다. 은화 ${lost}닢어치가 탔다.`); }
    if (c.id === 'sp_wind') P.fatigue = clamp(P.fatigue + 2 * k, 0, 100);
    if (c.id === 'sp_earth' && rng.chance(0.05 * k)) { const lost = Math.floor((P.money ?? 0) * 0.08); P.money -= lost; note(g, `발밑 땅이 꺼져 창고 한쪽이 무너졌다. 은화 ${lost}닢을 잃었다.`); }
  }
});

/* ---------- 물의 정령: 해마다 아끼는 것 하나 ---------- */
defineScene('spirit_tithe', {
  title: () => '호수에 돌려줄 것',
  text: () => '겨울이 오기 전이다. 꿈에 호수가 나왔다. 물 밑의 얼굴이 기다린다. 아끼는 것 하나를 돌려줘야 한다. 돈으로 사는 물건은 받지 않는다는 것을 안다. 그래도 사람들은 처음엔 돈을 던진다.',
  choices: (g) => (SP(g).pact?.id === 'sp_water' && !g.over ? [
    { label: '은화를 한 줌 던진다', key: 'coin', show: canSpend(g, 30) },
    { label: '아끼는 기억 하나를 내준다', key: 'memory' },
    { label: '올해는 가지 않는다', key: 'skip' },
  ].filter((c) => c.show !== false) : []),
  resolve(g, rng, s, key) {
    const p = SP(g).pact;
    if (p?.id !== 'sp_water') return '이제 호수는 나를 부르지 않는다.';
    if (key === 'skip') { breach(g, '호수에 가지 않았다. 그 겨울 내내 물을 마시면 비린내가 났다.'); return '가지 않았다. 호수가 얼어붙는 소리가 꿈에서 들렸다.'; }
    if (key === 'coin') { spend(g, 30); p.favor = clamp(p.favor - 8, 0, 100); return '은화가 물에 닿기 전에 튕겨 나와 물가에 흩어졌다. 그래도 하나는 가라앉았다. 얼굴이 웃은 것 같다. 비웃음이었다.'; }
    stress(g, 8); p.favor = clamp(p.favor + 10, 0, 100);
    return `${rng.pick(['어머니가 처음 불러 준 노래', '첫눈 오던 날 누군가의 손', '어릴 적 살던 집 부엌 냄새', '처음 칼을 쥐던 날의 떨림'])}. 그것을 물에 놓았다. 돌아오는 길에, 무엇을 놓았는지 기억나지 않았다. 다만 무언가가 비었다는 것만 안다.`;
  },
});

/* ---------- 정령의 변덕 ---------- */
const WHIM = {
  sp_water: { text: '꿈에 얼굴이 떠올랐다. "이웃 집 우물을 마르게 하라." 이유는 말하지 않는다. 그 집에는 아이가 셋이다.', obey: '그 집 우물에 손을 담그자 물이 빠져나갔다. 그 집 사람들은 이사를 갔다.' },
  sp_fire: { text: '화덕의 불이 혀처럼 길어졌다. "저 집을 먹고 싶다." 불이 가리키는 곳은 마을 끝 헛간이다. 주인이 자는 집과 붙어 있다.', obey: '그날 밤 헛간이 탔다. 주인은 겨우 빠져나왔다. 불은 만족했다.' },
  sp_wind: { text: '바람이 문을 두드렸다. "떠나라. 오늘 밤." 짐을 쌀 시간도 없다. 이유는 없다. 바람에게는 이유가 필요 없다.', obey: '한밤에 짐 하나만 메고 길에 나섰다. 사흘 뒤 돌아오니 아무 일도 없었다. 바람은 그냥 그러고 싶었다.' },
  sp_earth: { text: '발밑 땅이 무거워졌다. "묻어라." 무엇을? 꿈에 답이 왔다. 가진 것 가운데 가장 값진 것을, 아무도 모르는 땅에.', obey: '가진 것 가운데 가장 값진 것을 숲 속 땅에 묻었다. 다시 파 보니 없었다.' },
};
defineScene('spirit_whim', {
  title: (g, s) => `${spiritName(s.id)}의 변덕`,
  text: (g, s) => WHIM[s.id].text,
  choices: (g, s) => (SP(g).pact?.id === s.id && !g.over ? [{ label: '따른다', key: 'obey' }, { label: '거절한다', key: 'refuse' }, { label: '계약을 끊는다', key: 'cut' }] : []),
  resolve(g, rng, s, key) {
    const p = SP(g).pact;
    if (p?.id !== s.id) return '이제 그것의 목소리는 들리지 않는다.';
    if (key === 'obey') {
      p.favor = clamp(p.favor + 15, 0, 100);
      if (s.id === 'sp_water' || s.id === 'sp_fire') deed(g, 'kind', -4, s.id === 'sp_fire' ? `${J(g.player.name, '이/가')} 사는 쪽에서 불이 났다더라` : null, here(g));
      if (s.id === 'sp_wind') tired(g, 15);
      if (s.id === 'sp_earth') g.player.money = Math.floor(g.player.money * 0.85);
      return WHIM[s.id].obey;
    }
    if (key === 'refuse') { p.favor = clamp(p.favor - 15, 0, 100); stress(g, 5); return '고개를 저었다. 그것은 대답하지 않았다. 대신 며칠 동안 선물이 끊겼다. 다음에도 거절할 수 있을지 모르겠다.'; }
    breakPact(g, '스스로 끊음');
    return '그것에게 등을 돌리고 말했다. "끝이다." 등 뒤에서 아주 오래 아무 소리도 나지 않았다. 그리고 집안 어딘가에서, 처음 듣는 소리가 나기 시작했다.';
  },
});

/* ---------- 교단과 마탑이 보는 눈 ---------- */
EVENTS.push({
  id: 'spirit_church', cooldown: 36, weight: 6,
  chance: (g) => (holy(here(g)) ? 0.4 : 0.06),
  cond: (g) => free(g) && !!pactOf(g),
  title: '회색 망토의 질문',
  text: (g) => `이단심문소의 회색 망토가 나를 불러 세웠다. "성광의 신 말고 다른 것에 무릎을 꿇었다는 말이 있소. ${SPIRITS[pactOf(g).id].kind}의 것과. 그런 것은 신이 아니오. 오래 굶은 짐승이지."`,
  choices: [
    { label: '모른다고 한다', run: (g, rng) => { if (check(rng, st(g, 'cha') + st(g, 'wil') / 2, 75)) return '그는 한참 나를 보다가 물러났다. 장부에 무언가를 적었다.'; if (g.faith) g.faith.suspicion = clamp((g.faith.suspicion ?? 0) + 12, 0, 100); addNotoriety(g, 5); return '거짓말이 서툴렀다. 그는 내 이름을 장부에 적고, 다음 달에 다시 오겠다고 했다.'; } },
    { label: '계약을 끊겠다고 한다', run: (g) => { if (!pactOf(g)) return '이미 끊어진 일이다.'; breakPact(g, '교단 앞에서 끊음'); if (g.faith) g.faith.suspicion = clamp((g.faith.suspicion ?? 0) - 10, 0, 100); return '사제가 손을 얹고 긴 기도를 읽었다. 몸 안의 무언가가 비명을 질렀다. 교단은 나를 용서했다. 그것은 용서하지 않을 것이다.'; } },
    { label: '"내 집안의 일이오."', run: (g) => { if (g.faith) g.faith.suspicion = clamp((g.faith.suspicion ?? 0) + 6, 0, 100); deed(g, 'brave', 2, null, here(g)); return '회색 망토는 웃지 않았다. "집안의 일이 집안을 태우는 것을 여러 번 보았소." 그는 돌아갔다.'; } },
  ],
});
EVENTS.push({
  id: 'spirit_tower', cooldown: 48, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && !!pactOf(g) && here(g) === 'serenia',
  title: '재고 싶어 하는 사람',
  text: (g) => `마탑의 연구원이 찾아왔다. "서클 없이 힘을 쓰는 사람이라고 들었소. ${SPIRITS[pactOf(g).id].kind}의 정령과 계약이라니, 오백 년 동안 탑에 제대로 된 기록이 없소. 한 달만 재게 해 주시오. 은화 백 닢을 드리지."`,
  choices: [
    { label: '거절한다', run: () => '연구원은 아쉬운 얼굴로 돌아갔다. 문 앞에 명함을 두고 갔다.' },
    { label: '재게 해 준다', run: (g) => { const p = pactOf(g); if (!p) return '이제 잴 것이 없다.'; g.player.money += 100; p.favor = clamp(p.favor - 12, 0, 100); if (g.seal?.study != null) g.seal.study += 1; return '한 달 동안 술식판 위에 누워 있었다. 그들은 많은 것을 적었다. 그동안 그것은 한 번도 오지 않았다. 재어지는 것을 싫어한다는 것을, 그때 알았다.'; } },
  ],
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g) => {
  if (!g.spirit) return;
  const S = SP(g), had = !!S.pact || S.me.pacts > 0;
  S.pact = null;
  S.sight = Math.max(bornSight(g), had ? 1 : 0);
  // 깨진 계약은 핏줄에 약하게 남는다
  if (S.curse) { S.curse.heavy = false; S.curse.until = Math.min(S.curse.until, mi(g) + 12 * 10); }
});
export { SPIRIT_IDS };
