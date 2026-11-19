// 극단에 들기, 내 극단 꾸리기, 무대에 서기, 다음 고장으로 옮기기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { leaveJob, travelMonths } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, gains, up, isAdult } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  T, myTroupe, own, withTroupe, bannedHere, mi, clamp, here, placeName, free, stat, ownRng, ACTS, ACT_IDS, actSkill, tasteOf, crowdOf, stageOk, nextStops,
  TROUPE_NAMES, newMember, newTroupe, logTroupe, leaveTroupe, WAGE, fameWord,
} from './core.js';

const canTour = (g) => isAdult(g) && free(g) && !g.army?.service && !g.poor?.bond && !g.over;
const share = (t) => (t.own ? 1 : (t.lead ? 2 : 1) / (t.members.length + 2));

/* ---------- 극단이 고장에 들어온다 ---------- */
defineScene('troupe_arrive', {
  need: (g, s) => canTour(g) && !myTroupe(g) && stageOk(here(g)) && TROUPE_NAMES.includes(s.name),
  title: () => '유랑극단',
  text: (g, s) => `장터에 색 바랜 천막이 올랐다. 수레 옆구리에 반쯤 지워진 글씨: ${s.name}. 밤 공연이 끝나고, 늙은 연출가 베네딕트가 사람이 모자란다며 구경꾼들을 둘러보았다. "떠돌 각오가 된 사람 있나? 재주가 없으면 천막 치는 일부터 하면 되네."`,
  choices: (g) => [
    ...ACT_IDS.filter((a) => actSkill(g, a) >= 18).map((a) => ({ label: `${J(ACTS[a].who, '으로/로')} 들어간다`, key: a })),
    { label: '천막 치는 일부터 하겠다고 한다', key: 'hand' },
    { label: '구경만 하고 돌아선다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'no') return '천막이 걷히고 수레가 떠났다. 먼지가 가라앉을 때까지 길 끝을 보았다.';
    if (myTroupe(g)) return '이미 몸담은 극단이 있다.';
    const t = newTroupe(g, rng, { own: false, name: s.name, place: here(g) });
    T(g).t = t;
    t.myAct = ACTS[key] ? key : null;
    if (L(g).job) leaveJob(g, '극단을 따라 떠나려고 하던 일을 그만두었다.');
    logTroupe(g, `${s.name}에 ${J(ACTS[key] ? ACTS[key].who : '잡일꾼', '으로/로')} 들어갔다.`);
    note(g, `유랑극단 ${s.name}에 들어갔다.`);
    stress(g, -4);
    return ACTS[key] ? `베네딕트가 내 ${J(ACTS[key].name, '을/를')} 한 번 보더니 고개를 끄덕였다. "다음 고장부터 무대에 서게." 그날 밤 수레 밑에서 잤다. 별이 많았다.` : '천막 말뚝을 박고 수레를 닦는 일부터 시작했다. 무대 뒤에서 재주를 훔쳐보는 밤이 길었다.';
  },
});

export const visitingHere = (g) => { const v = T(g).visiting; return v && v.place === here(g) && v.until >= mi(g) && TROUPE_NAMES.includes(v.name) ? v : null; };
ACTIONS.push({
  id: 'troupe_join',
  name: '유랑극단을 찾아간다',
  icon: 'travel',
  desc: '장터에 천막을 친 유랑극단을 찾아간다. 재주가 있으면 무대에, 없으면 천막 치는 일부터. 들면 극단을 따라 고장을 떠돈다.',
  available: (g) => canTour(g) && !myTroupe(g) && !!visitingHere(g),
  run(g) {
    if (!sceneQueued(g, 'troupe_arrive')) queueScene(g, 'troupe_arrive', { name: visitingHere(g).name }, { first: true });
    return `${visitingHere(g).name}의 천막 뒤로 갔다.`;
  },
});

/* ---------- 내 극단 꾸리기 ---------- */
export const FOUND_COST = 200;
ACTIONS.push({
  id: 'troupe_found',
  name: '유랑극단을 꾸린다',
  icon: 'travel',
  desc: '수레와 천막을 사고 재주꾼 셋을 모아 내 극단을 꾸린다. 고장을 떠돌며 공연한다. 단원 삯은 달마다 내 몫이다.',
  available: (g) => canTour(g) && !myTroupe(g) && stageOk(here(g)) && crowdOf(here(g)) >= 2 && g.player.money >= FOUND_COST && ACT_IDS.some((a) => actSkill(g, a) >= 30),
  run(g, rng) {
    const s = T(g);
    const used = new Set(s.past.map((x) => x.name));
    const name = rng.pick(TROUPE_NAMES.filter((n) => !used.has(n))) ?? rng.pick(TROUPE_NAMES);
    g.player.money -= FOUND_COST;
    s.t = newTroupe(g, rng, { own: true, name, place: here(g) });
    s.t.myAct = ACT_IDS.slice().sort((a, b) => actSkill(g, b) - actSkill(g, a))[0];
    s.founded += 1;
    if (L(g).job) leaveJob(g, '극단을 꾸리려고 하던 일을 그만두었다.');
    logTroupe(g, `내 극단 ${J(name, '을/를')} 꾸렸다.`);
    chron(g, `${g.player.name}, 유랑극단 ${J(name, '을/를')} 꾸리다.`, 40);
    return `중고 수레 두 대와 기운 천막을 샀다. ${s.t.members.map((m) => m.name).join(', ')}. 첫 술자리에서 극단 이름을 정했다. ${name}.`;
  },
});

/* ---------- 무대 ---------- */
ACTIONS.push({
  id: 'troupe_show',
  name: '무대에 선다',
  icon: 'coin',
  desc: '극단과 함께 이 고장에서 공연한다. 고장마다 좋아하는 재주가 다르다. 풍자극은 크게 벌지만 검열에 걸릴 수 있다.',
  available: (g) => withTroupe(g) && free(g) && !bannedHere(g),
  run(g) {
    if (!sceneQueued(g, 'troupe_show')) queueScene(g, 'troupe_show', {}, { first: true });
    return `${myTroupe(g).name}의 천막을 올렸다.`;
  },
});
defineScene('troupe_show', {
  need: (g) => withTroupe(g) && free(g) && !bannedHere(g),
  title: (g) => `${myTroupe(g).name}, ${placeName(here(g))} 공연`,
  text: (g) => {
    const t = myTroupe(g), ta = tasteOf(here(g));
    return `${ta.name} 극단은 ${fameWord(t.fame)} 이름이다. 오늘 밤 무엇으로 무대를 열까.${t.myAct ? '' : ' 아직 내 재주로 무대에 설 만큼은 아니다. 뒤에서 거든다.'}`;
  },
  choices: (g) => {
    const t = myTroupe(g);
    const mine = ACT_IDS.filter((a) => a === t.myAct || actSkill(g, a) >= 25);
    return [
      ...mine.map((a) => ({ label: `내 ${J(ACTS[a].name, '으로/로')} 연다`, key: a })),
      ...(mine.includes('play') ? [{ label: '높은 사람을 비꼬는 풍자극을 올린다', key: 'satire' }] : []),
      { label: '단원들에게 무대를 맡기고 뒤에서 거든다', key: 'back' },
    ];
  },
  resolve(g, rng, s, key) {
    const t = myTroupe(g);
    if (!t || !withTroupe(g)) return '극단은 이미 다른 고장에 있었다.';
    const pl = here(g), ta = tasteOf(pl), act = key === 'satire' ? 'play' : ACTS[key] ? key : null;
    const st = T(g);
    tired(g, 10);
    const troupePow = t.members.reduce((a, m) => a + m.skill * (ta[m.act] ?? 1), 0) / Math.max(1, t.members.length);
    let pow = troupePow * 0.6;
    let up1 = '';
    if (act) {
      const sk = actSkill(g, act);
      const ok = check(rng, sk * (ta[act] ?? 1), 40);
      pow = troupePow * 0.4 + sk * (ta[act] ?? 1) * (ok ? 1.1 : 0.6);
      if (act === 'music') { const k = gainSkill(g, 'music', 0.6, 'cha'); up1 = gains([up('음악', k)]); }
      else { st.skill[act] = clamp((st.skill[act] ?? 0) + 1.2 * (1 - (st.skill[act] ?? 0) / 110), 0, 100); up1 = ` (${ACTS[act].name} 솜씨가 늘었다)`; }
      if (!ok) stress(g, 3);
    }
    let take = Math.round(crowdOf(pl) * (4 + pow / 6) * (0.7 + t.fame / 100));
    let extra = '';
    if (key === 'satire') {
      st.satires += 1; t.satire = true;
      take = Math.round(take * (ta.censor <= 1 ? 1.6 : 1.3));
      if (ta.censor >= 2 && rng.chance(0.25 * ta.censor) && !sceneQueued(g, 'troupe_event')) queueScene(g, 'troupe_event', { ev: 'censor', pl }, { first: true });
      t.fame = clamp(t.fame + 2, 0, 100);
      extra = ta.censor <= 1 ? ' 영주의 배를 부풀린 배우가 넘어질 때마다 웃음이 터졌다.' : ' 웃음 사이사이로 경비병 몇이 무대 쪽을 오래 보았다.';
    }
    const mine = Math.max(1, Math.round(take * share(t)));
    g.player.money += mine;
    t.earned += take; t.shows += 1; st.shows += 1;
    t.fame = clamp(t.fame + (pow >= 45 ? 1.5 : 0.5), 0, 100);
    for (const m of t.members) m.mood = clamp(m.mood + (pow >= 45 ? 2 : -1), 0, 100);
    if (!st.best || take > st.best.take) st.best = { take, place: pl, year: g.date.year, name: t.name };
    const how = act ? ACTS[act].line : '천막 밧줄을 붙잡고 횃불을 들었다.';
    return `${how}${extra} 모자에 모인 은화가 ${take}닢.${t.own ? '' : ` 내 몫은 ${mine}닢.`}${up1}`;
  },
});

/* ---------- 극단 살림 ---------- */
ACTIONS.push({
  id: 'troupe_manage',
  name: '극단 살림을 본다',
  icon: 'travel',
  desc: '내 극단이면 단원을 들이고 내보내고, 수레를 고치고, 다음 고장을 정한다. 남의 극단이면 주연을 달라고 하거나 극단을 나온다.',
  available: (g) => withTroupe(g) && free(g),
  run(g) {
    if (!sceneQueued(g, 'troupe_manage')) queueScene(g, 'troupe_manage', {}, { first: true });
    return `${myTroupe(g).name}의 수레에 올라 앉았다.`;
  },
});
defineScene('troupe_manage', {
  need: (g) => withTroupe(g) && free(g),
  title: (g) => myTroupe(g).name,
  text: (g) => {
    const t = myTroupe(g);
    return `${t.own ? '내 극단' : `${t.leader}의 극단`}. 단원: ${t.members.map((m) => `${ACTS[m.act].who} ${m.name}`).join(', ') || '없음'}. 수레는 ${t.wagon >= 60 ? '쓸 만하다' : t.wagon >= 30 ? '삐걱거린다' : '바퀴가 언제 빠질지 모른다'}. 공연 ${t.shows}번, 번 돈 은화 ${t.earned}닢.`;
  },
  choices: (g) => {
    const t = myTroupe(g), m = g.player.money;
    if (!t.own) return [
      ...(!t.lead && t.myAct ? [{ label: '주연을 달라고 한다', key: 'lead' }] : []),
      ...(!t.myAct && ACT_IDS.some((a) => actSkill(g, a) >= 18) ? [{ label: '이제 무대에 서게 해 달라고 한다', key: 'stage' }] : []),
      { label: '극단을 나온다', key: 'leave' },
      { label: '그대로 지낸다', key: 'none' },
    ];
    return [
      ...(t.members.length < 6 && m >= 10 ? [{ label: '단원을 하나 더 들인다 (은화 10닢)', key: 'hire' }] : []),
      ...(t.members.length ? [{ label: '단원을 내보낸다', key: 'fire' }] : []),
      ...(t.wagon < 90 && m >= 15 ? [{ label: '수레를 고친다 (은화 15닢)', key: 'fix' }] : []),
      { label: '다음 고장으로 떠난다', key: 'move' },
      { label: '극단을 접는다', key: 'disband' },
      { label: '그대로 둔다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const t = myTroupe(g);
    if (!t) return '극단은 이미 없었다.';
    if (key === 'none') return '모닥불 가에서 단원들과 늦게까지 이야기했다.';
    if (key === 'lead') {
      if (check(rng, actSkill(g, t.myAct) + stat(g, 'cha') * 0.3, 55)) { t.lead = t.myAct; logTroupe(g, '주연을 맡았다.'); return '베네딕트가 한참 나를 보더니 말했다. "다음 고장부터 자네가 막을 열게." 몫이 곱절이 되었다. 오래 주연을 하던 단원의 눈빛이 식었다.'; }
      stress(g, 4); return '"아직 일러." 베네딕트는 대본을 덮었다.';
    }
    if (key === 'stage') { t.myAct = ACT_IDS.slice().sort((a, b) => actSkill(g, b) - actSkill(g, a))[0]; return `베네딕트가 내 ${J(ACTS[t.myAct].name, '을/를')} 보았다. "그 정도면 무대에 서도 되겠군."`; }
    if (key === 'leave') { leaveTroupe(g, '극단을 나왔다'); stress(g, 2); return '짐 보따리를 내렸다. 단원들이 수레 위에서 손을 흔들었다. 다시 한 고장 사람이 되었다.'; }
    if (key === 'hire') {
      if (g.player.money < 10 || t.members.length >= 6) return '돈이 모자랐다.';
      g.player.money -= 10;
      const m = newMember(g, rng, rng.pick(ACT_IDS), new Set(t.members.map((x) => x.name)));
      t.members.push(m); logTroupe(g, `${ACTS[m.act].who} ${J(m.name, '을/를')} 들였다.`);
      return `${J(m.name, '이/가')} ${J(ACTS[m.act].who, '으로/로')} 들어왔다. 첫날부터 재주를 보이겠다며 장터 한가운데서 판을 벌였다.`;
    }
    if (key === 'fire') { queueScene(g, 'troupe_fire', {}, { first: true }); return '단원들을 한 사람씩 불렀다.'; }
    if (key === 'fix') { if (g.player.money < 15) return '돈이 모자랐다.'; g.player.money -= 15; t.wagon = 100; return '수레 바퀴살을 갈고 굴대에 기름을 먹였다. 이제 산길도 넘겠다.'; }
    if (key === 'move') { queueScene(g, 'troupe_move', {}, { first: true }); return '지도를 펼쳤다.'; }
    // 접는다
    const sold = Math.round(30 + t.wagon * 0.5);
    g.player.money += sold;
    leaveTroupe(g, '극단을 접었다');
    chron(g, `${g.player.name}의 유랑극단 ${J(t.name, '이/가')} 막을 내리다.`, 30);
    stress(g, 6);
    return `수레와 천막을 은화 ${sold}닢에 팔았다. 단원들은 저마다 다른 길로 갔다. 마지막 밤, 관객 없이 한 번 더 막을 올렸다.`;
  },
});
defineScene('troupe_fire', {
  need: (g) => withTroupe(g) && own(g) && myTroupe(g).members.length > 0,
  title: () => '내보낼 사람',
  text: () => '누구를 내보낼까. 떠돌이에게 극단을 잃는 건 집을 잃는 일이다.',
  choices: (g) => [...myTroupe(g).members.map((m) => ({ label: `${ACTS[m.act].who} ${m.name}`, key: `m:${m.id}` })), { label: '아무도 내보내지 않는다', key: 'none' }],
  resolve(g, rng, s, key) {
    const t = myTroupe(g), m = t?.members.find((x) => `m:${x.id}` === key);
    if (!m) return '아무도 내보내지 않았다.';
    t.members.splice(t.members.indexOf(m), 1);
    if (m.love >= 60) { stress(g, 10); deed(g, 'loyal', -3, '정을 나눈 단원을 극단에서 내보냈다.'); }
    logTroupe(g, `${J(m.name, '을/를')} 내보냈다.`);
    return `${J(m.name, '은/는')} 제 짐을 지고 반대쪽 길로 걸어갔다. 한 번도 돌아보지 않았다.`;
  },
});

/* ---------- 다음 고장으로 ---------- */
defineScene('troupe_move', {
  need: (g) => withTroupe(g) && free(g) && nextStops(here(g)).length > 0,
  title: () => '다음 고장',
  text: (g) => {
    const t = myTroupe(g);
    return t.own ? `${placeName(here(g))}에서 벌 만큼 벌었다. 수레를 어디로 돌릴까.` : `${J(t.leader, '이/가')} 지도를 접었다. "다음은 ${placeName(nextStops(here(g))[t.shows % nextStops(here(g)).length])}다. 내일 새벽에 떠난다."`;
  },
  choices: (g) => {
    const t = myTroupe(g), stops = nextStops(here(g));
    if (!t.own) return [{ label: '함께 떠난다', key: `to:${stops[t.shows % stops.length]}` }, { label: '여기 남아 극단을 나온다', key: 'leave' }];
    return [...stops.map((to) => ({ label: `${J(placeName(to), '으로/로')} (${travelMonths(here(g), to)}달 길, ${tasteOf(to).name.split(' ')[0]})`, key: `to:${to}` })), { label: '조금 더 머문다', key: 'stay' }];
  },
  resolve(g, rng, s, key) {
    const t = myTroupe(g);
    if (!t) return '극단은 이미 없었다.';
    if (key === 'stay') { t.stay = 0; return '한 달 더 머물기로 했다. 같은 얼굴들이 또 왔다. 같은 우스개에 덜 웃었다.'; }
    if (key === 'leave') { leaveTroupe(g, '다음 고장으로 따라가지 않고 남았다'); return '새벽에 수레가 떠나는 소리를 누워서 들었다. 따라 나가지 않았다.'; }
    const to = key.slice(3);
    if (!nextStops(here(g)).includes(to)) return '그 길은 막혀 있었다.';
    const life = L(g);
    life.travel = { to, left: travelMonths(here(g), to), from: here(g) };
    t.moving = to; t.place = to; t.stay = 0;
    t.wagon = clamp(t.wagon - 6 * travelMonths(life.travel.from, to), 0, 100);
    return `수레에 천막을 싣고 ${J(placeName(to), '으로/로')} 떠났다. 단원 하나가 마부석에서 노래를 시작했다.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const s = T(g), t = s.t, rng = ownRng(g, 1), now = mi(g), life = L(g);
  if (!t) {
    // 극단이 고장에 들어온다 (열 달에 한 번쯤). 장면을 띄우지 않고 두 달 머문다: 들지 말지는 내가 찾아가서 정한다.
    if (canTour(g) && stageOk(here(g)) && now - s.arriveAt >= 10 && rng.chance(0.08)) {
      s.arriveAt = now;
      const used = new Set(s.past.map((x) => x.name));
      s.visiting = { name: rng.pick(TROUPE_NAMES.filter((n) => !used.has(n))) ?? rng.pick(TROUPE_NAMES), place: here(g), until: now + 2 };
      note(g, `장터에 유랑극단 ${J(s.visiting.name, '이/가')} 천막을 쳤다. 두 달쯤 머문다고 한다.`);
    }
    return;
  }
  if (life.travel) return;
  // 길에서 막 닿았다
  if (t.moving) {
    const to = t.moving; t.moving = null;
    if (here(g) === to && free(g) && rng.chance(0.35) && !sceneQueued(g, 'troupe_event')) queueScene(g, 'troupe_event', { ev: 'road', kind: rng.pick(['axle', 'bandits', 'river', 'sick', 'mud']) });
  }
  if (here(g) !== t.place) {
    if (t.own) t.place = here(g); // 내 극단은 나를 따라온다
    else { leaveTroupe(g, '따로 길을 떠나 극단과 헤어졌다'); note(g, `${J(t.name, '과/와')} 길이 갈렸다.`); return; }
  }
  t.stay += 1;
  // 내 극단: 삯과 수레
  if (t.own) {
    const wage = t.members.length * WAGE;
    if (g.player.money >= wage) g.player.money -= wage;
    else { g.player.money = 0; for (const m of t.members) m.mood = clamp(m.mood - 12, 0, 100); }
    t.wagon = clamp(t.wagon - 2, 0, 100);
    const gone = t.members.filter((m) => m.mood < 15);
    for (const m of gone) { t.members.splice(t.members.indexOf(m), 1); logTroupe(g, `${J(m.name, '이/가')} 삯이 밀려 떠났다.`); note(g, `${J(m.name, '이/가')} 말없이 극단을 떠났다.`); }
  } else for (const m of t.members) m.mood = clamp(m.mood + 0.5, 0, 100);
  if (!free(g)) return;
  // 남의 극단은 두 달 머물면 떠난다. 내 극단은 세 달째에 물어본다.
  if (t.stay >= (t.own ? 3 : 2) && !sceneQueued(g, 'troupe_move') && nextStops(here(g)).length) { queueScene(g, 'troupe_move', {}); return; }
  // 극단 안팎의 일
  if (now - s.eventAt < 3 || sceneQueued(g, 'troupe_event') || !rng.chance(0.35)) return;
  s.eventAt = now;
  const pool = ['quarrel', 'quarrel'];
  if (t.members.some((m) => m.love < 60) && !t.members.some((m) => m.love >= 60)) pool.push('love');
  if (t.members.some((m) => m.love >= 60)) pool.push('lover', 'lover');
  if (crowdOf(here(g)) >= 2 && t.fame >= 20) pool.push('feast', 'feast');
  if (t.own) pool.push('theft');
  if (t.members.length < 2) { pool.length = 0; pool.push(crowdOf(here(g)) >= 2 && t.fame >= 20 ? 'feast' : 'road'); }
  const ev = rng.pick(pool);
  const a = rng.pick(t.members), b = rng.pick(t.members.filter((m) => m !== a)) ?? null;
  queueScene(g, 'troupe_event', { ev, a: a?.id ?? null, b: b?.id ?? null, kind: ev === 'road' ? rng.pick(['axle', 'mud']) : null });
});

// 대를 이으면: 내 극단은 자식이 잇고, 남의 극단 단원 자리는 거기서 끝난다
HOOKS.heir.push((g) => {
  const t = myTroupe(g);
  if (!t) return;
  if (!t.own) { leaveTroupe(g, '대가 바뀌며 극단을 떠났다'); return; }
  t.gens += 1; t.leader = g.player.name; t.lead = null; t.moving = null; t.place = here(g);
  t.myAct = ACT_IDS.slice().sort((a, b) => actSkill(g, b) - actSkill(g, a))[0];
  for (const m of t.members) { m.mood = clamp(m.mood - 10, 0, 100); m.love = 0; }
  logTroupe(g, `${g.player.name}에게 극단이 넘어왔다. ${t.gens}대째.`);
});
