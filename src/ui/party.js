// 동료와 파티 카드 (src/party의 partyStatus). 사람들 탭 맨 위에 나온다. 동료도 의뢰도 지난 동료도 없으면 그리지 않는다.
import { partyStatus } from '../party/core.js';
import { byId } from '../npc.js';
import { JOBS } from '../data.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const bar = (v, cls = '') => `<span class="pt-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderParty(game) {
  let s = null;
  try { s = partyStatus(game); } catch (e) { console.error(e); return ''; }
  if (!s || (!s.members.length && !s.story && !s.fallen.length)) return '';
  const seats = Array.from({ length: s.max - 1 }, (_, i) => s.members[i] ?? null);
  return `<section class="card party">
    <h2>동료 <small>파티 ${s.size}/${s.max}명 (나 포함)</small></h2>
    ${s.story ? `<div class="pt-story"><span class="lbl">맡은 의뢰</span><strong>${esc(s.story.title)}</strong><span class="note">${s.story.steps}번째 고비</span></div>` : ''}
    <div class="pt-list">
      ${seats.map((m) => {
        if (!m) return '<div class="pt-empty">빈 자리</div>';
        const p = byId(game, m.id);
        const lc = m.loyalty >= 60 ? 'good' : m.loyalty < 30 ? 'low' : '';
        return `<button class="pt-mem${m.injured ? ' hurt' : ''}" data-person="${m.id}">
          ${p ? portrait(game, p, { size: 56 }) : ''}
          <div class="pt-body">
            <div class="top"><strong>${esc(m.name)}</strong><span class="role">${esc(m.roleName ?? '')}</span></div>
            <span class="note">${m.age}살 · ${esc(JOBS[m.job]?.name ?? '')}${m.hired ? ` · 품삯 은화 ${m.wage}닢` : ''}${m.injured ? ` · <b class="warn">다쳐서 ${m.outMonths}달 쉼</b>` : ''}</span>
            <div class="pt-row"><span>믿음</span>${bar(m.loyalty, lc)}<span class="v">${esc(m.loyaltyWord)}</span></div>
            <span class="note">싸움 ${m.fights}번, 이긴 것 ${m.wins}번 · 힘 ${Math.round(m.pow)}</span>
          </div>
        </button>`;
      }).join('')}
    </div>
    ${s.fallen.length ? `<details class="pt-fallen"><summary>먼저 간 동료 ${s.fallen.length}명</summary><ul>${s.fallen.slice().reverse().map((f) => `<li><b>${esc(f.name)}</b> <span class="note">${f.year}년 · ${esc(f.cause ?? '')}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
