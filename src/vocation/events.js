// 일마다의 고유 사건. 일하러 가면 가끔 하나가 뜬다(장면 'voc_event'). 너무 잦지 않게 석 달에 한 번까지.
// 사건 하나: { id, voc, once?, min(솜씨), when(g)?, title, text(g, s), choices(g, s), resolve(g, rng, s, key) }
import { defineScene, queueScene, sceneQueued, L, stress, note, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { reportCrime } from '../crime.js';
import { gainSkill, gainStat } from '../game.js';
import { PLACES } from '../places.js';
import { atWar } from '../world.js';
import { J } from '../narrative/text.js';
import { V, addFame, skillV, takePath, hasPath, mi, pickOf } from './core.js';

export const VOC_EVENTS = [];
const ev = (d) => VOC_EVENTS.push(d);
const here = (g) => PLACES[L(g).place]?.name ?? '이 고장';
const banish = (g, months) => { V(g).banned[L(g).place] = mi(g) + months; };

/* ---------- 의원 ---------- */
ev({
  id: 'noble_child', voc: 'healer', min: 25,
  title: '백작가의 열병',
  text: (g) => `한밤중에 ${here(g)}의 귀족 집 하인이 문을 두드렸다. 어린 후계자가 닷새째 열이 내리지 않는다. 앞서 온 의원 둘은 고개를 저으며 돌아갔다고 한다. "살려 내면 사례는 넉넉히 하겠다고 하십니다." 하인의 목소리가 떨렸다.`,
  choices: () => [{ label: '가방을 챙겨 따라간다', key: 'go' }, { label: '내 손에 넘치는 일이라며 돌려보낸다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') { addFame(g, 'healer', -1); return '하인은 아무 말 없이 돌아섰다. 사흘 뒤 그 집 대문에 검은 천이 걸렸다는 말을 들었다. 내가 갔어도 달라지지 않았을 것이다. 그렇게 믿기로 했다.'; }
    const ok = check(rng, skillV(g, 'healing') + g.player.stats.int / 4, 55);
    if (ok) {
      const pay = rng.int(35, 60);
      g.player.money += pay; addFame(g, 'healer', 7); L(g).renown += 2; V(g).patients += 1;
      note(g, `${here(g)} 귀족가의 어린 후계자를 열병에서 살려 냈다.`);
      return `사흘 밤을 아이 곁에서 보냈다. 나흘째 새벽, 아이가 물을 찾았다. 백작 부인이 내 손을 잡고 오래 놓지 않았다. 은화 ${pay}닢을 받았다. 그 뒤로 귀족 집 마차가 내 문 앞에 서는 일이 잦아졌다.`;
    }
    stress(g, 18); addFame(g, 'healer', -6);
    if (rng.chance(0.4)) { banish(g, 12); return '할 수 있는 것은 다 했다. 아이는 엿새째 밤에 숨을 거두었다. 백작은 나를 탓했다. 한 해 동안 이 고장에서 의원 일을 하지 말라는 말이 돌았다. 아무도 나를 부르지 않을 것이다.'; }
    return '할 수 있는 것은 다 했다. 아이는 엿새째 밤에 숨을 거두었다. 아무도 나를 탓하지 않았다. 그래서 더 무거웠다.';
  },
});
ev({
  id: 'poison_request', voc: 'healer', min: 20,
  title: '흔적 없는 약',
  text: () => '문을 닫을 무렵, 두건을 깊이 쓴 여자가 들어왔다. 탁자 위에 은화 주머니를 올려놓았다. "남편이 오래 앓았으면 해요. 아주 천천히. 아무도 모르게." 주머니는 묵직했다.',
  choices: () => [{ label: '말없이 약을 지어 준다', key: 'sell' }, { label: '주머니를 밀어내고 내쫓는다', key: 'no' }, { label: '경비대에 알린다', key: 'report' }],
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'no') return '여자는 주머니를 챙겨 나갔다. 다른 의원을 찾아갈 것이다. 그 남편의 얼굴을 모른다는 것이 다행인지 알 수 없었다.';
    if (key === 'report') { L(g).renown += 1; stress(g, 4); return '경비대장이 고개를 끄덕였다. 여자는 그날 밤 붙잡혔다. 남편은 아내가 끌려가는 것을 보며 내게 침을 뱉었다. 사람 일은 알 수 없다.'; }
    const pay = rng.int(50, 80);
    g.player.money += pay; v.poisoner += 1; stress(g, 6);
    let t = `은화 ${pay}닢을 받았다. 약은 쓴맛이 나지 않게 꿀에 개었다. 그 집 굴뚝에서 연기가 오르는 동안은 아무 일도 없을 것이다.`;
    if (v.poisoner >= 2 && !hasPath(g, 'shadow_physician')) { takePath(g, 'shadow_physician', null, 0); t += ' 그 뒤로 밤늦게 문을 두드리는 손님이 늘었다. 그들은 병을 고치러 오지 않았다. 이제 나는 그런 의원이다.'; }
    if (rng.chance(0.15)) { reportCrime(g, 'attempt', L(g).place); t += ' 몇 달 뒤, 그 남편이 죽기 전에 의원의 이름을 댔다는 소문이 돌았다.'; }
    return t;
  },
});
ev({
  id: 'deserter', voc: 'healer', min: 10,
  title: '피 묻은 탈영병',
  text: () => '새벽에 젊은 사내가 문간에 쓰러졌다. 군복에서 휘장을 뜯어낸 자국이 있다. 옆구리에 창에 찔린 상처가 벌어져 있었다. "제발… 성문 쪽엔 알리지 마십시오."',
  choices: () => [{ label: '고쳐 주고 다락에 숨긴다', key: 'hide' }, { label: '고쳐 주고 날이 밝기 전에 보낸다', key: 'send' }, { label: '경비대에 넘긴다', key: 'turn' }],
  resolve(g, rng, s, key) {
    gainSkill(g, 'healing', 0.8, 'int');
    if (key === 'turn') { g.player.money += 10; stress(g, 8); return '경비대가 사내를 끌고 갔다. 포상금으로 은화 10닢을 받았다. 탈영병은 목을 맨다. 그 은화로 술을 샀다.'; }
    V(g).patients += 1;
    if (key === 'send') return '상처를 꿰매고 붕대를 감았다. 사내는 날이 밝기 전에 사라졌다. 문간에 낡은 단검 하나가 놓여 있었다. 그가 가진 전부였을 것이다.';
    if (rng.chance(0.25)) { stress(g, 10); g.player.money = Math.max(0, g.player.money - 20); return '사흘째 되는 날 병사들이 집을 뒤졌다. 사내는 지붕을 타고 달아났다. 나는 벌금으로 은화 20닢을 냈다. 그래도 그가 잡히지 않은 것이 기뻤다.'; }
    addFame(g, 'healer', 2); return '열흘을 다락에 숨겼다. 상처가 아물자 사내는 남쪽으로 떠났다. 몇 해 뒤 낯선 상인이 그가 보냈다며 말린 무화과 한 상자를 두고 갔다.';
  },
});
ev({
  id: 'quack', voc: 'healer', min: 15,
  title: '기적의 물약',
  text: (g) => `${here(g)} 장터에 떠돌이가 좌판을 폈다. "잿빛 열병도, 늙음도, 상사병도 이 한 병이면 낫습니다!" 사람들이 줄을 섰다. 병 속 물은 강물 빛이다. 내 환자 몇도 그 줄에 서 있었다.`,
  choices: () => [{ label: '사람들 앞에서 물약을 맛보고 거짓을 밝힌다', key: 'expose' }, { label: '내 일이 아니다', key: 'leave' }, { label: '떠돌이와 이문을 나눈다', key: 'join' }],
  resolve(g, rng, s, key) {
    if (key === 'leave') return '줄은 해가 질 때까지 줄지 않았다. 한 달 뒤, 그 물약을 믿고 약을 끊은 노인 하나가 내 문을 두드렸다. 너무 늦었다.';
    if (key === 'join') { const pay = rng.int(20, 40); g.player.money += pay; addFame(g, 'healer', -5); stress(g, 4); return `"의원님도 보증하신 물약입니다!" 떠돌이가 외쳤다. 은화 ${pay}닢을 받았다. 단골 몇이 다시는 오지 않았다.`; }
    if (check(rng, skillV(g, 'healing') + g.player.stats.cha / 3, 40)) { addFame(g, 'healer', 5); return '한 모금 마시고 말했다. "강물에 감초를 탄 것이오." 몇이 웃었고 몇은 화를 냈다. 떠돌이는 그날 밤 좌판을 접고 사라졌다. 내 이름이 장터에 돌았다.'; }
    addFame(g, 'healer', -2); stress(g, 6); return '거짓을 밝히려 했지만 말이 꼬였다. 떠돌이는 "질투하는 의원"이라며 나를 가리켰다. 사람들이 웃었다.';
  },
});

