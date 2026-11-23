// 37단계 '사냥꾼' 화면(src/hunter). 읽기만 한다.
// renderHunterNow: 이번 달 접는 카드 (이 고장 사냥터·영주 사냥 허가·짐승 수, 가죽·고기, 모피 상인 주문). 사냥꾼이거나 가죽·주문·오두막이 있을 때만.
// renderHunterBlock: '나' 화면 덩이 (사냥 솜씨, 사냥한 횟수·번 돈·밀렵·붙잡힘, 잡은 큰 짐승, 오두막과 도제, 기록)
import { hunterInfo } from '../hunter/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderHunterNow(game, ui = {}) {
  const s = safe(() => hunterInfo(game));
  if (!s || (!s.hunter && !s.furs.length && !s.trader.order && !s.lodge)) return '';
  const G = s.ground, o = s.trader.order;
  const furN = s.furs.reduce((a, f) => a + f.n, 0);
  return `<details class="card workshop hu-card"${ui.huOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">사냥 · ${esc(s.season)}</span><strong>${esc(G?.wood ?? (s.lodge ? `${s.lodge.place} 오두막` : '가죽과 고기'))}</strong></span>
      <span class="ws-demand ${G?.banned ? 'down' : 'up'}">${esc(G?.banned ? '사냥 금지' : furN ? `가죽 ${furN}장` : G ? `짐승 ${G.stock}` : '')}</span>
    </summary>
    <div class="ws-body">
      ${G ? `<p class="note">${G.lord ? `${esc(G.lord)} · ${G.licensed ? '허가받았다' : `<b class="warn">허가 없음</b>${G.fee ? ` (허가비 은화 ${G.fee}닢)` : ''}`}` : '누구의 것도 아닌 숲'} · 짐승 ${G.stock >= 60 ? '넉넉하다' : G.stock >= 30 ? '그럭저럭' : '드물다'}</p>` : ''}
      ${s.furs.length ? `<p class="note">가죽: ${s.furs.map((f) => `${esc(f.name)} ${f.n}${f.price ? ` (장당 ${f.price}닢)` : ''}`).join(', ')}</p>` : ''}
      ${s.meat || s.smoked ? `<p class="note">고기 ${s.meat}${s.smoked ? ` · 훈제 ${s.smoked}` : ''}</p>` : ''}
      ${o ? `<p class="note">모피 상인 ${esc(s.trader.name)}의 주문: ${esc(o.what)} ${o.n}장 · ${o.left}달 남음</p>` : ''}
    </div>
  </details>`;
}

export function renderHunterBlock(game) {
  const s = safe(() => hunterInfo(game));
  if (!s || (!s.hunts && !s.skill && !s.lodge)) return '';
  const chips = [];
  if (s.hunts) chips.push(['사냥', `${s.hunts}번`]);
  if (s.earned) chips.push(['번 돈', `은화 ${s.earned}닢`, 'up']);
  if (s.poached) chips.push(['밀렵', `${s.poached}번`, 'down']);
  if (s.caught) chips.push(['산지기에게 붙잡힘', `${s.caught}번`, 'down']);
  if (s.licenses.length) chips.push(['사냥 허가', s.licenses.join(', ')]);
  const v = s.bigs.length && /곰|멧돼지|늑대|사슴왕|마수/.test(s.bigs.at(-1)) ? 'beast' : s.furs.length ? 'furs' : s.lodge ? 'trap' : 'trail';
  const art = safe(() => vignetteImage({ plate: 'hunter', variant: v, year: game.date.year, month: game.date.month }), '');
  const ALT = { beast: '큰 짐승과 마주친 숲', furs: '말리는 가죽', trap: '덫을 놓는 사냥꾼', trail: '눈 위의 짐승 발자국' };
  return `<div class="block hu-block">
    <h3>사냥</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[v]}">` : ''}
    ${s.skill ? `<div class="wd-row kn-row"><span>사냥 솜씨</span>${bar(s.skill, 'kin')}<span class="v">${s.skill}</span></div>` : ''}
    ${s.lodge ? `<p><strong>${esc(s.lodge.place)} 사냥꾼 오두막</strong> · ${s.lodge.since}년부터${s.lodge.apprentices.length ? ` · 도제 ${s.lodge.apprentices.map(esc).join(', ')}` : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.bigs.length ? `<p class="note">잡은 큰 짐승: ${s.bigs.slice().reverse().map(esc).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>숲에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
