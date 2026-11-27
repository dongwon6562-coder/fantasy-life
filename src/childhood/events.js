// 어린 시절 이야기 줄기: 소꿉친구, 서당, 견습 맛보기, 집안 일, 첫 죽음, 그리고 마을이 기억하는 아이.
// 어른이 된 뒤에도 이어진다: 소꿉친구와의 약속, 사제의 추천서, 첫 무덤.
import { gainStat, gainSkill } from '../game.js';
import { HOOKS } from '../hooks.js';
import {
  EVENTS, flag, setFlag, father, mother, alive, age, findJob, peers, isFamily,
  stress, tire, like, note, injure, check, nm, byId, ageYears, spendFamily,
} from '../events/core.js';
import { remember } from '../relations.js';
import { relevance } from '../npc.js';
import { J } from '../narrative/text.js';
import { me } from '../game.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { CH, bestie, monthIdx, KNOWN, knownOf } from './state.js';

const B = (g) => CH(g).bestie;
const due = (g, stage) => B(g).stage === stage && monthIdx(g) >= B(g).at;
const step = (g, stage, rng, min, max) => { B(g).stage = stage; B(g).at = monthIdx(g) + rng.int(min, max); };
const he = (p) => (p?.sex === 'f' ? '그 아이' : '그 녀석');
const fam = (g) => g.player.familyId;
const chron = (g, text) => g.chronicle.push({ y: g.date.year, m: g.date.month, text, rel: 100 });

// ================= 소꿉친구 =================
// 친구가 마을을 떠나거나 죽으면 줄기는 거기서 멈춘다(첫 죽음, 재회가 이어받는다).
function friendGone(g) {
  const id = CH(g).friend;
  if (id == null) return false;
  const p = byId(g, id);
  return !p || !p.alive || p.away || (p.place ?? 'ern') !== 'ern';
}
HOOKS.endOfMonth.push((g) => {
  const b = g.childhood?.bestie;
  if (!b || b.stage <= 0 || b.stage >= 9 || b.parted) return;
  if (friendGone(g)) { const p = byId(g, g.childhood.friend); b.parted = p && !p.alive ? 'dead' : 'moved'; b.stage = 9; }
});

