// 연구의 사건: 발명에 이름을 거는 일, 경쟁자와 도용, 남의 노트를 사는 유혹, 늙은 장인의 손, 물건을 사겠다는 사람들.
import { EVENTS, setFlag, flag, age, check, stat, stress, tire } from '../events/core.js';
import { gainSkill, gainStat } from '../game.js';
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { H } from '../history/state.js';
import { RS, INV_NAME, DESIGNS, inventionOf, invented, labHere } from './state.js';
import { inventNow } from './actions.js';
import { INVENTIONS } from '../history/powers.js';

// 34단계: 나무가 커져서 순번 대신 눈금으로 (예전 열두 가지와 같은 크기)
const idx = (id) => Math.round((INVENTIONS.find((v) => v.id === id)?.at ?? 0) * 2.4);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const topCompany = (g) => [...(H(g)?.companies ?? [])].sort((a, b) => b.fortune - a.fortune)[0] ?? null;
// 경쟁자: history의 학자·마법사, 없으면 큰 상단
function rivalOf(g, rng) {
  const ns = (H(g)?.notables ?? []).filter((n) => n.kind === 'scholar' || n.kind === 'mage');
  if (ns.length) { const n = rng.pick(ns); return { name: `${n.kind === 'mage' ? '마법사' : '학자'} ${n.name} ${n.lastName}`, kind: 'person', key: `${n.name}|${n.lastName}` }; }
  const c = topCompany(g);
  return c ? { name: c.name, kind: 'company', key: c.name } : { name: '세레니아의 어느 공방', kind: 'lab', key: 'lab' };
}
const creditRival = (g, rv) => {
  const hist = H(g);
  if (rv.kind === 'person') { const n = hist?.notables?.find((x) => `${x.name}|${x.lastName}` === rv.key); if (n) n.fame = Math.min(100, n.fame + 12); }
  if (rv.kind === 'company') { const c = hist?.companies?.find((x) => x.name === rv.key); if (c) c.fortune = Math.min(100, c.fortune + 12); }
};
const magnusBond = (g, n) => { const m = g.legends?.list?.find((x) => x.id === 'magnus'); if (m && m.alive) { m.bond = Math.min(100, m.bond + n); m.met = true; } };

