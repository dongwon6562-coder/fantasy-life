// 30단계 '오늘의 장면': 이번 달 화면 맨 위 카드 하나.
// 그 고장 이름과 한 줄 풍경, 지난달 한 일, 마주친 사람들, 들려온 소식, 지난달 한눈에, 레오니아 정세를 차례로 담는다.
// 다른 갈래가 내보내는 줄(만남·소문·감각)은 TODAY_SOURCES에 이어 붙인다. 하나가 망가져도 카드는 그려진다.
// 글이 한 줄씩 드러나는 효과: 줄마다 class="ln" style="--ln:n". 달이 바뀐 첫 그림에서만 카드에 rv가 붙는다.
import { natureInfo } from '../nature/index.js';
import { streetLine, rumorLines, rumorInfo } from '../rumor/index.js';
import { sceneLine, sensesLine } from '../senses/index.js';
import { isJailed } from '../crime.js';
import { encounterLines } from '../encounter/index.js';
import { siblingLines } from '../siblings/index.js';
import { ruinsLine } from '../ruins/index.js';
import { orderLine } from '../order/index.js';
import { foundingLines } from '../founding/index.js';
import { mountLine } from '../mount/index.js';
import { harborLine } from '../harbor/index.js';
import { originLines } from '../origins/index.js';
import { kindredLines } from '../kindred/index.js';
import { demonkindLines } from '../demonkind/index.js';
import { demonsLine } from '../demons/index.js';
import { clothLine } from '../cloth/index.js';
import { techLine } from '../techtree/index.js';
import { laterLine } from '../later_era/index.js';
import { cityLine } from '../cityday/index.js';
import { newageLines } from '../newage/index.js';
import { friendsLines } from '../friends/index.js';
import { builderLine } from '../builder/index.js';
import { spreadLine } from '../techspread/index.js';
import { occLine } from '../occupied/index.js';
import { carrierLine } from '../carrier/index.js';
import { creditLine } from '../credit/index.js';
import { undertakerLine } from '../undertaker/index.js';
import { bbLines } from '../baseborn/index.js';
import { migrateLine } from '../migrate/index.js';
import { surveyLine } from '../survey/index.js';
import { starsLine } from '../stars/index.js';
import { magejobLine } from '../magejob/index.js';
import { swordLine } from '../duel/index.js';
import { delveLine } from '../delve/index.js';
import { artificeLine } from '../artifice/index.js';
import { ritesLine } from '../rites/index.js';
import { watchLine } from '../watch/index.js';
import { piratesLine } from '../pirates/index.js';
import { sectLine } from '../sect/index.js';
import { witchLine } from '../witch/index.js';
import { councilLine } from '../council/index.js';
import { bountyLine } from '../bounty/index.js';
import { landsLine } from '../lands/index.js';
import { crownsLines } from '../crowns/index.js';
import { peersLines } from '../peers/index.js';
import { demongodLine } from '../demongod/index.js';
import { prisonLines } from '../prison/index.js';
import { cloisterLine } from '../cloister/index.js';
import { societyLines } from '../society/index.js';
import { outlawsLine } from '../outlaws/index.js';
import { hunterLine } from '../hunter/index.js';
import { stepLines } from '../stepfamily/index.js';
import { adoptLines } from '../adopt/index.js';
import { placeName } from '../places.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []).filter((x) => typeof x === 'string' ? x.trim() : x?.text);
const txt = (x) => (typeof x === 'string' ? x : x.text);

