// 20단계 '유랑극단과 떠돌이 재주꾼' 화면(src/troupe). 읽기만 한다.
// renderTroupeNow: 이번 달 화면 한 줄 (극단에 있거나, 이 고장에 극단이 와 있을 때)
// renderTroupe: '사람들' 화면 카드 (극단, 단원, 다음 갈 곳)
// renderTroupeBlock: '나' 화면 덩이 (재주, 무대 기록, 가장 큰 판, 지난 극단, 막힌 고장, 기록)
import { troupeStatus, troupeLine } from '../troupe/index.js';
import { J } from '../narrative/text.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const moodWord = (m) => (m >= 70 ? '신이 났다' : m >= 45 ? '괜찮다' : m >= 25 ? '불만이 있다' : '떠날 생각을 한다');
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderTroupeNow(game) {
  const s = safe(() => troupeStatus(game));
  if (!s) return '';
  const line = safe(() => troupeLine(game), '');
  if (s.troupe) {
    const bits = [esc(line)];
    if (s.taste && !s.troupe.moving) bits.push(`이 고장 관객: ${esc(s.taste.text)}`);
    if (s.banned) bits.push('<b class="warn">이 고장에서는 무대가 막혔다</b>');
    return `<section class="card troupe-now"><p class="note"><b>극단</b> ${bits.join(' · ')}</p></section>`;
  }
  if (s.visiting) return `<section class="card troupe-now"><p class="note"><b>극단</b> 유랑극단 ${esc(J(s.visiting.name, '이/가'))} 이 고장에 와 있다. 할 일의 '유랑극단을 찾아간다'로 찾아갈 수 있다.</p></section>`;
  return '';
}

export function renderTroupe(game) {
  const s = safe(() => troupeStatus(game));
  const t = s?.troupe;
  if (!t) return '';
  const member = (m) => `<li><div class="wd-row kn-row"><span><strong>${esc(m.name)}</strong>${m.love ? ' ♡' : ''} · ${esc(m.who)} · 솜씨 ${m.skill} · ${esc(moodWord(m.mood))}</span>${bar(m.mood, m.mood < 25 ? 'low' : 'kin')}</div></li>`;
  const where = t.moving ? `${esc(s.placeName)}에서 ${esc(J(t.placeName, '으로/로'))} 가는 길` : esc(t.placeName);
  return `<section class="card troupe-card">
    <h2>${t.own ? '내 극단' : '극단'} <small>${esc(t.name)}${t.gens > 1 ? ` · ${t.gens}대째` : ''}</small></h2>
    <p class="note">${where} · ${t.own ? '내가 꾸린다' : `단장 ${esc(t.leader)}`}${t.myActName ? ` · 내 재주: ${esc(t.myActName)}${t.lead ? ' (주인공)' : ''}` : ''}${t.lover ? ` · ♡ ${esc(t.lover)}` : ''}${t.satire ? ' · <b class="warn">풍자극을 올린다</b>' : ''}</p>
    <div class="wd-row kn-row"><span>이름 · ${esc(t.fameWord)}</span>${bar(t.fame, 'kin')}</div>
    <div class="wd-row kn-row"><span>마차와 천막</span>${bar(t.wagon, t.wagon < 35 ? 'low' : '')}</div>
    <div class="sm-chips">${[['무대', `${t.shows}번`], ['번 돈', `은화 ${t.earned}닢`, 'up'], t.own && t.wages ? ['달마다 품삯', `은화 ${t.wages}닢`, 'down'] : null].filter(Boolean).map(chip).join('')}</div>
    ${t.members.length ? `<h4 class="ct-h">단원 ${t.members.length}명</h4><ul class="wl-list tr-list">${t.members.map(member).join('')}</ul>` : ''}
    ${t.next.length && !t.moving ? `<p class="note">다음에 갈 만한 곳: ${t.next.map((n) => esc(n.placeName)).join(', ')}</p>` : ''}
  </section>`;
}

export function renderTroupeBlock(game) {
  const s = safe(() => troupeStatus(game));
  if (!s) return '';
  const any = s.troupe || s.shows || s.past.length || s.log.length || s.bannedPlaces.length;
  if (!any) return '';
  const chips = [];
  if (s.shows) chips.push(['선 무대', `${s.shows}번`]);
  if (s.feasts) chips.push(['귀족 연회', `${s.feasts}번`]);
  if (s.satires) chips.push(['풍자극', `${s.satires}번`]);
  if (s.founded) chips.push(['꾸린 극단', `${s.founded}곳`]);
  const acts = s.acts.filter((a) => a.skill > 0);
  return `<div class="block troupe-block">
    <h3>무대와 재주</h3>
    ${acts.length ? acts.map((a) => `<div class="wd-row kn-row"><span>${esc(a.name)}</span>${bar(a.skill, 'kin')}</div>`).join('') : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.best ? `<p class="note">가장 큰 판: ${s.best.year}년 ${esc(s.best.placeName)}, ${esc(s.best.name)} · 은화 ${s.best.take}닢</p>` : ''}
    ${s.bannedPlaces.length ? `<p class="note warn">무대가 막힌 고장: ${s.bannedPlaces.map((b) => `${esc(b.placeName)} (${b.monthsLeft}달)`).join(', ')}</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 극단 ${s.past.length}곳</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)}${x.own ? ' (내 극단)' : ''} · ${esc(x.how)} · 무대 ${x.shows}번</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>극단에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
