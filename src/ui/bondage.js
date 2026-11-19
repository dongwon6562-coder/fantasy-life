// 21단계 '노예와 자유' 화면(src/bondage). 읽기만 한다.
// renderBondageNow: 이번 달 화면 큰 카드 (노예일 때, 쫓기는 몸일 때). 할 일이 확 줄어드니 맨 위에 크게.
// renderBondageBlock: '나' 화면 덩이 (풀려난 일과 낙인, 데리고 있는 사람, 풀어 준 사람, 이 나라의 법, 기록)
import { bondageInfo } from '../bondage/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderBondageNow(game) {
  const s = safe(() => bondageInfo(game));
  if (!s) return '';
  const S = s.slave, F = s.fugitive;
  if (S) {
    const got = Math.min(S.ransom, S.savings + (game.player?.money ?? 0));
    return `<section class="card bondage-now bad">
    <h2>노예 <small>${esc(S.placeName)} · ${S.months ? `${S.months}달째` : '이번 달부터'}</small></h2>
    <p class="note">주인: <b>${esc(S.master)}</b> · ${esc(S.work)}${S.branded ? ' · <b class="warn">낙인이 찍혔다</b>' : ''}${S.escapes ? ` · 달아나려 한 일 ${S.escapes}번` : ''}</p>
    <div class="wd-row kn-row"><span>신임 · ${esc(S.trustWord)}</span>${bar(S.trust, S.trust < 25 ? 'low' : 'kin')}</div>
    <div class="wd-row kn-row"><span>몸값 은화 ${S.ransom}닢 · 모은 돈 ${S.savings}닢${got >= S.ransom ? ' · <b class="ok">치를 수 있다</b>' : ''}</span>${bar((got / Math.max(1, S.ransom)) * 100, 'kin')}</div>
    <p class="note">할 수 있는 일은 주인을 섬기기, 달아나기, 몸값 치르기, 쉬기와 명상뿐이다.</p>
  </section>`;
  }
  if (F) {
    return `<section class="card bondage-now bad">
    <h2>쫓기는 몸 <small>${esc(F.fromName)}에서 달아남</small></h2>
    <div class="wd-row kn-row"><span>${esc(F.heatWord)}</span>${bar(F.heat, 'low')}</div>
    ${F.branded ? '<p class="note warn">몸에 낙인이 있다. 보는 눈을 피해야 한다.</p>' : ''}
  </section>`;
  }
  return '';
}

export function renderBondageBlock(game) {
  const s = safe(() => bondageInfo(game));
  if (!s) return '';
  const R = s.freed;
  const any = R || s.owned.length || s.helped || s.log.length || s.slave || s.fugitive || s.law.market;
  if (!any) return '';
  const owned = (o) => `<li><div class="wd-row kn-row"><span><strong>${esc(o.name)}</strong> · ${esc(o.race)} · ${o.age}살 · ${esc(o.loyaltyWord)}</span>${bar(o.loyalty, o.loyalty < 25 ? 'low' : 'kin')}</div></li>`;
  return `<div class="block bondage-block">
    <h3>사슬과 자유</h3>
    ${R ? `<p class="note ok">${R.y}년, ${esc(R.howWord)} 자유를 얻었다${R.papers ? ' · 해방 증서가 있다' : ' · <b class="warn">증서가 없다</b>'}${R.branded ? ' · 낙인이 남았다' : ''}${R.oldName ? ` · 옛 이름 ${esc(R.oldName)}` : ''}</p>` : ''}
    ${s.owned.length ? `<h4 class="ct-h">데리고 있는 사람 ${s.owned.length}명</h4><ul class="wl-list bd-list">${s.owned.map(owned).join('')}</ul>` : ''}
    ${s.helped ? `<p class="note">사슬에서 풀어 준 사람: ${s.helped}명</p>` : ''}
    <p class="note">${esc(s.law.realmName)}의 법: ${esc(s.law.word)} (노예 부리기: ${esc(s.law.own)})${s.law.market ? ` · 이 고장에 <b>${esc(s.law.market)}</b>` : ''}</p>
    ${s.log.length ? `<details class="pl-more"><summary>사슬에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
