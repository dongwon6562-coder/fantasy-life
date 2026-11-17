// 매달: 새 사건이 벌어지고, 오래된 사건은 식고, 진범은 돈을 내밀거나 보복하고, 잘못 끝낸 일은 들통나고,
// 선대가 남긴 옛 미제가 다시 떠오른다.
import { HOOKS } from '../hooks.js';
import { playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, check } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { reportCrime } from '../crime.js';
import { GANGS, myGang } from '../underworld/gangs.js';
import { J } from '../narrative/text.js';
import { M, KINDS, mi, here, placeName, free, stat, skill, bigTown, openHere, caseById, culpritOf, kindName, caseTitle, closeCase, makeCase, logMystery } from './core.js';
import { conclude } from './probe.js';

const hashOf = (s) => [...s].reduce((a, ch) => a + ch.charCodeAt(0), 0);
const scapegoat = (c) => c.suspects.find((s) => !s.guilty && !s.cleared) ?? c.suspects.find((s) => !s.guilty) ?? null;
export const offerOf = (c) => Math.round(40 * (bigTown(c.place) ? 1.5 : 1));

HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const m = M(g), pl = here(g), now = mi(g);
  // 1) 새 사건: 고장마다 정해진 달에 (rng를 아무 달에나 쓰지 않는다)
  if (pl && free(g) && playerAge(g) >= 14 && !openHere(g) && m.cases.length < 3 && (now + hashOf(pl)) % 19 === 0) {
    const c = makeCase(g, rng, pl);
    if (Array.isArray(g.news)) g.news.unshift({ text: `${placeName(pl)}에 ${kindName(c)} 소문이 돈다. ${caseTitle(c)}.`, rel: 70 });
    logMystery(g, `${caseTitle(c)}: ${kindName(c)} 사건이 벌어졌다.`);
  }
  // 2) 오래 묵은 사건은 식는다
  for (const c of [...m.cases]) if (c.state === 'open' && now - c.at > 36) { closeCase(g, c, 'cold'); logMystery(g, `${caseTitle(c)}: 아무도 풀지 못한 채 잊혀 갔다.`); }
  // 3) 진범이 움직인다 (그 고장에 있을 때)
  const c = openHere(g);
  const cul = c && culpritOf(c);
  if (c && cul && free(g) && !sceneQueued(g, 'mystery_offer') && !sceneQueued(g, 'mystery_revenge')) {
    if (c.heat >= 2 && !c.offered) { c.offered = true; queueScene(g, 'mystery_offer', { id: c.id }); }
    else if (c.heat >= 3 && !c.struck) { c.struck = true; queueScene(g, 'mystery_revenge', { id: c.id }); }
  }
  // 4) 조직의 앙갚음
  if (m.grudge && now - m.grudge.at >= 3 && free(g) && !sceneQueued(g, 'mystery_revenge')) {
    const gid = m.grudge.gang; m.grudge = null;
    if (GANGS[gid] && myGang(g)?.id !== gid) queueScene(g, 'mystery_revenge', { gang: gid });
  }
  // 5) 잘못 끝낸 일이 들통난다
  for (const x of m.cold) {
    if (!(x.state === 'wrong' || x.state === 'framed') || x.exposed || now - (x.closedAt ?? 0) > 120) continue;
    if (!rng.chance(x.state === 'framed' ? 0.015 : 0.01)) continue;
    x.exposed = true;
    const mine = x.by === g.player.name;
    if (x.state === 'framed') { deed(g, 'honest', mine ? -14 : -5, `${J(x.accused ?? '죄 없는 사람', '을/를')} 돈을 받고 범인으로 몰았던 일이 드러났다.`, x.place); if (mine) reportCrime(g, 'fraud', x.place, { mult: 0.5 }); }
    else deed(g, 'honest', mine ? -6 : -2, `${J(x.accused ?? '죄 없는 사람', '을/를')} 잘못 범인으로 몰았던 일이 드러났다.`, x.place);
    stress(g, mine ? 8 : 3);
    note(g, `${caseTitle(x)}: ${J(x.culprit ?? '다른 사람', '이/가')} 진범이었다는 것이 드러났다.`);
    logMystery(g, `${caseTitle(x)}: 진범이 따로 있었다는 것이 드러났다.`);
    if (Array.isArray(g.news)) g.news.unshift({ text: `${x.year}년 ${caseTitle(x)} 사건의 진범이 따로 있었다는 소문이 돈다. 그때 사람을 몰아세운 것은 ${mine ? '나였다' : `${x.by}, 우리 집안 사람이었다`}.`, rel: 80 });
    break;
  }
  // 6) 옛 미제가 다시 떠오른다: 선대가 남긴 일, 열 해가 지나고, 그 고장에 왔을 때
  if (free(g) && !sceneQueued(g, 'mystery_old') && now % 5 === 0) {
    const old = m.cold.find((x) => x.ancestor && !x.resurfaced && !x.covered && x.place === pl && now - x.at >= 120 && x.state !== 'cleared');
    if (old) { old.resurfaced = true; queueScene(g, 'mystery_old', { id: old.id }); }
  }
});

