// 마신의 그림자 속의 삶: 옛 이야기 조각 찾기, 유물(힘과 대가), 꿈의 목소리, 사도회 '일곱 의자' 안으로, 감시탑의 파수꾼,
// 그 둘 사이의 갈림길. 앞머리 dg_. 봉인이 깨질지 다시 묶일지는 정하지 않는다. 내 선택은 봉인의 힘을 조금 밀고 당길 뿐이다.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { EVENTS, age, here, onRoad, money, stress } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note, chron } from '../adventure/core.js';
import { POWER_BONUS } from '../adventure/combat.js';
import { J } from '../narrative/text.js';
import { deed } from '../repute/index.js';
import { SS as sealState, learn as sealLearn, WEDGES } from '../seal/state.js';
import { DG, LORE, RELICS, RELIC_IDS, APOSTLES, ORDER_RANKS, WATCH_RANKS, ORDER_CITIES, BOOK_CITIES, ELDER_CITIES, held, nextLore, addLore, dlog, clamp, mi, placeName } from './state.js';
import { moveRelic } from './world.js';

const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const grown = (g) => age(g) >= 16 && !busy(g);
const settled = (g) => grown(g) && !onRoad(g);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const sealPush = (g, n) => { if (g.realm && !g.seal?.ending) g.realm.seal = clamp((g.realm.seal ?? 100) + n, 0, 100); };
const suspect = (g, n) => { if (g.faith) g.faith.suspicion = clamp((g.faith.suspicion ?? 0) + n, 0, 100); };
const sensitive = (g) => !!g.player.manaAwakened || !!g.demons?.blood?.shown || held(g).length > 0 || !!DG(g).order || DG(g).voice > 0;
const wedgeHere = (g) => Object.values(WEDGES).some((w) => w.place === here(g));
const side = (g) => { const m = DG(g).me; m.side = m.guard >= m.brk + 3 ? 'guard' : m.brk >= m.guard + 3 ? 'break' : m.guard + m.brk > 0 ? 'between' : null; return m.side; };
const loreLine = (l) => `[${l.voice}] ${l.text}`;

/* ---------- 달마다: 목소리, 유물의 힘과 대가, 갈림길 ---------- */
export function demongodAfterMonth(g) {
  if (!g.demongod || g.over || !g.life) return;
  const S = DG(g), p = g.player, hs = held(g), stage = g.seal?.stage ?? 0;
  let dv = hs.reduce((a, k) => a + RELICS[k].voice, 0) + (S.order ? 0.4 : 0) - (S.watch ? 0.7 : 0);
  if (sensitive(g)) dv += stage * 0.15 + ((g.omen?.comets ?? []).includes(g.date.year) ? 0.3 : 0);
  if (!hs.length) dv -= 0.4;
  // 유물도 결사도 없으면 목소리는 꿈 언저리(70)에서 멈춘다
  const cap = hs.length || S.order ? 100 : Math.max(70, Math.min(S.voice, 100));
  S.voice = clamp(Math.round((S.voice + dv) * 10) / 10, 0, dv > 0 ? cap : 100);
  // 유물의 힘과 대가
  for (const k of hs) {
    if (k === 'shard') p.mana = Math.round((p.mana + 0.05) * 100) / 100;
    if (k === 'bell') p.fatigue = Math.min(100, (p.fatigue ?? 0) + 8);
    if (k === 'ring') deed(g, 'kind', -1, null);
    if (k === 'silver') { gainSkill(g, 'trade', 0.05); deed(g, 'honest', -1, null); }
    if (k === 'bowl') { if (g.world?.famine) stress(g, -2); p.fatigue = Math.min(100, (p.fatigue ?? 0) + 4); }
    if (k === 'glass') { suspect(g, -3); stress(g, 1); }
    if (k === 'crown') sealPush(g, -0.02);
  }
  // 꿈: 목소리가 스물씩 다가올 때마다 한 번
  const tier = Math.min(5, Math.floor(S.voice / 20));
  if (tier > (S.dreamAt ?? 0) && age(g) >= 12 && !sceneQueued(g, 'dg_dream')) { S.dreamAt = tier; queueScene(g, 'dg_dream', { tier }); }
  if (tier < (S.dreamAt ?? 0) - 1) S.dreamAt = tier + 1; // 멀어졌다가 다시 다가오면 다시 꾼다
  // 사도회의 부름 (검은 새벽 안쪽, 목소리, 유물)
  if (settled(g) && !S.order && !S.me.refused.order && ORDER_CITIES.includes(here(g)) && ((g.faith?.dawn?.rank ?? -1) >= 1 || S.voice >= 40 || hs.length > 0) && !sceneQueued(g, 'dg_order_invite') && (mi(g) + (g.player.id ?? 0)) % 7 === 0) queueScene(g, 'dg_order_invite', {});
  side(g);
}
HOOKS.afterMonth.push((g) => demongodAfterMonth(g));
POWER_BONUS.push((g) => held(g).reduce((a, k) => a + (RELICS[k].pow ?? 0), 0));
// 대를 이으면: 아는 이야기와 쥐고 있던 유물은 남는다(유물은 짐이다). 목소리와 결사는 새로 시작한다
HOOKS.heir.push((g) => {
  if (!g.demongod) return;
  const S = DG(g), hs = held(g);
  S.voice = 0; S.bond = 0; S.dreamAt = 0; S.order = null; S.watch = null;
  if (hs.length) { const list = hs.map((k) => RELICS[k].name).join(', '), last = RELICS[hs[hs.length - 1]].name; note(g, `부모의 궤짝 밑바닥에서 ${list}${J(last, '이/가').slice(last.length)} 나왔다. 손에 쥐자 낯선 꿈 냄새가 났다.`); }
});