// ---------- 발명에 이름을 건다 ----------
EVENTS.push({
  id: 'research_claim', cooldown: 0, weight: 87,
  cond: (g) => !!g.research?.claim,
  prepare: (g) => { const id = RS(g).claim; const c = topCompany(g); return { id, company: c?.name ?? '하르펜의 큰 상단', price: 60 + idx(id) * 20 }; },
  title: '세상에 없던 것',
  text: (g, c) => `책상 위에서 ${INV_NAME[c.id] ?? '그것'}이(가) 돌아가고 있었다. 아직 세상 누구도 가지지 못한 것이다. 소문은 벌써 새어 나갔다. ${c.company}의 사람이 문 앞에서 기다리고 있었다. 이것에 누구의 이름을 붙일지는 지금 정해야 한다.`,
  choices: [
    {
      label: '내 이름으로 내놓는다',
      run: (g, rng, c) => {
        if (!inventNow(g, c.id, g.player.name)) return '그새 누군가 먼저 내놓았다. 한발 늦었다.';
        const r = RS(g);
        r.invented.push(c.id); r.royalty += 1 + Math.floor(idx(c.id) / 4); r.fame += 10;
        renown(g, 15 + idx(c.id));
        return `${INV_NAME[c.id]}의 설계도에 내 이름을 적었다. 한 달 만에 왕국 곳곳의 공방이 그것을 베꼈고, 그중 몇은 사용료를 보내왔다. 돈보다 이름이 먼저 퍼졌다. ${inventionOf(c.id)?.look ?? ''}`;
      },
    },
    {
      label: '상단에 판다',
      run: (g, rng, c) => {
        if (!inventNow(g, c.id, c.company)) return '그새 누군가 먼저 내놓았다. 상단 사람은 모자를 들어 보이고 돌아갔다.';
        const co = H(g)?.companies?.find((x) => x.name === c.company); if (co) co.fortune = Math.min(100, co.fortune + 12);
        g.player.money += c.price; RS(g).sold.push(c.id); RS(g).fame += 3;
        return `${c.company}이(가) 은화 ${c.price}닢을 세어 놓았다. 다음 달 소식지에는 ${INV_NAME[c.id]}이(가) ${c.company}의 발명이라고 실렸다. 내 이름은 어디에도 없었다. 그래도 주머니는 무거웠다.`;
      },
    },
    {
      label: '마탑에 바친다', show: (g) => labHere(g)?.kind === 'tower' || (g.player.skills.magic ?? 0) >= 20,
      run: (g, rng, c) => {
        if (!inventNow(g, c.id, '세레니아 마탑')) return '그새 누군가 먼저 내놓았다.';
        g.player.money += 30; gainSkill(g, 'magic', 2, 'int'); magnusBond(g, 10); RS(g).fame += 5; setFlag(g, 'mage_registered');
        return '설계도를 마탑의 문서고에 넘겼다. 협회는 내 이름을 공동 연구자 명단 셋째 줄에 적었다. 은화 서른 닢과 함께 마탑 서고의 아랫단 열쇠가 따라왔다.';
      },
    },
    { label: '세상이 아직 준비되지 않았다', run: (g, rng, c) => { stress(g, 5); RS(g).shelved = [...(RS(g).shelved ?? []), c.id]; return '설계도를 접어 상자에 넣었다. 마부들, 방앗간 주인들, 일거리를 잃을 사람들의 얼굴이 떠올랐다. 언젠가 누군가 같은 것을 만들 것이다. 그게 오늘 내가 아니어도 된다.'; } },
  ],
});
// 고른 일 장면에 밀려 사건 창에서 내려갈 수 있다: 이름 걸 일은 실제로 고를 때 지운다
{ const e = EVENTS[EVENTS.length - 1]; for (const c of e.choices) { const run = c.run; c.run = (g, rng, ctx) => { RS(g).claim = null; return run(g, rng, ctx); }; } }

