// 28단계 '사절과 볼모' 화면(src/envoy). 읽기만 한다.
// renderEnvoyNow: 이번 달 한 줄 (볼모로 잡혀 있거나 사절 자리에 있거나 볼모로 자랐을 때)
// renderEnvoyBlock: '나' 화면 덩이 (아는 말, 외교청 자리, 협상, 볼모살이, 볼모로 보낸 자식, 기록)
import { envoyInfo } from '../envoy/index.js';
import { esc } from './util.js';
import { vignetteImage } from '../art/vignette.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderEnvoyNow(game) {
  const s = safe(() => envoyInfo(game));
  if (!s) return '';
  if (s.hostage) return `<section class="card evy-now"><p class="note"><b class="warn">볼모</b> ${esc(s.hostage.to)} 궁정 · ${s.hostage.years}해째${s.hostage.backIn ? ` · 돌아가기까지 ${s.hostage.backIn}해` : ' · 곧 돌아간다'}</p></section>`;
  if (s.post) return `<section class="card evy-now"><p class="note"><b>${esc(s.post.roleName)}</b> ${esc(s.post.realm)} · ${s.post.years}해째</p></section>`;
  return '';
}

export function renderEnvoyBlock(game) {
  const s = safe(() => envoyInfo(game));
  if (!s) return '';
  const t = s.talks ?? {};
  const chips = [];
  if (t.n) chips.push(['협상', `${t.n}번`]);
  if (t.wins) chips.push(['얻어 낸 것', `${t.wins}번`, 'up']);
  if (t.peaces) chips.push(['맺은 화친', `${t.peaces}`]);
  if (t.pacts) chips.push(['맺은 약조', `${t.pacts}`]);
  if (t.wars) chips.push(['틀어져 난 전쟁', `${t.wars}`, 'down']);
  const P = s.post, H = s.hostage, B = s.between;
  // 볼모로 자란 사람에게는 페이블 '자란 볼모' 판
  const art = B || H ? safe(() => vignetteImage({ plate: 'envoy', variant: B ? 'hostage-grown' : 'hostage', year: game.date.year, month: game.date.month }), '') : '';
  return `<div class="block evy-block">
    <h3>사절과 볼모</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="남의 나라 옥좌 앞에 선 볼모">` : ''}
    ${P ? `<p><strong>${esc(P.realm)} ${esc(P.roleName)}</strong> · ${P.years}해째 · 사절길 ${P.missions}번${P.wins ? `, 그중 ${P.wins}번 뜻을 이룸` : ''}</p>` : ''}
    ${H ? `<p class="note"><b class="warn">${esc(H.from)}에서 ${esc(H.to)} 궁정으로 보내진 볼모</b> · ${H.years}해째${H.backIn ? ` · 돌아가기까지 ${H.backIn}해` : ''}</p>
      <div class="wd-row kn-row"><span>그 나라에 든 정</span>${bar(H.ties, 'kin')}</div>
      ${H.friend ? `<p class="note">그 궁정의 벗 ${esc(H.friend)}</p>` : ''}` : ''}
    ${B ? `<p class="note">${esc(B.host)}에서 볼모로 자랐다 · ${esc(B.word)}</p>` : ''}
    ${s.tongues.length ? `<p class="note">태어난 말: ${esc(s.native ?? '')}</p>${s.tongues.filter((x) => x.name !== s.native).map((x) => `<div class="wd-row kn-row"><span>${esc(x.name)} · ${esc(x.word)}</span>${bar(x.lvl, 'kin')}</div>`).join('')}` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.pledged.length ? `<ul class="ag-clues evy-pledged">${s.pledged.map((k) => `<li>볼모로 보낸 ${esc(k.name)} · ${esc(k.realm)}${k.backIn ? ` · 돌아오기까지 ${k.backIn}해` : ' · 곧 돌아온다'}</li>`).join('')}</ul>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>나라 사이의 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
