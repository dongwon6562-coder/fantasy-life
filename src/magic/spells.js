// 주문: 서클마다 익힐 수 있는 주문이 있고, 쓰임이 다르다.
// - 생활(life): 불씨, 정화수, 등불 같은 것. 마을에서 품삯을 받는다.
// - 치유(heal): 다친 사람을 고친다. 내 상처도 빨리 아문다.
// - 일(job): 마석 충전, 마력 탐지. 시대가 바뀔수록(마도구 보급) 벌이가 커진다.
// - 결계(ward)·전투(combat): 싸움과 결투, 마을 지키기에 쓴다.
// 주문은 '주문 연구'로 하나씩 익힌다. 스승이 있으면 훨씬 빠르다.
// 서클 자체는 game.js의 circleOf(마력량 + 마법 기술)가 정한다. 고서클은 여전히 아주 드물다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat, circleOf } from '../game.js';
import { living } from '../npc.js';
import { remember } from '../relations.js';

export const SPELLS = [
  { id: 'ember', circle: 1, use: 'life', name: '불씨', desc: '손끝에 작은 불을 피운다. 젖은 장작에도 불이 붙는다.' },
  { id: 'purify', circle: 1, use: 'life', name: '정화수', desc: '흐린 물을 맑게 거른다. 우물이 썩은 마을에서 귀하게 쓰인다.' },
  { id: 'light', circle: 1, use: 'life', name: '등불', desc: '손바닥 위에 빛구슬을 띄운다. 밤길과 갱도를 밝힌다.' },
  { id: 'firebolt', circle: 1, use: 'combat', name: '불씨 화살', desc: '불을 화살처럼 날린다. 1서클 마법사의 유일한 무기.' },
  { id: 'mend', circle: 1, use: 'heal', name: '가벼운 치유', desc: '베인 상처를 아물게 한다. 깊은 상처는 어림없다.' },
  { id: 'sense', circle: 2, use: 'job', name: '마력 탐지', desc: '근처의 마력과 마석, 숨은 것의 기척을 느낀다.' },
  { id: 'icebolt', circle: 2, use: 'combat', name: '얼음 화살', desc: '공기 중의 물을 얼려 쏜다.' },
  { id: 'windblade', circle: 2, use: 'combat', name: '바람 칼날', desc: '보이지 않는 칼날로 벤다.' },
  { id: 'earthwall', circle: 2, use: 'ward', name: '흙벽', desc: '땅을 솟구쳐 벽을 세운다.' },
  { id: 'suture', circle: 2, use: 'heal', name: '상처 봉합', desc: '찢긴 살과 핏줄을 잇는다. 흉터가 덜 남는다.' },
  { id: 'infuse', circle: 2, use: 'job', name: '마력 주입', desc: '닳은 마석과 마도구에 마력을 채운다. 마도구가 퍼질수록 일거리가 는다.' },
  { id: 'firering', circle: 3, use: 'combat', name: '화염 고리', desc: '몸 둘레로 불의 고리를 펼친다. 무리를 상대할 때 쓴다.' },
  { id: 'ward', circle: 3, use: 'ward', name: '보호 결계', desc: '집 한 채를 감싸는 결계를 친다. 마물이 넘지 못한다.' },
  { id: 'calm', circle: 3, use: 'life', name: '마음 가라앉히기', desc: '흥분한 사람과 짐승을 가라앉힌다. 함부로 쓰면 의심을 산다.' },
  { id: 'cure', circle: 3, use: 'heal', name: '병 다스리기', desc: '열병과 돌림병의 기운을 몸에서 몰아낸다.' },
  { id: 'lightning', circle: 4, use: 'combat', name: '번개', desc: '하늘이 아니라 손끝에서 벼락이 떨어진다.' },
  { id: 'greatheal', circle: 4, use: 'heal', name: '대치유', desc: '부러진 뼈와 잘린 힘줄을 잇는다. 왕궁에서 부르는 마법이다.' },
  { id: 'fortress', circle: 4, use: 'ward', name: '성채 결계', desc: '성문 하나를 막아서는 결계. 전쟁터에서 마법사를 부르는 이유.' },
  { id: 'firestorm', circle: 5, use: 'combat', name: '화염 폭풍', desc: '한 부대를 불태운다. 나라마다 한두 명만 쓸 수 있다.' },
];
export const spellById = (id) => SPELLS.find((s) => s.id === id);
export const USE_NAME = { life: '생활', heal: '치유', job: '일', ward: '결계', combat: '전투' };

