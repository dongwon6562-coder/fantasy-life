// 연구하기: 연구실이 있는 곳에서 한 달씩 품을 들인다. 처음엔 무엇을 연구할지 고른다.
// 다 되면 발명은 세상에 나오고(시대가 앞당겨진다), 새 물건은 내 손에 남는다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued } from '../adventure/core.js';
import { place } from '../history/powers.js';
import { J } from '../narrative/text.js';
import { RS, LABS, labHere, labOpen, inventable, designable, DESIGNS, INV_NAME, inventionOf, nameOf, handOf, stepOf, workOf, canResearch, invented } from './state.js';

const HAND_WORD = { smith: '손', letters: '글', magic: '마력' };
const HAND_SKILL = { smith: ['smithing', 'sen'], letters: ['letters', 'int'], magic: ['magic', 'int'] };
const mi = (g) => g.date.year * 12 + g.date.month;
const costOf = (p) => (p.kind === 'design' ? Math.ceil((DESIGNS[p.id]?.cost ?? 10) / (DESIGNS[p.id]?.work ?? 4)) : 2 + Math.round(workOf(p) / 4));

// 발명을 세상에 내놓는다: history의 발명 목록에 넣고, 시대를 그만큼 당긴다
export function inventNow(g, id, who) {
  const v = inventionOf(id);
  if (!v || invented(g, id) || !g.history) return false;
  g.history.inventions.push(id);
  if (g.realm) g.realm.tech = Math.max(g.realm.tech ?? 0, v.at);
  place(g, v.where, v.look);
  const text = `${J(who, '이/가')} ${v.text}`;
  g.realm?.log?.push({ y: g.date.year, m: g.date.month, text: `발명: ${v.text.split('.')[0]} (${who})` });
  (g.worldNews ??= []).push(`${text}.`);
  g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${text}.`, rel: 80 });
  return true;
}

ACTIONS.push({
  id: 'research', name: '연구하기', icon: 'scroll',
  desc: '공방·학자의 방·마탑에서 새것을 연구한다. 세상에 아직 없는 발명을 앞당기거나, 아무도 만들지 않은 물건을 만든다. 재료값이 든다.',
  available: (g) => playerAge(g) >= 14 && !L(g).travel && !!labHere(g) && canResearch(g),
  run(g, rng) {
    const r = RS(g);
    const lab = labHere(g);
    // 같은 달 다른 칸에서 길을 떠났거나 붙잡혔으면 연구실이 없다
    if (!lab || L(g).travel) return '연구실을 떠나 있어 노트만 들여다보았다.';
    if (!labOpen(g)) return `${lab.name} 앞에서 문지기가 막았다. "협회의 공인이 없으면 들일 수 없소."`;
    if (!r.project) {
      if (sceneQueued(g, 'research_pick') || (r.pickAt ?? -99) > mi(g)) return '노트를 넘기며 무엇을 연구할지 더 생각했다.';
      if (!inventable(g).length && !designable(g).length) return '책상 앞에 앉았지만 붙잡을 거리가 떠오르지 않았다. 세상이 조금 더 바뀌어야 보이는 것들이 있다.';
      queueScene(g, 'research_pick');
      return `${lab.name}에 자리를 얻었다. 무엇을 연구할지 정해야 한다.`;
    }
    const p = r.project;
    if (p.kind === 'invent' && invented(g, p.id)) { r.project = null; return `${J(INV_NAME[p.id], '은/는')} 이미 누군가 세상에 내놓았다. 쌓아 둔 노트를 한참 바라보다 덮었다.`; }
    const cost = costOf(p);
    if (g.player.money < cost) return `재료값 은화 ${cost}닢이 없어 손을 놓았다. 연구는 돈을 먹는다.`;
    g.player.money -= cost;
    g.player.fatigue = Math.min(100, g.player.fatigue + 12);
    p.months = (p.months ?? 0) + 1;
    const [sk, st] = HAND_SKILL[handOf(p)];
    gainSkill(g, sk, 0.5, st);
    gainStat(g, 'int', 0.2);
    // 실패: 사고와 막다른 길
    const roll = rng.next();
    if (roll < 0.045) {
      p.prog = Math.max(0, p.prog - 0.06); p.fails = (p.fails ?? 0) + 1;
      g.player.injuries.push({ name: handOf(p) === 'magic' ? '술식이 터져 그을린 손' : '공방에서 데인 상처', months: 1 });
      return handOf(p) === 'magic' ? '술식 하나를 거꾸로 새겼다. 마석이 손안에서 터졌다. 눈썹이 그을리고 손바닥이 데었다. 노트 몇 장도 함께 탔다.' : '달군 쇠가 미끄러졌다. 팔뚝이 데었다. 공방 주인이 찬물을 끼얹으며 욕을 했다.';
    }
    if (roll < 0.13) { p.prog = Math.max(0, p.prog - 0.05); p.fails = (p.fails ?? 0) + 1; return `${nameOf(p)} 연구가 막다른 길에 닿았다. 한 달 동안 한 일이 틀린 전제 위에 서 있었다. 노트에 크게 줄을 그었다.`; }
    p.prog = Math.min(1, p.prog + stepOf(g, p, rng));
    if (p.prog >= 1) return finish(g, rng);
    const pct = p.prog < 0.3 ? '아직 무엇이 문제인지도 다 보이지 않는다' : p.prog < 0.6 ? '시제품 하나가 돌아가다 멈췄다. 왜 멈췄는지는 알 것 같다' : p.prog < 0.85 ? '시제품이 사흘을 버텼다. 거의 다 왔다' : '마지막 하나만 맞추면 된다. 잠이 오지 않는다';
    return `${J(nameOf(p), '을/를')} 연구했다. ${pct}. (재료값 은화 ${cost}닢)`;
  },
});

function finish(g, rng) {
  const r = RS(g);
  const p = r.project;
  r.project = null;
  if (p.kind === 'design') {
    r.made.push(p.id);
    r.fame += 3;
    L(g).renown = (L(g).renown ?? 0) + 3;
    g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}, ${J(DESIGNS[p.id].name, '을/를')} 만들다.`, rel: 100 });
    return `마침내 ${DESIGNS[p.id].name}이(가) 제대로 돌아갔다. ${DESIGNS[p.id].desc} 세상에 하나뿐인 물건이다. 아직은.`;
  }
  // 발명은 이름을 어떻게 걸지 고르는 사건으로 넘어간다
  r.claim = p.id;
  return `${INV_NAME[p.id]}이(가) 돌아갔다. 손이 떨렸다. 이것을 세상에 어떻게 내놓을지 정해야 한다.`;
}

