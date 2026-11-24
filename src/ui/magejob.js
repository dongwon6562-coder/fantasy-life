// 42단계 '마법으로 먹고살기' 화면(src/magejob). 읽기만 한다.
// renderMagejobNow: 이번 달 접는 카드 (이름값, 마을 결계, 가르치는 아이, 내 주문으로 할 수 있는 일, 같은 고장 떠돌이 마법사, 한 일)
import { magejobInfo } from '../magejob/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderMagejobNow(game, ui = {}) {
  const s = safe(() => magejobInfo(game));
  if (!s || (!s.can.length && !s.pupil && !s.done.jobs)) return '';
  const fw = s.fameWord || '아직 아무도 모른다';
  const d = s.done, weak = s.ward && s.ward.value < 35;
  const chips = [];
  if (d.jobs) chips.push(['맡은 일', `${d.jobs}`]);
  if (d.earned) chips.push(['번 돈', `은화 ${d.earned}닢`, 'up']);
  if (d.fails) chips.push(['그르친 일', `${d.fails}`, 'down']);
  if (d.refunds) chips.push(['물어 준 값', `${d.refunds}번`, 'down']);
  if (d.merc) chips.push(['용병 일', `${d.merc}번`]);
  const title = s.pupil ? `${s.pupil.name} 가르치기` : weak ? '마을 결계가 약하다' : s.can.length ? `할 수 있는 일 ${s.can.length}가지` : '마법 일';
  const tag = weak ? s.ward.word : fw;
  return `<details class="card workshop mj-card"${ui.mjOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">마법 일</span><strong>${esc(title)}</strong></span>
      <span class="ws-demand ${weak ? 'down' : 'up'}">${esc(tag)}</span>
    </summary>
    <div class="ws-body">
      <div class="wd-row kn-row"><span>이 고장에서 이름값 · ${esc(fw)}</span>${bar(s.fame, 'mana')}</div>
      ${s.ward ? `<div class="wd-row kn-row"><span>마을 결계 · ${esc(s.ward.word)}</span>${bar(s.ward.value, weak ? 'low' : 'kin')}</div>` : ''}
      ${s.pupil ? `<p class="note">가르치는 아이 <b>${esc(s.pupil.name)}</b> · ${esc(s.pupil.place)} · 수업 ${s.pupil.lessons}번째 · 한 달 은화 ${s.pupil.fee}닢</p>` : ''}
      ${s.can.length ? `<p class="note">내 주문으로 할 수 있는 일</p><div class="sm-chips">${s.can.map((c) => chip([c.task, c.spell])).join('')}</div>` : ''}
      ${s.rivals.length ? `<p class="note">일감을 다투는 마법사: ${s.rivals.map((r) => `${esc(r.name)}(${r.circle}서클, ${esc(r.place)})`).join(', ')}</p>` : ''}
      ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
      ${s.log.length ? `<details class="pl-more"><summary>마법 일 하며 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
    </div>
  </details>`;
}
