// 봉인의 한 달: 쐐기가 도둑맞고 되찾아지고, 첩자와 마신교가 늘고 줄고, 세력마다 대응이 바뀌고, 봉인의 힘이 오르내린다.
// 끝은 정해져 있지 않다: 오래 버틸 수도, 노아와 마탑이 다시 묶을 수도, 깨질 수도 있다. 깨진 뒤에도 세상은 계속된다.
import { WORLD_TICKS, nudge } from '../world.js';
import { J } from '../narrative/text.js';
import { SS, clamp, mi, WEDGES, WEDGE_IDS, STAGES, stageOf, sealPower, brokenWedges, slog, learn } from './state.js';

const shift = (g, a, b, n) => { try { POL.shiftRel?.(g, a, b, n); } catch { /* 정세 모듈이 없으면 건너뛴다 */ } };
// 9단계 정세 모듈은 index.js에서 꽂아 준다 (서로 import가 엉키지 않게)
export const POL = {};

function tell(g, say, record, text, big = false) {
  say(text, big);
  slog(g, text);
  if (big) record(text.split('.')[0]);
}

// 이 달에 봉인이 얼마나 깎이나 (world.js의 기본 마모 0~0.06에 더해진다). 양수면 깎인다.
export function wear(g) {
  const S = SS(g), r = g.realm;
  let w = brokenWedges(g).length * 0.012 + S.spies * 0.004 + (S.cult / 100) * 0.02;
  if (S.stance.empire === 'exploit') w += 0.005 + (r?.era ?? 0) * 0.004;
  if (S.stance.tower === 'reinforce') w -= 0.01 + Math.min(1, S.study / 100) * 0.03;
  if (S.stance.church === 'purge') w -= S.council === 'church' ? 0.01 : 0.006;
  if (S.stance.church === 'unite' || S.stance.empire === 'unite') w -= 0.02;
  if (S.me.pact) w += 0.006;
  return w;
}

function stances(g, rng, say, record) {
  const S = SS(g);
  const st = S.stage;
  const was = { ...S.stance };
  if (S.council === 'unite' && S.stance.church !== 'unite') S.stance.church = 'unite';
  if (S.stance.church === 'deny' && st >= 3) S.stance.church = 'purge';
  if (S.stance.tower === 'observe' && st >= 2 && S.study >= 10) S.stance.tower = 'reinforce';
  if (S.stance.crown === 'deny' && st >= 3) S.stance.crown = 'arm';
  if (S.stance.empire === 'exploit' && st >= 4 && ['tower', 'unite'].includes(S.council) && rng.chance(0.01)) S.stance.empire = 'unite';
  // 봉인이 다시 단단해지면 다들 손을 놓는다
  if (st <= 1) { S.stance.crown = 'deny'; if (S.stance.church === 'purge') S.stance.church = 'deny'; if (S.ending !== 'broken') S.council = null; }
  const LINE = {
    church: { purge: '교단이 이단 사냥을 선포했다. 마신교도를 숨겨 준 마을은 통째로 불탄다는 말이 돈다. 성도에서는 용사 의식을 서두른다.', unite: '교황이 마탑에 손을 내밀었다. 오백 년 만에 성광교 사제와 마법사가 한 탁자에 앉았다.' },
    tower: { reinforce: '세레니아의 마탑들이 보강 술식을 짜기 시작했다. 조사단이 북쪽으로 떠났다.' },
    crown: { arm: `레오니아 왕실이 마물 토벌세를 걷기 시작했다. 영주마다 병사를 더 뽑으라는 명이 내려왔다.` },
    empire: { unite: '발하르트 황제가 봉인석 근처 마석 광산을 닫았다. 제국 마법원이 세레니아에 사람을 보냈다.' },
  };
  for (const k of Object.keys(S.stance)) if (S.stance[k] !== was[k] && LINE[k]?.[S.stance[k]]) tell(g, say, record, LINE[k][S.stance[k]], true);
}

