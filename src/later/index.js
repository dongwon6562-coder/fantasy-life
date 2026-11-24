// 중년과 노년의 사건 (헤드). 지금까지 마흔 넘어서만 나오는 사건이 거의 없어서, 한 삶의 뒤쪽이 비어 있었다.
// 나이는 몸 나이(bodyAgeOf)로 본다. 엘프는 수백 살이어도 몸이 젊으면 이 사건들을 아직 겪지 않는다.
import { gainStat, gainSkill } from '../game.js';
import { bodyAgeOf } from '../npc.js';
import { EVENTS, flag, setFlag, money, spend, stress, tire, like, note, injure, check, nm, byId, me, living, here, onRoad } from '../events/core.js';
import { chron } from '../adventure/core.js';

const bage = (g) => bodyAgeOf(me(g));
const alive = (p) => !!p && p.alive;
const spouse = (g) => { const s = byId(g, me(g).spouseId); return alive(s) ? s : null; };
const kids = (g) => (me(g).childIds ?? []).map((id) => byId(g, id)).filter(alive);
const grownKids = (g) => kids(g).filter((k) => k.ageMonths >= 16 * 12);
const grandkids = (g) => kids(g).flatMap((k) => (k.childIds ?? []).map((id) => byId(g, id))).filter(alive);
const oldFriends = (g) => living(g).filter((p) => !p.isPlayer && p.known && p.affection >= 30 && !g.player.familyIds.includes(p.id) && !(me(g).childIds ?? []).includes(p.id));
const jobOf = (g) => g.life?.job?.id ?? null;
const free = (g) => !onRoad(g) && !g.crime?.jailed;

