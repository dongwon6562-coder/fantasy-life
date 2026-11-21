// 마나와 함께 사는 일: 샘에 가서 마나를 들이켜고(마력이 조금 늘지만 너무 잦으면 중독), 샘지기가 되어 샘을 지키고,
// 샘을 노리는 무리를 막거나 비켜서고, 마나 폭풍 속에서 버티고, 마나가 짙은 해에 태어난 아이가 마력을 타고나는 것을 본다.
// 고서클은 여전히 드물다: 샘물은 마력 그릇(manaPotential)에 비례해서만 채워 주고, 술식 솜씨(magic)는 주지 않는다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat, me, playerAge } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, tired, stress, spend, canSpend, up, gains } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { member } from '../tower/state.js';
import { MS, WELLS, WELL_IDS, HOLDERS, clamp, mi, mlog, placeName, wellAt, flowWord, poisonWord } from './state.js';
import { seize } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const st = (g, k) => g.player.stats[k] ?? 0;
const wl = (g, id) => MS(g).wells[id];
const wellHere = (g) => { const id = wellAt(here(g)); return id && !wl(g, id).dry ? id : null; };
// 샘물 한 모금 값: 주인에 따라
function feeOf(g, id) {
  const w = wl(g, id), S = MS(g);
  if (w.holder === 'me' || S.me.warden === id) return 0;
  if (w.holder === 'tower') return member(g) ? 0 : 25;
  if (w.holder === 'church') return 10;
  if (w.holder === 'lord') return 8;
  if (w.holder === 'dwarf') return g.player.race === 'dwarf' ? 0 : 15;
  if (w.holder === 'rogue') return 0;
  return null; // 샘지기: 돈으로는 안 된다
}

