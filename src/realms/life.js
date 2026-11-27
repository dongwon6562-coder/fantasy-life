// 6단계: 다른 나라 안의 삶. 도시마다 고유한 사람·이야기 줄기·장소 행동·일거리.
// 종족의 고향 땅(은잎 마을, 쇠망치 골, 털가죽 시장)에서는 인간이 남이 된다.
// realms/index.js와 races/index.js 둘 다 쓰므로 content.js에서 races 뒤에 불러온다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat, gainSkill } from '../game.js';
import { makePerson, byId, fullName, kill } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { FOES } from '../adventure/combat.js';
import { queueFight } from '../adventure/fight.js';
import { registerJob, WORK, takeJob } from '../jobs.js';
import { remember } from '../relations.js';
import { makeRng } from '../rng.js';
import { isJailed, jail, addNotoriety, craftOf, reportCrime } from '../crime.js';
import { REALMS, realmOf, realmState, realmPersonName, meetLocal, localBy, treatmentIn } from './index.js';
import { setRace, raceOf, playerRace } from '../races/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const RS = realmState;
const here = (g) => L(g).place;

/* ---------- 이야기 줄기 ---------- */
// game.realms.stories[장소] = { step, at(다음 장면이 올 수 있는 달), done, npc(사람 id), mark(갈래 표시) }
const S = (g) => (RS(g).stories ??= {});
function storyNpc(g, rng, place) {
  rng ??= makeRng({ s: ((g.rngState?.s ?? 1) * 2654435761 + place.length * 977) >>> 0 }); // 화면이 글을 먼저 그릴 때도 같은 사람이 나오게
  const st = S(g)[place] ??= { step: 0, at: 0 };
  let p = st.npc != null ? byId(g, st.npc) : null;
  if (p) return p;
  const d = STORIES[place].npc;
  if (d.role) { p = localBy(g, place, d.role); if (p) { st.npc = p.id; return p; } }
  p = makePerson(rng, { sex: d.sex, ageMonths: rng.int(d.age[0], d.age[1]) * 12 + rng.int(0, 11), job: d.job, traits: d.traits });
  const nm = realmPersonName(rng, realmOf(place), p.sex);
  if (nm) Object.assign(p, nm);
  if (d.race) setRace(p, d.race, rng, { rename: true, last: true, beast: d.beast });
  p.place = place; p.role = 'story'; p.title = d.title; p.skill = rng.int(40, 70);
  g.people.push(p);
  (L(g).placeNpcs[place] ??= []).push(p.id);
  st.npc = p.id;
  return p;
}
const who = (p) => `${p.title ? `${p.title} ` : ''}${p.name}`;
const meet = (g, p, aff = 10) => {
  if (!p.known) { p.known = true; p.affection = Math.max(p.affection, aff); p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 처음 알게 되었다.` }); }
};
// 끝, 또는 몇 달 뒤 다음 장면
const end = (text) => ({ text, next: null });
const later = (text, next, wait) => ({ text, next, wait });

HOOKS.afterMonth.push((g, rng) => {
  if (g.over || traveling(g) || isJailed(g) || !isAdult(g) || L(g).queue.length) return;
  const place = here(g);
  const story = STORIES[place];
  if (!story) return;
  const st = S(g)[place] ??= { step: 0, at: 0 };
  if (st.done || mi(g) < st.at || sceneQueued(g, 'city_story')) return;
  if ((RS(g).lived[realmOf(place)] ?? 0) < 2) return;
  if (story.when && !story.when(g)) return;
  if (!rng.chance(0.3)) return;
  const p = storyNpc(g, rng, place);
  if (!p.alive) { st.done = true; return; }
  queueScene(g, 'city_story', { place, step: st.step });
});
defineScene('city_story', {
  title: (g, s) => STORIES[s.place].steps[s.step].title,
  text: (g, s) => STORIES[s.place].steps[s.step].text(g, storyNpc(g, null, s.place)),
  // 그 고장을 떠났으면 장면을 미룬다 (돌아오면 다시 온다)
  choices: (g, s) => (here(g) !== s.place || !STORIES[s.place]?.steps[s.step] ? [] : STORIES[s.place].steps[s.step].choices).filter((c) => !c.when || c.when(g, storyNpc(g, null, s.place))),
  resolve(g, rng, s, key) {
    const st = S(g)[s.place];
    const p = storyNpc(g, rng, s.place);
    meet(g, p);
    if (!p.alive) { st.done = true; return '그 사람은 이제 세상에 없다.'; }
    const r = STORIES[s.place].steps[s.step].resolve(g, rng, p, key, st) ?? end('');
    if (r.next == null) st.done = true;
    else { st.step = r.next; st.at = mi(g) + (r.wait ?? 3); }
    return r.text;
  },
});

Object.assign(FOES, {
  noble_cadet: { name: '귀족 생도', pow: 16, human: true, weapon: '연습용 장검' },
  slaver: { name: '노예상의 칼잡이', pow: 18, human: true, weapon: '쇠사슬' },
  slaver_captain: { name: '노예선 선장', pow: 40, human: true, leader: true, weapon: '해적 곡도' },
  deep_crawler: { name: '구렁에서 기어 나온 것', pow: 34, bite: true },
  lion_warrior: { name: '사자 부족 전사', pow: 44, leader: true, weapon: '맨주먹과 발톱' },
});

const STORIES = {
  eisen: {
    npc: { sex: 'm', age: [17, 19], job: 'apprentice', race: 'beast', beast: 'wolf', title: '사관생도', traits: ['brave', 'reserved'] },
    steps: [
      {
        title: '연병장 뒤',
        text: (g, p) => `사관학교 연병장 뒤편에서 귀족 출신 생도 넷이 한 생도를 둘러싸고 있다. 회색 늑대 귀를 단 수인 생도, ${J(p.name, '이다/다')}. 하겐 마을, 100년 전 해방된 노예들의 후손. "황제 폐하께서 출신을 안 따진다고 개까지 받으실 줄은 몰랐지." 주먹이 날아갔다.`,
        choices: [{ label: '끼어든다', key: 'help' }, { label: '교관에게 알린다', key: 'report' }, { label: '지나친다', key: 'pass' }],
        resolve(g, rng, p, key) {
          if (key === 'help') {
            p.affection += 20; remember(g, p, '연병장 뒤에서 나를 위해 싸워 줬다', 2, { tag: 'saved', recall: '연병장 뒤에서 네가 끼어들었던 날' });
            queueFight(g, rng, { title: '귀족 생도들', intro: '생도들이 연습용 검을 뽑았다. 진검은 아니지만 맞으면 뼈가 부러진다.', enc: { unit: 'noble_cadet', count: 3, leader: null }, reward: { money: 0, renown: 1 }, avoidLabel: '늑대 생도를 끌고 빠져나간다', avoidText: '생도를 부축해 담을 넘었다. 뒤에서 욕설이 쏟아졌다.' }, { first: true });
            return later('늑대 귀의 생도와 나란히 섰다.', 1, 12);
          }
          if (key === 'report') { p.affection += 8; return later('교관을 불러왔다. 귀족 생도들은 벌점 몇 점으로 끝났다. 수인 생도는 고맙다는 말 대신 오래 나를 보았다.', 1, 12); }
          stress(g, 4);
          return end('발길을 돌렸다. 제국은 출신을 묻지 않는다. 다만 묻는 사람들이 아직 있을 뿐이다.');
        },
      },
      {
        title: '백인대장',
        text: (g, p) => `${J(p.name, '이/가')} 백인대장 시험에서 수석을 했다는 소식이 광장 게시판에 붙었다. 수인으로는 처음이다. 그가 나를 찾아왔다. "그날 일을 잊지 않았어. 내 대대에 자리가 하나 있다. 출신은 안 묻는다. 진짜로."`,
        choices: [
          { label: '그의 대대에 들어간다', key: 'join', when: (g) => g.player.stats.str >= 15 },
          { label: '친구로 남는다', key: 'friend' },
        ],
        resolve(g, rng, p, key) {
          p.job = 'guard'; p.title = '백인대장';
          if (key === 'join' && WORK.imperial_soldier) {
            takeJob(g, 'imperial_soldier', { months: 6 });
            chron(g, `${g.player.name}, 수인 백인대장 ${p.name}의 대대에 들어가다.`);
            return end(`제국군 군복을 받았다. ${J(p.name, '은/는')} 첫날부터 나를 다른 병사와 똑같이 굴렸다. 그게 그의 방식의 고마움이었다.`);
          }
          p.affection += 10;
          return end('술잔을 부딪쳤다. 그는 언젠가 기사가 될 것이다. 그날 그 연병장을 지날 때마다 나를 떠올리겠다고 했다.');
        },
      },
    ],
  },
  solaris: {
    npc: { sex: 'f', age: [30, 45], job: 'priest', title: '성녀파 수녀', traits: ['kind', 'brave'] },
    steps: [
      {
        title: '고해실',
        text: (g, p) => `대성당 고해실의 창살 너머에서 들린 것은 사제의 목소리가 아니었다. 성녀파 수녀 ${p.name}. "교황 성하의 금고에 성녀 리아나의 진짜 유언장이 있어요. 교단이 정치에서 손을 떼라는 내용이죠. 사본 하나를 남쪽 수도원까지 옮겨 줄 사람이 필요해요. 들키면 우리 둘 다 이름이 지워집니다."`,
        choices: [{ label: '맡는다', key: 'take' }, { label: '이단심문소에 고한다', key: 'betray' }, { label: '못 들은 것으로 한다', key: 'no' }],
        resolve(g, rng, p, key) {
          if (key === 'take') return later('창살 사이로 접힌 양피지가 건네졌다. 두 달 뒤, 순례자 행렬이 남쪽으로 떠날 때 함께 가기로 했다.', 1, 2);
          if (key === 'betray') {
            g.player.money += 30; RS(g).piety += 6; addNotoriety(g, 2); stress(g, 10);
            kill(g, p, '이단심문소에서');
            chron(g, `성녀파 수녀 ${p.name}, 이단 혐의로 회색 감옥에 끌려가 돌아오지 않다.`);
            return end('심문관은 은화 서른 닢과 축복을 주었다. 사흘 뒤 그 수녀의 이름이 교적부에서 지워졌다는 말을 들었다.');
          }
          return end('고해실을 나왔다. 그 수녀가 다른 사람을 찾았는지는 모른다.');
        },
      },
      {
        title: '남쪽으로 가는 행렬',
        text: () => '순례자 행렬 속에서 사본을 품에 넣고 걷는다. 성도의 남문에서 이단심문관들이 짐을 하나하나 뒤지고 있다.',
        choices: [{ label: '순례자들 틈에 섞여 지나간다', key: 'blend' }, { label: '사본을 버리고 돌아선다', key: 'drop' }],
        resolve(g, rng, p, key) {
          if (key === 'drop') { p.affection -= 15; return end('사본을 도랑에 흘려보냈다. 수녀는 나를 원망하지 않았다. 그게 더 아팠다.'); }
          if (check(rng, craftOf(g) * 0.4 + g.player.stats.cha * 0.4 + g.player.stats.sen * 0.3, 32)) {
            L(g).renown += 4; p.affection += 25; g.flags = g.flags ?? {}; g.flags.riana_will = true;
            chron(g, `성녀 리아나의 유언장 사본이 남쪽 수도원에 닿다. 성녀파 사이에 조용한 소문이 돌기 시작하다.`);
            return end('심문관이 내 앞의 노파를 붙잡는 사이 문을 지났다. 열흘 뒤 성 리아나 수도원의 문지기에게 양피지를 건넸다. 늙은 원장이 그것을 읽고 오래 울었다.');
          }
          RS(g).banned.holy = mi(g) + 60;
          jail(g, 6);
          return end('품속의 양피지가 걸렸다. 심문관은 내용을 읽지도 않고 불에 던졌다. 여섯 달을 회색 감옥에서 보낸 뒤, 다섯 해 동안 이 나라에 들어오지 말라는 판결과 함께 쫓겨날 것이다.');
        },
      },
    ],
  },
  serenia: {
    npc: { sex: 'f', age: [17, 22], job: 'apprentice', race: 'half_elf', title: '제5탑 학생', traits: ['diligent', 'brave'] },
    steps: [
      {
        title: '사라진 학생',
        text: (g, p) => `호숫가 찻집에서 하프엘프 학생 ${J(p.name, '이/가')} 다가왔다. 눈 밑이 검다. "제 방 친구가 보름째 사라졌어요. 협회는 고향에 돌아갔을 거래요. 그 애 고향은 불탔어요. 돌아갈 데가 없다고요." ${g.flags?.serenia_invited ? '그녀는 내가 협회장에게서 편지를 받은 적이 있다는 걸 알고 있었다.' : ''}`,
        choices: [{ label: '같이 찾아 준다', key: 'help' }, { label: '협회 집행관에게 맡기라고 한다', key: 'no' }],
        resolve(g, rng, p, key) {
          if (key === 'help') { p.affection += 10; return later('사라진 학생의 방을 뒤졌다. 침대 밑에서 제7탑 지하 수로의 열쇠가 나왔다.', 1, 1); }
          return end('그녀는 고개를 숙이고 떠났다. 한 달 뒤 게시판에 그녀의 이름도 실종자 명단에 올랐다.');
        },
      },
      {
        title: '수로 끝의 방',
        text: () => '제7탑 지하 수로 끝, 마법진이 새겨진 철문 너머. 유리관 속에 사라진 학생이 잠들어 있다. 숨은 쉬고 있다. 책상 위에는 시간을 접는 술식이라는 제목의 연구 일지가 펼쳐져 있고, 계단 위에서 발소리가 내려온다.',
        choices: [
          { label: '학생을 깨워 데리고 나간다', key: 'rescue' },
          { label: '연구 일지를 챙긴다', key: 'steal' },
          { label: '협회장 마그누스에게 알린다', key: 'magnus' },
        ],
        resolve(g, rng, p, key) {
          if (key === 'rescue') {
            p.affection += 25; L(g).renown += 3;
            queueFight(g, rng, { title: '금기 파벌', intro: '두건 쓴 마법사들이 계단을 내려왔다. 손끝에서 검은 불꽃이 피어올랐다.', enc: { unit: 'cultist', count: 2, leader: rng.chance(0.4) ? 'cult_priest' : null }, reward: { money: 10, renown: 2 }, avoidLabel: '학생을 업고 수로로 뛰어든다', avoidText: '차가운 물속으로 뛰어들었다. 등 뒤에서 검은 불꽃이 물을 끓였다.' }, { first: true });
            return end('유리관을 깨고 학생을 업었다.');
          }
          if (key === 'steal') {
            const k = gainSkill(g, 'magic', 3, 'int'); addNotoriety(g, 3); reportCrime(g, 'snoop');
            return end(`일지를 품에 넣고 빠져나왔다. 유리관은 뒤에 남았다. 그날 밤부터 일지의 글자가 꿈에 나왔다.${gains([up('마법', k)])}`);
          }
          p.affection -= 5; stress(g, 8);
          return end('협회장은 조용히 고개를 끄덕이며 처리하겠다고 했다. 다음 날 수로 끝의 방은 벽돌로 막혀 있었다. 유리관도, 학생도, 일지도 없었다. 협회장이 왜 그렇게 놀라지 않았는지는 지금도 모르겠다.');
        },
      },
    ],
  },
  barka: {
    npc: { sex: 'f', age: [24, 35], job: 'weaver', race: 'beast', beast: 'cat', title: '끊어진 사슬단', traits: ['brave', 'reserved'] },
    steps: [
      {
        title: '항구 술집',
        text: (g, p) => `항구 술집 구석에서 고양이 귀의 수인 ${J(p.name, '이/가')} 맞은편에 앉았다. 손목에 오래된 쇠사슬 자국이 있다. "사흘 뒤 포르텔에서 노예선이 떠나. 아이들이 서른 명. 의회는 세금만 받으면 눈을 감아. 칼 쓸 줄 아는 손이 필요해."`,
        choices: [{ label: '돕는다', key: 'help' }, { label: '의회 경비대에 그녀를 넘긴다', key: 'sell' }, { label: '거절한다', key: 'no' }],
        resolve(g, rng, p, key) {
          if (key === 'help') { p.affection += 15; return later('그녀가 부두 창고의 그림을 탁자에 그렸다. 사흘 뒤 자정이다.', 1, 1); }
          if (key === 'sell') { g.player.money += 40; addNotoriety(g, 5); kill(g, p, '의회 경비대의 손에'); return end('경비대는 은화 마흔 닢을 주었다. 다음 날 부두에 그녀의 시신이 떠올랐다. 노예선은 예정대로 떠났다.'); }
          return end('그녀는 술값을 놓고 일어섰다. "그래, 다들 그렇지."');
        },
      },
      {
        title: '자정의 부두',
        text: () => '자정의 포르텔 부두. 노예선 갑판에 횃불이 셋. 끊어진 사슬단 다섯이 그림자 속에 엎드려 있다. 신호가 오면 갑판으로 오른다.',
        choices: [{ label: '앞장선다', key: 'lead' }, { label: '사슬을 끊는 일을 맡는다', key: 'chains' }],
        resolve(g, rng, p, key) {
          L(g).renown += 3; p.affection += 15;
          chron(g, `포르텔 부두에서 노예선이 습격당해 수인 아이 서른 명이 풀려나다. 끊어진 사슬단의 짓이라는 소문이 돌다.`);
          if (key === 'lead') {
            queueFight(g, rng, { title: '노예선 갑판', intro: '갑판으로 뛰어올랐다. 칼잡이들이 쇠사슬을 휘두르며 달려들었다.', enc: { unit: 'slaver', count: rng.int(3, 4), leader: 'slaver_captain' }, reward: { money: 20, renown: 3 }, avoidLabel: '아이들을 먼저 내린다', avoidText: '싸움은 사슬단에게 맡기고 아이들을 하나씩 부두로 내렸다.' }, { first: true });
            return end('신호가 왔다.');
          }
          const a = gainStat(g, 'agi', 0.6);
          return end(`선창으로 내려가 사슬을 하나씩 끊었다. 아이들은 울지도 않았다. 우는 법을 잊은 것 같았다.${gains([up('민첩', a)])}`);
        },
      },
    ],
  },
  graubel: {
    npc: { sex: 'm', age: [16, 17], job: 'guard', title: '신병', traits: ['timid', 'kind'] },
    steps: [
      {
        title: '창고의 신병',
        text: (g, p) => `성벽 아래 창고에서 열여섯 살 신병 ${J(p.name, '이/가')} 짚더미 속에 웅크리고 있었다. 지난밤 첫 습격에서 동료 둘이 죽었다. "남쪽으로 갈 거예요. 엄마한테." 변경에서 도망병은 목을 매단다.`,
        choices: [
          { label: '숨겨 주고 남쪽 길을 알려 준다', key: 'hide' },
          { label: '성벽으로 돌아가자고 설득한다', key: 'talk' },
          { label: '장성 대장에게 넘긴다', key: 'turn' },
        ],
        resolve(g, rng, p, key) {
          if (key === 'hide') {
            if (rng.chance(0.35)) { kill(g, p, '도망병으로 교수형'); addNotoriety(g, 2); stress(g, 15); return end('사흘 뒤 남쪽 길에서 그가 붙잡혔다. 광장 교수대에 그가 매달렸다. 누가 길을 알려 줬는지 그는 끝까지 말하지 않았다.'); }
            p.place = 'ern'; p.away = true; p.affection += 20;
            return end('밤에 마구간 수레에 그를 숨겨 내보냈다. 그가 살아서 남쪽에 닿았는지는 모른다. 그랬기를 바란다.');
          }
          if (key === 'talk' && check(rng, g.player.stats.cha * 0.6 + g.player.stats.wil * 0.4, 28)) {
            p.affection += 15;
            return later('"무서운 건 다 똑같아. 도망친 놈만 혼자 무서워." 한참 뒤 그가 짚을 털고 일어났다. 둘이 같이 성벽으로 걸어 올라갔다.', 1, 18);
          }
          if (key === 'talk') { kill(g, p, '도망병으로 교수형'); stress(g, 12); return end('그는 고개를 젓더니 밤중에 사라졌다. 이틀 뒤 늑대 요새 앞에서 붙잡혀 돌아왔다. 교수대는 광장에 있었다.'); }
          kill(g, p, '도망병으로 교수형'); stress(g, 15);
          const o = meetLocal(g, 'graubel', 'official'); if (o) o.affection += 5;
          return end('장성 대장은 고맙다고 했다. 다음 날 아침 광장에서 열여섯 살이 매달렸다. 변경 사람들은 아무 말도 하지 않았다.');
        },
      },
      {
        title: '십인대장',
        text: (g, p) => `그 겁먹은 신병이 이제 십인대장이다. 마족 척후가 성벽을 넘은 밤, 내 등 뒤를 노리던 곡도를 막아선 것이 ${p.name}였다. "그때 창고에서 빚진 거요."`,
        choices: [{ label: '술 한잔 산다', key: 'drink' }],
        resolve(g, rng, p) {
          p.title = '십인대장'; p.affection += 15; L(g).renown += 2;
          remember(g, p, '성벽에서 서로의 목숨을 구했다', 2, { tag: 'saved' });
          return end('성벽 아래 선술집에서 새벽까지 마셨다. 그는 이제 신병들에게 "무서운 건 다 똑같다"고 말한다고 했다.');
        },
      },
    ],
  },
  silverleaf: {
    npc: { role: 'official', sex: 'f', age: [200, 400], job: 'herbalist', race: 'elf', title: '세계수의 정원지기', traits: ['reserved', 'kind'] },
    steps: [
      {
        title: '시든 은잎',
        text: (g, p) => `${J(who(p), '이/가')} 숲 안쪽에서 시든 은잎 한 줌을 들고 나왔다. 엘프는 감정을 잘 드러내지 않는다. 그런데 그녀의 손이 떨리고 있었다. "세계수의 뿌리가 병들고 있다. 장로회는 인간에게 알리지 말라 했다. 하지만 인간의 약초 중에 우리가 모르는 것이 있을지도 모른다."`,
        choices: [
          { label: '약초를 찾아 주겠다고 한다', key: 'herb' },
          { label: '비밀을 지키겠다고 맹세한다', key: 'oath' },
          { label: '인간 왕국에 이 소식을 판다', key: 'sell' },
        ],
        resolve(g, rng, p, key) {
          if (key === 'herb') {
            if ((g.player.skills.herbs ?? 0) >= 30 || check(rng, g.player.stats.sen + (g.player.skills.herbs ?? 0), 50)) {
              p.affection += 30; const k = gainSkill(g, 'herbs', 2, 'sen');
              return later(`에른 숲의 은방울버섯과 늪지의 쓴뿌리를 섞은 고약을 건넸다. 그녀는 오래 냄새를 맡더니 처음으로 웃었다.${gains([up('약초', k)])}`, 1, 6);
            }
            p.affection += 8;
            return end('석 달을 헤맸지만 그녀가 모르는 약초는 없었다. 그래도 그녀는 내가 애쓴 것을 기억하겠다고 했다. 엘프의 기억은 길다.');
          }
          if (key === 'oath') { p.affection += 15; return later('그녀는 내 손바닥에 은잎 하나를 올려놓았다. 맹세의 표시다. 엘프에게 맹세를 어긴 인간의 이야기는 많다.', 1, 12); }
          g.player.money += 60; RS(g).banned.elf = mi(g) + 240; p.affection = -60;
          chron(g, `엘프 왕국의 세계수가 병들었다는 소문이 인간 왕국들에 퍼지다.`);
          return end('레오니아의 상인에게 은화 예순 닢에 팔았다. 한 달 뒤 은잎 마을의 문이 내게 닫혔다. 숲은 스무 해 동안 나를 기억할 것이다.');
        },
      },
      {
        title: '이엘라에서 온 편지',
        text: (g, p) => `${J(p.name, '이/가')} 은빛 잎사귀로 봉한 편지를 건넸다. "여왕께서 그대를 이엘라에 부르셨다. 인간에게는 백 년 만의 일이다."`,
        choices: [{ label: '세계수 아래로 간다', key: 'go' }],
        resolve(g, rng, p) {
          g.flags = g.flags ?? {}; g.flags.elf_invited = true;
          p.affection += 10;
          if (g.player.manaAwakened) g.player.mana += g.player.manaPotential * 2;
          const w = gainStat(g, 'sen', 1.2);
          chron(g, `${g.player.name}, 엘프 여왕의 초대로 세계수의 도시 이엘라에 오르다.`);
          return end(`세계수의 가지 위에 지어진 도시에서 사흘을 보냈다. 여왕 아이리스는 칠백 년을 산 얼굴로 나를 오래 보았다. "인간의 짧은 삶이 가끔은 부럽다." 그 말의 뜻은 그때 몰랐다.${gains([up('감각', w)])}`);
        },
      },
    ],
  },
  hammer: {
    npc: { role: 'official', sex: 'm', age: [80, 160], job: 'smith', race: 'dwarf', title: '장인 길드장', traits: ['diligent', 'reserved'] },
    steps: [
      {
        title: '무너진 갱도',
        text: () => '새벽에 골짜기 안쪽에서 굉음이 울렸다. 셋째 갱도가 무너지고 광부 여섯이 갇혔다. 무너진 돌 너머에서 두드리는 소리가 들린다. 그리고 그보다 더 깊은 곳에서, 무언가가 바위를 긁는 소리도.',
        choices: [{ label: '구조대에 낀다', key: 'dig' }, { label: '물과 버팀목을 나른다', key: 'carry' }, { label: '지켜본다', key: 'watch' }],
        resolve(g, rng, p, key) {
          if (key === 'dig') {
            p.affection += 20;
            queueFight(g, rng, { title: '구렁에서 올라온 것', intro: '갇힌 광부들에게 닿았을 때, 무너진 벽 틈에서 창백한 것들이 기어 나왔다.', enc: { unit: 'deep_crawler', count: rng.int(2, 3), leader: null }, reward: { money: 12, renown: 2 }, avoidLabel: '광부들을 끌고 물러난다', avoidText: '광부들을 끌고 버팀목 사이로 물러났다. 드워프들이 갱도 입구를 다시 막았다.' }, { first: true });
            return later('곡괭이를 들고 갱도로 내려갔다.', 1, 4);
          }
          if (key === 'carry') { const s2 = gainStat(g, 'str', 0.8); p.affection += 10; L(g).renown += 1; return later(`하루 종일 버팀목과 물통을 날랐다. 저녁에 광부 다섯이 살아 나왔다.${gains([up('힘', s2)])}`, 1, 4); }
          return end('사흘 뒤 광부 넷의 이름이 대장간 불 앞에서 불렸다. 드워프들은 울지 않고 망치를 들었다.');
        },
      },
      {
        title: '길드장의 망치',
        text: (g, p) => `장인 길드장 ${J(p.name, '이/가')} 대장간으로 나를 불렀다. "산은 빚을 잊지 않는다. 인간에게는 처음 보여 주는 것이다." 그가 화로에 마석을 던져 넣었다.`,
        choices: [{ label: '칼 한 자루를 받는다', key: 'blade' }, { label: '단조법을 배운다', key: 'learn' }],
        resolve(g, rng, p, key) {
          p.affection += 10;
          if (key === 'blade') {
            const gear = L(g).gear;
            if ((gear.weapon ?? 0) < 16) { gear.weapon = 16; gear.weaponName = '쇠망치 골 길드장의 장검'; }
            chron(g, `${g.player.name}, 쇠망치 골 장인 길드장에게서 칼 한 자루를 받다.`);
            return end('사흘 밤낮을 망치 소리를 들었다. 칼날에 산의 문양이 새겨져 있었다. 드워프가 인간에게 이런 칼을 주는 일은 드물다.');
          }
          const k = gainSkill(g, 'smithing', 5, 'str');
          return end(`그가 쇠를 접는 법을 보여 주었다. 일곱 번 접고, 일곱 번 식힌다. 손이 따라가지 못했다. 그래도 그는 끝까지 보여 주었다.${gains([up('대장일', k)])}`);
        },
      },
    ],
  },
  fur: {
    npc: { role: 'warrior', sex: 'm', age: [22, 28], job: 'adventurer', race: 'beast', beast: 'lion', title: '사자 부족 전사', traits: ['brave', 'cruel'] },
    steps: [
      {
        title: '사자의 도전',
        text: (g, p) => `시장 한가운데에서 황금 갈기의 사자 부족 전사 ${J(p.name, '이/가')} 내 앞을 막았다. "다음 달 나는 대족장 가룸에게 도전한다. 그 전에 이름을 높여야 해. ${playerRace(g) === 'beast' ? '다른 부족의 전사여' : '외지인이여'}, 나와 겨뤄라." 둘레로 사람들이 원을 그렸다.`,
        choices: [{ label: '도전을 받는다', key: 'fight' }, { label: '거절한다', key: 'no' }],
        resolve(g, rng, p, key) {
          if (key === 'fight') {
            queueFight(g, rng, { title: '힘 겨루기', intro: '원 안으로 들어섰다. 칼은 쓰지 않는다. 부족의 법이다.', enc: { unit: 'lion_warrior', count: 1, leader: null }, reward: { money: 0, renown: 3 }, avoidLabel: '패배를 인정한다', avoidText: '무릎을 꿇었다. 사자는 내 어깨를 한 번 치고 원을 나갔다. 비웃음은 없었다.' }, { first: true });
            p.affection += 10;
            return later('사람들의 함성이 커졌다.', 1, 3);
          }
          stress(g, 6);
          return later('고개를 저었다. 둘레에서 야유가 쏟아졌다. 사자는 침을 뱉고 돌아섰다.', 1, 3);
        },
      },
      {
        title: '대족장 결투',
        text: (g, p) => `대족장의 언덕에서 가룸과 ${J(p.name, '이/가')} 마주 섰다. 호랑이와 사자. 부족들이 편을 갈라 함성을 지른다. 결투 전날 밤, 양쪽 모두에게서 사람이 찾아왔다.`,
        choices: [{ label: '가룸 편에 선다', key: 'garum' }, { label: '사자 편에 선다', key: 'lion' }, { label: '누구 편도 들지 않는다', key: 'none' }],
        resolve(g, rng, p, key) {
          const lionWins = rng.chance(key === 'lion' ? 0.45 : 0.3);
          if (lionWins) { chron(g, `수인 부족 연합의 대족장이 바뀌다. 사자 부족의 ${J(p.name, '이/가')} 가룸을 꺾다.`); p.title = '대족장'; }
          else { chron(g, `대족장 가룸이 사자 부족의 도전을 꺾다. 성광국과의 전쟁을 바라는 목소리가 더 커지다.`); if (rng.chance(0.5)) kill(g, p, '대족장 결투에서'); }
          const won = (key === 'lion') === lionWins && key !== 'none';
          if (won) { L(g).renown += 3; return end(`내가 선 쪽이 이겼다. ${lionWins ? '새 대족장' : '가룸'}은 결투가 끝난 뒤 나를 불러 술잔을 건넸다. 부족의 법에서 그것은 형제라는 뜻이다.`); }
          if (key === 'none') return end('언덕 아래에서 결투를 지켜보았다. 부족의 일은 부족이 정한다. 그것이 이 땅의 법이다.');
          stress(g, 10);
          return end('내가 선 쪽이 졌다. 다음 날부터 시장 사람들이 나를 보는 눈이 달라졌다. 부족은 진 쪽을 오래 기억한다.');
        },
      },
    ],
  },
};

/* ---------- 고향 땅의 일거리 ---------- */
const addPlaces = (id, ...places) => { if (WORK[id]) WORK[id].places.push(...places.filter((p) => !WORK[id].places.includes(p))); };
addPlaces('laborer', 'hammer', 'fur');
addPlaces('hunter', 'fur', 'silverleaf');
addPlaces('herbalist', 'silverleaf');
addPlaces('smith', 'hammer');
registerJob('dwarf_apprentice', {
  name: '드워프 공방 견습', places: ['hammer'], skill: 'smithing', stat: 'str', stat2: 'wil', wage: [2, 4, 8, 14], npcJob: 'smith',
  ranks: ['풀무꾼', '견습', '장인', '산의 명장'],
  lines: ['풀무를 하루 종일 밟았다. 명장은 쇠 색깔만 보고 온도를 맞혔다.', '망치질 백 번 중 아흔 번을 다시 하라는 말을 들었다.', '인간 손으로 접은 쇠에 처음으로 드워프 명장이 고개를 끄덕였다.', '화로 불이 꺼지지 않게 밤을 새웠다. 불을 꺼뜨리는 건 조상을 버리는 일이다.'],
});
registerJob('elf_gardener', {
  name: '세계수 정원지기 보조', places: ['silverleaf'], skill: 'herbs', stat: 'sen', wage: [3, 5, 8, 12], npcJob: 'herbalist',
  req: (g) => (['elf', 'half_elf'].includes(playerRace(g)) || g.flags?.elf_invited ? null : '엘프, 하프엘프, 또는 여왕의 초대'),
  lines: ['은잎 나무의 병든 가지를 소리 없이 잘라 냈다.', '이슬이 마르기 전에 달빛 이끼를 거두었다.', '백 년 된 묘목에 말을 거는 정원지기 옆에서 물을 날랐다.'],
});
registerJob('fur_trader', {
  name: '모피 교역 거간', places: ['fur'], skill: 'trade', stat: 'cha', stat2: 'sen', wage: [3, 4, 7, 11], npcJob: 'merchant',
  lines: ['늑대 부족의 모피와 인간 상인의 소금 사이에서 값을 맞췄다.', '사자 부족 전사가 값을 깎으려고 탁자를 내리쳤다. 탁자가 부러졌다.', '매 부족 사냥꾼이 가져온 깃털 한 묶음에 상인들이 몰려들었다.'],
});

/* ---------- 도시마다 할 수 있는 일 (더) ---------- */
const fee = (g, n, fail) => (spend(g, n) ? null : fail);
ACTIONS.push(
  {
    id: 'eisen_arena', place: ['eisen'], name: '제국 투기장',
    desc: '황제가 세운 투기장. 출신을 묻지 않고 이긴 자에게 상금을 준다. 다칠 수 있다.',
    available: (g) => isAdult(g),
    run(g, rng) {
      tired(g, 10);
      queueFight(g, rng, { title: '투기장', intro: '모래 위로 걸어 나갔다. 관중석에서 함성이 쏟아졌다. 맞은편 문이 열렸다.', enc: { unit: rng.pick(['deserter', 'bandit', 'orc']), count: 1, leader: rng.chance(0.25) ? 'bandit_chief' : null }, reward: { money: 15, renown: 2 }, avoidLabel: '항복 깃발을 든다', avoidText: '깃발을 들었다. 관중의 야유 속에 모래를 털고 나왔다.' });
      return '투기장 출전자 명부에 이름을 적었다.';
    },
  },
  {
    id: 'solaris_pilgrims', place: ['solaris'], name: '순례자 길 안내',
    desc: '성녀의 곶으로 가는 순례자들의 길을 안내한다. 품삯은 적지만 믿음이 쌓인다. 가짜 성물 장수가 꼬인다.',
    available: (g) => isAdult(g),
    run(g, rng) {
      tired(g, 12); RS(g).piety += 1;
      const n = rng.int(2, 5); g.player.money += n;
      const w = gainStat(g, 'wil', 0.4), c = gainStat(g, 'cha', 0.3);
      return `${rng.pick(['맨발로 걷는 노파의 짐을 대신 졌다. 그녀는 성녀의 곶에서 죽고 싶다고 했다.', '가짜 성녀 유품을 파는 장수를 순례자들 앞에서 쫓아냈다. 교단 사제는 그 장수에게서 상납을 받고 있었다.', '수녀원에서 자란 고아들이 순례자들에게 빵을 나눠 주었다. 그중 한 아이의 손에서 희미한 빛이 났다.'])} 은화 ${n}닢.${gains([up('의지', w), up('매력', c)])}`;
    },
  },
  {
    id: 'serenia_teahouse', place: ['serenia'], name: '호숫가 찻집 토론',
    desc: '젊은 마법사들과 학자들이 모이는 호숫가 찻집. 머리가 트이고 사람을 사귄다. 찻값이 비싸다.',
    available: (g) => playerAge(g) >= 14,
    run(g, rng) {
      const f = fee(g, 3, '찻값이 모자랐다. 세레니아는 차도 비싸다.'); if (f) return f;
      tired(g, 5); stress(g, -5);
      const i = gainStat(g, 'int', 0.5), c = gainStat(g, 'cha', 0.4), l = gainSkill(g, 'letters', 0.8, 'int');
      const p = meetLocal(g, 'serenia', 'neighbor');
      return `${rng.pick(['마력은 타고나는가 쌓이는가를 두고 두 시진을 다퉜다. 결론은 없었고 찻값만 늘었다.', '엘프 학생이 인간의 마법은 "급하게 쓴 글씨" 같다고 했다. 반박할 말을 찾지 못했다.', '드워프 마도구 기술자가 마석 없이 도는 등불을 꺼내 보였다. 찻집이 조용해졌다.'])}${p ? ` ${J(p.name, '이/가')} 내 말에 끝까지 귀를 기울였다.` : ''}${gains([up('지능', i), up('매력', c), up('글과 학문', l)])}`;
    },
  },
  {
    id: 'barka_harbor', place: ['barka'], name: '항구 술집 소문',
    desc: '뱃사람과 모험가와 밀수꾼이 섞이는 항구 술집. 대륙의 소문이 여기서 먼저 돈다.',
    available: (g) => isAdult(g),
    run(g, rng) {
      tired(g, 4); stress(g, -6);
      const f = fee(g, 1, '술 한 잔 값도 없었다.'); if (f) return f;
      const sn = gainStat(g, 'sen', 0.5), c = gainStat(g, 'cha', 0.3);
      return `${rng.pick(['남해 연맹의 뱃사람이 마대륙으로 가는 뱀길이 다시 열렸다고 속삭였다.', '탑 80층을 넘었다는 파티가 돌아오지 않았다는 이야기에 술집이 잠시 조용해졌다.', '발하르트 군항에 배가 늘었다는 말을 레오니아 상인이 귀담아들었다.', '청동 비늘 문신을 한 낯선 사내가 아무 말 없이 술값을 모두 내고 나갔다. 용이라는 사람도 있었다.'])}${gains([up('감각', sn), up('매력', c)])}`;
    },
  },
  {
    id: 'graubel_forge', place: ['graubel'], name: '드워프 대장간 거들기',
    desc: '변경의 드워프 대장장이를 거든다. 삯은 적지만 쇠 다루는 법을 배운다.',
    available: (g) => playerAge(g) >= 13,
    run(g, rng) {
      tired(g, 14);
      const k = gainSkill(g, 'smithing', 1.6, 'str'), s2 = gainStat(g, 'str', 0.4);
      g.player.money += 1;
      return `${rng.pick(['화살촉 삼백 개를 쳤다. 성벽에서는 하룻밤에 다 쓴다.', '마족의 검은 곡도를 녹여 다시 벼렸다. 쇠가 이상하게 차가웠다.', '드워프 대장장이가 인간치고는 손이 괜찮다고 했다. 칭찬인지 아닌지 한참 생각했다.'])} 은화 1닢.${gains([up('대장일', k), up('힘', s2)])}`;
    },
  },
  {
    id: 'silverleaf_tree', place: ['silverleaf'], name: '은잎 나무 아래 명상',
    desc: '은잎 나무 아래에서 숲의 마력에 귀를 기울인다. 엘프와 하프엘프, 엘프의 벗만 앉을 수 있다.',
    available: (g) => playerAge(g) >= 6 && (['elf', 'half_elf'].includes(playerRace(g)) || g.flags?.elf_invited || treatmentIn(g, 'elf') === 'normal'),
    run(g, rng) {
      tired(g, 4); stress(g, -12);
      const sn = gainStat(g, 'sen', 0.6), w = gainStat(g, 'wil', 0.4);
      const mg = g.player.manaAwakened ? gainSkill(g, 'magic', 1.2, 'sen') : 0;
      if (g.player.manaAwakened) g.player.mana += g.player.manaPotential * 0.5;
      return `${rng.pick(['잎사귀가 바람 없이 흔들렸다. 숲이 숨 쉬는 소리를 처음 들었다.', '엘프 노인이 옆에 앉아 한 시진 동안 아무 말도 하지 않았다. 그게 대화였다.', '나무껍질에 손을 대자 아주 먼 곳에서 무언가가 아파하는 것이 느껴졌다.'])}${gains([up('감각', sn), up('의지', w), up('마법', mg)])}`;
    },
  },
  {
    id: 'silverleaf_trade', place: ['silverleaf'], name: '엘프와 교역',
    desc: '인간의 소금과 쇠를 엘프의 약과 비단과 바꾼다. 엘프는 서두르지 않는다.',
    available: (g) => isAdult(g),
    run(g, rng) {
      tired(g, 6);
      const t = gainSkill(g, 'trade', 1.4, 'cha');
      const stake = Math.min(g.player.money, 12);
      let res = '';
      if (stake >= 4) { const n = Math.round(stake * rng.int(1, 4) / 10); g.player.money += n; res = ` 엘프 약 몇 병을 받아 은화 ${n}닢을 남겼다.`; }
      meetLocal(g, 'silverleaf', 'official');
      return `${rng.pick(['엘프 상인은 값을 한 번만 말했다. 깎으려 하자 조용히 물건을 거뒀다.', '흥정이 사흘 걸렸다. 엘프에게는 짧은 시간이다.', '인간 상인이 엘프 비단을 레오카스트에서 열 배에 판다고 자랑했다. 엘프는 그 말을 듣고도 값을 올리지 않았다.'])}${res}${gains([up('장사', t)])}`;
    },
  },
  {
    id: 'fur_trial', place: ['fur'], name: '힘 겨루기',
    desc: '시장 한가운데 원에서 벌어지는 맨손 힘 겨루기. 이기면 부족의 존중을 얻는다.',
    available: (g) => playerAge(g) >= 14,
    run(g, rng) {
      tired(g, 14);
      const s2 = gainStat(g, 'str', 0.6), a = gainStat(g, 'agi', 0.4);
      const win = check(rng, g.player.stats.str * 0.7 + g.player.stats.agi * 0.4, 38 - (playerRace(g) === 'beast' ? 0 : 4));
      if (win) { L(g).renown += 1; const o = meetLocal(g, 'fur', 'official'); if (o) o.affection += 3; }
      else g.player.injuries.push({ name: '힘 겨루기에서 접질린 어깨', months: 1 });
      return `${win ? rng.pick(['곰 부족 청년을 원 밖으로 밀어냈다. 그가 웃으며 내 손을 잡아 일으켰다.', '세 판을 내리 이겼다. 토템 기둥 아래 노인들이 고개를 끄덕였다.']) : rng.pick(['늑대 부족 소녀에게 세 번 내리 엎어졌다. 둘레에서 웃음이 터졌다. 악의는 없었다.', '어깨가 빠지는 줄 알았다. 이긴 쪽이 내 어깨를 맞춰 주었다.'])}${gains([up('힘', s2), up('민첩', a)])}`;
    },
  },
);

/* ---------- 화면용 ---------- */
// 그 도시의 이야기 줄기가 어디까지 왔나 (도시 정보 칸)
export function cityStory(g, place) {
  const st = RS(g).stories?.[place];
  const story = STORIES[place];
  if (!story) return null;
  return { place, steps: story.steps.length, step: st?.step ?? 0, done: !!st?.done, title: story.steps[Math.min(st?.step ?? 0, story.steps.length - 1)].title };
}
export const STORY_PLACES = Object.keys(STORIES);
// 종족이 어디에 모여 사는지 (지도·종족 설명용)
export const RACE_HOMES = {
  elf: ['silverleaf', 'serenia'], dwarf: ['hammer', 'graubel'], beast: ['fur', 'barka'], half_elf: ['silverleaf', 'serenia'],
};
export { raceOf };