EVENTS.push(
  {
    id: 'ch_bestie_meet', once: true, village: true,
    cond: (g) => age(g) >= 4 && age(g) <= 7 && B(g).stage === 0 && peers(g, 2).length > 0,
    chance: () => 0.12, weight: 70,
    prepare: (g, rng) => {
      const ps = peers(g, 2).sort((a, b) => (b.known ? b.affection : 0) - (a.known ? a.affection : 0));
      const p = rng.chance(0.6) ? ps[0] : rng.pick(ps);
      // 48단계: 뛰어놀기·찾아가기로 이미 어울리던 아이면 첫 만남처럼 쓰지 않는다
      return { id: p.id, known: !!p.known && (p.affection ?? 0) > 0 };
    },
    title: '골목 끝 집 아이',
    text: (g, c) => {
      const p = byId(g, c.id);
      if (c.known) return `요즘 자주 어울리던 골목 끝 집의 ${J(p.name, '이/가')} 담장 위에 앉아 다리를 흔들고 있었다. "오늘은 개구리 잡으러 갈 건데, 다른 애들은 안 데려가. 너만." 대답을 기다리지도 않고 담에서 뛰어내렸다.`;
      return `골목 끝 집의 ${J(p.name, '이/가')} 담장 위에 앉아 다리를 흔들고 있었다. ${ageYears(p)}살, 무릎에 딱지가 앉아 있다. "너 저 집 애지? 나 개구리 잡으러 갈 건데." 대답을 기다리지도 않고 담에서 뛰어내렸다.`;
    },
    choices: [
      { label: '따라간다', run: (g, rng, c) => { const p = byId(g, c.id); CH(g).friend = p.id; like(p, 22); remember(g, p, c.known ? '둘이서만 개구리를 잡으러 갔다' : '개구리를 잡으러 처음 같이 갔다', 1, { tag: 'bestie' }); gainStat(g, 'agi', 0.5); step(g, 1, rng, 12, 26); if (c.known) return `개구리는 한 마리도 못 잡았다. 대신 둘 다 개울에 빠졌다. 젖은 옷을 말리며 ${J(p.name, '이/가')} 말했다. "이제 우리 단짝이다." 그날부터 해만 뜨면 골목 끝 집으로 달려갔다.`; return `개구리는 한 마리도 못 잡았다. 대신 둘 다 개울에 빠졌다. 젖은 옷을 말리며 ${J(p.name, '이/가')} 말했다. "내일도 와." 그날부터 해만 뜨면 골목 끝 집으로 달려갔다.`; } },
      { label: (g, c) => (c.known ? '집에 가야 한다며 망설인다' : '쭈뼛거리며 바라본다'), run: (g, rng, c) => { const p = byId(g, c.id); CH(g).friend = p.id; like(p, 12); remember(g, p, c.known ? '개구리 잡으러 가자는 말에 망설였다' : '처음엔 낯을 가렸다', 0, { tag: 'bestie' }); gainStat(g, 'sen', 0.5); step(g, 1, rng, 18, 30); if (c.known) return `${J(p.name, '은/는')} 몇 걸음 가다 돌아보더니 그냥 기다렸다. 결국 한참 뒤떨어져 따라갔다. 그 뒤로도 ${he(p)}는 늘 몇 걸음 앞에서 기다려 주었다. 어느새 둘은 단짝이라 불렸다.`; return `${J(p.name, '은/는')} 몇 걸음 가다 돌아보더니 그냥 기다렸다. 결국 한참 뒤떨어져 따라갔다. 그 뒤로도 ${he(p)}는 늘 몇 걸음 앞에서 기다려 주었다.`; } },
      { label: '주머니의 사탕을 내민다', run: (g, rng, c) => { const p = byId(g, c.id); CH(g).friend = p.id; like(p, 18); remember(g, p, c.known ? '개구리 잡던 날 사탕을 나눠 주었다' : '첫날 사탕을 나눠 주었다', 1, { tag: 'bestie' }); gainStat(g, 'cha', 0.5); step(g, 1, rng, 12, 26); if (c.known) return `${J(p.name, '은/는')} 사탕을 받아 반으로 깨물어 돌려주었다. 침이 묻어 있었다. 그래도 먹었다. 그날부터 둘은 단짝이었다.`; return `${J(p.name, '은/는')} 사탕을 받아 반으로 깨물어 돌려주었다. 침이 묻어 있었다. 그래도 먹었다. 그걸로 친구가 되었다.`; } },
    ],
  },
  {
    id: 'ch_bestie_den', once: true, village: true,
    cond: (g) => age(g) >= 6 && due(g, 1) && !!bestie(g),
    weight: 82,
    title: '비밀 기지',
    text: (g) => `${J(bestie(g).name, '이/가')} 손을 잡아끌었다. "아무한테도 말하면 안 돼. 맹세해." 둘만의 자리를 만들 곳을 찾았다고 한다.`,
    choices: [
      { label: '폐가의 다락', run: (g, rng) => den(g, rng, 'attic', '아무도 살지 않는 폐가 다락에 낡은 담요를 깔았다. 밤에 들리는 소리는 쥐라고 서로 우겼다.', 'wil') },
      { label: '강둑 버드나무 밑동의 구멍', run: (g, rng) => den(g, rng, 'willow', '버드나무 뿌리 사이 움푹한 곳에 돌멩이와 깃털과 녹슨 단추를 모았다. 보물이라고 불렀다.', 'sen') },
      { label: '숲 가장자리 큰 바위 뒤', run: (g, rng) => den(g, rng, 'rock', '바위 뒤에 나뭇가지로 지붕을 얹었다. 어른들이 가지 말라던 숲이 바로 등 뒤였다.', 'agi') },
    ],
  },
  {
    id: 'ch_bestie_quarrel', once: true, village: true,
    cond: (g) => age(g) >= 8 && due(g, 2) && !!bestie(g),
    weight: 82,
    prepare: (g, rng) => { const why = rng.int(0, 2); B(g).why = why; return { why }; },
    title: '첫 다툼',
    text: (g, c) => {
      const p = bestie(g);
      return [
        `비밀 기지에 숨겨 둔 보물이 없어졌다. ${J(p.name, '은/는')} 자기가 안 그랬다고 했다. 그런데 다음 날 ${p.name}의 동생 손에 그 단추가 들려 있었다.`,
        `마을 큰 아이들이 나를 놀릴 때, ${J(p.name, '은/는')} 그 아이들 틈에 서서 같이 웃었다. 나중에 따지자 "그냥 웃은 거야"라고만 했다.`,
        `둘만 알기로 한 비밀을 ${J(p.name, '이/가')} 다른 아이들에게 말해 버렸다. 골목마다 그 이야기가 돌았다.`,
      ][c.why];
    },
    choices: [
      { label: '먼저 손을 내민다', run: (g, rng) => { const p = bestie(g); B(g).quarrel = 'mended'; like(p, 10); remember(g, p, '먼저 손을 내밀어 주었다', 1, { tag: 'bestie' }); gainStat(g, 'wil', 0.6); gainStat(g, 'cha', 0.4); step(g, 4, rng, 18, 36); return `"됐어. 다음부턴 그러지 마." 말하고 나니 생각보다 쉬웠다. ${J(p.name, '은/는')} 고개를 푹 숙이고 있다가, 다음 날 기지에 새 보물을 하나 가져다 놓았다.`; } },
      { label: '등을 돌린다', run: (g, rng) => { const p = bestie(g); B(g).quarrel = 'cold'; like(p, -12); remember(g, p, '다투고 등을 돌렸다', -1, { tag: 'bestie' }); stress(g, 8); gainStat(g, 'wil', 0.5); step(g, 3, rng, 3, 8); return `그날부터 골목 끝 집 쪽으로는 가지 않았다. ${p.name}도 오지 않았다. 혼자 노는 날이 생각보다 길었다.`; } },
      { label: '주먹이 먼저 나간다', run: (g, rng) => { const p = bestie(g); B(g).quarrel = 'fought'; like(p, -18); remember(g, p, '주먹다짐을 했다', -1, { tag: 'bestie' }); const win = check(rng, g.player.stats.str + g.player.stats.agi, 30); B(g).won = win; if (!win) injure(g, '터진 입술', 1); gainStat(g, 'str', 0.6); stress(g, 4); step(g, 3, rng, 2, 6); return win ? `둘이 흙바닥을 뒹굴었다. ${J(p.name, '이/가')} 먼저 울음을 터뜨렸다. 이겼는데 하나도 기쁘지 않았다.` : `${J(p.name, '이/가')} 나보다 셌다. 입술이 터졌다. 집에 가서 넘어졌다고 했다. 아무도 믿지 않았다.`; } },
    ],
  },
  {
    id: 'ch_bestie_makeup', once: true, village: true,
    cond: (g) => due(g, 3) && !!bestie(g),
    weight: 82,
    title: '화해',
    text: (g) => {
      const p = bestie(g);
      return `저녁 무렵, ${J(p.name, '이/가')} 우리 집 울타리 밖에 서 있었다. 들어오지도 가지도 않고. 손에 무언가를 쥐고 있었다. ${B(g).quarrel === 'fought' ? (B(g).won ? '눈두덩이 아직 퍼렇다.' : '내 입술의 딱지를 보고는 눈을 피했다.') : ''}`.trim();
    },
    choices: [
      { label: '나가서 옆에 선다', run: (g, rng) => { const p = bestie(g); B(g).quarrel = 'mended'; like(p, 20); remember(g, p, '다툰 뒤 화해했다', 1, { tag: 'bestie' }); gainStat(g, 'cha', 0.5); stress(g, -10); step(g, 4, rng, 12, 30); return `${J(p.name, '이/가')} 쥐고 있던 것을 내밀었다. ${B(g).why === 0 ? '기지에서 없어졌던 그 단추였다' : '기지에 같이 모아 두던 깃털 하나였다'}. 아무도 미안하다는 말은 하지 않았다. 해가 다 질 때까지 울타리에 나란히 기대어 있었다.`; } },
      { label: '창문을 닫는다', run: (g, rng) => { const p = bestie(g); B(g).quarrel = 'broken'; B(g).parted = 'broken'; B(g).stage = 9; like(p, -10); remember(g, p, '화해하러 갔지만 외면당했다', -2, { tag: 'bestie' }); stress(g, 6); gainStat(g, 'wil', 0.6); return `창문 틈으로 보니 ${J(p.name, '은/는')} 한참 서 있다가 돌아갔다. 손에 쥔 것을 울타리 기둥 위에 올려 두고. 다음 날 가 보니 비밀 기지에 모아 두던 보물 하나였다. 그 뒤로 둘은 같은 골목에서 고개만 끄덕이는 사이가 되었다.`; } },
    ],
  },
  {
    id: 'ch_bestie_promise', once: true, village: true,
    cond: (g) => age(g) >= 12 && due(g, 4) && !!bestie(g),
    weight: 82,
    title: '약속',
    text: (g) => `${J(bestie(g).name, '과/와')} ${B(g).den === 'willow' ? '버드나무 밑' : B(g).den === 'attic' ? '폐가 다락' : '숲 가장자리 바위'}에 앉았다. 기지는 이제 둘이 들어가기엔 비좁다. ${J(bestie(g).name, '이/가')} 불쑥 말했다. "우리 어른이 되면 말이야..."`,
    choices: [
      { label: '"같이 떠나서 이름을 날리자"', run: (g, rng) => promise(g, rng, 'leave', '"하르펜, 아니 왕도까지." 둘은 엄지에 침을 발라 맞댔다. 어른들이 들으면 웃을 약속이었다.') },
      { label: '"우리는 이 마을을 지키자"', run: (g, rng) => promise(g, rng, 'stay', '"다들 떠나도 우리는 남자. 늙어서도 여기 앉아 있자." 바위에 칼끝으로 둘의 이름을 새겼다.') },
      { label: '"서로의 결혼식에서 노래해 주자"', run: (g, rng) => promise(g, rng, 'wedding', '둘 다 노래를 못한다는 건 알고 있었다. 그래서 더 웃겼다. 웃다가 조금 쓸쓸해졌다.') },
    ],
  },
  {
    id: 'ch_bestie_crossroads', once: true, village: true,
    cond: (g) => age(g) >= 15 && due(g, 5) && !!bestie(g),
    weight: 84,
    title: '갈림길',
    text: (g) => {
      const p = bestie(g);
      const go = B(g).promise === 'leave' || p.traits?.includes('ambitious');
      return go
        ? `${J(p.name, '이/가')} 짐 보따리를 메고 찾아왔다. "나 하르펜으로 가. 모험가 길드에 이름을 올릴 거야." ${B(g).promise === 'leave' ? '약속했던 그 길이다. 그런데 나는 아직 떠날 준비가 되어 있지 않았다.' : '그런 말은 한 번도 한 적이 없었는데.'}`
        : `성인식이 끝난 밤, ${J(p.name, '이/가')} 술병을 들고 왔다. "이제 우린 애들이 아니래." ${p.name}의 집에서는 벌써 혼처 이야기가 오가고 있다고 했다.`;
    },
    choices: [
      { label: '배웅한다 / 잔을 받는다', run: (g, rng) => crossroads(g, rng, 'bless') },
      { label: '붙잡는다', run: (g, rng) => crossroads(g, rng, 'hold') },
    ],
  },
  // ---------- 어른이 된 뒤: 재회 ----------
  {
    id: 'ch_bestie_reunion', once: true,
    cond: (g) => age(g) >= 20 && age(g) <= 45 && CH(g).friend != null && !!B(g).promise && B(g).parted !== 'broken' && (() => { const p = byId(g, CH(g).friend); return p?.alive && !p.away && (p.place ?? 'ern') === (g.life?.place ?? 'ern') && !g.life?.travel; })(),
    chance: () => 0.06, weight: 45,
    title: '옛 약속',
    text: (g) => {
      const p = byId(g, CH(g).friend);
      const n = g.history?.notables?.find((x) => x.pid === p.id);
      const pr = B(g).promise;
      return `${J(p.name, '과/와')} 마주쳤다. ${ageYears(p)}살, 눈가에 주름이 생겼다. ${n ? `요즘은 이름 꽤나 알려진 사람이 되었다. ` : ''}${pr === 'leave' ? '"같이 떠나서 이름을 날리자"던 그 약속을 둘 다 기억하고 있었다.' : pr === 'stay' ? '"우리는 남자"던 바위의 이름은 아직 거기 있을까.' : '"서로의 결혼식에서 노래해 주자"던 약속이 떠올랐다.'}`;
    },
    choices: [
      { label: '술잔을 기울인다', run: (g) => { const p = byId(g, CH(g).friend); like(p, 12); remember(g, p, '오랜만에 만나 술을 마셨다', 1, { tag: 'bestie' }); stress(g, -15); return `밤이 깊도록 이야기했다. 개구리, 단추, 터진 입술. 서로의 기억이 조금씩 달랐다. 그게 이상하게 좋았다.`; } },
      { label: '약속을 꺼내 웃는다', run: (g) => { const p = byId(g, CH(g).friend); like(p, 8); gainStat(g, 'cha', 0.4); const pr = B(g).promise; return pr === 'wedding' ? (g.player.spouseId || p.spouseId ? '노래는 결국 둘 다 엉망이었다는 데 동의했다. 누구의 결혼식이었든.' : '"아직 아무도 결혼을 못 했네." 둘이 동시에 말하고 크게 웃었다.') : pr === 'stay' ? '바위에 가 보았다. 이름은 이끼에 덮여 있었지만 손톱으로 긁으니 나왔다.' : `"그래서, 이름은 날렸냐?" ${J(p.name, '이/가')} 먼저 물었다. 둘 다 대답 대신 잔을 비웠다.`; } },
    ],
  },
);

