// 살림: 방 들이기, 집에서 지내는 달의 보탬, 이웃 분쟁·옆집 불·밤손님, 대를 이을 때 집을 지킬지 팔지.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat, gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check } from '../adventure/core.js';
import { E, homeWorth } from '../estate/core.js';
import { sellHome } from '../estate/manage.js';
import { villageState } from '../village/index.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { alive as beastsAlive } from '../beasts/index.js';
import { J } from '../narrative/text.js';
import { H, ROOMS, ROOM_IDS, clamp, here, placeName, free, stat, recOf, roomCap, hasRoom, atOwnHome, kindWord, logHouse } from './core.js';

const NEIGHBOR_NAMES = ['옆집 홀거', '건넛집 과부 베르타', '대장장이 루츠', '방앗간 집 오토', '늙은 사냥꾼 디터', '빵집 안주인 그레타', '양치기 얀', '새로 이사 온 상인 클라우스'];
const neighborOf = (g, pl, rng) => {
  const h = H(g);
  h.neighbors[pl] ??= { name: rng ? rng.pick(NEIGHBOR_NAMES) : NEIGHBOR_NAMES[0], mood: 0, quarrels: 0 };
  return h.neighbors[pl];
};
const belongRec = (g, pl = here(g)) => villageState(g).places[pl] ?? null;
const addBelong = (g, n, pl = here(g)) => { const v = belongRec(g, pl); if (v) v.belong = clamp(v.belong + n, 0, 100); };
const roomCost = (g, id) => Math.round(ROOMS[id].cost * (recOf(g, here(g))?.kind === 'hut' ? 0.7 : 1));
// 집이 사라졌을 때(불, 팔림) 내력을 잃은 집 목록에 남긴다
export function loseHome(g, pl, how, price = 0) {
  const h = H(g), r = h.homes[pl];
  if (!r) return;
  h.lost.push({ place: pl, name: r.name, kind: r.kind, built: r.built, by: r.by, gens: r.gens, rooms: [...r.rooms], marks: [...r.marks], year: g.date.year, how, price });
  if (h.lost.length > 12) h.lost.shift();
  delete h.homes[pl];
}

/* ---------- 방 들이기 ---------- */
ACTIONS.push({
  id: 'house_room',
  name: '살림을 늘린다',
  icon: 'home',
  desc: '내 집에 화덕 부엌, 우물, 돌담, 서재, 작업장 같은 방과 살림을 들인다. 집이 클수록 많이 들일 수 있다. 들인 것은 집에서 지내는 달마다 보탬이 된다.',
  available: (g) => playerAge(g) >= 15 && atOwnHome(g) && free(g) && !sceneQueued(g, 'house_room'),
  run(g) { queueScene(g, 'house_room'); return '집을 한 바퀴 돌며 무엇이 모자란지 살폈다.'; },
});
defineScene('house_room', {
  need: (g) => atOwnHome(g) && free(g),
  title: (g) => `${recOf(g, here(g)).name}의 살림`,
  text: (g) => {
    const pl = here(g), r = recOf(g, pl);
    const have = r.rooms.map((id) => ROOMS[id].name);
    return `${placeName(pl)}의 ${kindWord(g, pl)}, ${r.name}. ${have.length ? `들인 것: ${have.join(', ')}.` : '아직 아무것도 들이지 않았다.'} 이 집에는 ${roomCap(g, pl)}가지까지 들일 수 있다.${r.gens > 1 ? ` ${r.gens}대째 사는 집이다.` : ''}`;
  },
  choices: (g) => {
    const pl = here(g), r = recOf(g, pl), out = [];
    if (r.rooms.length < roomCap(g, pl)) for (const id of ROOM_IDS) if (!r.rooms.includes(id) && g.player.money >= roomCost(g, id) && out.length < 6) out.push({ label: `${J(ROOMS[id].name, '을/를')} 들인다 (은화 ${roomCost(g, id)}닢)`, key: `r:${id}` });
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const pl = here(g), r = recOf(g, pl);
    if (key === 'no' || !r) return '오늘은 손대지 않기로 했다.';
    const id = key.slice(2);
    if (!ROOMS[id] || r.rooms.includes(id) || r.rooms.length >= roomCap(g, pl)) return '들일 자리가 없었다.';
    const c = roomCost(g, id);
    if (g.player.money < c) return `은화 ${c}닢이 모자랐다.`;
    g.player.money -= c; r.rooms.push(id); tired(g, 4);
    logHouse(g, `${r.name}에 ${J(ROOMS[id].name, '을/를')} 들였다.`);
    return `${J(ROOMS[id].name, '을/를')} 들였다. ${ROOMS[id].desc}`;
  },
});

