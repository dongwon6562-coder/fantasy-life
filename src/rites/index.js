// 47단계: 축제와 인생 의례. 상태는 g.rites 하나, 화면 연결점은 ritesNow(g) / ritesInfo(g) / ritesLines(g) / ritesLine(g).
// - 축제 달력: 나라 축제(세상의 소리 feastAt와 같은 이름) + 고장마다의 작은 축제(LOCAL). 마대륙 기념일도 있다.
// - 축제 동안의 일: 그 달 그 고장에 있으면 축제 성격(불놀이·장·술·겨룸·기림…)에 맞는 일이 한 번쯤 벌어진다(rt_game·rt_dance·rt_brawl·rt_pick·rt_fire·rt_vigil·rt_hunt).
//   겨룸은 놀이 겨룸만(노래·술·장작·줄다리기·수수께끼, 종족마다 따로). 활쏘기·마상·씨름·사냥 대회는 src/contest/ 몫이라 겹치지 않는다.
// - 축제 열기와 후원: 다음 달 축제가 있는 고장에서 넉넉하면 후원(rt_sponsor), 촌장·관직·영주면 내가 연다(rt_host). 새 놀이를 만들면 그 고장 풍습으로 남아 해마다 열린다.
// - 인생 의례: 이름 짓기(rt_naming, 내 아이가 나면), 성년식(rt_coming), 다른 풍습끼리 만난 혼례(rt_wedmix), 식구의 장례(rt_mourn). 풍습은 고장과 종족에 따라 다르다.
//   혼례·장례의 흐름은 love·elder가 맡고, 여기서는 풍습과 기록만 덧붙인다(내 장례 elder_funeral, 벗의 장례 fr_funeral과 겹치지 않게 부모·배우자·자식만).
// - NPC 의례: 알고 지내는 이웃의 아이 이름 짓기·성년·혼례·장례가 그 사람 풍습대로 한 줄씩 지나간다.
// 게임 난수는 건드리지 않는다(ownRng). 새 행동은 없다.
import { J, hasBatchim } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, living } from '../npc.js';
import { PLACES } from '../places.js';
import { raceOf } from '../races/index.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, tired, spend, canSpend, check } from '../adventure/core.js';
import { isJailed, crimeState } from '../crime.js';
import { feastAt } from '../rumor/index.js';
import { deed } from '../repute/index.js';
import { makeRng } from '../rng.js';
import * as T from './data.js';

T.setJosa(J);
const { CUSTOMS, LOCAL, FEAST_KIND, GAMES } = T;
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 곳';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 457) ^ Math.imul(mi(g) * 173 + salt + 61, 2654435761)) | 0 });
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.captive && !L(g).heirPending;
const statOf = (g, id) => me(g)?.stats?.[id] ?? g.player.stats?.[id] ?? 10;
const dark = (g) => { const c = crimeState(g); return (c.crimes ?? 0) > 0 || !!c.gang || (L(g).notoriety ?? 0) >= 10; };
const eul = (n) => J(n, '을/를');
const jj = (n, a, b) => n + (hasBatchim(n) ? a : b);

/* ---------- 문화 ---------- */
const REALM_CULT = { holy: 'holy', valhart: 'valhart', serenia: 'serenia', free: 'free', march: 'march', sea: 'sea', elf: 'elf', dwarf: 'dwarf', beast: 'beast', demon: 'demon' };
export const cultureOfPlace = (pl) => REALM_CULT[PLACES[pl]?.realm] ?? 'leonia';
// 사람의 풍습: 엘프·드워프·수인·마족은 종족 풍습, 사람·하프엘프·반마족은 사는 고장 풍습
export function cultureOf(p, pl) {
  const r = raceOf(p);
  if (r === 'elf' || r === 'dwarf' || r === 'beast' || r === 'demon') return r;
  return cultureOfPlace(pl);
}
const C = (cult) => CUSTOMS[cult] ?? CUSTOMS.leonia;

/* ---------- 달력 ---------- */
// 이 고장 이 달의 축제들 [{ name, kind, text, where, local }]
export function feastsAt(g, pl, m = g.date.month) {
  const out = [];
  const f = feastAt(g, pl, m);
  if (f) out.push({ name: f.name, kind: FEAST_KIND[f.name] ?? 'market', text: f.text, where: realmWord(pl), local: false });
  for (const x of LOCAL[pl] ?? []) if (x.m === m) out.push({ name: x.name, kind: x.kind, text: x.text, where: placeName(pl), local: true });
  const s = g.rites;
  for (const c of s?.made ?? []) if (c.place === pl && c.m === m) out.push({ name: c.name, kind: c.kind, text: c.text, where: placeName(pl), local: true, mine: true });
  return out;
}
const REALM_WORD = { leonia: '레오니아', holy: '성국', valhart: '발하르트', serenia: '세레니아', free: '자유도시들', march: '변경', sea: '섬들', elf: '엘프 숲', dwarf: '드워프 산', beast: '수인 부족', demon: '마대륙', wild: '레오니아' };
function realmWord(pl) { return REALM_WORD[PLACES[pl]?.realm] ?? '레오니아'; }
export function calendarAt(g, pl) {
  const out = [];
  for (let m = 1; m <= 12; m++) for (const f of feastsAt(g, pl, m)) out.push({ m, name: f.name, kind: f.kind, where: f.where, mine: !!f.mine });
  return out;
}
function nextFeast(g, pl) {
  for (let k = 1; k <= 12; k++) {
    const m = ((g.date.month - 1 + k) % 12) + 1;
    const fs = feastsAt(g, pl, m);
    if (fs.length) return { ...fs[0], m, in: k };
  }
  return null;
}

/* ---------- 상태 ---------- */
export function ritesState(g) {
  g.rites ??= {};
  const s = g.rites;
  s.home ??= null;      // 난 고장 (내 풍습의 바탕)
  s.sceneAt ??= -99;
  s.feastAt ??= -99;    // 마지막으로 축제 일이 벌어진 달
  s.done ??= {};        // coming: 달, sponsor: 달, host: 달
  s.made ??= [];        // 내가 만든 놀이 [{ place, m, name, kind, text, y, by }]
  s.mine ??= [];        // 내가 열거나 후원한 축제 [{ y, m, place, name, how }]
  s.rites ??= [];       // 내 인생 의례 [{ y, m, kind, who, text }]
  s.town ??= [];        // 이웃 의례 [{ y, m, kind, who, text }]
  s.seen ??= [];        // 이웃 의례를 이미 적은 사람·일 열쇠
  s.kids ??= null;      // 이미 본 내 아이 id
  s.fam ??= null;       // 지난달 살아 있던 식구 id
  s.spouse ??= null;
  s.used ??= [];
  s.month ??= [];
  s.log ??= [];
  s.tally ??= { scenes: 0, feasts: 0, naming: 0, coming: 0, wed: 0, funeral: 0, town: 0, hosted: 0, sponsored: 0 };
  return s;
}
const S = ritesState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function rite(g, kind, who, text) { const s = S(g); s.rites.push({ y: g.date.year, m: g.date.month, kind, who, text }); if (s.rites.length > 24) s.rites.shift(); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 30) s.used.shift();
  return i;
}
const myCult = (g) => cultureOf(me(g), S(g).home ?? here(g));
const feastHere = (g) => feastsAt(g, here(g))[0] ?? null;