export function magicState(g) {
  g.magic ??= { known: [], certified: 0, exam: null, study: null, works: 0 };
  return g.magic;
}
export const knows = (g, id) => !!g.magic?.known.includes(id);
export const knownSpells = (g) => (g.magic?.known ?? []).map(spellById).filter(Boolean);
export const learnable = (g) => SPELLS.filter((s) => s.circle <= circleOf(g) && !knows(g, s.id));
const here = (g) => g.life?.place ?? 'ern';
const WAGE = { ern: 1, harfen: 1.15, verden: 1.1, leocast: 1.4 };

// 스승: 마을의 떠돌이 마법사, 검은 로브의 스승(사건 줄기), 왕도의 궁정 마법사
function teacherHere(g) {
  const m = living(g).find((p) => p.job === 'hedge_mage' && (p.place ?? 'ern') === here(g) && p.known && p.affection >= 10);
  if (m) return { name: m.name, bonus: 1.6, p: m };
  const cm = living(g).find((p) => p.job === 'court_mage' && (p.place ?? 'ern') === here(g) && p.known && p.affection >= 20);
  if (cm) return { name: cm.name, bonus: 2.2, p: cm };
  if (g.flags?.chain_darkmage === 'apprentice') return { name: '검은 로브의 기억', bonus: 1.3 };
  return null;
}