defineScene('research_pick', {
  title: () => '무엇을 연구할까',
  text: (g) => {
    const lab = labHere(g);
    const inv = inventable(g), des = designable(g);
    const parts = [];
    if (inv.length) parts.push(`세상이 기다리는 것: ${inv.map((id) => INV_NAME[id]).join(', ')}. 누군가 곧 만들어 낼 것이다. 내가 먼저일 수도 있다.`);
    if (des.length) parts.push(`아무도 생각하지 못한 것: ${des.map((id) => DESIGNS[id].name).join(', ')}.`);
    return `${lab?.name ?? '연구실'}. 노트를 펼쳤다. ${parts.join(' ')}`;
  },
  choices: (g) => [
    ...inventable(g).map((id) => ({ label: `발명: ${INV_NAME[id]} (${HAND_WORD[handOf({ kind: 'invent', id })]})`, key: `invent:${id}` })),
    ...designable(g).slice(0, 4).map((id) => ({ label: `새 물건: ${DESIGNS[id].name} (${HAND_WORD[DESIGNS[id].hand]})`, key: `design:${id}` })),
    { label: '아직 정하지 않는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (!key || key === 'none') { RS(g).pickAt = mi(g) + 3; return '노트를 덮었다. 조급하게 고른 연구는 대개 끝을 보지 못한다.'; }
    const [kind, id] = key.split(':');
    if (kind === 'invent' && invented(g, id)) return `${J(INV_NAME[id], '은/는')} 그새 누군가 내놓았다.`;
    RS(g).project = { kind, id, prog: 0, months: 0, fails: 0, place: L(g).place };
    return kind === 'invent'
      ? `${INV_NAME[id]}. 소문으로만 듣던 것을 내 손으로 만들어 보기로 했다. 다른 공방들도 같은 것을 쫓고 있을 것이다.`
      : `${DESIGNS[id].name}. ${DESIGNS[id].desc} 머릿속의 그림을 종이에 옮기기 시작했다.`;
  },
});

// ---------- 만든 것들이 삶을 바꾼다, 사용료가 들어온다 ----------
HOOKS.afterMonth.push((g) => {
  const r = g.research;
  if (!r) return;
  const p = g.player;
  const has = (id) => r.made.includes(id);
  if (has('pocketlamp')) p.stress = Math.max(0, p.stress - 1);
  if (has('kiln')) p.money += 2;
  if (has('loom')) p.familyMoney += 3;
  if (has('coldbox')) { p.familyMoney += 2; p.fatigue = Math.max(0, p.fatigue - 1); }
  if (has('typekit')) p.skills.letters = Math.min(100, (p.skills.letters ?? 0) + 0.15);
  if (has('signalring')) p.skills.trade = Math.min(100, (p.skills.trade ?? 0) + 0.15);
  if (has('prosthesis') && p.injuries.length && g.date.month % 2 === 0) { p.injuries[0].months -= 1; p.injuries = p.injuries.filter((i) => i.months > 0); }
  if (has('wheel') && g.date.month === 1 && g.era?.goods) g.era.goods.cart = Math.min(3, (g.era.goods.cart ?? 0) + 3);
  if (r.royalty > 0) p.money += r.royalty;
});

void LABS;
