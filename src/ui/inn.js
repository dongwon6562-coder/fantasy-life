// 19단계 '주점과 여관 꾸리기' 화면(src/inn). 읽기만 한다.
// renderInnNow: 이번 달 화면의 접는 카드 (가게가 있을 때). 지난달 장부, 이름값·깔끔함, 일꾼, 단골, 뒷방·패거리·경쟁 가게·세금.
// renderInnBlock: '나' 화면 덩이 (가게 내력, 잃거나 판 가게, 기록)
import { innStatus } from '../inn/index.js';
import { J } from '../narrative/text.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const coin = (n) => `은화 ${Math.round(n)}닢`;
const GANG = { paid: '자릿세를 낸다', refused: '자릿세를 거절했다', stood: '맞서 물리쳤다' };
const moodWord = (m) => (m >= 70 ? '흡족하다' : m >= 45 ? '자주 온다' : m >= 25 ? '뜸하다' : '발길을 끊으려 한다');
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderInnNow(game, ui = {}) {
  const s = safe(() => innStatus(game));
  const n = s?.inn;
  if (!n) return '';
  const L = n.last;
  const ledger = [['손님', `${L.guests}명`], ['번 돈', coin(L.rev), 'up'], ['든 돈', coin(L.cost), 'down'], ['남은 것', coin(L.net), L.net < 0 ? 'down' : 'up']];
  const warn = [];
  if (n.arrears) warn.push(`밀린 세금 ${coin(n.arrears)}`);
  if (n.heat >= 30) warn.push(`경비대 눈초리 ${n.heat >= 60 ? '날카롭다' : '쏠린다'}`);
  const back = [n.backroom?.gamble ? '노름판' : '', n.backroom?.smuggle ? '밀수품 창고' : ''].filter(Boolean);
  const worker = (w) => `<li><div class="wd-row kn-row"><span><strong>${esc(w.name)}</strong> · ${esc(w.roleName)} · 달마다 ${coin(w.wage)}</span>${bar(w.loyal, w.loyal < 30 ? 'low' : 'kin')}</div><span class="note">솜씨 ${w.skill}</span></li>`;
  const regular = (x) => `<li><div class="wd-row kn-row"><span><strong>${esc(x.name)}</strong> · ${esc(moodWord(x.mood))}${x.tab ? ` · <b class="warn">외상 ${x.tab}닢</b>` : ''}</span>${bar(x.mood, x.mood < 25 ? 'low' : 'kin')}</div><span class="note">${esc(x.desc)}</span></li>`;
  return `<details class="card workshop inn-card"${ui.innOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">내 ${esc(n.kindName)}</span><strong>${esc(n.title)}${n.gens > 1 ? ` · ${n.gens}대째` : ''}</strong></span>
      <span class="ws-demand ${L.net < 0 ? 'down' : 'up'}">지난달 손님 ${L.guests}명 · ${L.net < 0 ? '' : '+'}${L.net}닢</span>
    </summary>
    <div class="ws-body">
      <p class="note">${esc(n.placeName)}${n.here ? ' · 여기' : ' · <b class="warn">지금 떠나 있다</b>'} · ${n.founded}년부터 · ${esc(n.fameWord)} 가게${n.kind === 'inn' ? ` · 방 ${n.rooms}/${n.maxRooms}칸` : ''} · 값 ${esc(n.priceName)}</p>
      <div class="sm-chips">${ledger.map(chip).join('')}</div>
      ${n.forecast ? `<p class="note">이번 달 어림: 손님 ${n.forecast.guests}명 · 남는 돈 ${coin(n.forecast.net)}${n.forecast.tax ? ` (세금 ${coin(n.forecast.tax)} 포함)` : ''}</p>` : ''}
      ${warn.length ? `<p class="note warn">${warn.map(esc).join(' · ')}</p>` : ''}
      <div class="wd-row kn-row"><span>이름값 · ${esc(n.fameWord)}</span>${bar(n.fame, 'kin')}</div>
      <div class="wd-row kn-row"><span>깔끔함</span>${bar(n.clean, n.clean < 35 ? 'low' : '')}</div>
      <p class="note">음식: ${esc(n.foodWord)} · 세율 ${Math.round(n.taxRate * 100)}푼${n.dodged ? ` · 세금을 피한 달 ${n.dodged}번` : ''}</p>
      ${back.length || n.gang ? `<p class="note">${[back.length ? `뒷방: ${back.join(', ')}` : '', n.gang ? `${esc(n.gang.name)}${n.gang.state ? ` · ${GANG[n.gang.state] ?? ''}` : ' · 이 고장 패거리'}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
      ${n.rival ? `<div class="wd-row kn-row"><span>경쟁 가게 ${esc(n.rival.name)}${n.rival.power >= 50 ? ' · <b class="warn">우리보다 세다</b>' : ''}</span>${bar(n.rival.power, 'low')}</div>` : ''}
      ${n.workers.length ? `<h4 class="ct-h">일꾼 ${n.workers.length}명</h4><ul class="ct-houses inn-list">${n.workers.map(worker).join('')}</ul>` : '<p class="note">일꾼이 없다. 할 일의 \'가게를 꾸린다\'로 들인다.</p>'}
      ${n.regulars.length ? `<h4 class="ct-h">단골 ${n.regulars.length}명</h4><ul class="ct-houses inn-list">${n.regulars.map(regular).join('')}</ul>` : ''}
    </div>
  </details>`;
}

export function renderInnBlock(game) {
  const s = safe(() => innStatus(game));
  if (!s) return '';
  const n = s.inn;
  if (!n && !s.lost.length && !s.log.length) return '';
  const chips = [];
  if (n) {
    chips.push(['가게 값', coin(n.worth)]);
    chips.push(['지금까지 번 돈', coin(n.total), n.total < 0 ? 'down' : 'up']);
    if (n.months) chips.push(['꾸린 달', `${n.months}달`]);
  }
  if (s.opened > 1) chips.push(['연 가게', `${s.opened}곳`]);
  if (s.sold) chips.push(['판 가게', `${s.sold}곳`]);
  return `<div class="block inn-block">
    <h3>내 가게</h3>
    ${n ? `<p class="note"><b>${esc(n.title)}</b> · ${esc(n.placeName)} · ${n.founded}년${n.by ? ` ${esc(J(n.by, '이/가'))} 엶` : ''}${n.gens > 1 ? ` · ${n.gens}대째` : ''}. 장부는 '이번 달' 화면에.</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.lost.length ? `<details class="pl-more"><summary>떠나보낸 가게 ${s.lost.length}곳</summary><ul class="pl-news">${s.lost.map((x) => `<li><time>${x.year}년</time><span>${esc(x.placeName)} ${esc(x.name)} · ${esc(x.how)}${x.gens > 1 ? ` · ${x.gens}대 이어 온 가게` : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>가게에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((x) => `<li><time>${x.y}년${x.m ? ` ${x.m}월` : ''}</time><span>${esc(x.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