/* ---------- 옛 이야기 찾기 ---------- */
const srcHere = (g) => {
  const out = [];
  if (BOOK_CITIES.includes(here(g))) out.push('book');
  if (ELDER_CITIES.includes(here(g))) out.push('elder');
  if ((g.ruins?.read ?? 0) >= 1) out.push('ruin');
  return out.filter((s) => nextLore(g, s));
};
ACTIONS.push({
  id: 'dg_lore',
  name: '옛 이야기 찾기',
  icon: 'scroll',
  desc: '오백 년 전 봉인 전쟁의 이야기를 조각조각 찾는다. 서고의 금서, 엘프와 드워프 노인의 말, 유적 공책. 이야기마다 말이 다르다.',
  available: (g) => settled(g) && ((g.seal?.known ?? 0) >= 1 || DG(g).known.length > 0 || DG(g).voice >= 20) && srcHere(g).length > 0,
  run(g, rng) {
    const srcs = srcHere(g);
    if (!srcs.length) return '이 고장에서 찾을 만한 옛 이야기는 이미 다 읽었다. 다른 곳으로 가 봐야겠다.';
    const src = rng.pick(srcs);
    g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 10);
    const skill = src === 'book' ? (g.player.skills.letters ?? 0) : src === 'elder' ? (L(g).renown ?? 0) + 20 : 40;
    if (src === 'book') gainSkill(g, 'letters', 0.3);
    if (!rng.chance(0.3 + skill / 120)) {
      return { book: '금서 서가의 사슬을 풀어 줄 사서를 하루 종일 기다렸다. 결국 문은 열리지 않았다.', elder: '노인은 한참 나를 쳐다보더니 날씨 이야기만 하고 일어섰다. 아직 믿을 사람이 못 되는 모양이다.', ruin: '유적 공책을 다시 넘겼지만 오늘은 아무것도 눈에 걸리지 않았다.' }[src];
    }
    const id = nextLore(g, src, rng), l = addLore(g, id);
    if (!l) return '새로 건진 이야기는 없었다. 아는 이야기를 다른 말로 한 번 더 들었을 뿐이다.';
    sealLearn(g, 1);
    dlog(g, `옛 이야기 조각: ${l.topic}`);
    return `${{ book: '먼지 쌓인 금서 한 권에서 찾았다.', elder: '노인이 낮은 목소리로 말해 주었다.', ruin: '유적 공책 여백에서 눈에 걸렸다.' }[src]} ${loreLine(l)}`;
  },
});

