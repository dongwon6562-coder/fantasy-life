// 27단계: 스스로 고르는 죽음. 상태는 g.farewell 하나, 화면 연결점은 farewellInfo(g).
// 아무 때나 누르는 행동은 없다. 뜻 있는 순간에만 장면의 선택지로 나온다.
// - 희생: 전쟁터에서 뒤를 막기(farewell_rearguard, 기세가 꺾인 원정), 흔들리는 쐐기에 목숨을 묶기(farewell_wedge), 역병 마을에 남기(farewell_plague, 약초·의술을 아는 사람만, 꼭 죽지는 않는다).
// 스무 살이 넘은 사람에게만 온다.
// - 명예: 사로잡힌 몸으로 배신을 강요받을 때(farewell_honor).
// - 불로를 내려놓기(farewell_letgo): 오래 산 불로가 식구를 다 보낸 뒤. 내려놓고 남은 세월을 살거나, 삶을 마친다.
// 죽는 방법은 그리지 않고 장면을 닫는다. 남은 사람들의 반응은 대를 이은 뒤 그 집안의 기록으로 남긴다. 미화하지 않는다.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { outbreaksAt } from '../health/index.js';
import { SS, WEDGES } from '../seal/state.js';
import { loseAgeless, playerAgeless, agelessYears } from '../ageless/core.js';
import { byId } from '../npc.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 127) ^ Math.imul(mi(g) * 97 + salt + 73, 2654435761)) | 0 });
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending && !L(g).pendingDeath;
const jo = (w, pair) => J(w, pair).slice(String(w).length);
const KIND = { rearguard: '뒤를 막고 남음', wedge: '쐐기에 목숨을 묶음', plague: '역병 마을에 남음', honor: '배신 대신 죽음', letgo: '불로를 내려놓고 삶을 마침' };

export function farewellState(g) {
  g.farewell ??= {};
  const v = g.farewell;
  v.last ??= null;     // { kind, name, y, place, kin } 이번 대에 스스로 고른 죽음 (대 잇기 때 기록으로 넘긴다)
  v.past ??= [];       // 집안에 남은 이야기 [{ kind, name, y }]
  v.seen ??= {};       // { kind: 마지막으로 장면이 온 달 }
  v.stayed ??= 0;      // 역병 마을에 남았다가 살아남은 수
  v.refused ??= 0;     // 고르지 않은 수
  v.log ??= [];
  return v;
}
const V = farewellState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 16) v.log.shift(); }
const kinCount = (g) => { const p = me(g); const sp = p?.spouseId ? byId(g, p.spouseId) : null; return (sp?.alive ? 1 : 0) + (p?.childIds ?? []).filter((id) => byId(g, id)?.alive).length; };

export function farewellInfo(g) {
  const v = V(g);
  if (!v.past.length) return null;
  return { past: v.past.slice(-8).map((x) => ({ ...x, what: KIND[x.kind] ?? '스스로 고른 끝' })), stayed: v.stayed };
}

// 죽음을 고른다: 방법은 그리지 않는다. 기록만 남기고 장면을 닫는다.
function choose(g, kind, cause) {
  const v = V(g);
  v.last = { kind, name: g.player.name, y: g.date.year, place: here(g), kin: kinCount(g) };
  v.past.push({ kind, name: g.player.name, y: g.date.year });
  if (v.past.length > 12) v.past.shift();
  L(g).pendingDeath = cause;
  chron(g, `${g.player.name}, ${placeName(here(g))}에서 ${KIND[kind]}.`, 90);
}
const declined = (g) => { V(g).refused += 1; };

