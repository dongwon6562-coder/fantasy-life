// 저장 칸 화면: 처음 화면의 '이어 하기·다른 삶' 덩이와 설정 화면의 '저장 칸' 덩이.
// 지우기와 덮어쓰기는 한 번 더 눌러야 한다 (브라우저 확인 창은 쓰지 않는다).
import { listSaves, resumeLife, loadSlot, writeSlot, removeSave, kbText, lifeId, SLOT_COUNT } from './saves.js';
import { esc } from './util.js';

const MODE = { once: '한 번뿐인 삶', free: '자유 모드' };
const when = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const who = (x) => `${esc(x.name)}${x.lastName ? ` ${esc(x.lastName)}` : ''}`;
const facts = (x) => `${x.age}살 · 용사력 ${x.year}년 ${x.month}월${x.gen > 1 ? ` · ${x.gen}대째` : ''}`;

function meter(sv) {
  const pct = Math.min(100, Math.round((sv.used / sv.quota) * 100));
  return `<div class="sv-meter${pct >= 80 ? ' full' : ''}"><span>저장 공간</span><span class="bar"><i style="width:${Math.max(2, pct)}%"></i></span><span class="v">${kbText(sv.used)} / ${kbText(sv.quota)}</span></div>
    ${pct >= 80 ? '<p class="note warn">저장 공간이 거의 찼다. 안 쓰는 저장을 지우지 않으면 자동 저장이 멈출 수 있다.</p>' : ''}`;
}

// 지우기 두 번 누르기
function delBtn(st, key, label = '지우기') {
  if (st.confirm === key) return `<span class="sv-confirm"><span class="note">되돌릴 수 없다.</span><button class="danger sm" data-sv-del="${key}">정말 지우기</button><button class="ghost sm" data-sv-cancel>그만두기</button></span>`;
  return `<button class="ghost sm" data-sv-ask="${key}">${label}</button>`;
}

/** 처음 화면: 지금 하던 삶 + 보관된 삶 + 손 저장 칸 */
export function renderSavesBlock(st = {}) {
  const sv = listSaves();
  const others = [...sv.lives, ...sv.slots.filter(Boolean)];
  if (!sv.auto && !others.length) return '';
  const a = sv.auto;
  const main = a ? (a.broken ? `<div class="sv-main broken"><strong>읽을 수 없는 저장</strong>${delBtn(st, 'auto')}</div>` : `<div class="sv-main">
      <div class="sv-txt"><span class="lbl">${a.over ? '끝난 삶' : '하던 삶'} · ${MODE[a.mode] ?? ''}</span><strong>${who(a)}</strong><span class="note">${facts(a)}</span></div>
      <div class="sv-btns"><button class="primary" id="cont-auto" data-sv-play="auto">${a.over ? '돌아보기' : '이어 하기'}</button>${delBtn(st, 'auto')}</div>
    </div>`) : '';
  const row = (x) => {
    if (x.broken) return `<li class="sv-row broken"><div class="sv-txt"><strong>읽을 수 없는 저장</strong><span class="note">${x.kb}KB</span></div><div class="sv-btns">${delBtn(st, x.key)}</div></li>`;
    const slot = x.key.startsWith('slot');
    const tag = slot ? `${x.key.slice(4)}번 칸 저장${x.savedAt ? ` · ${when(x.savedAt)}` : ''}` : `보관한 삶 · ${MODE[x.mode] ?? ''}${x.over ? ' · 끝남' : ''}${x.shelved ? ` · ${when(x.shelved)}` : ''}`;
    return `<li class="sv-row"><div class="sv-txt"><span class="lbl">${tag}</span><strong>${who(x)}</strong><span class="note">${facts(x)}</span></div>
      <div class="sv-btns"><button class="ghost sm" ${slot ? `data-slot="${x.key.slice(4)}"` : `data-life="${x.key}"`}>불러오기</button>${delBtn(st, x.key)}</div></li>`;
  };
  return `<section class="saves">
    ${main}
    ${others.length ? `<details class="sv-others"${st.open || st.confirm ? ' open' : ''}><summary>다른 삶과 저장 ${others.length}개</summary><ul>${others.map(row).join('')}</ul>
      <p class="note">다른 삶을 불러오면 지금 하던 삶은 지워지지 않고 여기에 보관된다. 한 번뿐인 삶은 자리만 옮길 뿐, 되돌릴 저장이 생기지는 않는다.</p></details>` : ''}
    ${meter(sv)}
  </section>`;
}

