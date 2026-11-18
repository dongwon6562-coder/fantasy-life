// 세 살에서 여덟 살 사이의 작은 날들 (헤드). 처음 한 시간 동안 이 나이에 넉 달 중 세 달이 아무 일 없이 지나가서,
// 집과 마을과 계절 속의 작은 장면을 채운다. 큰 갈림길이 아니라, 어떤 아이로 자랄지 조금씩 기울이는 일들이다.
import './toddler.js';
import { gainStat, gainSkill } from '../game.js';
import { EVENTS, flag, setFlag, stress, tire, like, check, nm, age, fam, father, mother, alive, siblings, peers, findJob, season, inVillage, onRoad, byId, spendFamily } from '../events/core.js';

const free = (g) => !onRoad(g) && !g.crime?.jailed;
const kid = (lo, hi) => (g) => free(g) && age(g) >= lo && age(g) <= hi;
const parent = (g) => [father(g), mother(g)].filter(alive)[0] ?? null;
const youngSib = (g) => siblings(g).find((s) => s.ageMonths < (age(g) * 12) - 12) ?? null;
const W = 35; // 다른 사건보다 조금 낮게: 빈 달을 채우는 몫

EVENTS.push(
  {
    id: 'early_shadow', once: true,
    cond: kid(3, 5),
    chance: () => 0.08, weight: W,
    title: '벽의 그림자',
    text: () => '밤에 깨어 보니 벽에 길쭉한 그림자가 서 있다. 바람이 불 때마다 손을 뻗는 것처럼 흔들린다. 숨을 죽였다.',
    choices: [
      { label: '이불을 머리끝까지 덮는다', run: (g) => { stress(g, 4); return '이불 속은 덥고 답답했다. 그래도 나오지 않았다. 아침에 보니 창밖 배나무 가지였다.'; } },
      { label: '어른을 부른다', run: (g) => { const p = parent(g); like(p, 4); stress(g, -3); return p ? `${p.name}이(가) 등잔을 들고 와 창을 열어 보였다. "봐라, 나뭇가지다." 그 손을 붙잡고 다시 잠들었다.` : '아무도 오지 않았다. 혼자 울다 잠들었다.'; } },
      { label: '살금살금 다가가 본다', run: (g) => { gainStat(g, 'wil', 0.5); setFlag(g, 'early_brave'); return '한 걸음, 또 한 걸음. 손을 뻗자 그림자가 손등 위로 올라왔다. 아무렇지도 않았다. 이상하게 가슴이 뛰었다.'; } },
    ],
  },
  {
    id: 'early_words', once: true,
    cond: kid(3, 4),
    chance: () => 0.1, weight: W,
    title: '"왜?"',
    text: (g) => `오늘만 "왜?"를 쉰 번은 물었다. 해는 왜 지는지, 개는 왜 짖는지, 할아버지는 왜 이가 없는지. ${nm(parent(g), '어른')}의 얼굴이 점점 지쳐 간다.`,
    choices: [
      { label: '계속 묻는다', run: (g) => { gainStat(g, 'int', 0.6); like(parent(g), -2); return '"그냥 그런 거다!" 끝내 그 말을 들었다. 그래도 그중 세 가지는 대답을 들었다. 잊지 않았다.'; } },
      { label: '스스로 생각해 본다', run: (g) => { gainStat(g, 'int', 0.4); gainStat(g, 'sen', 0.3); return '해가 지는 쪽을 오래 바라보았다. 산 너머로 들어가는 거라고 정했다. 틀렸다는 건 한참 뒤에 알았다.'; } },
    ],
  },
  {
    id: 'early_lost_toy', cooldown: 30,
    cond: kid(3, 6),
    chance: () => 0.06, weight: W,
    title: '잃어버린 나무 인형',
    text: () => '늘 들고 다니던 나무 인형이 없다. 아버지가 장작을 패다 남은 토막으로 깎아 준 것이다. 집 안 어디에도 없다.',
    choices: [
      { label: '울면서 온 집을 뒤진다', run: (g, rng) => { if (rng.chance(0.6)) { stress(g, -2); return '아궁이 옆 재 속에서 찾았다. 한쪽 팔이 그을려 있었다. 그래서 더 좋아졌다.'; } stress(g, 6); return '끝내 찾지 못했다. 며칠 동안 빈손이 허전했다.'; } },
      { label: '새로 만들어 달라고 조른다', run: (g) => { const p = parent(g); like(p, 2); return p ? `${p.name}이(가) 한숨을 쉬더니 칼을 들었다. 새 인형은 전 것보다 못생겼다. 그래도 받았다.` : '만들어 줄 사람이 없었다. 돌멩이에 얼굴을 그려 대신했다.'; } },
      { label: '없으면 없는 대로 지낸다', run: (g) => { gainStat(g, 'wil', 0.4); return '처음 며칠은 손이 허전했다. 그다음엔 막대기를 칼 삼아 휘두르고 다녔다.'; } },
    ],
  },
  {
    id: 'early_first_snow', cooldown: 24,
    cond: (g) => kid(3, 7)(g) && season(g) === 'winter' && inVillage(g),
    chance: () => 0.12, weight: W,
    title: '첫눈',
    text: () => '아침에 문을 여니 마을이 하얗다. 지붕도, 우물도, 밭도. 발을 디디자 뽀드득 소리가 났다.',
    choices: [
      { label: '아이들과 눈싸움을 한다', run: (g, rng) => { const p = rng.pick(peers(g, 3).length ? peers(g, 3) : [null]); like(p, 5); tire(g, 10); gainStat(g, 'str', 0.3); return p ? `${p.name}이(가) 던진 눈뭉치가 목덜미로 들어갔다. 소리를 지르며 쫓아갔다. 해가 질 때까지 손이 빨갛게 얼었다.` : '혼자 눈뭉치를 굴려 담 위에 올렸다. 저녁에 보니 누가 돌로 눈을 박아 놓았다.'; } },
      { label: '발자국을 따라가 본다', run: (g) => { gainStat(g, 'sen', 0.5); return '작은 발자국이 담 밑을 지나 숲 쪽으로 이어졌다. 여우인지 고양이인지 몰랐다. 숲 어귀에서 멈췄다. 더 가면 안 된다는 건 알았다.'; } },
      { label: '창가에서 내다보기만 한다', run: (g) => { stress(g, -4); return '화로 옆에 앉아 눈이 내리는 것을 보았다. 소리 없이 쌓였다. 세상이 아주 조용해졌다.'; } },
    ],
  },
  {
    id: 'early_market_day', cooldown: 24,
    cond: (g) => kid(4, 8)(g) && inVillage(g),
    chance: () => 0.06, weight: W,
    title: '장날',
    text: () => '장날이다. 하르펜에서 온 짐마차가 광장에 섰다. 처음 보는 천과 그릇, 꿀에 절인 과일, 쇳소리 나는 칼. 사람이 너무 많아 어른 손을 놓칠 것 같다.',
    choices: [
      { label: '손을 꼭 잡고 구경한다', run: (g) => { gainStat(g, 'sen', 0.3); stress(g, -3); return '꿀 과일 한 조각을 얻어먹었다. 손가락이 끈적했다. 다음 장날을 손꼽아 세기 시작했다.'; } },
      { label: '몰래 손을 놓고 돌아다닌다', run: (g, rng) => { if (rng.chance(0.5)) { gainStat(g, 'cha', 0.4); return '칼 장수가 칼날에 비친 내 얼굴을 보여 주었다. 실컷 구경하고 돌아오니 집안이 발칵 뒤집혀 있었다. 그날 밤 종아리를 맞았다.'; } stress(g, 8); return '사람들 다리 사이에서 길을 잃었다. 울고 있으니 낯선 아주머니가 집까지 데려다주었다.'; } },
      { label: '장사꾼이 흥정하는 걸 지켜본다', run: (g) => { gainSkill(g, 'trade', 1); gainStat(g, 'int', 0.2); return '"그건 너무 비싸요." "그럼 이건 얹어 드리지." 말이 오갈 때마다 값이 바뀌었다. 신기했다. 어른들이 하는 일 중에 제일 재미있어 보였다.'; } },
    ],
  },
  {
    id: 'early_chores', once: true,
    cond: kid(4, 6),
    chance: () => 0.1, weight: W,
    title: '첫 심부름',
    text: (g) => (fam(g) === 'merchant' ? '"이 소금 자루를 대장간 아저씨한테 갖다 드리고 오너라. 돈은 받지 말고." 처음 혼자 하는 심부름이다.'
      : fam(g) === 'fallen_knight' ? '"마구간에 가서 말에게 귀리 한 바가지를 주고 오너라." 아버지 말씀이다. 집에 남은 말은 늙은 회색말 한 마리뿐이다.'
      : '"닭장에 가서 알을 걷어 오너라. 깨뜨리지 말고." 처음 혼자 하는 심부름이다.'),
    choices: [
      { label: '조심조심 해낸다', run: (g) => { gainStat(g, 'wil', 0.4); like(parent(g), 4); setFlag(g, 'early_errand'); return '해냈다. 별것 아니라는 듯이 말했지만, 그날 저녁 밥을 두 그릇 먹었다.'; } },
      { label: '서두르다 일을 그르친다', run: (g) => { stress(g, 4); gainStat(g, 'sen', 0.3); return '중간에 넘어졌다. 쏟아진 것을 보고 한참 서 있다가 집에 돌아가 말했다. 혼나지 않았다. 그게 더 부끄러웠다.'; } },
    ],
  },
  {
    id: 'early_sib_born_watch', cooldown: 36,
    cond: (g) => kid(4, 9)(g) && !!youngSib(g) && youngSib(g).ageMonths < 36,
    chance: () => 0.08, weight: W,
    prepare: (g) => ({ id: youngSib(g).id }),
    title: '동생 보기',
    text: (g, c) => { const s = byId(g, c.id); return `"잠깐만 ${nm(s, '동생')}을(를) 보고 있어라." 어른들이 밭에 나갔다. 동생은 기어다니며 무엇이든 입에 넣으려 한다.`; },
    choices: [
      { label: '눈을 떼지 않는다', run: (g, rng, c) => { const s = byId(g, c.id); like(s, 8); gainStat(g, 'wil', 0.3); tire(g, 8); return '반나절 내내 따라다녔다. 돌멩이 셋, 지푸라기 한 줌, 벌레 한 마리를 입에서 빼냈다. 어른들이 돌아왔을 때 둘 다 잠들어 있었다.'; } },
      { label: '놀러 나가고 싶어 몸이 들썩인다', run: (g, rng, c) => { const s = byId(g, c.id); if (rng.chance(0.4)) { stress(g, 6); return '잠깐 문밖을 내다본 사이 동생이 문지방에서 굴렀다. 우는 소리에 이웃이 달려왔다. 그날 일은 오래 기억에 남았다.'; } like(s, 2); return '창밖에서 아이들 소리가 들렸다. 동생을 업고 나가 구경만 했다. 업은 등이 따뜻했다.'; } },
    ],
  },
  {
    id: 'early_old_story', cooldown: 30,
    cond: (g) => kid(4, 8)(g) && inVillage(g),
    chance: () => 0.06, weight: W,
    title: '화롯가 이야기',
    text: () => '겨울밤, 이웃 노인이 화롯가에서 옛이야기를 한다. 마신이 봉인되기 전, 하늘이 붉던 시절의 이야기다. 아이들이 숨을 죽인다.',
    choices: [
      { label: '용사 이야기를 졸라 듣는다', run: (g) => { gainStat(g, 'wil', 0.3); setFlag(g, 'early_hero_tale'); return '"용사는 일곱 날 밤을 걸어 봉인의 산에 올랐지." 노인의 목소리가 낮아질 때마다 화롯불이 튀었다. 그날 밤 꿈에 붉은 하늘을 보았다.'; } },
      { label: '"그거 진짜예요?" 하고 묻는다', run: (g) => { gainStat(g, 'int', 0.4); return '노인이 껄껄 웃었다. "오백 년 전 일을 누가 알겠느냐. 다만 봉인석은 아직 거기 있다." 진짜인지 아닌지보다 그 말이 더 무서웠다.'; } },
      { label: '무서워서 귀를 막는다', run: (g) => { stress(g, 3); return '귀를 막아도 다 들렸다. 그날 밤 등잔을 끄지 말아 달라고 졸랐다.'; } },
    ],
  },
  {
    id: 'early_animal', cooldown: 36,
    cond: kid(4, 9),
    chance: () => 0.05, weight: W,
    title: '다친 새',
    text: () => '담 밑에 참새 한 마리가 떨어져 있다. 날개 한쪽이 이상하게 꺾였다. 고양이가 저쪽에서 보고 있다.',
    choices: [
      { label: '데려가 돌본다', run: (g, rng) => { gainStat(g, 'sen', 0.4); if (rng.chance(0.5)) { stress(g, -6); setFlag(g, 'early_bird_saved'); return '헝겊으로 둥지를 만들고 좁쌀을 물에 불려 먹였다. 열흘 뒤, 새는 마당을 한 바퀴 돌더니 담 너머로 날아갔다.'; } stress(g, 6); return '사흘 동안 좁쌀을 먹였다. 나흘째 아침, 새는 움직이지 않았다. 마당 구석에 묻어 주었다. 처음 판 무덤이었다.'; } },
      { label: '고양이를 쫓기만 한다', run: (g) => { gainStat(g, 'wil', 0.2); return '고양이를 쫓았다. 돌아와 보니 새는 담 틈으로 기어 들어가 있었다. 그다음은 모른다.'; } },
      { label: '그냥 지나간다', run: (g) => { return '돌아보지 않았다. 저녁에 담 밑에는 깃털 몇 개만 남아 있었다.'; } },
    ],
  },
  {
    id: 'early_fever', cooldown: 48,
    cond: kid(3, 7),
    chance: () => 0.04, weight: W,
    title: '열',
    text: (g) => `사흘째 열이 내리지 않는다. 천장이 빙빙 돌고, 꿈과 생시가 섞인다. ${nm(parent(g), '누군가')}이(가) 젖은 수건을 이마에 얹어 준다.`,
    choices: [
      { label: '약초사를 부른다', run: (g, rng) => { const h = findJob(g, 'herbalist'); spendFamily(g, 3); tire(g, -10); return h ? `${h.name}이(가) 쓴 탕약을 달여 왔다. 토할 것 같았다. 다음 날 아침 열이 내렸다. 집안 돈 은화 세 닢이 들었다.` : '약초사는 이웃 마을에 가 있었다. 결국 이레 만에 저절로 나았다.'; } },
      { label: '참고 견딘다', run: (g, rng) => { gainStat(g, 'wil', 0.5); if (rng.chance(0.15)) { gainStat(g, 'str', -0.5); return '열흘 만에 일어났다. 한동안 다리에 힘이 없었다.'; } return '닷새째 밤, 땀을 흠뻑 흘리고 깨어났다. 배가 고팠다. 살았다는 뜻이었다.'; } },
    ],
  },
  {
    id: 'early_imitate', once: true,
    cond: (g) => kid(4, 7)(g) && !!parent(g),
    chance: () => 0.07, weight: W,
    title: '흉내',
    text: (g) => (fam(g) === 'fallen_knight' ? '아버지가 마당에서 녹슨 검을 휘두를 때, 나뭇가지를 들고 그 옆에 섰다.'
      : fam(g) === 'merchant' ? '가게 계산대 뒤에 앉아, 어른이 하듯 주판알을 튕겨 본다.'
      : '어른들 뒤를 따라 밭고랑에 작은 손으로 씨를 넣어 본다.'),
    choices: [
      { label: '똑같이 따라 한다', run: (g) => { const sk = fam(g) === 'fallen_knight' ? 'sword' : fam(g) === 'merchant' ? 'trade' : 'farming'; gainSkill(g, sk, 2); like(parent(g), 5); setFlag(g, 'early_imitate_' + sk); return '어른이 멈추고 나를 보았다. 웃지 않았다. 대신 손 모양을 고쳐 주었다. 그게 웃는 것보다 좋았다.'; } },
      { label: '내 방식대로 해 본다', run: (g) => { gainStat(g, 'int', 0.3); gainStat(g, 'cha', 0.2); return '"그렇게 하는 게 아니다." 몇 번을 들었다. 그래도 내 방식이 더 재미있었다.'; } },
    ],
  },
  {
    id: 'early_name_mock', cooldown: 36,
    cond: (g) => kid(5, 8)(g) && peers(g, 3).length > 1,
    chance: () => 0.05, weight: W,
    prepare: (g, rng) => ({ id: rng.pick(peers(g, 3)).id }),
    title: '놀림',
    text: (g, c) => { const p = byId(g, c.id); const why = fam(g) === 'fallen_knight' ? '"기사님 댁 거지!"' : fam(g) === 'merchant' ? '"구두쇠 집 애!"' : '"흙투성이 농사꾼!"'; return `${nm(p)}이(가) 아이들 앞에서 손가락질한다. ${why} 몇이 따라 웃는다.`; },
    choices: [
      { label: '달려들어 싸운다', run: (g, rng, c) => { const p = byId(g, c.id); if (check(rng, g.player.stats.str, 15)) { like(p, -6); gainStat(g, 'str', 0.3); return `${nm(p)}을(를) 넘어뜨렸다. 아무도 더 웃지 않았다. 집에 와서는 찢어진 옷 때문에 혼났다.`; } like(p, -4); stress(g, 6); return '먼저 달려들었지만 먼저 넘어진 것도 나였다. 코피가 났다. 웃음소리가 더 커졌다.'; } },
      { label: '말로 받아친다', run: (g, rng, c) => { const p = byId(g, c.id); if (check(rng, g.player.stats.cha + g.player.stats.int / 2, 25)) { gainStat(g, 'cha', 0.5); like(p, 2); return '한마디 했을 뿐인데 아이들이 이번엔 그 애를 보고 웃었다. 그 애도 결국 따라 웃었다.'; } stress(g, 4); return '말이 꼬였다. 아이들이 내 말투까지 흉내 냈다.'; } },
      { label: '못 들은 척 지나간다', run: (g) => { gainStat(g, 'wil', 0.4); stress(g, 3); return '등 뒤에서 웃음소리가 따라왔다. 돌아보지 않았다. 집에 와서 한참 동안 담벼락만 보고 앉아 있었다.'; } },
    ],
  },
  {
    id: 'early_stars', cooldown: 36,
    cond: (g) => kid(5, 9)(g) && (season(g) === 'summer' || season(g) === 'autumn'),
    chance: () => 0.05, weight: W,
    title: '별',
    text: () => '여름밤, 멍석 위에 누워 하늘을 본다. 별이 너무 많아 셀 수가 없다. 은하가 강처럼 하늘을 가로지른다.',
    choices: [
      { label: '별을 하나하나 세어 본다', run: (g) => { gainStat(g, 'int', 0.3); gainStat(g, 'wil', 0.2); return '백까지 세다가 어디까지 셌는지 잊었다. 다시 셌다. 세 번째에 잠들었다.'; } },
      { label: '저 너머에 뭐가 있는지 상상한다', run: (g) => { gainStat(g, 'sen', 0.4); setFlag(g, 'early_dreamer'); return '저 별 하나하나가 먼 나라의 등불일지도 모른다고 생각했다. 언젠가 가 보리라 마음먹었다. 어디로든.'; } },
      { label: '어른에게 별 이름을 묻는다', run: (g) => { const p = parent(g); like(p, 3); gainStat(g, 'int', 0.3); return p ? `${p.name}이(가) 손가락으로 짚었다. "저건 길잡이별이다. 길을 잃으면 저걸 보고 남쪽을 찾아라." 그 말을 오래 기억했다.` : '물어볼 사람이 없었다. 별에 내 마음대로 이름을 붙였다.'; } },
    ],
  },
  {
    id: 'early_broken_thing', once: true,
    cond: kid(4, 8),
    chance: () => 0.05, weight: W,
    title: '깨진 그릇',
    text: () => '선반 위를 뒤지다 할머니가 시집올 때 가져왔다는 그릇을 떨어뜨렸다. 두 동강이 났다. 아무도 보지 못했다.',
    choices: [
      { label: '바로 털어놓는다', run: (g) => { const p = parent(g); like(p, 5); gainStat(g, 'wil', 0.4); setFlag(g, 'early_honest'); return p ? `${p.name}은(는) 한참 말없이 조각을 쥐고 있었다. "다치진 않았느냐." 그 말이 혼나는 것보다 아팠다.` : '털어놓을 사람이 없었다. 조각을 천에 싸서 간직했다.'; } },
      { label: '숨긴다', run: (g, rng) => { if (rng.chance(0.5)) { stress(g, 5); return '조각을 헛간 뒤에 묻었다. 아무도 묻지 않았다. 그게 몇 해 동안 마음에 걸렸다.'; } like(parent(g), -4); stress(g, 4); return '이틀 만에 들켰다. 깨뜨린 것보다 숨긴 것 때문에 더 혼났다.'; } },
      { label: '동생 탓을 한다', run: (g) => { const s = siblings(g)[0]; if (!s) { stress(g, 3); return '탓할 사람이 없었다. 결국 고양이 탓을 했다. 아무도 믿지 않았다.'; } like(s, -8); setFlag(g, 'early_blamed_sib'); return `${s.name}이(가) 대신 혼났다. 우는 얼굴을 똑바로 볼 수 없었다.`; } },
    ],
  },
  {
    id: 'early_festival', cooldown: 24,
    cond: (g) => kid(3, 8)(g) && inVillage(g) && g.date.month === 9,
    chance: () => 0.25, weight: W,
    title: '추수 잔치',
    text: () => '추수가 끝난 밤, 광장에 모닥불이 오른다. 어른들은 맥주를 돌리고, 피리 소리에 맞춰 춤을 춘다. 아이들은 사이사이를 뛰어다닌다.',
    choices: [
      { label: '어른들 춤에 끼어든다', run: (g) => { gainStat(g, 'cha', 0.4); stress(g, -6); return '아무 박자에나 발을 굴렀다. 어른들이 손뼉을 쳐 주었다. 얼굴이 모닥불처럼 달아올랐다.'; } },
      { label: '아이들과 불 주위를 뛰어다닌다', run: (g, rng) => { const p = rng.pick(peers(g, 3).length ? peers(g, 3) : [null]); like(p, 6); tire(g, 8); return p ? `${p.name}과(와) 손을 잡고 불 둘레를 열 바퀴 돌았다. 어지러워 함께 주저앉아 웃었다.` : '혼자 불 둘레를 돌다 지쳐 쓰러졌다. 누군가 담요를 덮어 주었다.'; } },
      { label: '구석에서 지켜본다', run: (g) => { gainStat(g, 'sen', 0.4); return '불빛에 비친 얼굴들을 하나하나 보았다. 웃는 얼굴, 취한 얼굴, 혼자 우는 얼굴. 어른들도 저렇게 운다는 걸 처음 알았다.'; } },
    ],
  },
  {
    id: 'early_rain_puddle', cooldown: 30,
    cond: (g) => kid(3, 6)(g) && (season(g) === 'spring' || season(g) === 'summer'),
    chance: () => 0.06, weight: W,
    title: '웅덩이',
    text: () => '사흘 내린 비가 그치고 길마다 웅덩이가 생겼다. 하늘이 그 안에 거꾸로 들어 있다.',
    choices: [
      { label: '첨벙 뛰어든다', run: (g) => { tire(g, 4); stress(g, -5); return '흙탕물이 머리끝까지 튀었다. 신이 났다. 집에 가서는 그만큼 혼났다.'; } },
      { label: '들여다본다', run: (g) => { gainStat(g, 'sen', 0.3); return '웅덩이 속 내 얼굴을 오래 보았다. 저게 나구나. 처음으로 그렇게 생각했다.'; } },
      { label: '나뭇잎 배를 띄운다', run: (g) => { gainStat(g, 'int', 0.3); return '잎사귀를 접어 띄웠다. 바람이 불자 건너편까지 갔다. 다음엔 더 큰 배를 만들기로 했다.'; } },
    ],
  },
);

// 이 사건들이 남긴 작은 기울기는 나중에 다른 글이 읽을 수 있다 (early_brave, early_honest, early_dreamer 따위).
export const EARLY_FLAGS = ['early_brave', 'early_errand', 'early_hero_tale', 'early_bird_saved', 'early_honest', 'early_dreamer', 'early_blamed_sib'];
export const earlyTrait = (g) => EARLY_FLAGS.filter((k) => flag(g, k));
