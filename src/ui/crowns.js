// 44단계 '나라마다 다른 왕가와 궁정' 화면(src/crowns). 읽기만 한다. 레오니아는 8단계 court 그대로.
// crownBox(g, id): 지도 나라 정보 칸에 붙는 덩이 (다스리는 틀·자리·대를 잇는 법, 나라가 얼마나 단단한가, 두 쪽의 기울기, 후계 후보, 내 벼슬과 다음 자리)
// renderCrownsMap: 지도 화면 카드 (나라마다 다스리는 이와 흔들림, 궁정 소식)
// renderCrownsBlock: '나' 화면 덩이 (남의 나라 궁정에서 맡은 자리·총애·기록)
import { crownInfo, crownsInfo } from '../crowns/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const news = (list, realm) => (list.length ? `<ul class="pl-news">${list.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${realm && n.realm ? `${esc(n.realm)} · ` : ''}${esc(n.text)}</span></li>`).join('')}</ul>` : '');

export function crownBox(g, id) {
  const c = safe(() => crownInfo(g, id));
  if (!c) return '';
  const [a, b] = c.sides;
  return `<div class="cr-box">
    <p class="cr-frame"><b>${esc(c.frame)}</b> · ${esc(c.body)}${c.seat ? ` · ${esc(c.seat)}` : ''}</p>
    <p class="note">${esc(c.ruler)}</p>
    <p class="note cr-how">${esc(c.how)}</p>
    <div class="wd-row kn-row"><span>나라 · ${esc(c.stabWord)}</span>${bar(c.stab, c.stab < 35 ? 'low' : 'kin')}</div>
    ${a && b ? `<div class="cr-sides"><span title="${esc(a.text)}">${esc(a.name)} ${a.lean}</span>${bar(a.lean, 'mana')}<span title="${esc(b.text)}">${b.lean} ${esc(b.name)}</span></div>` : ''}
    ${c.cands.length ? `<p class="note">다음 자리를 노리는 사람</p><ul class="ag-clues">${c.cands.map((x) => `<li><b>${esc(x.name)}</b> · ${esc(x.role)}${x.age ? ` · ${x.age}살` : ''} · ${esc(x.side)} · ${esc(x.word)}${x.backed ? ' · <b class="up">내가 민다</b>' : ''}</li>`).join('')}</ul>` : ''}
    ${c.office ? `<p class="note"><b>내 자리</b> ${esc(c.office)} · 총애 ${c.favor}</p>` : ''}
    ${c.banished ? `<p class="note"><b class="down">궁정 출입 금지</b> ${c.banished}해 더</p>` : c.need ? `<p class="note">${c.office ? '다음 자리' : '벼슬하려면'}: ${esc(c.need)}</p>` : ''}
    ${c.news.length ? `<details class="pl-more"><summary>이 나라 궁정 소식 ${c.news.length}가지</summary>${news(c.news)}</details>` : ''}
  </div>`;
}

export function renderCrownsMap(game) {
  const s = safe(() => crownsInfo(game));
  if (!s || !s.realms.length) return '';
  return `<section class="card cr-map">
    <h2>대륙의 왕좌들 <small>나라 ${s.realms.length}곳</small></h2>
    ${s.realms.filter(Boolean).map((c) => `<div class="cr-one">
      <p><strong>${esc(c.short ?? c.name)}</strong> <small>${esc(c.frame)}${c.stabWord ? ` · ${esc(c.stabWord)}` : ''}</small></p>
      <div class="wd-row kn-row"><span>${esc(c.ruler)}</span>${bar(c.stab, c.stab < 35 ? 'low' : 'kin')}</div>
    </div>`).join('')}
    ${s.news.length ? `<p class="note">궁정 소식</p>${news(s.news, true)}` : ''}
  </section>`;
}

export function renderCrownsBlock(game) {
  const s = safe(() => crownsInfo(game));
  const m = s?.me;
  if (!m && !s?.log?.length) return '';
  return `<div class="block cr-block">
    <h3>남의 나라 궁정 <small>${m ? esc(m.realmName) : '물러남'}</small></h3>
    ${m ? `<p><strong>${esc(m.office)}</strong> · ${esc(m.realmName)}${m.pay ? ` · 달마다 은화 ${m.pay}닢` : ''}</p>
      <div class="wd-row kn-row"><span>총애</span>${bar(m.favor, m.favor < 25 ? 'low' : 'mana')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>궁정에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
