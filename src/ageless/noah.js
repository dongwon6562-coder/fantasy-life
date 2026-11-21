// 27단계: 노아 실마리. 상태는 g.noah 하나(대를 넘어 남는다: 집안이 모은 조각), 화면 연결점은 noahInfo(g).
// 500년 전 용사 일행의 마법사 노아가 아직 살아 있다는 조각들을 모은다.
// - 감시탑 불 소문(world.js의 noahLight가 바뀔 때), 꿈속 목소리(legends의 noah_word), 학자에게 들은 말(heard_noah_truth),
//   노아의 반지(relic rl_ring을 내가 쥐면), 북쪽의 목격담(noah_sighting), 옛 편지(noah_archive, 세레니아·성도 서고).
// - 조각이 셋 넘게 모이면 변경백령에서 북쪽 감시탑으로 찾아갈 수 있다(noah_seek → noah_journey → noah_meet).
// - 노아는 불로의 길이 여럿이라는 것만 조각으로 알려 준다. 길의 조건은 끝까지 다 말하지 않는다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat, gainSkill, circleOf } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, check, traveling, tired } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed } from '../crime.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const here = (g) => L(g).place ?? 'ern';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 103) ^ Math.imul(mi(g) * 73 + salt + 59, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;

export const CLUES = {
  light: '꺼졌다 켜지는 감시탑의 불',
  voice: '꿈에서 들은 아주 오래된 목소리',
  scholar: '"노아 님은 늙지도 죽지도 않는다"는 학자의 말',
  ring: '노아의 반지에 남은 온기',
  sighting: '얼음 해협 쪽으로 걸어가던 젊은 얼굴의 사내',
  letter: '이백 년 전 마탑 서기가 받은 편지의 서명',
};
// 노아가 알려 주는 조각 (다른 길 갈래가 읽는다: noahHint(g, 'dragon') 등)
export const HINTS = {
  dragon: '용왕들은 저마다 참이름이 있네. 사람의 입으로 끝까지 부른 이는 드물지.',
  blood: '피로 세월을 셈하는 법도 있네. 그 셈은 늘 다른 사람이 치르지.',
  seventh: '일곱째 원에 닿으면 몸이 흐름에서 빠져나온다네. 나는 그렇게 여기 남았지.',
};

export function noahState(g) {
  g.noah ??= {};
  const v = g.noah;
  v.clues ??= {};       // { 조각 id: 얻은 해 }
  v.met ??= null;       // 만난 해
  v.hints ??= {};       // { dragon|blood|seventh: 들은 해 }
  v.lastLight ??= null;
  v.seekAt ??= -99;
  v.archiveAt ??= -99;
  v.sceneAt ??= 0;
  v.tries ??= 0;
  v.log ??= [];
  return v;
}
const V = noahState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 16) v.log.shift(); }
export const clueCount = (g) => Object.keys(V(g).clues).length;
export const noahMet = (g) => !!V(g).met;
export const noahHint = (g, id) => !!V(g).hints[id];
function addClue(g, id) {
  const v = V(g);
  if (v.clues[id]) return false;
  v.clues[id] = g.date.year;
  log(g, `노아의 조각: ${CLUES[id]}.`);
  return true;
}

export function noahInfo(g) {
  const v = V(g);
  if (!clueCount(g) && !v.met) return null;
  return {
    clues: Object.entries(v.clues).map(([id, y]) => ({ text: CLUES[id] ?? '알 수 없는 조각', y })),
    count: clueCount(g), met: v.met, canSeek: clueCount(g) >= 3 && !v.met,
    hints: Object.keys(v.hints).map((id) => HINTS[id]).filter(Boolean),
    log: v.log.slice(-6).map((x) => ({ ...x })),
  };
}

