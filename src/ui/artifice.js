// 45단계 '마도구 장인' 화면(src/artifice). 읽기만 한다.
// artificeView(s): '나' 화면 덩이 (솜씨, 내 공방과 제자, 받은 의뢰와 기한, 만든 마도구와 지금 누구 손에, 이름난 마도구, 마석 시세, 기록)
import { esc } from './util.js';

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const GRADE = ['', '하급', '중급', '상급', '명품', '전설'];

function work(w) {
  const g = GRADE[w.grade] ?? w.gradeWord ?? '';
  const where = w.lost ? '<b class="down">도둑맞았다</b>' : w.mine ? '내가 지닌다' : w.owner ? `${esc(w.owner)} 손에` : '';
  return `<li class="af-work g${Math.min(5, w.grade ?? 1)}">
    <div><b>${esc(w.name)}</b>${g ? `<small>${g}</small>` : ''}</div>
    <p class="note">${[w.kind, w.spell ? `${w.spell} 새김` : ''].filter(Boolean).map(esc).join(' · ')}${where ? ` · ${where}` : ''}</p>
  </li>`;
}

function order(o) {
  const late = o.left != null && o.left <= 1;
  return `<li><b>${esc(o.who)}</b> · ${esc(o.want)}${o.pay ? ` · 은화 ${o.pay}닢` : ''}${o.left != null ? ` · <span class="${late ? 'down' : ''}">${o.left > 0 ? `${o.left}달 남음` : '기한이 지났다'}</span>` : ''}</li>`;
}

export function artificeView(s) {
  if (!s || (!s.skill && !s.shop && !s.works?.length && !s.log?.length)) return '';
  const sh = s.shop;
  return `<div class="block af-block">
    <h3>마도구 장인 <small>${sh ? esc(sh.name) : s.rank ? esc(s.rank) : '공방 없음'}</small></h3>
    ${s.skill != null ? `<div class="wd-row kn-row"><span>새기는 솜씨${s.skillWord ? ` · ${esc(s.skillWord)}` : ''}</span>${bar(s.skill, 'mana')}</div>` : ''}
    ${sh ? `<p class="note"><b>${esc(sh.name)}</b>${sh.place ? ` · ${esc(sh.place)}` : ''}${sh.word ? ` · ${esc(sh.word)}` : ''}${sh.apprentices?.length ? ` · 제자 ${sh.apprentices.map(esc).join(', ')}` : ''}</p>` : ''}
    ${s.price ? `<p class="note">마석 값 ${esc(s.price)}</p>` : ''}
    ${s.orders?.length ? `<p class="note">받은 의뢰</p><ul class="ag-clues">${s.orders.map(order).join('')}</ul>` : ''}
    ${s.works?.length ? `<p class="note">내가 만든 마도구 ${s.works.length}</p><ul class="af-works">${s.works.map(work).join('')}</ul>` : ''}
    ${s.famous?.length ? `<details class="pl-more"><summary>이름난 마도구 ${s.famous.length}가지</summary><ul class="af-works">${s.famous.map(work).join('')}</ul></details>` : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>공방에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