/* ---------- 음유시인 ---------- */
ev({
  id: 'satire', voc: 'bard', min: 20,
  title: '영주를 비꼬는 노래',
  text: () => '주점 단골들이 술값을 모아 내밀었다. "그 노래 있잖소. 세금 걷는 살찐 거위 노래. 오늘 밤 한 번만 불러 주시오." 구석 자리에 영주 집사의 하인이 앉아 있다.',
  choices: () => [{ label: '목청껏 부른다', key: 'sing' }, { label: '영주를 칭송하는 노래로 바꿔 부른다', key: 'praise' }, { label: '오늘은 목이 쉬었다며 사양한다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '단골들은 시무룩하게 잔을 비웠다. 하인은 일찍 자리를 떴다.';
    if (key === 'praise') { g.player.money += 6; addFame(g, 'bard', -2); return '"너그러우신 우리 영주님" 노래를 불렀다. 하인이 은화 6닢을 던졌다. 단골들은 등을 돌리고 앉았다.'; }
    addFame(g, 'bard', 8); L(g).renown += 1;
    if (rng.chance(0.4)) { banish(g, 12); stress(g, 10); return '주점이 떠나갈 듯 후렴이 터졌다. 이튿날 경비병 둘이 와서 내 류트 줄을 끊었다. 한 해 동안 이 고장 주점에서 노래하지 말라는 영주의 명이다. 그 노래는 그 뒤로 더 많이 불렸다.'; }
    return '주점이 떠나갈 듯 후렴이 터졌다. 하인도 몰래 발을 굴렀다. 사흘 만에 그 노래를 모르는 사람이 없었다.';
  },
});
ev({
  id: 'song_contest', voc: 'bard', min: 15,
  title: '노래 겨루기',
  text: (g) => `${here(g)}에 이름난 떠돌이 시인이 들어왔다. 그는 주점 한가운데서 나를 가리켰다. "이 고장 노래꾼이 당신이오? 한 곡씩 주고받읍시다. 진 쪽이 이 고장을 떠나는 걸로."`,
  choices: () => [{ label: '받아들인다', key: 'yes' }, { label: '웃으며 술을 한 잔 산다', key: 'drink' }],
  resolve(g, rng, s, key) {
    if (key === 'drink') { g.player.money = Math.max(0, g.player.money - 2); gainSkill(g, 'music', 0.6, 'cha'); return '그는 겨루기 대신 술을 받았다. 새벽까지 서로의 노래를 가르쳐 주었다. 그는 다음 날 떠났고, 나는 노래 세 곡을 얻었다.'; }
    if (check(rng, skillV(g, 'music') + g.player.stats.cha / 3, 50)) { const pay = rng.int(10, 25); g.player.money += pay; addFame(g, 'bard', 7); return `내 마지막 곡이 끝났을 때 그는 류트를 내려놓았다. "졌소." 그는 약속대로 다음 날 떠났다. 주점 주인이 은화 ${pay}닢을 쥐여 주었다.`; }
    addFame(g, 'bard', -4); stress(g, 10); return '그의 노래가 끝나자 주점이 조용했다. 내 노래가 끝나자 누군가 기침을 했다. 떠나지는 않았다. 하지만 한동안 그 주점에 가지 않았다.';
  },
});
ev({
  id: 'tavern_brawl', voc: 'bard', min: 0,
  title: '노래가 부른 싸움',
  text: () => '북쪽 용병들 앞에서 남쪽 전쟁의 노래를 불렀다. 그쪽이 진 전쟁이었다. 의자가 넘어졌다.',
  choices: () => [{ label: '류트를 내려놓고 주먹을 쥔다', key: 'fight' }, { label: '노래를 바꿔 그들 고향 노래를 부른다', key: 'calm' }],
  resolve(g, rng, s, key) {
    if (key === 'calm') {
      if (check(rng, skillV(g, 'music') + g.player.stats.cha / 2, 45)) { addFame(g, 'bard', 3); return '첫 소절에 덩치 큰 용병이 멈췄다. 둘째 소절에서 그는 의자를 바로 세웠다. 셋째 소절에서 그는 울었다.'; }
      stress(g, 6); g.player.injuries.push({ name: '술잔에 맞은 이마', months: 1 }); return '노래는 시작도 못 했다. 날아온 술잔이 이마를 갈랐다.';
    }
    queueFight(g, rng, { title: '주점 싸움', intro: '탁자가 엎어지고 술잔이 날았다.', enc: { unit: 'thug', count: rng.int(2, 3), leader: null }, reward: { money: 2 }, avoidLabel: '뒷문으로 빠져나간다', avoidText: '류트만 겨우 챙겨 뒷문으로 나왔다.' }, { first: true });
    return '용병 셋이 일어섰다.';
  },
});
ev({
  id: 'old_song', voc: 'bard', min: 10, once: true,
  title: '잊힌 노래',
  text: () => '산골 여관의 노파가 화롯가에서 웅얼거리듯 노래했다. 처음 듣는 가락이다. 용사가 봉인을 걸던 해에 불렸다는 노래라고 했다. "내가 죽으면 이 노래도 죽지."',
  choices: () => [{ label: '밤새 받아 적는다', key: 'learn' }, { label: '듣기만 한다', key: 'listen' }],
  resolve(g, rng, s, key) {
    if (key === 'listen') { stress(g, -6); return '노래는 길었다. 끝까지 들었다. 다음 날 아침 노파는 일어나지 않았다. 노래는 이제 내 머릿속에만 조금 남았다.'; }
    gainSkill(g, 'music', 3, 'cha'); gainSkill(g, 'letters', 1, 'int'); addFame(g, 'bard', 4);
    note(g, '산골 노파에게서 용사 시대의 잊힌 노래를 받아 적었다.');
    return '가락을 몇 번이고 되물었다. 새벽녘에 마지막 절을 적었다. 노파는 그 다음 겨울에 죽었다. 노래는 살아남았다.';
  },
});

/* ---------- 선생·학자 ---------- */
ev({
  id: 'gifted_student', voc: 'teacher', min: 25, once: true, when: (g) => L(g).job?.id === 'tutor',
  title: '맨 뒷줄의 아이',
  text: () => '방앗간 막내가 창밖에서 수업을 엿듣고 있었다. 학비를 낼 형편이 아니다. 불러서 석판을 주었더니, 지난 한 달 동안 가르친 것을 모두 써 냈다.',
  choices: () => [{ label: '학비 없이 가르친다', key: 'free' }, { label: '학비를 내야 들어올 수 있다고 말한다', key: 'pay' }],
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'pay') return '아이는 고개를 숙이고 돌아갔다. 한동안 창밖에 그림자가 어른거리다 사라졌다.';
    v.students += 1; v.gifted = { year: g.date.year, name: pickOf(rng, ['마티아스', '안셀름', '헬레나', '루카스', '이다', '코넬리아']) };
    stress(g, -5); addFame(g, 'teacher', 2);
    return `${J(v.gifted.name, '은/는')} 누구보다 일찍 와서 누구보다 늦게 갔다. 언젠가 이 아이가 나보다 멀리 갈 것이다.`;
  },
});
ev({
  id: 'noble_heir', voc: 'teacher', min: 30,
  title: '남작가의 도련님',
  text: () => '남작가에서 글선생을 찾는다. 열네 살 도련님은 앞선 선생 셋을 쫓아냈다. 첫날 그는 내 책을 창밖으로 던졌다.',
  choices: () => [{ label: '책을 주워 와 처음부터 다시 시작한다', key: 'firm' }, { label: '비위를 맞추며 쉬엄쉬엄 가르친다', key: 'soft' }],
  resolve(g, rng, s, key) {
    if (key === 'soft') { g.player.money += 25; return '도련님은 배운 것이 없었지만 남작은 만족했다. 은화 25닢을 받았다. 다음 선생이 고생할 것이다.'; }
    if (check(rng, skillV(g, 'letters') + g.player.stats.wil / 3, 50)) { g.player.money += 40; addFame(g, 'teacher', 6); L(g).renown += 1; return '석 달 동안 책은 열한 번 창밖으로 날아갔다. 열두 번째에 도련님이 직접 주워 왔다. 남작은 은화 40닢과 함께 친구 귀족들에게 내 이름을 돌렸다.'; }
    stress(g, 8); return '두 달을 버텼다. 도련님이 내 의자에 풀을 발라 둔 날, 남작은 나를 내보냈다.';
  },
});
ev({
  id: 'forbidden_text', voc: 'teacher', min: 40, once: true, when: (g) => L(g).job?.id === 'scholar',
  title: '봉인된 서가',
  text: () => '서고 맨 안쪽, 쇠사슬로 묶인 상자에서 양피지 묶음이 나왔다. 마신 봉인의 술식을 적은 것처럼 보인다. 교단은 이런 글을 불태운다.',
  choices: () => [{ label: '몰래 베껴 둔다', key: 'copy' }, { label: '교단에 넘긴다', key: 'hand' }, { label: '도로 넣고 잊는다', key: 'forget' }],
  resolve(g, rng, s, key) {
    if (key === 'forget') return '상자를 다시 묶었다. 사슬이 생각보다 새것이었다. 누군가 최근에 이 상자를 열었다.';
    if (key === 'hand') { g.player.money += 20; L(g).renown += 1; return '교단 심문관이 상자를 가져갔다. 은화 20닢과 축복을 받았다. 그 양피지가 불태워졌는지는 모른다.'; }
    gainSkill(g, 'letters', 2.5, 'int'); gainStat(g, 'int', 1); gainSkill(g, 'magic', 1, 'int'); g.flags.forbidden_scroll = true;
    if (rng.chance(0.2)) { stress(g, 14); return '석 달에 걸쳐 베꼈다. 밤마다 같은 꿈을 꾸었다. 검은 바다 밑에서 누군가 이름을 부르는 꿈이었다.'; }
    return '석 달에 걸쳐 베꼈다. 반은 알아볼 수 없었다. 나머지 반만으로도 지금까지 배운 마법의 이치가 달리 보였다.';
  },
});
ev({
  id: 'stolen_work', voc: 'teacher', min: 35, when: (g) => L(g).job?.id === 'scholar',
  title: '빼앗긴 주석',
  text: () => '내가 두 해 동안 쓴 연대기 주석이 학당장 이름으로 왕에게 올라갔다. 그는 복도에서 나를 보고 웃었다. "자네 덕분일세."',
  choices: () => [{ label: '학자들 앞에서 공개 논쟁을 청한다', key: 'fight' }, { label: '참는다', key: 'bear' }],
  resolve(g, rng, s, key) {
    if (key === 'bear') { g.player.money += 20; stress(g, 10); return '학당장은 은화 20닢을 내밀었다. 받았다. 받지 않았어도 달라질 것은 없었다.'; }
    if (check(rng, skillV(g, 'letters') + g.player.stats.cha / 4, 60)) { addFame(g, 'teacher', 9); L(g).renown += 2; return '나는 주석의 셋째 장을 외워서 읊었다. 학당장은 첫 줄도 몰랐다. 그날 이후 복도에서 나를 보면 사람들이 길을 비켰다.'; }
    addFame(g, 'teacher', -5); stress(g, 14); return '논쟁은 말솜씨의 싸움이었다. 학당장이 이겼다. 나는 "남의 공을 탐내는 자"가 되었다.';
  },
});

