// 49단계 '새 교단과 종교 개혁' 화면(src/sect). 읽기만 한다.
// sectView(s): '나' 화면 덩이 '내 교단' (내가 믿거나 세운 교단: 가르침·신도·헌금·성지·박해, 교단 안 사람들, 기록)
// sectsView(s): '지도' 화면 카드 '새 믿음들' (세상에 생겨난 교단들, 나라가 받아들였나 금했나)
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'sect', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withSectGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const txt = (x) => (typeof x === 'string' ? x : x?.text ?? '');

export function sectView(s) {
  const m = s?.mine;
  if (!m) return '';
  const v = m.persecuted ? 'trial' : m.founder ? 'preach' : 'worship';
  const src = art(v);
  return `<div class="block sx-block">
    <h3>내 교단 <small>${esc(m.name)}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="교단">` : ''}
    <p class="note">${[m.founder ? '내가 세웠다' : m.role ? esc(m.role) : '신도', m.prophet && !m.founder ? `교주 ${esc(m.prophet)}` : '', m.since ? `${m.since}년부터` : '', m.holy ? `성지 ${esc(m.holy)}` : ''].filter(Boolean).join(' · ')}</p>
    ${list(m.teach).length ? `<ul class="sx-teach">${m.teach.map((t) => `<li>${esc(txt(t))}</li>`).join('')}</ul>` : ''}
    ${m.followers != null ? `<div class="wd-row kn-row"><span>신도 ${m.followers}명${m.followersWord ? ` · ${esc(m.followersWord)}` : ''}</span>${bar(Math.min(100, Math.sqrt(m.followers) * 4), 'kin')}</div>` : ''}
    ${m.zeal != null ? `<div class="wd-row kn-row"><span>믿음의 열기</span>${bar(m.zeal, 'mana')}</div>` : ''}
    ${m.purse != null ? `<p class="note">헌금 은화 ${m.purse}닢</p>` : ''}
    ${m.persecuted ? `<p class="note"><b class="down">박해</b> ${esc(txt(m.persecuted))}</p>` : ''}
    ${m.realm ? `<p class="note">나라의 눈: ${esc(txt(m.realm))}</p>` : ''}
    ${list(m.split).length ? `<p class="note">갈라져 나간 무리: ${m.split.map((x) => esc(txt(x) || x.name)).join(', ')}</p>` : ''}
    ${list(m.log).length ? `<details class="pl-more"><summary>교단에서 있었던 일 ${m.log.length}가지</summary><ul class="pl-news">${m.log.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

function sectRow(x) {
  return `<li class="sx-one${x.gone ? ' gone' : ''}">
    <div class="pi-top"><b>${esc(x.name)}</b>${x.stand ? `<em class="${/금|박해|이단/.test(x.stand) ? 'down' : /허락|받아/.test(x.stand) ? 'up' : 'plain'}">${esc(x.stand)}</em>` : ''}</div>
    <p class="note">${[x.prophet ? `교주 ${x.prophet}` : '', x.place, x.followers != null ? `신도 ${x.followers}` : '', x.word].filter(Boolean).map(esc).join(' · ')}</p>
  </li>`;
}

export function sectsView(s) {
  const all = list(s?.sects);
  if (!all.length) return '';
  const live = all.filter((x) => !x.gone);
  return `<section class="card sx-card">
    <h2>새 믿음들 <small>${live.length}</small></h2>
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    <ul class="pi-crews">${live.map(sectRow).join('')}</ul>
    ${all.length > live.length ? `<details class="pl-more"><summary>사라진 교단 ${all.length - live.length}</summary><ul class="pi-crews">${all.filter((x) => x.gone).map(sectRow).join('')}</ul></details>` : ''}
    ${list(s.news).length ? `<details class="pl-more"><summary>믿음 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
