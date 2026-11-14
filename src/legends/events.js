// 큰 인물과 만나고 얽히는 사건: 먼발치에서 보기, 제자가 되기, 적이 되기, 은인을 얻기.
// 모두 드물다. 큰 인물이 그 장소에 와 있을 때, 그리고 플레이어가 그만한 사람이 되었을 때만 뜬다.
import { EVENTS, setFlag, flag, age, check, stat, skill, stress, tire, injure } from '../events/core.js';
import { gainStat, gainSkill, circleOf } from '../game.js';
import { startDuel, registerDuelEnd } from '../duel/duel.js';
import { L } from '../adventure/core.js';
import { fac } from '../factions.js';
import { playerRace } from '../races/index.js';
import { nudge } from '../world.js';
import { H } from '../history/state.js';
import { LG, legend, alive, atHere, roleOf, here, legendName, playerScore } from './state.js';
import { placeName } from './world.js';
import { J } from '../narrative/text.js';

const monthNow = (g) => g.date.year * 12 + g.date.month;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const bond = (g, id, n) => { const x = legend(g, id); if (x) { x.bond = Math.max(-100, Math.min(100, x.bond + n)); x.met = true; } };
const setRole = (g, id, role) => { const x = legend(g, id); if (x) { x.role = role; x.met = true; } };
const swordRank = (g) => g.sword?.rank ?? -1;
const certified = (g) => g.magic?.certified ?? 0;
const free = (g) => !L(g).travel;
const pow = (g, k, n) => { const P = H(g)?.powers; if (P && P[k] != null) P[k] = Math.max(0, Math.min(100, P[k] + n)); };
const say = (g, text) => g.chronicle.push({ y: g.date.year, m: g.date.month, text, rel: 100 });

// ---------- 먼발치에서 ----------
const SIGHT = {
  leon: '광장이 갑자기 조용해졌다. 회색 수염의 사내가 호위도 없이 말에서 내렸다. 허리에 찬 검은 낡았고, 걸음에는 군더더기가 하나도 없었다. 누군가 숨죽여 말했다. "검왕이다."',
  magnus: '탑과 탑 사이 다리를 지팡이 짚은 노인이 건너고 있었다. 뒤따르는 마법사들이 모두 고개를 숙이고 있었다. 노인이 지나간 자리에서 공기가 한동안 떨렸다.',
  cecilia: '흰 망토에 금빛 태양 문장을 단 기사들이 성문으로 들어왔다. 맨 앞의 여기사는 투구를 벗고 있었다. 젊은 얼굴인데 눈만은 늙어 보였다. 성흔대장 세실리아였다.',
  kairen: '길드 문이 열리고 낡은 외투의 사내가 들어왔다. 소란스럽던 술자리가 반쯤 식었다. 사내는 아무도 보지 않고 의뢰판 맨 위 종이만 떼어 갔다. S급 카이렌이었다.',
  garum: '천막 사이로 거대한 그림자가 지나갔다. 줄무늬 털, 찢어진 귀, 사람 둘을 합친 어깨. 시장의 수인들이 하나둘 주먹을 가슴에 댔다. 대족장 가룸이었다.',
  bram: '대장간 골목 끝에서 망치 소리가 하나 멈췄다. 수염을 세 갈래로 땋은 드워프가 화덕 앞에서 일어나 칼날을 빛에 비춰 보았다. 다들 그를 모루왕이라 불렀다.',
};
EVENTS.push({
  id: 'legend_sighting', cooldown: 18, weight: 40,
  cond: (g) => age(g) >= 8 && free(g) && LG(g).list.some((x) => SIGHT[x.id] && !x.seen && atHere(g, x.id)),
  prepare: (g) => ({ id: LG(g).list.find((x) => SIGHT[x.id] && !x.seen && atHere(g, x.id))?.id ?? null }),
  title: '먼발치의 이름',
  text: (g, c) => SIGHT[c.id] ?? '이름난 사람이 지나갔다.',
  choices: [
    { label: '멀리서 지켜본다', run: (g, rng, c) => { const x = legend(g, c.id); if (x) x.seen = true; gainStat(g, 'sen', 0.4); return '오래 지켜보았다. 저런 사람도 밥을 먹고 잠을 자겠지. 그런데도 같은 사람 같지 않았다.'; } },
    {
      label: '다가가 말을 건다',
      run: (g, rng, c) => {
        const x = legend(g, c.id);
        if (!x) return '사람들 틈에 밀려 그 모습을 놓쳤다.';
        x.seen = true;
        if (check(rng, stat(g, 'cha') + (L(g).renown ?? 0) / 4, 55)) { bond(g, x.id, 4); gainStat(g, 'cha', 0.4); return `${J(x.name, '이/가')} 걸음을 멈추고 나를 보았다. 몇 마디 주고받았을 뿐인데 이름을 물었다. 다음에 만나면 기억할까.`; }
        stress(g, 4);
        return '호위가 앞을 막았다. 그 사람은 돌아보지도 않았다. 부끄러움은 한참 뒤에야 왔다.';
      },
    },
  ],
});