function wedges(g, rng, say, record) {
  const S = SS(g);
  // 검은 새벽이 왕도의 성녀 유물을 훔쳤다면 (신앙 모듈의 연대기)
  const ch = g.chronicle ?? [];
  for (let i = Math.min(S.chronAt ?? 0, ch.length); i < ch.length; i++) {
    if (ch[i].text?.includes('성녀의 유물이 사라지다') && S.wedges.leocast === 'whole') { S.wedges.leocast = 'stolen'; slog(g, '왕도 대성당 지하의 성녀 유골함이 사라졌다.'); }
  }
  S.chronAt = ch.length;
  for (const id of WEDGE_IDS) {
    if (id === 'noah') continue;
    const w = S.wedges[id];
    if (w === 'stolen') {
      if (rng.chance(0.025 + (S.stance.church === 'purge' ? 0.02 : 0))) { S.wedges[id] = 'whole'; tell(g, say, record, `${J(WEDGES[id].keeper, '이/가')} 도둑맞았던 ${J(WEDGES[id].name, '을/를')} 되찾았다. 훔친 자들은 광장에서 목이 매달렸다.`); }
      else if (rng.chance(0.012)) { S.wedges[id] = 'broken'; tell(g, say, record, `사라졌던 ${J(WEDGES[id].name, '이/가')} 산산이 부서진 채 발견되었다. 조각마다 검은 그을음이 묻어 있었다.`, true); }
    } else if (w === 'broken') {
      if (S.stance.tower === 'reinforce' && S.study >= 40 && rng.chance(0.006)) { S.wedges[id] = 'whole'; tell(g, say, record, `마탑과 ${J(WEDGES[id].keeper, '이/가')} 함께 ${J(WEDGES[id].name, '을/를')} 새로 깎아 세웠다. 옛것만은 못하다고 한다.`, true); }
    }
  }
  // 도둑: 마신교의 세와 첩자 수만큼
  const whole = WEDGE_IDS.filter((id) => id !== 'noah' && S.wedges[id] === 'whole');
  if (whole.length && rng.chance(0.001 + (S.cult / 100) * 0.003 + S.spies * 0.0005)) {
    const id = rng.pick(whole);
    S.wedges[id] = 'stolen';
    tell(g, say, record, S.known >= 2 ? `${J(WEDGES[id].name, '이/가')} 도둑맞았다. ${J(WEDGES[id].keeper, '은/는')} 쉬쉬하지만 아는 사람은 안다. 봉인의 쐐기 하나가 빠졌다.` : `${WEDGES[id].place ? '먼 곳' : '북쪽'}에서 오래된 성물이 도둑맞았다는 소문이 돈다. 무엇에 쓰는 물건인지 아는 사람은 드물다.`, S.known >= 2);
  }
}

function shadows(g, rng) {
  const S = SS(g), st = S.stage;
  if (S.spies < 12 && rng.chance(0.015 * st + (S.me.pact ? 0.02 : 0))) S.spies += 1;
  if (S.spies > 0 && rng.chance(S.stance.church === 'purge' ? 0.04 : 0.01)) S.spies -= 1;
  const target = 15 + st * 8 + (g.faith?.dawn ? 3 : 0) - (S.stance.church === 'purge' ? 12 : 0);
  S.cult = clamp(S.cult + (target - S.cult) * 0.02 + rng.normal(0, 0.4), 0, 100);
  if (S.stance.tower === 'reinforce' || st >= 2) S.study = clamp(S.study + 0.05 + (S.stance.tower === 'reinforce' ? 0.05 : 0), 0, 100);
  // 마물과 북쪽의 마왕군이 봉인을 따라 움직인다
  if (st >= 2) nudge(g, 'monsters', st * 0.03 - (S.stance.crown === 'arm' ? 0.08 : 0));
  if (st >= 3) nudge(g, 'garbes', st * 0.02);
  if (S.stance.church === 'purge') nudge(g, 'heroRite', 0.15);
  // 서로를 탓한다
  if (st >= 4 && S.council !== 'unite') shift(g, 'holy', 'serenia', -0.08);
}

