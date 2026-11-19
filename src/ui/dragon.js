// 20단계 '잠든 용' 화면(src/dragon). 읽기만 한다. 드물고 무겁게: 아는 용이 있을 때만 그린다.
// renderDragon: 지도 화면 카드 (아는 용왕들의 잠과 노여움, 숭배자, 원정대, 용골 계곡, 기록)
// renderDragonNow: 이번 달 화면 한 줄 (용이 깨어 있거나 뒤척일 때)
// renderDragonBlock: '나' 화면 덩이 (용의 땅에 오른 일, 용과 나눈 말, 벤 용, 비늘). 내가 한 일이 있을 때만.
import { dragonInfo, dragonLine } from '../dragon/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };

export function renderDragonNow(game) {
  const s = safe(() => dragonInfo(game));
  if (!s || (!s.awake.length && !s.stirring.length)) return '';
  const line = safe(() => dragonLine(game), '');
  const bits = [];
  if (s.awake.length) bits.push(`<b class="warn">${s.awake.map(esc).join(', ')} 깨어 있다</b>`);
  if (s.stirring.length) bits.push(`${s.stirring.map(esc).join(', ')} 뒤척인다`);
  return `<section class="card dragon-now"><p class="note"><b>용</b> ${bits.length ? bits.join(' · ') : esc(line)}</p></section>`;
}

export function renderDragon(game) {
  const s = safe(() => dragonInfo(game));
  if (!s || !s.dragons.length) return '';
  const row = (d) => {
    const bits = [esc(d.word)];
    if (d.wrath) bits.push(`<b class="warn">${esc(d.wrath)}</b>`);
    if (d.hoard) bits.push(`보물 ${esc(d.hoard)}`);
    if (d.marked) bits.push('<b class="warn">내 핏줄을 기억한다</b>');
    if (d.bond > 0) bits.push(`말을 섞은 정 ${d.bond}`);
    if (d.slayer) bits.push(`${esc(d.slayer)}의 손에`);
    return `<li class="${d.state === 'dead' ? 'gone' : d.state === 'awake' ? 'bad' : ''}"><div class="top"><strong>${esc(d.name)}</strong><span class="note">${d.name.endsWith(d.title) ? '' : esc(d.title)}</span></div>
      <span class="note">${d.known >= 2 ? `${esc(d.lair)} · ` : ''}${bits.join(' · ')}</span>
      ${d.desc && d.known >= 2 ? `<span class="note dg-desc">${esc(d.desc)}</span>` : ''}</li>`;
  };
  const K = s.seekers;
  const seek = [K.sent ? `떠난 원정대 ${K.sent}` : '', K.back ? `돌아온 ${K.back}` : '', K.lost ? `돌아오지 못한 ${K.lost}` : '', K.stole ? `보물을 들고 온 ${K.stole}` : ''].filter(Boolean);
  const sub = s.awake.length ? `${s.awake.join(', ')} 깨어 있음` : s.stirring.length ? `${s.stirring.join(', ')} 뒤척임` : '모두 잠잠하다';
  return `<section class="card dragon-card">
    <h2>잠든 용 <small>${esc(sub)}</small></h2>
    <ul class="ct-houses dg-list">${s.dragons.map(row).join('')}</ul>
    <p class="note">용 숭배자: ${esc(s.cult.word)}${s.cult.served ? ' · 내가 섬긴 적이 있다' : ''}${s.cult.foe ? ' · <b class="warn">나를 적으로 여긴다</b>' : ''}</p>
    ${seek.length ? `<p class="note">용을 찾아간 원정대: ${seek.join(' · ')}${s.stake ? ` · 내가 은화 ${s.stake.amount}닢을 보탠 원정대가 ${esc(s.stake.target)}에게 갔다` : ''}</p>` : s.stake ? `<p class="note">내가 은화 ${s.stake.amount}닢을 보탠 원정대가 ${esc(s.stake.target)}에게 갔다</p>` : ''}
    <p class="note">용골 계곡: ${esc(s.bones)}</p>
    ${s.log.length ? `<details class="pl-more"><summary>용에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderDragonBlock(game) {
  const s = safe(() => dragonInfo(game));
  const M = s?.me;
  if (!M) return '';
  const chips = [];
  if (M.climbs) chips.push(['용의 땅에 오름', `${M.climbs}번`]);
  if (M.talks) chips.push(['용과 나눈 말', `${M.talks}번`]);
  if (M.faced) chips.push(['용과 마주함', `${M.faced}번`]);
  if (M.fled) chips.push(['달아남', `${M.fled}번`, true]);
  if (M.stole) chips.push(['훔친 보물', `${M.stole}번`, true]);
  if (M.bones) chips.push(['가져온 용골', `${M.bones}개`]);
  if (M.rescued) chips.push(['구해 낸 사람', `${M.rescued}명`]);
  if (!chips.length && !M.slain.length && !M.scale && !M.clue) return '';
  const tags = [];
  if (M.slain.length) tags.push(`용을 벤 사람: ${M.slain.join(', ')}`);
  if (M.scale) tags.push('청동의 비늘을 지녔다');
  if (M.clue) tags.push('용의 실마리를 안다');
  return `<div class="block dragon-block">
    <h3>용</h3>
    ${tags.length ? `<div class="ct-tags">${tags.map((t) => `<span class="ct-tag gift">${esc(t)}</span>`).join('')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
  </div>`;
}
