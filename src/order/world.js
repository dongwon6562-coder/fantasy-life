// 기사단의 세상: 플레이어가 없어도 단장이 늙어 죽고 새 단장이 서며, 재물이 쌓인 기사단은 이단으로 몰려 무너진다.
// 이단 몰이 세 마디: 1 소문과 조사 → 2 새벽의 체포 → 3 판결(해산이나 벌금). 기사단 안의 플레이어는 마디마다 고른다.
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { kill } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { faithState } from '../faith/index.js';
import { J } from '../narrative/text.js';
import { OS, orderOf, inOrder, level, brothers, endService, myOrderName, logOrder, here, stat, clamp, mi, nm, ORDERS, ORDER_IDS } from './core.js';

const WHY = {
  stigma: '성흔기사단이 입단식에서 성광을 모독하는 비밀 의식을 치른다는 고발이 이단심문소에 들어갔다. 고발한 사람은 기사단에 빚진 귀족이라는 말도 돈다',
  march: '잿빛 성벽 기사단이 성벽 너머 마물과 거래하고 마신교도를 숨겨 준다는 고발이 이단심문소에 들어갔다. 지난 죄를 묻지 않는 기사단이라 고발할 거리는 많다',
};
const fallChance = (o) => clamp(0.5 + (o.wealth - 50) / 200 + (o.suspect ?? 0) / 300 - (o.heresy?.plea ?? 0) * 0.18 - (o.heresy?.soft ?? 0) * 0.08, 0.15, 0.9);

function newMaster(g, rng, id, why) {
  const o = orderOf(g, id), names = ORDERS[id].master;
  const old = o.master?.name ?? '단장';
  o.masterN = (o.masterN ?? 0) + 1;
  const rival = names[(o.masterN + 1) % names.length] === old ? names[(o.masterN + 2) % names.length] : names[(o.masterN + 1) % names.length];
  const st = OS(g);
  if (st.me?.id === id && level(g) >= 2 && !st.me.master && !sceneQueued(g, 'order_election')) {
    o.master = { name: `${old}의 빈자리`, born: g.date.year - 40, vacant: true };
    queueScene(g, 'order_election', { id, old, why, rival });
    return;
  }
  o.master = { name: rival, born: g.date.year - rng.int(42, 55) };
  chron(g, `${ORDERS[id].name} 단장 ${J(old, '이/가')} ${why}. 새 단장은 ${rival}.`, st.me?.id === id ? 70 : 25);
  if (st.me?.id === id) logOrder(g, `단장 ${J(old, '이/가')} ${why}. 새 단장은 ${rival}.`);
}

// 한 해에 한 번 (정월)
export function orderYear(g, rng) {
  const st = OS(g);
  for (const id of ORDER_IDS) {
    const o = orderOf(g, id);
    if (o.fallen) continue;
    // 세력과 재물이 조금씩 흔들린다
    o.strength = clamp(o.strength + rng.int(-4, 4), 5, 100);
    // 재물은 쌓이다가도 쓰인다: 오십 언저리로 돌아오려 하고, 성흔기사단은 바치는 사람이 많아 조금 더 쌓인다
    o.wealth = clamp(o.wealth + (50 - o.wealth) * 0.06 + (id === 'stigma' ? rng.int(-2, 4) : rng.int(-3, 3)), 0, 100);
    // 단장의 나이
    if (!(st.me?.id === id && st.me.master) && !o.master?.vacant) {
      const a = g.date.year - (o.master?.born ?? g.date.year - 50);
      if (a >= 58 && rng.chance((a - 56) * 0.03)) newMaster(g, rng, id, rng.chance(0.7) ? '세상을 떠났다' : '늙어 물러났다');
    }
    // 이단 몰이의 시작 (성흔·잿빛 성벽만)
    if (id !== 'royal' && !o.heresy) {
      // 백 년에 한 번 남짓. 곳간이 넘치고 시기하는 눈이 많을수록 잦다
      const risk = 0.0025 + Math.max(0, o.wealth - 55) * 0.0005 + (o.suspect ?? 0) * 0.0003;
      if (rng.chance(risk)) startHeresy(g, rng, id);
    }
  }
}
export function startHeresy(g, rng, id) {
  const o = orderOf(g, id);
  o.heresy = { stage: 1, at: mi(g), next: mi(g) + rng.int(3, 6), plea: 0, soft: 0 };
  const mine = OS(g).me?.id === id;
  chron(g, `이단심문소가 ${J(ORDERS[id].name, '을/를')} 조사하기 시작하다.`, mine ? 80 : 35);
  if (mine) { logOrder(g, '이단심문소가 기사단을 조사하기 시작했다.'); queueScene(g, 'order_heresy', { id, stage: 1 }); }
}

