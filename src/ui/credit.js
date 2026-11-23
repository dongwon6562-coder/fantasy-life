// 39단계 '빚과 돈놀이' 화면(src/credit). 읽기만 한다.
// renderCreditNow: 이번 달 접는 카드 (잡힌 물건과 찾을 날, 맡긴 돈, 빌려준 돈, 내 은행). 그런 것이 있을 때만.
// renderCreditBlock: '나' 화면 덩이 (돈의 시대, 은행가 집안들과 맡긴 돈, 돈놀이 장부, 떼인 돈, 무너진 은행, 기록)
import { creditInfo } from '../credit/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'credit', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { pawn: '전당포 창살 너머의 물건들', ledger: '촛불 아래 장부', dun: '문 앞의 빚쟁이', pardon: '불타는 빚 문서' };

export function renderCreditNow(game, ui = {}) {
  const s = safe(() => creditInfo(game));
  if (!s) return '';
  const m = s.me;
  if (!m.pawns.length && !m.deposited && !m.lent && !m.bank) return '';
  const soon = m.pawns.filter((p) => p.monthsLeft <= 2).sort((a, b) => a.monthsLeft - b.monthsLeft)[0];
  const title = m.bank ? m.bank.house : soon ? `잡힌 ${soon.what}` : m.pawns.length ? `잡힌 물건 ${m.pawns.length}가지` : m.lent ? '빌려준 돈' : '맡긴 돈';
  const tag = soon ? (soon.monthsLeft <= 0 ? '오늘까지' : `${soon.monthsLeft}달 남음`) : m.bank ? m.bank.fortuneWord : m.lent ? `은화 ${m.lent}닢` : `은화 ${m.deposited}닢`;
  return `<details class="card workshop cr-card"${ui.crOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${m.bank ? '내 은행' : m.pawns.length ? '전당포' : '돈'}</span><strong>${esc(title)}</strong></span>
      <span class="ws-demand ${soon || (m.bank && m.bank.fortune < 30) ? 'down' : 'up'}">${esc(tag)}</span>
    </summary>
    <div class="ws-body">
      ${m.pawns.length ? `<ul class="ag-clues">${m.pawns.map((p) => `<li><b>${esc(p.what)}</b> · ${esc(p.place)} 전당포 · 찾는 값 은화 ${p.redeem}닢 · ${p.monthsLeft <= 0 ? '<b class="warn">오늘이 마지막</b>' : `${p.monthsLeft}달 남음`}</li>`).join('')}</ul>` : ''}
      ${m.deposited ? `<p class="note">은행에 맡긴 돈 은화 ${m.deposited}닢</p>` : ''}
      ${m.lent ? `<p class="note">빌려준 돈 은화 ${m.lent}닢 · 빌려 간 사람 ${m.borrowers}명${m.harsh ? ' · 모질게 받아 낸다' : ''}</p>` : ''}
      ${m.bank ? `<div class="wd-row kn-row"><span>내 은행 · ${esc(m.bank.place)}</span>${bar(m.bank.fortune, m.bank.fortune < 30 ? 'low' : 'kin')}<span class="v">${esc(m.bank.fortuneWord)}</span></div>` : ''}
    </div>
  </details>`;
}

export function renderCreditBlock(game) {
  const s = safe(() => creditInfo(game));
  if (!s) return '';
  const m = s.me;
  const any = m.deposited || m.pawns.length || m.lent || m.earned || m.lost || m.bad.length || m.bank || m.crownLent || s.log.length;
  if (!any) return '';
  const chips = [];
  if (m.earned) chips.push(['돈놀이로 번 돈', `은화 ${m.earned}닢`, 'up']);
  if (m.lost) chips.push(['떼인 돈', `은화 ${m.lost}닢`, 'down']);
  if (m.forgiven) chips.push(['탕감해 줌', `${m.forgiven}번`, 'up']);
  if (m.squeezed) chips.push(['쥐어짬', `${m.squeezed}번`, 'down']);
  if (m.crownLent) chips.push(['왕실에 빌려줌', `은화 ${m.crownLent}닢`]);
  const v = m.squeezed > m.forgiven && m.squeezed ? 'dun' : m.forgiven ? 'pardon' : m.pawns.length && !m.lent && !m.bank ? 'pawn' : 'ledger';
  const src = art(game, v);
  const mine = s.banks.filter((b) => b.deposit || b.mine);
  return `<div class="block cr-block">
    <h3>빚과 돈놀이</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    <p class="note">${esc(s.stageWord)}의 시대${s.here ? ` · 이 고장의 돈줄은 ${esc(s.here)}` : ''}</p>
    ${m.bank ? `<div class="wd-row kn-row"><span>내 은행 · ${esc(m.bank.house)}</span>${bar(m.bank.fortune, m.bank.fortune < 30 ? 'low' : 'kin')}<span class="v">${esc(m.bank.fortuneWord)}</span></div>` : ''}
    ${mine.length ? `<ul class="ag-clues">${mine.map((b) => `<li><b>${esc(b.house)}</b> · ${esc(b.place)}${b.deposit ? ` · 맡긴 돈 은화 ${b.deposit}닢` : ''} · ${esc(b.fortuneWord)}${b.crown ? ' · 왕실에 물렸다' : ''}</li>`).join('')}</ul>` : ''}
    ${m.lent ? `<p class="note">돈놀이 장부: 빌려준 돈 은화 ${m.lent}닢 / 굴릴 수 있는 돈 은화 ${m.cap}닢 · ${m.borrowers}명${m.harsh ? ' · <b class="warn">모질게 받아 낸다는 말이 돈다</b>' : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${m.bad.length ? `<p class="note">못 받은 돈: ${m.bad.map((x) => `${esc(x.who)} 은화 ${x.amt}닢`).join(', ')}</p>` : ''}
    ${s.past.length ? `<p class="note">무너지거나 문 닫은 집: ${s.past.slice(0, 3).map((x) => `${esc(x.house)}(${esc(x.place)}, ${x.from}~${x.to}년${x.endWord ? `, ${esc(x.endWord)}` : ''})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>돈을 두고 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