/* ---------- 매달: 집에서 지낸 보탬, 오두막이 넓혀졌는지, 집을 잃었는지, 집의 일 ---------- */
const EVENTS = ['neighbor', 'fire', 'thief'];
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const h = H(g), life = L(g);
  // 집이 목록에서 사라졌으면(불에 타 무너짐, estate에서 팖) 잃은 집으로 남긴다
  for (const pl of Object.keys(h.homes)) if (!life.houses.includes(pl)) loseHome(g, pl, '내 손을 떠났다');
  // estate에서 넓힌 오두막은 집이 된다
  for (const pl of life.houses) { const r = h.homes[pl]; if (r?.kind === 'hut' && (E(g).homes[pl]?.level ?? 0) > 0) { r.kind = 'house'; r.marks.push('넓혀 지음'); } }
  if (!atOwnHome(g)) return;
  const pl = here(g), r = recOf(g, pl);
  r.lived = (r.lived ?? 0) + 1;
  // 방마다의 보탬 (난수 없이)
  if (r.rooms.includes('hearth')) stress(g, -1);
  if (r.rooms.includes('garden')) { stress(g, -1); gainSkill(g, 'farming', 0.15); }
  if (r.rooms.includes('study')) gainSkill(g, 'letters', 0.2, 'int');
  if (r.rooms.includes('workshop')) { const k = (g.player.skills.smithing ?? 0) >= (g.player.skills.cooking ?? 0) ? 'smithing' : 'cooking'; gainSkill(g, k, 0.2); }
  if (r.rooms.includes('stable')) for (const a of beastsAlive(g)) a.bond = Math.min(100, (a.bond ?? 30) + 0.5);
  // 집의 일: 석 달에 한 번 넘게는 오지 않는다
  if (!free(g) || g.date.year * 12 + g.date.month - (h.evAt ?? 0) < 3 || sceneQueued(g, 'house_event')) return;
  if (!rng.chance(r.kind === 'hut' ? 0.07 : 0.05)) return;
  let ev = rng.pick(EVENTS);
  if (ev === 'thief' && r.rooms.includes('wall') && rng.chance(0.6)) ev = 'neighbor'; // 돌담이 있으면 도둑이 잘 오지 않는다
  h.evAt = g.date.year * 12 + g.date.month;
  const nb = neighborOf(g, pl, rng);
  queueScene(g, 'house_event', { ev, topic: rng.int(0, 3), who: nb.name });
});

