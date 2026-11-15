// 찾은 것을 어떻게 하나: 팔기(장터), 학계에 바치기(서고·마탑·필사실·학술원), 숨기기(집안의 비밀).
// - 판 돈은 바로 들어오지만 이름은 남지 않는다. 바치면 이름과 사례금이 남고, 하던 연구가 나아간다(research).
// - 숨겨 둔 것은 대를 이어 남는다. 쓸모 있는 것도 있고(keep), 집안을 괴롭히는 것도 있다(curse).
//   숨긴 것을 노리고 찾아오는 사람도 있다(explore_seek).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, traveling, isAdult, chron, stress } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { RS } from '../research/state.js';
import { J } from '../narrative/text.js';
import { E, REGIONS, FINDS, CIVS, findName, findValue, addFame, logExplore, mi } from './core.js';

// 장터: 값 배수
export const MARKETS = { leocast: 1.0, harfen: 0.8, portel: 1.25, barka: 1.1, eisen: 1.1, gorge: 1.15, saltmare: 1.2, serenia: 1.0, silverleaf: 0.9, estella: 0.7 };
// 학계: 바칠 곳
export const ACADEMIES = {
  leocast: { name: '왕립 서고', kind: 'crown' },
  serenia: { name: '세레니아 마탑', kind: 'tower' },
  verden: { name: '베르덴 성당 필사실', kind: 'church' },
  eisen: { name: '아이젠베르크 제국 학술원', kind: 'empire' },
};
const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !traveling(g) && !E(g).exp && !g.crime?.jailed;
export const priceAt = (g, f, place = here(g)) => Math.max(1, Math.round(findValue(f) * (MARKETS[place] ?? 0.6)));

/* ---------- 팔기 ---------- */
ACTIONS.push({
  id: 'explore_sell',
  name: '찾은 것을 판다',
  icon: 'coin',
  desc: '원정에서 가져온 것을 장터의 수집가와 상인에게 판다. 큰 장터일수록 값을 잘 쳐준다.',
  available: (g) => free(g) && E(g).pack.length > 0 && MARKETS[here(g)] != null && !sceneQueued(g, 'explore_sell'),
  run(g) { queueScene(g, 'explore_sell'); return '수집가들이 모인다는 골목의 가게 문을 두드렸다.'; },
});
defineScene('explore_sell', {
  need: (g) => free(g) && E(g).pack.length > 0,
  title: () => '수집가의 가게',
  text: (g) => `늙은 수집가가 돋보기를 끼고 하나씩 들여다본다. "어디서 났는지는 묻지 않겠소. 값은 이렇소." ${PLACES[here(g)]?.name ?? ''}의 시세다.`,
  choices: (g) => {
    const pack = E(g).pack;
    const out = pack.slice(0, 6).map((f, i) => ({ label: `${findName(f)} (은화 ${priceAt(g, f)}닢)`, key: `one:${i}` }));
    if (pack.length > 1) out.push({ label: `다 판다 (은화 ${pack.reduce((a, f) => a + priceAt(g, f), 0)}닢)`, key: 'all' });
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '물건을 다시 싸서 나왔다.';
    const e = E(g);
    const idx = key === 'all' ? e.pack.map((_, i) => i) : [Number(key.split(':')[1])];
    const sold = idx.map((i) => e.pack[i]).filter(Boolean);
    if (!sold.length) return '';
    e.pack = e.pack.filter((f) => !sold.includes(f));
    let total = 0;
    const lines = [];
    for (const f of sold) {
      const p = priceAt(g, f);
      total += p;
      if (f.id === 'war_relic') { L(g).renown = Math.max(0, L(g).renown - 4); lines.push('성검 조각을 장사꾼에게 넘겼다는 말이 성당까지 들어갔다. 사제들이 내 이름을 입에 올렸다.'); }
      if (f.id === 'root_heart' && here(g) === 'silverleaf') { total += p; lines.push('엘프 상인이 말없이 값을 두 배로 치렀다. 그 눈빛은 고마움이 아니라 분노에 가까웠다.'); }
      if (f.id === 'region_map') lines.push(`${REGIONS[f.region]?.name ?? ''} 지도는 상단의 손에 들어갔다. 다음 원정대는 그 지도를 들고 떠날 것이다.`);
    }
    g.player.money += total;
    e.sold += total;
    return `${sold.map(findName).join(', ')}. 은화 ${total}닢을 받았다. 물건들은 어느 귀족의 진열장으로 사라질 것이다.${lines.length ? ` ${lines.join(' ')}` : ''}`;
  },
});