/* ---------- 진범이 돈을 내민다: 엉뚱한 사람을 몰아라 ---------- */
defineScene('mystery_offer', {
  need: (g, s) => { const c = caseById(g, s.id); return free(g) && !!c && c.state === 'open' && c.place === here(g) && !!culpritOf(c) && !!scapegoat(c); },
  title: () => '밤의 손님',
  text: (g, s) => {
    const c = caseById(g, s.id), cul = culpritOf(c), sc = scapegoat(c);
    return `밤늦게 누가 문을 두드렸다. 두건을 깊이 쓴 ${J(cul.name, '이/가')} 서 있었다. 탁자에 은화 ${offerOf(c)}닢이 든 주머니를 놓았다. "${J(sc.name, '이/가')} 했다고 하시오. 그러면 다들 편해지오." 그 말이 곧 자백이었다.`;
  },
  choices: (g, s) => {
    const c = caseById(g, s.id);
    return [
      { label: `돈을 받고 ${J(scapegoat(c).name, '을/를')} 범인으로 몬다`, key: 'take' },
      { label: '주머니를 밀어낸다', key: 'refuse' },
      { label: '그 자리에서 경비대를 부른다', key: 'call' },
    ];
  },
  resolve(g, rng, s, key) {
    const c = caseById(g, s.id);
    if (!c || c.state !== 'open') return '그 일은 이미 끝나 있었다.';
    const cul = culpritOf(c), sc = scapegoat(c);
    if (key === 'take' && sc) {
      const pay = offerOf(c);
      g.player.money += pay;
      return conclude(g, rng, c, sc, true, { framed: true, paid: pay });
    }
    if (key === 'call' && cul) {
      if (check(rng, stat(g, 'agi') * 0.5 + stat(g, 'str') * 0.5, cul.pointed ? 30 : 50)) return conclude(g, rng, c, cul, true);
      c.heat += 1;
      return `소리를 지르는 사이 ${J(cul.name, '은/는')} 창문으로 빠져나갔다. 경비대는 증거가 없다며 돌아갔다. 이제 그쪽도 숨기지 않을 것이다.`;
    }
    c.heat += 1;
    deed(g, 'honest', 2, '진범이 내민 돈을 밀어냈다.', c.place);
    return `주머니를 밀어냈다. ${J(cul?.name ?? '손님', '은/는')} 한참 나를 보다가 말없이 나갔다. 문 앞에 침 뱉은 자국이 남았다.`;
  },
});