// ---------- 검왕 레온: 제자 ----------
EVENTS.push({
  id: 'legend_leon_eye', cooldown: 36, weight: 62,
  cond: (g) => age(g) >= 14 && age(g) <= 45 && atHere(g, 'leon') && !roleOf(g, 'leon') && (swordRank(g) >= 2 || skill(g, 'sword') >= 62)
    && monthNow(g) - (LG(g).leonTry ?? -99) >= 36,
  title: '검왕의 눈',
  text: () => '연무장에서 목검을 휘두르고 있을 때였다. 울타리에 기대 선 노인 하나가 처음부터 끝까지 지켜보았다. 수련이 끝나자 노인이 목검 한 자루를 집어 들었다. "세 합만 받아 봐라. 이기라는 말은 안 하겠다." 사람들이 뒤에서 수군거렸다. 검왕 레온 발하르트였다.',
  choices: [
    {
      label: '목검을 받는다',
      run: (g, rng) => {
        LG(g).leonTry = monthNow(g);
        startDuel(g, rng, { kind: 'legend_leon', title: '검왕의 시험', foe: { name: '레온 발하르트', skill: Math.round(skill(g, 'sword') + 14), style: 'steady', aura: swordRank(g) >= 3 }, ctx: {} });
        return '목검을 쥐자 손바닥에 땀이 뱄다. 노인은 검을 들지도 않은 채 서 있었다. 그런데 어디로 찔러도 막힐 것 같았다.';
      },
    },
    { label: '고개를 숙이고 물러난다', run: (g) => { LG(g).leonTry = monthNow(g); bond(g, 'leon', 1); return '"겸손한 건지 겁이 많은 건지." 노인이 목검을 내려놓았다. "둘 다라면 오래 살겠군."'; } },
  ],
});
registerDuelEnd('legend_leon', (g, rng, won, d) => {
  const lasted = won || (d.round >= 6 && d.hp > d.hp0 * 0.25);
  if (!lasted) { bond(g, 'leon', 2); return '"아직이다. 네 칼은 생각이 너무 많아." 노인은 등을 돌렸다가 한 마디를 보탰다. "삼 년 뒤에 다시 보자. 살아 있다면."'; }
  setRole(g, 'leon', 'master'); bond(g, 'leon', 30); renown(g, 10);
  say(g, `${g.player.name}, 검왕 레온 발하르트의 제자가 되다.`);
  return won
    ? '노인의 목검이 처음으로 뒤로 물러났다. 연무장이 얼어붙었다. 노인이 웃었다. 오래 웃지 않은 사람의 웃음이었다. "이름이 뭐냐. 오늘부터 내 제자다."'
    : '여섯 합째, 목검이 손에서 튕겨 나갔다. 그래도 노인은 고개를 끄덕였다. "버텼군. 대개는 세 합이면 운다." 노인이 이름을 물었다. "오늘부터 내 밑에서 배워라."';
});

// 스승을 넘어서기: 제자가 검왕의 경지에 다다르면
EVENTS.push({
  id: 'legend_leon_last', once: true, weight: 88,
  cond: (g) => roleOf(g, 'leon') === 'master' && alive(g, 'leon') && free(g) && skill(g, 'sword') >= 94 && (legend(g, 'leon')?.age ?? 0) >= 55,
  title: '스승의 마지막 수업',
  text: () => '스승에게서 편지가 왔다. 짧았다. "와라. 진검을 가져와라." 연무장에는 스승 혼자였다. 늙은 손이 검을 뽑았다. 검신이 희미하게 울었다. "나는 검신에 닿지 못했다. 너라면 닿을지도 모르지. 그걸 보고 가고 싶다."',
  choices: [
    { label: '검을 뽑는다', run: (g, rng) => { startDuel(g, rng, { kind: 'legend_leon_last', title: '검왕과의 마지막 대련', foe: { name: '레온 발하르트', skill: 96, style: 'steady', aura: true }, ctx: {} }); return '스승과 나 사이에 바람이 멎었다.'; } },
    { label: '"스승님을 벨 수는 없습니다."', run: (g) => { bond(g, 'leon', 10); return '스승은 한참 나를 보다가 검을 거두었다. "그래서 넌 아직이다." 목소리는 꾸짖는 것 같지 않았다. 오히려 안도하는 것 같았다.'; } },
  ],
});
registerDuelEnd('legend_leon_last', (g, rng, won) => {
  const x = legend(g, 'leon');
  if (!won) { bond(g, 'leon', 5); return '스승의 검끝이 목젖 앞에서 멈췄다. "조금만 더." 스승은 그 말만 남기고 검을 거두었다.'; }
  if (x) x.power = Math.max(60, x.power - 10);
  renown(g, 40); LG(g).pbonus += 4; setFlag(g, 'leon_surpassed');
  say(g, `${g.player.name}, 스승 검왕 레온을 넘어서다.`);
  return '스승의 검이 땅에 떨어졌다. 스승은 그것을 줍지 않았다. 대신 내 어깨를 두 번 두드렸다. "됐다. 이제 됐다." 그날 밤 스승은 오래된 술을 땄다. 그 뒤로 다시는 검을 잡지 않았다고 한다.';
});