/* ---------- 축제 동안의 일 ---------- */
function gamePool(g, pl) {
  const cult = cultureOfPlace(pl);
  const race = PLACES[pl]?.realm;
  const pool = race === 'elf' || race === 'dwarf' || race === 'beast' || race === 'demon' ? [...GAMES[race], ...GAMES.human.slice(0, 2)] : GAMES.human;
  const kid = playerAge(g) < 15;
  void cult;
  return kid ? pool.filter((x) => x.id !== 'drink' && x.id !== 'ale' && x.id !== 'ember') : pool;
}
const tag = (s) => `${s.feast}${s.local ? '' : ''}`;
defineScene('rt_game', {
  title: (g, s) => `${s.feast}: ${s.game}`,
  text: (g, s) => `${s.ftext} 광장 한쪽에서 ${s.game}가 한창이다. 구경꾼들이 둘러섰고, 누가 내 이름을 불렀다.`,
  choices: (g, s) => [{ label: '나선다', key: 'go' }, ...(canSpend(g, 5) && playerAge(g) >= 15 ? [{ label: '구경하며 은화 다섯 닢을 건다', key: 'bet' }] : []), { label: '빠진다', key: 'no' }],
  resolve(g, rng, s, key) {
    const gm = Object.values(GAMES).flat().find((x) => x.id === s.gid);
    S(g).tally.feasts += 1;
    if (key === 'go') {
      const win = check(rng, statOf(g, gm.stat) * 1.4 + 4, 22);
      if (win) { stress(g, -8); deed(g, 'brave', 2, `${s.feast} ${s.game}에서 이겼다.`); log(g, `${s.feast} ${s.game}에서 이겼다.`); rite(g, 'feast', null, `${placeName(s.place)} ${s.feast} ${s.game}에서 이겼다.`); if (gm.id === 'drink' || gm.id === 'ale') tired(g, 10); return gm.win; }
      stress(g, -3); if (gm.id === 'drink' || gm.id === 'ale') tired(g, 18); return gm.lose;
    }
    if (key === 'bet') {
      spend(g, 5);
      if (rng.chance(0.45)) { g.player.money += 11; return `내가 건 쪽이 이겼다. 은화 열한 닢이 되어 돌아왔다. ${s.game}는 보는 맛도 있다.`; }
      return `내가 건 쪽이 졌다. 은화 다섯 닢이 남의 주머니로 갔다. 이긴 사람이 술을 한 잔 샀으니 반은 돌려받은 셈이다.`;
    }
    stress(g, -2); return '사람들 어깨 너머로 구경만 했다. 고함과 웃음이 해 질 때까지 이어졌다.';
  },
});
defineScene('rt_dance', {
  title: (g, s) => `${s.feast}의 춤`,
  text: (g, s) => `${s.ftext} 해가 지자 악사들이 자리를 잡았다. ${T.DANCE[s.v](s.name)}`,
  choices: () => [{ label: '손을 놓지 않는다', key: 'hold' }, { label: '한 곡만 추고 물러난다', key: 'one' }, { label: '친구를 대신 떠민다', key: 'push' }],
  resolve(g, rng, s, key) {
    const p = s.pid != null ? byId(g, s.pid) : null;
    S(g).tally.feasts += 1;
    if (key === 'hold') { if (p?.alive) { p.known = true; p.affection = clamp((p.affection ?? 0) + 8, -100, 100); } stress(g, -10); log(g, `${s.feast} 밤에 ${J(s.name, '과/와')} 춤을 추었다.`); return `북소리가 그칠 때까지 손을 놓지 않았다. 불가에서 돌아서는 ${s.name}의 볼이 불빛 때문만은 아니게 붉었다. 이튿날 고장 사람들 입에 둘 이름이 같이 올랐다.`; }
    if (key === 'one') { if (p?.alive) { p.known = true; p.affection = clamp((p.affection ?? 0) + 3, -100, 100); } stress(g, -5); return `한 곡을 추고 고개를 숙였다. ${J(s.name, '은/는')} 웃으며 다른 줄로 섞여 들어갔다. 가볍고 좋은 밤이었다.`; }
    return `옆에 있던 친구를 ${s.name} 쪽으로 떠밀었다. 둘이 엉겁결에 돌기 시작했다. 친구는 이튿날 나를 째려보더니, 이레 뒤 고맙다고 했다.`;
  },
});
defineScene('rt_brawl', {
  title: (g, s) => `${s.feast}의 주먹다짐`,
  text: (g, s) => `${s.ftext} 술통 옆에서 고성이 오갔다. ${s.why} 의자가 넘어가고, 누가 먼저 주먹을 날렸다.`,
  choices: () => [{ label: '가운데로 들어가 말린다', key: 'stop' }, { label: '한쪽 편을 들어 끼어든다', key: 'join' }, { label: '자리를 피한다', key: 'leave' }],
  resolve(g, rng, s, key) {
    S(g).tally.feasts += 1;
    if (key === 'stop') {
      if (check(rng, statOf(g, 'str') + statOf(g, 'cha'), 20)) { deed(g, 'brave', 3, `${s.feast} 술자리 싸움을 말렸다.`); deed(g, 'kind', 2, ''); return '두 사람 사이에 몸을 밀어 넣고 양팔로 떼어 놓았다. 누가 술을 한 바가지씩 끼얹었다. 둘 다 씩씩거리다 결국 같이 마셨다. 이튿날 둘 다 나한테 고맙다고 했다.'; }
      tired(g, 12); stress(g, 4); return '말리다 주먹 한 방을 대신 맞았다. 눈두덩이 부었다. 그래도 그 덕에 싸움은 끝났다. 축제 내내 내 멍든 눈이 이야깃거리였다.';
    }
    if (key === 'join') { tired(g, 15); deed(g, 'kind', -2, `${s.feast}에 싸움판에 끼어들었다.`); return '한쪽 편을 들어 끼어들었다. 탁자가 하나 부서졌고, 술통 주인이 몽둥이를 들고 나왔다. 다들 흩어졌다. 손등이 터졌는데 어쩐지 웃음이 났다.'; }
    return '술잔을 들고 조용히 자리를 옮겼다. 등 뒤에서 탁자 부서지는 소리가 났다.';
  },
});
defineScene('rt_pick', {
  title: (g, s) => `${s.feast}의 소매치기`,
  text: (g, s) => `${s.ftext} 사람들 틈에서 누가 어깨를 툭 치고 지나갔다. 그 손이 ${s.mine ? '내 허리춤' : '앞에 선 늙은이의 전대'}에서 막 빠져나가는 게 보였다.`,
  choices: (g) => [{ label: '쫓아간다', key: 'chase' }, { label: '소리를 질러 사람들을 부른다', key: 'shout' }, ...(dark(g) && playerAge(g) >= 13 ? [{ label: '눈짓으로 한몫 달라고 한다', key: 'cut' }] : []), { label: '모른 척한다', key: 'let' }],
  resolve(g, rng, s, key) {
    const lose = s.mine ? Math.min(g.player.money, 6) : 0;
    S(g).tally.feasts += 1;
    if (key === 'chase') {
      if (check(rng, statOf(g, 'agi') * 1.5 + 2, 20)) { deed(g, 'brave', 2, `${s.feast}에 소매치기를 잡았다.`); return `골목 셋을 돌아 그 애 뒷덜미를 잡았다. 열두어 살쯤 된 아이였다. 전대를 돌려받았다.${s.mine ? '' : ' 늙은이가 내 손을 잡고 몇 번이고 흔들었다.'}`; }
      g.player.money -= lose; tired(g, 8); return `사람들 틈에서 놓쳤다.${lose ? ` 은화 ${lose}닢이 사라졌다.` : ' 늙은이는 한숨을 쉬었다.'} 축제엔 늘 이런 손이 있다.`;
    }
    if (key === 'shout') { if (rng.chance(0.5)) { deed(g, 'honest', 1, ''); return '"소매치기다!" 소리에 장정 몇이 달려들었다. 아이는 전대를 던지고 달아났다.'; } g.player.money -= lose; return `소리를 질렀지만 북소리에 묻혔다.${lose ? ` 은화 ${lose}닢을 잃었다.` : ''}`; }
    if (key === 'cut') { g.player.money += 4; deed(g, 'honest', -2, '', here(g), { lie: true }); crimeState(g).crimes = (crimeState(g).crimes ?? 0) + 0; return '눈이 마주쳤다. 아이가 씩 웃더니 은화 네 닢을 내 손바닥에 떨어뜨리고 사라졌다. 축제는 누구에게나 대목이다.'; }
    g.player.money -= lose; return lose ? `못 본 척했다. 집에 와서 보니 내 전대도 가벼워져 있었다. 은화 ${lose}닢.` : '못 본 척했다. 늙은이가 장 끝에서 전대를 더듬으며 울상이 되는 걸 등 뒤로 느꼈다.';
  },
});
defineScene('rt_fire', {
  title: (g, s) => `${s.feast}의 불`,
  text: (g, s) => `${s.ftext} 바람이 한 번 세게 불었다. 불똥이 날아가 ${s.what}에 옮겨붙었다. 비명이 났다.`,
  choices: () => [{ label: '불 속으로 뛰어든다', key: 'in' }, { label: '물동이 줄을 세운다', key: 'line' }, { label: '아이들을 데리고 물러선다', key: 'back' }],
  resolve(g, rng, s, key) {
    S(g).tally.feasts += 1;
    if (key === 'in') {
      if (check(rng, statOf(g, 'agi') + statOf(g, 'wil'), 18)) { deed(g, 'brave', 5, `${s.feast} 불 속에서 사람을 끌어냈다.`); chron(g, `${placeName(s.place)} ${s.feast}에 불이 났을 때 불 속에서 사람을 끌어냈다.`, 30); note(g, `${s.feast} 불 속에서 사람을 끌어냈다.`); return '연기 속에서 기침하는 아이 하나를 안고 나왔다. 머리카락 끝이 그슬렸다. 그 아이 어머니가 내 발치에 엎드렸다. 그해 축제는 그 일로 기억되었다.'; }
      tired(g, 15); stress(g, 6); return '불 속에 뛰어들었다가 연기에 쓰러졌다. 사람들이 나를 끌어냈다. 팔에 덴 자국이 남았다. 안에 있던 사람은 다른 문으로 나왔다고 했다.';
    }
    if (key === 'line') { if (check(rng, statOf(g, 'cha') + statOf(g, 'int'), 18)) { deed(g, 'kind', 3, `${s.feast} 불을 끄는 데 앞장섰다.`); return '"우물에서 여기까지 한 줄로!" 소리치자 사람들이 줄을 섰다. 물동이가 손에서 손으로 넘어갔다. 불은 처마 하나만 태우고 꺼졌다.'; } tired(g, 10); return '줄을 세우려 했지만 다들 우왕좌왕했다. 불은 결국 저절로 잦아들었다. 그 집은 반이 탔다.'; }
    stress(g, 3); return '아이들 손을 잡고 광장 끝으로 물러섰다. 불은 어른들이 껐다. 아이들은 그날 밤 내 옷자락을 놓지 않았다.';
  },
});
defineScene('rt_vigil', {
  title: (g, s) => s.feast,
  text: (g, s) => `${s.ftext}${s.dead ? ` 올해는 ${s.dead}의 이름도 부른다.` : ''}`,
  choices: (g, s) => [{ label: s.dead ? `${s.dead}의 이름을 소리 내어 부른다` : '모르는 이름들 사이에 앉아 있는다', key: 'name' }, { label: '혼자 온 낯선 사람 곁에 앉는다', key: 'stranger' }, { label: '일찍 집에 돌아간다', key: 'home' }],
  resolve(g, rng, s, key) {
    S(g).tally.feasts += 1;
    if (key === 'name') { stress(g, s.dead ? -12 : -5); if (s.dead) log(g, `${s.feast}에 ${s.dead}의 이름을 불렀다.`); return s.dead ? `${s.dead}의 이름을 불렀다. 목소리가 생각보다 크게 나왔다. 옆 사람이 내 어깨에 손을 얹었다. 누구도 무어라 하지 않았다.` : '남의 이름들을 들었다. 다들 누군가를 잃었다. 그게 이상하게 위로가 되었다.'; }
    if (key === 'stranger') { stress(g, -6); return `혼자 앉은 사람 곁에 앉았다. 그는 먼 데서 왔다고 했다. ${s.feast}에 부를 이름이 하나 있어서. 둘이 해 뜰 때까지 별 말 없이 앉아 있었다.`; }
    return '일찍 돌아왔다. 문간에서 바라보니 광장의 불빛이 늦게까지 꺼지지 않았다.';
  },
});
defineScene('rt_hunt', {
  title: (g, s) => s.feast,
  text: (g, s) => `${s.ftext} 부족 젊은이들이 숲 어귀에 모였다. 사람 손님이라도 함께 가겠다면 막지 않는다고 했다.`,
  choices: () => [{ label: '맨손으로 따라 들어간다', key: 'go' }, { label: '숲 어귀에서 불을 지키며 기다린다', key: 'wait' }],
  resolve(g, rng, s, key) {
    S(g).tally.feasts += 1;
    if (key === 'go') {
      if (check(rng, statOf(g, 'agi') + statOf(g, 'sen'), 22)) { deed(g, 'brave', 4, `${s.feast}에 수인 젊은이들과 사냥을 했다.`); tired(g, 20); return '사흘 뒤 멧돼지 한 마리를 넷이 함께 메고 나왔다. 부족 사람들이 울음으로 맞았다. 그날부터 이 부족은 나를 손님이라 부르지 않았다.'; }
      tired(g, 30); stress(g, 5); return '이틀째에 길을 잃었다. 수인 아이 하나가 냄새로 나를 찾아 데리고 나왔다. 부족 사람들은 웃었지만 나쁘게 웃지는 않았다.';
    }
    stress(g, -4); return '숲 어귀에서 사흘 동안 불을 지켰다. 돌아온 젊은이들이 고기 첫 점을 나에게 건넸다. 불을 지킨 사람 몫이라고 했다.';
  },
});

