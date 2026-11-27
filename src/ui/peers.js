// 45단계 '함께 자란 세대' 화면(src/peers). 읽기만 한다.
// peersView(s): '사람들' 화면 카드 (나와 같은 해쯤 태어난 고장 사람들이 지금 어떻게 사나, 나와의 사이, 소식)
// 사람마다 한 칸: 이름·나이·고장, 걸어간 길, 지금 형편, 이름값, 나와의 사이, 마지막으로 본 일. 죽은 사람은 흐리게.
import { peersInfo } from '../peers/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null; // 그림 날짜용
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'peers', variant, year: G.date.year, month: G.date.month }), '') : '');

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const TIE = { friend: 'up', ally: 'up', rival: 'warn', foe: 'down', grudge: 'down' };
const news = (list) => (list?.length ? `<ul class="pl-news">${list.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul>` : '');

function one(p) {
  const sub = [p.age != null ? (p.alive === false ? `${p.age}살에 죽음` : `${p.age}살`) : '', p.place ?? ''].filter(Boolean).map(esc).join(' · ');
  const home = [p.wed ? '혼인함' : '', p.kids ? `자식 ${p.kids}` : '', p.fallen ? '몰락' : ''].filter(Boolean).join(' · ');
  return `<li class="pe-one${p.alive === false ? ' dead' : ''}${p.fame >= 60 ? ' famed' : ''}">
    <div class="pe-top"><b>${esc(p.name)}</b>${sub ? `<small>${sub}</small>` : ''}${p.tieWord && p.alive !== false && (p.tie || !/데면데면/.test(p.tieWord)) ? `<em class="${TIE[p.tie] ?? 'plain'}">${esc(p.tieWord)}</em>` : ''}</div>
    ${p.path ? `<p class="pe-path">${esc(p.path)}${p.word ? ` · ${esc(p.word)}` : ''}</p>` : p.word ? `<p class="pe-path">${esc(p.word)}</p>` : ''}
    ${home ? `<p class="note pe-home">${home.includes('몰락') ? home.replace('몰락', '<b class="down">몰락</b>') : home}</p>` : ''}
    ${p.fame != null && p.alive !== false && (p.fame >= 5 || (p.age ?? 0) >= 16) ? `<div class="pe-fame"><span>이름값</span>${bar(p.fame, p.fame >= 60 ? 'kin' : 'mana')}</div>` : ''}
    ${p.last && p.last.text !== p.word ? `<p class="note pe-last"><time>${when(p.last)}</time> ${esc(p.last.text)}</p>` : ''}
  </li>`;
}

export function renderPeers(game) { G = game; try { return peersView(safe(() => peersInfo(game))); } finally { G = null; } }

export function peersView(s) {
  if (!s || (!s.cohort?.length && !s.past?.length)) return '';
  const live = s.cohort.filter((p) => p.alive !== false), young = live.length && live.every((p) => (p.age ?? 99) < 15);
  const v = young ? 'yard' : !live.length ? 'fallen' : s.pledge ? 'reunion' : live.some((p) => p.fame >= 60) ? 'court' : 'news';
  const src = art(v);
  return `<section class="card pe-card">
    <h2>함께 자란 세대 <small>${s.place ? esc(s.place) : ''}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="함께 자란 사람들">` : ''}
    ${s.line ? `<p class="note">${s.year ? `${s.year}년 무렵. ` : ''}${esc(s.line)}</p>` : ''}
    <ul class="pe-list">${s.cohort.map(one).join('')}</ul>
    ${s.news?.length ? `<details class="pl-more"><summary>같은 세대 소식 ${s.news.length}가지</summary>${news(s.news)}</details>` : ''}
    ${s.pledge ? '<p class="note">열 해마다 다시 모이기로 약속했다.</p>' : ''}
    ${s.elders?.length ? s.elders.filter((e) => e.left?.length).map((e) => `<p class="note">${esc(e.from)}의 같은 세대 가운데 남은 사람: ${e.left.map(esc).join(', ')}</p>`).join('') : ''}
    ${s.log?.length ? `<details class="pl-more"><summary>같은 세대와 있었던 일 ${s.log.length}가지</summary>${news(s.log.slice().reverse())}</details>` : ''}
    ${s.past?.length ? `<p class="note">윗대의 같은 세대: ${s.past.map((x) => `${esc(x.who)} 때 ${x.n}명${x.best ? `, 가장 이름난 이 ${esc(x.best)}` : ''}`).join(' · ')}</p>` : ''}
  </section>`;
}
