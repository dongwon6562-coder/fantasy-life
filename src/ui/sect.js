// 49단계 '새 교단과 종교 개혁' 화면(src/sect). 읽기만 한다.
// sectView(s): '나' 화면 덩이 '내 교단' (내가 믿거나 세운 교단: 가르침·신도·헌금·성지·박해, 퍼진 고장, 기록)
// sectsView(s): '지도' 화면 카드 '새 믿음들' (세상에 생겨난 교단들, 이 고장이 받아들였나 금했나, 개혁 운동)
import { sectInfo } from '../sect/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'sect', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const standCls = (w) => (/금지/.test(w ?? '') ? 'down' : /받아들/.test(w ?? '') ? 'up' : 'plain');

export function sectView(s) {
  const m = s?.mine;
  if (!m) return '';
  const banned = list(m.persecuted);
  const v = banned.length ? 'trial' : m.role === '세운 이' ? 'preach' : 'worship';
  const src = art(v);
  return `<div class="block sx-block">
    <h3>내 교단 <small>${esc(m.name)}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="교단">` : ''}
    <p class="note">${[m.role, m.prophet && m.role !== '세운 이' ? `교주 ${m.prophet}` : '', m.since ? (m.role === '세운 이' ? `세운 지 ${m.since}해` : `들어온 지 ${m.since}해`) : m.role === '세운 이' ? '올해 세웠다' : '올해 들어왔다', m.holy ? `성지 ${m.holy}` : '', m.split ? `${m.split}에서 갈라져 나왔다` : ''].filter(Boolean).map(esc).join(' · ')}</p>
    ${list(m.teach).length ? `<ul class="sx-teach">${m.teach.map((t) => `<li><b>${esc(t.name)}</b>${t.claim ? ` · ${esc(t.claim)}` : ''}</li>`).join('')}</ul>` : ''}
    ${m.followers != null ? `<div class="wd-row kn-row"><span>신도 ${m.followers}명${m.purse ? ` · 헌금 ${m.purse}닢` : ''}</span>${bar(Math.min(100, Math.sqrt(m.followers) * 4), 'kin')}</div>` : ''}
    ${m.zeal != null ? `<div class="wd-row kn-row"><span>교단의 열기${m.myZeal && m.role !== '세운 이' ? ` · 내 믿음 ${m.myZeal}` : ''}</span>${bar(m.zeal, 'mana')}</div>` : ''}
    ${m.heat ? `<div class="wd-row kn-row"><span>나를 보는 눈초리</span>${bar(m.heat, m.heat >= 50 ? 'warn' : '')}</div>` : ''}
    <p class="note">이 고장에서는 <b class="${standCls(m.realm)}">${esc(m.realm ?? '')}</b>${banned.length ? ` · <b class="down">금한 나라</b> ${esc(banned.join(', '))}` : ''}</p>
    ${list(m.places).length > 1 ? `<p class="note">모이는 곳: ${m.places.map((p) => esc(`${p.place} ${p.n}명`)).join(' · ')}</p>` : ''}
    ${m.heir ? `<p class="note">뒤를 이을 사람: ${esc(m.heir)}</p>` : ''}
    ${list(m.log).length ? `<details class="pl-more"><summary>교단에서 있었던 일 ${m.log.length}가지</summary><ul class="pl-news">${m.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

function sectRow(x) {
  return `<li class="sx-one${x.gone ? ' gone' : ''}${x.here ? ' here' : ''}">
    <div class="pi-top"><b>${esc(x.name)}</b>${x.gone ? `<em class="down">${esc(x.word ?? '사라졌다')}</em>` : x.stand ? `<em class="${standCls(x.stand)}">${esc(x.stand)}</em>` : ''}</div>
    <p class="note">${[x.prophet ? `교주 ${x.prophet}` : '', x.place, x.followers ? `신도 ${x.followers}` : '', !x.gone ? x.word : ''].filter(Boolean).map(esc).join(' · ')}</p>
    ${x.teach ? `<p class="note sx-t">${esc(x.teach)}</p>` : ''}
  </li>`;
}

export function sectsView(s) {
  const all = list(s?.sects);
  if (!all.length && !s?.reform && !list(s?.news).length) return '';
  const live = all.filter((x) => !x.gone).sort((a, b) => (b.here - a.here) || (b.followers - a.followers));
  const gone = all.filter((x) => x.gone);
  const f = s.reform;
  return `<section class="card sx-card">
    <h2>새 믿음들</h2>
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    ${f ? `<p class="note"><b>개혁 운동</b> ${esc(f.done ?? `${J(f.leader, '이/가')} ${f.place}에서 · 지금 ${f.stage}`)}</p>` : ''}
    ${live.length ? `<ul class="pi-crews">${live.map(sectRow).join('')}</ul>` : ''}
    ${gone.length ? `<details class="pl-more"><summary>사라진 교단 ${gone.length}</summary><ul class="pi-crews">${gone.map(sectRow).join('')}</ul></details>` : ''}
    ${list(s.past).length ? `<p class="note">지난 믿음: ${s.past.map((p) => esc(`${p.y}년, ${String(p.text ?? '').replace(/\([a-z_]+\)/g, '')}`)).join(' ')}</p>` : ''}
    ${list(s.news).length ? `<details class="pl-more"><summary>믿음 소식 ${s.news.length}가지</summary><ul class="pl-news">${s.news.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

const withG = (g, fn) => { G = g; try { return fn(safe(() => sectInfo(g))); } finally { G = null; } };
export const renderSectBlock = (game) => withG(game, sectView);
export const renderSectsMap = (game) => withG(game, sectsView);