// 달마다: 이단 몰이를 한 마디씩 진행한다
export function orderWorldMonth(g, rng) {
  for (const id of ORDER_IDS) {
    const o = orderOf(g, id);
    if (!o.heresy || o.fallen || mi(g) < o.heresy.next) continue;
    const mine = OS(g).me?.id === id;
    if (o.heresy.stage === 1) {
      o.heresy.stage = 2; o.heresy.next = mi(g) + rng.int(4, 8);
      chron(g, `새벽에 ${ORDERS[id].name}의 기사들이 붙잡혀 가다. 단장 ${o.master?.name ?? ''}도 함께였다.`, mine ? 80 : 40);
      if (mine && !OS(g).me.testified) queueScene(g, 'order_heresy', { id, stage: 2 });
      continue;
    }
    // 판결
    const fall = rng.chance(fallChance(o));
    if (fall) {
      const masterName = o.master?.name ?? '단장';
      o.fallen = { y: g.date.year, why: '이단 판결' };
      o.heresy = null; o.strength = 0; o.wealth = 0;
      chron(g, `${ORDERS[id].name}, 이단 판결로 해산되다. 단장 ${J(masterName, '은/는')} 화형대에 올랐다.`, mine ? 90 : 55);
      // 함께 지낸 형제 기사 몇은 끝내 돌아오지 못한다
      for (const b of (OS(g).me?.id === id ? brothers(g) : [])) if (rng.chance(0.35)) kill(g, b, '이단 판결');
      if (mine) queueScene(g, 'order_fall', { id, master: masterName });
    } else {
      o.heresy = null; o.wealth = clamp(o.wealth - 30, 0, 100); o.suspect = 0;
      chron(g, `${ORDERS[id].name}, 이단 혐의를 벗다. 대신 곳간의 절반을 교단에 바쳤다.`, mine ? 80 : 35);
      if (mine) queueScene(g, 'order_news', { text: '판결이 났다. 이단의 증거는 없었다. 붙잡혀 간 형제들이 하나둘 돌아왔다. 몇은 손가락이 성치 않았다. 곳간의 절반이 교단으로 실려 갔다.' });
    }
  }
}