/** 설정 화면: 자유 모드의 손 저장 칸 (한 번뿐인 삶은 설명만) */
export function renderSlotsBlock(game, st = {}) {
  const sv = listSaves();
  if (game.mode === 'once') {
    return `<section class="card"><h2>저장</h2>
      <p class="note">한 번뿐인 삶: 매달 자동으로 저장된다. 예전으로 돌아갈 수는 없다. 처음 화면으로 나가도 이 삶은 그대로 남아 있다가, 다른 삶을 시작하면 '다른 삶'에 보관된다.</p>
      ${meter(sv)}
      <div class="actions-row"><button class="ghost" id="to-title">처음 화면으로</button></div></section>`;
  }
  const mine = lifeId(game);
  const rows = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const n = i + 1, x = sv.slots[i];
    const key = 'slot' + n;
    const other = x && !x.broken && x.id !== mine;
    let btn;
    if (st.saved === n) btn = '<span class="sv-ok">저장했다</span>';
    else if (st.failed === n) btn = '<span class="warn">저장 공간이 모자라다</span>';
    else if (x && st.confirmSave === n) btn = `<span class="sv-confirm"><span class="note">${other ? '다른 삶의 저장이다. ' : ''}덮어쓸까?</span><button class="primary sm" data-sv-save="${n}">덮어쓰기</button><button class="ghost sm" data-sv-cancel>그만두기</button></span>`;
    else btn = `<button class="${x ? 'ghost' : 'primary'} sm" ${x ? `data-sv-asksave="${n}"` : `data-sv-save="${n}"`}>${x ? '덮어쓰기' : '여기에 저장'}</button>`;
    return `<li class="sv-row${x ? '' : ' empty'}"><div class="sv-txt"><span class="lbl">${n}번 칸${x?.savedAt ? ` · ${when(x.savedAt)}` : ''}</span>
        ${x ? (x.broken ? '<strong>읽을 수 없는 저장</strong>' : `<strong>${who(x)}${other ? ' <em>다른 삶</em>' : ''}</strong><span class="note">${facts(x)}</span>`) : '<span class="note">비어 있음</span>'}</div>
      <div class="sv-btns">${btn}${x ? delBtn(st, key) : ''}</div></li>`;
  }).join('');
  return `<section class="card saves-card"><h2>저장 <small>자유 모드 · 칸 ${SLOT_COUNT}개</small></h2>
    <p class="note">원하는 칸에 저장하고, 처음 화면에서 불러올 수 있다. 매달 자동 저장도 따로 된다.</p>
    <ul class="sv-slots">${rows}</ul>
    ${meter(sv)}
    <div class="actions-row"><button class="ghost" id="to-title">처음 화면으로</button></div></section>`;
}

/** 두 화면 공용 묶기. ctx: { rerender, play(game) 처음 화면에서만, game 설정 화면에서만 } */
export function bindSaves(st, ctx) {
  const $$ = (q) => [...document.querySelectorAll(q)];
  const clear = () => { st.confirm = null; st.confirmSave = null; st.saved = null; st.failed = null; };
  $$('[data-sv-ask]').forEach((b) => b.onclick = () => { clear(); st.confirm = b.dataset.svAsk; ctx.rerender(); });
  $$('[data-sv-cancel]').forEach((b) => b.onclick = () => { clear(); ctx.rerender(); });
  $$('[data-sv-del]').forEach((b) => b.onclick = () => { removeSave(b.dataset.svDel); clear(); ctx.rerender(); });
  const det = document.querySelector('details.sv-others');
  if (det) det.ontoggle = () => { st.open = det.open; };
  if (ctx.play) {
    $$('[data-sv-play]').forEach((b) => b.onclick = () => { clear(); ctx.play(resumeLife('auto')); });
    $$('[data-life]').forEach((b) => b.onclick = () => { clear(); const g = resumeLife(b.dataset.life); if (g) ctx.play(g); else alertSpace(b); });
    $$('[data-slot]').forEach((b) => b.onclick = () => { clear(); const g = loadSlot(+b.dataset.slot); if (g) ctx.play(g); else alertSpace(b); });
  }
  if (ctx.game) {
    $$('[data-sv-asksave]').forEach((b) => b.onclick = () => { clear(); st.confirmSave = +b.dataset.svAsksave; ctx.rerender(); });
    $$('[data-sv-save]').forEach((b) => b.onclick = () => { const n = +b.dataset.svSave; clear(); if (writeSlot(ctx.game, n)) st.saved = n; else st.failed = n; ctx.rerender(); });
  }
}

function alertSpace(btn) {
  const n = document.createElement('span');
  n.className = 'warn';
  n.textContent = ' 저장 공간이 모자라 하던 삶을 보관할 수 없다. 안 쓰는 저장을 지워 주세요.';
  btn.after(n);
}
