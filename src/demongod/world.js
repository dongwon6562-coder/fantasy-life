// 마신의 그림자 한 달: 봉인이 약해지면 옛 사도들이 잠든 자리에서 뒤척이고, 유물이 손에서 손으로 옮겨 가고,
// 같은 꿈을 꾸는 사람이 늘어난다. 끝(깨짐·다시 묶임)은 봉인 쪽(src/seal/)이 정한다. 여기는 그 그림자만 흘린다. 플레이어 없이도 굴러간다.
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { chron } from '../adventure/core.js';
import { DG, APOSTLES, APOSTLE_IDS, RELICS, RELIC_IDS, dlog, clamp, mi, dgRng, placeName } from './state.js';

const sealOf = (g) => g.realm?.seal ?? 100;
const stageOf = (g) => g.seal?.stage ?? 0;
// 뒤척임이 이 문턱을 넘으면 세상에 말이 돈다
const TIERS = [40, 70];

/** 유물을 옮긴다 (세상 안에서). 소식 한 줄을 돌려준다 */
export function moveRelic(g, id, to, place = null) {
  const S = DG(g), r = S.relics[id];
  if (!r || r.at === to) return null;
  const from = r.at;
  r.at = to; r.place = place ?? r.place; r.movedAt = mi(g);
  (S.heard ??= []).includes(id) || S.heard.push(id);
  const nm = RELICS[id].name;
  const LINE = {
    drift: from === 'lost' ? `${r.place ? `${placeName(r.place)} 근처에서 ` : ''}도굴꾼 하나가 ${J(nm, '을/를')} 파냈다는 말이 돈다. 장물아비들이 값을 매기느라 바쁘다.` : `${J(nm, '이/가')} ${from === 'church' ? '교단 보물고' : from === 'tower' ? '마탑 금고' : '어디선가'}에서 사라져 장물아비 손을 탄다는 소문이다.`,
    order: `${J(nm, '이/가')} 사도회 손에 들어갔다는 말이 있다. 검은 새벽 사람들 얼굴이 밝아졌다.`,
    church: `이단심문소가 ${J(nm, '을/를')} 거둬 성도 보물고에 넣었다고 선포했다. 성당 종이 사흘 울렸다.`,
    tower: `세레니아 마탑이 ${J(nm, '을/를')} 손에 넣어 금고 깊이 넣었다고 한다. 교단은 내놓으라고 성을 낸다.`,
    watch: `감시탑의 파수꾼들이 ${J(nm, '을/를')} 북쪽으로 가져갔다는 말이 있다. 다시 볼 일은 없을 것이다.`,
    lost: `${J(nm, '이/가')} 다시 행방을 감췄다.`,
  };
  dlog(g, `${nm}: ${from} → ${to}`);
  return LINE[to] ?? null;
}

export function demongodMonth(g, say) {
  if (!g.demongod || !g.date) return;
  const S = DG(g), rng = dgRng(g, 3), now = mi(g), seal = sealOf(g), broken = g.seal?.ending === 'broken';
  const quiet = now - (S.newsAt ?? 0) < 6;
  // 옛 사도들이 뒤척인다: 봉인이 약할수록, 깨졌으면 더
  const target = clamp((100 - seal) * 0.85 + (broken ? 35 : 0), 0, 100);
  for (const k of APOSTLE_IDS) {
    const was = S.stir[k], pr = dgRng(g, 17 + k.length * 13);
    const pull = k === 'seventh' ? 0.4 : 1;
    S.stir[k] = clamp(was + (target * pull - was) * 0.02 + pr.normal(0, 0.6), 0, 100);
    for (const t of TIERS) {
      if (was < t && S.stir[k] >= t && !quiet) {
        say(APOSTLES[k].stirs, t >= 70);
        dlog(g, `${APOSTLES[k].name}의 자리가 뒤척인다.`);
        if (t >= 70) chron(g, `${APOSTLES[k].name}의 잠든 자리에서 이상한 일이 이어지다.`, 30);
        S.newsAt = now;
      }
    }
  }
  // 유물이 옮겨 간다 (내 손에 있는 것은 빼고)
  const cult = g.seal?.cult ?? 18, purge = g.seal?.stance?.church === 'purge';
  for (const id of RELIC_IDS) {
    const r = S.relics[id];
    if (r.at === 'me' || r.at === 'watch') continue;
    const pr = dgRng(g, 101 + id.length * 7);
    let to = null;
    if (r.at === 'lost' && pr.chance(0.0025 + (100 - seal) / 30000)) to = 'drift';
    else if (r.at === 'drift' && pr.chance(0.01)) to = pr.chance(cult / 100) ? 'order' : pr.pick(['church', 'tower']);
    else if ((r.at === 'church' || r.at === 'tower') && pr.chance(0.002 + cult / 25000)) to = pr.chance(0.5) ? 'order' : 'drift';
    else if (r.at === 'order' && pr.chance(purge ? 0.02 : 0.003)) to = 'church';
    if (to) { const line = moveRelic(g, id, to, to === 'church' ? 'solaris' : to === 'tower' ? 'serenia' : r.place); if (line && !quiet) { say(line, id === 'crown'); S.newsAt = now; } }
  }
  // 사도회가 쥔 재의 관은 봉인을 아주 조금 닳게 하고, 감시탑이 거둔 것은 조금 받친다
  if (g.realm && !g.seal?.ending) {
    const o = RELIC_IDS.filter((k) => S.relics[k].at === 'order').length, w = RELIC_IDS.filter((k) => S.relics[k].at === 'watch').length;
    g.realm.seal = clamp(seal - (S.relics.crown.at === 'order' ? 0.02 : 0) - o * 0.002 + w * 0.004, 0, 100);
  }
  // 같은 꿈을 꾸는 사람이 늘어난다
  if (stageOf(g) >= 3 && !quiet && rng.chance(0.03)) {
    say(rng.pick(['같은 꿈을 꾸었다는 사람이 장터마다 있다. 얼음 위에 선 누군가가 등을 돌리고 있는 꿈.', '잠꼬대로 모르는 말을 하는 아이들이 늘었다고 한다. 사제들이 집집마다 성수를 뿌린다.', '밤새 같은 이름을 중얼거리다 깨는 사람들이 있다. 깨고 나면 아무도 그 이름을 기억하지 못한다.']));
    S.newsAt = now;
  }
}

WORLD_TICKS.push((g, worldRng, say) => demongodMonth(g, say));