/* ---------- 연금술 ---------- */
ev({
  id: 'lead_to_gold', voc: 'alchemy', min: 15,
  title: '납을 금으로',
  text: () => '빚에 쫓기는 기사가 공방을 찾았다. 납 한 자루를 내려놓았다. "금으로 바꿔 주시오. 반은 당신 몫이오." 그의 눈이 절박했다.',
  choices: () => [{ label: '그런 술법은 없다고 솔직히 말한다', key: 'honest' }, { label: '실험 비용을 받고 시간을 끈다', key: 'con' }],
  resolve(g, rng, s, key) {
    if (key === 'honest') { addFame(g, 'alchemy', 1); return '기사는 한참을 말없이 앉아 있다가 납 자루를 두고 나갔다. 그 납으로 문진을 만들었다.'; }
    const pay = rng.int(50, 90); g.player.money += pay; addFame(g, 'alchemy', -3); stress(g, 5);
    if (rng.chance(0.35)) { reportCrime(g, 'fraud', L(g).place); return `은화 ${pay}닢을 받았다. 석 달 뒤 기사가 경비대를 데리고 왔다. 공방 뒷문으로 빠져나왔다. 그 돈은 오래가지 않을 것이다.`; }
    return `은화 ${pay}닢을 받았다. 반년 동안 "거의 다 됐다"는 말을 했다. 기사는 결국 전쟁터로 떠났고 돌아오지 않았다.`;
  },
});
ev({
  id: 'scentless_poison', voc: 'alchemy', min: 30,
  title: '냄새 없는 물',
  text: () => '비단옷 입은 사내가 공방 문을 잠갔다. "냄새도 맛도 없는 것. 포도주에 섞으면 잠들듯이." 그는 귀족 문장이 새겨진 반지를 만지작거렸다. 은화 백 닢을 부르겠다고 했다.',
  choices: () => [{ label: '만들어 준다', key: 'make' }, { label: '거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') { if (rng.chance(0.3)) { stress(g, 8); return '사내는 웃으며 문을 열었다. "오늘 일은 없었던 것이오." 사흘 뒤 공방 창문이 깨져 있었다. 경고였다.'; } return '사내는 어깨를 으쓱하고 나갔다. 다른 공방은 거절하지 않을 것이다.'; }
    g.player.money += 100; V(g).poisoner += 1; stress(g, 8);
    let t = '은화 백 닢을 받았다. 한 달 뒤, 궁정의 늙은 재무관이 잠들듯이 죽었다는 소식이 들렸다.';
    if (rng.chance(0.2)) { reportCrime(g, 'murder', L(g).place, { mult: 0.5 }); t += ' 그리고 재무관의 아들이 독을 판 사람을 찾는다는 말도 들렸다.'; }
    return t;
  },
});
ev({
  id: 'tower_inspect', voc: 'alchemy', min: 10,
  title: '마탑의 감찰',
  text: () => '마탑 감찰관 둘이 공방에 들이닥쳤다. 허가받지 않은 마석 술식을 쓰는 공방을 닫는다고 했다. 선반의 병들을 하나하나 들어 보았다.',
  choices: () => [{ label: '은화 스무 닢을 슬쩍 쥐여 준다', key: 'bribe' }, { label: '내 술식을 눈앞에서 보여 준다', key: 'show' }],
  resolve(g, rng, s, key) {
    if (key === 'bribe') { g.player.money = Math.max(0, g.player.money - 20); return '감찰관은 은화를 소매에 넣고 장부에 "이상 없음"이라고 적었다.'; }
    if (check(rng, skillV(g, 'alchemy') + g.player.stats.int / 4, 45)) { addFame(g, 'alchemy', 5); gainSkill(g, 'alchemy', 1, 'int'); return '내 증류법을 본 젊은 감찰관이 질문을 멈추지 못했다. 그들은 허가증 대신 마탑 공방의 견학 초대장을 두고 갔다.'; }
    g.player.money = Math.max(0, g.player.money - 30); stress(g, 8); return '손이 떨려 반응이 어긋났다. 벌금 은화 30닢. 공방 문에 한 달짜리 봉인이 붙었다.';
  },
});
ev({
  id: 'strange_light', voc: 'alchemy', min: 35, once: true,
  title: '이상한 빛',
  text: () => '해열제 찌꺼기에 마석 가루가 섞였다. 플라스크 바닥에서 은빛 결정이 자라났다. 손을 대자 따뜻했다. 어떤 책에도 없는 반응이다.',
  choices: () => [{ label: '며칠 밤을 새워 파고든다', key: 'dig' }, { label: '위험하다. 묻어 버린다', key: 'bury' }],
  resolve(g, rng, s, key) {
    if (key === 'bury') return '결정을 깨뜨려 뒤뜰에 묻었다. 이듬해 그 자리에 풀이 나지 않았다.';
    gainSkill(g, 'alchemy', 3, 'int'); gainStat(g, 'int', 1); addFame(g, 'alchemy', 3);
    if (rng.chance(0.25)) { g.player.injuries.push({ name: '은빛 결정에 덴 손가락', months: 2 }); return '결정은 열흘 만에 터졌다. 손가락 두 개의 감각이 한동안 돌아오지 않았다. 그래도 적어 둔 것은 남았다.'; }
    note(g, '해열제 찌꺼기에서 은빛 결정이 자라는 반응을 찾아냈다.');
    return '열흘 밤을 새웠다. 결정이 자라는 조건을 찾아냈다. 이 반응을 적은 장부는 내 공방에서 가장 귀한 물건이 되었다.';
  },
});