const TOPICS = [
  ['담장 경계', '내 담이 자기 땅을 한 뼘 먹었다고 한다. 할아버지 때부터 거기 있던 담이다.'],
  ['늙은 호두나무', '내 마당 호두나무 가지가 자기 지붕을 덮어 비가 샌다고 한다. 가지를 치라고 한다.'],
  ['도랑물', '내 집 도랑물이 자기 마당으로 넘친다고 한다. 지난밤 비에 그 집 닭장이 잠겼다.'],
  ['짖는 개', '내 집 개가 밤새 짖어 잠을 못 잔다고 한다. 개를 묶든 팔든 하라고 한다.'],
];
defineScene('house_event', {
  need: (g, s) => atOwnHome(g) && free(g) && EVENTS.includes(s.ev),
  title: (g, s) => ({ neighbor: '이웃과의 다툼', fire: '옆집에 불', thief: '밤손님' }[s.ev] ?? '집의 일'),
  text: (g, s) => {
    const r = recOf(g, here(g));
    if (s.ev === 'fire') return `한밤중 "불이야!" 소리에 깼다. ${s.who}네 지붕에서 불길이 솟는다. 바람이 ${r.name} 쪽으로 분다.${r.rooms.includes('well') ? ' 마당 우물에 두레박이 걸려 있다.' : ''}`;
    if (s.ev === 'thief') return `아래층에서 마룻바닥이 삐걱였다. 또 한 번. 누가 궤짝을 더듬는 소리다. 가진 돈은 은화 ${g.player.money}닢.${r.rooms.includes('cellar') ? ' 큰돈은 광 속 숨긴 궤짝에 있다.' : ''}`;
    const [what, why] = TOPICS[s.topic] ?? TOPICS[0];
    return `${J(s.who, '이/가')} 대문을 두드렸다. ${what} 일이다. ${why}`;
  },
  choices: (g, s) => {
    if (s.ev === 'fire') return [{ label: '물동이를 들고 뛰어간다', key: 'douse' }, { label: '내 지붕에 젖은 가마니를 덮는다', key: 'roof' }, { label: '살림부터 끌어낸다', key: 'save' }];
    if (s.ev === 'thief') return [{ label: '몽둥이를 들고 내려간다', key: 'club' }, { label: '소리쳐 이웃을 깨운다', key: 'shout' }, { label: '이불 속에서 숨죽인다', key: 'hide' }];
    return [{ label: '양보한다', key: 'yield' }, { label: '반씩 나누자고 달랜다', key: 'split' }, { label: '촌장에게 가져간다', key: 'elder' }, { label: '멱살을 잡는다', key: 'fist' }];
  },
  resolve(g, rng, s, key) {
    const pl = here(g), r = recOf(g, pl), e = E(g).homes[pl];
    if (!r || !e) return '그 집은 이제 내 집이 아니었다.';
    const nb = neighborOf(g, pl);
    if (s.ev === 'fire') {
      const well = r.rooms.includes('well') ? 20 : 0;
      if (key === 'douse') {
        const ok = check(rng, stat(g, 'str') * 0.5 + stat(g, 'wil') * 0.4 + well, 45);
        deed(g, 'brave', 3, '이웃집 불을 끄러 뛰어들었다.', pl); deed(g, 'kind', 2, '이웃집 불을 함께 껐다.', pl);
        nb.mood = clamp(nb.mood + 15, -50, 50); addBelong(g, 4);
        if (ok) return `${well ? '우물에서 물을 퍼 올려 사람들 손에서 손으로 넘겼다. ' : ''}새벽녘 불이 잡혔다. ${J(s.who, '이/가')} 그을린 얼굴로 내 손을 잡았다.`;
        e.cond = Math.max(0, e.cond - 25);
        if (rng.chance(0.4)) g.player.injuries.push({ name: '불길에 덴 자국', months: 1 });
        return burnt(g, pl, '옆집 불은 껐지만 불똥이 내 처마로 옮겨붙었다. 한쪽 지붕이 내려앉았다.');
      }
      if (key === 'roof') {
        if (check(rng, stat(g, 'int') * 0.6 + stat(g, 'agi') * 0.4 + well, 40)) return `젖은 가마니를 덮고 그 위에 물을 끼얹었다. 불똥이 떨어졌다가 치익 소리를 내며 꺼졌다. ${r.name}은 무사하다. ${s.who}네는 반이 탔다.`;
        e.cond = Math.max(0, e.cond - 30);
        return burnt(g, pl, '가마니가 모자랐다. 불똥 하나가 처마 밑으로 파고들었다.');
      }
      e.cond = Math.max(0, e.cond - 45);
      nb.mood = clamp(nb.mood - 5, -50, 50);
      return burnt(g, pl, '궤짝과 이불을 마당으로 끌어냈다. 그 사이 불이 내 지붕으로 건너왔다. 살림은 건졌지만 집이 많이 탔다.');
    }
    if (s.ev === 'thief') {
      const half = r.rooms.includes('cellar') ? 0.5 : 1;
      const loss = () => { const t = Math.round(Math.max(0, g.player.money - 20) * rng.float(0.1, 0.3) * half); g.player.money = Math.max(0, g.player.money - t); return t; };
      if (key === 'club') {
        if (check(rng, stat(g, 'str') * 0.5 + stat(g, 'agi') * 0.5, 45)) { deed(g, 'brave', 2, '집에 든 도둑을 잡았다.', pl); stress(g, -2); return '어둠 속에서 몽둥이를 휘둘렀다. 비명과 함께 누가 나동그라졌다. 아침에 경비대가 묶어 갔다. 열여섯도 안 된 아이였다.'; }
        const t = loss(); g.player.injuries.push({ name: '도둑의 칼에 베인 손', months: 1 }); stress(g, 6);
        return `내려가자마자 칼날이 번쩍였다. 손을 베였다. 도둑은 창문으로 사라졌다.${t ? ` 은화 ${t}닢이 없어졌다.` : ''}`;
      }
      if (key === 'shout') {
        const v = belongRec(g)?.belong ?? 0;
        if (v >= 30 || nb.mood > 10) { addBelong(g, 1); return '창문을 열고 소리쳤다. 이웃집마다 불이 켜지고 몽둥이 든 사내들이 뛰어나왔다. 도둑은 빈손으로 담을 넘었다.'; }
        const t = loss(); stress(g, 4);
        return `소리쳤지만 창문 하나 열리지 않았다. 이 고장에서 나는 아직 남이다.${t ? ` 은화 ${t}닢이 없어졌다.` : ''}`;
      }
      const t = loss(); stress(g, 6);
      return t ? `숨을 죽이고 기다렸다. 발소리가 멀어진 뒤 내려가 보니 궤짝이 열려 있었다. 은화 ${t}닢.` : '숨을 죽이고 기다렸다. 도둑은 아무것도 찾지 못하고 갔다. 훔쳐 갈 것도 없는 살림이다.';
    }
    // 이웃 다툼
    nb.quarrels += 1;
    if (key === 'yield') { nb.mood = clamp(nb.mood + 10, -50, 50); addBelong(g, 3); stress(g, 2); return `알았다고 했다. ${J(s.who, '은/는')} 머쓱해하며 돌아갔다. 다음 날 문 앞에 달걀 한 바구니가 놓여 있었다.`; }
    if (key === 'split') {
      if (check(rng, stat(g, 'cha') * 0.7 + Math.max(0, nb.mood), 40)) { nb.mood = clamp(nb.mood + 6, -50, 50); addBelong(g, 2); return '반씩 양보하자고 했다. 한참 투덜대더니 손을 내밀었다. 그날 저녁 둘이 같이 술을 마셨다.'; }
      nb.mood = clamp(nb.mood - 6, -50, 50); return '달래 보았지만 말이 통하지 않았다. 대문이 쾅 닫혔다. 한동안 눈도 마주치지 않을 것이다.';
    }
    if (key === 'elder') {
      const v = belongRec(g)?.belong ?? 0;
      if (v >= 35) { nb.mood = clamp(nb.mood - 8, -50, 50); return `촌장은 내 손을 들어 주었다. ${J(s.who, '은/는')} 이를 갈았다. 이겼지만 개운하지는 않다.`; }
      nb.mood = clamp(nb.mood - 4, -50, 50); stress(g, 4);
      return `촌장은 ${s.who} 쪽 말을 들었다. 이 고장에서 오래 산 쪽은 그쪽이다. 담을 한 뼘 물렸다.`;
    }
    // 멱살
    nb.mood = clamp(nb.mood - 20, -50, 50); addBelong(g, -5);
    if (check(rng, stat(g, 'str'), 40)) { reportCrime(g, 'assault', pl, { mult: 0.2 }); return `멱살을 잡고 흔들었다. ${J(s.who, '은/는')} 코피를 흘리며 물러났다. 이웃들이 창문 너머로 다 보았다.`; }
    g.player.injuries.push({ name: '이웃과 싸우다 멍든 눈', months: 1 }); stress(g, 5);
    return `멱살을 잡았는데 ${s.who}의 주먹이 먼저 날아왔다. 둘 다 진흙탕에 뒹굴었다. 이웃들이 뜯어말렸다.`;
  },
});
// 불에 탄 집: estate의 낡음이 0이 되면 무너진다
function burnt(g, pl, text) {
  const e = E(g).homes[pl];
  stress(g, 8);
  if (e && e.cond <= 0) {
    loseHome(g, pl, '불에 타 무너졌다');
    sellHome(g, pl);
    note(g, `${placeName(pl)}의 집이 불에 타 무너졌다.`);
    chron(g, `${g.player.name}의 ${placeName(pl)} 집, 불에 타다.`, 30);
    return `${text} 끝내 대들보가 무너졌다. 잿더미 앞에 오래 앉아 있었다.`;
  }
  return text;
}

