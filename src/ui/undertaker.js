// 40단계 '장의사와 묘지기' 화면(src/undertaker). 읽기만 한다.
// renderUndertakerNow: 이번 달 접는 카드 (이 고장 묘지: 기다리는 시신·빈자리·소문·도굴, 내 장의사 집, 역병 구덩이). 일하거나 집·자리가 있을 때만.
// renderUndertakerBlock: '나' 화면 덩이 (솜씨, 한 일, 장의사 집, 집안 무덤 자리, 지나간 일)
import { undertakerInfo } from '../undertaker/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const logList = (log, label) => (log.length ? `<details class="pl-more"><summary>${label} ${log.length}가지</summary><ul class="pl-news">${log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : '');

function yardRows(y) {
  return `<div class="wd-row kn-row"><span>빈자리 · ${esc(y.fullWord)}</span>${bar(100 - y.full, y.full >= 70 ? 'low' : 'kin')}</div>
    ${y.rumor > 0 ? `<div class="wd-row kn-row"><span>묘지 소문${y.rumorWord ? ` · ${esc(y.rumorWord)}` : ''}</span>${bar(y.rumor, y.rumor >= 30 ? 'low' : 'mana')}</div>` : ''}`;
}

export function renderUndertakerNow(game, ui = {}) {
  const s = safe(() => undertakerInfo(game));
  if (!s) return '';
  const y = s.yard;
  if (!s.job && !s.shop && !(y && y.pit)) return '';
  const title = s.job && y ? y.name : s.shop ? `${s.shop.place} 장의사 집` : y ? y.name : '묘지';
  const tag = y?.pit ? '역병 구덩이' : y && y.wait > 0 ? `기다리는 시신 ${y.wait}` : s.shop ? `관 ${s.shop.coffins}개` : y ? y.fullWord : '';
  const hot = !!(y && (y.pit || y.wait >= 3 || y.full >= 90));
  return `<details class="card workshop ut-card"${ui.utOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${esc(s.job ?? '장의사 집')}</span><strong>${esc(title)}</strong></span>
      ${tag ? `<span class="ws-demand ${hot ? 'down' : 'up'}">${esc(tag)}</span>` : ''}
    </summary>
    <div class="ws-body">
      ${y ? yardRows(y) : ''}
      ${y?.crypt ? `<p class="note">${esc(y.crypt)}이 딸려 있다.</p>` : ''}
      ${y && y.robbed > 0 ? `<p class="note"><b class="warn">도굴당한 무덤 ${y.robbed}기</b></p>` : ''}
      ${y?.pit ? '<p class="note">묘지 끝에 공동 구덩이를 팠다. 수레가 매일 온다.</p>' : ''}
      ${s.shop ? `<p class="note">내 장의사 집 · ${esc(s.shop.place)} · ${s.shop.years ? `${s.shop.years}년째` : '연 지 얼마 안 됨'} · 마당의 관 ${s.shop.coffins}개</p>` : ''}
      ${s.job ? `<div class="wd-row kn-row"><span>솜씨 · ${esc(s.skillWord)}</span>${bar(s.skill, 'kin')}</div>` : ''}
    </div>
  </details>`;
}

export function renderUndertakerBlock(game) {
  const s = safe(() => undertakerInfo(game));
  if (!s) return '';
  const d = s.done;
  const any = s.job || s.shop || s.plot || d.bodies || d.coffins || d.funerals || d.dug || s.log.length;
  if (!any) return '';
  const chips = [];
  if (d.bodies) chips.push(['염한 몸', `${d.bodies}`]);
  if (d.coffins) chips.push(['짠 관', `${d.coffins}`]);
  if (d.funerals) chips.push(['치른 장례', `${d.funerals}`]);
  if (d.dug) chips.push(['판 무덤', `${d.dug}`]);
  if (d.caught) chips.push(['잡은 도굴꾼', `${d.caught}`, 'up']);
  if (d.earned) chips.push(['번 돈', `은화 ${d.earned}닢`, 'up']);
  return `<div class="block ut-block">
    <h3>장의사와 묘지기</h3>
    ${s.job || d.bodies || d.coffins ? `<div class="wd-row kn-row"><span>${esc(s.job ?? '죽은 이를 맡는 솜씨')} · ${esc(s.skillWord)}</span>${bar(s.skill, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.shop ? `<p class="note">내 장의사 집: ${esc(s.shop.place)} · ${s.shop.years ? `${s.shop.years}년째` : '연 지 얼마 안 됨'} · 마당의 관 ${s.shop.coffins}개</p>` : ''}
    ${s.plot ? `<p class="note">집안 무덤 자리: ${esc(s.plot.yard || s.plot.place)} ${esc(s.plot.kind)}</p>` : ''}
    ${s.yard && s.job ? yardRows(s.yard) : ''}
    ${s.past.length ? `<p class="note">윗대의 장의 일: ${s.past.map((x) => `${x.y}년까지 장례 ${x.funerals}번, 염한 몸 ${x.bodies}`).join(' · ')}</p>` : ''}
    ${logList(s.log, '죽은 이를 맡으며 있었던 일')}
  </div>`;
}
