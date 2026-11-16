// 14단계 '글과 예술' 화면(src/arts). 읽기만 한다.
// '나' 화면 덩이: 이름값, 짓는 중인 작품, 후원자, 내 작품(선대 것 포함). 레오니아 연대기 '책과 작품' 칸: 세상의 작품과 금서.
import { artsInfo } from '../arts/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const PATRON_KIND = { noble: '귀족 가문', company: '상단', church: '교단', crown: '왕실' };

const workLi = (w, { showAuthor = false } = {}) => {
  const tags = [];
  if (w.banned) tags.push([w.banned, 'dark']);
  if (w.ancestor) tags.push(['선대의 작품', 'heir']);
  if (w.patron) tags.push([`${w.patron}에게 바침`, '']);
  return `<li class="ar-work${w.banned ? ' banned' : ''}">
    <div class="top"><strong>《${esc(w.title)}》</strong><span class="note">${esc(w.kindName)}${w.themeName ? ` · ${esc(w.themeName)}` : ''}</span></div>
    <span class="note">${showAuthor && w.author ? `${esc(w.author)} · ` : ''}${w.year}년 · ${esc(w.qualityWord)} · 사본 ${w.copies}</span>
    <div class="wd-row kn-row"><span>평판 ${w.esteem} · ${esc(w.esteemWord)}</span>${bar(w.esteem, w.banned ? 'low' : 'fame')}</div>
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
  </li>`;
};

/** '나' 화면 덩이 */
export function renderArtsBlock(game) {
  const s = safe(() => artsInfo(game));
  if (!s) return '';
  if (!s.draft && !s.patron && !s.mine.length && !s.lost.length && !s.made && !s.log.length) return '';
  const d = s.draft;
  const draft = d ? `<div class="tw-mem">
      <div class="top"><strong>《${esc(d.title)}》</strong><span class="note">${esc(d.kindName)}${d.themeName ? ` · ${esc(d.themeName)}` : ''} · ${d.months}달째</span></div>
      <div class="wd-row kn-row"><span>짓는 중 ${Math.round(d.prog * 100)}%</span>${bar(d.prog * 100, 'kin')}</div>
    </div>` : '';
  const P = s.patron;
  const patron = P ? `<div class="tw-mem">
      <div class="top"><strong>후원: ${esc(P.name)}</strong><span class="note">${esc(PATRON_KIND[P.kind] ?? '')} · 달마다 은화 ${P.stipend}닢</span></div>
      <span class="note">바라는 결: ${esc(P.want)}</span>
      <div class="wd-row kn-row"><span>마음 · ${esc(P.moodWord)}</span>${bar(P.mood, P.mood < 40 ? 'low' : 'kin')}</div>
    </div>` : '';
  const SHOW = 3;
  const top = s.mine.slice(0, SHOW);
  const rest = s.mine.slice(SHOW);
  return `<div class="block arts-block">
    <h3>글과 예술</h3>
    <div class="wd-row kn-row"><span>이름 ${s.fame} · ${esc(s.fameWord)}</span>${bar(s.fame, 'fame')}</div>
    ${draft}${patron}
    ${top.length ? `<h4 class="ct-h">남긴 작품 ${s.mine.length}점</h4><ul class="ct-houses ar-works">${top.map((w) => workLi(w)).join('')}</ul>` : ''}
    ${rest.length ? `<details class="pl-more"><summary>그 밖의 작품 ${rest.length}점</summary><ul class="ct-houses ar-works">${rest.map((w) => workLi(w)).join('')}</ul></details>` : ''}
    ${s.lost.length ? `<p class="note">사라진 작품: ${s.lost.map((w) => `《${esc(w.title)}》`).join(', ')}</p>` : ''}
    ${s.library ? `<p class="note">이 고장에 ${esc(s.library)}가 있다. 남의 책을 읽을 수 있다.</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>작품에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

/** 레오니아 연대기 '책과 작품' 칸 */
export function renderArtsWorld(game) {
  const s = safe(() => artsInfo(game));
  if (!s) return '<p class="note">아직 이름난 작품이 없다.</p>';
  const world = s.world;
  const banned = s.banned;
  return `${world.length ? `<h3 class="sub">이름난 작품</h3><ul class="ct-houses ar-works">${world.slice(0, 8).map((w) => workLi(w, { showAuthor: true })).join('')}</ul>
      ${world.length > 8 ? `<details class="pl-more"><summary>그 밖의 작품 ${world.length - 8}점</summary><ul class="ct-houses ar-works">${world.slice(8).map((w) => workLi(w, { showAuthor: true })).join('')}</ul></details>` : ''}` : '<p class="note">아직 이름난 작품이 없다.</p>'}
    ${banned.length ? `<h3 class="sub">금서</h3><ul class="ct-houses ar-works">${banned.map((w) => workLi(w, { showAuthor: true })).join('')}</ul>` : ''}
    <p class="note">작품의 평판은 세월 따라 바뀐다. 임금이 바뀌면 찬양 글이 깎이고, 교단의 힘이 기울면 금서가 풀린다.</p>`;
}
