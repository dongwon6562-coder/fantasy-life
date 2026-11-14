// 세계의 위기 화면 (src/crisis의 crisisStatus). 위기가 오는 동안 이번 달 화면 맨 위에 카드로 나온다.
// 지나간 위기는 레오니아 연대기 '큰일'에 남는다. 읽기만 한다.
import { crisisStatus, CRISES, inLeonia } from '../crisis/core.js';
import { playerAge } from '../game.js';
import { esc } from './util.js';

const KIND = { monsters: '마물', plague: '역병', war: '전쟁' };
const STANCE_NOTE = {
  hero: '맞서는 쪽에 섰다. 위험하지만 사람들은 기억한다.',
  idle: '아직 어느 쪽에도 서지 않았다. 몸을 사리는 것도 하나의 길이다.',
  use: '위기로 주머니를 불리고 있다. 사람들은 잊지 않는다.',
};
const RESULT_CLS = { saved: 'good', scarred: '', ruin: 'low' };

export function crisisInfo(game) {
  try { return crisisStatus(game); } catch (e) { console.error(e); return null; }
}

/** 이번 달 화면 맨 위 위기 카드 */
export function renderCrisis(game) {
  const s = crisisInfo(game);
  const c = s?.active;
  if (!c) return '';
  const phases = CRISES[c.id]?.phases?.map((p) => p.name) ?? [];
  const adult = playerAge(game) >= 15;
  const here = (() => { try { return inLeonia(game); } catch { return true; } })();
  const sevCls = c.sev >= 60 ? 'low' : c.sev < 30 ? 'good' : '';
  const d = c.deeds ?? {};
  return `<section class="card crisis k-${esc(c.kind)}">
    <div class="cr-head">
      <span class="cr-kind">${esc(KIND[c.kind] ?? '큰일')}</span>
      <h2>${esc(c.name)} <small>용사력 ${c.since}년부터</small></h2>
    </div>
    <ol class="cr-steps" aria-label="${c.phase}/${c.phases}단계">${phases.map((n, i) => `<li class="${i + 1 < c.phase ? 'done' : i + 1 === c.phase ? 'now' : ''}"><span>${esc(n)}</span></li>`).join('')}</ol>
    <div class="cr-sev"><span class="lbl">형편</span><span class="cr-bar ${sevCls}"><i style="width:${Math.max(3, Math.min(100, c.sev))}%"></i></span><span class="v">${esc(c.sevWord)}</span></div>
    ${adult ? `<div class="cr-stance">
      <span class="lbl">나는</span><strong class="st-${esc(c.stance)}">${esc(c.stanceName)}</strong>
      <span class="cr-deeds">${d.hero ? `<span>맞섬 ${d.hero}</span>` : ''}${d.use ? `<span>이용 ${d.use}</span>` : ''}</span>
      <p class="note">${esc(STANCE_NOTE[c.stance] ?? '')}</p>
    </div>` : '<p class="note">아이에게 큰일은 어른들의 굳은 얼굴로만 보인다.</p>'}
    ${adult ? (here ? `<p class="note cr-hint">할 일의 '나라의 큰일'에서 고를 수 있다: ${esc(c.helpName ?? '')}${c.exploitName ? `, 또는 ${esc(c.exploitName)}` : ''}.</p>` : '<p class="note cr-hint">레오니아 밖에 있어서 손을 쓸 수 없다. 소식만 들려온다.</p>') : ''}
  </section>`;
}

/** 할 일 카드의 설명을 지금 위기에 맞게 바꾼다 */
export function crisisActDesc(game, a) {
  const c = crisisInfo(game)?.active;
  if (!c) return a;
  if (a.id === 'crisis_help' && c.helpName) return { ...a, desc: `${c.name}: ${c.helpName}. 위험하고 돈이 되지 않는다.` };
  if (a.id === 'crisis_use' && c.exploitName) return { ...a, desc: `${c.name}: ${c.exploitName}. 사람들은 잊지 않는다.` };
  return a;
}

/** 레오니아 연대기 '큰일' 위에 붙는 지나간 위기 목록 */
export function renderCrisisPast(game) {
  const s = crisisInfo(game);
  if (!s || (!s.past.length && !s.active)) return '';
  const rows = s.past.slice().reverse().map((p) => `<li>
      <span class="cr-kind sm">${esc(KIND[CRISES[p.id]?.kind] ?? '큰일')}</span>
      <div><strong>${esc(p.name)}</strong> <span class="note">${p.from}~${p.to}년</span>
      <span class="cr-res ${RESULT_CLS[p.result] ?? ''}">${esc(p.resultName ?? '')}</span>
      <span class="note">나는 ${esc(p.stanceName ?? '')}</span></div>
    </li>`).join('');
  return `<div class="cr-past"><h3 class="sub">왕국을 덮친 위기</h3>
    ${s.active ? `<p class="note">지금: <b>${esc(s.active.name)}</b>, ${esc(s.active.phaseName)} (${esc(s.active.sevWord)})</p>` : ''}
    ${rows ? `<ul>${rows}</ul>` : ''}</div>`;
}
