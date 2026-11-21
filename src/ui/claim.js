// 26단계 '숨은 왕가의 피' 화면(src/claim). 읽기만 한다.
// renderClaimNow: 이번 달 화면 접는 카드 (핏줄을 알고 숨기거나 주장하는 동안: 증거·소문·편드는 사람·참칭자)
// renderClaimBlock: '나' 화면 덩이 (내 피가 어떻게 되었는지, 한 일 수, 지난 일, 기록)
import { claimInfo } from '../claim/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const LIVE = ['숨겨 둔 피', '왕위를 주장함'];

export function renderClaimNow(game, ui = {}) {
  const s = safe(() => claimInfo(game));
  const b = s?.blood;
  if (!b || !LIVE.includes(b.status)) return '';
  const claimed = b.status === '왕위를 주장함';
  const hot = b.exposure >= 40;
  return `<details class="card workshop claim-card"${ui.claimOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">숨은 왕가의 피</span><strong>${esc(b.house)}</strong></span>
      <span class="ws-demand ${claimed ? 'up' : hot ? 'down' : ''}">${esc(b.status)}</span>
    </summary>
    <div class="ws-body">
      <p class="note">${esc(b.realm)}${b.fellYear ? ` · ${b.fellYear}년에 대가 끊김` : ''} · ${b.gen}대를 내려옴 · 알게 된 길: ${esc(b.origin)}${b.fake ? ' · <b class="warn">꾸며 낸 핏줄</b>' : ''}</p>
      <p class="note">지금 ${esc(b.realm)}의 자리: ${esc(b.ruler)}</p>
      <div class="wd-row kn-row"><span>증거 · ${esc(b.proofWord)}</span>${bar(b.proof, 'kin')}</div>
      <div class="wd-row kn-row"><span>아는 사람 · ${esc(b.exposeWord)}</span>${bar(b.exposure, hot ? 'low' : '')}</div>
      ${claimed || b.backing ? `<div class="wd-row kn-row"><span>편드는 사람 · ${esc(b.backWord)}</span>${bar(b.backing, 'kin')}</div>` : ''}
      ${s.pretender ? `<p class="note"><b class="warn">같은 피를 내세우는 자</b> ${esc(s.pretender.name)}${s.pretender.strength >= 50 ? ' · 따르는 사람이 많다' : ''}</p>` : ''}
      ${hot && !claimed ? '<p class="note">소문이 퍼질수록 지금 왕좌에 앉은 쪽이 먼저 움직일 수 있다.</p>' : ''}
    </div>
  </details>`;
}

export function renderClaimBlock(game) {
  const s = safe(() => claimInfo(game));
  if (!s) return '';
  const b = s.blood, t = s.tally ?? {};
  const chips = [];
  if (t.searched) chips.push(['증거 찾기', `${t.searched}번`]);
  if (t.rallies) chips.push(['사람 모으기', `${t.rallies}번`]);
  if (t.suitors) chips.push(['찾아온 혼처', `${t.suitors}번`]);
  if (t.threats) chips.push(['노린 손', `${t.threats}번`, 'down']);
  if (t.pretenders) chips.push(['참칭자', `${t.pretenders}명`]);
  if (!b && !chips.length && !s.past.length) return '';
  return `<div class="block claim-block">
    <h3>숨은 왕가의 피</h3>
    ${b ? `<p class="note"><strong>${esc(b.house)}</strong> · ${esc(b.realm)} · ${esc(b.status)}${b.buyer ? ` (${esc(b.buyer)}에게)` : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 일 ${s.past.length}가지</summary><ul class="pl-news">${s.past.slice().reverse().map((x) => `<li><time>${x.y}년</time><span>${esc(x.text)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>핏줄에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