function den(g, rng, kind, text, statId) {
  const p = bestie(g);
  B(g).den = kind; like(p, 10); remember(g, p, '둘만의 비밀 기지를 만들었다', 1, { tag: 'bestie' }); gainStat(g, statId, 0.6); stress(g, -8);
  step(g, 2, rng, 14, 30);
  return `${text} 그곳은 오래도록 둘만 아는 자리로 남았다.`;
}
function promise(g, rng, kind, text) {
  const p = bestie(g);
  B(g).promise = kind; like(p, 10); remember(g, p, `어른이 되면 ${kind === 'leave' ? '같이 떠나자고' : kind === 'stay' ? '마을에 남자고' : '서로의 결혼식에서 노래하자고'} 약속했다`, 1, { tag: 'bestie' });
  gainStat(g, 'wil', 0.4);
  step(g, 5, rng, 1, 3);
  B(g).at = Math.max(B(g).at, monthIdx(g) + (15 - age(g)) * 12);
  return text;
}
function crossroads(g, rng, how) {
  const p = bestie(g);
  const go = B(g).promise === 'leave' || p.traits?.includes('ambitious');
  B(g).stage = 9;
  if (go) {
    if (how === 'bless' || rng.chance(0.6)) {
      p.away = true; note(g, p, '모험가가 되겠다며 하르펜으로 떠났다.'); B(g).parted = 'left';
      p.job = 'adventurer';
      remember(g, p, how === 'bless' ? '떠나는 날 배웅해 주었다' : '떠나지 말라고 붙잡았다', how === 'bless' ? 1 : 0, { tag: 'bestie' });
      chron(g, `소꿉친구 ${J(p.name, '이/가')} 마을을 떠났다.`);
      return how === 'bless'
        ? `마을 입구 이정표까지 같이 걸었다. ${J(p.name, '은/는')} 한 번도 뒤돌아보지 않았다. 보이지 않을 때까지 서 있었다. 언젠가 소식이 들려오겠지.`
        : `"가지 마." ${J(p.name, '은/는')} 잠깐 멈칫했지만, 결국 보따리를 고쳐 멨다. "너도 와. 기다릴게." 그 말을 남기고 하르펜 길로 사라졌다.`;
    }
    like(p, 8); B(g).parted = 'stayed';
    remember(g, p, '떠나려던 걸 붙잡아 주었다', 1, { tag: 'bestie' });
    return `${J(p.name, '은/는')} 보따리를 내려놓았다. "...한 해만 더 있어 볼게." 그 한 해가 얼마나 길어질지는 둘 다 몰랐다.`;
  }
  B(g).parted = 'stayed';
  like(p, how === 'bless' ? 10 : 4);
  return how === 'bless'
    ? `독한 술이었다. 둘 다 콜록거렸다. "어른 되는 거 별거 없네." 별거 없는 그 밤이 오래 기억에 남았다.`
    : `"아직 결혼하지 마. 너무 빠르잖아." ${J(p.name, '이/가')} 웃었다. "네가 정할 일이냐." 그래도 고맙다는 얼굴이었다.`;
}