/* ---------- 장면: 이단 몰이 안에서 ---------- */
defineScene('order_heresy', {
  need: (g, s) => inOrder(g) && OS(g).me.id === s.id && !!orderOf(g, s.id).heresy,
  keep: true,
  title: (g, s) => (s.stage === 1 ? '이단심문소의 눈' : '새벽의 체포'),
  text: (g, s) => (s.stage === 1
    ? `${WHY[s.id]}. 심문관들이 성채 장부를 들고 갔다. 형제들끼리도 말을 아낀다. 누가 무엇을 말할지 아무도 모른다.`
    : `새벽에 성채 문이 부서졌다. 이단심문소 경비병들이 막사마다 들이닥쳤다. 단장이 먼저 끌려 나갔다. 복도 끝에서 내 이름을 부르는 소리가 들린다.`),
  choices: (g, s) => (s.stage === 1
    ? [{ label: '단장 곁에 선다', key: 'stand' }, ...(level(g) >= 1 ? [{ label: '교단과 왕실에 탄원한다', key: 'plead' }] : []), { label: '심문관에게 아는 것을 털어놓는다', key: 'testify' }, { label: '기사단을 떠난다', key: 'flee' }]
    : [{ label: '칼을 내려놓고 끌려간다', key: 'taken' }, { label: '형제들을 이끌고 성채를 빠져나간다', key: 'escape' }, { label: '서약을 부인하고 풀려난다', key: 'recant' }]),
  resolve(g, rng, s, key) {
    const o = orderOf(g, s.id), st = OS(g), pl = here(g), F = faithState(g);
    const name = myOrderName(g);
    if (s.stage === 1) {
      if (key === 'stand') { F.suspicion = clamp(F.suspicion + 10, 0, 100); deed(g, 'loyal', 3, '이단 소문 속에서도 기사단장 곁을 지켰다', pl); return '단장 곁에 섰다. 단장이 내 어깨에 손을 얹었다. 그 손이 떨리고 있었다. 심문관의 장부에 내 이름도 적혔다.'; }
      if (key === 'plead') {
        F.suspicion = clamp(F.suspicion + 5, 0, 100);
        if (check(rng, stat(g, 'cha') * 0.5 + (L(g).renown ?? 0) / 3 + level(g) * 6, 45)) { o.heresy.plea += 1; return '대주교와 왕의 시종장에게 차례로 무릎을 꿇었다. 대주교는 아무 약속도 하지 않았다. 시종장은 왕이 이 일을 지켜보고 있다고만 했다. 그것만으로도 심문관들의 발걸음이 느려졌다.'; }
        return '탄원서는 시종장의 책상에서 더 올라가지 못했다. 돌아오는 길에 누군가 나를 뒤따랐다.';
      }
      if (key === 'testify') {
        st.me.testified = true; o.heresy.plea -= 1;
        F.suspicion = clamp(F.suspicion - 15, 0, 100);
        deed(g, 'loyal', -5, '이단심문소에 기사단 형제들의 일을 털어놓았다', pl);
        for (const b of brothers(g)) b.affection = clamp((b.affection ?? 0) - 40, -100, 100);
        stress(g, 10);
        return '심문관의 방에서 입단식의 일, 곳간의 일, 단장이 한 말을 털어놓았다. 심문관은 친절했다. 그 친절이 가장 무서웠다. 나오는 길에 형제 하나와 눈이 마주쳤다.';
      }
      deed(g, 'loyal', -2, `이단 소문이 돌자 ${J(name, '을/를')} 떠났다`, pl);
      endService(g, '이단 소문 속에 떠남');
      note(g, `이단 소문이 돌자 ${J(name, '을/를')} 떠났다.`);
      return '밤에 망토를 개어 침상 위에 두고 성채를 나왔다. 아무도 막지 않았다. 아무도 배웅하지 않았다.';
    }
    if (key === 'taken') {
      st.me.taken = true;
      g.player.injuries.push({ name: '심문실에서 짓이겨진 손', months: 5 });
      stress(g, 18); tired(g, 25);
      F.suspicion = clamp(F.suspicion + 15, 0, 100);
      deed(g, 'loyal', 3, '이단 몰이 속에서 형제들과 함께 붙잡혀 갔다', pl);
      return '칼을 내려놓았다. 심문실의 밤은 길었다. 물었고, 같은 것을 다시 물었다. 손가락이 하나씩 짓이겨졌다. 형제들의 이름은 말하지 않았다. 판결까지는 몇 달이 남았다.';
    }
    if (key === 'escape') {
      if (check(rng, stat(g, 'agi') * 0.5 + (g.player.skills?.sword ?? 0) * 0.4, 45)) {
        const saved = brothers(g).slice(0, 2);
        for (const b of saved) b.affection = clamp((b.affection ?? 0) + 20, -100, 100);
        F.suspicion = clamp(F.suspicion + 25, 0, 100);
        endService(g, '이단 몰이 때 달아남');
        note(g, `이단 몰이 때 ${name}의 형제들을 이끌고 달아났다.`);
        chron(g, `${nm(g)}, ${name}의 기사들을 이끌고 심문소의 손을 벗어나다.`, 60);
        return `마구간 쪽 쪽문으로 빠져나갔다. ${saved.length ? `${J(saved.map((b) => b.name).join(', '), '이/가')} 뒤를 따랐다. ` : ''}사흘 밤을 달려 국경을 넘었다. 이제 기사단은 없고, 쫓는 눈만 남았다.`;
      }
      g.player.injuries.push({ name: '체포될 때 부러진 팔', months: 4 });
      st.me.taken = true; stress(g, 15);
      return '쪽문 앞에서 붙잡혔다. 팔이 꺾였다. 다른 형제들과 함께 수레에 실렸다.';
    }
    deed(g, 'loyal', -4, '심문소 앞에서 기사단의 서약을 부인했다', pl);
    F.suspicion = clamp(F.suspicion - 10, 0, 100);
    endService(g, '서약을 부인함');
    note(g, `심문소 앞에서 ${name}의 서약을 부인했다.`);
    stress(g, 12);
    return '심문관 앞에서 서약을 부인한다고 말했다. 혀가 그 말을 한 번에 하지 못했다. 풀려났다. 성채 문 앞에 형제들의 망토가 쌓여 불타고 있었다.';
  },
});

