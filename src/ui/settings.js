// 설정: 글자 크기, 움직임 줄이기, 달 넘김 카드, 글 드러내기, 음량(음악·효과음), 안내 다시 보기.
// 값은 이 기기에만 저장된다(저장 파일과 따로). 소리 쪽(src/audio/)은 이렇게 쓴다:
//   import { prefs, onPrefs } from '../ui/settings.js';
//   prefs().music   // 0~1
//   onPrefs((p) => setVolume(p.music, p.sfx));  // 값이 바뀔 때마다 불린다
// 같은 내용이 window의 'fl-prefs' 이벤트(detail = 설정값)로도 나간다.
import { icon } from '../art/icons.js';

const KEY = 'fantasy-life:prefs';
const DEFAULTS = {
  text: 'm',          // 글자 크기: m 보통, l 크게, xl 아주 크게
  motion: 'auto',     // 움직임: auto 기기 설정 따름, full 켬, reduce 줄임
  monthCard: true,    // 한 달이 넘어갈 때 날짜 카드
  reveal: true,       // 글이 한 줄씩 드러나기 (오늘의 장면·사건 창)
  music: 0.6,         // 음악 음량 0~1
  sfx: 0.8,           // 효과음 음량 0~1
  guideSeen: {},      // 처음 안내에서 본 단계들
};

let cur = null;
const listeners = [];

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}

export function prefs() {
  if (!cur) cur = read();
  return cur;
}

export function setPref(k, v) {
  prefs()[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* 저장 못 해도 이번 판에서는 쓴다 */ }
  applyPrefs();
  for (const fn of listeners) { try { fn(cur, k); } catch (e) { console.error(e); } }
  try { window.dispatchEvent(new CustomEvent('fl-prefs', { detail: { ...cur, changed: k } })); } catch { /* 노드 시험 */ }
}

/** 설정이 바뀔 때마다 fn(설정값, 바뀐 키)를 부른다. 떼어 낼 함수를 돌려준다. */
export function onPrefs(fn) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}

/** 움직임을 줄여야 하나 (설정이 '기기 따름'이면 기기의 '동작 줄이기'를 본다) */
export function reducedMotion() {
  const m = prefs().motion;
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** 글이 한 줄씩 드러나야 하나. 움직임을 줄였으면 끈다. 자동 점검 브라우저(webdriver)에서도 끈다 (reveal: 'force'면 켬). */
export function revealOn() {
  const r = prefs().reveal;
  if (!r || reducedMotion()) return false;
  try { if (navigator.webdriver && r !== 'force') return false; } catch { /* 노드 */ }
  return true;
}

/** 창이 걷히는 것처럼 기다림이 끼는 전환을 써도 되나 (움직임을 줄였거나 자동 점검 브라우저면 아니다) */
export function smoothOn() {
  if (reducedMotion()) return false;
  try { if (navigator.webdriver) return false; } catch { /* 노드 */ }
  return true;
}

/** 문서에 설정을 반영한다: <html data-text="l" class="motion"> */
export function applyPrefs() {
  if (typeof document === 'undefined') return;
  const h = document.documentElement;
  h.dataset.text = prefs().text;
  h.classList.toggle('motion', !reducedMotion());
}

const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, label]) => `<button data-pref="${k}" data-val="${v}" aria-pressed="${prefs()[k] === v}">${label}</button>`).join('')}</div>`;
const slider = (k, label) => `
  <label class="vol"><span>${label}</span>
    <input type="range" min="0" max="100" step="5" data-vol="${k}" value="${Math.round(prefs()[k] * 100)}" aria-label="${label} 음량">
    <output>${Math.round(prefs()[k] * 100)}</output>
  </label>`;

export function renderSettings() {
  const p = prefs();
  return `<section class="card settings">
    <h2>설정 <small>이 기기에만 저장된다</small></h2>
    <div class="set-row"><span class="lbl">${icon('quill', 18)}글자 크기</span>${seg('text', [['m', '보통'], ['l', '크게'], ['xl', '아주 크게']])}</div>
    <div class="set-row"><span class="lbl">${icon('wing', 18)}화면 움직임</span>${seg('motion', [['auto', '기기 따름'], ['full', '켜기'], ['reduce', '줄이기']])}</div>
    <div class="set-row"><span class="lbl">${icon('hourglass', 18)}달 넘김 카드</span>${seg('monthCard', [[true, '보기'], [false, '안 보기']])}</div>
    <div class="set-row"><span class="lbl">${icon('scroll', 18)}글 드러내기</span>${seg('reveal', [[true, '한 줄씩'], [false, '한꺼번에']])}</div>
    <div class="audio-host" id="audio-host">
      <div class="set-row vols"><span class="lbl">${icon('lute', 18)}소리</span><div class="vol-list">${slider('music', '음악')}${slider('sfx', '효과음')}</div></div>
      <p class="note">소리는 화면을 처음 누른 뒤부터 난다.</p>
    </div>
    <div class="actions-row"><button class="ghost sm" id="guide-again">처음 안내 다시 보기</button></div>
    <details class="credits"><summary>소리 출처</summary>
      <p class="note">효과음·환경음: Freesound의 CC0 녹음들. 악기 소리: VSCO 2: Community Edition (Versilian Studios, CC0), FluidR3_GM 사운드폰트 (Frank Wen) — midi-js-soundfonts (Benjamin Gleitzman), CC BY 3.0. 곡은 이 게임을 위해 새로 썼다. 자세한 목록은 저장소의 docs/CREDITS.md.</p>
    </details>
  </section>`;
}

export function bindSettings(rerender, onGuideAgain) {
  document.querySelectorAll('[data-pref]').forEach((b) => b.onclick = () => {
    const raw = b.dataset.val;
    setPref(b.dataset.pref, raw === 'true' ? true : raw === 'false' ? false : raw);
    rerender();
  });
  document.querySelectorAll('[data-vol]').forEach((r) => {
    const out = r.parentElement.querySelector('output');
    r.oninput = () => { out.textContent = r.value; setPref(r.dataset.vol, +r.value / 100); };
  });
  const ga = document.getElementById('guide-again');
  if (ga) ga.onclick = () => { setPref('guideSeen', {}); onGuideAgain?.(); };
}