// ================= 서당 (예배당 글공부) =================
EVENTS.push(
  {
    id: 'ch_school_first', once: true, village: true,
    cond: (g) => (CH(g).counts.study ?? 0) >= 1 && age(g) <= 10 && CH(g).school.stage === 0,
    weight: 81,
    title: '예배당의 첫날',
    text: (g) => `${nm(findJob(g, 'priest'), '사제')}의 수업은 해 뜰 녘 종소리와 함께 시작한다. 기다란 의자에 마을 아이 일곱이 앉아 석판을 무릎에 올렸다. 사제의 손에는 버드나무 회초리가 들려 있다.`,
    choices: [
      { label: '손을 들고 묻는다', run: (g) => { CH(g).school.stage = 1; const p = findJob(g, 'priest'); like(p, 4); gainStat(g, 'int', 0.6); return '"글자는 누가 만들었어요?" 사제는 회초리를 내려놓았다. "좋은 질문이다. 답은 다음 달에 알려 주마." 다음 달에도, 그다음 달에도 답은 조금씩 길어졌다.'; } },
      { label: '맨 뒷자리에서 창밖을 본다', run: (g) => { CH(g).school.stage = 1; gainStat(g, 'sen', 0.6); stress(g, -4); return '창밖으로 제비가 오갔다. 회초리가 책상을 내리친 소리에 정신이 들었다. 그래도 제비 둥지가 몇 개인지는 정확히 알게 되었다.'; } },
      { label: '옆자리 아이에게 장난을 건다', run: (g, rng) => { CH(g).school.stage = 1; const ps = peers(g, 2); const p = ps.length ? rng.pick(ps) : null; if (p) { like(p, 6); remember(g, p, '예배당에서 같이 혼났다', 1, { tag: 'school' }); } gainStat(g, 'cha', 0.5); return `${p ? J(p.name, '과/와') : '옆자리 아이와'} 같이 손바닥을 맞았다. 맞는 동안 서로 웃음을 참느라 혼이 났다.`; } },
    ],
  },
  {
    id: 'ch_school_recite', once: true, village: true,
    cond: (g) => (CH(g).counts.study ?? 0) >= 8 && age(g) >= 8 && age(g) <= 13 && CH(g).school.stage === 1,
    weight: 81,
    title: '봉인제 암송',
    text: () => '봉인제 날, 예배당 앞마당에 온 마을 사람이 모였다. 사제가 아이들을 한 명씩 불러 용사 아르스의 서약을 외우게 한다. 내 차례다. 앞줄에 부모님 얼굴이 보인다.',
    choices: [
      { label: '또박또박 끝까지 외운다', run: (g, rng) => recite(g, rng, g.player.skills.letters + g.player.stats.wil * 0.4, 'calm') },
      { label: '목소리를 키워 극적으로', run: (g, rng) => recite(g, rng, g.player.skills.letters + g.player.stats.cha * 0.5, 'bold') },
    ],
  },
  {
    id: 'ch_school_letter', once: true, village: true,
    cond: (g) => (CH(g).counts.study ?? 0) >= 16 && g.player.skills.letters >= 28 && age(g) >= 11 && age(g) <= 14 && CH(g).school.stage === 2 && !!findJob(g, 'priest'),
    weight: 81,
    title: '사제의 추천서',
    text: (g) => `${J(nm(findJob(g, 'priest'), '사제'), '이/가')} 수업이 끝난 뒤 남으라고 했다. 봉랍을 찍은 편지 한 통을 책상 위에 올려놓는다. "하르펜 성당 학교에 보내는 추천서다. 네 나이에 이만큼 읽는 아이는 이 마을에 없었다. 다만 학비는 집에서 대야 한다."`,
    choices: [
      { label: '받아 든다', run: (g) => { const s = CH(g).school; s.stage = 3; s.letter = 'taken'; setFlag(g, 'child_recommend'); spendFamily(g, 8); const p = findJob(g, 'priest'); like(p, 10); remember(g, p, '추천서를 써 주었다', 2, { tag: 'pupil' }); gainSkill(g, 'letters', 3, 'int'); chron(g, `${g.player.name}, 사제에게서 하르펜 성당 학교 추천서를 받다.`); return '집안 돈이 줄었다. 어머니는 아무 말 없이 은화를 세어 주었다. 편지는 가장 좋은 옷 안주머니에 넣었다. 언젠가 이 편지가 문을 열어 줄 것이다.'; } },
      { label: '집안 형편을 생각해 사양한다', run: (g) => { const s = CH(g).school; s.stage = 3; s.letter = 'declined'; like(father(g), 6); like(mother(g), 6); gainStat(g, 'wil', 0.8); const p = findJob(g, 'priest'); like(p, 2); return '"집에 손이 필요해요." 사제는 한참 보다가 편지를 서랍에 넣었다. "버리지는 않으마. 마음이 바뀌면 와라." 그 서랍은 오래도록 잠기지 않았다.'; } },
    ],
  },
  // ---------- 어른이 된 뒤: 추천서 ----------
  {
    id: 'ch_letter_door', once: true,
    cond: (g) => flag(g, 'child_recommend') && age(g) >= 16 && age(g) <= 30 && ['harfen', 'leocast'].includes(g.life?.place) && !g.life?.travel,
    chance: () => 0.15, weight: 50,
    title: '오래된 추천서',
    text: (g) => `${g.life.place === 'harfen' ? '하르펜 성당' : '왕도 대성당'}의 서고 앞에서 옷 안주머니의 편지가 떠올랐다. 봉랍은 금이 갔지만 글씨는 그대로다. 어린 날 에른의 사제가 써 준 추천서.`,
    choices: [
      { label: '서고지기에게 내민다', run: (g) => { gainSkill(g, 'letters', 4, 'int'); gainStat(g, 'int', 0.8); g.player.money += 6; setFlag(g, 'child_recommend', 'used'); return '서고지기는 편지를 읽고 안경을 고쳐 썼다. "에른의 그 사제 말이오? 아직 살아 있구려." 필사 일을 맡겨 주었다. 품삯도 받았고, 무엇보다 서고 열쇠를 받았다.'; } },
      { label: '그냥 간직한다', run: (g) => { gainStat(g, 'wil', 0.5); return '편지는 다시 안주머니로 들어갔다. 쓸모보다 무게가 더 중요한 물건도 있다.'; } },
    ],
  },
);
function recite(g, rng, value, style) {
  const s = CH(g).school;
  s.stage = 2;
  const ok = check(rng, value, 22);
  s.recite = ok ? 'good' : 'bad';
  const p = findJob(g, 'priest');
  if (ok) { like(p, 6); gainStat(g, style === 'bold' ? 'cha' : 'wil', 0.8); gainSkill(g, 'letters', 1.5, 'int'); like(father(g), 3); like(mother(g), 3); return style === 'bold' ? '마지막 구절에서 목소리가 마당 끝까지 울렸다. 누군가 박수를 쳤고, 사제는 못 들은 척했지만 입꼬리가 올라가 있었다.' : '한 글자도 틀리지 않았다. 아버지가 옆 사람에게 무언가 속삭였다. 집에 와서도 그 이야기를 몇 번이나 했다.'; }
  stress(g, 10); gainStat(g, 'wil', 0.6);
  return style === 'bold' ? '세 번째 구절에서 머릿속이 하얘졌다. 뒷줄 아이들이 킥킥거렸다. 사제가 다음 구절을 작게 일러 주었다. 그날 밤 이불 속에서 서약을 백 번 외웠다.' : '중간에 한 줄을 건너뛰었다. 아무도 눈치채지 못한 것 같았지만, 나는 알았다. 그 한 줄은 평생 잊히지 않았다.';
}