defineScene('order_fall', {
  need: (g, s) => inOrder(g) && OS(g).me.id === s.id,
  keep: true,
  title: (g, s) => `${ORDERS[s.id].name}의 마지막 날`,
  text: (g, s) => `판결이 났다. ${J(ORDERS[s.id].name, '은/는')} 이단으로 해산된다. 성채와 곳간은 교단과 왕실이 나눈다. 광장에 화형대가 섰다. 단장 ${J(s.master, '이/가')} 불길 속에서 마지막으로 기사단의 결백을 외쳤다. ${OS(g).me.taken ? '나는 아직 옥에 있다. 심문관이 마지막으로 묻는다.' : '나는 아직 기사단 명부에 있다. 심문관이 마지막으로 묻는다.'} 이단을 자백하면 목숨은 건진다.`,
  choices: () => [{ label: '끝까지 부인한다', key: 'defy' }, { label: '자백하고 목숨을 건진다', key: 'confess' }],
  resolve(g, rng, s, key) {
    const F = faithState(g), name = ORDERS[s.id].name, pl = here(g);
    const wasMaster = OS(g).me.master;
    if (key === 'defy') {
      F.suspicion = clamp(F.suspicion + 25, 0, 100);
      L(g).renown = (L(g).renown ?? 0) + 6;
      deed(g, 'brave', 4, '기사단이 무너지는 날에도 이단 자백을 거부했다', pl);
      deed(g, 'loyal', 4, `무너진 ${name}의 결백을 끝까지 지켰다`, pl);
      g.player.injuries.push({ name: '옥에서 상한 몸', months: 6 });
      endService(g, '기사단이 무너짐 (끝까지 부인함)');
      note(g, `${J(name, '이/가')} 무너졌다. 끝까지 자백하지 않았다.`);
      chron(g, `${nm(g)}, 무너진 ${name}의 기사로 끝내 자백하지 않고 추방되다.`, 70);
      return `끝내 자백하지 않았다. ${wasMaster ? '단장의 사슬이 끊겨 바닥에 떨어졌다. ' : ''}두 철을 옥에서 보낸 뒤 왕의 사면이라는 이름으로 성문 밖에 던져졌다. 망토도 칼도 없었다. 그래도 사람들은 길에서 나를 알아보고 말없이 빵을 건넸다.`;
    }
    deed(g, 'honest', -3, `${J(name, '이/가')} 무너질 때 거짓 자백을 했다`, pl);
    deed(g, 'loyal', -3, `무너진 ${name}의 이단을 자백했다`, pl);
    F.suspicion = clamp(F.suspicion - 5, 0, 100);
    stress(g, 20);
    endService(g, '기사단이 무너짐 (자백함)');
    note(g, `${J(name, '이/가')} 무너졌다. 이단을 자백하고 살아남았다.`);
    return '하지 않은 일을 자백했다. 심문관이 받아 적었다. 다음 날 풀려났다. 광장의 재는 이미 치워져 있었다. 밤마다 불길 속의 목소리가 들렸다.';
  },
});

HOOKS.heir.push((g, rng) => {
  // 단장이던 선대가 떠나면 기사단은 새 단장을 세운다
  for (const id of ORDER_IDS) {
    const o = orderOf(g, id);
    if (o.master?.pid != null && !(OS(g).me?.master)) { o.master = { name: ORDERS[id].master[((o.masterN ?? 0) + 1) % ORDERS[id].master.length], born: g.date.year - 48 }; o.masterN = (o.masterN ?? 0) + 1; }
  }
});
