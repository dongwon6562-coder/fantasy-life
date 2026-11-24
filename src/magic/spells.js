// 주문: 서클마다 익힐 수 있는 주문이 있고, 쓰임이 다르다.
// - 생활(life): 불씨, 정화수, 등불 같은 것. 마을에서 품삯을 받는다.
// - 치유(heal): 다친 사람을 고친다. 내 상처도 빨리 아문다.
// - 일(job): 마석 충전, 마력 탐지. 시대가 바뀔수록(마도구 보급) 벌이가 커진다.
// - 결계(ward)·전투(combat): 싸움과 결투, 마을 지키기에 쓴다.
// 주문은 '주문 연구'로 하나씩 익힌다. 스승이 있으면 훨씬 빠르다.
// 서클 자체는 game.js의 circleOf(마력량 + 마법 기술)가 정한다. 고서클은 여전히 아주 드물다.
import { ACTIONS } from '../actions.js';
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat, circleOf } from '../game.js';
import { living } from '../npc.js';
import { remember } from '../relations.js';

export const SPELLS = [
  { id: 'ember', school: 'fire', circle: 1, use: 'life', name: '불씨', desc: '손끝에 작은 불을 피운다. 젖은 장작에도 불이 붙는다.' },
  { id: 'purify', school: 'water', circle: 1, use: 'life', name: '정화수', desc: '흐린 물을 맑게 거른다. 우물이 썩은 마을에서 귀하게 쓰인다.' },
  { id: 'light', school: 'light', circle: 1, use: 'life', name: '등불', desc: '손바닥 위에 빛구슬을 띄운다. 밤길과 갱도를 밝힌다.' },
  { id: 'firebolt', school: 'fire', circle: 1, use: 'combat', name: '불씨 화살', desc: '불을 화살처럼 날린다. 1서클 마법사의 유일한 무기.' },
  { id: 'mend', school: 'life', circle: 1, use: 'heal', name: '가벼운 치유', desc: '베인 상처를 아물게 한다. 깊은 상처는 어림없다.' },
  { id: 'sense', school: 'common', circle: 2, use: 'job', name: '마력 탐지', desc: '근처의 마력과 마석, 숨은 것의 기척을 느낀다.' },
  { id: 'icebolt', school: 'water', circle: 2, use: 'combat', name: '얼음 화살', desc: '공기 중의 물을 얼려 쏜다.' },
  { id: 'windblade', school: 'wind', circle: 2, use: 'combat', name: '바람 칼날', desc: '보이지 않는 칼날로 벤다.' },
  { id: 'earthwall', school: 'earth', circle: 2, use: 'ward', name: '흙벽', desc: '땅을 솟구쳐 벽을 세운다.' },
  { id: 'suture', school: 'life', circle: 2, use: 'heal', name: '상처 봉합', desc: '찢긴 살과 핏줄을 잇는다. 흉터가 덜 남는다.' },
  { id: 'infuse', school: 'common', circle: 2, use: 'job', name: '마력 주입', desc: '닳은 마석과 마도구에 마력을 채운다. 마도구가 퍼질수록 일거리가 는다.' },
  { id: 'firering', school: 'fire', circle: 3, use: 'combat', name: '화염 고리', desc: '몸 둘레로 불의 고리를 펼친다. 무리를 상대할 때 쓴다.' },
  { id: 'ward', school: 'common', circle: 3, use: 'ward', name: '보호 결계', desc: '집 한 채를 감싸는 결계를 친다. 마물이 넘지 못한다.' },
  { id: 'calm', school: 'mind', circle: 3, use: 'life', name: '마음 가라앉히기', desc: '흥분한 사람과 짐승을 가라앉힌다. 함부로 쓰면 의심을 산다.' },
  { id: 'cure', school: 'life', circle: 3, use: 'heal', name: '병 다스리기', desc: '열병과 돌림병의 기운을 몸에서 몰아낸다.' },
  { id: 'lightning', school: 'wind', circle: 4, use: 'combat', name: '번개', desc: '하늘이 아니라 손끝에서 벼락이 떨어진다.' },
  { id: 'greatheal', school: 'life', circle: 4, use: 'heal', name: '대치유', desc: '부러진 뼈와 잘린 힘줄을 잇는다. 왕궁에서 부르는 마법이다.' },
  { id: 'fortress', school: 'earth', circle: 4, use: 'ward', name: '성채 결계', desc: '성문 하나를 막아서는 결계. 전쟁터에서 마법사를 부르는 이유.' },
  { id: 'firestorm', school: 'fire', circle: 5, use: 'combat', name: '화염 폭풍', desc: '한 부대를 불태운다. 나라마다 한두 명만 쓸 수 있다.' },
  // 42단계: 계열 여덟(불·물·바람·흙·빛·그림자·생명·정신)과 기초술(common). 새 주문은 제 계열(과 기초술)만 익힌다. 7서클 주문은 없다(노아 몫).
  { id: 'kiln', school: 'fire', circle: 2, use: 'job', name: '가마 불', desc: '대장간 화덕과 도자기 가마의 불을 한결같이 붙든다. 장인들이 줄을 선다.' },
  { id: 'searing', school: 'fire', circle: 2, use: 'heal', name: '지져 막기', desc: '피가 멎지 않는 상처를 불로 지져 막는다. 아프지만 산다.' },
  { id: 'flameblade', school: 'fire', circle: 4, use: 'combat', name: '불꽃 검', desc: '칼날에 불을 입힌다. 검과 마법을 같이 쓰는 이들이 탐낸다.' },
  { id: 'sunfire', school: 'fire', circle: 6, use: 'combat', name: '태양 불길', desc: '한낮의 해를 땅에 끌어내린다. 쓴 사람이 기록에 몇 없다.' },
  { id: 'mist', school: 'water', circle: 1, use: 'ward', name: '안개 장막', desc: '둘레에 짙은 안개를 깐다. 쫓기는 사람이 숨는다.' },
  { id: 'frost', school: 'water', circle: 2, use: 'life', name: '서리 막기', desc: '밭에 내리는 서리를 거둔다. 늦봄 냉해 든 마을이 부른다.' },
  { id: 'rain', school: 'water', circle: 3, use: 'life', name: '비 부르기', desc: '마른 하늘에서 반나절 비를 끌어낸다. 가뭄 든 고장에선 금보다 귀하다.' },
  { id: 'seacalm', school: 'water', circle: 3, use: 'job', name: '바다 달래기', desc: '배 둘레의 물결을 가라앉힌다. 선주들이 비싸게 산다.' },
  { id: 'iceprison', school: 'water', circle: 4, use: 'combat', name: '얼음 감옥', desc: '상대를 얼음 기둥에 가둔다.' },
  { id: 'deluge', school: 'water', circle: 5, use: 'combat', name: '큰물', desc: '강을 일으켜 들판을 쓸어 버린다.' },
  { id: 'breeze', school: 'wind', circle: 1, use: 'life', name: '바람 부르기', desc: '키질할 바람, 돛에 실을 바람을 부른다.' },
  { id: 'gust', school: 'wind', circle: 1, use: 'combat', name: '돌풍', desc: '세찬 바람으로 상대를 밀어 넘어뜨린다.' },
  { id: 'featherfall', school: 'wind', circle: 2, use: 'ward', name: '깃털 낙하', desc: '떨어지는 몸을 바람이 받쳐 준다. 성벽 일꾼과 도둑이 배우고 싶어 한다.' },
  { id: 'swift', school: 'wind', circle: 3, use: 'job', name: '바람 발', desc: '등 뒤로 바람을 받아 하루 길을 반나절에 간다. 전령 일에 쓴다.' },
  { id: 'storm', school: 'wind', circle: 5, use: 'combat', name: '폭풍 소환', desc: '먹구름과 우박을 한 골짜기에 몰아온다.' },
  { id: 'till', school: 'earth', circle: 1, use: 'life', name: '흙 갈기', desc: '굳은 밭흙을 부드럽게 뒤집는다. 소 한 마리 몫은 한다.' },
  { id: 'stonebullet', school: 'earth', circle: 1, use: 'combat', name: '돌팔매', desc: '돌멩이를 뭉쳐 세게 날린다.' },
  { id: 'seekore', school: 'earth', circle: 2, use: 'job', name: '광맥 듣기', desc: '땅에 손을 대고 광맥과 빈 굴을 듣는다. 광산이 부른다.' },
  { id: 'stoneskin', school: 'earth', circle: 3, use: 'ward', name: '돌 피부', desc: '살갗을 돌처럼 굳힌다. 칼이 미끄러진다.' },
  { id: 'quake', school: 'earth', circle: 4, use: 'combat', name: '땅울림', desc: '발밑 땅을 갈라 흔든다. 성벽이 금 간다.' },
  { id: 'flash', school: 'light', circle: 1, use: 'combat', name: '섬광', desc: '눈앞에서 빛을 터뜨려 눈을 멀게 한다.' },
  { id: 'blessward', school: 'light', circle: 2, use: 'ward', name: '빛의 원', desc: '빛으로 원을 그어 망령과 작은 마물을 막는다.' },
  { id: 'purge', school: 'light', circle: 3, use: 'heal', name: '부정 씻기', desc: '몸에 붙은 독기와 저주의 기운을 빛으로 씻는다.' },
  { id: 'lance', school: 'light', circle: 4, use: 'combat', name: '빛의 창', desc: '빛을 창처럼 모아 꿰뚫는다. 마족이 가장 싫어하는 마법.' },
  { id: 'sanctum', school: 'light', circle: 6, use: 'ward', name: '성역', desc: '한 성읍을 덮는 빛의 결계. 교단은 이것을 기적이라 부른다.' },
  { id: 'veil', school: 'shadow', circle: 1, use: 'ward', name: '그림자 숨기', desc: '그늘에 몸을 묻어 눈에 덜 띄게 한다.' },
  { id: 'darkbolt', school: 'shadow', circle: 2, use: 'combat', name: '어둠 화살', desc: '빛을 먹는 검은 화살. 맞은 자리가 차갑게 저린다.' },
  { id: 'whisper', school: 'shadow', circle: 2, use: 'job', name: '그림자 귓속말', desc: '벽 너머 그늘에서 오가는 말을 엿듣는다. 쓰는 사람이 늘 의심받는다.' },
  { id: 'fear', school: 'shadow', circle: 3, use: 'combat', name: '공포', desc: '마음속 가장 어두운 것을 끌어올려 상대를 얼어붙게 한다.' },
  { id: 'shadowstep', school: 'shadow', circle: 4, use: 'ward', name: '그림자 건너기', desc: '그늘에서 그늘로 건너뛴다. 몇 걸음뿐이지만 칼을 피하기엔 넉넉하다.' },
  { id: 'grow', school: 'life', circle: 1, use: 'life', name: '싹 틔우기', desc: '시든 모종을 살리고 씨앗을 빨리 틔운다.' },
  { id: 'antidote', school: 'life', circle: 2, use: 'heal', name: '해독', desc: '몸에 든 독과 상한 음식의 기운을 뽑아낸다.' },
  { id: 'beastcalm', school: 'life', circle: 2, use: 'job', name: '짐승 달래기', desc: '앓는 소와 날뛰는 말을 달랜다. 목장과 마구간이 부른다.' },
  { id: 'regrow', school: 'life', circle: 5, use: 'heal', name: '살 되살리기', desc: '잃은 손가락 마디를 다시 돋게 한다. 나라에 몇 없는 치유술.' },
  { id: 'focus', school: 'mind', circle: 1, use: 'job', name: '맑은 머리', desc: '머리를 맑혀 셈과 베끼기를 틀리지 않는다. 서기와 학자가 찾는다.' },
  { id: 'readmind', school: 'mind', circle: 2, use: 'job', name: '마음 읽기', desc: '말 밑에 깔린 속을 어렴풋이 읽는다. 흥정과 재판에서 거짓을 가린다.' },
  { id: 'sleep', school: 'mind', circle: 2, use: 'combat', name: '잠재우기', desc: '눈꺼풀을 무겁게 해 상대를 재운다.' },
  { id: 'illusion', school: 'mind', circle: 3, use: 'ward', name: '환영', desc: '없는 것을 보이게 한다. 내가 셋으로 보이거나, 벽이 길로 보인다.' },
  { id: 'dominate', school: 'mind', circle: 5, use: 'combat', name: '정신 지배', desc: '남의 뜻을 꺾고 내 뜻을 심는다. 금기에 가깝고, 들키면 어느 나라든 쫓는다.' },
  { id: 'shield', school: 'common', circle: 1, use: 'ward', name: '마력 방패', desc: '손바닥 앞에 마력 막을 세운다. 모든 마법사가 맨 먼저 배우는 방어.' },
  { id: 'manabolt', school: 'common', circle: 1, use: 'combat', name: '마력 화살', desc: '날것의 마력을 뭉쳐 쏜다. 계열을 가리지 않는다.' },
  { id: 'dispel', school: 'common', circle: 3, use: 'ward', name: '해주', desc: '남이 걸어 둔 주문을 푼다. 결계 고치는 일에도 쓴다.' },
];
export const spellById = (id) => SPELLS.find((s) => s.id === id);
export const USE_NAME = { life: '생활', heal: '치유', job: '일', ward: '결계', combat: '전투' };
// 계열: 이름, 맞서는 계열(서로 배우기 더디다)
export const SCHOOLS = {
  fire: { name: '불', foe: 'water' }, water: { name: '물', foe: 'fire' }, wind: { name: '바람', foe: 'earth' }, earth: { name: '흙', foe: 'wind' },
  light: { name: '빛', foe: 'shadow' }, shadow: { name: '그림자', foe: 'light' }, life: { name: '생명', foe: null }, mind: { name: '정신', foe: null },
};
export const SCHOOL_IDS = Object.keys(SCHOOLS);
export const schoolName = (id) => (id === 'common' ? '기초술' : SCHOOLS[id]?.name ?? '');
// 21단계 전부터 있던 주문: 계열을 고르지 않아도 익힌다 (옛 판의 셈이 그대로 가게)
const LEGACY = new Set(['ember', 'purify', 'light', 'firebolt', 'mend', 'sense', 'icebolt', 'windblade', 'earthwall', 'suture', 'infuse', 'firering', 'ward', 'calm', 'cure', 'lightning', 'greatheal', 'fortress', 'firestorm']);
export const isLegacy = (id) => LEGACY.has(id);