const BRAWL_WHY = ['술값을 누가 내느냐로 시작된 말다툼이었다.', '누구네 딸에게 누가 먼저 꽃을 줬느냐가 발단이었다.', '지난해 겨룸에서 누가 속였느냐는 묵은 이야기였다.', '이웃 고장 사람이 이 고장 술을 맹물 같다고 한 것이 화근이었다.'];
const FIRE_WHAT = ['장막 천막', '짚단 더미', '술집 처마', '구경꾼의 외투 자락'];
function feastScene(g, rng, f) {
  const s = S(g), pl = here(g), age = playerAge(g), base = { feast: f.name, ftext: f.text, place: pl, local: f.local };
  const opts = [];
  const k = f.kind;
  if (k === 'grim') return null;
  if (['contest', 'market', 'harvest', 'drink', 'parade', 'fire'].includes(k)) opts.push('game');
  if (['harvest', 'fire', 'drink', 'market'].includes(k) && age >= 15) opts.push('dance');
  if (['drink', 'market', 'contest'].includes(k) && age >= 15) opts.push('brawl');
  if (['market', 'parade', 'harvest'].includes(k)) opts.push('pick');
  if (['fire', 'vigil'].includes(k) || (k === 'harvest' && rng.chance(0.3))) opts.push('fire');
  if (['mourn', 'vigil', 'sacred'].includes(k)) opts.push('vigil', 'vigil');
  if (k === 'hunt' && age >= 13) opts.push('hunt', 'hunt');
  // 같은 갈래의 일은 세 해에 한 번만 (해마다 같은 축제에 같은 장면이 뜨지 않게)
  s.by ??= {};
  const now = mi(g);
  const fresh = opts.filter((o) => now - (s.by[o] ?? -99) >= 30);
  if (!fresh.length) return null;
  const pick = fresh[pickFresh(g, rng, 'f', fresh)];
  s.by[pick] = now;
  if (pick === 'game') { const pool = gamePool(g, pl); const gm = pool[pickFresh(g, rng, `g${pl}`, pool)]; return ['rt_game', { ...base, gid: gm.id, game: gm.name }]; }
  if (pick === 'dance') {
    const mine = me(g);
    const cand = living(g).filter((p) => !p.isPlayer && p.sex !== mine.sex && p.ageMonths >= 15 * 12 && Math.abs(p.ageMonths - mine.ageMonths) <= 12 * 8 && !p.spouseId && p.id !== mine.spouseId);
    if (mine.spouseId) { const sp = byId(g, mine.spouseId); if (sp?.alive) return ['rt_dance', { ...base, v: rng.int(0, T.DANCE.length - 1), name: sp.name, pid: sp.id }]; }
    if (!cand.length) return null;
    const p = rng.pick(cand);
    return ['rt_dance', { ...base, v: rng.int(0, T.DANCE.length - 1), name: p.name, pid: p.id }];
  }
  if (pick === 'brawl') return ['rt_brawl', { ...base, why: BRAWL_WHY[pickFresh(g, rng, 'b', BRAWL_WHY)] }];
  if (pick === 'pick') return ['rt_pick', { ...base, mine: (g.player.money ?? 0) >= 6 && rng.chance(0.5) }];
  if (pick === 'fire') return ['rt_fire', { ...base, what: FIRE_WHAT[pickFresh(g, rng, 'w', FIRE_WHAT)] }];
  if (pick === 'hunt') return ['rt_hunt', base];
  // 기림: 죽은 식구가 있으면 그 이름
  const dead = [me(g).fatherId, me(g).motherId, me(g).spouseId, ...(me(g).childIds ?? [])].map((id) => (id != null ? byId(g, id) : null)).filter((p) => p && !p.alive);
  return ['rt_vigil', { ...base, dead: dead.length ? rng.pick(dead).name : null }];
}