// 다른 갈래가 붙는 자리: lead(풍경, 앞의 두 줄), did(지난달 머리 한 줄), met(마주친 사람들), heard(들려온 소문)
// 함수는 game을 받아 글 한 줄, 줄들, {text, cls} 가운데 하나를 돌려준다.
export const TODAY_SOURCES = {
  lead: [sceneLine, starsLine, cloisterLine, occLine, migrateLine, outlawsLine, demonsLine, cityLine, laterLine, harborLine, mountLine, clothLine, builderLine, carrierLine, creditLine, undertakerLine, surveyLine, magejobLine, artificeLine, swordLine, demongodLine, delveLine, landsLine, hunterLine, ritesLine, watchLine, piratesLine, sectLine, witchLine, councilLine, bountyLine, streetLine, (g) => natureInfo(g)?.sky], // 몸으로 느끼는 지금 (src/senses), 수도원과 은둔 (src/cloister), 점령지 (src/occupied), 산적 (src/outlaws), 해협 너머 마족 (src/demons), 포구 (src/harbor), 하늘 짐승 (src/mount), 옷감과 옷차림 (src/cloth), 짓는 일 (src/builder), 길 위의 일 (src/carrier), 빚과 돈놀이 (src/credit), 사냥 (src/hunter), 공장 거리와 빈 마을 (src/cityday), 새 기술과 세력 (src/later_era), 거리 풍경 (src/rumor), 없으면 하늘과 땅. 앞의 셋까지
  did: [sensesLine], // 지난달을 몸으로 느낀 한두 문장 (src/senses): '지난달 한 일' 머리에
  met: [
    (g) => encounterLines(g).map((x) => ({ text: x.text, cls: x.kind ? `ek-${String(x.kind).replace(/[^\w-]/g, '')}` : '' })), // 먼저 다가온 사람들 (src/encounter)
    originLines, kindredLines, demonkindLines, crownsLines, peersLines, friendsLines, stepLines, adoptLines, bbLines, prisonLines, societyLines, siblingLines, orderLine, // 태어난 집안 사람들 (src/origins), 평생의 벗 (src/friends), 의붓가족 (src/stepfamily), 거둔 아이 (src/adopt), 사교계 (src/society), 형제자매 (src/siblings), 기사단 형제들 (src/order)
  ],
  heard: [
    (g) => rumorLines(g).map((h) => ({ text: h.text, cls: h.fix ? 'rumor fix' : 'rumor' })), // 소문 (src/rumor)
    ruinsLine, // 이 고장에서 보이는 유적 (src/ruins)
    foundingLines, // 내 나라의 일 (src/founding)
    newageLines, techLine, spreadLine, // 기술이 퍼지는 길 (src/techspread), 새 시대의 사람들 (src/newage), 이 고장에서 한창인 연구 (src/techtree)
  ],
};

const pick = (kind, game) => TODAY_SOURCES[kind].flatMap((fn) => safe(() => arr(fn(game)), []));

