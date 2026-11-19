// 20단계 '비밀과 이중생활' 화면(src/secret). 읽기만 한다.
// renderSecretBlock: '나' 화면 덩이 (밤의 얼굴, 바꾼 이름, 지키는 비밀과 들킬 위험·아는 사람, 기록). 숨겨 둔 아이는 비밀 줄에 이미 나온다.
// renderSecretNow: 이번 달 화면 한 줄 (들킬 위험이 높은 비밀이 있을 때)
import { secretInfo } from '../secret/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const heatWord = (h) => (h >= 70 ? '경비대가 바짝 뒤쫓는다' : h >= 40 ? '꼬리가 밟히고 있다' : h >= 15 ? '누군가 냄새를 맡았다' : '아직 조용하다');

export function renderSecretNow(game) {
  const s = safe(() => secretInfo(game));
  if (!s) return '';
  const hot = s.secrets.filter((x) => x.risk >= 45);
  const maskHot = s.mask && s.mask.heat >= 60;
  if (!hot.length && !maskHot) return '';
  const bits = hot.map((x) => `${esc(x.label)}: ${esc(x.riskWord)}`);
  if (maskHot) bits.push(`가면 '${esc(s.mask.name)}': ${esc(heatWord(s.mask.heat))}`);
  return `<section class="card secret-now"><p class="note"><b class="warn">비밀</b> ${bits.join(' · ')}</p></section>`;
}

export function renderSecretBlock(game) {
  const s = safe(() => secretInfo(game));
  if (!s) return '';
  const any = s.secrets.length || s.mask || s.alias || s.exposed || s.silenced || s.log.length;
  if (!any) return '';
  const M = s.mask;
  const sec = (x) => `<li><div class="wd-row kn-row"><span><strong>${esc(x.label)}</strong> · ${esc(x.riskWord)}</span>${bar(x.risk, x.risk >= 45 ? 'low' : '')}</div>
    <span class="note">${esc(x.kindName)}${x.years ? ` · ${x.years}년째` : ''}${x.inherited ? ' · 선대에게서 물려받음' : ''} · ${x.knowers.length ? `아는 사람: ${x.knowers.map(esc).join(', ')}` : '아는 사람이 없다'}</span></li>`;
  const chips = [];
  if (s.exposed) chips.push(['들통난 비밀', `${s.exposed}번`, true]);
  if (s.silenced) chips.push(['입막음', `${s.silenced}번`, true]);
  return `<div class="block secret-block">
    <h3>비밀</h3>
    ${M ? `<div class="sc-acad"><div class="top"><strong>밤의 얼굴 '${esc(M.name)}'</strong><span class="note">${esc(M.kindName)}</span></div>
      <span class="note">밤일 ${M.deeds}번${M.legend ? ` · 소문 ${M.legend}번` : ''}</span>
      <div class="wd-row kn-row"><span>${esc(heatWord(M.heat))}</span>${bar(M.heat, M.heat >= 40 ? 'low' : '')}</div></div>` : ''}
    ${s.alias ? `<p class="note">다른 이름으로 산다: <b>${esc(s.alias.name)}</b>${s.alias.cover ? ` · ${esc(s.alias.cover)}` : ''} · ${esc(s.alias.placeName)}에서 얻은 이름</p>` : ''}
    ${s.secrets.length ? `<ul class="ct-houses sr-list">${s.secrets.map(sec).join('')}</ul>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>비밀에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