/* ---------- 축제 열기와 후원 ---------- */
const canHost = (g, pl) => g.village?.heads?.[pl]?.me || g.village?.office?.place === pl || (g.domain && (g.domain.place ?? 'gruental') === pl);
const MADE = [
  { kind: 'contest', name: (n) => `${n} 겨루기`, text: (n, w) => `${n}${hasBatchim(n) ? '이' : '가'} 처음 열었다는 놀이. ${w}` },
];
const MADE_GAMES = [
  { w: '돼지에 기름을 발라 풀어놓고 맨손으로 잡는다. 잡는 사람보다 넘어지는 사람이 훨씬 많다.', kind: 'contest', tail: '돼지 잡기' },
  { w: '긴 장대 끝에 매단 햄을 맨손으로 기어올라 떼어 온다. 장대에는 비누칠을 한다.', kind: 'contest', tail: '장대 오르기' },
  { w: '광장 한가운데 거대한 빵을 굽고 한 조각씩 나눈다. 조각 속 마른 콩을 찾은 사람이 하루 동안 고장의 왕이다.', kind: 'harvest', tail: '콩 빵 나누기' },
  { w: '등불 백 개를 강물에 띄우고 가장 멀리 간 등불의 주인에게 술 한 통을 준다.', kind: 'vigil', tail: '등불 띄우기' },
];
defineScene('rt_sponsor', {
  title: (g, s) => `${s.feast} 준비`,
  text: (g, s) => `다음 달이 ${s.feast}다. ${placeName(s.place)} 사람들이 장막과 술통 값을 걷으러 다닌다. 고장 어른 하나가 내 집 문을 두드렸다. "올해는 좀 넉넉히 보태 주시면…"`,
  choices: (g, s) => [...(canSpend(g, s.big) ? [{ label: `크게 보탠다 (은화 ${s.big})`, key: 'big' }] : []), ...(canSpend(g, s.small) ? [{ label: `조금 보탠다 (은화 ${s.small})`, key: 'small' }] : []), { label: '형편이 어렵다고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.sponsor = mi(g);
    if (key === 'big') { spend(g, s.big); deed(g, 'generous', 6, `${s.feast}에 큰돈을 보탰다.`); st.mine.push({ y: g.date.year, m: g.date.month, place: s.place, name: s.feast, how: '크게 후원' }); st.tally.sponsored += 1; log(g, `${s.feast}에 은화 ${s.big}닢을 보탰다.`); return `어른이 은화 자루를 받아 들고 두 번 절했다. 다음 달 축제 광장 한가운데 장막에 내 이름이 적힌 천이 걸렸다. 사람들이 그 앞을 지날 때마다 한 번씩 올려다보았다.`; }
    if (key === 'small') { spend(g, s.small); deed(g, 'generous', 2, ''); st.mine.push({ y: g.date.year, m: g.date.month, place: s.place, name: s.feast, how: '조금 보탬' }); st.tally.sponsored += 1; return '은화 몇 닢을 쥐여 보냈다. 어른은 고맙다고 했다. 장부 아래쪽 어딘가에 내 이름이 적혔을 것이다.'; }
    deed(g, 'generous', -2, `${s.feast}에 한 푼도 보태지 않았다.`); return '형편이 어렵다고 했다. 어른은 알겠다며 돌아갔다. 그 뒤로 장터에서 몇몇이 내 쪽을 보며 수군거렸다.';
  },
});
defineScene('rt_host', {
  title: (g, s) => `내가 여는 ${s.feast}`,
  text: (g, s) => `다음 달 ${s.feast}는 올해 내가 연다. 고장을 맡은 사람의 몫이다. 무엇을 얼마나 차릴지 정해야 한다.`,
  choices: (g, s) => [...(canSpend(g, s.big) ? [{ label: `성대하게 연다 (은화 ${s.big})`, key: 'grand' }] : []), ...(canSpend(g, s.big) && s.newOk ? [{ label: `새 놀이를 하나 만든다 (은화 ${s.big})`, key: 'new' }] : []), { label: `소박하게 치른다 (은화 ${s.small})`, key: 'plain' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.host = mi(g); st.tally.hosted += 1;
    if (key === 'grand') { spend(g, s.big); deed(g, 'generous', 8, `${s.feast}를 성대하게 열었다.`); st.mine.push({ y: g.date.year, m: g.date.month, place: s.place, name: s.feast, how: '성대하게 엶' }); chron(g, `${placeName(s.place)}의 ${s.feast}를 성대하게 열었다.`, 25); return '소를 두 마리 잡고 술통을 스무 개 열었다. 이웃 고장에서까지 사람들이 왔다. 늙은이들은 이런 축제는 처음 본다고 했고, 그 말은 몇 해를 두고 되풀이되었다.'; }
    if (key === 'new') {
      spend(g, s.big);
      const mg = MADE_GAMES[pickFresh(g, rng, 'mg', MADE_GAMES)];
      const nm = me(g).name;
      const name = `${nm}의 ${mg.tail}`;
      if (!st.made.some((c) => c.place === s.place && c.name === name)) st.made.push({ place: s.place, m: s.fm, name, kind: mg.kind, text: `${placeName(s.place)} 사람들이 ${s.feast} 뒤에 따로 여는 놀이. ${nm}${hasBatchim(nm) ? '이' : '가'} 처음 열었다. ${mg.w}`, y: g.date.year, by: nm });
      if (st.made.length > 6) st.made.shift();
      deed(g, 'generous', 5, `${s.feast}에 새 놀이를 만들었다.`);
      st.mine.push({ y: g.date.year, m: g.date.month, place: s.place, name: s.feast, how: `새 놀이 '${mg.tail}'` });
      chron(g, `${placeName(s.place)}에 새 놀이 '${name}'가 생겼다.`, 40);
      return `${mg.w} 처음엔 다들 어리둥절했지만 해가 지기 전에 광장이 웃음으로 가득 찼다. 누가 그 놀이를 '${name}'라고 부르기 시작했다. 내년에도, 그다음 해에도 열릴 것이다.`;
    }
    spend(g, Math.min(s.small, g.player.money)); st.mine.push({ y: g.date.year, m: g.date.month, place: s.place, name: s.feast, how: '소박하게 엶' }); return '빵과 술을 넉넉히 내고 악사를 하나 불렀다. 그것으로 충분했다. 사람들은 소박한 축제가 오히려 오래간다고 했다.';
  },
});

/* ---------- 인생 의례 ---------- */
function nameFor(g, rng, how, kid, cult) {
  const sx = kid.sex === 'm' ? 'm' : 'f';
  if (how === 'elder') {
    const mine = me(g);
    const anc = [mine.fatherId, mine.motherId].map((id) => (id != null ? byId(g, id) : null)).filter((p) => p && p.sex === kid.sex && p.name !== kid.name);
    const sp = mine.spouseId != null ? byId(g, mine.spouseId) : null;
    const anc2 = sp ? [sp.fatherId, sp.motherId].map((id) => (id != null ? byId(g, id) : null)).filter((p) => p && p.sex === kid.sex && p.name !== kid.name) : [];
    const a = anc[0] ?? anc2[0];
    return a ? { name: a.name, from: a.name } : null;
  }
  if (how === 'saint') return { name: rng.pick(T.SAINTS[sx]) };
  if (how === 'star') return { name: rng.pick(T.STARS[sx]) };
  if (how === 'beast') return { name: rng.pick(T.BEASTS[sx]) };
  if (how === 'milk') return { milk: rng.pick(T.MILK) };
  void cult;
  return null;
}
defineScene('rt_naming', {
  keep: true,
  title: (g, s) => `${s.kid}의 이름 짓기`,
  text: (g, s) => `${C(s.cult).name.when}. ${C(s.cult).name.text} 아이는 지금 ${jj(s.kid, '이라고', '라고')} 불린다.`,
  choices: (g, s) => s.ways.map((w) => ({ label: T.NAME_WAY[w].label, key: w })),
  resolve(g, rng, s, key) {
    const st = S(g); st.tally.naming += 1;
    const kid = byId(g, s.kidId);
    if (!kid) return '아이 이름은 이미 정해져 있었다.';
    const r = key === 'keep' ? null : nameFor(g, rng, key, kid, s.cult);
    if (r?.milk) {
      rite(g, 'name', kid.name, `${kid.name}에게 젖이름 '${r.milk}'를 붙였다. 진짜 이름은 아이가 커서 얻는다.`);
      kid.history.push({ y: g.date.year, m: g.date.month, text: `어릴 적 젖이름은 '${r.milk}'였다.` });
      return `"${r.milk}." 그렇게 부르자 아이가 처음으로 웃었다. 우스운 이름이다. 그래야 마신의 귀에 걸리지 않는다고 늙은이들이 말했다. 아이가 커서 제 이름을 얻을 때까지 이 이름으로 부를 것이다.`;
    }
    if (r?.name && r.name !== kid.name) {
      const old = kid.name;
      kid.name = r.name;
      kid.history.push({ y: g.date.year, m: g.date.month, text: r.from ? `${r.from}의 이름을 물려받았다.` : `이름 짓는 날 ${jj(r.name, '이라는', '라는')} 이름을 받았다.` });
      rite(g, 'name', r.name, r.from ? `아이에게 ${r.from}의 이름을 물려주었다.` : `아이 이름을 ${r.name}${hasBatchim(r.name) ? '으로' : '로'} 지었다.`);
      log(g, `${old}였던 아이를 ${r.name}${hasBatchim(r.name) ? '이라' : '라'} 불렀다.`);
      return r.from ? `"${r.name}." ${r.from}의 이름을 부르자 늙은 친척들 몇이 눈시울을 붉혔다. 이름은 이렇게 한 번 더 산다.` : `"${r.name}." 이웃들이 따라 불렀다. 이름이 아이 얼굴에 금세 붙었다.`;
    }
    rite(g, 'name', kid.name, `아이 이름을 ${kid.name}${hasBatchim(kid.name) ? '으로' : '로'} 불렀다.`);
    return `"${kid.name}." 지어 둔 이름을 소리 내어 부르자 이웃들이 따라 불렀다. 그걸로 이 아이는 이 고장 사람이 되었다.`;
  },
});
defineScene('rt_coming', {
  title: (g, s) => C(s.cult).coming.title,
  text: (g, s) => C(s.cult).coming.text,
  choices: (g, s) => { const c = C(s.cult).coming; return [{ label: c.tryL, key: 'try' }, { label: c.easyL, key: 'easy' }, { label: c.skipL, key: 'skip' }]; },
  resolve(g, rng, s, key) {
    const st = S(g), c = C(s.cult).coming, cn = `${T.CULTURE_NAME[s.cult]} 풍습의 ${c.title}`; st.tally.coming += 1;
    if (key === 'try') {
      const ok = check(rng, statOf(g, c.stat) * 1.6 + 6, 20);
      if (ok) { deed(g, 'brave', 3, `${eul(c.title)} 훌륭히 치렀다.`); stress(g, -6); rite(g, 'coming', null, `${cn}: 어른들이 고개를 끄덕였다. 이제 어른이다.`); note(g, `${eul(c.title)} 치르고 어른이 되었다.`); return c.ok; }
      stress(g, 4); rite(g, 'coming', null, `${cn}: 서툴렀지만 끝까지 치렀다.`); note(g, `${eul(c.title)} 치렀다.`); return c.bad;
    }
    if (key === 'easy') { rite(g, 'coming', null, `${cn}: 남들처럼 치렀다.`); note(g, `${eul(c.title)} 치렀다.`); return c.easy; }
    stress(g, 3); rite(g, 'coming', null, `${cn}: 치르지 않았다.`); return c.skip;
  },
});
defineScene('rt_wedmix', {
  title: (g, s) => `${J(s.who, '과/와')}의 혼례 풍습`,
  text: (g, s) => `${T.WEDMIX[s.v](T.CULTURE_NAME[s.a], T.CULTURE_NAME[s.b])} ${C(s.a).wed} ${C(s.b).wed}`,
  choices: (g, s) => [{ label: `${T.CULTURE_NAME[s.a]} 풍습대로 한다`, key: 'mine' }, { label: `${T.CULTURE_NAME[s.b]} 풍습대로 한다`, key: 'theirs' }, { label: '두 풍습을 다 따른다', key: 'both' }],
  resolve(g, rng, s, key) {
    const st = S(g);
    const sp = byId(g, s.pid);
    if (key === 'mine') { if (sp) sp.affection = clamp((sp.affection ?? 0) - 3, -100, 100); rite(g, 'wed', s.who, `${T.CULTURE_NAME[s.a]} 풍습으로 혼례를 치렀다.`); return `내 고장 풍습대로 했다. ${s.who}의 친척들은 끝까지 어색하게 웃었다. ${J(s.who, '은/는')} 괜찮다고 했지만, 그날 밤 조금 말이 없었다.`; }
    if (key === 'theirs') { if (sp) sp.affection = clamp((sp.affection ?? 0) + 6, -100, 100); rite(g, 'wed', s.who, `${T.CULTURE_NAME[s.b]} 풍습으로 혼례를 치렀다.`); return `${s.who}의 풍습대로 했다. 낯선 의식마다 한 박자씩 늦었다. 그때마다 ${J(s.who, '이/가')} 소매를 당겨 알려 주었다. 그게 좋았다.`; }
    tired(g, 12); if (sp) sp.affection = clamp((sp.affection ?? 0) + 4, -100, 100); rite(g, 'wed', s.who, `${T.CULTURE_NAME[s.a]}와 ${T.CULTURE_NAME[s.b]} 두 풍습으로 혼례를 두 번 치렀다.`); st.tally.wed += 1; return '혼례를 두 번 치렀다. 하객들은 잔치를 두 번 먹었고, 신랑 신부만 녹초가 되었다. 두 집안 늙은이들이 서로의 풍습을 흉보다가 결국 같은 술통 앞에 앉았다.';
  },
});
defineScene('rt_mourn', {
  keep: true,
  title: (g, s) => `${s.who}의 장례`,
  text: (g, s) => `${s.rel} ${J(s.who, '이/가')} 세상을 떠났다. ${C(s.cult).funeral}`,
  choices: (g, s) => [...(canSpend(g, s.cost) ? [{ label: `풍습대로 크게 치른다 (은화 ${s.cost})`, key: 'grand' }] : []), { label: '식구끼리 조촐하게 보낸다', key: 'small' }, { label: '내가 아는 방식으로 혼자 보낸다', key: 'own' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.tally.funeral += 1;
    if (key === 'grand') { spend(g, s.cost); stress(g, -10); deed(g, 'loyal', 3, `${s.who}의 장례를 풍습대로 크게 치렀다.`); rite(g, 'funeral', s.who, `${T.CULTURE_NAME[s.cult]} 풍습대로 크게 장례를 치렀다.`); return `고장 사람들이 다 왔다. ${s.who}${hasBatchim(s.who) ? '이' : '가'} 살아서 받지 못한 대접을 죽어서 받는 것 같았다. 그래도 그걸로 조금은 갚은 것 같았다.`; }
    if (key === 'small') { stress(g, -4); rite(g, 'funeral', s.who, '식구끼리 조촐하게 장례를 치렀다.'); return `식구들만 모였다. 누가 ${s.who}의 버릇 하나를 흉내 내자 다들 울다 웃었다.`; }
    stress(g, 2); rite(g, 'funeral', s.who, '풍습을 따르지 않고 혼자 보냈다.'); return `풍습대로 하지 않았다. 혼자 ${s.who}${hasBatchim(s.who) ? '이' : '가'} 좋아하던 자리에 가서 한참 앉아 있었다. 고장 사람들 몇은 그걸 두고 말이 많았다.`;
  },
});

/* ---------- 식구 지켜보기: 아이·혼인·죽음 ---------- */
const famIds = (g) => { const m = me(g); return [m.fatherId, m.motherId, m.spouseId, ...(m.childIds ?? [])].filter((id) => id != null); };
const REL = (g, p) => { const m = me(g); if (p.id === m.fatherId) return '아버지'; if (p.id === m.motherId) return '어머니'; if (p.id === m.spouseId || p.spouseWas === m.id) return p.sex === 'm' ? '남편' : '아내'; return p.sex === 'm' ? '아들' : '딸'; };
function familyTick(g, rng, q) {
  const s = S(g), m = me(g);
  if (!m) return;
  // 아이
  const kids = (m.childIds ?? []).map((id) => byId(g, id)).filter(Boolean);
  if (s.kids == null) s.kids = kids.map((k) => k.id);
  for (const k of kids) {
    if (s.kids.includes(k.id)) continue;
    s.kids.push(k.id);
    if (k.ageMonths > 6 || !k.alive) continue;
    const cult = cultureOf(m, here(g));
    if (!sceneQueued(g, 'rt_naming')) q('rt_naming', { kidId: k.id, kid: k.name, cult, ways: C(cult).name.ways }, true);
  }
  if (s.kids.length > 30) s.kids = s.kids.slice(-30);
  // 혼인
  if (m.spouseId != null && m.spouseId !== s.spouse) {
    const sp = byId(g, m.spouseId);
    s.spouse = m.spouseId;
    if (sp) {
      const a = myCult(g), b = cultureOf(sp, here(g));
      S(g).tally.wed += 1;
      if (a !== b && !sceneQueued(g, 'rt_wedmix')) q('rt_wedmix', { pid: sp.id, who: sp.name, a, b, v: rng.int(0, T.WEDMIX.length - 1) }, false);
      else { rite(g, 'wed', sp.name, C(a).wed); line(g, 'wed', `혼례 풍습: ${C(a).wed}`); }
    }
  } else if (m.spouseId == null) s.spouse = null;
  // 죽음
  const ids = famIds(g);
  if (s.fam == null) { s.fam = ids.filter((id) => byId(g, id)?.alive); return; }
  for (const id of s.fam) {
    const p = byId(g, id);
    if (!p || p.alive) continue;
    const cult = cultureOf(p, here(g));
    const rel = REL(g, p);
    if (!sceneQueued(g, 'rt_mourn') && playerAge(g) >= 12) q('rt_mourn', { who: p.name, rel, cult, cost: clamp(Math.round((g.player.money ?? 0) * 0.1 / 5) * 5, 10, 60) }, false);
    else rite(g, 'funeral', p.name, C(cult).funeral);
  }
  s.fam = ids.filter((id) => byId(g, id)?.alive);
}

/* ---------- 이웃 의례 ---------- */
function townTick(g, rng) {
  const s = S(g), now = mi(g), pl = here(g);
  const seen = new Set(s.seen);
  const out = [];
  const recent = (p, re) => { const h = p.history?.[p.history.length - 1]; return h && h.y * 12 + h.m >= now - 1 && re.test(h.text); };
  for (const p of g.people) {
    if (p.isPlayer || out.length >= 3) continue;
    const parent = (id) => (id != null ? byId(g, id) : null);
    const known = p.known || parent(p.fatherId)?.known || parent(p.motherId)?.known;
    if (!known) continue;
    const cult = cultureOf(p, pl), c = C(cult);
    if (p.alive && p.ageMonths <= 2 && !seen.has(`b${p.id}`)) { seen.add(`b${p.id}`); const pa = parent(p.fatherId) ?? parent(p.motherId); if (pa) out.push({ kind: 'name', who: p.name, text: `${pa.name}네 집에 아이가 났다. ${c.name.when}, 이웃들이 모여 ${jj(p.name, '이라는', '라는')} 이름을 불렀다.` }); continue; }
    if (p.alive && p.ageMonths >= c.coming.age * 12 && p.ageMonths < c.coming.age * 12 + 2 && !seen.has(`c${p.id}`)) { seen.add(`c${p.id}`); out.push({ kind: 'coming', who: p.name, text: `${J(p.name, '이/가')} ${c.coming.title}${hasBatchim(c.coming.title) ? '을' : '를'} 치렀다. 이제 ${T.CULTURE_NAME[cult]} 풍습으로 어른이다.` }); continue; }
    if (p.alive && p.spouseId != null && !seen.has(`w${p.id}`) && recent(p, /혼인/)) { seen.add(`w${p.id}`); seen.add(`w${p.spouseId}`); const sp = byId(g, p.spouseId); out.push({ kind: 'wed', who: p.name, text: `${J(p.name, '과/와')} ${sp?.name ?? '짝'}의 혼례. ${c.wed}` }); continue; }
    if (!p.alive && !seen.has(`d${p.id}`) && recent(p, /세상을 떠났다/)) { seen.add(`d${p.id}`); out.push({ kind: 'funeral', who: p.name, text: `${p.name}의 장례. ${c.funeral.split('. ')[0]}.` }); continue; }
  }
  s.seen = [...seen].slice(-240);
  for (const x of out) { s.town.push({ y: g.date.year, m: g.date.month, ...x }); s.tally.town += 1; }
  if (s.town.length > 20) s.town.splice(0, s.town.length - 20);
  if (out.length) line(g, 'town', rng.pick(out).text.replace(/\.\.$/, '.'));
}

/* ---------- 한 달 ---------- */
function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over || !me(g)) return;
  const now = mi(g), age = playerAge(g);
  if (s.home == null) s.home = here(g);
  s.since ??= now; // 첫 한 해는 지켜보기만 (저장을 불러온 직후나 갑자기 어른이 된 판에서 축제 일이 몰리지 않게)
  const settled = now - s.since >= 12;
  const rng = ownRng(g, 7);
  const q = (kind, data, first) => { queueScene(g, kind, data, { first }); s.sceneAt = now; s.tally.scenes += 1; return true; };
  familyTick(g, ownRng(g, 13), q);
  townTick(g, ownRng(g, 17));
  if (!free(g)) return;
  const pl = here(g);
  // 이달 축제
  const fs = feastsAt(g, pl);
  if (fs.length) {
    const f = fs[0];
    // 나라 축제의 줄은 세상의 소리(feastLine)가 맡는다: 여기선 고장 축제와 내가 만든 놀이만
    for (const x of fs.filter((y) => y.local)) line(g, 'feast', x.mine ? `${x.name}: 올해도 열렸다. 아이들이 벌써 규칙을 다 외운다.` : `${x.name}: ${x.text.split('. ')[0]}.`);
    if (settled && age >= 8 && now - s.feastAt >= 20 && now - s.sceneAt >= 3 && L(g).queue.length === 0 && !L(g).scene && !g.pendingEvent && rng.chance(0.35)) {
      const sc = feastScene(g, rng, f);
      if (sc) { s.feastAt = now; q(sc[0], sc[1], false); }
    }
  }
  // 성년식
  const cult = myCult(g), co = C(cult).coming;
  if (!s.done.coming && age === co.age && L(g).queue.length < 2) { s.done.coming = now; q('rt_coming', { cult }, false); return; }
  if (age > co.age + 1 && !s.done.coming) s.done.coming = -1;
  // 다음 달 축제 준비: 열기·후원
  if (!settled || age < 18 || L(g).queue.length > 0 || g.pendingEvent) return;
  const nm = (g.date.month % 12) + 1;
  const nf = feastsAt(g, pl, nm).find((x) => x.kind !== 'grim' && !x.mine);
  if (!nf) return;
  const money = g.player.money ?? 0;
  if (canHost(g, pl) && now - (s.done.host ?? -99) >= 10 && rng.chance(0.5)) {
    const big = clamp(Math.round(money * 0.2 / 10) * 10, 40, 160), small = 15;
    return q('rt_host', { feast: nf.name, place: pl, fm: nm, big, small, newOk: !s.made.some((c) => c.place === pl) }, false);
  }
  if (money >= 120 && now - (s.done.sponsor ?? -99) >= 24 && rng.chance(0.18)) {
    const big = clamp(Math.round(money * 0.12 / 5) * 5, 20, 100), small = clamp(Math.round(big / 4 / 5) * 5, 5, 25);
    return q('rt_sponsor', { feast: nf.name, place: pl, big, small }, false);
  }
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.rites = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g);
  // 새 머리: 식구·아이·짝은 다시 본다. 내가 만든 놀이와 연 축제는 고장에 남는다
  s.kids = null; s.fam = null; s.spouse = me(g)?.spouseId ?? null; s.done = {}; s.home = here(g); s.sceneAt = mi(g);
  log(g, '대가 바뀌었다. 축제는 그대로 돌아온다.');
});