/* ---------- 대를 이을 때: 집을 지킬까, 팔까 ---------- */
HOOKS.heir.push((g) => { if (L(g).houses.some((pl) => H(g).homes[pl])) queueScene(g, 'house_heir', { at: null }); });
defineScene('house_heir', {
  need: (g) => L(g).houses.length > 0,
  title: () => '물려받은 집',
  text: (g) => {
    const list = L(g).houses.map((pl) => { const r = recOf(g, pl); return `${placeName(pl)}의 ${r.name}(${r.gens}대째, 팔면 은화 ${homeWorth(g, pl)}닢)`; });
    return `선대가 남긴 집 열쇠 꾸러미를 받았다. ${list.join(', ')}. 기둥에는 ${recOf(g, L(g).houses[0]).marks.slice(-3).join(', ') || '선대'}의 이름이 새겨져 있다.`;
  },
  choices: (g) => [{ label: '모두 지킨다', key: 'keep' }, ...L(g).houses.slice(0, 4).map((pl) => ({ label: `${placeName(pl)}의 ${J(recOf(g, pl).name, '을/를')} 판다`, key: `sell:${pl}` }))],
  resolve(g, rng, s, key) {
    if (key === 'keep') return '열쇠 꾸러미를 허리에 찼다. 무겁다.';
    const pl = key.slice(5);
    if (!L(g).houses.includes(pl)) return '그 집은 이미 내 것이 아니었다.';
    const price = homeWorth(g, pl), r = recOf(g, pl);
    g.player.money += price;
    loseHome(g, pl, '대를 이으며 팔았다', price);
    sellHome(g, pl);
    logHouse(g, `${placeName(pl)}의 ${J(r.name, '을/를')} 은화 ${price}닢에 팔았다.`);
    note(g, `물려받은 ${placeName(pl)}의 ${J(r.name, '을/를')} 팔았다.`);
    return `${placeName(pl)}의 ${J(r.name, '을/를')} 팔았다. 은화 ${price}닢. 새 주인이 문패를 떼는 것은 보지 않았다.`;
  },
});
