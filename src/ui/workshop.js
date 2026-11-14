// 공방·가게 카드: 생산직(src/craft)의 craftStatus 하나로 그린다.
// 이번 달 화면의 소식 아래에 접는 칸으로 들어간다. 생산직이 아니면 아무것도 그리지 않는다.
import { craftStatus } from '../craft/core.js';
import { monthIndex } from '../world.js';
import { esc } from './util.js';

const GRADES = ['견습', '숙련', '장인', '명장'];
const GRADE_AT = [0, 30, 55, 80]; // core.js gradeOf와 같은 문턱

const meter = (v, cls = '') => `<span class="ws-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderWorkshop(game, ui = {}) {
  let s = null;
  try { s = craftStatus(game); } catch (e) { console.error(e); }
  if (!s) return '';
  const gi = GRADES.indexOf(s.grade);
  const next = GRADE_AT[gi + 1];
  const dcls = s.demand >= 1.1 ? 'up' : s.demand < 0.9 ? 'down' : '';
  const now = monthIndex(game);
  const head = `${s.name} · ${s.grade} · ${s.fameWord} ${s.maker}`;
  return `<details class="card workshop"${ui.wsOpen ? " open" : ""}>
    <summary>
      <span class="ws-title"><span class="lbl">${s.shop ? '내 가게' : '일터'}</span><strong>${esc(head)}</strong></span>
      <span class="ws-demand ${dcls}">${esc(s.season)} · ${esc(s.demandWord)}</span>
    </summary>
    <div class="ws-body">
      <div class="ws-ladder" aria-label="솜씨 단계">
        ${GRADES.map((g, i) => `<span class="${i < gi ? 'past' : i === gi ? 'now' : ''}">${g}</span>`).join('<i aria-hidden="true"></i>')}
      </div>
      <div class="ws-stat"><span>솜씨</span>${meter(s.skill)}<span class="v">${s.skill}</span></div>
      ${next != null ? `<p class="note">${GRADES[gi + 1]}까지 솜씨 ${Math.max(0, next - s.skill)} 남음</p>` : '<p class="note">이 길의 끝에 올랐다.</p>'}
      <div class="ws-stat"><span>이름값</span>${meter(s.fame, 'fame')}<span class="v">${s.fame}</span></div>
      <div class="ws-market ${dcls}">
        <b>이번 철 장사</b> ${esc(s.demandWord)}${s.why?.length ? `<span>${esc(s.why.join(', '))}</span>` : ''}
      </div>
      ${s.orders?.length ? `<div class="ws-orders"><h4>맡은 의뢰</h4>
        ${s.orders.map((o) => {
          const left = o.due - now;
          return `<div class="ws-order">
            <div class="top"><strong>${esc(o.title)}</strong><span class="${left <= 1 ? 'warn' : ''}">${left > 0 ? `${left}달 남음` : '기한'}</span></div>
            <div class="ws-stat"><span>${o.done}/${o.need}</span>${meter((o.done / Math.max(1, o.need)) * 100, 'order')}<span class="v">${esc(o.minQ)} 이상</span></div>
          </div>`;
        }).join('')}
      </div>` : ''}
      ${(s.field != null || s.granary || s.remedies) ? `<dl class="ws-store">
        ${s.field != null ? `<div><dt>올해 밭에 들인 손</dt><dd>${Math.round(s.field)}</dd></div>` : ''}
        ${s.granary ? `<div><dt>곳간의 밀</dt><dd>${s.granary}자루</dd></div>` : ''}
        ${s.remedies ? `<div><dt>쟁여 둔 약</dt><dd>${s.remedies}단지</dd></div>` : ''}
      </dl>` : ''}
      ${s.masterworks?.length ? `<div class="ws-master"><h4>걸작</h4><ul>${s.masterworks.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
    </div>
  </details>`;
}