const MAGIC_FRESH = () => ({ known: [], certified: 0, exam: null, study: null, works: 0, school: null, chant: 0, strain: 0, scars: 0, made: [], making: null, peak: null, title: null, seq: 1, overloads: 0, fit: false });
export function magicState(g) {
  g.magic ??= MAGIC_FRESH();
  const m = g.magic, f = MAGIC_FRESH();
  for (const k of Object.keys(f)) if (m[k] === undefined) m[k] = f[k];
  return m;
}
export const knows = (g, id) => !!g.magic?.known.includes(id) || !!g.magic?.made?.some?.((x) => x.id === id && x.learned);
// 내가 지은 주문(과 집안에 전해진 주문)도 주문표처럼 읽는다
export const madeSpells = (g) => (g.magic?.made ?? []).filter((x) => x.learned);
export const spellOf = (g, id) => spellById(id) ?? (g.magic?.made ?? []).find((x) => x.id === id) ?? null;
export const knownSpells = (g) => [...(g.magic?.known ?? []).map(spellById).filter(Boolean), ...madeSpells(g)];
// 익힐 수 있는 주문: 옛 주문 열아홉은 누구나, 새 주문은 제 계열과 기초술만. 집안에 전해진 주문도.
export const learnable = (g) => {
  const c = circleOf(g), school = g.magic?.school ?? null;
  const base = SPELLS.filter((s) => s.circle <= c && !knows(g, s.id) && (LEGACY.has(s.id) || s.school === 'common' || (school && s.school === school)));
  const fam = (g.magic?.made ?? []).filter((x) => !x.learned && x.circle <= c && (!x.school || !school || x.school === school || SCHOOLS[school]?.foe !== x.school));
  return [...base, ...fam];
};
// 계열이 맞으면 빨리, 맞서는 계열이면 더디게
export const studyMult = (g, sp) => {
  const school = g.magic?.school;
  if (!school || !sp.school || sp.school === 'common') return 1;
  if (sp.school === school) return g.magic.fit ? 1.6 : 1.4; // 몸에 맞는 계열을 고르면 더 빨리
  if (SCHOOLS[school]?.foe === sp.school) return 0.6;
  return 0.9;
};
// 마력을 지나치게 쓰면 쌓이는 무리 (deep.js가 달마다 덜고, 넘치면 폭주)
export const strainUp = (g, n) => { const m = magicState(g); m.strain = Math.max(0, Math.min(100, m.strain + n)); };
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
      const cur = m.study && learnable(g).find((x) => x.id === m.study.id);
      if (!cur) {
        const cands = learnable(g);
        if (!cands.length) { m.study = null; gainSkill(g, 'magic', 0.5, 'int'); return '지금 서클로 익힐 수 있는 주문은 다 익혔다. 아는 주문을 되짚으며 마력의 결을 다듬었다.'; }
        // 제 계열 주문과 집안 주문을 먼저 본다
        const mine = cands.filter((s) => !spellById(s.id) || (m.school && s.school === m.school));
        const pool = mine.length ? mine : cands;
        const low = Math.min(...pool.map((s) => s.circle));
        m.study = { id: rng.pick(pool.filter((s) => s.circle === low)).id, prog: 0 };
      }
      const sp = spellOf(g, m.study.id);
      strainUp(g, 4);
      const t = teacherHere(g);
      g.player.fatigue = Math.min(100, g.player.fatigue + 10);
      const k = gainSkill(g, 'magic', 0.8 * (t ? 1.3 : 1), 'int');
      const step = (0.18 + g.player.stats.int / 250 + g.player.skills.magic / 300) * (t?.bonus ?? 1) * studyMult(g, sp) / sp.circle ** 0.6;
      m.study.prog += step * rng.float(0.7, 1.3);
      if (t?.p) { t.p.affection += 1; }
      if (m.study.prog >= 1) {
        m.study = null;
        if (!spellById(sp.id)) { sp.learned = true; return `집안 마도서 여백에 ${sp.by}의 글씨로 적힌 ${J(sp.name, '을/를')} 마침내 익혔다. ${sp.desc} (마법 +${k.toFixed(1)})`; }
        m.known.push(sp.id);
        if (t?.p) remember(g, t.p, `${sp.name} 주문을 가르쳐 주었다`, 1, { tag: 'spell' });
        return `${t ? `${t.name}의 도움으로 ` : ''}마침내 ${J(sp.name, '을/를')} 익혔다. ${sp.desc} (마법 +${k.toFixed(1)})`;
      }
      const pct = m.study.prog < 0.35 ? '아직 술식의 뼈대도 잡히지 않는다' : m.study.prog < 0.7 ? '술식이 머릿속에서 모양을 갖추기 시작했다' : '거의 다 왔다. 마력이 원을 따라 흐르다 끝에서 흩어진다';
      return `${J(sp.name, '을/를')} 연구했다. ${pct}.${t ? ` ${J(t.name, '이/가')} 틀린 곳을 짚어 주었다.` : ''} (마법 +${k.toFixed(1)})`;
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
      // 42단계 새 주문의 일거리
      if (has('rain')) opts.push({ w: 2, pay: 12, text: '가뭄 든 마을 촌장이 찾아왔다. 언덕에 올라 반나절 술식을 붙들자 구름이 모였다. 사람들이 빗속에서 춤을 췄다.' });
      if (has('frost')) opts.push({ w: 2, pay: 5, text: '늦봄 서리가 내린다는 밤, 과수원을 돌며 서리를 거뒀다. 새벽에 꽃이 멀쩡했다.' });
      if (has('seacalm')) opts.push({ w: 2, pay: 10, text: '선주의 배에 타고 사흘 동안 물결을 달랬다. 짐이 하나도 젖지 않았다.' });
      if (has('kiln')) opts.push({ w: 2, pay: 6, text: '대장간 화덕 불을 하루 종일 한결같이 붙들어 주었다. 대장장이가 이렇게 고른 쇠는 처음이라고 했다.' });
      if (has('seekore')) opts.push({ w: 2, pay: 8, text: '갱도 끝에서 바위에 손을 대고 귀를 기울였다. 왼쪽 아래로 은맥이 흐른다고 짚어 주었다.' });
      if (has('swift')) opts.push({ w: 1, pay: 6, text: '급한 편지를 품고 바람을 등에 업었다. 이틀 길을 하루에 닿았다.' });
      if (has('beastcalm')) opts.push({ w: 2, pay: 4, text: '앓는 소들 사이를 돌며 숨을 고르게 해 주었다. 목장 주인이 치즈 한 덩이를 얹어 주었다.' });
      if (has('focus')) opts.push({ w: 1, pay: 3, text: '상단 장부 정리를 맡았다. 맑은 머리로 사흘 치 셈을 하루에 끝냈다.' });
      if (has('readmind')) opts.push({ w: 1, pay: 7, text: '거래 자리에 앉아 상대의 속을 읽어 주었다. 의뢰한 상인이 흡족해했다. 상대는 끝까지 몰랐다.' });
      if (has('whisper')) opts.push({ w: 1, pay: 9, text: '누군가의 부탁으로 벽 너머 그늘의 말을 엿들었다. 돈은 후했지만 오래 찜찜했다.' });
      if (has('till') || has('grow')) opts.push({ w: 1, pay: 2, text: '봄밭을 돌며 굳은 흙을 뒤집고 시든 모종을 살렸다. 농부들이 새참을 나눠 주었다.' });
      if (has('purge') || has('antidote')) opts.push({ w: 2, pay: 7, text: '상한 고기를 먹고 쓰러진 일꾼들 몸에서 독기를 씻어 냈다.' });
      for (const x of madeSpells(g).filter((x) => x.use !== 'combat')) opts.push({ w: 1, pay: 3 + x.circle * 3, text: `내가 지은 ${J(x.name, '을/를')} 써 달라는 부탁을 받았다. 다른 데선 볼 수 없는 술식이라 값을 더 쳐 주었다.` });
      // 위에 없는 주문만 아는 사람도 품은 판다 (42단계 새 주문들)
      if (!opts.length) { const sp = rng.pick(knownSpells(g).filter((x) => x.use !== 'combat')) ?? { name: '마력 방패', circle: 1 }; opts.push({ w: 1, pay: 1 + sp.circle * 2, text: `${J(sp.name, '을/를')} 써 줄 사람을 찾는다는 말에 손을 들었다. 하루 품이 되었다.` }); }
      const o = rng.weighted(opts, (x) => x.w) ?? opts[0];
      const mult = (WAGE[here(g)] ?? 1) * (1 + 0.25 * m.certified);
      let pay = Math.max(1, Math.round(o.pay * mult));
      g.player.fatigue = Math.min(100, g.player.fatigue + 12);
      const k = gainSkill(g, 'magic', 0.6, 'int');
      m.works += 1;
      strainUp(g, 7);
      let tail = '';
      // 3서클 이상인데 협회에 등록하지 않았다면, 도시에서는 단속에 걸릴 수 있다
      if (circleOf(g) >= 3 && !g.flags?.mage_registered && m.certified === 0 && here(g) !== 'ern' && rng.chance(0.12)) {
        const fine = Math.min(g.player.money + pay, 15);
        pay -= fine;
        tail = ` 협회 감찰관이 등록하지 않은 마법사라며 벌금 은화 ${fine}닢을 물렸다.`;
      }
      g.player.money = Math.max(0, g.player.money + pay);
      if (m.strain >= 60) tail += ' 손끝이 저리고 관자놀이가 욱신거린다. 마력을 너무 많이 끌어 쓰고 있다.';
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
// 대를 이으면 마법은 새로 시작하지만, 집안 마법사가 지은 주문은 마도서로 남는다
HOOKS.heir?.push((g) => {
  const old = g.magic ?? {}, made = (old.made ?? []).map((x) => ({ ...x, learned: false, mine: false }));
  g.magic = MAGIC_FRESH();
  g.magic.made = made.slice(-6);
  g.magic.seq = old.seq ?? 1;
});