// 봉인이 바닥에 가까우면 노아와 마탑이 마지막 의식을 치른다. 결과는 정해져 있지 않다.
function greatRite(g, rng, say, record) {
  const S = SS(g), r = g.realm;
  const noah = g.legends?.list?.find((x) => x.id === 'noah');
  const helped = (S.riteHelp ?? 0) + (S.stance.church === 'unite' ? 1 : 0) + (S.stance.empire === 'unite' ? 1 : 0) + Math.min(2, S.study / 40);
  const roll = rng.next() + helped * 0.08;
  S.rite = true;
  if (roll > 0.62) {
    r.seal = 80; for (const id of WEDGE_IDS) if (id !== 'noah') S.wedges[id] = 'whole';
    r.noahLight = true;
    S.ending = 'resealed'; S.endedAt = mi(g); S.spies = Math.floor(S.spies / 3); S.cult *= 0.5;
    tell(g, say, record, `북쪽 하늘이 사흘 밤낮 하얗게 탔다. ${noah?.alive === false ? '노아의 제자들과' : '노아와'} 마탑의 마법사들이 마신의 관 둘레에 새 봉인을 그었다. 돌아온 이는 절반이 안 된다. 봉인은 다시 묶였다. 얼마나 갈지는 아무도 모른다.`, true);
  } else if (roll > 0.3) {
    r.seal = Math.min(100, r.seal + 22);
    tell(g, say, record, '마탑의 마법사 백 명이 북쪽으로 갔다. 봉인석의 금 몇 줄이 메워졌다. 다 메우지는 못했다. 마흔 명이 돌아오지 않았다.', true);
  } else {
    tell(g, say, record, '북쪽에서 치른 큰 의식이 실패했다. 술식이 거꾸로 튀어 마법사들이 재가 되었다는 소문이 돈다. 봉인은 그대로 갈라져 있다.', true);
    nudge(g, 'monsters', 6);
  }
}
function breakSeal(g, rng, say, record) {
  const S = SS(g);
  S.ending = 'broken'; S.endedAt = mi(g);
  learn(g, 3);
  nudge(g, 'monsters', 30); nudge(g, 'garbes', 40);
  for (const id of WEDGE_IDS) if (id !== 'noah' && S.wedges[id] === 'whole' && rng.chance(0.5)) S.wedges[id] = 'broken';
  tell(g, say, record, '그 밤, 대륙의 모든 개가 한꺼번에 짖었다. 북쪽 끝에서 검은 빛기둥이 솟았다. 마신의 봉인이 깨졌다. 마신이 깨어났는지는 아직 아무도 모른다. 다만 마왕령의 군세가 일제히 움직이기 시작했다.', true);
  shift(g, 'holy', 'serenia', 30); shift(g, 'leonia', 'valhart', 20);
}

WORLD_TICKS.push((g, rng, say, record) => {
  if (!g.seal || !g.realm) return;
  const S = SS(g), r = g.realm;
  wedges(g, rng, say, record);
  shadows(g, rng);
  r.seal = clamp(r.seal - wear(g) + rng.normal(0, 0.01), 0, 100);
  // 깨진 뒤: 마탑과 교단이 손잡고 조사가 쌓이면 다시 묶을 수 있다
  if (S.ending === 'broken') {
    if (S.stance.tower === 'reinforce' && (S.stance.church === 'unite' || S.council === 'tower' || S.council === 'unite') && S.study >= 60 && rng.chance(0.004)) {
      r.seal = 55; S.ending = 'resealed'; S.endedAt = mi(g); S.rite = true;
      tell(g, say, record, '깨진 봉인 자리에 새 봉인이 그어졌다. 교단의 기도와 마탑의 술식이 한 원 안에 들어간 것은 처음이다. 마왕령의 군세가 북쪽으로 물러가기 시작했다.', true);
    }
  } else if (r.seal < 0.5) breakSeal(g, rng, say, record);
  else if (r.seal < 14 && !S.rite) greatRite(g, rng, say, record);
  if (r.seal > 55 && S.rite) { S.rite = false; S.riteCycle = (S.riteCycle ?? 0) + 1; S.riteHelp = 0; }
  const st = stageOf(r.seal);
  if (st !== S.stage) {
    const up = st > S.stage;
    S.stage = st;
    if (up) { tell(g, say, record, `${STAGES[st].desc}`, st >= 2); if (st >= 3) learn(g, 1); }
    else if (st <= 1 && S.stage >= 0) slog(g, '봉인의 울림이 잦아들었다. 사람들은 다시 북쪽을 잊어 간다.');
  }
  // 대륙 회의: 흔들림 단계에 처음 닿으면 한 번 (플레이어가 끼어들지 않았으면 저절로 정해진다)
  if (S.stage >= 4 && !S.council && mi(g) - (S.councilAt ?? mi(g)) >= 6) {
    S.council = rng.pick(['church', 'tower', 'unite', 'split', 'split']);
    tell(g, say, record, S.council === 'church' ? '솔라리스에서 열린 대륙 회의는 교단의 손을 들어 주었다. 이단 사냥과 용사 의식에 금화가 몰린다.' : S.council === 'tower' ? '대륙 회의는 마탑의 보강 술식에 돈을 대기로 했다. 교단은 불만을 숨기지 않았다.' : S.council === 'unite' ? '대륙 회의 끝에 교황과 협회장이 같은 문서에 인장을 찍었다. 기도와 술식을 함께 쓰기로 한 것이다.' : '대륙 회의는 아무것도 정하지 못하고 흩어졌다. 나라마다 제 성벽만 높인다.', true);
    if (S.council === 'tower') S.study = clamp(S.study + 20, 0, 100);
  }
  if (S.stage >= 4) S.councilAt ??= mi(g);
  stances(g, rng, say, record);
});
