// 열다섯 이후: 집을 떠날지, 늙어 가는 부모, 빚, 결투, 마법사 등록, 길 위의 일들, 나이 듦.
// (직업·이사·소속은 다른 갈래가 맡는다. 여기 사건은 어디에 살든 일어날 수 있는 일 위주)
import { gainStat, gainSkill, circleOf, purse } from '../game.js';
import { realm, nudge } from '../world.js';
import { kill } from '../npc.js';
import { startDuel } from '../duel/duel.js';
import {
  EVENTS, flag, setFlag, fam, father, mother, alive, age, findJob, peers, stat, skill, money, spend,
  spendFamily, stress, tire, like, note, injure, check, nm, byId, living, ageYears, isFamily, siblings,
  startChain, here,
} from './core.js';

const parents = (g) => [father(g), mother(g)].filter(alive);
// 곁에 사는 부모 (멀리 떠나 사는데 우물가에서 주저앉는 걸 볼 수는 없다, 48단계 헤드)
const nearParents = (g) => parents(g).filter((p) => (p.place ?? 'ern') === here(g));
// 최근 반년 안에 세상을 떠난 부모
const diedRecently = (g, p) => { const h = p.history[p.history.length - 1]; return !!h && (g.date.year * 12 + g.date.month) - (h.y * 12 + h.m) <= 6; };
const deadParents = (g) => [father(g), mother(g)].filter((p) => p && !p.alive && diedRecently(g, p));