EVENTS.push(
  {
    id: 'later_first_grey', once: true,
    cond: (g) => free(g) && bage(g) >= 36 && bage(g) < 50 && !flag(g, 'ev_adult_first_gray'), // 같은 이야기를 두 번 겪지 않게
    chance: () => 0.06, weight: 40,
    title: '흰 머리카락',
    text: () => '우물물에 얼굴을 비추다 손을 멈췄다. 관자놀이에 흰 머리카락이 몇 가닥 섞여 있다. 언제부터였는지 모르겠다.',
    choices: [
      { label: '뽑아 버린다', run: (g) => { stress(g, 3); return '세 가닥을 뽑았다. 다음 달에는 다섯 가닥이 났다.'; } },
      { label: '그냥 둔다', run: (g) => { gainStat(g, 'wil', 0.4); return '그대로 두었다. 아버지도 이 나이에 이랬을 것이다.'; } },
      { label: '지나온 해를 세어 본다', run: (g) => { stress(g, -5); gainStat(g, 'int', 0.3); return '손가락을 접으며 해를 세었다. 잘한 일도, 못 한 일도 있었다. 아직 손가락이 남아 있었다.'; } },
    ],
  },
  {
    id: 'later_back_pain', cooldown: 60,
    cond: (g) => free(g) && bage(g) >= 42 && (jobOf(g) || g.player.skills.sword > 30 || g.player.skills.farming > 30),
    chance: () => 0.05, weight: 45,
    title: '굳은 허리',
    text: () => '아침에 몸을 일으키는데 허리가 말을 듣지 않았다. 예전에는 하룻밤 자면 풀리던 것이 이제는 사흘을 간다.',
    choices: [
      { label: '약초사에게 찜질을 받는다', run: (g) => { spend(g, 3); tire(g, -10); return '뜨거운 약초 주머니를 허리에 얹고 반나절을 누워 있었다. 조금 나아졌다. 은화 세 닢이 들었다.'; } },
      { label: '참고 일한다', run: (g) => { gainStat(g, 'wil', 0.5); gainStat(g, 'str', -0.4); injure(g, '굳은 허리', 3); return '이를 악물고 일했다. 저녁이면 허리를 펴는 데 한참이 걸렸다.'; } },
      { label: '일을 줄이고 젊은 사람에게 맡긴다', run: (g) => { tire(g, -15); stress(g, -3); return '무거운 일은 젊은 사람에게 넘겼다. 처음에는 자존심이 상했다. 곧 익숙해졌다.'; } },
    ],
  },
  {
    id: 'later_child_leaves', cooldown: 48,
    cond: (g) => free(g) && bage(g) >= 38 && grownKids(g).some((k) => (k.place ?? 'ern') === here(g) && !k.spouseId),
    chance: () => 0.06, weight: 55,
    prepare: (g, rng) => ({ id: rng.pick(grownKids(g).filter((k) => (k.place ?? 'ern') === here(g) && !k.spouseId)).id }),
    title: '떠나겠다는 아이',
    text: (g, c) => { const k = byId(g, c.id); return `${k.name}이(가) 저녁상을 물리고 앉았다. "더 큰 데로 가 보고 싶어요. 여기서는 내가 뭘 할 수 있는지 모르겠어요." 오래 생각한 얼굴이다.`; },
    choices: [
      { label: '보내 준다, 노자를 쥐여 주며', run: (g, rng, c) => { const k = byId(g, c.id); spend(g, Math.min(money(g), 15)); like(k, 15); note(g, k, '부모의 축복을 받고 고향을 떠났다.'); k.place = rng.pick(['harfen', 'leocast', 'verden']); return `은화를 쥐여 주었다. ${k.name}은(는) 아침 안개 속으로 걸어갔다. 한 번도 돌아보지 않았다. 그게 오히려 다행이었다.`; } },
      { label: '붙잡는다', run: (g, rng, c) => { const k = byId(g, c.id); if (check(rng, g.player.stats.cha + k.affection, 70)) { like(k, 3); return `"한 해만 더 있어 다오." ${k.name}은(는) 한참 말이 없다가 고개를 끄덕였다.`; } like(k, -12); k.place = 'harfen'; stress(g, 10); return `${k.name}은(는) 대답하지 않았다. 사흘 뒤, 빈 침상만 남아 있었다.`; } },
      { label: '"네 일은 네가 정해라."', run: (g, rng, c) => { const k = byId(g, c.id); like(k, 8); gainStat(g, 'wil', 0.4); return `${k.name}이(가) 놀란 얼굴로 쳐다보았다. 허락을 구하러 온 게 아니었다는 걸 알고 있었다. 그래도 그 말을 듣고 싶었던 것 같다.`; } },
    ],
  },
  {
    id: 'later_grandchild', cooldown: 24,
    cond: (g) => free(g) && grandkids(g).some((x) => x.ageMonths < 24),
    chance: () => 0.25, weight: 70,
    prepare: (g) => { const x = grandkids(g).find((y) => y.ageMonths < 24); return { id: x.id }; },
    title: '손주',
    text: (g, c) => { const x = byId(g, c.id); return `품에 안긴 ${x.name}이(가) 수염을, 아니면 머리칼을 움켜쥐고 놓지 않는다. 손가락이 이렇게 작았던가. 내 아이들이 이만할 때는 먹고사느라 제대로 본 적이 없었다.`; },
    choices: [
      { label: '오래 안고 있는다', run: (g, rng, c) => { stress(g, -15); like(byId(g, c.id), 10); return '해가 질 때까지 안고 있었다. 팔이 저렸지만 내려놓고 싶지 않았다.'; } },
      { label: '집안 이야기를 들려준다', run: (g, rng, c) => { const x = byId(g, c.id); like(x, 8); setFlag(g, 'told_family_story', true); gainStat(g, 'cha', 0.3); return `알아듣지도 못할 아이에게 우리 집안 이야기를 했다. 할아버지의 할아버지가 어디서 왔는지부터. ${x.name}은(는) 중간에 잠들었다.`; } },
    ],
  },
  {
    id: 'later_old_friend_dies', cooldown: 36,
    cond: (g) => free(g) && bage(g) >= 45 && oldFriends(g).some((p) => p.ageMonths >= 55 * 12),
    chance: () => 0.04, weight: 55,
    prepare: (g, rng) => ({ id: rng.pick(oldFriends(g).filter((p) => p.ageMonths >= 55 * 12)).id }),
    title: '오랜 벗',
    text: (g, c) => { const p = byId(g, c.id); return `${p.name}이(가) 몸져누웠다는 소식이 왔다. 찾아가니 앙상한 손이 이불 밖으로 나와 있었다. "왔냐." 목소리만은 그대로였다.`; },
    choices: [
      { label: '옛날 이야기를 한다', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 10); stress(g, -4); note(g, p, '죽기 전 오랜 벗과 옛 이야기를 나눴다.'); return `젊을 때 저지른 일들을 하나씩 꺼냈다. ${p.name}은(는) 웃다가 기침을 했고, 기침을 하다 또 웃었다. 그것이 마지막 웃음이었는지는 나중에야 알았다.`; } },
      { label: '못다 한 말을 한다', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 15); gainStat(g, 'wil', 0.5); return `오래 묵혀 둔 말을 했다. ${p.name}은(는) 눈을 감고 들었다. "알고 있었다." 그게 대답이었다.`; } },
      { label: '약값을 대 준다', show: (g) => money(g) >= 20, run: (g, rng, c) => { const p = byId(g, c.id); spend(g, 20); like(p, 12); if (rng.chance(0.4)) return `왕도에서 온 약은 비쌌다. ${p.name}은(는) 그해 겨울을 넘겼다. 봄볕 아래 둘이 앉아 있을 수 있었다.`; return `약은 비쌌고, 듣지 않았다. ${p.name}의 가족이 고개를 숙여 고마워했다. 그래도 아깝지 않았다.`; } },
    ],
  },
  {
    id: 'later_apprentice_offer', cooldown: 60,
    cond: (g) => free(g) && bage(g) >= 40 && Object.values(g.player.skills).some((v) => v >= 55),
    chance: () => 0.04, weight: 45,
    prepare: (g) => { const [k] = Object.entries(g.player.skills).sort((a, b) => b[1] - a[1])[0]; return { skill: k }; },
    title: '가르쳐 달라는 젊은이',
    text: (g, c) => `낯선 젊은이가 문 앞에 무릎을 꿇었다. "${{ sword: '검을', magic: '마법을', farming: '농사를', cooking: '요리를', herbs: '약초를', smithing: '쇠 다루는 법을', trade: '장사를', letters: '글을' }[c.skill] ?? '솜씨를'} 배우고 싶습니다. 이 고장에서 당신만 한 사람은 없다고 들었습니다." 젊을 때의 나를 보는 것 같다.`,
    choices: [
      { label: '받아들인다', run: (g, rng, c) => { gainSkill(g, c.skill, 1.5, 'cha'); gainStat(g, 'cha', 0.6); tire(g, 10); setFlag(g, 'had_student', (flag(g, 'had_student') ?? 0) + 1); chron(g, `${g.player.name}, 제자를 들이다.`, 40); return '가르치다 보니 내가 왜 그렇게 하는지 처음으로 말로 해야 했다. 몸이 알던 것을 입으로 꺼내니, 나도 다시 배우는 것 같았다.'; } },
      { label: '돌려보낸다', run: () => '"나는 가르칠 줄 모른다." 젊은이는 사흘을 문 앞에 서 있다가 떠났다.' },
      { label: '시험을 낸다', run: (g, rng) => { if (rng.chance(0.5)) { gainStat(g, 'int', 0.4); return '어려운 시험을 냈다. 젊은이는 해냈다. 할 수 없이 받아들였다. 사실은 그러고 싶었다.'; } return '어려운 시험을 냈다. 젊은이는 해내지 못하고 고개를 숙인 채 돌아갔다. 내 젊을 때라면 해냈을까.'; } },
    ],
  },
  {
    id: 'later_spouse_evening', cooldown: 36,
    cond: (g) => free(g) && bage(g) >= 45 && !!spouse(g),
    chance: () => 0.05, weight: 50,
    title: '저녁 툇마루',
    text: (g) => `${spouse(g).name}과(와) 나란히 앉아 해 지는 것을 보았다. 젊을 때는 이렇게 가만히 앉아 있던 적이 없었다. "우리 꽤 오래 살았네." ${spouse(g).name}이(가) 말했다.`,
    choices: [
      { label: '손을 잡는다', run: (g) => { like(spouse(g), 10); stress(g, -10); return '주름진 손이 따뜻했다. 아무 말도 하지 않았다. 할 필요가 없었다.'; } },
      { label: '싸웠던 날들을 꺼낸다', run: (g) => { like(spouse(g), 5); stress(g, -6); return '그때는 왜 그렇게 화가 났는지 둘 다 기억나지 않았다. 한참을 웃었다.'; } },
      { label: '"고마웠다."', run: (g) => { like(spouse(g), 14); gainStat(g, 'cha', 0.3); return `처음 하는 말이었다. ${spouse(g)?.name ?? '그 사람'}은(는) 대답 대신 어깨에 머리를 기댔다.`; } },
    ],
  },
  {
    id: 'later_will', once: true,
    cond: (g) => free(g) && bage(g) >= 55 && kids(g).length >= 1,
    chance: () => 0.06, weight: 60,
    title: '유언장',
    text: (g) => `사제가 말했다. "나이가 드시면 남은 것을 정리해 두는 게 좋습니다. 싸우지 않게요." 자식이 ${kids(g).length}명이다. 가진 것은 은화 ${money(g)}닢과 이것저것.`,
    choices: [
      { label: '맏이에게 대부분을', run: (g) => { setFlag(g, 'will', 'eldest'); return '맏이에게 집과 대부분을 남긴다고 적었다. 옛날부터 그랬다. 다른 아이들의 얼굴이 굳는 것이 보였다.'; } },
      { label: '똑같이 나눈다', run: (g) => { setFlag(g, 'will', 'equal'); gainStat(g, 'wil', 0.3); return '똑같이 나눈다고 적었다. 쪼개진 땅은 작아지겠지만, 형제끼리 원수가 되는 것보다는 낫다.'; } },
      { label: '가장 잘 꾸릴 아이에게', run: (g) => { setFlag(g, 'will', 'ablest'); return '가장 잘 꾸려 갈 아이에게 남긴다고 적었다. 누구인지는 적지 않았다. 아직 지켜볼 생각이다.'; } },
      { label: '아직 이르다', run: () => '사제를 돌려보냈다. 아직 죽을 생각은 없다.' },
    ],
  },
  {
    id: 'later_fading_eyes', once: true,
    cond: (g) => free(g) && bage(g) >= 52,
    chance: () => 0.05, weight: 45,
    title: '흐려지는 눈',
    text: () => '촛불 아래 글자가 번져 보인다. 바늘귀가 보이지 않는다. 멀리 있는 것은 아직 잘 보이는데, 손에 든 것이 보이지 않는다.',
    choices: [
      { label: '왕도에서 유리 안경을 맞춘다', show: (g) => money(g) >= 30, run: (g) => { spend(g, 30); return '은화 서른 닢. 코에 걸린 유리알이 무거웠지만, 글자가 다시 또렷해졌다. 세상이 좋아졌다.'; } },
      { label: '젊은 사람에게 읽어 달라고 한다', run: (g) => { gainStat(g, 'sen', -0.5); stress(g, 3); return '이제 편지는 남이 읽어 준다. 불편한 것보다, 남에게 내 편지를 보이는 것이 더 싫었다.'; } },
    ],
  },
  {
    id: 'later_memory_slip', cooldown: 48,
    cond: (g) => free(g) && bage(g) >= 62,
    chance: () => 0.05, weight: 45,
    title: '깜빡',
    text: () => '시장에 무엇을 사러 나왔는지 기억나지 않는다. 길 한가운데 서서 한참을 생각했다. 지나가던 아이가 쳐다본다.',
    choices: [
      { label: '웃어넘긴다', run: (g) => { stress(g, -2); return '그냥 사과 몇 알을 사서 돌아왔다. 집에 오니 생각났다. 소금이었다.'; } },
      { label: '두려워진다', run: (g) => { stress(g, 12); gainStat(g, 'int', -0.4); return '이대로 하나씩 잊어 가는 걸까. 이름을, 얼굴을, 나를. 밤새 잠이 오지 않았다.'; } },
      { label: '적어 두기 시작한다', run: (g) => { gainStat(g, 'wil', 0.4); setFlag(g, 'memoir', true); return '그날부터 공책에 적기 시작했다. 할 일과, 잊고 싶지 않은 것들을. 공책은 금방 두 권이 되었다.'; } },
    ],
  },
  {
    id: 'later_young_rival', cooldown: 60,
    cond: (g) => free(g) && bage(g) >= 45 && !!jobOf(g),
    chance: () => 0.03, weight: 40,
    title: '젊은 경쟁자',
    text: () => '고장에 젊은 사람이 같은 일을 시작했다. 손이 빠르고, 새 방법을 쓰고, 값도 싸다. 손님들이 그쪽으로 기웃거린다.',
    choices: [
      { label: '새 방법을 배운다', run: (g, rng) => { gainStat(g, 'int', 0.6); if (rng.chance(0.6)) return '자존심을 접고 젊은이에게 물었다. 놀랍게도 친절히 가르쳐 주었다. 새 방법은 정말 나았다.'; stress(g, 6); return '배우려 했지만 손이 따라가지 않았다. 늙은 개에게 새 재주는 어렵다는 말이 맞았다.'; } },
      { label: '오래 쌓은 신용으로 버틴다', run: (g) => { gainStat(g, 'cha', 0.4); return '단골들은 떠나지 않았다. "젊은 사람 솜씨도 좋지만, 그래도 당신 것이 낫지." 그 말이 오래 고마웠다.'; } },
      { label: '은퇴를 생각한다', run: (g) => { stress(g, -5); setFlag(g, 'thinking_retire', true); return '이제 물러날 때인가. 처음으로 그렇게 생각했다. 이상하게 마음이 편했다.'; } },
    ],
  },
  {
    id: 'later_return_home', once: true,
    cond: (g) => free(g) && bage(g) >= 50 && here(g) !== 'ern' && (g.life?.home ?? 'ern') !== 'family',
    chance: () => 0.03, weight: 45,
    title: '고향 생각',
    text: () => '밤에 에른 마을 꿈을 꾸었다. 예배당 종소리, 밀밭 냄새, 이제는 없는 사람들. 깨어 보니 베개가 젖어 있었다.',
    choices: [
      { label: '언젠가 돌아가리라 마음먹는다', run: (g) => { setFlag(g, 'longs_home', true); stress(g, -3); return '언젠가는 돌아가자. 아직은 아니지만. 그 생각만으로 하루가 견딜 만했다.'; } },
      { label: '고향에 편지를 쓴다', run: (g) => { stress(g, -6); gainStat(g, 'cha', 0.2); return '누구에게 써야 할지 몰라 예배당 앞으로 썼다. 답장은 오지 않았다. 그래도 썼다는 것으로 충분했다.'; } },
      { label: '고향은 지나간 것이다', run: (g) => { gainStat(g, 'wil', 0.5); return '돌아가도 그때의 마을은 없다. 여기가 이제 내 자리다.'; } },
    ],
  },
  {
    id: 'later_legacy_question', once: true,
    cond: (g) => free(g) && bage(g) >= 58,
    chance: () => 0.04, weight: 50,
    title: '무엇을 남겼나',
    text: (g) => `잠이 오지 않는 밤, 문득 생각했다. 내가 죽으면 무엇이 남을까. ${kids(g).length ? `자식 ${kids(g).length}명.` : '자식은 없다.'} 은화 ${money(g)}닢. 그리고 사람들의 기억 속에 몇 줄.`,
    choices: [
      { label: '자식들이면 충분하다', show: (g) => kids(g).length > 0, run: (g) => { stress(g, -8); return '아이들이 내가 남긴 전부다. 그거면 됐다.'; } },
      { label: '아직 할 일이 있다', run: (g) => { gainStat(g, 'wil', 0.8); stress(g, -2); tire(g, -10); return '아직 끝나지 않았다. 몸이 허락하는 한, 할 수 있는 것을 하자. 다음 날 아침 일찍 일어났다.'; } },
      { label: '예배당에 헌금한다', show: (g) => money(g) >= 30, run: (g) => { spend(g, 30); chron(g, `${g.player.name}, 예배당에 은화 서른 닢을 바치다.`, 40); return '예배당 벽에 내 이름이 새겨졌다. 작은 글씨였다. 그래도 백 년은 남을 것이다.'; } },
      { label: '아무것도 남지 않아도 된다', run: (g) => { gainStat(g, 'int', 0.4); return '강물에 던진 돌처럼, 물결은 곧 사라진다. 그래도 던졌다는 사실은 남는다.'; } },
    ],
  },
);