ACTIONS.push(
  {
    id: 'spell_study', name: '주문 연구', icon: 'magic',
    desc: '새 주문 하나를 익힌다. 서클이 높을수록 익힐 수 있는 주문이 많다. 스승이 있으면 훨씬 빠르다.',
    available: (g) => g.player.manaAwakened && playerAge(g) >= 8 && learnable(g).length > 0 && !g.life?.travel,
    run(g, rng) {
      const m = magicState(g);
      if (!m.study || knows(g, m.study.id) || !spellById(m.study.id) || spellById(m.study.id).circle > circleOf(g)) {
        const cands = learnable(g);
        if (!cands.length) { m.study = null; gainSkill(g, 'magic', 0.5, 'int'); return '지금 서클로 익힐 수 있는 주문은 다 익혔다. 아는 주문을 되짚으며 마력의 결을 다듬었다.'; }
        const low = Math.min(...cands.map((s) => s.circle));
        m.study = { id: rng.pick(cands.filter((s) => s.circle === low)).id, prog: 0 };
      }
      const sp = spellById(m.study.id);
      const t = teacherHere(g);
      g.player.fatigue = Math.min(100, g.player.fatigue + 10);
      const k = gainSkill(g, 'magic', 0.8 * (t ? 1.3 : 1), 'int');
      const step = (0.18 + g.player.stats.int / 250 + g.player.skills.magic / 300) * (t?.bonus ?? 1) / sp.circle ** 0.6;
      m.study.prog += step * rng.float(0.7, 1.3);
      if (t?.p) { t.p.affection += 1; }
      if (m.study.prog >= 1) {
        m.known.push(sp.id);
        m.study = null;
        if (t?.p) remember(g, t.p, `${sp.name} 주문을 가르쳐 주었다`, 1, { tag: 'spell' });
        return `${t ? `${t.name}의 도움으로 ` : ''}마침내 ${sp.name}을(를) 익혔다. ${sp.desc} (마법 +${k.toFixed(1)})`;
      }
      const pct = m.study.prog < 0.35 ? '아직 술식의 뼈대도 잡히지 않는다' : m.study.prog < 0.7 ? '술식이 머릿속에서 모양을 갖추기 시작했다' : '거의 다 왔다. 마력이 원을 따라 흐르다 끝에서 흩어진다';
      return `${sp.name}을(를) 연구했다. ${pct}.${t ? ` ${t.name}이(가) 틀린 곳을 짚어 주었다.` : ''} (마법 +${k.toFixed(1)})`;
    },
  },
  {
    id: 'spell_work', name: '마법으로 일하기', icon: 'magic',
    desc: '익힌 주문으로 품삯을 받는다. 치유, 우물 정화, 마석 충전 같은 일. 공인받은 서클이 높을수록 많이 받는다.',
    available: (g) => playerAge(g) >= 12 && knownSpells(g).some((s) => s.use !== 'combat') && !g.life?.travel,
    run(g, rng) {
      const m = magicState(g);
      const era = g.realm?.era ?? 0;
      const opts = [];
      const has = (id) => knows(g, id);
      if (has('greatheal')) opts.push({ w: 3, pay: 30, text: '귀족 집안의 부름을 받았다. 낙마해 다리가 부러진 아들의 뼈를 이었다.' });
      else if (has('cure')) opts.push({ w: 3, pay: 10, text: '열병에 걸린 집을 돌며 병의 기운을 몰아냈다. 고맙다는 말이 등 뒤로 따라왔다.' });
      else if (has('suture')) opts.push({ w: 3, pay: 6, text: '도끼에 발등을 찍은 나무꾼의 상처를 꿰매 붙였다. 피가 멎자 사내가 울었다.' });
      else if (has('mend')) opts.push({ w: 3, pay: 3, text: '아이들의 무릎과 일꾼들의 손바닥 상처를 아물게 했다. 동화가 쌓였다.' });
      if (has('infuse') && era >= 1) opts.push({ w: 3 + era, pay: 4 + era * 4, text: era >= 2 ? '공방에서 닳은 마석 수십 개에 마력을 채웠다. 마석로가 다시 웅웅거렸다.' : '등석과 화석에 마력을 채워 주었다. 시골에선 아직 귀한 일이다.' });
      if (has('sense')) opts.push({ w: 2, pay: rng.int(2, 9), text: rng.pick(['잃어버린 반지를 찾아 달라는 부탁을 받았다. 우물 바닥에서 마력의 잔향을 찾아냈다.', '광부들과 함께 갱도에 들어가 마석 맥을 짚어 주었다.', '도둑맞은 은화 상자를 쫓았다. 헛간 짚더미 아래에서 찾았다.']) });
      if (has('purify')) opts.push({ w: 2, pay: 2, text: '흐려진 우물을 맑게 걸렀다. 아낙들이 빵을 쥐여 주었다.' });
      if (has('light')) opts.push({ w: 1, pay: 2, text: '밤새 상단의 짐 부리는 곳을 밝혀 주었다.' });
      if (has('ember')) opts.push({ w: 1, pay: 1, text: '장마철, 집집마다 젖은 아궁이에 불을 붙여 주었다.' });
      if (has('ward')) opts.push({ w: 2, pay: 8, text: '마물이 출몰하는 외딴 농가에 보호 결계를 쳐 주었다.' });
      if (has('calm')) opts.push({ w: 1, pay: 4, text: '날뛰는 군마를 가라앉혀 달라는 부탁을 받았다. 말이 내 손바닥에 코를 비볐다.' });
      const o = rng.weighted(opts, (x) => x.w) ?? opts[0];
      const mult = (WAGE[here(g)] ?? 1) * (1 + 0.25 * m.certified);
      let pay = Math.max(1, Math.round(o.pay * mult));
      g.player.fatigue = Math.min(100, g.player.fatigue + 12);
      const k = gainSkill(g, 'magic', 0.6, 'int');
      m.works += 1;
      let tail = '';
      // 3서클 이상인데 협회에 등록하지 않았다면, 도시에서는 단속에 걸릴 수 있다
      if (circleOf(g) >= 3 && !g.flags?.mage_registered && m.certified === 0 && here(g) !== 'ern' && rng.chance(0.12)) {
        const fine = Math.min(g.player.money + pay, 15);
        pay -= fine;
        tail = ` 협회 감찰관이 등록하지 않은 마법사라며 벌금 은화 ${fine}닢을 물렸다.`;
      }
      g.player.money = Math.max(0, g.player.money + pay);
      return `${o.text} 은화 ${Math.max(0, pay)}닢.${m.certified ? ` 공인 ${m.certified}서클의 인장이 값을 올려 주었다.` : ''}${tail} (마법 +${k.toFixed(1)})`;
    },
  },
);

// 치유 주문을 알면 내 상처도 빨리 아문다 (흉터도 덜 남는다)
HOOKS.afterMonth.push((g, rng) => {
  const best = knows(g, 'greatheal') ? 0.9 : knows(g, 'cure') ? 0.7 : knows(g, 'suture') ? 0.6 : knows(g, 'mend') ? 0.35 : 0;
  if (!best || !g.player.injuries.length) return;
  for (const inj of g.player.injuries) if (rng.chance(best)) inj.months -= 1;
  g.player.injuries = g.player.injuries.filter((i) => i.months > 0);
});

HOOKS.newGame.push((g) => { magicState(g); });
HOOKS.migrate.push((g) => { magicState(g); });
HOOKS.heir?.push((g) => { g.magic = { known: [], certified: 0, exam: null, study: null, works: 0 }; });
