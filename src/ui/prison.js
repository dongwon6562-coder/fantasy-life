// 41단계 '옥살이' 화면(src/prison). 읽기만 한다.
// renderPrisonNow: 이번 달 카드 (갇혀 있으면 어디에 얼마나·같은 방 사람·간수·패거리·탈옥 궁리; 아니면 갇힌 식구나 출소 뒤 낙인을 한 줄로)
// renderPrisonBlock: '나' 화면 덩이 (지금 옥살이, 지난 옥살이, 갇힌 식구, 기록)
import { prisonInfo } from '../prison/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'jail', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { cell: '지하 감옥', visit: '면회 창살', rope: '탈옥 밧줄', release: '출소 길' };
const mo = (m) => (m >= 24 ? `${Math.floor(m / 12)}년${m % 12 ? ` ${m % 12}달` : ''}` : `${m}달`);
const logList = (log, label) => (log.length ? `<details class="pl-more"><summary>${label} ${log.length}가지</summary><ul class="pl-news">${log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : '');

function stayRows(st) {
  const served = st.served ?? 0, total = served + (st.left ?? 0);
  return `<div class="wd-row kn-row"><span>형기 · ${st.left ? `${mo(st.left)} 남았다` : '곧 풀려난다'}</span>${bar(total ? (served / total) * 100 : 0, 'kin')}</div>
    ${st.mates.length ? `<p class="note">같은 방: ${st.mates.map((p) => `${esc(p.name)}(${p.age}살${p.warm >= 40 ? ', 가깝다' : p.warm <= -20 ? ', 껄끄럽다' : ''})`).join(', ')}</p>` : ''}
    ${st.guard ? `<p class="note">간수 ${esc(st.guard)}${st.bribed ? ' · 돈을 먹였다' : ''}</p>` : ''}
    ${st.boss ? `<p class="note">${esc(st.boss)}${st.gang ? ' · 그 패거리에 들었다' : ''}</p>` : st.gang ? '<p class="note">감옥 패거리에 들었다</p>' : ''}
    ${st.plot ? '<p class="note"><b class="warn">탈옥을 궁리하고 있다</b></p>' : ''}`;
}

export function renderPrisonNow(game) {
  const s = safe(() => prisonInfo(game));
  if (!s) return '';
  const st = s.stay;
  if (st) {
    return `<section class="card pr-now bad">
      <h2>옥살이 <small>${esc(st.kind)} · ${st.served ? `${mo(st.served)}째` : '이번 달부터'}</small></h2>
      <p><strong>${esc(st.where)}</strong></p>
      ${stayRows(st)}
    </section>`;
  }
  const bits = [];
  if (s.kin.length) bits.push(`<b>갇힌 식구</b> ${s.kin.map((k) => `${esc(k.name)}(${esc(k.place)}${k.left ? `, ${mo(k.left)} 남음` : ''})`).join(', ')}`);
  if (s.marked) bits.push('<b>출소한 몸</b> 사람들이 아직 곁눈질을 한다');
  if (!bits.length) return '';
  return `<section class="card pr-now"><p class="note">${bits.join(' · ')}</p></section>`;
}

export function renderPrisonBlock(game) {
  const s = safe(() => prisonInfo(game));
  if (!s || (!s.any && !s.stay && !s.kin.length)) return '';
  const last = s.past[s.past.length - 1];
  const v = s.stay ? (s.stay.plot ? 'rope' : 'cell') : s.kin.length ? 'visit' : 'release';
  const src = art(game, v);
  return `<div class="block pr-block">
    <h3>옥살이</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.stay ? `<p><strong>${esc(s.stay.where)}</strong></p>${stayRows(s.stay)}` : ''}
    ${s.past.length ? `<p class="note">지난 옥살이: ${s.past.slice(-4).map((x) => `${x.y}년 ${esc(x.place)} ${esc(x.kind)} ${mo(x.months)}${x.how ? `, ${esc(x.how)}` : ''}`).join(' · ')}</p>` : ''}
    ${s.marked && !s.stay ? `<p class="note">${last ? `${esc(last.place)}에서 나온 지 얼마 안 됐다. ` : ''}옥에 다녀온 사람이라는 말이 따라다닌다.</p>` : ''}
    ${s.kin.length ? `<p class="note">갇힌 식구: ${s.kin.map((k) => `${esc(k.name)}(${esc(k.place)}${k.why ? `, ${esc(k.why)}` : ''}${k.left ? `, ${mo(k.left)} 남음` : ''})`).join(', ')}</p>` : ''}
    ${logList(s.log, '옥을 두고 있었던 일')}
  </div>`;
}
