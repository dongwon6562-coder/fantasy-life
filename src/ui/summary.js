// 이번 달 요약: 달을 넘기기 전과 뒤를 견줘 한눈에 보여 준다 (돈, 능력, 솜씨, 몸, 사람).
// 게임 규칙은 건드리지 않고, 화면 쪽에서 앞뒤 모습만 찍어 둔다.
import { STATS, SKILLS } from '../data.js';
import { knownPeople } from '../game.js';
import { esc } from './util.js';

/** 지금 모습 찍기 */
export function snapshot(game) {
  const p = game.player;
  const aff = {};
  const alive = {};
  for (const x of knownPeople(game)) { aff[x.id] = x.affection; alive[x.id] = x.alive && !x.away; }
  return {
    pid: p.id, date: { ...game.date },
    money: p.money, familyMoney: p.familyMoney,
    stats: { ...p.stats }, skills: { ...p.skills },
    mana: p.manaAwakened ? p.mana ?? 0 : null,
    fatigue: p.fatigue ?? 0, stress: p.stress ?? 0,
    injuries: (p.injuries ?? []).length,
    aff, alive,
  };
}

const fmt = (d) => { const a = Math.abs(d); const s = a >= 1 ? String(Math.round(a)) : a.toFixed(1); return (d > 0 ? '+' : '−') + s; };

/** 앞뒤를 견준 줄들. 좋은 쪽은 up, 나쁜 쪽은 down. */
export function diffSummary(game, before) {
  const now = snapshot(game);
  if (now.pid !== before.pid) return null; // 대가 바뀌면 견줄 수 없다
  const out = { money: [], body: [], growth: [], people: [] };
  const push = (k, name, d, good = d > 0) => out[k].push({ name, d, good });
  if (now.money !== before.money) push('money', '내 돈', now.money - before.money);
  if (now.familyMoney !== before.familyMoney) push('money', '집안 돈', now.familyMoney - before.familyMoney);
  for (const s of STATS) { const d = (now.stats[s.id] ?? 0) - (before.stats[s.id] ?? 0); if (Math.abs(d) >= 0.3) push('growth', s.name, d); }
  for (const s of SKILLS) { const d = (now.skills[s.id] ?? 0) - (before.skills[s.id] ?? 0); if (Math.abs(d) >= 0.3) push('growth', s.name, d); }
  if (now.mana != null && before.mana != null && Math.abs(now.mana - before.mana) >= 0.3) push('growth', '마력', now.mana - before.mana);
  if (Math.abs(now.fatigue - before.fatigue) >= 3) push('body', '피로', now.fatigue - before.fatigue, now.fatigue < before.fatigue);
  if (Math.abs(now.stress - before.stress) >= 3) push('body', '마음고생', now.stress - before.stress, now.stress < before.stress);
  if (now.injuries > before.injuries) out.body.push({ name: '새로 다친 곳', text: `${now.injuries - before.injuries}군데`, good: false });
  else if (now.injuries < before.injuries) out.body.push({ name: '나은 상처', text: `${before.injuries - now.injuries}군데`, good: true });
  const people = knownPeople(game);
  const newcomers = people.filter((x) => !(x.id in before.aff));
  const gone = people.filter((x) => before.alive[x.id] && !x.alive);
  const left = people.filter((x) => before.alive[x.id] && x.alive && x.away);
  const moved = people.filter((x) => x.id in before.aff && x.alive && Math.abs(x.affection - before.aff[x.id]) >= 3)
    .map((x) => ({ x, d: x.affection - before.aff[x.id] }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  for (const { x, d } of moved.slice(0, 4)) push('people', x.name, d);
  if (moved.length > 4) out.people.push({ name: `그 밖 ${moved.length - 4}명`, text: '사이가 바뀜', good: null });
  const lines = [];
  if (newcomers.length) lines.push(`새로 안 사람: ${newcomers.slice(0, 4).map((x) => x.name).join(', ')}${newcomers.length > 4 ? ` 외 ${newcomers.length - 4}명` : ''}`);
  if (gone.length) lines.push(`세상을 떠난 사람: ${gone.map((x) => x.name).join(', ')}`);
  if (left.length) lines.push(`마을을 떠난 사람: ${left.map((x) => x.name).join(', ')}`);
  const months = (now.date.year - before.date.year) * 12 + (now.date.month - before.date.month);
  return { months, ...out, lines };
}

const chip = (c) => `<span class="sm-chip ${c.good === true ? 'up' : c.good === false ? 'down' : ''}"><span>${esc(c.name)}</span><b>${esc(c.text ?? fmt(c.d))}</b></span>`;

export function renderSummary(sum) {
  if (!sum || sum.months <= 0) return '';
  const rows = [['money', '돈'], ['growth', '자람'], ['body', '몸과 마음'], ['people', '사이']]
    .filter(([k]) => sum[k].length)
    .map(([k, name]) => `<div class="sm-row"><span class="lbl">${name}</span><div class="sm-chips">${sum[k].map(chip).join('')}</div></div>`).join('');
  if (!rows && !sum.lines.length) return '';
  const title = sum.months === 1 ? '지난달 한눈에' : `지난 ${sum.months}달 한눈에`;
  return `<section class="card month-sum" aria-label="${title}">
    <h2>${title}</h2>
    ${rows}
    ${sum.lines.length ? `<ul class="sm-lines">${sum.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
  </section>`;
}

/** '오늘의 장면' 카드 안에 넣을 몸통 (제목은 작은 h3) */
export function summaryBody(sum) {
  if (!sum || sum.months <= 0) return '';
  const rows = [['money', '돈'], ['growth', '자람'], ['body', '몸과 마음'], ['people', '사이']]
    .filter(([k]) => sum[k].length)
    .map(([k, name]) => `<div class="sm-row"><span class="lbl">${name}</span><div class="sm-chips">${sum[k].map(chip).join('')}</div></div>`).join('');
  if (!rows && !sum.lines.length) return '';
  const title = sum.months === 1 ? '지난달 한눈에' : `지난 ${sum.months}달 한눈에`;
  return `<div class="month-sum" aria-label="${title}"><h3 class="sub">${title}</h3>${rows}${sum.lines.length ? `<ul class="sm-lines">${sum.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`;
}