// ---------- 마그누스: 은인 또는 적 ----------
EVENTS.push({
  id: 'legend_magnus_audience', once: true, weight: 70,
  cond: (g) => atHere(g, 'magnus') && (certified(g) >= 4 || circleOf(g) >= 4) && age(g) >= 18,
  title: '협회장의 방',
  text: () => '일곱째 탑 꼭대기, 책이 천장까지 쌓인 방이었다. 협회장 마그누스는 창가에서 등을 돌린 채 말했다. "4서클이 한 해에 몇이나 나오는지 아나? 둘이네. 올해는 자네까지 셋이지." 노인이 돌아섰다. 눈동자가 이상하게 맑았다. "협회는 자네 같은 사람을 그냥 두지 않네. 좋은 뜻으로든, 나쁜 뜻으로든."',
  choices: [
    { label: '협회의 후원을 받는다', run: (g) => { setRole(g, 'magnus', 'patron'); bond(g, 'magnus', 20); g.player.money += 40; gainSkill(g, 'magic', 2, 'int'); setFlag(g, 'mage_registered'); return '노인이 서랍에서 봉인된 편지를 꺼냈다. "협회의 이름으로 자네를 보증하네. 세레니아의 서고 아랫단까지는 열어 주지." 은화 마흔 닢과 손때 묻은 사본 한 권이 따라왔다.'; } },
    {
      label: '"금기 서고는 누가 지킵니까?"',
      run: (g, rng) => {
        if (!check(rng, stat(g, 'int') + skill(g, 'magic') / 2, 70)) { bond(g, 'magnus', -5); return '노인의 눈이 가늘어졌다. "그런 건 묻는 게 아니네." 방 안 공기가 갑자기 무거워졌다. 문을 나설 때까지 등이 서늘했다.'; }
        setFlag(g, 'magnus_secret'); bond(g, 'magnus', 5);
        return '노인은 대답 대신 웃었다. 그리고 책장 하나를 밀었다. 그 뒤로 내려가는 계단이 있었다. "자네는 이미 알고 있군. 그렇다면 고르게. 아는 걸 어디에 쓸지."';
      },
    },
    { label: '정중히 물러난다', run: (g) => { bond(g, 'magnus', 3); return '"현명하군. 아니면 아직 젊거나." 노인은 다시 창밖을 보았다.'; } },
  ],
});
EVENTS.push({
  id: 'legend_magnus_secret', once: true, weight: 75,
  cond: (g) => flag(g, 'magnus_secret') && alive(g, 'magnus') && free(g) && ['serenia', 'leocast', 'solaris'].includes(here(g)),
  title: '아는 것의 값',
  text: () => '계단 아래에는 금기 파벌의 서고가 있었다. 시공 마법, 영혼 결속, 마족의 술식. 성광교가 알면 세레니아는 불타고, 협회장은 화형대에 선다. 성흔기사단의 밀정이 은근히 말을 걸어온 것은 그 일 이후였다. "협회장에 대해 아는 게 있다면, 성광의 이름으로 크게 보답하겠소."',
  choices: [
    { label: '성광교에 알린다', run: (g) => { setRole(g, 'magnus', 'foe'); bond(g, 'magnus', -60); bond(g, 'cecilia', 15); g.player.money += 120; renown(g, 15); pow(g, 'church', 6); pow(g, 'mages', -10); say(g, `${g.player.name}, 세레니아 금기 서고의 비밀을 성광교에 넘기다.`); return '은화 백스무 닢. 그리고 성광교 사람들의 미소. 세레니아의 탑 하나가 한 달 동안 닫혔다. 협회장은 살아남았다. 그리고 그는 잊지 않는 사람이었다.'; } },
    { label: '입을 다문다', run: (g) => { setRole(g, 'magnus', 'patron'); bond(g, 'magnus', 25); gainSkill(g, 'magic', 3, 'int'); g.player.mana = (g.player.mana ?? 0) + 4; return '밀정을 빈손으로 돌려보냈다. 며칠 뒤 문 밑으로 쪽지가 들어왔다. 글자는 없고 술식 하나만 그려져 있었다. 마력을 흘려 넣자 머릿속에 시공 마법의 첫 장이 펼쳐졌다. 반도 이해하지 못했다. 그래도 그건 선물이었다.'; } },
  ],
});

