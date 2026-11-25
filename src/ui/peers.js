// 45단계 '함께 자란 세대' 화면(src/peers). 읽기만 한다.
// peersView(s): '사람들' 화면 카드 (나와 같은 해쯤 태어난 고장 사람들이 지금 어떻게 사나, 나와의 사이, 소식)
// 사람마다 한 칸: 이름·나이·고장, 걸어간 길, 지금 형편, 이름값, 나와의 사이, 마지막으로 본 일. 죽은 사람은 흐리게.
import { esc } from './util.js';

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const TIE = { friend: 'up', ally: 'up', rival: 'warn', foe: 'down', grudge: 'down' };
const news = (list) => (list?.length ? `<ul class="pl-news">${list.map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul>` : '');

function one(p) {
  const sub = [p.age != null ? `${p.age}살` : '', p.place ?? ''].filter(Boolean).map(esc).join(' · ');
  return `<li class="pe-one${p.alive === false ? ' dead' : ''}${p.fame >= 60 ? ' famed' : ''}">
    <div class="pe-top"><b>${esc(p.name)}</b>${sub ? `<small>${sub}</small>` : ''}${p.tieWord ? `<em class="${TIE[p.tie] ?? ''}">${esc(p.tieWord)}</em>` : ''}</div>
    ${p.path ? `<p class="pe-path">${esc(p.path)}${p.word ? ` · ${esc(p.word)}` : ''}</p>` : p.word ? `<p class="pe-path">${esc(p.word)}</p>` : ''}
    ${p.fame != null && p.alive !== false ? `<div class="pe-fame"><span>이름값</span>${bar(p.fame, p.fame >= 60 ? 'kin' : 'mana')}</div>` : ''}
    ${p.last ? `<p class="note pe-last"><time>${when(p.last)}</time> ${esc(p.last.text)}</p>` : ''}
  </li>`;
}

export function peersView(s) {
  if (!s || (!s.cohort?.length && !s.past?.length)) return '';
  const alive = s.cohort.filter((p) => p.alive !== false).length;
  return `<section class="card pe-card">
    <h2>함께 자란 세대 <small>${s.year ? `${s.year}년 무렵 ` : ''}${esc(s.place ?? '')} 태생 ${s.cohort.length}명${alive < s.cohort.length ? ` · 살아 있는 사람 ${alive}` : ''}</small></h2>
    ${s.line ? `<p class="note">${esc(s.line)}</p>` : ''}
    <ul class="pe-list">${s.cohort.map(one).join('')}</ul>
    ${s.news?.length ? `<details class="pl-more"><summary>같은 세대 소식 ${s.news.length}가지</summary>${news(s.news)}</details>` : ''}
    ${s.past?.length ? `<p class="note">윗대의 같은 세대: ${s.past.map((x) => `${esc(x.who)} 때 ${x.n}명${x.best ? `, 가장 이름난 이 ${esc(x.best)}` : ''}`).join(' · ')}</p>` : ''}
  </section>`;
}
