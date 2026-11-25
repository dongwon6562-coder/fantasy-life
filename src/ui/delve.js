// 44단계 '미궁' 화면(src/delve delveInfo). 읽기만 한다.
// renderDelveMap: 지도 화면 카드 (지금 고장의 미궁: 층 표·미궁의 주인·미궁 도시·최고 기록, 미궁마다 최고 기록, 이름난 공략대)
// renderDelveBlock: '나' 화면 덩이 (내가 들어간 미궁마다 가장 깊이 내려간 층·표식·공략 횟수, 알아낸 것, 내 공략대, 기록)
import { delveInfo } from '../delve/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const art = (g, variant) => safe(() => vignetteImage({ plate: 'delve', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { gate: '미궁 어귀', town: '미궁 앞에 선 마을', shallow: '얕은 층', deep: '깊은 층', lord: '미궁의 주인', party: '공략대', record: '기록 칠판', rival: '다른 공략대', return: '돌아온 공략대' };
const DANGER = ['', '얕다', '조심', '험하다', '아주 험하다', '죽음의 층', '끝을 모른다'];
const logList = (log, label) => (log.length ? `<details class="pl-more"><summary>${label} ${log.length}가지</summary><ul class="pl-news">${log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : '');

// 층 표: 층 구간마다 이름·위험. 내가 내려간 곳까지 밝게, 표식 층에 깃발
function layerTable(d) {
  const deep = d.mine?.deepest ?? 0;
  let from = 1;
  return `<ol class="dv-layers" aria-label="층 표">${d.layers.map((l) => {
    const r = `${from}${l.to > from ? `~${l.to}` : ''}층`; const lo = from; from = l.to + 1;
    const cls = deep >= l.to ? ' done' : deep >= lo ? ' now' : '';
    const mark = d.mine?.mark && d.mine.mark >= lo && d.mine.mark <= l.to ? ' · 내 표식' : '';
    return `<li class="dv-l${cls} d${Math.min(6, l.danger)}"><span class="dv-r">${r}</span><b>${esc(l.name)}</b><em>${esc(DANGER[Math.min(6, l.danger)] ?? '')}${mark}</em></li>`;
  }).join('')}${d.endless ? '<li class="dv-l d6"><span class="dv-r">그 아래</span><b>끝을 모른다</b><em></em></li>' : ''}</ol>`;
}

export function renderDelveMap(game) {
  const s = safe(() => delveInfo(game));
  if (!s || (!s.here && !s.records.length && !s.parties.length)) return '';
  const d = s.here;
  const v = d ? (d.town && d.town.size >= 30 ? 'town' : 'gate') : 'record';
  const src = art(game, v);
  return `<section class="card dv-map">
    <h2>미궁 <small>${d ? esc(d.name) : `기록 ${s.records.length}곳`}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${d ? `<p class="note">${esc(d.place)} · ${d.endless ? '끝이 없다는 미궁' : `${d.floors}층까지`}${d.guild ? ' · 길드가 관리한다' : ''}</p>
      ${layerTable(d)}
      ${d.master ? `<p class="note"><b>미궁의 주인</b> ${esc(d.master.name)}${d.master.alive ? '' : ` · <b class="up">쓰러졌다</b>${d.master.by ? `(${esc(d.master.by)})` : ''}`}</p>` : ''}
      ${d.town ? `<p class="note"><b>${esc(d.town.name)}</b> · ${esc(d.town.word)} · 마석 시세 ${d.town.price >= 1.1 ? "좋다" : d.town.price >= 0.9 ? "보통이다" : "나쁘다"}</p>` : ''}
      ${d.record.best ? `<p class="note">최고 기록 ${d.record.best}층 · ${d.record.me ? '<b class="up">나</b>' : esc(d.record.holder ?? '')}</p>` : ''}` : ''}
    ${s.records.length > (d ? 1 : 0) ? `<p class="note">미궁마다 최고 기록</p><ul class="ag-clues">${s.records.filter((r) => !d || r.name !== d.name).map((r) => `<li><b>${esc(r.name)}</b> · ${r.best}층 · ${r.me ? '<b class="up">나</b>' : esc(r.holder ?? '')}</li>`).join('')}</ul>` : ''}
    ${s.parties.length ? `<p class="note">이름난 공략대: ${s.parties.slice(0, 6).map((p) => `<b>${esc(p.name)}</b>(${esc(p.leader)}, ${esc(p.at)} ${p.best}층)`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderDelveBlock(game) {
  const s = safe(() => delveInfo(game));
  if (!s || (!s.known.length && !s.crew.length && !s.log.length)) return '';
  const deep = Math.max(0, ...s.known.map((k) => k.mine?.deepest ?? 0));
  const v = s.known.some((k) => k.mine?.clears) ? 'return' : s.crew.length ? 'party' : deep >= 10 ? 'deep' : 'shallow';
  const src = art(game, v);
  return `<div class="block dv-block">
    <h3>미궁 공략 <small>${deep ? `가장 깊이 ${deep}층` : '아직 얕은 곳만'}</small></h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.known.map((k) => `<details class="dv-one">
      <summary><span><b>${esc(k.name)}</b> <small>${esc(k.place)}</small></span><em>${k.mine.deepest}층${k.endless ? '' : `/${k.floors}`}</em></summary>
      <div class="dv-body">
        <p class="note">들어간 횟수 ${k.mine.runs} · 끝까지 간 횟수 ${k.mine.clears}${k.mine.mark ? ` · ${k.mine.mark}층에 내 표식` : ''}${k.record.me ? ' · <b class="up">최고 기록</b>' : ''}</p>
        ${layerTable(k)}
        ${k.mine.lore.length ? `<ul class="dv-lore">${k.mine.lore.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${k.mine.secret ? `<p class="note"><b class="warn">깊은 층의 비밀</b> ${esc(k.mine.secret)}</p>` : ''}
      </div>
    </details>`).join('')}
    ${s.crew.length ? `<p class="note">내 공략대: ${s.crew.map((c) => `${esc(c.name)}(${esc(c.role)}, 한 번에 은화 ${c.wage}닢)`).join(', ')}</p>` : ''}
    ${s.past.length ? `<p class="note">윗대의 공략: ${s.past.map((x) => `${x.y}년까지 ${x.runs}번 들어가 가장 깊이 ${x.deepest}층`).join(' · ')}</p>` : ''}
    ${logList(s.log, '미궁에서 있었던 일')}
  </div>`;
}