// ================= 견습 맛보기 =================
const TASTE = {
  smith: { place: '대장간', skill: 'smithing', stat: 'str', text: '풀무질만 한 철을 했다. 쇠가 붉어지는 빛깔로 온도를 읽는 법을 어깨너머로 보았다.' },
  carpenter: { place: '목공소', skill: null, stat: 'agi', text: '대패질은 나뭇결을 거스르면 안 된다는 것을 손바닥의 가시로 배웠다.' },
  baker: { place: '빵집', skill: 'cooking', stat: 'sen', text: '새벽 세 시에 일어나 반죽을 쳤다. 화덕 앞에서 빵 껍질이 갈라지는 소리를 처음 들었다.' },
  herbalist: { place: '약초 오두막', skill: 'herbs', stat: 'int', text: '말린 풀 냄새가 옷에 배었다. 같은 풀도 달이면 약이고 태우면 독이 된다는 것을 배웠다.' },
  hunter: { place: '사냥꾼의 오두막', skill: null, stat: 'sen', text: '숲에서 한나절 동안 숨소리를 죽이는 법을 배웠다. 덫에 걸린 토끼의 눈을 오래 잊지 못했다.' },
  innkeeper: { place: '여관 부엌', skill: 'cooking', stat: 'cha', text: '손님들 술잔 채우는 틈틈이 이야기를 주워들었다. 하르펜, 왕도, 미궁, 마물. 부엌은 세상의 소문이 모이는 곳이었다.' },
  miller: { place: '방앗간', skill: 'farming', stat: 'str', text: '밀가루를 뒤집어쓰고 자루를 날랐다. 저울 눈금을 속이는 법도 보았지만, 배우지는 않았다.' },
  shopkeeper: { place: '잡화점', skill: 'trade', stat: 'int', text: '물건 값을 외우고 장부를 맞췄다. 동화 한 닢이 모자라면 해가 져도 문을 닫지 않는 곳이었다.' },
  hedge_mage: { place: '떠돌이 마법사의 오두막', skill: 'magic', stat: 'int', text: '마법은 가르쳐 주지 않았다. 약재를 빻고 촛농을 긁어냈을 뿐이다. 그래도 탁자 위 수정구가 가끔 저 혼자 빛나는 것을 보았다.', need: (g) => g.player.manaAwakened },
};
const tasteJobs = (g) => Object.keys(TASTE).filter((j) => !CH(g).tastes[j] && findJob(g, j) && (!TASTE[j].need || TASTE[j].need(g)));
EVENTS.push({
  id: 'ch_taste', village: true, cooldown: 9,
  cond: (g) => age(g) >= 10 && age(g) <= 13 && Object.keys(CH(g).tastes).length < 3 && tasteJobs(g).length >= 1,
  chance: () => 0.18, weight: 52,
  prepare: (g, rng) => {
    const js = tasteJobs(g);
    const pick = [];
    while (pick.length < Math.min(3, js.length)) { const j = rng.pick(js); if (!pick.includes(j)) pick.push(j); }
    return { jobs: pick };
  },
  title: '한 철 따라다니기',
  text: () => '"놀고만 있지 말고 한 철쯤 남의 일을 거들어 봐라. 손에 뭐라도 익혀야지." 어른들이 말했다. 받아 주겠다는 곳이 몇 군데 있다.',
  choices: [0, 1, 2].map((i) => ({
    label: (g, c) => { const j = c.jobs[i]; return j ? `${TASTE[j].place}에서` : ''; },
    show: (g, c) => !!c.jobs[i],
    run: (g, rng, c) => {
      const j = c.jobs[i], t = TASTE[j];
      CH(g).tastes[j] = (CH(g).tastes[j] ?? 0) + 1;
      const p = findJob(g, j);
      if (p) { like(p, 8); remember(g, p, `한 철 ${t.place} 일을 거들었다`, 1, { tag: 'taste' }); }
      if (t.skill) gainSkill(g, t.skill, 3, t.stat);
      gainStat(g, t.stat, 0.8); tire(g, 10);
      setFlag(g, `child_taste_${j}`);
      return `${t.text} ${p ? `${J(p.name, '은/는')} 철이 끝날 때 "다음에 또 와라"라고 했다.` : ''}`.trim();
    },
  })).concat([{ label: '아직은 싫다', run: () => '아직은 놀고 싶었다. 어른들은 혀를 찼지만, 열 살의 여름은 한 번뿐이다.' }]),
});