// ---------- 세실리아: 추격자 또는 이해하는 사람 ----------
const hunted = (g) => (circleOf(g) >= 3 && certified(g) === 0 && !flag(g, 'mage_registered')) || playerRace(g) === 'beast' || flag(g, 'warned_mage');
EVENTS.push({
  id: 'legend_cecilia_hunt', cooldown: 48, weight: 66,
  cond: (g) => age(g) >= 15 && atHere(g, 'cecilia') && hunted(g) && roleOf(g, 'cecilia') !== 'patron',
  title: '성흔대장',
  text: (g) => `여관 문이 열리고 흰 망토의 기사들이 들어왔다. 맨 앞의 여기사가 곧장 내 탁자로 왔다. "${g.player.name}. 성광의 이름으로 몇 가지 묻겠다." 성흔대장 세실리아였다. 목소리에 분노는 없었다. 그래서 더 무서웠다.`,
  choices: [
    {
      label: '심문에 응한다',
      run: (g, rng) => {
        if (check(rng, stat(g, 'wil') + stat(g, 'cha') / 2, 60)) { bond(g, 'cecilia', 5); return '사흘 동안 같은 질문을 백 번 받았다. 같은 대답을 백 번 했다. 나흘째 아침, 세실리아가 문을 열어 주었다. "거짓말은 하지 않았군. 그것만으로도 드물다."'; }
        g.player.money = Math.max(0, g.player.money - 30); injure(g, '심문실에서 얻은 상처', 2); stress(g, 20);
        return '대답이 꼬였다. 기사들의 손이 거칠어졌다. 풀려났을 때는 벌금 은화 서른 닢과 손목의 자국이 남았다. 세실리아는 마지막까지 한 번도 목소리를 높이지 않았다.';
      },
    },
    {
      label: '창문으로 달아난다',
      run: (g, rng) => {
        if (check(rng, stat(g, 'agi') + stat(g, 'sen') / 2, 72)) { bond(g, 'cecilia', -10); setRole(g, 'cecilia', roleOf(g, 'cecilia') ?? 'foe'); return '지붕을 세 개 넘고 하수로로 뛰어들었다. 뒤에서 아무도 쫓아오지 않았다. 그게 이상했다. 그 여자는 쫓을 필요가 없는 사람처럼 굴었다.'; }
        startDuel(g, rng, { kind: 'legend_cecilia', title: '성흔대장에게 붙잡히다', foe: { name: '세실리아', skill: Math.round(skill(g, 'sword') + 25), style: 'steady', aura: true }, ctx: {} });
        return '창틀을 넘기도 전에 목덜미에 차가운 것이 닿았다. "검을 뽑아라. 등을 보이는 자를 베고 싶지는 않다."';
      },
    },
    {
      label: '"당신도 의식의 아이였지."', show: (g) => flag(g, 'cecilia_secret'),
      run: (g) => { setRole(g, 'cecilia', 'patron'); bond(g, 'cecilia', 30); return '세실리아의 손이 멈췄다. 기사들을 내보내고 한참을 말없이 앉아 있었다. "누구에게 들었는지는 묻지 않겠다." 일어서며 그녀가 말했다. "너는 오늘 여기 없었다. 다음에도 없었으면 한다."'; },
    },
  ],
});
registerDuelEnd('legend_cecilia', (g, rng, won) => {
  if (won) { setRole(g, 'cecilia', 'foe'); bond(g, 'cecilia', -20); renown(g, 20); say(g, `${g.player.name}, 성흔대장 세실리아의 검을 받아 내고 달아나다.`); return '세실리아의 검이 빗나간 틈에 골목으로 굴렀다. 뒤에서 그녀가 처음으로 웃는 소리가 들렸다. "다음엔 빗나가지 않는다."'; }
  g.player.money = Math.max(0, g.player.money - 40); injure(g, '성흔대장의 칼자국', 3);
  return '눈을 떴을 때는 성광교 구빈원 침상이었다. 벌금 은화 마흔 닢은 이미 치러져 있었다. 머리맡에 쪽지 한 장. "두 번은 없다."';
});
// 그녀의 비밀을 알게 되는 길: 성도에서, 용사 의식이 무르익었을 때
EVENTS.push({
  id: 'legend_cecilia_secret', once: true, weight: 50,
  cond: (g) => age(g) >= 15 && here(g) === 'solaris' && free(g) && (g.realm?.heroRite ?? 0) >= 55 && alive(g, 'cecilia'),
  title: '의식의 흉터',
  text: () => '대성당 뒤 빈민 구호소에서 늙은 수녀가 열병에 들떠 중얼거렸다. "그 아이도 의식에 들어갔었지… 금빛 아이들 가운데 혼자 살아 나왔어. 성흔은 상처야. 교황님은 그걸 축복이라 부르셨지만…" 수녀는 성흔대장의 이름을 말했다.',
  choices: [
    { label: '가슴에 묻어 둔다', run: (g) => { setFlag(g, 'cecilia_secret'); gainStat(g, 'int', 0.4); return '수녀의 손을 잡아 주었다. 그 이름은 입 밖에 내지 않았다. 하지만 잊지도 않았다.'; } },
    { label: '못 들은 척한다', run: () => '열병 환자의 헛소리라고 생각하기로 했다. 그게 오래 사는 방법이다.' },
  ],
});

// ---------- 가룸: 동지 또는 적 ----------
EVENTS.push({
  id: 'legend_garum_raid', once: true, weight: 64,
  cond: (g) => age(g) >= 16 && atHere(g, 'garum') && (playerRace(g) === 'beast' || stat(g, 'str') >= 35 || skill(g, 'sword') >= 40),
  title: '대족장의 부탁',
  text: () => '모닥불 앞에서 가룸이 지도를 펼쳤다. 발톱 끝이 성광국 국경의 길 하나를 짚었다. "모레 밤, 이 길로 노예 수레가 지나간다. 우리 아이들이 실려 있다. 인간의 얼굴이 하나 필요하다. 검문소를 지나 수레를 멈출 얼굴이."',
  choices: [
    {
      label: '수레를 멈춘다',
      run: (g, rng) => {
        if (check(rng, stat(g, 'cha') + stat(g, 'agi') / 2 + skill(g, 'sword') / 3, 60)) { setRole(g, 'garum', 'patron'); bond(g, 'garum', 35); nudge(g, 'heroRite', -3); renown(g, 8); say(g, `${g.player.name}, 대족장 가룸과 함께 성광국의 노예 수레를 털다.`); return '검문병에게 가짜 통행증을 내밀었다. 수레가 멈춘 순간 숲이 울부짖었다. 새벽녘, 쇠사슬을 끊은 아이들이 가룸의 품에 안겨 울었다. 가룸이 내 이마에 자기 이마를 댔다. 수인에게 그건 형제의 인사다.'; }
        injure(g, '국경 검문소에서 맞은 화살', 3); bond(g, 'garum', 10);
        return '통행증이 들통났다. 화살이 어깨를 꿰뚫었다. 가룸의 전사들이 나를 끌고 숲으로 물러났다. 수레는 지나갔다. 가룸은 아무 말도 하지 않았다. 원망하는 눈은 아니었다.';
      },
    },
    { label: '내 싸움이 아니다', run: (g) => { bond(g, 'garum', -3); return '"그래. 인간의 싸움은 아니지." 가룸이 지도를 접었다. 모닥불 너머 아이 하나가 나를 오래 쳐다보았다.'; } },
    { label: '성광국에 길을 알린다', run: (g) => { setRole(g, 'garum', 'foe'); bond(g, 'garum', -70); g.player.money += 60; nudge(g, 'heroRite', 2); return '은화 예순 닢. 수레는 다른 길로 갔고, 매복한 수인들 위로 성흔기사단이 쏟아졌다. 가룸은 살아남았다. 털가죽 시장에서 내 얼굴이 그려진 천이 불탔다는 소문을 들었다.'; } },
  ],
});

