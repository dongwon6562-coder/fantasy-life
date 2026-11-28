// 50단계 '숲의 마녀와 민간 주술' 화면(src/witch). 읽기만 한다.
// witchView(s): '나' 화면 덩이 '내 주술' (스승·아는 주술·약초와 제물·마을의 눈길·효험과 속임수·마녀사냥·기록)
// 모양 (witchInfo):
// { known: bool, rank, teacher, since, power(0~100), herbs[{name,n}], charms[{name,text,uses,fake}],
//   town{name, regard(0~100), word}, heat(0~100), hunt{place,text}|null, tower, faith, kin, served, log[{y,m,text}] }
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
let G = null;
const art = (variant) => (G ? safe(() => vignetteImage({ plate: 'witch', variant, year: G.date.year, month: G.date.month }), '') : '');
export const withWitchGame = (g, fn) => { G = g; try { return fn(); } finally { G = null; } };

const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const when = (n) => `${n.y}년${n.m ? ` ${n.m}월` : ''}`;
const list = (x) => (Array.isArray(x) ? x : []);
const txt = (x) => (typeof x === 'string' ? x : x?.text ?? '');

export function witchView(s) {
  if (!s || (!s.known && !list(s.log).length)) return '';
  const charms = list(s.charms);
  const v = s.hunt ? 'hunt' : charms.length ? 'brew' : 'hut';
  const src = art(v);
  const tw = s.town && typeof s.town === 'object' ? s.town : null;
  return `<div class="block wi-block">
    <h3>내 주술 <small>${esc(s.rank ?? '')}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="주술">` : ''}
    ${s.teacher || s.since ? `<p class="note">${[s.teacher ? `스승 ${s.teacher}` : '', s.since ? `${s.since}년부터` : '', s.kin ? txt(s.kin) : ''].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${s.power != null ? `<div class="wd-row kn-row"><span>주술의 손</span>${bar(s.power, 'mana')}</div>` : ''}
    ${charms.length ? `<ul class="wi-charms">${charms.map((c) => `<li><div class="pi-top"><b>${esc(c.name)}</b>${c.uses ? `<em>${c.uses}번 썼다</em>` : ''}</div>${c.text ? `<p class="note">${esc(c.text)}${c.fake ? ' <b class="warn">반은 속임수</b>' : ''}</p>` : ''}</li>`).join('')}</ul>` : ''}
    ${list(s.herbs).length ? `<p class="note">약초와 제물: ${s.herbs.map((h) => esc(typeof h === 'string' ? h : `${h.name}${h.n ? ` ${h.n}` : ''}`)).join(' · ')}</p>` : ''}
    ${tw ? `<div class="wd-row kn-row"><span>${esc(tw.name)}의 눈길 · ${esc(tw.word ?? '')}</span>${bar(tw.regard ?? 50, (tw.regard ?? 50) < 35 ? 'warn' : 'kin')}</div>` : ''}
    ${s.heat ? `<div class="wd-row kn-row"><span>마녀라는 수군거림</span>${bar(s.heat, s.heat >= 50 ? 'warn' : '')}</div>` : ''}
    ${s.hunt ? `<p class="note"><b class="down">마녀사냥</b> ${esc(txt(s.hunt))}</p>` : ''}
    ${s.tower || s.faith ? `<p class="note">${[s.tower ? `마탑: ${txt(s.tower)}` : '', s.faith ? `교단: ${txt(s.faith)}` : ''].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
    ${list(s.log).length ? `<details class="pl-more"><summary>주술로 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${when(n)}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
