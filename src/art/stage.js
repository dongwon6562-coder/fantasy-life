// 장면 연출 (30단계): 처음 닿은 곳, 오랜만의 귀향, 삶의 시작처럼 큰 대목에서
// 화면이 잠깐 어두워지고 그곳의 풍경이 천천히 드러난다. 그 위로 이름과 한 줄이 떠오르고, 소리는 audio/index.js가 맞춰 넣는다.
// 화면 코드(src/ui)는 건드리지 않고 맨 위에 한 겹을 얹는다. 누르면 바로 넘어간다.
// '화면 움직임 줄이기'일 때는 움직임 없이 짧게 비춘다. 자동 점검(webdriver)에서는 띄우지 않는다(window.__flStage = true면 띄움).

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fl-stage{position:fixed;inset:0;z-index:90;background:#0a0806;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(14px,3.2vh,30px);
  padding:calc(env(safe-area-inset-top,0px) + 16px) 0 calc(env(safe-area-inset-bottom,0px) + 16px);opacity:0;transition:opacity .55s ease;cursor:pointer;
  -webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;overflow:hidden}
.fl-stage.on{opacity:1}
.fl-stage.off{opacity:0;transition:opacity .9s ease;pointer-events:none}
.fl-stage .pic{position:relative;width:100%;max-width:880px;aspect-ratio:4/3;max-height:52vh;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16%,#000 80%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 16%,#000 80%,transparent 100%)}
.fl-stage .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.1) translateY(1.5%);filter:blur(7px) brightness(.45) saturate(.6);object-position:38% 50%;
  transition:opacity 2.6s ease .35s,transform 8s cubic-bezier(.16,.6,.2,1) .35s,filter 3.2s ease .35s,object-position 9s cubic-bezier(.3,.4,.3,1) .35s;will-change:transform,opacity,filter}
.fl-stage.on .pic img{opacity:1;transform:none;filter:none;object-position:60% 50%}
.fl-stage .pic::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,transparent 46%,rgba(10,8,6,.72) 100%);pointer-events:none}
.fl-stage .cap{display:grid;justify-items:center;gap:10px;padding:0 22px;text-align:center;max-width:36em}
.fl-stage .eyebrow{color:var(--brass,#c9a25a);font-size:12.5px;letter-spacing:.26em;opacity:0;transform:translateY(6px);transition:opacity 1.2s ease 1.1s,transform 1.2s ease 1.1s}
.fl-stage h2{margin:0;font-family:var(--f-display,'Gowun Batang','Noto Serif KR',serif);font-weight:700;color:var(--ink,#e8dcc6);font-size:clamp(26px,7vw,40px);letter-spacing:.14em;
  text-indent:.14em;opacity:0;transform:translateY(8px);transition:opacity 1.5s ease 1.5s,transform 1.8s ease 1.5s;text-wrap:balance}
.fl-stage .rule{width:min(190px,46vw);height:1px;background:linear-gradient(to right,transparent,var(--brass,#c9a25a) 22%,var(--brass,#c9a25a) 78%,transparent);
  transform:scaleX(0);opacity:.85;transition:transform 1.6s cubic-bezier(.2,.7,.2,1) 1.9s}
.fl-stage .line{margin:0;color:var(--muted,#a89982);font-size:14.5px;line-height:1.7;opacity:0;transition:opacity 1.6s ease 2.5s;text-wrap:pretty}
.fl-stage.on .eyebrow,.fl-stage.on h2{opacity:1;transform:none}
.fl-stage.on .rule{transform:scaleX(1)}
.fl-stage.on .line{opacity:1}
.fl-stage.still .pic img{transform:none;filter:none;object-position:50% 50%;transition:opacity 1s ease .2s}
.fl-stage.still .eyebrow,.fl-stage.still h2,.fl-stage.still .line{transform:none;transition:opacity .8s ease .4s}
.fl-stage.still .rule{transition:none;transform:scaleX(1)}
@media (min-width:700px){.fl-stage .pic{aspect-ratio:2/1}}
@media (orientation:landscape) and (max-height:520px){.fl-stage{flex-direction:row;gap:18px;padding-left:16px;padding-right:16px}.fl-stage .pic{aspect-ratio:2/1;max-width:56vw;max-height:76vh}.fl-stage .cap{max-width:38vw}}`;

let styled = false, current = null;
/** 지금 연출이 떠 있는가 */
export const stageActive = () => !!current;
/** 자동 점검 중에는 띄우지 않는다 (화면을 가려 누르기를 막으므로) */
export const stageAllowed = () => hasDom && (window.__flStage === true || !(navigator.webdriver && window.__flStage !== true));

/**
 * 연출을 띄운다. spec: { image 그림 주소, eyebrow 윗줄(작은 글), title 큰 이름, line 아랫줄, hold 머무는 시간(ms), still 움직임 없이 }
 * 돌려주는 것: { close(), done: 다 사라지면 풀리는 약속 } 또는 null(못 띄움)
 */
export function showStage(spec = {}) {
  if (!stageAllowed() || !spec.title) return null;
  if (current) current.close(true);
  if (!styled) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); styled = true; }
  const el = document.createElement('div');
  el.className = `fl-stage${spec.still ? ' still' : ''}`;
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = `${spec.image ? `<div class="pic"><img alt="" src="${esc(spec.image)}"></div>` : ''}
    <div class="cap">${spec.eyebrow ? `<span class="eyebrow">${esc(spec.eyebrow)}</span>` : ''}<h2>${esc(spec.title)}</h2><span class="rule"></span>${spec.line ? `<p class="line">${esc(spec.line)}</p>` : ''}</div>`;
  document.body.appendChild(el);
  let closed = false, timer = null, release;
  const done = new Promise((r) => { release = r; });
  const born = Date.now();
  const me = {
    el, done,
    close(now = false) {
      if (closed) return; closed = true;
      clearTimeout(timer);
      if (current === me) current = null;
      el.classList.add('off'); el.classList.remove('on');
      setTimeout(() => { el.remove(); release(); }, now ? 0 : 900);
      try { spec.onClose?.(); } catch { /* 닫는 일은 이어진다 */ }
    },
  };
  current = me;
  // 누르면 넘어간다 (뜨자마자 잘못 눌러 넘기지 않게 0.45초는 기다린다). 아래 화면으로는 누름이 새지 않는다.
  const tap = (ev) => { ev.stopPropagation(); ev.preventDefault?.(); if (Date.now() - born > 450) me.close(); };
  el.addEventListener('click', tap);
  el.addEventListener('keydown', tap);
  // 한 번 그린 뒤에 켜야 서서히 드러난다
  const on = () => { if (!closed) el.classList.add('on'); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(on)); else setTimeout(on, 30);
  timer = setTimeout(() => me.close(), spec.hold ?? (spec.still ? 3400 : 5600));
  return me;
}