// ---------- 청동의 용왕: 은인 (세 걸음) ----------
EVENTS.push({
  id: 'legend_dragon_scholar', once: true, weight: 58,
  cond: (g) => age(g) >= 16 && atHere(g, 'bronze') && !LG(g).dragon,
  title: '청동빛 눈의 학자',
  text: () => '항구 서고에서 늙은 학자가 말을 걸었다. 눈동자가 등잔불에 청동빛으로 번졌다. "삼 년 전 천룡 산맥에서 용왕 하나가 죽었소. 상처가 없었지. 독도 아니었소. 그 무렵 산맥을 오간 사람을 찾고 있소. 젊은 다리가 필요하오. 품삯은 섭섭지 않게 주겠소."',
  choices: [
    { label: '맡는다', run: (g) => { LG(g).dragon = { step: 1, at: monthNow(g) + 3 }; bond(g, 'bronze', 5); g.player.money += 15; return '선금으로 은화 열다섯 닢을 받았다. 학자는 사람 셋의 이름을 적어 주었다. "서두르지 마시오. 나는 기다리는 데 익숙하오."'; } },
    { label: '사양한다', run: () => '학자는 고개를 끄덕이고 다시 책으로 눈을 돌렸다. 그 손등에 비늘 같은 무늬가 스친 것은 착각이었을 것이다.' },
  ],
});
EVENTS.push({
  id: 'legend_dragon_clue', once: true, weight: 60,
  cond: (g) => LG(g).dragon?.step === 1 && monthNow(g) >= LG(g).dragon.at && free(g) && ['harfen', 'leocast', 'barka', 'graubel', 'solaris'].includes(here(g)),
  title: '산맥을 오간 사람들',
  text: () => '학자가 적어 준 이름 가운데 둘은 이미 죽었고, 하나는 술독에 빠져 있었다. 술꾼이 말했다. "그 산에 올라간 건 우리만이 아니었소. 금빛 갑옷의 신관들. 성광국 사람들이 뭔가를 담은 상자를 지고 내려왔지."',
  choices: [
    { label: '더 캐묻는다', run: (g, rng) => { const ok = check(rng, stat(g, 'int') + stat(g, 'cha') / 2, 55); LG(g).dragon = { step: 2, at: monthNow(g) + 2, found: ok }; gainStat(g, 'int', 0.5); return ok ? '술값을 세 번 더 치르고 나서야 술꾼이 상자에 새겨진 문양을 그려 주었다. 성광교 대성당의 봉인이었다.' : '술꾼은 그 뒤로 입을 다물었다. 그래도 금빛 갑옷이라는 말은 남았다.'; } },
    { label: '여기서 그만둔다', run: (g) => { LG(g).dragon = { step: 9 }; return '어떤 일은 끝까지 알지 않는 편이 낫다. 학자에게 돌아가지 않았다.'; } },
  ],
});
EVENTS.push({
  id: 'legend_dragon_reveal', once: true, weight: 72,
  cond: (g) => LG(g).dragon?.step === 2 && monthNow(g) >= LG(g).dragon.at && here(g) === 'barka' && free(g) && alive(g, 'bronze'),
  title: '청동의 용왕',
  text: (g) => `학자에게 들은 것을 전했다.${LG(g).dragon?.found ? ' 대성당의 봉인 이야기에서 학자의 손이 멈췄다.' : ''} 등잔불이 흔들리더니 서고 벽에 거대한 날개의 그림자가 드리웠다. 학자는 그대로 앉아 있었다. 그림자만 사람이 아니었다. "고맙소, 인간. 오백 년 만에 처음으로 인간에게 빚을 졌군."`,
  choices: [
    { label: '"무엇을 하실 겁니까?"', run: (g) => { LG(g).dragon = { step: 3 }; setRole(g, 'bronze', 'patron'); bond(g, 'bronze', 40); renown(g, 12); g.player.money += 80; say(g, `${g.player.name}, 청동의 용왕에게 빚을 지우다.`); return '"기다릴 것이오. 용은 기다리는 데 익숙하니." 용왕은 청동빛 비늘 하나를 탁자에 내려놓았다. "이걸 가진 자를 용족은 해치지 않소." 은화 여든 닢이 든 주머니가 그 옆에 놓였다. 다음 날 서고에 학자는 없었다.'; } },
    { label: '아무것도 묻지 않는다', run: (g) => { LG(g).dragon = { step: 3 }; setRole(g, 'bronze', 'patron'); bond(g, 'bronze', 30); g.player.money += 80; return '용왕은 비늘 하나와 은화 주머니를 남겼다. 아무것도 묻지 않은 것을 그는 마음에 들어 한 것 같았다.'; } },
  ],
});

