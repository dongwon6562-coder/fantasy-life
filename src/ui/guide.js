// 처음 하는 사람 안내: 화면의 한 곳을 가리키는 말풍선을 하나씩 띄운다.
// 그 자리가 화면에 있을 때만 나온다(아기 땐 계획 칸이 없으니 세 살이 되어 처음 보일 때 나온다).
// 사건 창이 떠 있으면 나오지 않는다. 본 단계는 설정에 저장되어 다시 나오지 않는다.
import { prefs, setPref } from './settings.js';
import { esc } from './util.js';

const STEPS = [
  { id: 'scene', sel: '.scene', title: '지금 사는 곳', text: '위 그림은 지금 사는 곳의 풍경이다. 계절과 날씨, 흉년이나 역병에 따라 달마다 바뀐다.' },
  { id: 'news', sel: '.news-card', title: '오늘의 장면', text: '지금 있는 고장의 풍경과, 지난달 내가 한 일, 마주친 사람들과 들려온 소식이 여기 적힌다. 사람들은 내가 보지 않아도 각자의 삶을 산다.' },
  { id: 'baby', sel: '.plan .baby', title: '아기 시절', text: '아기는 스스로 고를 수 있는 일이 없다. 세 살이 되면 한 달을 직접 계획한다. 그때까지는 아래 단추로 달을 넘긴다.' },
  { id: 'slots', sel: '.slotbar', title: '한 달의 칸', text: '한 달은 몇 칸으로 나뉜다. 먼저 칸을 하나 고른다.' },
  { id: 'acts', sel: '.acts', title: '할 일 고르기', text: '카드를 누르면 고른 칸에 그 일이 들어가고, 다음 칸으로 넘어간다. 같은 일을 여러 칸에 넣어도 된다.' },
  { id: 'go', sel: '#go', title: '한 달 보내기', text: '이 단추로 한 달을 보낸다. 계획을 짜게 되면 다 짠 뒤에 누른다. 그사이 무슨 일이 생기면 편지처럼 창이 뜬다.' },
  { id: 'nav', sel: '.nav', title: '다른 화면', text: '내 몸과 능력, 아는 사람들, 대륙 지도, 연대기, 저장과 설정은 이 막대에서 본다.' },
  // 처음 몇 달 뒤, 그 자리가 처음 화면에 나타날 때 한 번씩
  { id: 'youth', sel: 'details.youth', title: '자라는 중', text: '어릴 때 가장 많이 한 일로 마을이 기억하는 아이가 정해진다. 누르면 소꿉친구와 글방 이야기가 펼쳐진다.' },
  { id: 'groups', sel: '.act-group h4', title: '할 일 묶음', text: '할 일은 일, 배움, 사람, 길 같은 묶음으로 나뉜다. 열다섯 살이 되면 일자리와 길 떠나기가 열린다.' },
  { id: 'crisis', sel: '.card.crisis', title: '나라의 큰일', text: '마물, 역병, 전쟁 같은 큰일은 몇 해에 걸쳐 온다. 맞설지, 몸을 사릴지, 이용할지는 내가 고른다.' },
  { id: 'party', sel: '.card.party', title: '동료', text: '함께 다니는 동료들이다. 믿음이 낮으면 떠나고, 싸움에서 다치거나 죽을 수도 있다.' },
  { id: 'house', sel: '.card.legacy', title: '가문 기록', text: '대를 이을 때마다 여기에 한 사람의 삶이 남는다. 이름을 누르면 그 사람의 연표를 볼 수 있다.' },
];

let host = null;
let onResize = null;

function clear() {
  host?.remove();
  host = null;
  if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
}

const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};

/** 화면을 다 그린 뒤 부른다. 볼 단계가 있으면 말풍선을 띄운다. */
export function runGuide(ctx = {}) {
  clear();
  if (ctx.blocked) return;
  const seen = prefs().guideSeen ?? {};
  if (seen.all) return; // 자동 점검 도구 등에서 안내를 통째로 끌 때
  const todo = STEPS.filter((s) => !seen[s.id]);
  const step = todo.find((s) => visible(document.querySelector(s.sel)));
  if (!step) return;
  const left = todo.filter((s) => visible(document.querySelector(s.sel))).length;
  const target = document.querySelector(step.sel);

  host = document.createElement('div');
  host.className = 'guide';
  host.innerHTML = `
    <div class="guide-ring" aria-hidden="true"></div>
    <div class="guide-bubble" role="dialog" aria-live="polite" aria-label="안내: ${esc(step.title)}">
      <strong>${esc(step.title)}</strong>
      <p>${esc(step.text)}</p>
      <div class="guide-btns">
        <button class="ghost sm" data-guide="stop">안내 그만 보기</button>
        <button class="primary sm" data-guide="next">${left > 1 ? '다음' : '알겠다'}</button>
      </div>
    </div>`;
  document.body.appendChild(host);

  const place = () => {
    if (!host) return;
    const r = target.getBoundingClientRect();
    const fixed = getComputedStyle(target).position === 'fixed' || getComputedStyle(target).position === 'sticky';
    const sx = fixed ? 0 : window.scrollX, sy = fixed ? 0 : window.scrollY;
    host.classList.toggle('fixed', fixed);
    const ring = host.querySelector('.guide-ring');
    const pad = 4;
    Object.assign(ring.style, { left: `${r.left + sx - pad}px`, top: `${r.top + sy - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const b = host.querySelector('.guide-bubble');
    const bw = Math.min(320, window.innerWidth - 24);
    b.style.width = `${bw}px`;
    const bh = b.offsetHeight;
    // 화면 아래에 붙은 탭 막대는 가리지 않는다 (막대 자체를 가리킬 때는 빼고)
    const nav = document.querySelector('.nav');
    const navTop = nav && nav !== target && getComputedStyle(nav).position === 'fixed' ? nav.getBoundingClientRect().top : window.innerHeight;
    const vh = Math.min(window.innerHeight, navTop);
    // 아래 자리가 있으면 아래, 아니면 위에
    let top = r.bottom + 10;
    let above = false;
    if (top + bh > vh - 8 && r.top - bh - 10 > 8) { top = r.top - bh - 10; above = true; }
    top = Math.max(8, Math.min(top, vh - bh - 8));
    const left = Math.max(12, Math.min(r.left + r.width / 2 - bw / 2, window.innerWidth - bw - 12));
    b.classList.toggle('above', above);
    b.style.left = `${left + sx}px`;
    b.style.top = `${top + sy}px`;
    b.style.setProperty('--arrow-x', `${Math.max(16, Math.min(bw - 16, r.left + r.width / 2 - left))}px`);
  };

  // 가리키는 곳이 화면 밖이면 보이게 굴린 뒤 자리를 잡는다
  const r = target.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) target.scrollIntoView({ block: 'center' });
  place();
  onResize = () => place();
  window.addEventListener('resize', onResize);

  host.querySelector('[data-guide="next"]').onclick = () => {
    setPref('guideSeen', { ...(prefs().guideSeen ?? {}), [step.id]: 1 });
    runGuide(ctx);
  };
  host.querySelector('[data-guide="stop"]').onclick = () => {
    setPref('guideSeen', Object.fromEntries(STEPS.map((s) => [s.id, 1])));
    clear();
  };
  host.querySelector('[data-guide="next"]').focus({ preventScroll: true });
}

export const stopGuide = clear;
