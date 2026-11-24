// 하늘의 한 달: 하늘 사건이 오고(세상이 함께 본다), 천문대가 일식을 예고하고 맞히거나 틀리고, 학자가 바뀌고,
// 망원경이 들어오면 새것을 찾아낸다. 달력은 해마다 조금씩 계절과 어긋나다가 고치자는 다툼이 난다. 플레이어 없이도 굴러간다.
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { chron } from '../adventure/core.js';
import { comet as omenComet } from '../omen/world.js';
import { SS, OBS, OBS_IDS, SKY, HEADS, TITLE, stRng, slog, clamp, mi, placeName, hasLens, hasGlass } from './state.js';

// 같은 하늘을 저마다 다르게 읽는다: [보이는 것, 교단, 궁정, 백성, 학자]
export const READ = {
  comet: ['북쪽 하늘에 꼬리 긴 별이 떴다. 밤마다 조금씩 자리를 옮긴다.', '성당은 회개의 종을 울렸다.', '궁정은 새 시대의 길조라며 잔치를 열었다.', '장터에선 부적 장수가 신이 났다.', '천문대는 이 별이 다시 돌아올 날을 셈하기 시작했다.'],
  eclipse: ['한낮에 해가 검게 먹혀 들어갔다. 닭이 울고 개가 짖었다. 몇 숨 동안 별이 보였다.', '사제들은 무릎을 꿇고 빛이 돌아오기를 빌었다.', '궁정은 미리 알았다는 듯 태연한 척했다.', '사람들은 냄비를 두드려 해를 삼킨 것을 쫓았다.', '천문대 학자들은 그을린 유리를 들고 지붕 위에 올라가 있었다.'],
  shower: ['밤새 별똥이 비처럼 쏟아졌다. 아이들이 지붕에 올라가 셌다.', '성당은 하늘이 영혼을 거두는 밤이라 했다.', '궁정 연회는 별똥비 아래서 밤을 새웠다.', '젊은이들은 별똥이 질 때마다 소원을 빌었다.', '학자들은 해마다 같은 철에 오는 까닭을 두고 다퉜다.'],
  nova: ['처음 보는 별 하나가 서쪽 하늘에 떴다. 금성보다 밝다.', '성당은 성자의 별이라며 새 축일을 정하려 한다.', '궁정은 새 왕자의 별이라 불렀다.', '뱃사람들은 그 별을 보며 길을 잡지 말라고 서로 일렀다.', '학자들은 하늘이 변하지 않는다는 옛 책이 틀렸다고 수군거린다.'],
  conj: ['저녁 하늘에 밝은 별 둘이 맞붙었다. 하나처럼 보인다.', '사제들은 두 성자의 만남이라 했다.', '궁정 점성술사는 혼인 동맹의 때라고 아뢰었다.', '장터에선 쌍둥이가 많이 날 해라고들 한다.', '학자들은 두 행성의 길을 다시 셈해 보았다.'],
  aurora: ['북쪽 하늘이 초록과 붉은 빛으로 너울거렸다. 소리 없이.', '사제들은 마신의 사슬이 흔들리는 거라 겁을 주었다.', '궁정은 북부 성채에 파발을 보냈다.', '북쪽 마을 노인들은 조상들이 춤추는 거라 했다.', '학자들은 해의 숨결이 닿은 거라는 새 설을 내놓았다.'],
};

export function skyEvent(g, kind, say, { told = null } = {}) {
  const S = SS(g), K = SKY[kind], now = mi(g);
  if (!K || S.sky.some((s) => s.kind === kind && s.until >= now)) return null;
  const e = { id: S.seq++, kind, at: now, until: now + K.len - 1, told };
  S.sky.push(e);
  if (S.sky.length > 20) { S.past.push(S.sky.shift()); if (S.past.length > 20) S.past.shift(); }
  const [sight, church, court, folk, sch] = READ[kind];
  const r = stRng(g, 9 + e.id);
  say(`${sight} ${r.pick([church, court])} ${folk} ${sch}`, kind !== 'shower' && kind !== 'conj');
  // 꼬리별의 연대기 한 줄은 예언 쪽(omenComet)이 적는다
  if (kind !== 'comet') chron(g, `${J(K.name, '이/가')} 하늘에 나타나다.`, kind === 'eclipse' || kind === 'nova' ? 50 : 20);
  slog(g, `${K.name}${told ? ` (${J(OBS[told].name, "이/가")} 예고한 대로)` : ''}.`);
  if (kind === 'comet') omenComet(g, () => {}, false); // 예언 쪽 '꼬리별의 예언'도 함께 움직인다
  return e;
}