// ---------- 마왕들: 악당의 길과 회색의 길 ----------
EVENTS.push({
  id: 'legend_garbes_offer', once: true, weight: 60,
  cond: (g) => age(g) >= 20 && here(g) === 'graubel' && free(g) && playerScore(g) >= 48 && alive(g, 'garbes'),
  title: '붉은 사자(使者)',
  text: () => '성벽 아래 선술집 뒷방. 두건을 벗은 사내의 이마에 뿔이 있었다. "붉은 마왕께서 너를 보셨다. 북쪽 성채의 문 하나. 그것만 열어 주면 이 땅이 무너진 뒤에도 너와 네 피붙이는 살아남는다. 그리고 영지 하나." 탁자 위에 붉은 마석이 굴렀다. 사람 머리만 한 크기였다.',
  choices: [
    { label: '마석을 받는다', run: (g) => { setRole(g, 'garbes', 'patron'); bond(g, 'garbes', 30); setFlag(g, 'garbes_pact'); g.player.money += 250; say(g, `${g.player.name}, 붉은 마왕과 몰래 손을 잡다.`); return '붉은 마석을 품에 넣었다. 묵직했다. 사자는 웃지 않았다. "문은 때가 되면 알려 주마." 그날 밤 꿈에 불타는 성채가 보였다. 깨어나서도 손이 따뜻했다.'; } },
    {
      label: '사자를 벤다',
      run: (g, rng) => {
        if (check(rng, skill(g, 'sword') + stat(g, 'str') / 2 + circleOf(g) * 8, 70)) { setRole(g, 'garbes', 'foe'); bond(g, 'garbes', -50); renown(g, 25); say(g, `${g.player.name}, 그라우벨에서 붉은 마왕의 사자를 베다.`); return '칼이 먼저 나갔다. 마족의 피는 검었고 뜨거웠다. 변경백의 병사들이 달려왔을 때 나는 뿔 하나를 들고 있었다. 붉은 마왕이 내 이름을 알게 되었다는 뜻이었다.'; }
        injure(g, '마족의 손톱에 찢긴 상처', 4); bond(g, 'garbes', -20);
        return '칼을 뽑기도 전에 사자의 손이 내 가슴을 할퀴었다. 정신을 차렸을 때 방은 비어 있었다. 붉은 마석도, 사자도 없었다.';
      },
    },
    { label: '변경백에게 알린다', run: (g) => { bond(g, 'garbes', -15); renown(g, 10); return '변경백 울프릭은 내 말을 끝까지 들었다. 그리고 의외로 놀라지 않았다. "그런 사자가 너만 찾아온 게 아니다." 그는 은화 대신 손을 내밀었다.'; } },
  ],
});
EVENTS.push({
  id: 'legend_eleanor_letter', once: true, weight: 52,
  cond: (g) => age(g) >= 18 && ['graubel', 'barka'].includes(here(g)) && free(g) && alive(g, 'eleanor'),
  title: '황혼의 편지',
  text: () => '보랏빛 망토의 여인이 길을 막았다. 뿔을 감추지 않았다. "황혼의 여왕께서 그라우벨의 변경백에게 보내는 편지요. 인간의 손으로 전해져야 의심을 덜 받소." 봉랍에는 저무는 해가 찍혀 있었다. 변경백이 마왕과 무슨 편지를 주고받는단 말인가.',
  choices: [
    { label: '편지를 전한다', run: (g) => { setRole(g, 'eleanor', roleOf(g, 'eleanor') ?? 'patron'); bond(g, 'eleanor', 25); g.player.money += 50; setFlag(g, 'eleanor_courier'); return '변경백은 편지를 읽고 불에 태웠다. "아무것도 보지 못했다. 알겠나." 문밖에서 보랏빛 망토가 은화 쉰 닢을 건넸다. "여왕께서 네 이름을 기억하실 것이오. 그분은 인간의 이름을 쉽게 잊지 않으시오."'; } },
    { label: '왕도에 고발한다', run: (g) => { setRole(g, 'eleanor', 'foe'); bond(g, 'eleanor', -40); renown(g, 12); g.player.money += 30; return '편지는 왕도의 손에 들어갔다. 변경백은 소환되었고, 북쪽의 불가침 약속은 깨졌다. 황혼의 마왕령에서 누군가 내 이름을 지웠다는 말이 돌았다. 지운 것이 아니라 적어 두었다는 말도.'; } },
    { label: '모른 척한다', run: () => '여인은 아무 말 없이 길을 비켜 주었다. 다음 날 다른 인간이 그 편지를 들고 북쪽 성채로 갔다고 한다.' },
  ],
});

// ---------- 노아: 아주 드물게 ----------
EVENTS.push({
  id: 'legend_noah_voice', once: true, weight: 84,
  cond: (g) => age(g) >= 20 && circleOf(g) >= 5 && free(g),
  title: '감시탑의 목소리',
  text: () => '잠결이었다. 얼음 냄새가 났다. 아주 먼 곳에서, 아주 오래된 목소리가 내 이름을 불렀다. "다섯 번째 원을 그렸군. 오백 년 동안 이 목소리가 닿은 사람은 열이 되지 않네." 목소리가 잠시 끊겼다. "봉인은 약해지고 있네. 나도 그렇고. 언젠가 북쪽으로 오게. 묻고 싶은 게 있다면."',
  choices: [
    { label: '"당신은 누구입니까?"', run: (g) => { setFlag(g, 'noah_word'); bond(g, 'noah', 20); gainSkill(g, 'magic', 3, 'wil'); gainStat(g, 'wil', 1);  return '"이름은 의미가 없네. 나는 시간을 멈춘 사람이야. 멈춘 것은 흐르는 것을 부러워하지." 눈을 떴을 때 창틀에 서리가 끼어 있었다. 한여름이었다. 머릿속에 원 하나가 더 선명해져 있었다.'; } },
    { label: '꿈이라고 생각한다', run: (g) => { stress(g, 6); return '아침이 되자 목소리는 흐려졌다. 손바닥에 남은 얼음 같은 차가움만 하루 종일 가시지 않았다.'; } },
  ],
});

