// 25단계 '첩보와 밀정' 화면(src/spy). 읽기만 한다.
// renderSpyNow: 이번 달 화면. 조직에 몸담았으면 접는 카드(조직과 자리, 신임·익힌 기술·아는 것·눈길, 연락책, 가짜 신분, 두 주인), 조직 없이 쫓기면 한 줄.
// renderSpyBlock: '나' 화면 덩이 (해낸 일·실패·붙잡힘·들킴·돌아섬, 쫓는 사람, 선대의 조직, 지난 일, 기록)
import { spyInfo } from '../spy/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderSpyNow(game, ui = {}) {
  const s = safe(() => spyInfo(game));
  if (!s) return '';
  const O = s.org;
  if (!O) return s.hunt ? `<section class="card spy-now"><p class="note"><b${s.hunt.level >= 30 ? ' class="warn"' : ''}>쫓는 사람</b> ${esc(s.hunt.name)} · ${esc(s.hunt.word)}</p></section>` : '';
  return `<details class="card workshop spy-card"${ui.spyOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">밀정</span><strong>${esc(O.alias || O.name)}</strong></span>
      <span class="ws-demand ${s.heat >= 45 || O.trust < 15 || s.dbl ? 'down' : 'up'}">${esc(O.rank)} · ${esc(s.heatWord)}</span>
    </summary>
    <div class="ws-body">
      <p class="note">${esc(O.name)} · ${esc(O.kind)} · 연락책 '${esc(O.handler)}'${O.years ? ` · ${O.years}해째` : ''}${O.missions ? ` · 맡은 일 ${O.missions}번` : ''}</p>
      <div class="wd-row kn-row"><span>조직의 믿음 · ${esc(O.trustWord)}</span>${bar(O.trust, O.trust < 15 ? 'low' : 'kin')}</div>
      <div class="wd-row kn-row"><span>익힌 기술</span>${bar(O.trained, 'kin')}</div>
      <div class="wd-row kn-row"><span>아는 것 · ${esc(O.knownWord)}</span>${bar(O.known, O.known >= 60 ? 'low' : '')}</div>
      <div class="wd-row kn-row"><span>눈길 · ${esc(s.heatWord)}</span>${bar(s.heat, s.heat >= 45 ? 'low' : '')}</div>
      ${s.cover ? `<p class="note">가짜 신분: ${esc(s.cover.name)} · ${esc(s.cover.trade)} · ${s.cover.depth >= 70 ? '뿌리가 깊다' : s.cover.depth >= 35 ? '그럭저럭 버틴다' : '얄팍하다'}</p>` : '<p class="note">가짜 신분이 없다</p>'}
      ${s.dbl ? `<p class="note"><b class="warn">두 주인을 섬긴다</b> · ${esc(s.dbl.name)}에게도 보고한다${s.dbl.years ? ` · ${s.dbl.years}해째` : ''}</p>` : ''}
      ${s.hunt ? `<p class="note"><b class="warn">쫓는 사람</b> ${esc(s.hunt.name)} · ${esc(s.hunt.word)}</p>` : ''}
    </div>
  </details>`;
}

export function renderSpyBlock(game) {
  const s = safe(() => spyInfo(game));
  if (!s) return '';
  const T = s.tally;
  const chips = [];
  if (T.missions) chips.push(['해낸 일', `${T.missions}번`, 'up']);
  if (T.failed) chips.push(['그르친 일', `${T.failed}번`, 'down']);
  if (T.caught) chips.push(['붙잡힘', `${T.caught}번`, 'down']);
  if (T.exposed) chips.push(['정체가 들킴', `${T.exposed}번`, 'down']);
  if (T.turned) chips.push(['편을 바꿈', `${T.turned}번`]);
  if (T.quit) chips.push(['조직을 떠남', `${T.quit}번`]);
  if (T.hunters) chips.push(['따돌린 추적자', `${T.hunters}번`]);
  if (!chips.length && !s.org && !s.hunt && !s.legacy && !s.log.length) return '';
  return `<div class="block spy-block">
    <h3>첩보와 밀정</h3>
    ${s.org ? `<p class="note">${esc(s.org.name)}의 ${esc(s.org.rank)}</p>` : ''}
    ${s.legacy ? `<p class="note">선대가 몸담았던 곳: ${esc(s.legacy)}</p>` : ''}
    ${s.hunt && !s.org ? `<p class="note"><b class="warn">${esc(s.hunt.name)}</b>${s.hunt.years ? ` · ${s.hunt.years}해째` : ''} · ${esc(s.hunt.word)}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지나온 자리 ${s.past.length}곳</summary><ul class="pl-news">${s.past.slice().reverse().map((x) => `<li><time>${x.y}년</time><span>${esc(x.text)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>밀정 노릇에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
