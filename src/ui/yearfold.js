// 오래 산 삶의 긴 기록을 해마다 묶어 접는다. 최근 두 해만 펼치고,
// 열 해보다 더 지난 해들은 열 해씩 한 줄로 접는다. 연대기 '마을과 나'와 '레오니아 · 큰일'이 함께 쓴다.

/**
 * @param {{y:number,m?:number}[]} items 오래된 것부터 (게임 기록 순서 그대로)
 * @param {(it:any)=>string} li 한 줄 (<li>…</li>)
 * @param {{ count?: (list:any[])=>string, ulClass?: string, open?: number }} [o]
 */
export function yearFold(items, li, o = {}) {
  const open = o.open ?? 2;
  const ul = o.ulClass ?? 'chron';
  const years = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const c = items[i];
    if (years.at(-1)?.y !== c.y) years.push({ y: c.y, list: [] });
    years.at(-1).list.push(c);
  }
  if (!years.length) return '';
  const count = (list) => `${list.length}가지${o.count ? o.count(list) : ''}`;
  const year = (b, i) => `<details class="ch-year"${i < open ? ' open' : ''}><summary><b>${b.y}년</b><small>${count(b.list)}</small></summary>
      <ul class="${ul}">${b.list.map(li).join('')}</ul></details>`;
  const recent = years.filter((b) => b.y > years[0].y - 10);
  const decades = [];
  for (const b of years.slice(recent.length)) {
    const d = Math.floor(b.y / 10) * 10;
    if (decades.at(-1)?.d !== d) decades.push({ d, list: [] });
    decades.at(-1).list.push(b);
  }
  const decade = (x) => `<details class="ch-year ch-decade"><summary><b>${x.d}년대</b><small>${x.list.at(-1).y}~${x.list[0].y}년 · ${count(x.list.flatMap((b) => b.list))}</small></summary>
      ${x.list.map((b) => year(b, Infinity)).join('')}</details>`;
  return recent.map(year).join('') + decades.map(decade).join('');
}

/** 기록이 처음과 끝에 걸친 해 (h2 작은 글) */
export function yearSpan(items) {
  if (!items.length) return '';
  const a = items[0].y, b = items.at(-1).y;
  return a === b ? `${a}년` : `${a}년부터 ${b}년까지`;
}