export function starsMonth(g, say) {
  if (!g.stars || !g.date) return;
  const S = SS(g), rng = stRng(g, 3), now = mi(g);
  // 예언 쪽에서 띄운 꼬리별이 올해 있었으면 우리 하늘에도 적는다
  if ((g.omen?.comets ?? []).includes(g.date.year) && !S.sky.concat(S.past).some((s) => s.kind === 'comet' && Math.floor(s.at / 12) === g.date.year)) {
    S.sky.push({ id: S.seq++, kind: 'comet', at: now, until: now + 2, told: null });
    slog(g, '꼬리별.');
  }
  // 다음 일식: 몇 해 뒤 (정해 두면 천문대가 미리 셈해 예고할 수 있다)
  if (S.next.eclipse == null || S.next.eclipse < now) S.next.eclipse = now + rng.int(60, 130);
  if (S.next.eclipse === now) { const told = S.next.told ?? null; skyEvent(g, 'eclipse', say, { told }); S.next.told = null; if (told) { S.obs[told].fame = clamp(S.obs[told].fame + 12, 0, 100); } }
  // 예고: 렌즈가 있거나 이름난 학자가 있으면 한두 해 앞서 셈해 낸다
  if (S.next.eclipse - now <= 18 && S.next.eclipse - now >= 6 && !S.next.told) {
    const best = OBS_IDS.map((k) => [k, S.obs[k].fame + (S.obs[k].glass ? 25 : 0) + (hasLens(g) ? 10 : 0)]).sort((a, b) => b[1] - a[1])[0];
    if (best && rng.chance(best[1] / 1200)) {
      S.next.told = best[0];
      const o = S.obs[best[0]];
      say(`${OBS[best[0]].name}의 ${TITLE[OBS[best[0]].by]} ${J(o.head.split(' ').pop(), '이/가')} ${S.next.eclipse - now}달 뒤 한낮에 해가 먹힐 거라고 예고했다. 믿는 사람 반, 비웃는 사람 반이다.`);
      slog(g, `${J(OBS[best[0]].name, '이/가')} 일식을 예고했다.`);
    }
  }
  // 그 밖의 하늘 사건
  for (const kind of ['comet', 'shower', 'nova', 'conj', 'aurora']) {
    const p = SKY[kind].p * (kind === 'shower' && g.date.month === 8 ? 4 : 1);
    if (rng.chance(p)) skyEvent(g, kind, say);
  }
  // 천문대: 망원경이 들어오고, 학자가 바뀌고, 새것을 찾아낸다
  for (const k of OBS_IDS) {
    const o = S.obs[k], pr = stRng(g, 31 + k.length * 11);
    if (!o.glass && hasGlass(g) && pr.chance(k === 'solaris' ? 0.01 : 0.04)) { o.glass = true; o.fame = clamp(o.fame + 6, 0, 100); slog(g, `${OBS[k].name}에 망원경이 올라갔다.`); if (pr.chance(0.5)) say(`${placeName(OBS[k].place)} ${OBS[k].name} 지붕에 긴 놋쇠 통이 올라갔다. 밤마다 그 통을 들여다보려는 줄이 선다.`); }
    if (o.glass && pr.chance(0.006)) {
      const find = pr.pick(['목성 곁을 도는 작은 달 넷', '달의 산과 골짜기', '은하수가 작은 별 무더기라는 것', '토성의 귀', '해의 검은 점', '꼬리 없는 떠돌이 별 하나']);
      if (!o.found.includes(find)) { o.found.push(find); o.fame = clamp(o.fame + 8, 0, 100); say(`${OBS[k].name}의 ${J(o.head, '이/가')} 망원경으로 ${J(find, '을/를')} 보았다고 적어 냈다. 성당 쪽에선 그 통이 악마의 눈이라는 말도 나온다.`); slog(g, `${J(OBS[k].name, '이/가')} ${J(find, '을/를')} 찾았다.`); }
    }
    o.fame = clamp(o.fame - 0.04 + pr.normal(0, 0.15), 5, 100);
    if (now - o.since > 12 * 25 && pr.chance(0.01)) { const nm = `${TITLE[OBS[k].by]} ${pr.pick(HEADS)}`; slog(g, `${OBS[k].name}의 ${J(o.head, '이/가')} 물러나고 ${J(nm, '이/가')} 뒤를 이었다.`); o.head = nm; o.since = now; o.fame = clamp(o.fame - 10, 5, 100); }
  }
  // 달력: 해마다 조금씩 어긋난다. 열흘 넘게 어긋나면 고치자는 다툼이 난다
  const C = S.cal;
  if (g.date.month === 1) C.drift = Math.round((C.drift + 0.12) * 100) / 100; // 백 년에 열이틀쯤
  if (!C.dispute && C.drift >= 10 && now - (C.endAt ?? -999) >= 12 * 20 && rng.chance(0.02)) {
    C.dispute = { at: now, reform: 40 + (hasLens(g) ? 10 : 0), church: 50, me: null };
    say(`부활 축일이 봄보다 열흘이나 늦게 온다고 천문대가 달력을 고치자고 나섰다. 성당은 거룩한 날을 사람이 셈해 옮길 수 없다며 맞섰다. 궁정이 어느 편을 들지 모두 지켜본다.`, true);
    slog(g, '달력을 고치자는 다툼이 났다.');
  }
  if (C.dispute) {
    const d = C.dispute;
    d.reform = clamp(d.reform + rng.normal(0.1, 1.2) + (hasGlass(g) ? 0.1 : 0), 0, 100);
    d.church = clamp(d.church + rng.normal(0, 1.2), 0, 100);
    if (now - d.at >= 18 && rng.chance(0.06)) {
      const won = d.reform > d.church;
      if (won) { say(`궁정이 새 달력을 선포했다. 올해 시월에서 열흘이 사라진다. 그 열흘 치 품삯을 두고 장터마다 실랑이가 붙었다.`, true); chron(g, '새 달력을 선포하다. 열흘이 사라진 해.', 60); C.reforms += 1; C.drift = 0; C.last = 'reform'; }
      else { say('궁정이 옛 달력을 그대로 두기로 했다. 성당 종이 길게 울렸다. 천문대 학자들은 지붕 위에서 말없이 셈을 계속했다.'); C.last = 'kept'; }
      slog(g, won ? '새 달력이 섰다.' : '옛 달력을 지켰다.');
      C.dispute = null; C.endAt = now;
    }
  }
}

WORLD_TICKS.push((g, worldRng, say) => starsMonth(g, say));