// ================= 집안 일 (집안마다 한 번) =================
EVENTS.push(
  {
    id: 'ch_duty_farmer', once: true, village: true,
    cond: (g) => fam(g) === 'farmer' && !CH(g).duty && age(g) >= 9 && age(g) <= 13 && g.date.month >= 8 && g.date.month <= 9 && alive(father(g)),
    chance: () => 0.25, weight: 60,
    title: '아버지의 다리',
    text: (g) => `추수를 앞두고 아버지가 수레에 다리를 깔렸다. 뼈는 붙겠지만 한 달은 걷지 못한다. 밀은 기다려 주지 않는다. 아버지가 누운 채로 나를 불렀다. "네가 해야겠다."`,
    choices: [
      { label: '이웃들에게 도움을 청한다', run: (g) => { CH(g).duty = 'asked'; gainStat(g, 'cha', 1.0); gainSkill(g, 'farming', 2, 'str'); g.player.familyMoney += 6; return '집집마다 문을 두드렸다. 고개를 숙이는 게 낫질보다 힘들었다. 사흘 뒤 이웃 넷이 낫을 들고 왔다. 그해 추수는 무사히 끝났고, 이듬해 그 집들 추수 때는 내가 낫을 들고 갔다.'; } },
      { label: '혼자 이를 악물고 해낸다', run: (g) => { CH(g).duty = 'alone'; gainStat(g, 'wil', 1.2); gainStat(g, 'str', 0.8); gainSkill(g, 'farming', 3, 'str'); tire(g, 30); g.player.familyMoney += 4; injure(g, '낫에 벤 손바닥', 1); return '해 뜨기 전부터 해 진 뒤까지 낫을 휘둘렀다. 손바닥이 터지고 아물고 다시 터졌다. 마지막 밀단을 묶던 날, 아버지가 지팡이를 짚고 밭머리에 나와 있었다. 아무 말도 하지 않았다. 그걸로 충분했다.'; } },
      { label: '동생들과 일을 나눈다', show: (g) => g.player.familyIds.slice(2).some((id) => byId(g, id)?.alive && byId(g, id).ageMonths >= 72), run: (g) => { CH(g).duty = 'shared'; gainStat(g, 'int', 0.8); gainStat(g, 'cha', 0.6); gainSkill(g, 'farming', 2, 'str'); for (const id of g.player.familyIds.slice(2)) like(byId(g, id), 6); g.player.familyMoney += 5; return '누가 베고 누가 묶고 누가 나를지 정했다. 막내는 물을 날랐다. 서툴렀지만 다 같이 해냈다. 그 가을부터 동생들은 나를 아버지처럼 바라보기 시작했다.'; } },
    ],
  },
  {
    id: 'ch_duty_merchant', once: true, village: true,
    cond: (g) => fam(g) === 'merchant' && !CH(g).duty && age(g) >= 10 && age(g) <= 13 && alive(father(g)),
    chance: () => 0.16, weight: 60,
    title: '첫 장삿길',
    text: (g) => `아버지가 처음으로 하르펜 장에 데려가 주었다. 성벽, 인파, 소리, 냄새. 그런데 큰 거래처와의 흥정을 앞두고 아버지가 말했다. "이번엔 네가 해 봐라. 나는 옆에서 보기만 하마."`,
    choices: [
      { label: '먼저 높은 값을 부른다', run: (g, rng) => merchantDeal(g, rng, g.player.stats.cha + g.player.skills.trade, 'bold') },
      { label: '상대가 먼저 말하게 기다린다', run: (g, rng) => merchantDeal(g, rng, g.player.stats.wil + g.player.skills.trade, 'patient') },
      { label: '정직하게 원가를 밝힌다', run: (g) => { CH(g).duty = 'honest'; gainStat(g, 'cha', 0.6); gainStat(g, 'wil', 0.6); like(father(g), -2); g.player.familyMoney += 2; return '상대 상인이 눈을 크게 떴다가 웃었다. "이런 장사꾼은 처음이군." 남는 것은 적었다. 아버지는 돌아오는 길 내내 말이 없었지만, 이듬해 그 상인이 먼저 우리 집을 찾아왔다.'; } },
    ],
  },
  {
    id: 'ch_duty_knight', once: true, village: true,
    cond: (g) => fam(g) === 'fallen_knight' && !CH(g).duty && age(g) >= 9 && age(g) <= 13,
    chance: () => 0.16, weight: 60,
    title: '가문의 갑옷',
    text: (g) => `빚쟁이가 다녀간 밤, 부모님이 낮은 목소리로 다투는 소리를 들었다. 헛간 궤짝 속의 갑옷 이야기였다. 증조부가 마신 잔당 토벌에서 입었다는, 우리 집안에 남은 마지막 기사의 물건. 팔면 한 해를 버틸 수 있다. 다음 날 아버지가 물었다. "너는 어떻게 생각하느냐."`,
    choices: [
      { label: '"팔아요. 사람이 먼저예요."', run: (g) => { CH(g).duty = 'sold'; g.player.familyMoney += 25; gainStat(g, 'int', 0.8); like(mother(g), 6); setFlag(g, 'armor_sold'); return '갑옷은 하르펜의 고물상에게 넘어갔다. 아버지는 그날 밤 혼자 헛간에 오래 앉아 있었다. 그해 겨울, 집안은 굶지 않았다.'; } },
      { label: '"제가 일해서 갚을게요. 갑옷은 지켜요."', run: (g) => { CH(g).duty = 'kept'; gainStat(g, 'wil', 1.2); like(father(g), 10); tire(g, 20); setFlag(g, 'armor_kept'); remember(g, father(g), '가문의 갑옷을 지키자고 했다', 2, { tag: 'family' }); return '그해 겨울 내내 남의 집 장작을 패고 물을 길었다. 빚은 다 갚지 못했다. 그래도 갑옷은 궤짝 속에 남았다. 아버지가 기름 먹인 천으로 그것을 닦는 법을 가르쳐 주었다. "언젠가 네 것이 된다."'; } },
    ],
  },
);
function merchantDeal(g, rng, value, style) {
  const ok = check(rng, value, 32);
  CH(g).duty = ok ? 'won' : 'lost';
  gainSkill(g, 'trade', ok ? 3 : 1.5, 'cha');
  if (ok) { g.player.familyMoney += 10; like(father(g), 8); gainStat(g, 'cha', 0.6); return style === 'bold' ? '상대가 코웃음을 쳤다. 물러서지 않았다. 결국 상대가 먼저 손을 내밀었다. 돌아오는 수레 위에서 아버지가 처음으로 나를 동업자처럼 대했다.' : '침묵이 길었다. 상대가 견디지 못하고 먼저 값을 불렀다. 생각보다 높았다. 아버지가 탁자 밑에서 내 발을 슬쩍 밟았다. 잘했다는 뜻이었다.'; }
  stress(g, 8); gainStat(g, 'wil', 0.6);
  return '하르펜 상인은 아이를 상대하는 데 익숙했다. 정신을 차려 보니 손해 보는 값에 손을 잡고 있었다. 아버지는 웃으며 차액을 메웠다. "수업료다. 하르펜에선 다들 이걸 내고 배운다."';
}