/* ---------- 학계에 바치기 ---------- */
ACTIONS.push({
  id: 'explore_give',
  name: '찾은 것을 학계에 바친다',
  icon: 'scroll',
  desc: '찾은 것을 서고나 마탑에 바친다. 돈은 적지만 이름이 남고, 학자들이 그 위에서 연구를 잇는다.',
  available: (g) => free(g) && E(g).pack.length > 0 && !!ACADEMIES[here(g)] && !sceneQueued(g, 'explore_give'),
  run(g) { queueScene(g, 'explore_give'); return `${ACADEMIES[here(g)].name}의 문을 두드렸다.`; },
});
defineScene('explore_give', {
  need: (g) => free(g) && E(g).pack.length > 0 && !!ACADEMIES[here(g)],
  title: (g) => ACADEMIES[here(g)].name,
  text: (g) => `학자들이 몰려나왔다. 누군가는 손을 떨었고, 누군가는 벌써 종이를 꺼냈다. "${ACADEMIES[here(g)].name}의 이름으로 받겠소. 당신의 이름도 함께 적힐 것이오."`,
  choices: (g) => {
    const out = E(g).pack.slice(0, 7).map((f, i) => ({ label: `${J(findName(f), '을/를')} 바친다`, key: `one:${i}` }));
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '아직은 내 손에 두기로 했다.';
    const e = E(g);
    const f = e.pack[Number(key.split(':')[1])];
    if (!f) return '';
    e.pack = e.pack.filter((x) => x !== f);
    const A = ACADEMIES[here(g)];
    const F = FINDS[f.id];
    const v = findValue(f);
    e.given.push({ id: f.id, region: f.region, to: A.name, year: g.date.year });
    const fame = Math.ceil(v / 12) + (F.kind === 'tablet' || F.kind === 'map' ? 3 : 0);
    addFame(g, fame);
    const fee = Math.round(v * 0.3);
    g.player.money += fee;
    const r = RS(g);
    r.fame = (r.fame ?? 0) + Math.ceil(v / 20);
    const lines = [`${J(findName(f), '은/는')} ${A.name}의 진열장에 내 이름과 함께 놓였다. 사례금으로 은화 ${fee}닢을 받았다.`];
    if (r.project && r.project.prog < 0.95) { r.project.prog = Math.min(0.95, r.project.prog + Math.min(0.2, v / 800)); lines.push('학자들과 이야기를 나누다 하던 연구의 막힌 곳이 풀렸다.'); }
    if (F.kind === 'tablet') { gainSkill(g, 'letters', 2, 'int'); if (F.civ === 'arcana' && A.kind === 'tower' && g.player.manaAwakened) { gainSkill(g, 'magic', 2, 'int'); lines.push('마탑의 마법사들과 아르카나의 술식을 함께 풀었다. 서클 마법과 다른 길이 어렴풋이 보였다.'); } }
    if (f.id === 'stone_codex') { addFame(g, 20); chron(g, `${J(g.player.name, '이/가')} 바친 사전으로, 학자들이 처음으로 ${CIVS.stone.name}의 글을 읽다.`, 80); lines.push('천 년 동안 아무도 읽지 못한 글을, 오늘 누군가 소리 내어 읽었다.'); }
    if (f.id === 'star_chart') { chron(g, `${A.name}, 아르카나 최후의 별자리판에서 지금은 없는 별 하나를 찾아내다.`, 70); lines.push('학자들이 밤새 하늘과 별자리판을 견주었다. 그 별은 지금 하늘에 없다. 아무도 그 뜻을 말하지 못했다.'); }
    if (f.id === 'war_relic' && A.kind === 'church') { L(g).renown += 6; lines.push('사제들이 무릎을 꿇었다. 성검 조각은 성당 깊은 곳에 모셔졌다.'); }
    if (f.id === 'region_map') { chron(g, `${g.player.name}, ${REGIONS[f.region]?.name ?? '미지의 땅'}의 첫 지도를 ${A.name}에 바치다.`, 50); lines.push('지도가 끝나던 곳이 이제 지도에 있다.'); }
    logExplore(g, `${J(findName(f), '을/를')} ${A.name}에 바쳤다.`);
    return lines.join(' ');
  },
});