/* ---------- 희생 ---------- */
defineScene('farewell_rearguard', {
  title: () => '뒤를 막을 사람',
  text: () => '퇴각 나팔이 울렸다. 좁은 다리 하나를 누군가 막아야 나머지가 강을 건넌다. 대장이 둘러보았다. 아무도 앞으로 나서지 않았다. 다들 고향에 기다리는 사람이 있다. 나도 그렇다.',
  choices: (g) => (base(g) && g.army?.campaign ? [
    { key: 'stay', label: '남아서 다리를 막는다', hint: '돌아가지 못한다' },
    { key: 'go', label: '함께 물러난다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    if (!base(g) || !g.army?.campaign) return '나팔이 다시 울렸다. 다리는 다른 사람이 막았다.';
    if (k === 'go') { declined(g); stress(g, 10); deed(g, 'brave', -2, '다리에서 물러났다'); return '강을 건넜다. 뒤를 돌아보지 않으려 했다. 그날 다리에 남은 사람은 아랫마을 대장장이 아들이었다. 그 이름은 오래 잊히지 않았다.'; }
    deed(g, 'brave', 15, '퇴각하는 동료들을 위해 다리에 남았다');
    choose(g, 'rearguard', '퇴각하는 동료들을 건너보내려 다리에 남았다');
    return '방패를 고쳐 잡고 다리 한가운데 섰다. 등 뒤에서 발소리가 멀어졌다. 마지막 발소리가 사라질 때까지 세었다. 거기서 셈이 끝났다.';
  },
});
defineScene('farewell_wedge', {
  title: () => '흔들리는 쐐기',
  text: (g, s) => `${WEDGES[s.wedge]?.name ?? '쐐기'}에 금이 갔다. 지키는 이들이 밤새 술식을 덧그렸지만 금은 자란다. 늙은 파수꾼이 말했다. "옛 기록에 따르면, 사람 하나의 목숨을 묶으면 한 세대는 버틴다고 하오. 그 기록을 따른 사람은 셋. 셋 다 돌아오지 않았소."`,
  choices: (g, s) => (base(g) && SS(g).wedges?.[s.wedge] && SS(g).wedges[s.wedge] !== 'whole' && here(g) === WEDGES[s.wedge]?.place ? [
    { key: 'bind', label: '내 목숨을 쐐기에 묶는다', hint: '봉인이 한 세대 버틴다. 돌아오지 못한다' },
    { key: 'no', label: '물러선다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const S = SS(g);
    if (!base(g) || !S.wedges?.[s.wedge] || S.wedges[s.wedge] === 'whole') return '그사이 금은 다른 손으로 메워졌다.';
    if (k === 'no') { declined(g); return '물러섰다. 파수꾼은 나를 탓하지 않았다. 그는 아무도 탓하지 않았다. 그게 더 무거웠다.'; }
    S.wedges[s.wedge] = 'whole';
    if (g.realm) g.realm.seal = clamp((g.realm.seal ?? 60) + 15, 0, 100);
    if (S.me) S.me.wedgeSaved = (S.me.wedgeSaved ?? 0) + 1;
    deed(g, 'brave', 12, '봉인의 쐐기에 목숨을 묶었다');
    choose(g, 'wedge', `${WEDGES[s.wedge]?.name ?? '봉인의 쐐기'}에 목숨을 묶었다`);
    return '파수꾼이 술식판 앞의 자리를 비켜 주었다. 손바닥을 차가운 돌에 얹었다. 금이 멈추는 소리가 들렸다. 그 뒤의 일은 기록에 없다.';
  },
});
defineScene('farewell_plague', {
  title: () => '남을 것인가',
  text: (g, s) => `${placeName(here(g))}에 ${s.sick}${jo(s.sick, '이/가')} 크게 돈다. 성한 사람들은 수레에 짐을 싣는다. 앓는 사람들은 수레에 실리지 않는다. 마지막 수레가 떠나기 전에 누가 물었다. "같이 안 가오?"`,
  choices: (g) => (base(g) && !isJailed(g) && outbreaksAt(g, here(g)).length ? [
    { key: 'stay', label: '남아서 앓는 이들을 돌본다', hint: '살아 나올 수도, 못 나올 수도 있다' },
    { key: 'go', label: '수레에 오른다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!base(g)) return '수레는 떠났다.';
    if (k === 'go') { declined(g); return '수레에 올랐다. 고갯마루에서 돌아보니 마을 굴뚝 몇 개에서만 연기가 올랐다. 그 연기를 피우는 사람이 누구일지 생각했다.'; }
    deed(g, 'kind', 14, '역병이 도는 마을에 남아 앓는 이들을 돌봤다');
    if (rng.chance(0.45)) { choose(g, 'plague', `${s.sick}${jo(s.sick, '이/가')} 도는 마을에 남아 앓는 이들을 돌보다 같은 병에 쓰러졌다`); return '석 달 동안 물을 길어 나르고, 이불을 빨고, 이름을 적었다. 적은 이름 가운데 마지막 몇 줄은 다른 사람의 글씨다.'; }
    v.stayed += 1; stress(g, 15); g.player.fatigue = Math.min(100, g.player.fatigue + 30);
    L(g).renown = (L(g).renown ?? 0) + 6;
    log(g, `${placeName(here(g))}의 역병 속에 남았다가 살아 나왔다.`);
    return '석 달 뒤 병이 물러갔다. 남은 사람은 처음의 절반이었다. 나는 그 절반에 들었다. 왜 내가 살았는지는 모른다. 돌아온 이웃들은 나를 보고 고개를 숙였다. 나는 그 인사를 받을 수 없었다.';
  },
});

/* ---------- 명예 ---------- */
defineScene('farewell_honor', {
  title: () => '목숨값',
  text: (g) => `${g.army?.captive?.by ?? '적'}의 장교가 지도를 펼쳤다. "그대 군대의 보급로를 짚어 주면 내일 아침 풀어 주겠소. 아니면 내일 아침 성벽에 매달리겠지." 그는 펜을 내 앞에 놓았다.`,
  choices: (g) => (base(g) && g.army?.captive ? [
    { key: 'refuse', label: '펜을 밀어 놓는다', hint: '내일 아침이 마지막이다' },
    { key: 'sign', label: '지도를 짚는다', hint: '산다. 그 길로 다니는 사람들은 모른다' },
  ] : []),
  resolve(g, rng, s, k) {
    if (!base(g) || !g.army?.captive) return '장교는 다시 오지 않았다.';
    if (k === 'sign') {
      declined(g);
      g.army.captive = null;
      deed(g, 'loyal', -20, '사로잡혀서 제 편의 보급로를 팔았다');
      L(g).notoriety = (L(g).notoriety ?? 0) + 8; stress(g, 20);
      return '손가락으로 길 하나를 짚었다. 다음 날 아침 정말로 풀려났다. 한 달 뒤 그 길에서 보급대가 몰살당했다는 소식을 들었다. 그 소식을 전한 사람은 내가 왜 살아 돌아왔는지 묻지 않았다.';
    }
    deed(g, 'loyal', 15, '사로잡혀서도 제 편을 팔지 않았다');
    choose(g, 'honor', `사로잡혀 배신을 강요받았으나 끝내 거절했다`);
    return '펜을 밀어 놓았다. 장교는 한참 나를 보다가 펜을 집어 넣었다. 그날 밤 감방의 작은 창으로 별이 보였다. 아침은 오래 걸리지 않았다.';
  },
});

/* ---------- 불로를 내려놓기 ---------- */
defineScene('farewell_letgo', {
  title: () => '멈춘 몸',
  text: (g) => `불로가 된 지 ${agelessYears(g)}해. ${kinCount(g) ? '식구들은 아직 곁에 있지만, 나는 그들보다 오래 남을 것이다.' : '나를 처음 이름으로 부르던 사람들은 이제 아무도 없다.'} 멈춘 것을 다시 흐르게 할 수 있다는 것을 안다. 흐르기 시작하면, 밀린 세월이 한꺼번에 온다.`,
  choices: (g) => (base(g) && playerAgeless(g) ? [
    { key: 'age', label: '불로를 내려놓고 남은 세월을 산다', hint: '다시 늙는다. 밀린 세월이 몸에 온다' },
    { key: 'end', label: '내려놓고 삶을 마친다', hint: '이 삶이 끝나고 대를 잇는다' },
    { key: 'stay', label: '아직은 이대로 산다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    if (!base(g) || !playerAgeless(g)) return '그 생각은 다음으로 미뤘다.';
    if (k === 'stay') { declined(g); return '아직은 아니다. 그렇게 정했다. 언제가 될지는 정하지 못했다.'; }
    loseAgeless(g, k === 'end' ? '불로를 내려놓고 삶을 마쳤다' : '불로를 내려놓았다');
    if (k === 'age') {
      note(g, '불로를 내려놓았다. 다시 늙기 시작했다.');
      log(g, '불로를 내려놓았다.');
      return '한 달 사이에 거울 속 얼굴이 변했다. 무릎이 아프고 아침잠이 줄었다. 시장에서 처음으로 할아버지 소리를 들었다. 이상하게 웃음이 났다.';
    }
    choose(g, 'letgo', '오래 멈춰 있던 몸을 내려놓았다');
    return '마지막으로 동네를 한 바퀴 걸었다. 우물, 대장간, 오래된 무덤들. 하나씩 인사했다. 그날 밤 등불을 끄고 누웠다. 이야기는 여기서 닫힌다.';
  },
});

/* ---------- 한 달: 뜻 있는 순간이 오면 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending || L(g).pendingDeath) return;
  if (!base(g) || playerAge(g) < 20) return;
  const v = V(g);
  const r = ownRng(g, 5);
  const now = mi(g);
  const gap = (kind, n) => now - (v.seen[kind] ?? -999) >= n;
  const fire = (kind, data) => { v.seen[kind] = now; queueScene(g, kind, data, { first: true }); };
  const c = g.army?.campaign;
  if (c && c.month >= 1 && (c.morale ?? 60) < 55 && gap('farewell_rearguard', 24) && !sceneQueued(g, 'farewell_rearguard') && r.chance(0.04)) return fire('farewell_rearguard', {});
  if (g.army?.captive && gap('farewell_honor', 36) && !sceneQueued(g, 'farewell_honor') && r.chance(0.08)) return fire('farewell_honor', {});
  if (g.army?.campaign || g.army?.captive || isJailed(g) || g.bondage?.slave) return;
  const wedge = Object.entries(WEDGES).find(([id, w]) => w.place && w.place === here(g) && SS(g).wedges?.[id] && SS(g).wedges[id] !== 'whole');
  if (wedge && gap('farewell_wedge', 60) && r.chance(0.04)) return fire('farewell_wedge', { wedge: wedge[0] });
  const ob = outbreaksAt(g, here(g)).filter((o) => o.sev >= 0.5);
  // 남을 까닭이 있는 사람에게만: 약초나 의술을 아는 사람, 또는 아픈 이들을 돌보는 일을 하는 사람
  const carer = (g.player.skills?.herbs ?? 0) >= 15 || /priest|heal|doctor|herb|cleric|apothec|nun/.test(L(g).job?.id ?? '') || !!g.apothecary?.shop;
  if (ob.length && carer && gap('farewell_plague', 48) && r.chance(0.04)) return fire('farewell_plague', { sick: ob[0].name });
  if (playerAgeless(g) && gap('farewell_letgo', 120)) {
    const yrs = agelessYears(g);
    if ((yrs >= 30 && kinCount(g) === 0) || yrs >= 80) { if (r.chance(0.03)) return fire('farewell_letgo', {}); }
  }
});

/* ---------- 대 잇기: 남은 사람들 ---------- */
const AFTER = {
  rearguard: (n) => `다리에서 살아 돌아온 병사들이 ${n}의 이름을 댔다. 시신은 돌아오지 않았다. 빈 관을 묻는 날, 막내는 끝까지 울지 않다가 밤에 혼자 울었다. 마을은 그 다리를 한동안 ${n}의 다리라고 불렀다. 몇 해 뒤에는 다들 그냥 다리라고 불렀다.`,
  wedge: (n) => `파수꾼이 ${n}의 외투와 신발을 들고 왔다. 봉인은 버틴다고 했다. 식구들은 그 말보다 빈 신발을 오래 보았다. 교단은 감사장을 보냈다. 그 감사장으로는 겨울 장작을 살 수 없었다.`,
  plague: (n) => `역병이 물러간 뒤 돌아온 사람들이 ${n}의 무덤을 찾았다. 살아남은 아이 하나가 그 이름을 외워 두었다고 했다. 집안 사람들은 왜 같이 떠나지 않았느냐고 묻고 싶었지만 물을 사람이 없었다.`,
  honor: (n) => `사로잡혔던 ${n}${jo(n, '이/가')} 끝내 입을 열지 않았다는 이야기가 포로 교환 때 전해졌다. 군대는 훈장 하나를 보냈다. 식구들은 그 훈장을 상자에 넣고 뚜껑을 닫았다.`,
  letgo: (n) => `${n}${jo(n, '이/가')} 몇 해를 살았는지 정확히 아는 사람은 없다. 장례에 온 사람들은 저마다 다른 이름으로 그를 기억했다. 집안 족보에는 그 이름이 여러 줄에 걸쳐 적혀 있다.`,
};
HOOKS.heir.push((g) => {
  const v = V(g), last = v.last;
  if (!last) return;
  const text = AFTER[last.kind]?.(last.name) ?? `${last.name}의 끝은 스스로 고른 것이었다. 남은 사람들은 오래 그 이야기를 하지 않았다.`;
  note(g, text);
  log(g, text);
  v.last = null;
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
