// 15단계 '늙음과 마지막 해들' 화면(src/elder). 읽기만 한다.
// '나' 화면 덩이: 몸과 기억, 물러남, 회고록, 장례 뜻, 마지막 여행, 풀어 낸 묵은 일, 집안 무덤.
import { elderInfo } from '../elder/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderElderBlock(game) {
  const s = safe(() => elderInfo(game));
  if (!s) return '';
  const any = s.old || s.graves.length || s.memoirs.length || s.retired || s.memoir || s.log.length;
  if (!any) return '';
  const tags = [];
  if (s.retired) tags.push([`${s.retired.y}년에 ${s.retired.job ?? '일'}에서 물러남${s.retired.how ? ` · ${s.retired.how}` : ''}`, '']);
  if (s.wish) tags.push([`장례 뜻: ${s.wish.name}`, 'heir']);
  if (s.dying) tags.push(['마지막이 가깝다', 'dark']);
  const M = s.memoir;
  const memoir = M && !M.done ? `<div class="tw-mem">
      <div class="top"><strong>회고록 《${esc(M.title)}》</strong><span class="note">${M.ch}/${M.need}장</span></div>
      ${bar((M.ch / Math.max(1, M.need)) * 100, 'kin')}
    </div>` : '';
  const graveLi = (x) => `<li class="${x.desecrated ? 'bad' : ''}"><div class="top"><strong>${esc(x.name)}</strong><span class="note">${esc(x.rel)}${x.born ? ` · ${x.born}~${x.died}년` : x.died ? ` · ${x.died}년` : ''}</span></div>
      <span class="note">${esc(x.placeName)} ${esc(x.kind)} · ${esc(x.word)}${x.desecrated ? ' · 누군가 무덤을 더럽혔다' : ''}</span>
      ${x.epitaph ? `<span class="note el-epitaph">"${esc(x.epitaph)}"</span>` : ''}</li>`;
  return `<div class="block elder-block">
    <h3>늙음과 마지막 해들</h3>
    ${s.old ? `<div class="wd-row kn-row"><span>몸 · ${esc(s.bodyWord)}</span>${bar(100 - s.frail, s.frail >= 50 ? 'low' : 'kin')}</div>
    <div class="wd-row kn-row"><span>기억 · ${esc(s.mindWord)}</span>${bar(100 - s.fog, s.fog >= 50 ? 'low' : 'mana')}</div>` : ''}
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${memoir}
    ${s.journeys.length ? `<p class="note">마지막 여행: ${s.journeys.map((j) => `${esc(j.name)} (${j.y}년)`).join(', ')}</p>` : ''}
    ${s.amends.length ? `<details class="pl-more"><summary>풀어 낸 묵은 일 ${s.amends.length}가지</summary><ul class="pl-news">${s.amends.slice().reverse().map((a) => `<li><time>${a.y}년</time><span>${esc(a.name)} · ${esc(a.how)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.memoirs.length ? `<p class="note">집안의 회고록: ${s.memoirs.map((m) => `《${esc(m.title)}》 ${esc(m.by)}${m.done ? '' : ' (못다 씀)'}${m.read ? ' · 읽음' : ''}`).join(', ')}</p>` : ''}
    ${s.graves.length ? `<details class="pl-more"><summary>집안 무덤 ${s.graves.length}기</summary><ul class="ct-houses el-graves">${s.graves.slice().reverse().map(graveLi).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>마지막 해들에 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