// ---------- 카이렌: 함께 미궁으로 ----------
EVENTS.push({
  id: 'legend_kairen_delve', once: true, weight: 60,
  cond: (g) => age(g) >= 17 && atHere(g, 'kairen') && (fac(g, 'guild')?.rank ?? -1) >= 3,
  title: 'S급의 제안',
  text: () => '의뢰판 앞에서 카이렌이 말을 걸어왔다. "C급이라고 들었다. 끝없는 탑 61층. 짐꾼이 아니라 등을 맡길 사람이 필요하다. 셋이 나갔다가 하나 돌아오는 층이다. 갈 테냐."',
  choices: [
    {
      label: '따라간다',
      run: (g, rng) => {
        tire(g, 25);
        if (check(rng, playerScore(g) + stat(g, 'wil') / 2, 58)) { setRole(g, 'kairen', 'patron'); bond(g, 'kairen', 30); g.player.money += 90; renown(g, 15); gainSkill(g, 'sword', 2, 'agi'); return '이레 만에 탑을 내려왔다. 카이렌은 61층의 문지기 머리를 길드 탁자에 올려놓고 내 몫을 정확히 반으로 나눴다. "다음에도 부르마." 그 말을 들은 모험가들이 나를 다르게 보기 시작했다.'; }
        injure(g, '탑 61층에서 얻은 상처', 4); bond(g, 'kairen', 10);
        return '62층 문턱에서 정신을 잃었다. 깨어 보니 카이렌의 등에 업혀 있었다. "살았으면 됐다." 그는 그 뒤로 아무 말도 하지 않았다.';
      },
    },
    { label: '아직은 이르다', run: (g) => { bond(g, 'kairen', 2); return '"그래. 아는 놈이 오래 산다." 카이렌은 혼자 탑으로 갔다.'; } },
  ],
});

// ---------- 십강에 이름이 오르다 ----------
EVENTS.push({
  id: 'legend_rank_entry', cooldown: 0, weight: 86,
  cond: (g) => LG(g).news.some((n) => n.k === 'rank'),
  prepare: (g) => { const lg = LG(g); const n = lg.news.find((x) => x.k === 'rank'); lg.news = lg.news.filter((x) => x !== n); return { n: n?.n ?? lg.playerRank ?? 10 }; },
  title: '십강',
  text: (g, c) => `길드 게시판에 새 십강 명단이 붙었다. 사람들이 몰려 있었다. ${c.n}위 자리에 내 이름이 있었다. ${c.n <= 3 ? '그 위로는 이제 사람이라 부르기 어려운 이름들뿐이었다.' : '용왕과 마왕들 이름 아래, 내 이름이 같은 먹으로 적혀 있었다.'}`,
  choices: [
    { label: '이름값을 받아들인다', run: (g) => { renown(g, 20); stress(g, 8); return '그날부터 길에서 사람들이 길을 비켰다. 도전장도 오기 시작했다. 이름이란 그런 것이다.'; } },
    { label: '조용히 지낸다', run: (g) => { stress(g, -4); return '게시판 앞을 지나쳤다. 이름이 높아질수록 그림자도 길어진다. 아직은 그늘에 있고 싶었다.'; } },
  ],
});
EVENTS.push({
  id: 'legend_challenger', cooldown: 30, weight: 55,
  cond: (g) => !!LG(g).playerRank && free(g) && age(g) <= 60,
  title: '도전장',
  text: () => '숙소 문에 단검으로 꽂힌 종이. "십강의 이름을 걸고 겨루자. 내일 해 뜰 때, 성문 밖 공터." 이름 없는 도전자들은 늘 있었다. 이번 자는 글씨가 곧았다.',
  choices: [
    { label: '나간다', run: (g, rng) => { startDuel(g, rng, { kind: 'legend_challenge', title: '십강 도전', foe: { name: '젊은 도전자', skill: Math.round(Math.max(50, skill(g, 'sword') + rng.int(-6, 10))), style: rng.pick(['bold', 'swift', 'tricky']) }, ctx: {} }); return '해 뜰 녘 공터에 구경꾼이 먼저 와 있었다.'; } },
    { label: '무시한다', run: (g) => { LG(g).pbonus -= 1; return '나가지 않았다. 겁쟁이라는 말이 돌았다. 그런 말에도 값이 있다.'; } },
  ],
});
registerDuelEnd('legend_challenge', (g, rng, won) => {
  if (won) { LG(g).pbonus += 1; renown(g, 5); return '도전자는 칼을 거두고 깊이 고개를 숙였다. "다음엔 내가 이긴다." 그 말이 싫지 않았다.'; }
  LG(g).pbonus -= 3; stress(g, 10);
  return '공터의 함성이 내 이름이 아니라 그 젊은이의 이름이었다. 십강의 자리는 지키는 것이 오르는 것보다 어렵다.';
});

// ---------- 얽힌 큰 인물의 죽음 ----------
EVENTS.push({
  id: 'legend_death_news', cooldown: 0, weight: 82,
  cond: (g) => LG(g).news.some((n) => n.k === 'death'),
  prepare: (g) => { const lg = LG(g); const n = lg.news.find((x) => x.k === 'death'); lg.news = lg.news.filter((x) => x !== n); const x = legend(g, n?.id); return { id: x?.id ?? null, name: x ? legendName(x) : '그 사람', role: x?.role ?? null, bond: x?.bond ?? 0 }; },
  title: '부고',
  text: (g, c) => (c.role === 'master' ? `${J(c.name, '이/가')} 세상을 떠났다는 소식이 왔다. 스승의 마지막 말은 내 이름이었다고 한다.`
    : c.role === 'foe' ? `${J(c.name, '이/가')} 죽었다. 오랫동안 등 뒤를 돌아보게 하던 이름이었다. 이상하게도 홀가분하지만은 않았다.`
    : c.bond > 0 ? `${J(c.name, '이/가')} 죽었다는 소식을 들었다. 내게 빚을 지웠던, 혹은 내가 빚진 사람이었다.`
    : `${J(c.name, '이/가')} 죽었다. 한 시대가 끝났다고 사람들이 말했다.`),
  choices: [
    { label: '잔을 든다', run: (g, rng, c) => { stress(g, c.role === 'master' ? 15 : 5); gainStat(g, 'wil', 0.6); if (c.role === 'master') renown(g, 5); return c.role === 'master' ? '스승에게 배운 첫 형을 새벽 내내 반복했다. 검이 울지는 않았다. 내가 울었다.' : '말없이 한 잔을 비웠다. 큰 이름이 사라진 자리는 한동안 비어 있을 것이다.'; } },
  ],
});