EVENTS.push(
  {
    id: 'adult_leave_home', once: true,
    cond: (g) => age(g) >= 15 && age(g) <= 18 && flag(g, 'adult'),
    chance: () => 0.06, weight: 50,
    title: '마을 밖의 길',
    text: () => '마을 어귀 이정표 앞에 섰다. 북쪽은 하르펜, 그 너머는 왕도 레오카스트. 남쪽은 바다와 자유도시들. 여기서 늙어 죽을 수도 있고, 저 길 중 하나를 걸을 수도 있다.',
    choices: [
      { label: '언젠가 떠나리라 마음먹는다', run: (g) => { setFlag(g, 'wanderlust'); gainStat(g, 'wil', 0.6); return '이정표의 글자를 손으로 쓸었다. 아직은 아니다. 하지만 언젠가.'; } },
      { label: '여기가 내 자리다', run: (g) => { setFlag(g, 'rooted'); for (const p of parents(g)) like(p, 5); stress(g, -10); return '돌아서서 마을을 보았다. 굴뚝 연기, 밀밭, 예배당 종탑. 나쁘지 않은 삶이다.'; } },
    ],
  },
  {
    id: 'adult_parent_aging', cooldown: 60,
    cond: (g) => age(g) >= 18 && nearParents(g).some((p) => ageYears(p) >= 55),
    chance: () => 0.04, weight: 50,
    prepare: (g) => ({ id: nearParents(g).find((p) => ageYears(p) >= 55).id }),
    title: '작아진 등',
    text: (g, c) => { const p = byId(g, c.id); return `${p.name}이(가) 우물에서 물동이를 들다 허리를 짚고 주저앉았다. 언제 저렇게 작아졌을까. 머리는 하얗게 셌고, 손은 마른 나뭇가지 같다.`; },
    choices: [
      { label: '집안일을 도맡는다', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 12); tire(g, 10); p.health = Math.min(100, (p.health ?? 70) + 10); return `"쓸데없는 걱정이다." ${p.name}은(는) 투덜댔지만, 그날 밤 처음으로 일찍 잠자리에 들었다.`; } },
      { label: '약초사에게 약을 지어 온다', show: (g) => money(g) >= 3, run: (g, rng, c) => { spend(g, 3); const p = byId(g, c.id); like(p, 8); p.health = Math.min(100, (p.health ?? 70) + 15); return '쓴 약을 달였다. 효과는 모르겠지만, 마시는 얼굴이 조금 펴졌다.'; } },
      { label: '"쉬세요."라는 말만 한다', run: (g, rng, c) => { like(byId(g, c.id), 2); return '말은 쉬웠다. 다음 날도 그 사람은 새벽같이 일어났다.'; } },
    ],
  },
  {
    id: 'adult_inheritance', cooldown: 6,
    cond: (g) => age(g) >= 10 && deadParents(g).some((p) => !flag(g, 'mourned_' + p.id)),
    weight: 88,
    prepare: (g) => ({ id: deadParents(g).find((p) => !flag(g, 'mourned_' + p.id)).id }),
    title: '유품',
    text: (g, c) => { const p = byId(g, c.id); return `${p.name}의 장례가 끝났다. 빈 방에 남은 것은 낡은 옷 몇 벌, 손때 묻은 연장, 그리고 침대 밑 작은 나무 상자 하나. ${siblings(g).length ? '형제들이 말없이 서로를 본다.' : ''}`; },
    choices: [
      { label: '상자를 연다', run: (g, rng, c) => { setFlag(g, 'mourned_' + c.id); const n = rng.int(3, 12); g.player.money += n; stress(g, 10); return `안에는 은화 ${n}닢과, 내가 어릴 때 처음 쓴 글씨가 적힌 석판 조각이 들어 있었다. 그걸 지금까지 간직하고 있었다는 걸, 몰랐다.`; } },
      { label: '형제들에게 먼저 고르게 한다', show: (g) => siblings(g).length > 0, run: (g, rng, c) => { setFlag(g, 'mourned_' + c.id); for (const s of siblings(g)) like(s, 10); gainStat(g, 'wil', 0.5); return '형제들이 하나씩 골랐다. 남은 건 낡은 연장 하나였다. 그걸로 충분했다.'; } },
      { label: '그대로 둔다', run: (g, rng, c) => { setFlag(g, 'mourned_' + c.id); stress(g, 15); return '방문을 닫았다. 아직은 열 수 없었다.'; } },
    ],
  },
  {
    id: 'adult_tavern_brawl', cooldown: 30,
    cond: (g) => age(g) >= 16,
    chance: () => 0.02, weight: 40,
    title: '술집의 싸움',
    text: () => '여관에서 술 취한 용병 셋이 시비를 건다. 여관 주인의 딸에게 손을 뻗더니, 말리는 늙은 일꾼을 걷어찼다. 모두 눈을 피한다.',
    choices: [
      { label: '나선다', run: (g, rng) => { const power = skill(g, 'sword') + stat(g, 'str') / 2 + stat(g, 'agi') / 3; if (check(rng, power, 45)) { gainStat(g, 'str', 0.6); gainStat(g, 'cha', 0.8); setFlag(g, 'tavern_hero'); const inn = findJob(g, 'innkeeper'); like(inn, 15); return '첫 번째 놈의 턱을 날리자 나머지 둘이 머뭇거렸다. 여관 사람들이 일어섰다. 용병들은 욕을 뱉으며 나갔다. 그날 술값은 받지 않았다.'; } injure(g, '부러진 코', 2); stress(g, 15); return '셋은 무리였다. 바닥에 처박혀 코가 부러졌다. 그래도 그 사이 누군가 경비대를 불러왔다.'; } },
      { label: '경비대를 부르러 간다', run: (g) => { gainStat(g, 'int', 0.3); return '경비대가 왔을 때 용병들은 이미 술값도 안 내고 떠난 뒤였다.'; } },
      { label: '못 본 척한다', run: (g) => { stress(g, 8); return '술잔만 내려다보았다. 맛이 썼다.'; } },
    ],
  },
  {
    id: 'adult_loan_shark', once: true,
    cond: (g) => age(g) >= 16 && money(g) < 10,
    chance: () => 0.025, weight: 45,
    title: '쉬운 돈',
    text: () => '하르펜에서 온 남자가 친절하게 웃는다. "은화 서른 닢, 지금 바로. 갚는 건 여섯 달 뒤에 마흔 닢. 서류도 필요 없소." 소매 끝으로 검은 장갑이 보인다.',
    choices: [
      { label: '빌린다', run: (g) => { g.player.money += 30; startChain(g, 'loan', 1, 6, { owe: 40 }); setFlag(g, 'black_glove_debtor'); return '은화 서른이 손에 떨어졌다. 남자가 장부에 내 이름을 적으며 말했다. "여섯 달 뒤에 봅시다. 꼭."'; } },
      { label: '거절한다', run: () => '"마음 바뀌면 여관에 말 남기시오." 남자는 웃음을 거두지 않았다.' },
    ],
  },
  {
    id: 'adult_old_friend_returns', once: true,
    // 48단계: 내가 다른 고장에 사는데 '마을 어귀에' 떠났던 이웃이 돌아오던 것. 그 사람 고향에 내가 있을 때만.
    cond: (g) => age(g) >= 18 && g.people.some((p) => p.away && !p.drafted && p.alive && p.known && p.affection >= 10 && (p.place ?? 'ern') === (g.life?.place ?? 'ern')),
    chance: () => 0.04, weight: 55,
    prepare: (g, rng) => ({ id: rng.pick(g.people.filter((p) => p.away && !p.drafted && p.alive && p.known && p.affection >= 10 && (p.place ?? 'ern') === (g.life?.place ?? 'ern'))).id }),
    title: '돌아온 얼굴',
    text: (g, c) => { const p = byId(g, c.id); return `마을 어귀에 낯익은 얼굴이 섰다. ${p.name}${/[가-힣]/.test(p.name.slice(-1)) && (p.name.charCodeAt(p.name.length - 1) - 0xac00) % 28 !== 0 ? '이다' : '다'}. 몇 년 전 떠났던. 얼굴엔 흉터가, 눈엔 피로가 들어앉았다. "...오랜만이야."`; },
    choices: [
      { label: '끌어안는다', run: (g, rng, c) => { const p = byId(g, c.id); p.away = false; like(p, 15); note(g, p, '오랜 객지 생활 끝에 고향으로 돌아왔다.'); return `${p.name}은(는) 그날 밤 여관에서 바깥세상 이야기를 했다. 돈은 벌지 못했고, 동료 둘을 잃었다고. "그래도 후회는 안 해. 봤으니까. 세상이 얼마나 넓은지."`; } },
      { label: '무슨 일이 있었는지 묻는다', run: (g, rng, c) => { const p = byId(g, c.id); p.away = false; like(p, 8); gainStat(g, 'int', 0.5); note(g, p, '오랜 객지 생활 끝에 고향으로 돌아왔다.'); return `"왕도는 썩었어. 성 밖은 검은 장갑 거고, 성 안은 귀족들 거야. 우리 같은 사람 자리는 없더라." ${p.name}은(는) 쓴웃음을 지었다.`; } },
    ],
  },
  {
    id: 'adult_highway_robbery', cooldown: 36,
    cond: (g) => age(g) >= 16 && (realm(g)?.monsters ?? 30) + (realm(g)?.succession === 'civilwar' ? 30 : 0) >= 35,
    chance: () => 0.015, weight: 50,
    title: '해 질 녘 가도',
    text: () => '하르펜에서 돌아오는 길, 해가 졌다. 길가 바위 뒤에서 사내 둘이 나왔다. 하나는 녹슨 칼, 하나는 쇠스랑. 굶주린 농민 출신 강도다. "가진 거 다 내놔."',
    choices: [
      { label: '싸운다', run: (g, rng) => { const power = skill(g, 'sword') + stat(g, 'agi') / 2 + circleOf(g) * 15; if (check(rng, power, 35)) { gainSkill(g, 'sword', 2.0, 'agi'); return '칼을 쳐내자 강도들은 생각보다 쉽게 무너졌다. 도망치는 등이 앙상했다. 쫓지 않았다.'; } injure(g, '칼에 베인 손바닥', 2); spend(g, Math.ceil(purse(g) / 2)); return '손바닥을 베였다. 주머니 절반을 빼앗겼다.'; } },
      { label: '가진 걸 내준다', run: (g) => { spend(g, purse(g)); return '주머니를 털어 주었다. 강도 하나가 동전을 세다가, 동화 몇 닢을 다시 던져 주었다. "빵이나 사 먹어."'; } },
      { label: '"나도 굶어 봐서 안다."', run: (g, rng) => { if (check(rng, stat(g, 'cha') + stat(g, 'wil'), 40)) { spend(g, 2); gainStat(g, 'cha', 1.0); setFlag(g, 'talked_down_bandits'); return '은화 둘을 내밀며 하르펜 남문 밖 막노동 자리를 알려 주었다. 사내들은 한참 서 있다가 칼을 내렸다. 사람이 강도가 되는 건 한순간이다.'; } spend(g, purse(g)); return '"설교는 됐고." 주머니를 털렸다.'; } },
    ],
  },
  {
    id: 'adult_mage_registration', once: true,
    cond: (g) => age(g) >= 15 && circleOf(g) >= 3,
    weight: 85,
    title: '마법사 등록법',
    text: () => '마도사 협회의 사자가 찾아왔다. "3서클 이상은 협회에 등록해야 합니다. 등록하면 세레니아의 보호를 받고, 서클 승급 시험을 볼 수 있지요. 등록하지 않으면 떠돌이입니다. 떠돌이가 죄를 지으면, 협회가 직접 사냥합니다."',
    choices: [
      { label: '등록한다', run: (g) => { setFlag(g, 'mage_registered'); g.player.money = Math.max(0, g.player.money - 5); gainStat(g, 'cha', 0.6); return '이름과 서클, 출신을 적었다. 사자가 은빛 인장 반지를 건넸다. 이 반지를 낀 사람은 평민이라도 귀족 대접을 받는다. 그리고 협회의 장부에 묶인다.'; } },
      { label: '거절한다', run: (g) => { setFlag(g, 'mage_rogue'); stress(g, 10); gainStat(g, 'wil', 0.6); return '"후회하실 겁니다." 사자는 내 이름을 따로 적어 갔다. 등록하지 않은 3서클. 그것만으로도 눈여겨볼 이유가 된다.'; } },
    ],
  },
  {
    id: 'adult_wandering_duelist', cooldown: 48,
    cond: (g) => age(g) >= 16 && skill(g, 'sword') >= 35,
    chance: () => 0.025, weight: 55,
    prepare: (g, rng) => ({ school: rng.pick(['강검류', '유수류', '환영류']) }),
    title: '도전',
    text: (g, c) => `${c.school} 검사라는 떠돌이가 마을에 왔다. 네 실력 소문을 들었다고 한다. "목검으로 한 판. 내가 지면 이 검을 주지." 허리의 검은 낡았지만 날이 살아 있다.`,
    choices: [
      { label: '받아들인다', run: (g, rng, c) => { startDuel(g, rng, { kind: 'wanderer', title: '떠돌이 검사의 도전', foe: { name: `${c.school} 검사`, skill: Math.round(skill(g, 'sword') * 0.8 + 18), style: { 강검류: 'bold', 유수류: 'steady', 환영류: 'tricky' }[c.school] }, ctx: { school: c.school } }); return '목검을 받아 들었다. 마을 사람들이 둘러섰다.'; } },
      { label: '거절한다', run: () => '"겁이 많은 건 나쁜 게 아니지." 떠돌이는 다음 마을로 떠났다.' },
    ],
  },
  {
    id: 'adult_heretic_trial', once: true,
    cond: (g) => age(g) >= 16 && peers(g, 60).some((p) => p.job === 'herbalist' || p.traits.includes('reserved')),
    chance: () => 0.012, weight: 55,
    prepare: (g, rng) => { const c = peers(g, 60).filter((p) => p.job === 'herbalist' || p.traits.includes('reserved')); return { id: rng.pick(c).id }; },
    title: '증인',
    text: (g, c) => `이단심문소가 ${nm(byId(g, c.id))}을(를) 금기 마법 혐의로 붙잡았다. 증인이 필요하다고 한다. 심문관이 내게 묻는다. "이 자가 밤에 이상한 짓을 하는 걸 본 적 있나? 솔직히 말하면 성광께서 보상하실 것이다."`,
    choices: [
      { label: '"본 적 없습니다."', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 20); if (rng.chance(0.7)) { note(g, p, '이단 혐의를 받았으나 증거 부족으로 풀려났다.'); return `증거 부족으로 ${p.name}은(는) 풀려났다. 심문관은 나를 한참 바라보다 떠났다.`; } kill(g, p, '이단 처형'); stress(g, 25); return `다른 증인이 있었다. ${p.name}은(는) 화형대에 올랐다. 끝까지 아무 말도 하지 않았다.`; } },
      { label: '거짓 증언을 한다', run: (g, rng, c) => { const p = byId(g, c.id); g.player.money += 10; setFlag(g, 'false_witness'); kill(g, p, '이단 처형'); stress(g, 20); return `은화 열 닢이 주어졌다. ${p.name}은(는) 화형대에서 나를 보았다. 그 눈을 잊을 수 없을 것이다.`; } },
    ],
  },
  {
    id: 'adult_first_gray', once: true,
    cond: (g) => age(g) >= 35 && !flag(g, 'ev_later_first_grey'),
    chance: () => 0.05, weight: 30,
    title: '첫 흰머리',
    text: () => '물에 비친 얼굴에서 흰 머리카락 한 올을 찾았다. 뽑아서 손가락 사이에 비춰 본다. 어릴 적 꿈꾸던 서른다섯은 이런 얼굴이 아니었다.',
    choices: [
      { label: '뽑아 버린다', run: (g) => { stress(g, -5); return '하나쯤이야. 다음 달엔 셋이 되어 있었다.' },
      },
      { label: '지나온 날을 돌아본다', run: (g) => { gainStat(g, 'wil', 0.6); gainStat(g, 'int', 0.4); return '잘한 일과 못한 일을 손가락으로 꼽아 보았다. 아직 접지 않은 손가락이 남아 있다.'; } },
    ],
  },
  {
    id: 'adult_body_aging', cooldown: 120,
    cond: (g) => age(g) >= 50,
    chance: () => 0.04, weight: 45,
    title: '예전 같지 않은 몸',
    text: () => '아침에 일어나는데 무릎이 말을 듣지 않는다. 옛 상처들이 날씨를 먼저 안다. 젊을 때는 하룻밤이면 낫던 피로가 사흘을 간다.',
    choices: [
      { label: '받아들이고 속도를 줄인다', run: (g) => { stress(g, -15); gainStat(g, 'wil', 0.4); return '서두를 일은 많지 않다. 남은 날을 어디에 쓸지, 조금 더 신중해졌다.'; } },
      { label: '이를 악물고 예전처럼 산다', run: (g) => { tire(g, 15); gainStat(g, 'str', 0.3); return '몸은 따라왔다. 대신 밤마다 끙끙 앓았다.'; } },
    ],
  },
  {
    id: 'adult_lost_child', cooldown: 60,
    cond: (g) => age(g) >= 20,
    chance: () => 0.015, weight: 40,
    title: '길 잃은 아이',
    text: () => '장터 한구석에서 대여섯 살쯤 된 아이가 울고 있다. 옷은 좋은 천이고, 목에 문장이 새겨진 은 목걸이를 걸었다. 하르펜 어느 집안 아이 같다.',
    choices: [
      { label: '부모를 찾아 준다', run: (g, rng) => { tire(g, 8); if (rng.chance(0.4)) { g.player.money += 10; setFlag(g, 'noble_favor'); return '하르펜 상인 길드장의 손녀였다. 길드장이 직접 나와 은화 열 닢을 쥐여 주었다. "이 은혜는 잊지 않겠소."'; } gainStat(g, 'cha', 0.5); return '반나절을 헤맨 끝에 하녀를 찾았다. 하녀는 연신 고개를 숙였다.'; } },
      { label: '경비대에 맡긴다', run: () => '경비병이 아이를 데려갔다. 목걸이가 무사히 주인에게 돌아갔는지는 모르겠다.' },
    ],
  },
);