// ================= 첫 죽음 =================
// 아는 사람(가족, 친구, 정든 이웃)이 처음 세상을 떠났을 때
HOOKS.afterNpc.push((g) => {
  const c = g.childhood;
  if (!c || c.firstDeath || c.pendingDeath || age(g) >= 15 || age(g) < 4) return;
  // 이번 달에 죽은 사람만: history의 마지막 기록이 이번 달인지 본다
  const cand = g.people.filter((p) => !p.alive && !p.isPlayer && relevance(g, p) >= 45 && p.history?.length && p.history[p.history.length - 1].y === g.date.year && p.history[p.history.length - 1].m === g.date.month);
  const p = cand.sort((a, b) => relevance(g, b) - relevance(g, a))[0];
  if (p) c.pendingDeath = p.id;
});
// 고장 나라(PLACES.realm). rites를 불러오면 모듈 순서가 바뀌어 흐름이 흔들려서 places만 쓴다.
const PLACE_REALM = (pl) => PLACES[pl]?.realm || 'leonia';
// 48단계: 엘프 아이의 첫 장례도 '예배당 뒤 묘지'였다. 고장 풍습(src/rites/의 문화)에 따라 장례 자리를 바꾼다.
const burialOf = (g) => { const c = PLACE_REALM(L(g)?.place ?? me(g)?.place ?? 'ern'); const r = me(g)?.race; return ['elf', 'dwarf', 'beast', 'demon'].includes(r) ? r : c; };
const BURIAL = {
  default: '예배당 뒤 묘지에 구덩이가 파였다. 흙냄새가 났다. 어른들이 차례로 흙을 한 줌씩 던졌다.',
  sea: '바다가 내려다보이는 언덕 묘지에 구덩이가 파였다. 소금기 섞인 바람이 불었다. 어른들이 차례로 흙을 한 줌씩 던졌다.',
  elf: '세계수 뿌리 곁에 얕은 자리가 파였다. 젖은 잎 냄새가 났다. 엘프들이 차례로 씨앗을 한 알씩 떨어뜨렸다.',
  dwarf: '산 아래 돌방 문이 열렸다. 서늘한 돌 냄새가 났다. 어른들이 차례로 돌을 하나씩 쌓아 문을 막았다.',
  beast: '초원 언덕에 돌무지를 쌓았다. 바람에서 풀 냄새가 났다. 어른들이 차례로 돌을 하나씩 얹고 길게 울었다.',
  demon: '재의 자리에 장작이 쌓였다. 매운 연기가 눈을 찔렀다. 어른들이 차례로 불씨를 하나씩 던졌다.',
};
for (const k of ['leonia', 'holy', 'valhart', 'free', 'march', 'serenia']) BURIAL[k] = BURIAL.default;
const BURIAL_ASK = {
  elf: ['장로', '장로는 숲으로 돌아간다고 했다. 씨앗이 되어 백 년쯤 뒤에 다시 잎을 낸다고. 그 백 년을 기다릴 수 있을지는 묻지 못했다.'],
  dwarf: ['장로', '장로는 돌이 된다고 했다. 산의 뼈가 되어 우리 발밑을 받친다고. 그날부터 갱도 바닥을 밟을 때 조금 조심스러워졌다.'],
  beast: ['주술사', '주술사는 바람이 된다고 했다. 사냥할 때 등을 미는 바람이 그거라고. 그날부터 바람이 불면 자꾸 뒤를 돌아보게 되었다.'],
  demon: ['어른', '어른은 아무 데도 가지 않는다고 했다. 이름이 남으면 남고, 잊히면 그걸로 끝이라고. 그 이름을 오래 외웠다.'],
};
EVENTS.push({
  id: 'ch_first_death', once: true,
  cond: (g) => CH(g).pendingDeath != null && !CH(g).firstDeath,
  weight: 88,
  prepare: (g) => ({ id: CH(g).pendingDeath }),
  title: '첫 장례',
  text: (g, c) => {
    const p = byId(g, c.id);
    const who = isFamily(g, p) ? (p.id === g.player.familyIds[0] ? '아버지' : p.id === g.player.familyIds[1] ? '어머니' : p.sex === 'm' ? '형제' : '자매') : p.id === CH(g).friend ? '소꿉친구' : '이웃';
    return `${who} ${J(p.name, '이/가')} 죽었다. ${BURIAL[burialOf(g)] ?? BURIAL.default} 내 차례가 왔다. 지금까지 죽음은 이야기 속에만 있었다.`;
  },
  choices: [
    { label: '소리 내어 운다', run: (g, rng, c) => firstDeath(g, c, 'tears', '목이 쉴 때까지 울었다. 누군가 등을 쓸어 주었다. 울고 나니 이상하게 배가 고팠다. 그게 부끄러워 또 울었다.', 'cha') },
    { label: '이를 악물고 울지 않는다', run: (g, rng, c) => firstDeath(g, c, 'stone', '눈물이 나지 않았다. 흙을 던지는 손이 떨렸을 뿐이다. 그날 밤 이불 속에서야 무언가가 무너졌다. 아무도 몰랐다.', 'wil') },
    { label: (g) => `${BURIAL_ASK[burialOf(g)]?.[0] ?? '사제'}에게 묻는다. "죽으면 어디로 가요?"`, run: (g, rng, c) => BURIAL_ASK[burialOf(g)] ? firstDeath(g, c, 'question', BURIAL_ASK[burialOf(g)][1], 'int') : firstDeath(g, c, 'question', `사제는 성광의 품이라고 했다. ${findJob(g, 'hedge_mage') ? `떠돌이 마법사 ${findJob(g, 'hedge_mage').name}` : '떠돌이 마법사'}는 마력이 흩어져 땅으로 돌아간다고 했다. 할머니들은 별이 된다고 했다. 아무도 같은 말을 하지 않았다. 그때부터 어른들의 대답을 의심하게 되었다.`, 'int') },
  ],
});
function firstDeath(g, c, grief, text, statId) {
  const p = byId(g, c.id);
  const ch = CH(g);
  ch.firstDeath = { id: p.id, name: p.name, grief, y: g.date.year };
  ch.pendingDeath = null;
  gainStat(g, statId, 1.0); stress(g, grief === 'stone' ? 12 : 6);
  chron(g, `${g.player.name}, 처음으로 장례를 치르다. (${p.name})`);
  return text;
}
// 어른이 된 뒤: 첫 무덤
EVENTS.push({
  id: 'ch_grave_visit', once: true, village: true,
  cond: (g) => age(g) >= 22 && !!CH(g).firstDeath?.id && g.date.month === 11,
  chance: () => 0.25, weight: 40,
  title: '첫 무덤',
  text: (g) => { const f = CH(g).firstDeath; return `망자의 밤이 다가오는 늦가을, 예배당 뒤 묘지를 지나다 발이 멈췄다. ${J(f.name, '이/가')} 묻힌 자리. 처음으로 흙을 던졌던 그날로부터 ${g.date.year - f.y}년이 지났다.`; },
  choices: [
    { label: '꽃을 놓는다', run: (g) => { stress(g, -10); const f = CH(g).firstDeath; return f.grief === 'stone' ? '그때 울지 못했던 몫을 이제야 조금 울었다. 늦었지만, 너무 늦지는 않았다.' : f.grief === 'question' ? '죽으면 어디로 가는지 아직도 모른다. 그래도 이 자리에 오면 무언가 남아 있는 것 같다.' : '이제는 울지 않는다. 대신 그날 등을 쓸어 주던 손이 누구였는지 떠올려 보았다.'; } },
    { label: '지나친다', run: (g) => { gainStat(g, 'wil', 0.3); return '살아 있는 사람의 일이 먼저다. 그래도 몇 걸음 가다 한 번 돌아보았다.'; } },
  ],
});