/* ---------- 화면 연결점 ---------- */
export function ritesLines(g) { return (g.rites?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function ritesLine(g) { return ritesLines(g)[0]?.text ?? null; }
/** 이번 달 작은 카드: { place, now:[{name,kind,where,m,in,text}], next } */
export function ritesNow(g) {
  const pl = here(g);
  const now = feastsAt(g, pl).map((f) => ({ name: f.name, kind: f.kind, kindWord: T.KIND_WORD[f.kind] ?? '', where: f.where, m: g.date.month, in: 0, text: f.text, mine: !!f.mine }));
  const n = nextFeast(g, pl);
  return { place: placeName(pl), now, next: n ? { name: n.name, kind: n.kind, kindWord: T.KIND_WORD[n.kind] ?? '', where: n.where, m: n.m, in: n.in, text: n.text } : null };
}
/** '사람들' 카드: { place, line, calendar, mine, customs, rites, log } */
export function ritesInfo(g) {
  const s = S(g), pl = here(g);
  const cal = calendarAt(g, pl);
  const cult = me(g) ? myCult(g) : 'leonia', c = C(cult);
  return {
    place: placeName(pl),
    line: `${placeName(pl)}에는 한 해에 축제가 ${cal.length}번 있다.${cal.length ? ` 다음은 ${nextFeast(g, pl)?.name ?? ''}.` : ''}`,
    calendar: cal,
    mine: s.mine.slice(-8).reverse().map((x) => ({ ...x, placeName: placeName(x.place) })),
    customs: {
      culture: cult, name: T.CULTURE_NAME[cult],
      naming: c.name.text, coming: { age: c.coming.age, title: c.coming.title }, wed: c.wed, funeral: c.funeral,
      made: s.made.map((x) => ({ name: x.name, place: placeName(x.place), m: x.m, by: x.by, y: x.y })),
    },
    rites: [...s.rites.map((x) => ({ ...x, mine: true })), ...s.town.map((x) => ({ ...x, mine: false }))].sort((a, b) => (b.y * 12 + b.m) - (a.y * 12 + a.m)).slice(0, 12),
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
void eul; void tag; void MADE; void note;
