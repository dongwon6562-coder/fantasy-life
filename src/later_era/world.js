// 뒤 시대의 세계 흐름: 세력이 새 기술에 서는 법, 마석 고갈 걱정, 마석 값과 마나. 플레이어 없이도 매달 굴러간다.
import { WORLD_TICKS } from '../world.js';
import { AFTER_TECH } from '../techtree/grow.js';
import { syncMana } from '../mana/state.js';
import { LE, SIDES, SIDE_IDS, REACT, HUNGRY, RELIEF, clamp, llog, laterRng } from './state.js';

const MARKETS = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'serenia', 'barka', 'graubel', 'portel', 'fur', 'hammer', 'klein', 'gorge', 'silverleaf', 'ern', 'gruental'];
const inv = (g) => g.history?.inventions ?? [];
const has = (g, id) => inv(g).includes(id);
const power = (g, side) => g.history?.powers?.[SIDES[side].power] ?? 45;

// 기술이 나오면 세력들이 저마다 선다
AFTER_TECH.push((g, t, who, say) => {
  const R = REACT[t.id];
  if (!R) return;
  const S = LE(g);
  let loud = null;
  for (const [side, [d, text]] of Object.entries(R)) {
    S.stance[side] = clamp(S.stance[side] + d, -100, 100);
    S.last[side] = text;
    llog(g, text);
    if (!loud || Math.abs(d) > Math.abs(loud[0])) loud = [d, text];
  }
  if (loud) say(loud[1]);
});

// 세력이 미는 기술과 막는 기술: techtree가 g.later.mul을 읽는다
function favors(g) {
  const S = LE(g), m = {};
  const war = !!(g.realm?.balhart?.war || g.realm?.north?.war);
  // 교단이 꺼리면 의술 갈래가 더디다 (교단이 셀수록)
  if (S.stance.faith < -15) { const k = clamp(1 - Math.max(0, power(g, 'faith') - 35) / 140, 0.6, 1); m.diagnose = k; m.medicine = k; m.healstone = Math.max(k, 0.85); }
  // 마탑이 앞장서면 마법 갈래, 마석 걱정이 크면 정련·축마를 서두른다
  if (S.stance.tower > 15) { m.resonance = 1.15; m.crystal = 1.15; m.floatstone = 1.1; }
  if (S.deplete >= 35) { m.refinery = (m.refinery ?? 1) * 1.25; m.manacell = (m.manacell ?? 1) * 1.3; }
  // 마탑이 수정구를 쥐고 있으면 왕실과 상단이 공명 술식 뒤쪽을 덜 민다
  if (has(g, 'crystal') && S.stance.crown < 0) m.manacell = (m.manacell ?? 1) * 0.9;
  // 상단이 반기면 공장·은행·증기선
  if (S.stance.trade > 20 && power(g, 'trade') >= 45) { m.factory = 1.15; m.stonebank = 1.15; m.steamship = 1.1; m.belt = 1.1; }
  // 왕실은 전쟁 때 총포와 북부 길을 민다
  if (war && S.stance.crown > 0) { m.rifling = 1.25; m.gun = 1.25; m.northrail = 1.3; m.survey = 1.15; }
  S.mul = m;
}

export function laterMonth(g, say) {
  if (!g.later || !g.history) return;
  const S = LE(g), rng = laterRng(g, 1);
  // 태도는 천천히 가운데로 돌아오고, 세력의 힘에 조금씩 끌린다
  for (const side of SIDE_IDS) S.stance[side] = clamp(S.stance[side] * 0.999 + rng.normal(0, 0.25), -100, 100);
  // 마석 고갈 걱정
  const tide = g.mana?.tide ?? 0;
  const eat = Object.entries(HUNGRY).reduce((s, [id, w]) => s + (has(g, id) ? w : 0), 0);
  const ease = Object.entries(RELIEF).reduce((s, [id, w]) => s + (has(g, id) ? w : 0), 0);
  const target = clamp(eat * 1.2 - ease - tide * 0.15, 0, 100);
  const before = S.deplete;
  S.deplete = Math.round(clamp(S.deplete + (target - S.deplete) * 0.02 + rng.normal(0, 0.3), 0, 100) * 10) / 10;
  if (before < 25 && S.deplete >= 25 && S.worry < 1) { S.worry = 1; say('얕은 마석 갱들이 하나둘 비어 간다. 마석이 언젠가 바닥날 거라는 말이 학자들 입에서 처음 나왔다.', true); llog(g, '마석 고갈 걱정이 처음 돌았다.'); }
  if (before < 45 && S.deplete >= 45 && S.worry < 2) { S.worry = 2; say('마석 값이 치솟는다. 마도구 공방들이 문을 반쯤 닫고, 왕실이 마석 반출을 막았다. 마석 사재기를 하는 집이 늘었다.', true); llog(g, '마석이 모자라 값이 치솟았다.'); }
  if (before < 70 && S.deplete >= 70 && S.worry < 3) { S.worry = 3; say('마석이 바닥난다는 말에 온 나라가 떤다. 거리의 등석 가로등이 한 줄 걸러 하나씩 꺼졌다.', true); llog(g, '마석 고갈의 공포.'); }
  if (S.worry >= 1 && before >= 22 && S.deplete < 22) { S.worry = 0; say('마석 걱정이 한풀 꺾였다. 새로 뚫은 갱과 정련 공방이 숨통을 틔웠다.'); llog(g, '마석 걱정이 가라앉았다.'); }
  // 마석 시세: 걱정이 클수록 비싸다 (mana의 짙고 옅음과 같은 자리)
  if (g.trade?.mkt && S.deplete > 5) for (const pl of MARKETS) {
    const k = `${pl}:manastone`, m = (g.trade.mkt[k] ??= { drift: 0, sat: 0 });
    if (Number.isFinite(m.drift)) m.drift = clamp(m.drift + S.deplete * 0.00005, -0.3, 0.3);
  }
  if (Math.abs(S.deplete - (S.synced ?? 0)) >= 5) { S.synced = S.deplete; syncMana(g); }
  favors(g);
  // 세력 사이의 큰일: 드물게
  if (rng.chance(0.004)) {
    if (has(g, 'crystal') && S.stance.crown < -5 && S.stance.tower > 20) { say('왕실이 마탑의 수정구 독점을 깨겠다며 왕립 수정구 공방을 세웠다. 탑은 술식을 내주지 않았고, 왕립 수정구는 반쯤만 운다.'); S.stance.crown = clamp(S.stance.crown + 6, -100, 100); llog(g, '왕실과 마탑이 수정구를 두고 다퉜다.'); }
    else if (has(g, 'medicine') && S.stance.faith < -25) { say('성광교가 마도 의원 하나를 이단 심문에 넘겼다. 의원은 풀려났지만, 그 뒤로 의원들은 수정 진단판을 천으로 덮어 두고 쓴다.'); llog(g, '교단이 마도 의원을 심문했다.'); }
    else if (has(g, 'factory') && S.stance.trade > 30) { say('상단 연합이 왕실에 공장 거리 세금을 깎아 달라고 청원했다. 왕은 절반을 들어주고, 대신 공장 굴뚝마다 왕실 문장을 달게 했다.'); S.stance.crown = clamp(S.stance.crown + 3, -100, 100); llog(g, '상단과 왕실이 공장 세금을 두고 흥정했다.'); }
  }
}

WORLD_TICKS.push((g, worldRng, say) => laterMonth(g, say));