// ================= 마을이 기억하는 아이 (성인식 뒤) =================
EVENTS.push({
  id: 'ch_known_as', once: true,
  cond: (g) => flag(g, 'adult') && age(g) >= 15 && age(g) <= 16 && !CH(g).knownAs,
  weight: 99,
  prepare: (g) => ({ k: knownOf(g) }),
  title: '마을이 기억하는 아이',
  text: (g, c) => {
    const ch = CH(g), b = ch.bestie;
    const f = ch.friend != null ? byId(g, ch.friend) : null;
    const lines = [`성인식이 끝나고 잔치 자리에서 늙은 촌장이 잔을 들었다. "${g.player.name}. 내 기억엔 늘 ${KNOWN[c.k].name}였지."`];
    if (f) lines.push(b.parted === 'left' ? `${J(f.name, '이/가')} 있었다면 옆에서 웃었을 것이다.` : b.parted === 'dead' ? `${J(f.name, '이/가')} 앉았어야 할 자리가 비어 있었다.` : b.parted === 'broken' ? `잔치 마당 저편에 ${J(f.name, '이/가')} 있었다. 눈이 마주쳤고, 둘 다 먼저 피했다.` : `${J(f.name, '이/가')} 옆구리를 찔렀다. "맞잖아."`);
    if (ch.firstDeath?.name) lines.push(`${ch.firstDeath.name}의 장례 이후로 조금 일찍 어른이 되었다는 걸, 몇몇 어른은 알고 있었다.`);
    return lines.join(' ');
  },
  choices: [
    { label: '"맞아요. 그게 저예요."', run: (g, rng, c) => { const ch = CH(g); ch.knownAs = c.k; const st = { wild: 'agi', bookish: 'int', worker: 'str', blade: 'str', mage: 'wil', forest: 'sen', gentle: 'cha' }[c.k]; gainStat(g, st, 1.2); chron(g, `${g.player.name}, 마을 사람들에게 "${KNOWN[c.k].name}"로 기억되다.`); return '사람들이 웃으며 잔을 부딪쳤다. 어릴 때의 나를 기억하는 사람들 속에서, 나는 그 아이의 다음 장을 살게 될 것이다.'; } },
    { label: '"그건 어릴 때 얘기죠."', run: (g, rng, c) => { CH(g).knownAs = 'self'; CH(g).wasKnownAs = c.k; gainStat(g, 'wil', 1.2); return '촌장이 껄껄 웃었다. "그래, 그래. 이제부터 네가 정하는 거지." 잔치 마당의 불빛이 유난히 밝았다.'; } },
  ],
});
// 어른이 된 뒤: 어린 시절이 돌아오는 순간
const ECHO = {
  wild: '하르펜 길 위에서 아이들이 막대기를 들고 뛰어가는 걸 보았다. 저 나이 때 나는 해가 지는 줄도 몰랐다. 몸이 아직 그 들판을 기억하는지, 발걸음이 조금 가벼워졌다.',
  bookish: '어느 집 창가에서 아이가 더듬더듬 기도문을 읽는 소리가 들렸다. 석판, 회초리, 촛농 냄새. 손끝이 저절로 글자를 따라 움직였다.',
  worker: '남의 밭에서 허리를 펴는 아이를 보았다. 그 나이에 어른 몫을 하던 손이 지금도 굳은살로 남아 있다.',
  blade: '대장간 앞에 세워진 목검을 보고 걸음을 멈췄다. 처음 목검을 쥐었을 때 손바닥이 얼얼하던 감각이 그대로 살아났다.',
  mage: '조용한 밤, 어릴 때처럼 눈을 감고 숨을 셌다. 그때 느꼈던 미지근한 흐름이 지금은 강물처럼 분명하다.',
  forest: '숲길에서 은방울풀을 보았다. 이름보다 먼저 냄새가 기억났다. 약초사 할멈의 노래 가사도.',
  gentle: '모르는 집 문 앞에서 문을 두드릴까 망설였다. 어릴 적에는 망설이지 않았는데. 결국 두드렸다.',
};
EVENTS.push({
  id: 'ch_echo', once: true,
  cond: (g) => age(g) >= 19 && age(g) <= 40 && ECHO[CH(g).knownAs],
  chance: () => 0.05, weight: 30,
  title: '어린 날',
  text: (g) => ECHO[CH(g).knownAs],
  choices: [
    { label: '잠시 그 기억에 머문다', run: (g) => { stress(g, -12); const st = { wild: 'agi', bookish: 'int', worker: 'str', blade: 'agi', mage: 'wil', forest: 'sen', gentle: 'cha' }[CH(g).knownAs]; gainStat(g, st, 0.6); return '오래 서 있지는 않았다. 그래도 그날 하루는 어린 날의 내가 옆에서 같이 걷는 것 같았다.'; } },
  ],
});