/* ---------- 숨기기 ---------- */
ACTIONS.push({
  id: 'explore_hide',
  name: '찾은 것을 숨긴다',
  icon: 'home',
  desc: '팔지도 바치지도 않고 아무도 모르는 곳에 숨긴다. 집안에 남는다. 쓸모 있는 것도, 불길한 것도 있다.',
  available: (g) => free(g) && E(g).pack.length > 0 && !sceneQueued(g, 'explore_hide'),
  run(g) { queueScene(g, 'explore_hide'); return '밤이 깊기를 기다렸다.'; },
});
defineScene('explore_hide', {
  need: (g) => free(g) && E(g).pack.length > 0,
  title: () => '아무도 모르는 곳',
  text: () => '마룻바닥 밑, 우물 벽의 빈 돌, 아버지의 무덤 옆. 어디든 좋다. 아무도 모르기만 하면.',
  choices: (g) => {
    const out = E(g).pack.slice(0, 6).map((f, i) => ({ label: `${findName(f)}${FINDS[f.id]?.keep ? ` (${FINDS[f.id].keep.text})` : ''}`, key: `one:${i}` }));
    if (E(g).pack.length > 1) out.push({ label: '전부 숨긴다', key: 'all' });
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '아직은 들고 다니기로 했다.';
    const e = E(g);
    const items = key === 'all' ? e.pack.slice() : [e.pack[Number(key.split(':')[1])]].filter(Boolean);
    if (!items.length) return '';
    e.pack = e.pack.filter((f) => !items.includes(f));
    for (const f of items) e.cache.push({ ...f, hidden: g.date.year });
    const curse = items.find((f) => FINDS[f.id]?.curse);
    return `${items.map(findName).join(', ')}. 아무도 모르는 곳에 묻었다. 이 자리는 내 아이에게만 말할 것이다.${curse ? ' 묻고 돌아서는데 등 뒤가 서늘했다.' : ''}`;
  },
});
ACTIONS.push({
  id: 'explore_unhide',
  name: '숨겨 둔 것을 꺼낸다',
  icon: 'coin',
  desc: '숨겨 둔 것을 다시 꺼내 짐에 넣는다. 팔거나 바칠 수 있다.',
  available: (g) => free(g) && E(g).cache.length > 0 && !sceneQueued(g, 'explore_unhide'),
  run(g) { queueScene(g, 'explore_unhide'); return '삽을 들고 나섰다.'; },
});
defineScene('explore_unhide', {
  need: (g) => free(g) && E(g).cache.length > 0,
  title: () => '숨겨 둔 자리',
  text: (g) => `숨겨 둔 것: ${E(g).cache.map(findName).join(', ')}.`,
  choices: (g) => [...E(g).cache.slice(0, 7).map((f, i) => ({ label: `${J(findName(f), '을/를')} 꺼낸다`, key: `one:${i}` })), { label: '그대로 둔다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '흙을 다시 덮었다.';
    const e = E(g);
    const f = e.cache[Number(key.split(':')[1])];
    if (!f) return '';
    e.cache = e.cache.filter((x) => x !== f);
    e.pack.push(f);
    return `${J(findName(f), '을/를')} 꺼냈다. 흙을 털자 옛날 그대로였다.`;
  },
});

/* ---------- 숨긴 것을 노리는 사람들 ---------- */
function seekerFor(f) {
  if (f.id === 'root_heart') return 'elf';
  if (f.id === 'war_relic') return 'church';
  return FINDS[f.id]?.kind === 'tablet' ? 'scholar' : 'collector';
}
const SEEK_TEXT = {
  elf: (n) => `은빛 머리의 엘프 셋이 문 앞에 섰다. "그대가 숲의 심장을 가져갔다는 것을 안다. ${J(n, '을/를')} 돌려다오. 이번에는 부탁이다."`,
  church: (n) => `회색 법의의 사제가 찾아왔다. "용사님의 칼은 장사꾼의 것도, 한 집안의 것도 아니오. ${J(n, '을/를')} 성당에 모시게 해 주시오."`,
  scholar: (n) => `먼 길을 온 학자가 모자를 벗었다. "당신이 ${J(n, '을/를')} 가지고 있다는 소문을 들었소. 평생 그것을 찾았소. 보기만이라도 하게 해 주시오."`,
  collector: (n) => `값비싼 옷의 사내가 찾아왔다. "${n}. 당신에게 있다는 걸 압니다. 값은 넉넉히 치르지요. 거절하신다면, 다른 사람들도 그걸 알게 되겠지요."`,
};
defineScene('explore_seek', {
  need: (g, s) => E(g).cache.some((f) => f.id === s.id),
  title: () => '숨긴 것을 아는 사람',
  text: (g, s) => SEEK_TEXT[s.who](FINDS[s.id].name),
  choices: (g, s) => {
    const v = FINDS[s.id].value;
    if (s.who === 'collector') return [{ label: `판다 (은화 ${Math.round(v * 1.4)}닢)`, key: 'sell' }, { label: '거절한다', key: 'no' }];
    if (s.who === 'scholar') return [{ label: '보여 주고 함께 연구한다', key: 'share' }, { label: '내준다', key: 'give' }, { label: '모른다고 잡아뗀다', key: 'no' }];
    return [{ label: '돌려준다', key: 'give' }, { label: '거절한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const e = E(g);
    const f = e.cache.find((x) => x.id === s.id);
    if (!f) return '';
    const v = FINDS[s.id].value;
    const take = () => { e.cache = e.cache.filter((x) => x !== f); };
    if (key === 'sell') { take(); g.player.money += Math.round(v * 1.4); return '은화 꾸러미를 받고 자리를 알려 주었다. 사내는 그날 밤 사람을 시켜 파 갔다.'; }
    if (key === 'share') { gainSkill(g, 'letters', 1.5, 'int'); addFame(g, 3); return '그와 겨울 한 철을 함께 보냈다. 그는 떠나며 내 이름을 넣은 논문을 쓰겠다고 했다.'; }
    if (key === 'give') {
      take();
      if (s.who === 'elf') { L(g).renown += 5; stress(g, -6); return '엘프들은 심재를 받아 들고 고개를 숙였다. 처음으로 엘프가 사람에게 고개를 숙이는 것을 보았다.'; }
      if (s.who === 'church') { L(g).renown += 6; return '사제는 성검 조각을 비단에 싸 들고 갔다. 다음 달, 성당의 기도문에 내 이름이 들어갔다.'; }
      addFame(g, 6); return '그는 울었다. 평생을 바친 것을 손에 쥐고.';
    }
    // 거절: 뒤탈이 있을 수 있다
    if (s.who === 'collector' && rng.chance(0.45)) { take(); stress(g, 8); return '거절했다. 보름 뒤, 숨겨 둔 자리가 파헤쳐져 있었다.'; }
    if (s.who === 'elf') { L(g).notoriety += 3; stress(g, 6); return '엘프들은 아무 말 없이 돌아갔다. 그날부터 숲 근처에서는 누가 나를 지켜보는 것 같다.'; }
    if (s.who === 'church' && rng.chance(0.3)) { L(g).renown = Math.max(0, L(g).renown - 3); return '사제는 축복 대신 경고를 남기고 갔다. 다음 주 설교에서 "성물을 감춘 자"에 대한 이야기가 나왔다.'; }
    return '문을 닫았다. 그 뒤로 그 사람은 다시 오지 않았다.';
  },
});

/* ---------- 숨긴 것의 쓸모와 뒤탈 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const e = E(g);
  if (!e.cache.length) return;
  const p = g.player;
  for (const f of e.cache) {
    const F = FINDS[f.id];
    if (!F) continue;
    if (F.curse && rng.chance(0.5)) stress(g, F.curse.stress);
    if (F.keep?.heal && p.injuries.length && rng.chance(0.3)) { const i = p.injuries.find((x) => !x.mortal); if (i) i.months = Math.max(0, i.months - 1); }
    if (F.keep?.mana && p.manaAwakened) p.mana += (p.manaPotential ?? 0) * 0.02;
  }
  // 찾아오는 사람: 값나가는 것을 숨겨 두면 소문이 난다
  if (!e.exp && mi(g) >= e.seekCool && !traveling(g) && !sceneQueued(g, 'explore_seek')) {
    const cand = e.cache.filter((f) => FINDS[f.id]?.value >= 60);
    if (cand.length && rng.chance(0.012 * cand.length)) {
      const f = rng.pick(cand);
      e.seekCool = mi(g) + 24;
      queueScene(g, 'explore_seek', { id: f.id, who: seekerFor(f) });
    }
  }
});
