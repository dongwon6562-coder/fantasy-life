// 23단계 '개척과 새 땅' 화면(src/frontier). 읽기만 한다.
// renderFrontierNow: 이번 달 화면 한 줄 (개척지에 있거나, 내 개척촌이 있거나, 개척단을 모으는 중일 때)
// renderFrontier: 지도 화면 카드 (변경 너머 여섯 땅: 누가 일구는지, 단계와 사람 수, 곡간·울타리·기운, 먼저 살던 이들, 허가장과 개척단, 기록)
// renderFrontierBlock: '나' 화면 덩이 (내가 일군 곳, 허가장, 개척한 일들)
import { frontierInfo, frontierLine } from '../frontier/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const BAD = /바닥났다|짐을 꾸린다|지킬 것이 없다|원수로 여긴다/;
const warn = (t) => (BAD.test(t) ? `<b class="warn">${esc(t)}</b>` : esc(t));

export function renderFrontierNow(game) {
  const line = safe(() => frontierLine(game), null);
  if (!line) return '';
  return `<section class="card frontier-now"><p class="note"><b${BAD.test(line) ? ' class="warn"' : ''}>개척</b> ${esc(line)}</p></section>`;
}

const partyLine = (s) => {
  const P = s.party, C = s.charter;
  const bits = [];
  if (C) bits.push(`허가장: ${esc(C.land)}${C.legal ? '' : ' <b class="warn">(정식 허가가 아니다)</b>'}`);
  if (P) bits.push(`모은 개척단 ${P.settlers}집 · ${esc(P.land)} · 양식 ${P.food}${P.tools ? ' · 연장' : ''}${P.guards ? ' · 호위' : ''}`);
  return bits.join(' · ');
};

export function renderFrontier(game) {
  const s = safe(() => frontierInfo(game));
  if (!s || !s.sites.length) return '';
  const row = (x) => {
    const top = `<div class="top"><strong>${esc(x.name)}</strong><span class="note">${x.named && x.name !== x.land ? `${esc(x.land)} · ` : ''}${esc(x.stageName)}${x.here ? ' · 여기' : ''}</span></div>`;
    const where = `${esc(x.near)}에서 ${x.months}달 길${x.claim ? ` · ${esc(x.claim)} 땅이라 한다` : ' · 주인 없는 땅'}${x.lost ? ` · 버려진 개척촌 ${x.lost}곳` : ''}`;
    const life = x.open ? `<span class="note">사람 ${x.pop}명${x.mine ? ' · 내가 일굼' : x.by ? ` · ${esc(x.by)}` : ''}${x.chief ? ' · 내가 촌장' : ''}${x.winters ? ` · 겨울을 ${x.winters}번 났다` : ''}</span><span class="note">${[x.food, x.safety, x.morale].filter(Boolean).map(warn).join(' · ')}</span>` : '';
    const N = x.natives;
    const nat = N && (x.open || x.here || x.mine) ? `<span class="note">먼저 살던 이들: ${esc(N.name)} (${esc(N.race)}) · ${N.gone ? '<b class="warn">쫓겨났다</b>' : warn(N.mood)}${N.gone ? '' : ` · 바라는 것: ${esc(N.want)}`}</span>` : N ? `<span class="note">먼저 살던 이들: ${esc(N.name)} (${esc(N.race)})</span>` : '';
    return `<li class="${x.mine || x.chief ? 'here' : ''}">${top}<span class="note">${where}</span>${life}${nat}</li>`;
  };
  const sorted = s.sites.slice().sort((a, b) => ((b.mine || b.chief) - (a.mine || a.chief)) || (b.here - a.here) || (b.stage - a.stage));
  const open = s.sites.filter((x) => x.open).length;
  const pl = partyLine(s);
  return `<section class="card frontier-card">
    <h2>변경 너머 <small>${open ? `사람이 사는 곳 ${open} / ${s.sites.length}` : `빈 땅 ${s.sites.length}곳`}</small></h2>
    ${pl ? `<p class="note">${pl}</p>` : ''}
    <ul class="ct-houses ft-list">${sorted.map(row).join('')}</ul>
    ${s.log.length ? `<details class="pl-more"><summary>개척에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderFrontierBlock(game) {
  const s = safe(() => frontierInfo(game));
  const M = s?.me;
  if (!M) return '';
  const chips = [];
  if (M.charters) chips.push(['받은 허가장', `${M.charters}장`]);
  if (M.led) chips.push(['이끈 개척단', `${M.led}번`]);
  if (M.founded) chips.push(['세운 개척촌', `${M.founded}곳`, 'up']);
  if (M.named) chips.push(['이름 붙인 땅', `${M.named}곳`, 'up']);
  if (M.settlers) chips.push(['데려간 개척민', `${M.settlers}집`]);
  if (M.winters) chips.push(['개척지에서 난 겨울', `${M.winters}번`]);
  if (M.treaties) chips.push(['먼저 살던 이들과 맺은 약속', `${M.treaties}번`, 'up']);
  if (M.drove) chips.push(['몰아낸 먼저 살던 이들', `${M.drove}번`, 'down']);
  if (M.joined) chips.push(['남의 개척촌에 듦', `${M.joined}번`]);
  if (M.left) chips.push(['떠나온 개척촌', `${M.left}번`, 'down']);
  const pl = partyLine(s);
  if (!chips.length && !s.mine.length && !pl) return '';
  return `<div class="block frontier-block">
    <h3>개척</h3>
    ${s.mine.length ? `<ul class="am-rows">${s.mine.map((x) => `<li><strong>${esc(x.name)}</strong> <span class="note">${esc(x.stageName)} · 사람 ${x.pop}명${x.chief ? ' · 내가 촌장' : ''}</span></li>`).join('')}</ul>` : ''}
    ${pl ? `<p class="note">${pl}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
  </div>`;
}
