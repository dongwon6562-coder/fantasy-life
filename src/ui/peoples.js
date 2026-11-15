// 12단계 '다른 종족의 땅' 화면(src/peoples). 읽기만 한다. '사람들' 화면 카드.
import { peoplesInfo, peoplesLine } from '../peoples/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
// 사이(-100~100): 가운데에서 좌우로
const two = (v) => `<span class="rp-two ${v < 0 ? 'neg' : 'pos'}"><i style="${v < 0 ? `right:50%;width:${Math.min(50, -v / 2)}%` : `left:50%;width:${Math.min(50, v / 2)}%`}"></i></span>`;

export function renderPeoples(game) {
  const s = safe(() => peoplesInfo(game));
  if (!s) return '';
  const known = s.lands.filter((l) => l.standing != null);
  if (!s.here && !known.length && !s.heritage.length && !s.friends) return '';
  const line = safe(() => peoplesLine(game), '');
  const land = (l) => {
    const rites = l.rites.map((r) => `<li class="${r.done ? 'done' : ''}"><span>${esc(r.name)}</span><span class="note">${r.month}월${r.done ? ` · ${r.done}년에 함께함` : ''}</span></li>`).join('');
    return `<li class="pp-land${s.here?.id === l.id ? ' here' : ''}">
      <div class="top"><strong>${esc(l.name)}</strong><span class="note">${esc(l.people)}${l.lived ? ` · ${l.lived}달 지냄` : ''}</span></div>
      <div class="wd-row kn-row"><span>받아들임</span>${bar(l.standing, l.standing < 20 ? 'low' : 'kin')}<span class="v">${esc(l.standingWord)}</span></div>
      <span class="note">익힌 풍습 ${l.custom}/3${l.customNames.length ? `: ${esc(l.customNames.join(', '))}` : ''}${l.nextCustom ? ` · 다음은 '${esc(l.nextCustom)}'` : ''}</span>
      ${l.named ? `<span class="note pp-name">이 땅에서 불리는 내 이름: '${esc(l.named)}'</span>` : ''}
      ${rites ? `<ul class="pp-rites">${rites}</ul>` : ''}
    </li>`;
  };
  const unknown = s.lands.filter((l) => l.standing == null);
  return `<section class="card peoples-card">
    <h2>다른 종족의 땅 <small>${s.here ? esc(s.here.name) + '에 있다' : `아는 땅 ${known.length}곳`}</small></h2>
    ${line ? `<p class="pp-now">${esc(line)}</p>` : ''}
    ${s.here?.rite ? `<p class="note">이달은 '${esc(s.here.rite)}'의 때다. 할 일의 '그 땅의 의식'으로 함께할 수 있다.</p>` : ''}
    ${known.length ? `<ul class="ct-houses pp-lands">${known.map(land).join('')}</ul>` : ''}
    ${unknown.length ? `<p class="note">아직 발을 들이지 않은 땅: ${unknown.map((l) => `${esc(l.name)} (${esc(l.people)})`).join(', ')}</p>` : ''}
    ${s.heritage.length ? `<p class="note">섞인 혈통의 아이: ${s.heritage.map((h) => `${esc(h.name)}${h.word ? ` — ${esc(h.word)}` : ''}`).join(', ')}</p>` : ''}
    ${s.friends ? `<p class="note">다른 종족과 맺은 깊은 우정 ${s.friends}</p>` : ''}
    ${s.ties.length ? `<details class="pl-more"><summary>종족끼리의 사이</summary><ul class="pp-ties">${s.ties.map((t) => `<li><span>${esc(t.a)}·${esc(t.b)}</span>${two(t.value)}<span class="note">${esc(t.word)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>다른 종족과 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