/* ---------- 진범(또는 조직)의 보복 ---------- */
defineScene('mystery_revenge', {
  need: (g, s) => free(g) && (s.gang ? !!GANGS[s.gang] : (() => { const c = caseById(g, s.id); return !!c && c.state === 'open' && !!culpritOf(c); })()),
  title: (g, s) => (s.gang ? `${GANGS[s.gang].name}의 앙갚음` : '어두운 골목'),
  text: (g, s) => {
    if (s.gang) return `${GANGS[s.gang].name}의 장물을 들춘 값을 받으러 왔다. 골목 양쪽에서 몽둥이를 든 사내 넷이 걸어 나왔다.`;
    const c = caseById(g, s.id), cul = culpritOf(c);
    if (c.kind === 'poison') return `저녁 국에서 쓴맛이 났다. 숟가락을 내려놓았다. 부엌 뒷문으로 누가 달아나는 소리가 들렸다. ${cul.name}의 그림자였다.`;
    return `골목 모퉁이를 도는데 뒤에서 발소리가 붙었다. 돌아보니 ${J(cul.name, '이/가')} 칼을 쥐고 서 있었다. "그만 캐라고 했을 텐데."`;
  },
  choices: (g, s) => [
    { label: '맞선다', key: 'fight' },
    { label: '달아난다', key: 'flee' },
    ...(s.gang ? (g.player.money >= 30 ? [{ label: '은화 30닢을 내밀고 빈다', key: 'pay' }] : []) : [{ label: '이 일에서 손을 떼겠다고 한다', key: 'drop' }]),
  ],
  resolve(g, rng, s, key) {
    const c = s.gang ? null : caseById(g, s.id);
    if (!s.gang && (!c || c.state !== 'open')) return '그 일은 이미 끝나 있었다.';
    const hurt = (name) => { g.player.injuries.push({ name, months: 2 }); };
    if (key === 'fight') {
      const ok = check(rng, stat(g, 'str') * 0.5 + stat(g, 'agi') * 0.4 + skill(g, 'sword') * 0.4, s.gang ? 55 : 45);
      deed(g, 'brave', 2, '보복하러 온 자들에게 맞섰다.');
      if (ok) {
        if (s.gang) { stress(g, -2); return `첫 사내의 몽둥이를 빼앗아 둘째의 무릎을 쳤다. 나머지는 달아났다. ${GANGS[s.gang].name}도 당분간은 건드리지 않을 것이다.`; }
        const cul = culpritOf(c);
        return `칼을 쥔 손목을 비틀어 땅에 눌렀다. 사람들이 몰려왔다. ${conclude(g, rng, c, cul, true)}`;
      }
      hurt(s.gang ? '뒷골목에서 맞은 상처' : '보복에 당한 칼자국');
      stress(g, 6);
      if (c) c.heat = 1;
      return s.gang ? '넷은 너무 많았다. 정신을 차려 보니 진창에 엎어져 있었다.' : `칼끝이 팔을 그었다. ${J(culpritOf(c).name, '은/는')} 어둠 속으로 사라졌다. 그래도 이제 확실해졌다.`;
    }
    if (key === 'pay' && s.gang) {
      if (g.player.money < 30) return '내밀 돈이 없었다. 몇 대 맞고 끝났다.';
      g.player.money -= 30; stress(g, 3);
      return '주머니를 통째로 내밀었다. 두목의 오른팔이 세어 보더니 고개를 까딱했다. "다음은 없다."';
    }
    if (key === 'drop' && c) {
      M(g).dropped += 1;
      closeCase(g, c, 'dropped');
      stress(g, 5);
      logMystery(g, `${caseTitle(c)}: 진범의 칼 앞에서 손을 뗐다.`);
      return '손을 들었다. "이제 묻지 않겠소." 칼끝이 천천히 내려갔다. 살았다. 그런데 그 뒤로 거울을 보기가 싫었다.';
    }
    stress(g, 4);
    if (c) c.heat = 1;
    return '돌아서서 뛰었다. 숨이 턱에 닿을 때까지. 오늘은 넘겼다.';
  },
});