/* ---------- 꿈의 목소리 ---------- */
const DREAM = {
  1: '꿈에 얼음 들판이 나왔다. 멀리서 누가 웅얼거린다. 알아듣지 못할 말인데, 내 이름처럼 들린다.',
  2: '꿈속에서 목소리가 또렷해졌다. "들리는구나." 깨고 나니 베개가 젖어 있었다. 땀인지 눈물인지 모르겠다.',
  3: '목소리가 꿈 밖까지 따라 나왔다. 아침 우물가에서 물을 긷는데 귓가에서 누가 숨을 쉬었다. "너는 다른 이들과 다르다."',
  4: '이제 눈을 감으면 바로 곁에 있다. 목소리는 서두르지 않는다. "무엇을 원하나. 나는 오백 년 동안 아무것도 원하지 않은 적이 없다."',
  5: '꿈과 생시의 경계가 흐려졌다. 목소리는 내 목소리로 말하기 시작했다. 거울 속 내 입술이 먼저 움직였다.',
};
defineScene('dg_dream', {
  need: () => true,
  title: () => '꿈의 목소리',
  text: (g, s) => DREAM[s.tier] ?? DREAM[5],
  choices: () => [
    { label: '이를 악물고 거스른다', key: 'resist' },
    { label: '무슨 말을 하는지 듣는다', key: 'listen' },
    { label: '대답한다', key: 'answer' },
  ],
  resolve(g, rng, s, key) {
    const S = DG(g);
    if (key === 'resist') {
      if (rng.chance(0.35 + (g.player.stats.wil ?? 0) / 140 + (S.watch ? 0.2 : 0))) { S.voice = clamp(S.voice - 12, 0, 100); gainStat(g, 'wil', 0.6); S.me.guard += 1; return '기도문도 주문도 아닌, 어머니가 부르던 자장가를 속으로 불렀다. 목소리가 멀어졌다. 한동안은 조용할 것이다.'; }
      stress(g, 6); return '버텼다. 목소리는 웃지 않았다. 그냥 기다렸다. 새벽까지 눈을 뜨고 있었다.';
    }
    if (key === 'listen') {
      S.voice = clamp(S.voice + 4, 0, 100);
      const l = addLore(g, nextLore(g, 'dream', rng));
      return l ? `귀를 기울였다. ${loreLine(l)}` : '귀를 기울였다. 목소리는 이미 한 말을 되풀이했다. 처음보다 덜 무서웠다. 그게 더 무섭다.';
    }
    S.bond += 1; S.me.brk += 1; S.voice = clamp(S.voice + 8, 0, 100);
    const gift = rng.pick(['mana', 'magic', 'where']);
    if (gift === 'mana' && g.player.manaAwakened) { g.player.mana += 3; return '"무엇을 원하나." 나는 힘이라고 대답했다. 아침에 깨니 마력 그릇이 조금 깊어져 있었다. 목소리는 값을 말하지 않았다. 아직은.'; }
    if (gift === 'where') {
      const r = RELIC_IDS.find((k) => S.relics[k].at === 'lost' || S.relics[k].at === 'drift');
      if (r) { (S.heard ??= []).includes(r) || S.heard.push(r); return `"찾고 싶은 것이 있지." 목소리가 ${RELICS[r].name} 이야기를 했다. ${S.relics[r].place ? `${placeName(S.relics[r].place)} 쪽이라고.` : '어디인지는 말하지 않았다.'} 왜 알려 주는지는 묻지 않았다.`; }
    }
    gainSkill(g, 'magic', 0.8, 'int');
    return '"가르쳐 다오." 그렇게 말해 버렸다. 꿈에서 처음 보는 술식의 고리가 돌았다. 깨고 나서도 손끝에 남아 있다.';
  },
});

/* ---------- 유물 ---------- */
// 주울 수 있는 것: 이 고장에 있다는 것, 장물로 돈다는 말을 들은 것, 자리 모를 것은 목소리가 이끌 때만
const findable = (g) => { const S = DG(g); return RELIC_IDS.filter((k) => { const r = S.relics[k]; if (r.at !== 'lost' && r.at !== 'drift') return false; if (r.place === here(g)) return true; if (r.at === 'drift' && (S.heard ?? []).includes(k)) return true; return !r.place && S.voice >= 30; }); };
EVENTS.push({
  id: 'dg_relic_find', road: true, cooldown: 36,
  cond: (g) => grown(g) && findable(g).length > 0,
  chance: (g) => 0.01 + DG(g).voice / 2000, weight: 40,
  prepare: (g, rng) => { const S = DG(g); const c = findable(g); const near = c.filter((k) => S.relics[k].place === here(g)); return { id: rng.pick(near.length ? near : c), drift: false }; },
  title: '검은 물건',
  text: (g, c) => { const r = RELICS[c.id], S = DG(g); return S.relics[c.id].at === 'drift' ? `장물아비가 뒷골목에서 보자기를 풀었다. "물건 좀 볼 줄 아는 사람 같아서." ${J(r.name, '이/가')} 놓여 있다. ${r.power}는 말이 따라붙는 물건이다. 값은 은화 40닢을 부른다.` : `${onRoad(g) ? '길가 무너진 돌무덤' : '오래된 집 마루 밑'}에서 검은 천에 싸인 것이 나왔다. 풀어 보니 ${r.name}. 쥐지도 않았는데 손바닥이 서늘하다. ${r.power}고들 한다. ${r.cost}고도 한다.`; },
  choices: [
    { label: '손에 넣는다', run: (g, rng, c) => { const S = DG(g), r = S.relics[c.id]; if (r.at === 'drift') { if (money(g) < 40) return '은화가 모자랐다. 장물아비는 보자기를 다시 묶었다.'; g.player.money -= 40; } moveRelic(g, c.id, 'me', here(g)); S.voice = clamp(S.voice + 5, 0, 100); dlog(g, `${RELICS[c.id].name}을 손에 넣었다.`); return `${J(RELICS[c.id].name, '을/를')} 품에 넣었다. 그날 밤 꿈이 길었다.`; } },
    { label: '교단에 알린다', run: (g, rng, c) => { moveRelic(g, c.id, 'church', 'solaris'); DG(g).me.guard += 1; deed(g, 'loyal', 2, '마신의 유물을 교단에 알렸다'); return '사제가 성수를 들고 와서 물건을 쇠상자에 넣어 갔다. 이름을 묻더니 장부에 적었다. 좋은 쪽 장부이길 빈다.'; } },
    { label: '못 본 걸로 한다', run: () => '천을 다시 덮고 돌아섰다. 며칠 동안 그 자리가 생각났다.' },
  ],
});
// 봉인 조사에서 주운 검은 조각(seal의 fragments)이 손톱 조각이 된다
EVENTS.push({
  id: 'dg_shard_call', cooldown: 24,
  cond: (g) => grown(g) && (g.seal?.me?.fragments ?? 0) >= 1 && DG(g).relics.shard.at !== 'me',
  chance: () => 0.15, weight: 45,
  title: '주머니 속의 조각',
  text: () => '봉인 쪽에서 주워 둔 검은 조각이 밤마다 주머니 속에서 따뜻해진다. 오늘은 손에 쥐자 맥박처럼 뛰었다. 이것은 돌이 아니다. 무언가의 손톱이다.',
  choices: [
    { label: '쥐고 지닌다', run: (g) => { sealState(g).me.fragments -= 1; moveRelic(g, 'shard', 'me', here(g)); DG(g).voice += 4; return '조각을 가죽끈에 꿰어 목에 걸었다. 마력이 조금 더 쉽게 흐른다. 꿈은 조금 더 길어졌다.'; } },
    { label: '모른 척 둔다', run: () => '조각을 다시 주머니 깊이 넣었다. 따뜻함은 가시지 않았다.' },
  ],
});