// ---------- 경쟁과 도용 ----------
EVENTS.push({
  id: 'research_rival', cooldown: 12, weight: 58,
  cond: (g) => { const p = g.research?.project; return !!p && p.kind === 'invent' && p.prog >= 0.55 && !RS(g).rivalSeen.includes(p.id) && !L(g).travel; },
  chance: () => 0.35,
  prepare: (g, rng) => { const p = RS(g).project; RS(g).rivalSeen.push(p.id); return { id: p.id, rival: rivalOf(g, rng) }; },
  title: '같은 것을 쫓는 사람',
  text: (g, c) => `공방 조수가 머뭇거리며 말했다. ${J(c.rival.name, '이/가')} 같은 것을 만들고 있다고. 거의 다 왔다고. 그리고 지난주 누군가 내 노트를 들춰 본 흔적이 있었다. 책상 서랍의 자물쇠가 긁혀 있었다.`,
  choices: [
    { label: '밤을 새워 서두른다', run: (g, rng) => { const p = RS(g).project; if (p) p.prog = Math.min(0.98, p.prog + 0.2); tire(g, 30); stress(g, 12); return '한 달 동안 공방 바닥에서 잤다. 눈이 붉어지고 손이 떨렸다. 대신 남은 길이 눈에 띄게 줄었다.'; } },
    { label: '공방을 지킨다', run: (g) => { g.player.money = Math.max(0, g.player.money - 15); gainStat(g, 'wil', 0.3); return '자물쇠를 바꾸고 문지기를 두었다. 은화 열다섯 닢. 노트는 매일 밤 품에 넣고 잤다.'; } },
    {
      label: '내버려 둔다',
      run: (g, rng, c) => {
        if (!rng.chance(0.45)) return '아무 일도 일어나지 않았다. 조수의 걱정이 지나쳤던 걸까. 아니면 운이 좋았던 걸까.';
        const p = RS(g).project;
        RS(g).project = null; RS(g).stolen.push(c.id);
        inventNow(g, c.id, c.rival.name); creditRival(g, c.rival);
        setFlag(g, 'research_robbed');
        stress(g, 25);
        return `석 달 뒤 소식지에 ${INV_NAME[c.id]}이(가) 실렸다. ${c.rival.name}의 이름으로. 그림 속 굴대의 각도, 술식의 순서, 내가 지운 자리까지 내 노트와 같았다. ${p?.months ? `${p.months}달` : '여러 달'}의 밤이 남의 이름이 되었다.`;
      },
    },
  ],
});
// 도둑맞은 뒤: 따질 것인가
EVENTS.push({
  id: 'research_sue', once: true, weight: 60,
  cond: (g) => flag(g, 'research_robbed') && ['leocast', 'harfen', 'serenia'].includes(L(g).place) && !L(g).travel,
  title: '내 것이었다',
  text: () => '도둑맞은 발명의 증거는 내 노트뿐이었다. 날짜가 적힌 쪽, 실패한 시제품, 조수의 증언. 왕도 학회에 이의를 낼 수 있다. 상대는 이미 이름을 얻었고, 이름 있는 사람은 친구도 많다.',
  choices: [
    {
      label: '학회에 이의를 낸다',
      run: (g, rng) => {
        g.player.money = Math.max(0, g.player.money - 20);
        if (check(rng, stat(g, 'int') + stat(g, 'cha') / 2 + (L(g).renown ?? 0) / 10, 62)) { renown(g, 20); RS(g).royalty += 1; RS(g).fame += 8; return '석 달의 공방 끝에 학회가 내 노트의 날짜를 인정했다. 소식지 귀퉁이에 정정 한 줄이 실렸다. 작은 글씨였다. 그래도 내 이름이었다. 사용료 일부가 내게로 돌아왔다.'; }
        stress(g, 15);
        return '학회는 "같은 생각은 여러 곳에서 동시에 나기도 한다"고 결론 내렸다. 소송비 은화 스무 닢만 날렸다. 그날 밤 노트를 태울까 하다가 그만두었다.';
      },
    },
    { label: '잊고 다음 것을 만든다', run: (g) => { gainStat(g, 'wil', 0.8); stress(g, -5); return '분은 오래 갔다. 하지만 다음 노트의 첫 장을 펼쳤을 때 손은 떨리지 않았다. 남이 훔칠 수 없는 건 머릿속에 있다.'; } },
  ],
});
// 남의 노트를 사는 유혹
EVENTS.push({
  id: 'research_spy_offer', cooldown: 60, weight: 45,
  cond: (g) => { const p = g.research?.project; return !!p && p.kind === 'invent' && p.prog < 0.5 && age(g) >= 16 && !L(g).travel && g.player.money >= 25; },
  chance: () => 0.4,
  prepare: (g, rng) => ({ rival: rivalOf(g, rng), id: RS(g).project.id }),
  title: '팔려 온 노트',
  text: (g, c) => `선술집 구석에서 낯선 젊은이가 꾸러미를 내밀었다. "${c.rival.name} 밑에서 삼 년을 일했소. 품삯도 못 받고 쫓겨났지. 그 사람이 ${INV_NAME[c.id]}을(를) 어디까지 했는지 여기 다 있소. 은화 스물다섯 닢."`,
  choices: [
    {
      label: '산다',
      run: (g, rng) => {
        g.player.money = Math.max(0, g.player.money - 25); // 40단계: 사건이 뜬 뒤 돈이 줄면 음수가 됐다
        const p = RS(g).project; if (p) p.prog = Math.min(0.95, p.prog + 0.3);
        if (rng.chance(0.3)) { setFlag(g, 'research_thief'); renown(g, -10); g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}, 남의 연구 노트를 샀다는 소문이 돌다.`, rel: 100 }); return '노트는 진짜였다. 연구가 몇 달을 건너뛰었다. 그리고 한 달 뒤, 그 젊은이가 같은 꾸러미를 다른 사람에게도 팔았다는 소문과 함께 내 이름이 돌기 시작했다.'; }
        return '노트는 진짜였다. 막혔던 곳이 남의 글씨 한 줄로 풀렸다. 기뻐야 할 텐데 밤에 잠이 오지 않았다.';
      },
    },
    { label: '거절한다', run: (g) => { gainStat(g, 'wil', 0.4); return '"내 것은 내가 만든다." 젊은이는 어깨를 으쓱하고 다른 탁자로 갔다. 그 꾸러미를 산 사람이 있는지는 모른다.'; } },
    { label: '노트 주인에게 돌려보낸다', run: (g, rng, c) => { g.player.money = Math.max(0, g.player.money - 25); renown(g, 5); return `은화를 치르고 꾸러미를 받아 ${c.rival.name}에게 그대로 보냈다. 답장은 오지 않았다. 대신 한 달 뒤 학회 모임에서 그 사람이 내게 먼저 고개를 숙였다.`; } },
  ],
});
// 늙은 장인의 손: 연구가 자꾸 막힐 때
EVENTS.push({
  id: 'research_mentor', once: true, weight: 50,
  cond: (g) => { const p = g.research?.project; return !!p && (p.fails ?? 0) >= 2 && (p.months ?? 0) >= 3 && !!labHere(g); },
  title: '늙은 손',
  text: (g) => `${labHere(g)?.kind === 'tower' ? '마탑 복도 끝 방의 늙은 마법사' : labHere(g)?.kind === 'scholar' ? '서고에서 졸던 늙은 학자' : '공방 구석에서 쇠를 갈던 늙은 장인'}가 내 노트를 어깨너머로 보았다. "그 굴대, 거꾸로 깎았군. 나도 사십 년 전에 똑같이 했지."`,
  choices: [
    { label: '배움을 청한다', run: (g) => { const p = RS(g).project; if (p) p.prog = Math.min(0.95, p.prog + 0.15); gainSkill(g, 'smithing', 1, 'sen'); gainSkill(g, 'letters', 1, 'int'); return '노인은 반나절 동안 내 실패를 하나씩 짚어 주었다. 대가는 술 한 병이었다. "이름 날리면 나도 한 줄 넣어 주게." 농담인지 아닌지 알 수 없었다.'; } },
    { label: '혼자 해 보겠다', run: (g) => { gainStat(g, 'wil', 0.4); return '"젊은 사람은 그래야지." 노인은 웃고 다시 쇠를 갈았다.'; } },
  ],
});
// 만든 것을 사겠다는 사람들
EVENTS.push({
  id: 'research_buyer', cooldown: 48, weight: 40,
  cond: (g) => (g.research?.made?.length ?? 0) > 0 && age(g) >= 18 && !L(g).travel,
  prepare: (g, rng) => { const made = RS(g).made; return { id: rng.pick(made), war: rng.chance(0.35) }; },
  title: '물건을 사러 온 사람',
  text: (g, c) => (c.war
    ? `영주의 집사가 찾아왔다. ${DESIGNS[c.id]?.name ?? '내 물건'}을(를) 백 개 만들어 달라고 했다. 성채와 군영에 쓴다고. 무엇에 쓸지는 묻지 말라는 눈치였다.`
    : `상인 하나가 ${DESIGNS[c.id]?.name ?? '내 물건'}을(를) 보고 눈을 반짝였다. "이걸 우리 공방에서 만들게 해 주시오. 하나 팔릴 때마다 몫을 드리지."`),
  choices: [
    { label: '받아들인다', run: (g, rng, c) => { if (c.war) { g.player.money += 70; setFlag(g, 'research_war'); return '은화 일흔 닢. 석 달 뒤 내 물건이 성벽 위에 줄지어 놓인 것을 보았다. 쓰임새가 내가 생각한 것과 달랐다.'; } RS(g).royalty += 1; return '계약서에 이름을 적었다. 다음 달부터 몫이 들어오기 시작했다. 내가 만든 것이 내가 모르는 집들에 놓인다.'; } },
    { label: '거절한다', run: () => '정중히 돌려보냈다. 내 손으로 만든 것은 아직 내 손에 두고 싶었다.' },
  ],
});

void invented;