/* ---------- 마나 샘에 간다 ---------- */
ACTIONS.push({
  id: 'mana_well', name: '마나 샘에 간다', icon: 'magic',
  desc: '이 고장의 마나 샘에 간다. 마력이 깨어난 사람은 샘물을 마셔 마력을 채울 수 있다. 너무 자주 마시면 마나에 중독된다. 샘을 지키는 사람들에게 청할 수도 있다.',
  available: (g) => free(g) && !!wellHere(g) && !sceneQueued(g, 'mana_well'),
  run(g) { queueScene(g, 'mana_well', { id: wellHere(g) }, { first: true }); return `${J(WELLS[wellHere(g)].name, '으로/로')} 내려갔다. 공기가 차고, 귀가 먹먹하다.`; },
});
defineScene('mana_well', {
  title: (g, s) => WELLS[s.id]?.name ?? '마나 샘',
  text: (g, s) => {
    const w = wl(g, s.id), d = WELLS[s.id], S = MS(g);
    return `${d.desc} 물줄기는 ${flowWord(w.flow, w.dry)}. 지금은 ${HOLDERS[w.holder].name}의 샘이다. ${HOLDERS[w.holder].desc}${S.me.poison >= 15 ? ` 샘 냄새를 맡자 ${poisonWord(S.me.poison)}.` : ''}${g.player.manaAwakened ? '' : ' 마력이 깨어나지 않은 몸에는 그저 차가운 물이다.'}`;
  },
  choices: (g, s) => {
    const w = wl(g, s.id), S = MS(g);
    if (!free(g) || here(g) !== WELLS[s.id]?.place || w.dry) return [];
    const fee = feeOf(g, s.id), out = [];
    if (g.player.manaAwakened) {
      if (fee === 0) out.push({ label: '샘물을 마신다', key: 'drink' });
      else if (fee != null && canSpend(g, fee)) out.push({ label: `값을 치르고 마신다 (은화 ${fee}닢)`, key: 'drink' });
      if (fee == null || fee > 0) out.push({ label: '몰래 마신다', key: 'sneak' });
    }
    if (w.holder === 'wardens' && S.me.warden !== s.id && !S.me.warden) out.push({ label: '샘지기가 되겠다고 청한다', key: 'join' });
    if (S.me.warden === s.id) out.push({ label: '샘지기 일을 내려놓는다', key: 'quit' });
    out.push({ label: '물소리만 듣고 돌아간다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    const w = wl(g, s.id), d = WELLS[s.id], S = MS(g);
    if (key === 'leave') { stress(g, -3); return '한참 물소리를 들었다. 머릿속이 조금 조용해졌다.'; }
    if (w.dry) return '그사이 샘이 말라 바닥만 젖어 있었다.';
    if (key === 'join') {
      if (w.holder !== 'wardens' || S.me.warden) return '샘지기들은 지금 사람을 받지 않는다고 했다.';
      if (!check(rng, st(g, 'wil') + st(g, 'sen') / 2 + (g.player.manaAwakened ? 10 : 0), 60)) return '늙은 샘지기가 한참 내 눈을 들여다보더니 고개를 저었다. "샘을 마시러 온 눈이야. 지키러 온 눈이 아니고." 한 해쯤 뒤에 다시 와 보라고 했다.';
      S.me.warden = s.id; S.me.wardenM = 0;
      note(g, `${placeName(d.place)} ${d.name}의 샘지기가 되었다.`);
      mlog(g, `${d.name}의 샘지기가 되었다.`);
      return `샘지기들이 내 손바닥에 샘물로 금을 그었다. "이제 이 물은 네가 지킬 물이다. 네가 마실 물이 아니라." 이 고장에서 "샘을 지킨다".`;
    }
    if (key === 'quit') { S.me.warden = null; return '샘지기 표식인 나무 잔을 돌려주었다. 늙은 샘지기는 아무 말 없이 받았다.'; }
    if (key === 'sneak') {
      if (!check(rng, st(g, 'agi') + st(g, 'sen') - w.guard / 2, 50)) {
        const fine = Math.min(g.player.money, 20); g.player.money -= fine; deed(g, 'honest', -2, null, here(g));
        return `잔을 채우기도 전에 붙잡혔다. ${fine ? `은화 ${fine}닢을 뜯기고` : '빈 주머니를 뒤집어 보이고'} 쫓겨났다.`;
      }
    } else {
      const fee = feeOf(g, s.id);
      if (fee == null) return '샘지기들이 길을 막았다.';
      if (fee > 0 && !spend(g, fee)) return '돈이 모자랐다.';
    }
    // 마신다: 마력 그릇에 비례해서만 채워진다
    const p = g.player, gain = (p.manaPotential ?? 0) * (0.8 + w.flow / 100) * (S.me.poison >= 60 ? 0.5 : 1);
    p.mana = (p.mana ?? 0) + gain;
    const dose = (6 + w.flow / 10 - st(g, 'wil') / 25) * (w.holder === 'rogue' ? 1.5 : 1) * (mi(g) - S.me.lastDraw <= 2 ? 1.6 : 1);
    S.me.poison = clamp(S.me.poison + Math.max(2, dose), 0, 100);
    S.me.draws += 1; S.me.lastDraw = mi(g);
    tired(g, 4);
    const pw = S.me.poison >= 70 ? ' 손끝이 떨려 잔을 놓쳤다. 몸이 그만 마시라고 한다.' : S.me.poison >= 40 ? ' 혀끝에 쇠 맛이 오래 남았다.' : '';
    return `${rng.pick(['샘물이 목을 지나자 등줄기를 따라 차가운 불이 번졌다.', '한 모금. 눈앞이 푸르게 번쩍였다가 가라앉았다.', '물은 아무 맛이 없었다. 그런데 손바닥에 술식을 그리면 선이 더 오래 남는다.'])}${pw}${gains([up('마력', gain)])}`;
  },
});

/* ---------- 샘을 지킨다 ---------- */
ACTIONS.push({
  id: 'mana_ward', name: '샘을 지킨다', icon: 'shield',
  desc: '샘지기로서 샘을 돌보고 지킨다. 샘에 꼬이는 마물을 쫓고, 몰래 퍼 가는 자를 막는다. 샘지기들이 밥과 약간의 돈을 준다.',
  available: (g) => { const id = MS(g).me.warden; return free(g) && !!id && here(g) === WELLS[id]?.place; },
  run(g, rng) {
    const S = MS(g), id = S.me.warden, w = wl(g, id);
    w.guard = clamp(w.guard + 3, 0, 100); S.me.wardenM += 1;
    g.player.money += 3;
    const sw = gainStat(g, 'wil', 0.5), ss = gainStat(g, 'sen', 0.4);
    tired(g, 6);
    if (rng.chance(0.08 + (w.flow > 60 ? 0.05 : 0))) {
      if (check(rng, st(g, 'str') + st(g, 'agi') / 2 + (g.player.skills.sword ?? 0) / 2, 60)) { deed(g, 'brave', 2, null, here(g)); return `샘 냄새를 맡고 내려온 마물을 횃불과 창으로 쫓았다. 샘지기들이 고개를 끄덕였다.${gains([up('의지', sw), up('감각', ss)])}`; }
      injure(g, '샘에 꼬인 마물에게 물린 팔', 2);
      return '샘에 꼬인 마물과 엉켰다. 쫓기는 했지만 팔을 물렸다. 늙은 샘지기가 샘물로 상처를 씻어 주었다.';
    }
    return `${rng.pick(['샘가의 이끼를 걷고 물길을 텄다.', '밤새 샘 곁 모닥불을 지켰다. 물소리가 별소리처럼 들렸다.', '샘물을 퍼 가려던 떠돌이를 돌려보냈다. 그의 눈 흰자가 푸르스름했다.', '늙은 샘지기에게 샘이 마른 해와 넘친 해의 이야기를 들었다.'])} 은화 3닢.${gains([up('의지', sw), up('감각', ss)])}`;
  },
});

/* ---------- 샘을 노리는 자들 ---------- */
defineScene('mana_siege', {
  title: () => '샘을 노리는 자들',
  text: (g, s) => `${J(HOLDERS[s.by].name, '이/가')} ${J(WELLS[s.id].name, '을/를')} 차지하겠다며 몰려왔다. 횃불이 스물, 서른. ${s.by === 'rogue' ? '앞장선 술사의 눈이 검게 물들어 있다.' : s.by === 'tower' ? '마탑의 문장을 단 연구원과 고용한 칼잡이들이다.' : '깃발과 문서를 들고 왔다. 이 샘은 이제 자기들 것이라는 문서다.'}`,
  choices: (g, s) => {
    const S = MS(g), w = wl(g, s.id);
    if (!free(g) || here(g) !== WELLS[s.id]?.place || !(w.holder === 'me' || S.me.warden === s.id) || w.holder === s.by) return [];
    return [{ label: '샘 앞을 막아선다', key: 'hold' }, { label: '말로 돌려보낸다', key: 'talk' }, ...(canSpend(g, 60) ? [{ label: '돈을 쥐여 보낸다 (은화 60닢)', key: 'pay' }] : []), { label: '비켜선다', key: 'yield' }];
  },
  resolve(g, rng, s, key) {
    const S = MS(g), w = wl(g, s.id), d = WELLS[s.id];
    if (!(w.holder === 'me' || S.me.warden === s.id) || w.holder === s.by) return '그사이 샘의 주인은 이미 바뀌어 있었다.';
    if (key === 'yield') { seize(g, s.id, s.by); return '횃불이 지나가도록 비켜섰다. 샘지기들은 나를 보지 않았다.'; }
    if (key === 'pay') { if (!spend(g, 60)) return '돈이 모자랐다.'; w.guard = clamp(w.guard + 5, 0, 100); return '은화 주머니가 오갔다. 그들은 돌아갔다. 내년에 또 올 것이다.'; }
    if (key === 'talk') {
      if (check(rng, st(g, 'cha') + (L(g).renown ?? 0) / 3, 60)) { S.me.defended += 1; w.guard = clamp(w.guard + 8, 0, 100); return `샘이 누구 것인지, 지난 백 년 동안 누가 이 물을 지켰는지 이야기했다. 우두머리가 침을 뱉고 돌아섰다.`; }
      seize(g, s.id, s.by); return '말이 통하지 않았다. 그들은 나를 밀치고 샘으로 내려갔다.';
    }
    tired(g, 15);
    if (check(rng, st(g, 'str') + st(g, 'wil') / 2 + (g.player.skills.sword ?? 0) + w.guard / 3, 90)) {
      S.me.defended += 1; w.guard = clamp(w.guard + 15, 0, 100);
      deed(g, 'brave', 5, `${J(g.player.name, '이/가')} ${J(d.name, '을/를')} 지켜 냈다더라`, d.place);
      return '샘 입구 좁은 길에서 버텼다. 새벽이 오자 그들이 물러났다. 샘지기들이 내 이름을 샘가 돌에 새겼다.';
    }
    injure(g, '샘 앞 싸움에서 베인 옆구리', 3); seize(g, s.id, s.by);
    return '막아섰지만 수가 너무 많았다. 베이고 밀려났다. 샘은 그들 것이 되었다.';
  },
});

/* ---------- 마나 폭풍 ---------- */
defineScene('mana_storm', {
  title: () => '마나 폭풍',
  text: () => '하늘이 푸르게 찢어졌다. 번개가 땅에서 하늘로 치솟고, 머리카락이 곤두서고, 쇠붙이마다 불꽃이 튄다. 사람들이 지하실로 뛰어든다. 폭풍 한가운데로 걸어 들어가는 마법사도 있다고들 한다.',
  choices: (g, s) => (free(g) && here(g) === WELLS[s.well]?.place
    ? [{ label: '지하실에 숨는다', key: 'hide' }, { label: '이웃들을 지하실로 끌어들인다', key: 'help' }, ...(g.player.manaAwakened ? [{ label: '폭풍 속으로 걸어 들어간다', key: 'walk' }] : [])] : []),
  resolve(g, rng, s, key) {
    const S = MS(g);
    S.me.storms += 1;
    if (key === 'hide') { stress(g, 4); return '지하실에서 사흘을 보냈다. 나와 보니 우물 두레박이 녹아 있었다.'; }
    if (key === 'help') {
      tired(g, 10); deed(g, 'kind', 3, null, here(g));
      if (rng.chance(0.2)) { injure(g, '마나 번개에 덴 손', 2); return '노인 둘과 아이 하나를 끌어들였다. 마지막에 문을 닫다가 손에 번개가 스쳤다.'; }
      return '골목을 뛰어다니며 사람들을 지하실로 밀어 넣었다. 폭풍이 지나간 뒤 한 집도 비지 않았다.';
    }
    const p = g.player, gain = (p.manaPotential ?? 0) * rng.float(2, 4);
    S.me.poison = clamp(S.me.poison + rng.int(15, 30), 0, 100);
    if (rng.chance(0.25)) { injure(g, '마나 폭풍에 탄 살갗', 3); p.mana += gain * 0.5; return `폭풍 속에서 무릎을 꿇었다. 살갗이 탔다. 그래도 무언가가 몸 안에 남았다.${gains([up('마력', gain * 0.5)])}`; }
    p.mana += gain; gainStat(g, 'wil', 1);
    note(g, '마나 폭풍 한가운데에 서 보았다.');
    return `폭풍 한가운데는 조용했다. 푸른 빛이 숨을 쉴 때마다 폐로 들어왔다. 나와 보니 손끝이 한동안 빛났다.${gains([up('마력', gain)])}`;
  },
});

/* ---------- 사건: 마나에 목마르다 ---------- */
EVENTS.push({
  id: 'mana_crave', cooldown: 18, weight: 5,
  chance: () => 0.5,
  cond: (g) => free(g) && MS(g).me.draws >= 5 && mi(g) - MS(g).me.lastDraw >= 3 && MS(g).me.poison < 30,
  title: '샘물 생각',
  text: () => '밤에 잠이 오지 않는다. 혀끝이 마르고, 손바닥이 차다. 샘물 한 모금이면 될 것 같다. 장터 뒷골목에 마석 가루를 파는 사람이 있다는 것을 안다.',
  choices: [
    { label: '참는다', run: (g) => { stress(g, 6); const s = gainStat(g, 'wil', 1); MS(g).me.crave += 1; return `이를 악물고 새벽을 기다렸다. 해가 뜨자 조금 나아졌다.${gains([up('의지', s)])}`; } },
    { label: '마석 가루를 사서 녹여 마신다 (은화 15닢)', show: (g) => canSpend(g, 15), run: (g, rng) => {
      if (!spend(g, 15)) return '돈이 모자랐다.';
      const S = MS(g); S.me.poison = clamp(S.me.poison + 12, 0, 100); S.me.lastDraw = mi(g);
      if (g.player.manaAwakened) g.player.mana += (g.player.manaPotential ?? 0) * 0.3;
      if (rng.chance(0.2)) { injure(g, '마석 가루에 상한 속', 2); return '가루에 뭔가 섞여 있었다. 사흘을 앓았다.'; }
      return '쓴맛 뒤에 푸른 열기가 번졌다. 잠이 왔다. 깨어나니 입안이 쇠 맛이다.';
    } },
  ],
});

/* ---------- 사건: 마나가 짙은 해의 아이 ---------- */
const sparkKid = (g) => {
  if ((MS(g).tide ?? 0) < 30) return null;
  try { return (me(g).childIds ?? []).map((id) => byId(g, id)).find((p) => p && p.alive && !p.isPlayer && ageYears(p) >= 4 && ageYears(p) <= 12 && p.manaSpark == null) ?? null; } catch { return null; }
};
EVENTS.push({
  id: 'mana_child', cooldown: 36, weight: 5,
  chance: () => 0.4,
  cond: (g) => isAdult(g) && !g.over && !L(g).travel && !!sparkKid(g),
  prepare: (g, rng) => { const p = sparkKid(g); return { kid: p?.id, spark: rng.float(0.2, 0.42) }; },
  title: '마나가 짙은 해의 아이',
  text: (g, c) => { const p = byId(g, c.kid); return `마나가 짙은 해다. ${p ? J(p.name, '이/가') : '아이가'} 밤에 잠꼬대를 하면 등잔불이 흔들리고, 우물가에 서면 물이 잔물결을 친다. 마을 사람들이 수군거린다. 마탑에서 아이들을 살피러 다니는 사람이 근처에 왔다고 한다.`; },
  choices: [
    { label: '조용히 지켜본다', run: (g, rng, c) => { const p = byId(g, c.kid); if (!p) return '아이는 이미 집을 떠난 뒤였다.'; p.manaSpark = c.spark * 0.85; MS(g).me.kids += 1; return '아무에게도 말하지 않았다. 아이가 잠든 뒤 흔들리는 등잔불을 오래 보았다.'; } },
    { label: '마탑 사람에게 보인다 (은화 10닢)', show: (g) => canSpend(g, 10), run: (g, rng, c) => { const p = byId(g, c.kid); if (!p) return '아이는 이미 집을 떠난 뒤였다.'; if (!spend(g, 10)) return '돈이 모자랐다.'; p.manaSpark = c.spark; MS(g).me.kids += 1; return `마탑 사람이 아이 손바닥에 마석을 올렸다. 돌이 희미하게 빛났다. "그릇이 있습니다. 크지는 않아도." 그는 장부에 ${J(p.name, '을/를')} 적었다.`; } },
    { label: '교단 사제에게 데려가 눌러 달라고 한다', run: (g, rng, c) => { const p = byId(g, c.kid); if (!p) return '아이는 이미 집을 떠난 뒤였다.'; p.manaSpark = 0; return '사제가 아이 이마에 성유를 바르고 기도했다. 그 뒤로 등잔불은 흔들리지 않았다. 아이는 한동안 말이 없었다.'; } },
  ],
});

/* ---------- 달마다: 중독, 샘 곁의 마력, 샘지기 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (!g.mana || g.over) return;
  const S = MS(g), p = g.player;
  if (S.me.poison > 0) {
    if (S.me.poison >= 40) { stress(g, 2); p.fatigue = clamp(p.fatigue + 3, 0, 100); }
    if (S.me.poison >= 75 && (rng?.chance?.(0.08) ?? false)) injure(g, '마나에 덴 핏줄', 2);
    S.me.poison = clamp(S.me.poison - (mi(g) - S.me.lastDraw >= 2 ? 1.8 : 0.6), 0, 100);
  }
  // 센 샘 곁에 살면 마력이 아주 조금 더 차오른다
  const id = !L(g).travel ? wellAt(L(g).place) : null;
  if (id && p.manaAwakened && !wl(g, id).dry && wl(g, id).flow >= 50 && S.tide > 20) p.mana += (p.manaPotential ?? 0) * 0.05;
  // 샘지기가 샘을 여섯 달 넘게 비우면 이름을 지운다
  if (S.me.warden) {
    const w = wl(g, S.me.warden);
    if (w.holder !== 'wardens' && w.holder !== 'me') S.me.warden = null;
    else if (L(g).place !== WELLS[S.me.warden].place) { S.me.awayM = (S.me.awayM ?? 0) + 1; if (S.me.awayM >= 6) { note(g, `${J(WELLS[S.me.warden].name, '을/를')} 너무 오래 비워 샘지기 이름이 지워졌다.`); S.me.warden = null; S.me.awayM = 0; } }
    else S.me.awayM = 0;
  }
});

/* ---------- 대를 이으면: 마나가 짙은 해에 태어난 아이 ---------- */
HOOKS.heir.push((g) => {
  if (!g.mana) return;
  const S = MS(g), p = g.player, person = me(g);
  S.me.warden = null; S.me.wardenM = 0; S.me.awayM = 0; S.me.poison = 0; S.me.draws = 0; S.me.lastDraw = -99;
  const born = g.date.year - Math.floor(playerAge(g));
  const t = S.years[born] ?? S.years[born + 1] ?? null;
  const old = p.manaPotential ?? 0;
  let pot = old;
  if (t != null) pot = t > 0 ? pot * (1 + t / 300) : pot * (1 + t / 500);
  if (person && Number.isFinite(person.manaSpark)) pot = person.manaSpark > 0 ? Math.max(pot, person.manaSpark) : pot * 0.6;
  pot = clamp(pot, 0, 1);
  if (pot !== old) {
    p.manaPotential = pot;
    if (p.manaAwakened && old > 0) p.mana = (p.mana ?? 0) * (pot / old);
  }
});
export { clamp };
