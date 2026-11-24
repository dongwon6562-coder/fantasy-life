// 40단계 '서자와 혼외 자식' 화면(src/baseborn). 읽기만 한다.
// renderBaseborn: 사람들 화면 카드 (내 혼외 자식들과 정, 내가 서자면 아버지와 적자 형제, 이 고장 서자 소식)
// renderBasebornBlock: '나' 화면 덩이 (내가 서자일 때: 아버지에게 받은 인정, 이름, 나간 길, 적자와의 사이, 기록)
import { bbInfo } from '../baseborn/index.js';
import { byId } from '../npc.js';
import { portrait } from '../art/portrait.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'baseborn', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { door: '문간에 선 아이', face: '적자와 마주 선 날', shield: '문장 없는 방패', named: '이름을 받는 날' };
const RECOG = ['인정받지 못했다', '은화로만 안다', '아버지가 제 자식이라 불렀다'];
const logList = (log, label) => (log.length ? `<details class="pl-more"><summary>${label} ${log.length}가지</summary><ul class="pl-news">${log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : '');

function selfRows(me) {
  const lv = Math.max(0, RECOG.indexOf(me.recog));
  return `<div class="wd-row kn-row"><span>아버지 ${esc(me.father ?? '')}${me.fatherAlive ? '' : ' (세상을 떠났다)'}</span>${bar(me.named ? 100 : lv * 45 + 10, me.named || lv >= 2 ? 'kin' : 'low')}<span class="v">${esc(me.named ? '아버지의 성을 받았다' : me.recog)}</span></div>
    ${me.rival ? `<div class="wd-row kn-row"><span>${esc(me.rival.word)} ${esc(me.rival.name)}</span>${bar(me.rival.rivalry, me.rival.rivalry >= 50 ? 'low' : 'mana')}<span class="v">${me.rival.rivalry >= 60 ? '서로 칼을 품었다' : me.rival.rivalry >= 30 ? '눈을 피한다' : '그럭저럭'}</span></div>` : ''}`;
}

export function renderBaseborn(game) {
  const s = safe(() => bbInfo(game));
  if (!s || (!s.any && !s.npc.length)) return '';
  const me = s.self;
  const v = me ? (me.named || me.seized ? 'named' : me.rival ? 'face' : 'door') : s.kids.some((k) => k.legit) ? 'named' : 'door';
  const src = art(game, v);
  const face = (id) => { const p = safe(() => byId(game, id)); return p ? safe(() => portrait(game, p, { size: 52 }), '') : ''; };
  return `<section class="card bb-card">
    <h2>서자와 혼외 자식 <small>${s.kids.length ? `${s.kids.length}명` : me ? '내 핏줄' : '이 고장 소식'}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${me ? `<div class="fr-one"><p><strong>나는 서출이다</strong>${me.path ? ` · 나간 길: ${esc(me.path)}` : ''}${me.seized ? ' · <b>집안을 차지했다</b>' : ''}</p>${selfRows(me)}</div>` : ''}
    ${s.kids.map((k) => `<div class="fr-one ad-kid">
      <div class="ad-head">${face(k.id)}<div><p><strong>${esc(k.name)}</strong> · ${k.age}살 · 내 ${esc(k.word)}${k.legit ? ' · 내 성을 주었다' : ' · 성이 없다'}</p>
      <p class="note">${k.years ? `안 지 ${k.years}년` : '안 지 한 해가 안 됐다'}${k.path ? ` · ${esc(k.path)}` : ''}</p></div></div>
      <div class="wd-row kn-row"><span>정</span>${bar(k.bond, k.bond < 30 ? 'low' : 'kin')}</div>
    </div>`).join('')}
    ${s.npc.length ? `<p class="note">이 고장의 서자 소식: ${s.npc.map((x) => `${esc(x.by)}의 ${esc(x.kid)}(${x.y}년${x.recog ? ', 인정받음' : ''})`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderBasebornBlock(game) {
  const s = safe(() => bbInfo(game));
  if (!s || !s.any) return '';
  const me = s.self;
  const v = me ? (me.named || me.seized ? 'named' : me.path ? 'shield' : 'door') : 'face';
  const src = art(game, v);
  return `<div class="block bb-block">
    <h3>서자와 혼외 자식</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${me ? `${selfRows(me)}${me.path ? `<p class="note">나간 길: ${esc(me.path)}</p>` : ''}${me.seized ? '<p class="note"><b>적자를 밀어내고 집안을 차지했다.</b></p>' : ''}` : ''}
    ${s.kids.length ? `<p class="note">내 혼외 자식: ${s.kids.map((k) => `${esc(k.name)}(${k.age}살${k.legit ? ', 내 성' : ''})`).join(', ')}</p>` : ''}
    ${logList(s.log, '핏줄을 두고 있었던 일')}
  </div>`;
}
