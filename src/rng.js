// 시드 고정 난수. 상태를 게임 저장 데이터에 넣어 두므로 불러와도 같은 흐름이 이어진다.
export function makeRng(state) {
  // state: { s: number }
  const next = () => {
    let t = (state.s = (state.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    float: (a = 0, b = 1) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // 정규분포 비슷한 값 (평균 m, 폭 sd)
    normal: (m = 0, sd = 1) => {
      let u = 0;
      for (let i = 0; i < 4; i++) u += next();
      return m + sd * (u - 2) * 1.73;
    },
    weighted: (items, weightOf) => {
      const total = items.reduce((s, it) => s + Math.max(0, weightOf(it)), 0);
      if (total <= 0) return null;
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, weightOf(it));
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },
  };
  return rng;
}