/* ---------- 목수·석공 ---------- */
ev({
  id: 'cut_corners', voc: 'builder', min: 15,
  title: '싸게, 빨리',
  text: () => '공사를 맡긴 상인이 말했다. "기둥 굵기를 반으로 줄이고 회반죽엔 모래를 더 섞게. 어차피 누가 보겠나." 남는 돈의 반을 주겠다고 했다.',
  choices: () => [{ label: '제대로 짓는다', key: 'right' }, { label: '시키는 대로 한다', key: 'cheap' }],
  resolve(g, rng, s, key) {
    if (key === 'right') { addFame(g, 'builder', 3); return '상인은 투덜거리며 값을 깎았다. 그해 겨울 큰 눈에 이웃 창고 둘이 무너졌다. 내가 지은 건물은 멀쩡했다.'; }
    const pay = rng.int(25, 40); g.player.money += pay;
    if (rng.chance(0.3)) { addFame(g, 'builder', -10); stress(g, 20); note(g, '내가 지은 창고가 무너져 사람이 다쳤다.'); return `은화 ${pay}닢을 받았다. 이듬해 봄, 그 창고 지붕이 무너졌다. 일꾼 둘이 깔렸다. 사람들은 상인보다 목수를 먼저 찾았다.`; }
    return `은화 ${pay}닢을 받았다. 지나갈 때마다 그 건물 기둥을 보지 않으려 했다.`;
  },
});
ev({
  id: 'rebuild_poor', voc: 'builder', min: 0, when: (g) => atWar(g) || !!g.crisis?.active || !!g.world?.famine,
  title: '무너진 거리',
  text: () => '난리 끝에 성벽 밑 가난한 동네 집들이 반쯤 무너졌다. 집 잃은 사람들이 천막에서 겨울을 날 판이다. 품삯을 줄 사람은 없다.',
  choices: () => [{ label: '쉬는 날마다 가서 고쳐 준다', key: 'help' }, { label: '품삯 없는 일은 하지 않는다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '그 동네를 지나지 않는 길로 다녔다.';
    addFame(g, 'builder', 5); L(g).renown += 1; stress(g, -4); g.player.fatigue = Math.min(100, g.player.fatigue + 10);
    return '한 달 동안 지붕 일곱 채를 올렸다. 아이들이 나를 "지붕 아저씨"라고 불렀다. 품삯 대신 받은 빵은 딱딱했지만 따뜻했다.';
  },
});
ev({
  id: 'secret_room', voc: 'builder', min: 30,
  title: '벽 속의 방',
  text: () => '귀족 저택의 벽 안쪽에 아무도 모르는 방을 만들어 달라는 일이 들어왔다. 입구는 서재 책장 뒤. 일꾼은 나 혼자, 값은 두 배다.',
  choices: () => [{ label: '말없이 짓는다', key: 'build' }, { label: '짓고 나서 그 비밀을 뒷골목에 판다', key: 'sell' }, { label: '거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '귀족은 다른 목수를 찾았다. 그 목수가 몇 달 뒤 강에서 떠올랐다는 소문은 믿지 않기로 했다.';
    const pay = rng.int(45, 65); g.player.money += pay; gainSkill(g, 'building', 1.5, 'str');
    if (key === 'build') { if (rng.chance(0.15)) { stress(g, 12); return `은화 ${pay}닢을 받았다. 일이 끝난 밤, 누군가 내 뒤를 밟았다. 골목을 세 번 돌아 따돌렸다. 그 저택 근처에는 다시 가지 않았다.`; } return `은화 ${pay}닢을 받았다. 저택 주인은 내 손을 잡고 말했다. "이 방은 세상에 없는 방이오." 고개를 끄덕였다.`; }
    g.player.money += 40; stress(g, 6);
    if (rng.chance(0.3)) reportCrime(g, 'blackmail', L(g).place, { mult: 0.6 });
    return `은화 ${pay}닢을 받고, 뒷골목에서 40닢을 더 받았다. 석 달 뒤 그 저택에 도둑이 들었다는 소식을 들었다.`;
  },
});
ev({
  id: 'guild_dues', voc: 'builder', min: 0,
  title: '장인 조합의 회비',
  text: (g) => `${here(g)} 목수·석공 조합 사람들이 찾아왔다. 조합에 들지 않은 자는 이 고장에서 일감을 받을 수 없다고 했다. 회비는 은화 15닢.`,
  choices: () => [{ label: '회비를 낸다', key: 'pay' }, { label: '내 손으로 번 일감이다. 거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'pay') { g.player.money = Math.max(0, g.player.money - 15); addFame(g, 'builder', 2); return '조합 명부에 이름을 올렸다. 다음 달 조합에서 큰 일감 하나를 넘겨주었다.'; }
    addFame(g, 'builder', -3); stress(g, 6); return '그 뒤로 목재상이 내게만 값을 올렸다. 일하던 지붕에서 사다리가 사라진 날도 있었다.';
  },
});

/* ---------- 사냥 ---------- */
ev({
  id: 'lords_deer', voc: 'hunter', min: 10,
  title: '영주의 숲',
  text: () => '흉년이다. 영주의 금렵 숲 경계 너머에 수사슴 무리가 있다. 마을엔 고기 구경을 못 한 아이들이 있다.',
  choices: () => [{ label: '밤에 몰래 넘어간다', key: 'poach' }, { label: '경계를 넘지 않는다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '토끼 두 마리로 돌아왔다. 아이들은 그것도 고마워했다.';
    if (check(rng, skillV(g, 'hunting') + g.player.stats.agi / 3, 40)) { L(g).renown += 1; stress(g, -4); V(g).pelts += 1; return '새벽 안개 속에서 수사슴 한 마리를 쓰러뜨렸다. 해가 뜨기 전에 고기는 마을 집집마다 나뉘었다. 아무도 어디서 났는지 묻지 않았다.'; }
    g.player.money = Math.max(0, g.player.money - 25); stress(g, 10); return '산지기에게 들켰다. 사슴은 빼앗기고 벌금으로 은화 25닢을 냈다. 손목에 매질 자국이 남았다.';
  },
});
ev({
  id: 'wolf_pack', voc: 'hunter', min: 15,
  title: '양 우리를 노리는 늑대',
  text: () => '산비탈 목장에서 한 달 새 양 열한 마리가 물려 죽었다. 목장 주인이 은화 열 닢을 걸었다. 발자국을 보니 무리가 크다.',
  choices: () => [{ label: '무리를 쫓는다', key: 'hunt' }, { label: '덫과 독미끼만 놓아 준다', key: 'trap' }],
  resolve(g, rng, s, key) {
    if (key === 'trap') { const pay = 4; g.player.money += pay; V(g).pelts += rng.int(0, 1); gainSkill(g, 'hunting', 0.8, 'sen'); return `독미끼에 늑대 두 마리가 쓰러졌다. 나머지는 산 너머로 갔다. 은화 ${pay}닢을 받았다.`; }
    queueFight(g, rng, { title: '늑대 무리', intro: '바위 그늘에서 늑대들이 이를 드러냈다.', enc: { unit: 'wolf', count: rng.int(3, 5), leader: rng.chance(0.3) ? 'dire_wolf' : null }, reward: { money: 10, renown: 1 }, avoidLabel: '물러난다' }, { first: true });
    return '발자국을 따라 산으로 들어갔다.';
  },
});
ev({
  id: 'lost_child', voc: 'hunter', min: 0,
  title: '숲에서 사라진 아이',
  text: () => '나무꾼의 딸이 어제 숲에 들어가 돌아오지 않았다. 마을 사람들이 횃불을 들었지만 숲을 아는 사람은 나뿐이다.',
  choices: () => [{ label: '발자국을 쫓는다', key: 'track' }, { label: '사람들과 함께 소리쳐 부른다', key: 'call' }],
  resolve(g, rng, s, key) {
    const ok = key === 'track' ? check(rng, skillV(g, 'hunting') + g.player.stats.sen / 2, 35) : rng.chance(0.4);
    if (ok) { L(g).renown += 2; stress(g, -6); note(g, '숲에서 길을 잃은 아이를 찾아 데려왔다.'); return '꺾인 고사리와 작은 신발 자국을 따라갔다. 아이는 쓰러진 고목 밑에서 웅크리고 잠들어 있었다. 나무꾼은 그 뒤로 해마다 장작 한 수레를 내 집 앞에 쌓아 두었다.'; }
    stress(g, 14); return '사흘을 찾았다. 강가에서 작은 신발 한 짝만 찾았다.';
  },
});

/* ---------- 장면 ---------- */
defineScene('voc_event', {
  need: (g, s) => !!VOC_EVENTS.find((e) => e.id === s.ev),
  title: (g, s) => VOC_EVENTS.find((e) => e.id === s.ev).title,
  text: (g, s) => VOC_EVENTS.find((e) => e.id === s.ev).text(g, s),
  choices: (g, s) => VOC_EVENTS.find((e) => e.id === s.ev).choices(g, s),
  resolve(g, rng, s, key) {
    const e = VOC_EVENTS.find((x) => x.id === s.ev);
    if (e.once && !V(g).seen.includes(e.id)) V(g).seen.push(e.id);
    return e.resolve(g, rng, s, key);
  },
});

// 일하러 간 뒤에 부른다. 갈래의 사건 중 지금 맞는 것 하나를 고른다.
export function maybeVocEvent(g, rng, voc, chance = 0.13) {
  const v = V(g);
  if (mi(g) < v.cool || sceneQueued(g, 'voc_event') || sceneQueued(g, 'voc_path')) return false;
  if (!rng.chance(chance)) return false;
  const sk = { healer: 'healing', bard: 'music', teacher: 'letters', alchemy: 'alchemy', builder: 'building', hunter: 'hunting' }[voc];
  const pool = VOC_EVENTS.filter((e) => e.voc === voc && skillV(g, sk) >= e.min && !(e.once && v.seen.includes(e.id)) && (!e.when || e.when(g)));
  if (!pool.length) return false;
  const e = pickOf(rng, pool);
  v.cool = mi(g) + 3;
  queueScene(g, 'voc_event', { ev: e.id });
  return true;
}