ACTIONS.push({
  id: 'dg_relic',
  name: '유물',
  icon: 'skull',
  desc: '품에 지닌 마신의 유물을 어떻게 할지 정한다. 귀 기울이기, 교단·마탑·결사에 넘기기, 부수기, 팔기.',
  available: (g) => grown(g) && held(g).length > 0 && !sceneQueued(g, 'dg_relic'),
  run(g) { queueScene(g, 'dg_relic', { id: held(g)[0] }); return '궤짝을 열었다.'; },
});
defineScene('dg_relic', {
  need: (g, s) => DG(g).relics[s.id]?.at === 'me',
  title: (g, s) => RELICS[s.id].name,
  text: (g, s) => { const r = RELICS[s.id]; return `${r.name}. ${r.power}. 대신 ${r.cost}. ${held(g).length > 1 ? `궤짝에는 ${held(g).filter((k) => k !== s.id).map((k) => RELICS[k].name).join(', ')}도 있다.` : ''}`; },
  choices: (g) => {
    const S = DG(g), out = [{ label: '쥐고 귀 기울인다', key: 'listen' }];
    if (!onRoad(g)) { out.push({ label: '교단에 바친다', key: 'church' }); out.push({ label: '마탑에 넘긴다', key: 'tower' }); }
    if (S.watch) out.push({ label: '감시탑 파수꾼에게 맡긴다', key: 'watch' });
    if (S.order) out.push({ label: '사도회에 바친다', key: 'order' });
    if (wedgeHere(g) || S.watch) out.push({ label: '부숴 본다', key: 'destroy' });
    if (!onRoad(g)) out.push({ label: '장물아비에게 판다', key: 'sell' });
    out.push({ label: '그냥 둔다', key: 'keep' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const S = DG(g), id = s.id, r = RELICS[id];
    if (S.relics[id].at !== 'me') return '궤짝이 비어 있었다.';
    if (key === 'keep') return '뚜껑을 닫았다. 자물쇠를 두 번 확인했다.';
    if (key === 'listen') {
      S.voice = clamp(S.voice + 5, 0, 100); S.me.used += 1;
      const lid = r.of ? `relic_${r.of}` : null, l = lid && LORE[lid] ? addLore(g, lid) : null;
      return l ? loreLine(l) : `${J(r.name, '을/를')} 쥐고 눈을 감았다. 오래된 숨소리 같은 것이 손바닥으로 올라왔다. 알아들을 말은 없었다.`;
    }
    if (key === 'church') { moveRelic(g, id, 'church', 'solaris'); S.me.gave += 1; S.me.guard += 2; S.voice = clamp(S.voice - 10, 0, 100); deed(g, 'loyal', 3, '마신의 유물을 교단에 바쳤다'); if (g.faith) g.faith.devotion = clamp((g.faith.devotion ?? 0) + 5, 0, 100); return `대성당 뒷문에서 사제 셋이 ${J(r.name, '을/를')} 받아 갔다. 성수 냄새가 났다. 집에 오니 몸이 가벼웠다.`; }
    if (key === 'tower') { moveRelic(g, id, 'tower', 'serenia'); S.me.gave += 1; S.me.guard += 1; S.voice = clamp(S.voice - 8, 0, 100); g.player.money += 30; if (g.seal) g.seal.study = Math.min(100, (g.seal.study ?? 0) + 4); return `마탑 사람이 ${J(r.name, '을/를')} 납 상자에 담고 은화 30닢을 건넸다. "연구에 쓰겠소." 무엇을 연구하는지는 묻지 않았다.`; }
    if (key === 'watch') { moveRelic(g, id, 'watch'); S.me.gave += 1; S.me.guard += 2; S.voice = clamp(S.voice - 15, 0, 100); sealPush(g, 0.5); if (S.watch) S.watch.tasks += 1; return `파수꾼이 ${J(r.name, '을/를')} 소금 친 천에 싸서 북쪽으로 떠났다. 감시탑의 불 곁에 둔다고 했다.`; }
    if (key === 'order') { moveRelic(g, id, 'order'); S.me.brk += 2; S.voice = clamp(S.voice + 6, 0, 100); if (S.order) S.order.tasks += 2; if (g.seal) g.seal.cult = Math.min(100, (g.seal.cult ?? 0) + 2); return `일곱 의자 모임에서 ${J(r.name, '을/를')} 빈 의자 위에 올려놓았다. 촛불이 한꺼번에 기울었다. 사람들이 내게 고개를 숙였다.`; }
    if (key === 'destroy') {
      if (rng.chance(0.25 + (g.player.stats.wil ?? 0) / 200 + (S.watch ? 0.2 : 0) + (wedgeHere(g) ? 0.15 : 0))) {
        S.relics[id] = { at: 'gone', place: null }; S.me.destroyed += 1; S.me.guard += 3; S.voice = clamp(S.voice - 20, 0, 100); sealPush(g, 1); renown(g, 4);
        chron(g, `${g.player.name}, ${J(r.name, '을/를')} 부수다.`, 40);
        return `${wedgeHere(g) ? '쐐기 곁에서' : '파수꾼의 소금 원 안에서'} ${J(r.name, '을/를')} 내리쳤다. 세 번째에 금이 갔고, 일곱 번째에 가루가 되었다. 멀리서 무언가 길게 숨을 내쉬는 소리가 났다. 꿈이 조용해졌다.`;
      }
      g.player.injuries.push({ name: '유물을 부수다 덴 손', months: 2 }); S.voice = clamp(S.voice + 10, 0, 100);
      return `망치가 튕겨 나왔다. 손바닥이 데었다. ${J(r.name, '은/는')} 흠집 하나 없다. 꿈속에서 누가 웃었다.`;
    }
    const pay = 60 + (r.pow ?? 0) * 3; g.player.money += pay; moveRelic(g, id, 'drift', here(g)); S.me.sold += 1; S.me.brk += 1; deed(g, 'honest', -2, '마신의 유물을 장물아비에게 팔았다');
    return `장물아비가 눈을 반짝이며 은화 ${pay}닢을 세어 주었다. 누구 손에 들어갈지는 모른다. 알고 싶지 않다.`;
  },
});

/* ---------- 사도회 '일곱 의자' ---------- */
defineScene('dg_order_invite', {
  need: (g) => !DG(g).order && !onRoad(g),
  title: () => '일곱 의자',
  text: (g) => `${(g.faith?.dawn?.rank ?? -1) >= 1 ? '검은 새벽 집회가 끝난 뒤, 늘 맨 뒷줄에 앉던 노파가 나를 붙잡았다.' : '여관 방문 틈으로 쪽지가 들어왔다. 밤에 찾아간 지하실에서 두건 쓴 노파가 기다리고 있었다.'} "검은 새벽은 겉껍질이야. 노래하고 촛불 켜는 사람들. 그 안쪽에 의자 일곱이 있지. 오백 년 전 그분을 모시던 이들의 자리. 너한테서 그분 냄새가 나." 노파 뒤로 빈 의자 일곱이 둥글게 놓여 있다.`,
  choices: () => [
    { label: '의자 곁에 선다', key: 'join' },
    { label: '거절하고 나온다', key: 'refuse' },
    { label: '이단심문소에 알린다', key: 'report' },
  ],
  resolve(g, rng, s, key) {
    const S = DG(g);
    if (key === 'join') { S.order = { rank: 0, tasks: 0, since: mi(g) }; S.me.brk += 1; dlog(g, '사도회에 들었다.'); return '노파가 내 손등에 재로 작은 원을 그렸다. "문지기부터야. 문을 지키는 사람은 문 안을 볼 수 있지." 지하실 계단을 올라오니 새벽이었다.'; }
    if (key === 'refuse') { S.me.refused.order = true; return '"언젠가 다시 오게 될 거야. 다들 그래." 노파는 붙잡지 않았다.'; }
    S.me.refused.order = true; S.me.guard += 2; S.me.betrayed = (S.me.betrayed ?? 0) + 1; deed(g, 'loyal', 2, '사도회 모임을 이단심문소에 알렸다'); if (g.seal) g.seal.cult = Math.max(0, (g.seal.cult ?? 0) - 4);
    return '심문관들이 지하실을 덮쳤을 때 의자 일곱만 남아 있었다. 그래도 장부 몇 권을 건졌다고 한다. 그날 밤 우리 집 문에 재로 원이 그려져 있었다.';
  },
});
ACTIONS.push({
  id: 'dg_order',
  name: '일곱 의자 모임',
  icon: 'mask',
  desc: '사도회 모임에 나간다. 유물을 찾고, 낡은 명부를 읽고, 쫓기는 형제를 숨겨 준다. 들키면 이단심문소가 온다.',
  available: (g) => settled(g) && !!DG(g).order && ORDER_CITIES.includes(here(g)) && !sceneQueued(g, 'dg_order'),
  run(g) { queueScene(g, 'dg_order'); return '밤이 깊어지길 기다려 지하실 계단을 내려갔다.'; },
});
defineScene('dg_order', {
  need: (g) => !!DG(g).order,
  title: () => '일곱 의자 모임',
  text: (g) => { const o = DG(g).order; return `촛불 일곱, 의자 일곱. 일곱째 의자는 언제나 비어 있다. 나는 ${ORDER_RANKS[o.rank]}다. ${o.rank >= 2 ? '노파가 요즘 자꾸 일곱째 의자를 쳐다보다 나를 본다.' : '사람들은 서로 이름을 부르지 않는다.'}`; },
  choices: (g) => {
    const o = DG(g).order, out = [{ label: '유물을 찾으러 나선다', key: 'seek' }, { label: '낡은 명부를 읽는다', key: 'read' }, { label: '쫓기는 형제를 숨겨 준다', key: 'shelter' }];
    if (o.rank >= 1) out.push({ label: '빈 의자 앞의 의식에 선다', key: 'rite' });
    out.push({ label: '모임을 떠난다', key: 'leave' }, { label: '이단심문소에 넘긴다', key: 'betray' });
    return out;
  },
  resolve(g, rng, s, key) {
    const S = DG(g), o = S.order;
    if (!o) return '지하실은 비어 있었다.';
    const rankUp = () => { const nr = o.tasks >= 10 && S.bond >= 1 ? 2 : o.tasks >= 4 ? 1 : 0; if (nr > o.rank) { o.rank = nr; dlog(g, `사도회의 ${ORDER_RANKS[nr]}가 되었다.`); return ` 노파가 나를 ${ORDER_RANKS[nr]}라 불렀다.`; } return ''; };
    const caught = () => { if (rng.chance(0.08)) { suspect(g, 15); return ' 돌아오는 길에 누가 뒤를 밟는 것 같았다.'; } return ''; };
    if (key === 'seek') {
      o.tasks += 1; S.me.tasks += 1; S.me.brk += 1;
      const c = RELIC_IDS.filter((k) => ['lost', 'drift'].includes(S.relics[k].at));
      if (c.length && rng.chance(0.3)) { const id = rng.pick(c); moveRelic(g, id, 'order'); return `형제 둘과 사흘을 헤맨 끝에 ${J(RELICS[id].name, '을/를')} 찾아 빈 의자 위에 올렸다.${rankUp()}${caught()}`; }
      return `옛 무덤 셋을 뒤졌지만 빈손이었다. 노파는 서두를 것 없다고 했다. 오백 년을 기다렸으니.${rankUp()}${caught()}`;
    }
    if (key === 'read') { const l = addLore(g, nextLore(g, 'order', rng)); o.tasks += 1; return l ? `${loreLine(l)}${rankUp()}` : `명부를 다시 읽었다. 이름 없는 일곱째 의자 칸에 누가 손톱으로 그은 자국이 새로 났다.${rankUp()}`; }
    if (key === 'shelter') { o.tasks += 1; S.me.tasks += 1; suspect(g, 10); deed(g, 'kind', 1, null); return `심문관에게 쫓기는 젊은 형제를 사흘 동안 다락에 숨겼다. 떠나는 날 그는 내 손을 잡고 오래 놓지 않았다.${rankUp()}`; }
    if (key === 'rite') { o.tasks += 1; S.me.brk += 2; S.voice = clamp(S.voice + 6, 0, 100); if (g.seal) g.seal.cult = Math.min(100, (g.seal.cult ?? 0) + 1.5); return `빈 의자 앞에서 모두 무릎을 꿇었다. 이름 없는 노래가 지하실을 채웠다. 촛불 일곱이 한꺼번에 북쪽으로 기울었다.${rankUp()}${caught()}`; }
    if (key === 'leave') { S.order = null; S.me.refused.order = true; stress(g, 4); return '재로 그린 원을 손등에서 지웠다. 노파는 말리지 않았다. "의자는 기다려."'; }
    S.order = null; S.me.refused.order = true; S.me.guard += 3; S.me.brk = Math.max(0, S.me.brk - 2); S.me.betrayed = (S.me.betrayed ?? 0) + 1;
    if (g.seal) g.seal.cult = Math.max(0, (g.seal.cult ?? 0) - 6);
    for (const k of RELIC_IDS) if (S.relics[k].at === 'order' && rng.chance(0.6)) moveRelic(g, k, 'church', 'solaris');
    deed(g, 'loyal', 3, '사도회를 이단심문소에 넘겼다'); renown(g, 3);
    chron(g, `사도회 '일곱 의자'의 지하실이 이단심문소에 털리다.`, 35);
    return '이단심문소 기사들 앞에서 지하실 길을 그려 주었다. 그날 밤 의자 일곱이 불탔다. 노파는 끝까지 나를 보지 않았다. 의자는 다시 놓일 것이다. 다른 지하실에.';
  },
});
EVENTS.push({
  id: 'dg_revenge', cooldown: 48,
  cond: (g) => grown(g) && (DG(g).me.betrayed ?? 0) > 0,
  chance: () => 0.05, weight: 50,
  title: '재로 그린 원',
  text: () => '아침에 나가 보니 문 앞에 재로 원이 그려져 있다. 원 한가운데 작은 칼자국. 일곱 의자 사람들은 잊지 않는다.',
  choices: [
    { label: '경비를 사서 집을 지킨다', run: (g) => { const n = Math.min(money(g), 20); g.player.money -= n; DG(g).me.betrayed -= 1; return `은화 ${n}닢을 들여 한 달 동안 문지기를 세웠다. 원은 다시 그려지지 않았다.`; } },
    { label: '모른 척 지낸다', run: (g, rng) => { if (rng.chance(0.4)) { g.player.injuries.push({ name: '골목에서 당한 칼자국', months: 2 }); return '사흘 뒤 골목에서 두건 쓴 사람이 스쳐 지나갔다. 팔이 화끈했다. 그는 이미 없었다.'; } return '원은 비에 씻겨 갔다. 그래도 밤마다 문빗장을 두 번 확인한다.'; } },
  ],
});

/* ---------- 감시탑의 파수꾼 ---------- */
EVENTS.push({
  id: 'dg_watch_invite', cooldown: 60,
  cond: (g) => settled(g) && !DG(g).watch && !DG(g).me.refused.watch && (DG(g).me.guard >= 2 || (g.seal?.me?.guard ?? 0) >= 2 || DG(g).known.length >= 5 || DG(g).me.gave >= 1),
  chance: () => 0.08, weight: 45,
  title: '잿빛 외투의 사내',
  text: () => '소금 냄새 나는 잿빛 외투를 입은 사내가 찾아왔다. 목에 작은 등잔 모양 쇠붙이를 걸었다. "감시탑에서 왔소. 노아 님의 불을 지키는 사람들이오. 당신이 한 일을 들었소. 우리는 사람이 늘 모자라오."',
  choices: [
    { label: '파수꾼이 된다', run: (g) => { const S = DG(g); S.watch = { rank: 0, tasks: 0, since: mi(g) }; S.me.guard += 1; dlog(g, '감시탑의 파수꾼이 되었다.'); return '사내가 등잔 쇠붙이 하나를 내 손에 쥐여 주었다. "불은 꺼지면 안 되오. 그것만 기억하시오."'; } },
    { label: '아직은 아니다', run: (g) => { DG(g).me.refused.watch = true; return '"불은 기다려 주지 않소." 사내는 그 말만 남기고 북쪽으로 갔다.'; } },
  ],
});
ACTIONS.push({
  id: 'dg_watch',
  name: '파수꾼의 일',
  icon: 'lantern',
  desc: '감시탑의 파수꾼으로 일한다. 쐐기를 지키고, 사도의 잔영을 쫓고, 유물을 거둬 북쪽으로 보낸다.',
  available: (g) => settled(g) && !!DG(g).watch && !sceneQueued(g, 'dg_watch'),
  run(g) { queueScene(g, 'dg_watch'); return '등잔 쇠붙이를 목에 걸었다.'; },
});
defineScene('dg_watch', {
  need: (g) => !!DG(g).watch,
  title: () => '파수꾼의 일',
  text: (g) => { const w = DG(g).watch; return `나는 감시탑의 ${WATCH_RANKS[w.rank]}다. ${wedgeHere(g) ? '이 고장에는 쐐기가 있다. 지키는 사람들이 나를 알아보고 고개를 끄덕인다.' : '이 고장에 쐐기는 없지만 할 일은 있다.'}`; },
  choices: (g) => {
    const out = [];
    if (wedgeHere(g)) out.push({ label: '쐐기 곁에서 밤을 새운다', key: 'guard' });
    out.push({ label: '사도의 잔영을 쫓는다', key: 'hunt' }, { label: '파수꾼의 옛이야기를 듣는다', key: 'learn' }, { label: '파수꾼을 그만둔다', key: 'quit' });
    return out;
  },
  resolve(g, rng, s, key) {
    const S = DG(g), w = S.watch;
    if (!w) return '등잔 쇠붙이가 차갑다.';
    const rankUp = () => { const nr = w.tasks >= 10 ? 2 : w.tasks >= 4 ? 1 : 0; if (nr > w.rank) { w.rank = nr; dlog(g, `파수꾼의 ${WATCH_RANKS[nr]}가 되었다.`); return ` 이제 ${WATCH_RANKS[nr]}라 불린다.`; } return ''; };
    if (key === 'guard') { w.tasks += 1; S.me.guard += 1; sealPush(g, 0.3); g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 15); return `쐐기 곁에서 밤을 새웠다. 새벽 무렵 바닥 밑에서 무언가 긁는 소리가 났다가 멎었다. 등잔불은 꺼지지 않았다.${rankUp()}`; }
    if (key === 'hunt') {
      w.tasks += 1; S.me.guard += 1;
      const k = rng.pick(Object.keys(APOSTLES).filter((x) => x !== 'seventh')); S.stir[k] = clamp(S.stir[k] - 12, 0, 100);
      if (rng.chance(0.3)) g.player.injuries.push({ name: '그림자에 긁힌 상처', months: 1 });
      return `${APOSTLES[k].name}의 자리 근처에서 사람 꼴을 한 그림자를 쫓았다. 소금과 불로 몰아냈다. 그 자리가 한동안은 조용할 것이다.${rankUp()}`;
    }
    if (key === 'learn') { const l = addLore(g, nextLore(g, 'watch', rng)); w.tasks += 1; return l ? `${loreLine(l)}${rankUp()}` : `늙은 파수꾼이 감시탑 꼭대기의 바람 이야기를 했다. 오백 년 동안 그 바람이 그친 적이 없다고.${rankUp()}`; }
    S.watch = null; S.me.refused.watch = true; return '등잔 쇠붙이를 사내에게 돌려주었다. 그는 아무 말 없이 받아 갔다.';
  },
});

/* ---------- 갈림길: 두 쪽이 다 나를 안다 ---------- */
EVENTS.push({
  id: 'dg_crossroad', cooldown: 120,
  cond: (g) => grown(g) && !!DG(g).order && !!DG(g).watch,
  chance: () => 0.25, weight: 70,
  title: '두 개의 등불',
  text: () => '같은 달에 두 사람이 찾아왔다. 먼저 사도회 노파가 "파수꾼 냄새가 난다"며 내 손등의 원을 오래 들여다보았고, 사흘 뒤엔 잿빛 외투의 사내가 "재 냄새가 난다"고 했다. 둘 다 내 대답을 기다린다.',
  choices: [
    { label: '감시탑의 불을 고른다', run: (g) => { const S = DG(g); S.order = null; S.me.refused.order = true; S.me.guard += 3; return '사도회 지하실에 다시 가지 않았다. 손등의 원은 문질러도 한동안 남아 있었다.'; } },
    { label: '빈 의자를 고른다', run: (g) => { const S = DG(g); S.watch = null; S.me.refused.watch = true; S.me.brk += 3; return '등잔 쇠붙이를 우물에 던졌다. 물 밑에서 한참 반짝이다 꺼졌다.'; } },
    { label: '둘 다 속인다', run: (g, rng) => { const S = DG(g); S.me.guard += 1; S.me.brk += 1; stress(g, 8); if (rng.chance(0.4)) { suspect(g, 20); return '두 쪽에 다른 말을 했다. 노파는 웃었고 사내는 고개를 끄덕였다. 그런데 돌아오는 길에 심문관 하나가 내 얼굴을 오래 보았다.'; } return '두 쪽에 다른 말을 했다. 노파는 웃었고 사내는 고개를 끄덕였다. 누가 누구를 속이는지 나도 헷갈린다.'; } },
  ],
});
void placeName;