/* ---------- 조각 ---------- */
defineScene('noah_sighting', {
  title: () => '얼음 해협 쪽의 사내',
  text: () => '눈보라가 잠깐 걷힌 사이, 얼음 해협 쪽으로 혼자 걸어가는 사내를 보았다. 외투는 오래된 마탑식이었고 얼굴은 젊었다. 그런데 걸음걸이가 늙은이 같았다. 발자국이 눈에 거의 남지 않았다.',
  choices: (g) => (ready(g) && !V(g).clues.sighting ? [
    { key: 'follow', label: '뒤를 따라가 본다', hint: '추위가 매섭다' },
    { key: 'ask', label: '마을 늙은이들에게 묻는다', hint: '오래 산 사람들은 무언가 안다' },
    { key: 'no', label: '헛것이라 여긴다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    if (!ready(g)) return '눈보라가 다시 몰아쳤다.';
    if (k === 'no') return '눈을 비볐다. 아무도 없었다. 그날 밤 꿈에 그 걸음걸이가 나왔다.';
    addClue(g, 'sighting');
    if (k === 'follow') { tired(g, 15); stress(g, 4); return '반나절을 따라갔지만 발자국은 얼음 위에서 끊겼다. 끊긴 자리에 서리로 그린 일곱 개의 고리가 녹아 가고 있었다.'; }
    return '마을 끝 집 노파가 화로를 뒤적이며 말했다. "그분은 쉰 해에 한 번쯤 내려오시오. 우리 할머니도 봤다 했고, 나도 처녀 때 봤소. 얼굴이 똑같았지."';
  },
});
ACTIONS.push({
  id: 'noah_archive', name: '노아의 옛 편지를 찾는다', icon: 'scroll',
  desc: '서고 깊은 곳에서 노아가 남긴 편지의 흔적을 찾는다. 이미 무언가를 들은 사람만 무엇을 찾아야 할지 안다.',
  available: (g) => ready(g) && ['serenia', 'solaris'].includes(here(g)) && clueCount(g) >= 1 && !V(g).clues.letter && skill(g, 'letters') >= 30 && mi(g) - V(g).archiveAt >= 6,
  run(g, rng) {
    const v = V(g);
    v.archiveAt = mi(g);
    tired(g, 6); gainSkill(g, 'letters', 0.4, 'int');
    if (check(rng, skill(g, 'letters') * 0.6 + stat(g, 'int') * 0.4, 45)) {
      addClue(g, 'letter');
      return '이백 년 전 서기의 일지 사이에 접힌 편지 한 장. "탑의 불을 지키는 데 기름이 모자라네. 북쪽 해협 너머로 보내 주게." 서명은 N 한 글자와 일곱 개의 고리. 서기는 그 옆에 "또 왔다"라고 적어 두었다.';
    }
    return rng.pick([
      '먼지만 마셨다. 서고지기는 노아의 이름을 듣더니 웃었다. "그분 편지를 찾는 사람이 한 해에 둘은 와요."',
      '목록에 있는 상자가 비어 있었다. 누가 먼저 가져갔거나, 처음부터 없었다.',
    ]);
  },
});

/* ---------- 찾아가기 ---------- */
ACTIONS.push({
  id: 'noah_seek', name: '북쪽 감시탑으로 노아를 찾아간다', icon: 'road',
  desc: '얼음 해협을 건너 북쪽 끝 감시탑까지. 돌아오지 못한 사람이 더 많다.',
  available: (g) => ready(g) && playerAge(g) >= 18 && here(g) === 'graubel' && clueCount(g) >= 3 && !V(g).met && mi(g) - V(g).seekAt >= 12 && !sceneQueued(g, 'noah_journey'),
  run(g) {
    V(g).seekAt = mi(g);
    queueScene(g, 'noah_journey', {}, { first: true });
    return '변경백령의 마지막 초소에서 개썰매와 길잡이를 구했다. 길잡이는 해협 건너까지는 안 간다고 했다.';
  },
});
defineScene('noah_journey', {
  title: () => '얼음 해협',
  text: () => '해협 위의 얼음이 끝없이 이어진다. 바람이 사람 목소리처럼 운다. 사흘째 되던 날, 길잡이가 썰매를 멈췄다. "여기서부터는 혼자 가시오. 저 불빛이 보이면 감시탑이오. 안 보이면 돌아오시오."',
  choices: (g) => (ready(g) && !V(g).met ? [
    { key: 'go', label: '혼자 건넌다', hint: '힘과 의지가 버팀목이다' },
    { key: 'back', label: '돌아선다', hint: '다음 겨울을 기약한다' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!ready(g) || v.met) return '해협은 그해 얼지 않았다.';
    if (k === 'back') { stress(g, 4); return '썰매를 돌렸다. 등 뒤에서 아주 희미한 불빛이 한 번 깜빡인 것 같았다.'; }
    v.tries += 1;
    tired(g, 25);
    const ok = check(rng, stat(g, 'str') * 0.3 + stat(g, 'wil') * 0.5 + (g.realm?.noahLight ? 10 : 0) + v.tries * 4, 48);
    if (ok) { queueScene(g, 'noah_meet', {}, { first: true }); return '불빛은 생각보다 가까웠다. 얼음 위에 솟은 돌탑. 문은 잠겨 있지 않았다.'; }
    if (rng.chance(0.12)) { L(g).pendingDeath = '북쪽 얼음 해협을 건너다 돌아오지 못했다'; return '바람이 방향을 지웠다. 불빛은 끝내 보이지 않았다.'; }
    g.player.fatigue = Math.min(100, g.player.fatigue + 25); stress(g, 10);
    return '이틀을 걸었지만 불빛은 보이지 않았다. 손가락 두 개의 감각이 돌아오지 않은 채 초소로 돌아왔다. 길잡이는 아무것도 묻지 않았다.';
  },
});
defineScene('noah_meet', {
  title: () => '감시탑의 사람',
  text: (g) => `탑 꼭대기에 불이 있고, 그 옆에 한 사람이 앉아 있다. 얼굴은 서른 남짓인데 눈은 그렇지 않다. "${g.player.name}. 조각을 모아 여기까지 온 사람은 오랜만이군." 그는 불에서 눈을 떼지 않았다. "물을 게 있으면 하나만 묻게. 둘은 대답하지 않네."`,
  choices: (g) => (base(g) && !V(g).met ? [
    { key: 'seal', label: '봉인에 대해 묻는다', hint: '' },
    { key: 'ageless', label: '늙지 않는 법을 묻는다', hint: '' },
    { key: 'teach', label: '가르침을 청한다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!base(g) || v.met) return '눈을 떴을 때 탑은 보이지 않았다.';
    v.met = g.date.year;
    note(g, '북쪽 감시탑에서 노아를 만났다.');
    chron(g, `${g.player.name}, 북쪽 얼음 해협 너머 감시탑에서 대마도사 노아를 만나다.`, 60);
    log(g, '감시탑에서 노아를 만났다.');
    (g.flags ??= {}).noah_met = g.date.year;
    if (k === 'seal') {
      if (g.seal?.me) g.seal.me.fragments = (g.seal.me.fragments ?? 0) + 2;
      gainStat(g, 'int', 1);
      return '"쐐기는 여섯이네. 다섯은 사람들이 지키고, 하나는 내가 지키지. 사람들이 지키는 것부터 무너질 걸세. 늘 그랬어." 그는 불에 마른 나뭇가지를 하나 넣었다. "내려가게. 그리고 다섯 개를 세어 보게."';
    }
    if (k === 'ageless') {
      v.hints.dragon = g.date.year; v.hints.blood = g.date.year; v.hints.seventh = g.date.year;
      return `그는 오래 웃었다. 웃음이 기침이 되었다. "길은 여럿이네. ${HINTS.dragon} ${HINTS.blood} ${HINTS.seventh}" 그가 처음으로 나를 보았다. "어느 길이든, 끝에 서면 같은 걸 보게 돼. 다들 먼저 가는 걸 지켜보는 일."`;
    }
    if (circleOf(g) >= 4) { gainSkill(g, 'magic', 4, 'int'); gainStat(g, 'wil', 1); v.hints.seventh = g.date.year; return '그는 내 손바닥에 손가락으로 원을 그렸다. 하나, 둘, 넷, 다섯. 여섯째에서 손이 멈췄다. "여기까지는 혼자 오게. 일곱째는 아무도 가르쳐 줄 수 없네." 손바닥이 사흘 동안 얼음처럼 차가웠다.'; }
    gainStat(g, 'wil', 1);
    return '"원을 넷은 그리고 오게. 그 전에는 내 말이 바람 소리로만 들릴 걸세." 그래도 그는 내게 따뜻한 물 한 잔을 주었다. 그 물은 내려오는 내내 식지 않았다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const light = !!g.realm?.noahLight;
  if (v.lastLight != null && v.lastLight !== light && base(g)) addClue(g, 'light');
  v.lastLight = light;
  if (g.flags?.noah_word) addClue(g, 'voice');
  if (g.flags?.heard_noah_truth) addClue(g, 'scholar');
  if (g.relic?.r?.rl_ring?.holder === 'me') addClue(g, 'ring');
  if (!ready(g) || v.met || v.clues.sighting || mi(g) - v.sceneAt < 6) return;
  const r = ownRng(g, 5);
  const north = ['graubel', 'hammer'].includes(here(g));
  if (r.chance(north ? 0.012 : 0.0008)) { v.sceneAt = mi(g); queueScene(g, 'noah_sighting', {}); }
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