/** 이번 달 맨 위 카드. parts: { results: 지난달 한 일 html, summary: 지난달 한눈에 html, world: 정세 접은 줄 html, season, cond, reveal } */
export function renderToday(game, parts = {}) {
  let i = 0;
  const ln = (c = '') => `class="ln${c ? ` ${c}` : ''}" style="--ln:${i++}"`;
  const lead = safe(() => isJailed(game)) ? arr(safe(() => sceneLine(game))) : pick('lead', game).slice(0, 3); // 갇혀 있으면 바깥 거리 풍경은 안 보인다
  const did = pick('did', game)[0];
  const feast = safe(() => rumorInfo(game).feast); // 이달 이 고장 축제
  const met = pick('met', game).slice(0, 3);
  const heard = pick('heard', game).slice(0, 4);
  const news = game.news ?? [];
  const quiet = !news.length && !met.length && !heard.length;
  // 소식이 많으면(여러 달 건너뛰었거나 난리 난 해) 가까운 사람 일과 소문 다섯만 펼치고 나머지는 접는다
  const heardList = () => {
    const all = [...news.map((n) => ({ text: n.text, cls: n.rel >= 40 ? 'close' : '', w: n.rel >= 40 ? 2 : 0 })), ...heard.map((x) => ({ text: txt(x), cls: (typeof x === 'object' && x.cls) || 'rumor', w: 1 }))];
    // 51단계: 첫 화면이 길어 할 일이 멀었다. 펼쳐 두는 소식은 셋까지
    if (all.length <= 4) return `<ul class="news">${all.map((x) => li(x)).join('')}</ul>`;
    const top = new Set([...all].sort((a, b) => b.w - a.w).slice(0, 3));
    const shown = all.filter((x) => top.has(x)), rest = all.filter((x) => !top.has(x));
    return `<ul class="news">${shown.map((x) => li(x)).join('')}</ul><details class="td-more"><summary>그 밖의 소식 ${rest.length}가지</summary><ul class="news">${rest.map((x) => `<li${x.cls ? ` class="${esc(x.cls)}"` : ''}>${esc(x.text)}</li>`).join('')}</ul></details>`;
  };
  const li = (x, cls = '') => { const c = (typeof x === 'object' && x.cls) || cls; return `<li class="ln${c ? ` ${esc(c)}` : ''}" style="--ln:${i++}">${esc(txt(x))}</li>`; };
  const body = `
    <header class="td-head ln" style="--ln:${i++}"><span class="td-eye">${esc(parts.when || '이번 달')}</span><h2>${esc(safe(() => placeName(game), '') || '이 고장')}</h2></header>
    ${lead.length ? `<div class="td-lead">${lead.map((x) => `<p class="ln" style="--ln:${i++}">${esc(txt(x))}</p>`).join('')}</div>` : ''}
    ${feast ? `<p class="td-feast ln" style="--ln:${i++}"><b>${esc(feast.name)}</b> ${esc(feast.text)}</p>` : ''}
    ${met.length ? `<div class="td-sec td-met"><h3 ${ln('sub')}>마주친 사람들</h3><ul class="news">${met.map((x) => li(x)).join('')}</ul></div>` : ''}
    ${news.length || heard.length ? `<div class="td-sec td-heard"><h3 ${ln('sub')}>들려온 소식</h3>${heardList()}</div>` : ''}
    ${quiet ? `<p class="note ln" style="--ln:${i++}">조용한 달이었다. 별다른 소문은 없다.</p>` : ''}
    ${parts.summary && !parts.results ? `<div class="td-sec td-sum ln" style="--ln:${i++}">${parts.summary}</div>` : ''}
    ${parts.world ? `<div class="ln" style="--ln:${i++}">${parts.world}</div>` : ''}`;
  // 51단계 둘째 판: '지난달 한 일'은 이번 달 화면에서 제일 먼저 읽는 글이라, 풍경 카드 위 따로 밝은 기록지 카드로 펼쳐 둔다.
  // 한 일이 넷 넘으면 셋만 펼치고 나머지는 접는다 (index.js renderNews). 지난달 한눈에(돈·자람 칩)는 그 아래.
  const log = parts.results ? `<section class="card td-log${parts.reveal ? ' rv' : ''}" aria-label="지난달 한 일">
    <header class="tl-head ln" style="--ln:0"><span class="tl-eye">지난달 기록</span><h2>지난달 한 일</h2></header>
    ${did ? `<p class="tl-feel ln" style="--ln:1">${esc(txt(did))}</p>` : ''}
    <div class="tl-list ln" style="--ln:2">${parts.results}</div>
    ${parts.summary ? `<div class="tl-sum ln" style="--ln:3">${parts.summary}</div>` : ''}
  </section>` : '';
  // 줄이 많아도 2.4초 안에 다 드러나게
  return `${log}<section class="card today news-card${parts.reveal ? ' rv' : ''}" style="--st:${Math.min(0.22, 2.4 / Math.max(1, i)).toFixed(3)}s">${body}
  </section>`;
}

/** 사건 창 글을 문장마다 <span class="ln">으로 감싼다 (한 줄씩 드러나기). n: 문장 수.
 *  드러나는 시간은 문장이 많아도 1.6초 안: 한 문장 사이 간격을 줄인다. */
export function revealSpans(text, from = 0) {
  const parts = String(text ?? '').split(/(?<=[.!?…][”"’」』)]?)\s+/).filter((x) => x.trim());
  const step = Math.min(0.32, 1.6 / Math.max(1, parts.length));
  const html = parts.map((t, k) => `<span class="ln" style="--ln:${from + k};--st:${step}s">${esc(t)}</span>`).join(' ');
  return { html, n: parts.length, step };
}
