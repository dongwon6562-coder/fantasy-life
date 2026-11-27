// 48단계: 부모를 잃은 아이에게 어린 시절 글이 '엄마가…', '부모에게 말한다'처럼 죽은 부모를 부르던 것.
// 글마다 고치는 대신, 아이(열여덟 아래)에게 보이는 사건·장면·한 일 글을 내보내기 직전에 살아 있는 쪽으로 바꾼다.
// - 아버지만 없으면 아빠·아버지 → 엄마·어머니, 부모 → 어머니 (어머니만 없으면 거꾸로)
// - 둘 다 없으면 길러 주는 사람으로 (빈민가 고아는 할멈, 그 밖엔 '돌봐 주는 어른')
// 남의 부모('한스의 아버지', '한스네 어머니'), 할아버지·큰어머니 같은 말, 죽은 부모 이름이 나오는 글(장례·첫 죽음)은 건드리지 않는다.
import { J } from './text.js';

const WORDS = '엄마|아빠|어머니|아버지|부모님|부모';
const RE = new RegExp(`(?<![가-힣])(?<!의 )(?<!네 )(${WORDS})(이랑|랑|이|가|은|는|을|를|과|와)?(?![가-힣]*님)`, 'g');
const PAIR = { 이: '이/가', 가: '이/가', 은: '은/는', 는: '은/는', 을: '을/를', 를: '을/를', 과: '과/와', 와: '과/와' };

const alive = (p) => !!p && p.alive && !p.away;

export function fixParents(g, text) {
  if (!text || typeof text !== 'string' || !g?.player) return text;
  const m = g.people?.find((p) => p.id === g.player.id);
  if (!m || m.ageMonths >= 18 * 12) return text;
  const f = g.people.find((p) => p.id === m.fatherId), mo = g.people.find((p) => p.id === m.motherId);
  const fa = alive(f), ma = alive(mo);
  if (fa && ma) return text;
  if (!f && !mo) return text; // 처음부터 부모가 정해지지 않은 판(옛 저장·시험)
  // 죽은 부모를 부르는 글(장례·첫 죽음·유품)은 그대로 둔다
  if ((f && !fa && text.includes(f.name)) || (mo && !ma && text.includes(mo.name))) return text;
  const guard = g.player.familyId === 'slum_orphan' ? '할멈' : '돌봐 주는 어른';
  const to = (w) => {
    if (fa && !ma) return { 엄마: '아빠', 어머니: '아버지', 부모님: '아버지', 부모: '아버지' }[w] ?? w;
    if (ma && !fa) return { 아빠: '엄마', 아버지: '어머니', 부모님: '어머니', 부모: '어머니' }[w] ?? w;
    return guard;
  };
  let out = text.replace(RE, (all, w, j) => {
    const n = to(w);
    if (n === w) return all;
    if (!j) return n;
    if (j === '이랑' || j === '랑') return J(n, '과/와');
    return J(n, PAIR[j]);
  });
  // '엄마랑 아빠랑' → '엄마와 엄마와'가 되지 않게 겹친 것을 하나로
  for (const n of new Set(['엄마', '아빠', '어머니', '아버지', guard])) for (const j of [J(n, '과/와').slice(n.length), '랑', '이랑']) out = out.split(`${n}${j} ${n}`).join(n);
  return out;
}