// ---------- 얽힌 인연이 돌아오다: 원수의 보복, 은인의 도움 ----------
const REPRISAL = {
  magnus: '밤중에 방 안의 촛불이 한꺼번에 꺼졌다. 벽에 술식이 타들어 가고 있었다. 간신히 피했지만 손등이 그을렸다. 세레니아는 잊지 않는다.',
  cecilia: '성흔기사 둘이 내가 묵는 곳을 뒤졌다. 찾은 것은 없었다. 찾으려던 것이 아니라 보여 주려던 것이었다.',
  garum: '숲길에서 화살 한 대가 귀를 스치고 나무에 박혔다. 깃털이 줄무늬였다. 경고였다. 다음은 경고가 아닐 것이다.',
  garbes: '꿈에 붉은 눈이 나를 보았다. 깨어 보니 문 앞에 목이 꺾인 까마귀가 놓여 있었다. 붉은 마왕은 이름을 부르지 않고 기억한다.',
  eleanor: '거래하던 상인 둘이 갑자기 나와 손을 끊었다. 이유를 묻자 고개만 저었다. 황혼의 마왕령과 거래하는 사람들이었다.',
  leon: '제국의 기사들이 국경에서 내 이름을 묻고 다닌다는 말을 들었다.',
  bronze: '하늘이 잠깐 어두워졌다. 구름이 아니었다.',
};
EVENTS.push({
  id: 'legend_foe_reprisal', cooldown: 40, weight: 48,
  cond: (g) => age(g) >= 15 && free(g) && LG(g).list.some((x) => x.alive && x.role === 'foe' && REPRISAL[x.id]),
  prepare: (g, rng) => { const fs = LG(g).list.filter((x) => x.alive && x.role === 'foe' && REPRISAL[x.id]); return { id: fs.length ? rng.pick(fs).id : null }; },
  title: '잊지 않는 사람',
  text: (g, c) => REPRISAL[c.id] ?? '누군가 나를 지켜보고 있다.',
  choices: [
    { label: '경계를 늦추지 않는다', run: (g, rng, c) => { if (rng.chance(0.4)) injure(g, '원한의 흔적', 1); stress(g, 10); bond(g, c.id, -2); return '그 뒤로 한동안 등을 벽에 대고 잤다.'; } },
    { label: '화해의 뜻을 전한다', run: (g, rng, c) => { if (check(rng, stat(g, 'cha') + (L(g).renown ?? 0) / 5, 75)) { const x = legend(g, c.id); if (x) { x.role = null; x.bond = -10; } return '오랜 시간과 적지 않은 은화가 들었다. 답장은 짧았다. "없던 일로 하지. 잊지는 않겠지만."'; } g.player.money = Math.max(0, g.player.money - 20); return '보낸 사람이 돌아오지 않았다. 은화 스무 닢도.'; } },
  ],
});
const AID = {
  magnus: '세레니아에서 봉인된 꾸러미가 왔다. 치유 물약 셋과 짧은 쪽지. "협회는 자기 사람을 버리지 않네."',
  cecilia: '구빈원 수녀가 아무 말 없이 약값을 받지 않았다. 누가 대신 냈냐고 묻자 흰 망토 이야기만 했다.',
  garum: '털가죽 시장의 상인이 말린 고기와 약초 한 짐을 들고 찾아왔다. "대족장의 형제에게."',
  bronze: '청동빛 비늘이 품속에서 따뜻해졌다. 그날 밤 꾼 꿈속에서 상처가 아물었다. 아침에 정말 아물어 있었다.',
  kairen: '카이렌이 길드에 내 이름으로 몫을 남겨 두고 갔다. "다음 탑에서 갚아라."',
  garbes: '붉은 마석 하나가 베개 밑에 놓여 있었다. 값을 따지면 은화 쉰 닢. 무엇의 값인지는 생각하지 않기로 했다.',
  eleanor: '보랏빛 망토의 사자가 은화 주머니를 놓고 갔다. "여왕께서 네가 굶지 않기를 바라신다."',
};
EVENTS.push({
  id: 'legend_patron_aid', cooldown: 36, weight: 50,
  cond: (g) => free(g) && (g.player.money < 15 || g.player.injuries.length > 0) && LG(g).list.some((x) => x.alive && x.role === 'patron' && AID[x.id]),
  prepare: (g, rng) => { const ps = LG(g).list.filter((x) => x.alive && x.role === 'patron' && AID[x.id]); return { id: ps.length ? rng.pick(ps).id : null }; },
  title: '은인의 손',
  text: (g, c) => AID[c.id] ?? '누군가 나를 도왔다.',
  choices: [
    { label: '고맙게 받는다', run: (g, rng, c) => { g.player.money += 30; if (g.player.injuries.length) g.player.injuries[0].months = Math.max(0, g.player.injuries[0].months - 2); g.player.injuries = g.player.injuries.filter((i) => i.months > 0); bond(g, c.id, 3); return '도움은 빚이 된다. 언젠가 갚을 날이 올 것이다.'; } },
    { label: '돌려보낸다', run: (g, rng, c) => { bond(g, c.id, -2); gainStat(g, 'wil', 0.4); return '정중히 돌려보냈다. 빚지지 않는 것도 힘이다.'; } },
  ],
});

void placeName;
