// 48단계 도우미3: '오늘의 장면'·'들려온 소식'에 고장마다 붙는 한 줄이 같은 말을 달마다 되풀이하지 않게 한다.
// 화면은 한 달에 여러 번 그려질 수 있으니, 같은 달 안에서는 같은 답을 준다.
// 기록은 g.lineSeen { 열쇠@고장: 달 } 하나뿐이고, 저장에 그대로 실린다. 아무 갈래도 가져오지 않는다(돌림 import 없음).
const now = (g) => g.date.year * 12 + g.date.month;
const slot = (g, key) => `${key}@${g.life?.place ?? ''}`;

/** 이 줄을 이번 달 보여도 되나: 마지막으로 보인 지 gap달이 지났으면 참(그리고 이번 달로 적는다) */
export function seldom(g, key, gap = 36) {
  if (!g?.date) return true;
  const S = (g.lineSeen ??= {}), k = slot(g, key), t = now(g), last = S[k];
  if (last === t) return true;
  if (last != null && t - last < gap) return false;
  S[k] = t;
  return true;
}

/** '막 ~했다' 같은 줄: 이 고장에서 처음 보인 뒤 months달 동안만 참 */
export function firstMonths(g, key, months = 3) {
  if (!g?.date) return true;
  const S = (g.lineSeen ??= {}), k = slot(g, `first:${key}`), t = now(g);
  S[k] ??= t;
  return t - S[k] < months;
}