/* ---------- 선대의 옛 미제 ---------- */
const OLD_HOW = ['헐린 집 벽 속에서 누렇게 바랜 편지가 나왔다.', '죽어 가는 노인이 나를 불렀다. 내 집안 사람을 찾고 있었다고 했다.', '예배당 고해록 한 장이 장터에 흘러나왔다.'];
defineScene('mystery_old', {
  need: (g, s) => free(g) && M(g).cold.some((x) => x.id === s.id),
  title: (g, s) => { const x = M(g).cold.find((y) => y.id === s.id); return `옛 미제: ${caseTitle(x)}`; },
  text: (g, s) => {
    const x = M(g).cold.find((y) => y.id === s.id);
    const truth = x.none ? KINDS[x.kind].none : `${J(x.culprit ?? culpritOf(x)?.name ?? '알 수 없는 사람', '이/가')} 진범이었다`;
    const wronged = (x.state === 'wrong' || x.state === 'framed') && x.accused;
    return `${OLD_HOW[x.id % OLD_HOW.length]} ${x.year}년 ${placeName(x.place)}의 ${kindName(x)} 사건, ${x.by}의 이름이 적힌 일이다. ${truth}.${wronged ? ` 그때 ${x.by}의 말 한마디에 ${J(x.accused, '이/가')} 죄를 뒤집어썼다.${x.state === 'framed' ? ' 돈이 오갔다는 것까지 적혀 있다.' : ''}` : ''}`;
  },
  choices: (g, s) => {
    const x = M(g).cold.find((y) => y.id === s.id);
    const wronged = (x.state === 'wrong' || x.state === 'framed') && x.accused;
    return wronged
      ? [{ label: '광장에서 진실을 밝히고 억울한 이름을 씻어 준다', key: 'clear' }, { label: '집안의 수치다. 불에 넣는다', key: 'bury' }]
      : [{ label: '진상을 밝힌다', key: 'reveal' }, { label: '지나간 일이다. 묻어 둔다', key: 'bury' }];
  },
  resolve(g, rng, s, key) {
    const m = M(g), x = m.cold.find((y) => y.id === s.id);
    if (!x) return '그 종이는 어디론가 사라졌다.';
    if (key === 'bury') {
      if (x.state === 'wrong' || x.state === 'framed') { deed(g, 'honest', -2, '선대의 잘못을 알고도 덮었다.', x.place); stress(g, 4); }
      x.covered = true;
      return '종이를 불에 넣었다. 재가 날려 가는 것을 끝까지 보았다.';
    }
    m.oldSolved += 1;
    if (key === 'clear') {
      const give = Math.min(30, g.player.money);
      g.player.money -= give;
      deed(g, 'honest', 6, `선대가 억울하게 몰았던 ${x.accused}의 이름을 씻어 주었다.`, x.place);
      deed(g, 'kind', 3, '억울한 집안에 사과했다.', x.place);
      x.state = 'cleared'; x.exposed = true;
      chron(g, `${g.player.name}, ${x.year}년 ${placeName(x.place)} ${kindName(x)} 사건의 억울한 이름을 씻다.`, 60);
      logMystery(g, `${caseTitle(x)}: 선대가 몰았던 억울한 이름을 씻었다.`);
      return `광장에 서서 읽었다. 내 집안 사람이 틀렸다고. 늙은 여인 하나가 앞으로 나와 오래 울었다. ${give ? `그 집에 은화 ${give}닢을 건넸다. ` : ''}돈으로 될 일이 아니라는 것은 안다.`;
    }
    x.state = 'cleared';
    deed(g, 'honest', 3, `${x.year}년의 옛 미제를 풀었다.`, x.place);
    renownUp(g, 2);
    chron(g, `${g.player.name}, ${x.year}년 ${placeName(x.place)} ${kindName(x)} 사건의 진상을 밝히다.`, 50);
    logMystery(g, `${caseTitle(x)}: 대를 넘어 풀었다.`);
    note(g, `${x.year}년 ${caseTitle(x)}의 진상을 밝혔다.`);
    return `편지를 들고 촌장을 찾아갔다. 늙은이들이 모여 앉아 그해 이야기를 했다. ${x.none ? KINDS[x.kind].noneText(x) : `${J(x.culprit ?? culpritOf(x)?.name ?? '그 사람', '은/는')} 이미 오래전에 죽었다. 그래도 누가 했는지는 이제 모두가 안다.`}`;
  },
});
const renownUp = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
