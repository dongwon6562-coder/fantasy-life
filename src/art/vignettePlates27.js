// 50단계 삽화: 숲의 마녀와 민간 주술(witch), 자유도시 의회와 길드 정치(council), 현상금 사냥꾼(bounty). 26판과 같은 도구·같은 결로 그린다.
// 등급 선: 피와 주검 없음. 마녀사냥은 횃불과 쇠스랑을 든 사람들이 오두막으로 몰려가는 데까지, 현상금은 얼굴 그림과 쫓는 길까지.
import { VW, sky, far, townFar, ground, road, room, windowAt, glow, flame, candle, smoke, person, crowd, banner, tree, finish } from './vignetteKit.js';
import { torch, fork } from './vignettePlates5.js';
import { horseSil } from './vignettePlates4.js';
import { rowHouse, lamp, steps } from './vignettePlates23.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const arch = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2); ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.fill(); };
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
// 얼굴 그림이 그려진 방: 위쪽 얼굴 동그라미, 아래 글줄, 귀퉁이 붉은 인장
const poster = (ctx, x, y, w = 26, h = 34, k = 0) => {
  rect(ctx, x, y, w, h, ['#e2d8bc', '#d8cca8', '#e6dcc4'][k % 3]);
  oval(ctx, x + w / 2, y + h * 0.3, w * 0.2, h * 0.15, 'rgba(40,30,20,.6)'); rect(ctx, x + w * 0.3, y + h * 0.42, w * 0.4, h * 0.08, 'rgba(40,30,20,.45)');
  for (let j = 0; j < 3; j++) stroke(ctx, [x + 3, y + h * 0.62 + j * 3.4, x + w - 3, y + h * 0.62 + j * 3.4], 0.5, 'rgba(40,30,20,.5)');
  oval(ctx, x + w - 5, y + h - 5, 2.6, 2.6, '#8a2e26');
};
// 말린 약초 다발
const herbs = (ctx, x, y, n, c = '#5a6a3a') => { for (let i = 0; i < n; i++) { const hx = x + i * 14; stroke(ctx, [hx, y, hx, y + 6], 0.6, '#2a2018'); poly(ctx, [hx - 4, y + 6, hx + 4, y + 6, hx + 2, y + 22, hx - 2, y + 22], ['#5a6a3a', '#6a5a34', '#4a5a40'][i % 3]); } };
// 가마솥
const cauldron = (v, x, y, r) => { const { ctx } = v; oval(ctx, x, y, r, r * 0.8, '#1c1a18'); rect(ctx, x - r * 1.05, y - r * 0.7, r * 2.1, 5, '#2a2622'); oval(ctx, x, y - r * 0.68, r * 0.9, r * 0.16, '#4a6a3a'); stroke(ctx, [x - r * 0.7, y + r * 0.6, x - r * 0.9, y + r * 1.1], 2.4, '#1c1a18'); stroke(ctx, [x + r * 0.7, y + r * 0.6, x + r * 0.9, y + r * 1.1], 2.4, '#1c1a18'); };

// ───────── 숲의 마녀와 민간 주술 ─────────
/** 숲 가장자리 오두막: 이끼 낀 초가 지붕, 처마에 매단 약초 다발, 굴뚝 연기. 문간의 노파와 찾아온 나 */
function hutAt(v, x, y, s = 1) {
  const { ctx } = v;
  rect(ctx, x - 70 * s, y - 64 * s, 140 * s, 64 * s, '#5a4a36');
  for (let i = 0; i < 6; i++) stroke(ctx, [x - 70 * s, y - 60 * s + i * 11 * s, x + 70 * s, y - 60 * s + i * 11 * s], 1, 'rgba(30,22,14,.4)');
  poly(ctx, [x - 88 * s, y - 60 * s, x, y - 120 * s, x + 88 * s, y - 60 * s], '#4a4a2c');
  for (let i = 0; i < 9; i++) stroke(ctx, [x - 80 * s + i * 20 * s, y - 62 * s, x - 70 * s + i * 18 * s, y - 70 * s], 1.6, 'rgba(90,110,60,.5)');
  rect(ctx, x + 40 * s, y - 126 * s, 14 * s, 30 * s, '#3a322a');
  rect(ctx, x - 18 * s, y - 46 * s, 30 * s, 46 * s, '#2a1e14');
  windowAt(v, x - 56 * s, y - 46 * s, 20 * s, 18 * s, { lit: true });
  herbs(ctx, x - 64 * s, y - 60 * s, 5);
}
function wiHut(v) {
  const { ctx } = v; sky(v); far(v, {});
  ground(v, () => 186, { color: '#4e5a3a', color2: '#2e3624', tufts: 6 });
  for (const [x, h] of [[30, 150], [80, 120], [560, 160], [610, 130], [500, 110]]) tree(v, x, 190, h, { dark: x < 100 });
  hutAt(v, 330, 190, 1);
  smoke(v, 377, 60, 60, 20, '#5a5650', 0.3);
  stroke(ctx, [220, 196, 260, 210, 300, 206], 4, 'rgba(120,100,70,.4)'); // 오솔길
  person(v, 340, 192, 74, { cloth: '#4a3a3a', hair: '#9a9088', female: true, long: true, old: true, f: -1, arm: 'chest', hood: true });
  oval(ctx, 300, 198, 8, 5, '#3a2e22'); // 바구니
  person(v, 150, 236, 104, mine(v, { f: 1, arm: 'fwd' }));
  finish(v, {});
}
/** 오두막 안: 가마솥이 끓는 화덕, 들보마다 약초, 선반의 단지들. 솥을 젓는 주술사와 지켜보는 나 */
function wiBrew(v) {
  const { ctx } = v; room(v, { wall: '#4a3c2e', floor: '#2a2218', fy: 178 });
  for (const y of [18, 40]) { rect(ctx, 0, y, VW, 6, '#2e2418'); herbs(ctx, 30 + (y === 40 ? 7 : 0), y + 6, 22); }
  rect(ctx, 470, 90, 140, 6, '#3a2e22'); rect(ctx, 470, 130, 140, 6, '#3a2e22');
  for (let i = 0; i < 6; i++) { const c = ['#5a6a7a', '#6a5a3a', '#4a5a3a', '#7a4a3a'][i % 4]; oval(ctx, 486 + i * 22, 80, 7, 10, c); oval(ctx, 490 + i * 22, 120, 6, 9, c); }
  // 화덕과 솥
  arch(ctx, 230, 178, 120, 90, '#2a2420'); flame(v, 290, 172, 14); glow(v, 290, 150, 130, '#ff9a48', 0.35);
  cauldron(v, 290, 150, 26); smoke(v, 290, 90, 70, 22, '#6a7a5a', 0.24);
  person(v, 360, 226, 92, { raw: true, cloth: '#3e3a40', hair: '#7a7068', female: true, long: true, f: -1, arm: 'fwd', rim: 'rgba(255,170,90,.55)', rimDir: -1 });
  stroke(ctx, [340, 172, 306, 142], 2.2, '#3a2a1a');
  person(v, 140, 240, 102, mine(v, { raw: true, f: 1, arm: 'chest', rim: 'rgba(255,170,90,.45)', rimDir: 1 }));
  candle(v, 90, 170, 8);
  finish(v, { inside: true, noLeaves: true });
}
/** 마녀사냥: 해 질 녘 숲길로 횃불과 쇠스랑을 든 마을 사람들이 몰려간다. 멀리 불 켜진 오두막, 앞을 막아선 나 */
function wiHunt(v) {
  const { ctx } = v; sky(v); far(v, {});
  ground(v, () => 182, { color: '#4a4a34', color2: '#2a2a1e', tufts: 4 });
  for (const [x, h] of [[20, 160], [110, 130], [620, 150]]) tree(v, x, 186, h, { dark: true });
  hutAt(v, 480, 146, 0.42); smoke(v, 500, 70, 30, 12, '#5a5650', 0.26);
  road(v, 260, 520, 150, { w: 160 });
  for (let i = 0; i < 7; i++) {
    const x = 200 + i * 38, y = 214 - (i % 2) * 8, h = 70 - (i % 3) * 4;
    person(v, x, y, h, folk(i, { f: 1, arm: i % 2 ? 'up' : 'fwd' }));
    if (i % 2) torch(v, x + 12, y - h * 0.62, h * 0.5, 5); else fork(v, x + 10, y - h * 0.2, h * 0.75, 0.15);
  }
  glow(v, 330, 150, 160, '#ff9a48', 0.22);
  smoke(v, 330, 80, 90, 50, '#3a3430', 0.22);
  person(v, 500, 236, 100, mine(v, { f: -1, arm: 'out', rim: 'rgba(255,160,80,.55)', rimDir: -1 }));
  finish(v, {});
}
export const WITCH27 = { hut: wiHut, brew: wiBrew, hunt: wiHunt };

// ───────── 자유도시 의회와 길드 정치 ─────────
const GUILD_C = ['#7a2e26', '#2e4a6a', '#5a6a2a', '#6a4a8a', '#8a6a2a'];
/** 의사당: 반원으로 놓인 의원석, 높은 창과 길드 깃발들, 연단에 선 의원과 앞줄의 나 */
function cnHall(v) {
  const { ctx } = v; room(v, { wall: '#5e5446', floor: '#3a3228', fy: 168 });
  for (let i = 0; i < 4; i++) { arch(ctx, 60 + i * 150, 120, 60, 100, '#3e382e'); windowAt(v, 72 + i * 150, 34, 36, 70, { lit: false }); }
  for (let i = 0; i < 5; i++) banner(v, 70 + i * 125, 150, 110, GUILD_C[i], { d: 1, w: 26, len: 46, mark: '#d8c890' });
  // 의원석 세 줄
  for (let r = 0; r < 3; r++) {
    const y = 176 + r * 22; rect(ctx, 40 - r * 10, y, VW - 80 + r * 20, 8, ['#5a3e26', '#4e3620', '#42301c'][r]);
    for (let i = 0; i < 9 - r; i++) person(v, 70 + r * 6 + i * (64 + r * 6), y + 2, 44 + r * 8, folk(i + r * 3, { raw: true, pose: 'sit', f: i < 4 ? 1 : -1, noShadow: true }));
  }
  rect(ctx, 296, 124, 48, 44, '#6a4a2e'); rect(ctx, 290, 120, 60, 6, '#8a6a44');
  person(v, 320, 126, 66, { raw: true, cloth: '#2e3a5a', hair: '#8a7a6a', robe: true, arm: 'up', f: -1, noShadow: true });
  glow(v, 320, 90, 140, '#ffe0b0', 0.16);
  person(v, 110, 240, 100, mine(v, { raw: true, f: 1, arm: 'chest' }));
  finish(v, { inside: true, noLeaves: true });
}
/** 길드 회관: 긴 탁자에 장부를 펼친 장인들, 벽에 걸린 길드 표식(망치·저울·닻), 잔을 든 나 */
function cnGuild(v) {
  const { ctx } = v; room(v, { wall: '#54442e', floor: '#2e2418', fy: 174 });
  for (const x of [0, 210, 420, 626]) rect(ctx, x, 0, 14, 174, '#3a2c1e');
  // 걸린 표식 셋: 망치, 저울, 닻
  for (const [x, k] of [[110, 0], [320, 1], [530, 2]]) {
    oval(ctx, x, 60, 30, 30, '#6a4e30'); oval(ctx, x, 60, 25, 25, '#3a2c1e');
    if (k === 0) { stroke(ctx, [x - 12, 74, x + 8, 50], 3, '#c8b070'); rect(ctx, x + 2, 44, 14, 9, '#c8b070'); }
    if (k === 1) { stroke(ctx, [x, 44, x, 76], 2, '#c8b070'); stroke(ctx, [x - 16, 52, x + 16, 52], 2, '#c8b070'); oval(ctx, x - 14, 64, 7, 3, '#c8b070'); oval(ctx, x + 14, 64, 7, 3, '#c8b070'); }
    if (k === 2) { stroke(ctx, [x, 44, x, 74], 2.6, '#c8b070'); stroke(ctx, [x - 14, 66, x, 76, x + 14, 66], 2.4, '#c8b070'); stroke(ctx, [x - 8, 50, x + 8, 50], 2, '#c8b070'); }
  }
  // 긴 탁자
  rect(ctx, 120, 168, 420, 9, '#6a4a2c'); rect(ctx, 132, 177, 8, 40, '#3a2a1a'); rect(ctx, 520, 177, 8, 40, '#3a2a1a');
  for (let i = 0; i < 4; i++) { rect(ctx, 170 + i * 92, 160, 30, 8, '#d8ceb0'); stroke(ctx, [185 + i * 92, 160, 185 + i * 92, 168], 0.8, '#5a4a30'); }
  for (const x of [230, 420]) candle(v, x, 168, 9);
  glow(v, 330, 150, 170, '#ffc078', 0.28);
  for (let i = 0; i < 5; i++) person(v, 160 + i * 92, 166, 60, folk(i + 1, { raw: true, pose: 'sit', f: i < 2 ? 1 : -1, arm: i === 2 ? 'up' : 'chest', noShadow: true, rim: 'rgba(255,190,110,.4)', rimDir: i < 2 ? 1 : -1 }));
  person(v, 80, 240, 102, mine(v, { raw: true, f: 1, arm: 'fwd', rim: 'rgba(255,190,110,.4)', rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 표결: 시청 광장 앞 계단, 항아리에 콩을 넣으려고 늘어선 사람들과 표를 세는 서기들의 칠판 */
function cnVote(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 136, {});
  ground(v, () => 186, { color: '#7a6e5a', color2: '#4a4234', tufts: 0 });
  // 시청
  rect(ctx, 150, 52, 340, 120, '#8a7c66'); poly(ctx, [140, 54, 320, 14, 500, 54], '#5a4a3a');
  for (let i = 0; i < 5; i++) { arch(ctx, 178 + i * 62, 132, 34, 60, '#3e362c'); }
  rect(ctx, 304, 0, 32, 30, '#6a5c4a'); oval(ctx, 320, 34, 10, 10, '#e8dcc0'); stroke(ctx, [320, 34, 320, 27, 325, 34], 1.2, '#2a2018');
  steps(ctx, 320, 186, 360, 3, '#6a604e');
  for (let i = 0; i < 3; i++) banner(v, 190 + i * 130, 120, 70, GUILD_C[i + 1], { d: 1, w: 20, len: 30, mark: '#d8c890' });
  // 표 항아리 둘과 칠판
  for (const [x, c] of [[270, '#6a3a2a'], [370, '#3a4a5a']]) { oval(ctx, x, 186, 16, 20, c); rect(ctx, x - 9, 162, 18, 6, '#2a2018'); }
  rect(ctx, 440, 140, 60, 44, '#2a2a26'); for (let j = 0; j < 4; j++) stroke(ctx, [448, 150 + j * 8, 448 + 10 + j * 9, 150 + j * 8], 1.2, '#e0dccc');
  person(v, 470, 196, 62, { cloth: '#3a2e44', hair: '#5a4a3a', robe: true, f: -1, arm: 'fwd', noShadow: true });
  for (let i = 0; i < 6; i++) person(v, 120 + i * 30, 206 - (i % 2) * 4, 60, folk(i, { f: 1, arm: i === 5 ? 'fwd' : null }));
  crowd(v, 400, 620, 214, 6, 58, {});
  person(v, 560, 240, 100, mine(v, { f: -1, arm: 'chest' }));
  finish(v, {});
}
export const COUNCIL27 = { hall: cnHall, guild: cnGuild, vote: cnVote };

// ───────── 현상금 사냥꾼 ─────────
/** 조합 게시판: 지부 처마 밑 판자에 빼곡한 얼굴 그림들, 그 앞의 사냥꾼들. 방 하나를 떼어 드는 나 */
function bhBoard(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 136, {});
  ground(v, () => 186, { color: '#6a5e48', color2: '#40382c', tufts: 1 });
  rowHouse(v, 0, 160, 90, 186, '#4e443a', { roof: '#2e2620' }); rowHouse(v, 500, 140, 80, 186, '#54483c', { roof: '#3a2e24' });
  // 조합 건물과 판자
  rect(ctx, 170, 64, 300, 122, '#5a4a38'); poly(ctx, [156, 66, 320, 30, 484, 66], '#3a2e24');
  arch(ctx, 410, 186, 40, 70, '#2a2018'); lamp(v, 400, 110, 0.26);
  rect(ctx, 196, 90, 190, 86, '#7a5e3e'); rect(ctx, 192, 86, 198, 6, '#4a3624');
  for (let i = 0; i < 12; i++) poster(ctx, 204 + (i % 6) * 30, 98 + Math.floor(i / 6) * 38, 24, 32, i);
  stroke(ctx, [230, 36, 230, 66], 1.6, '#2a2018'); rect(ctx, 210, 22, 40, 14, '#6a4a2a'); // 걸린 간판
  for (let i = 0; i < 3; i++) stroke(ctx, [214 + i * 12, 30, 222 + i * 12, 26], 1.2, '#c8b070');
  person(v, 250, 212, 72, folk(2, { f: 1, arm: 'chest', hat: true }));
  person(v, 330, 210, 70, folk(4, { f: -1, arm: 'chest' }));
  person(v, 130, 240, 104, mine(v, { f: 1, arm: 'fwd' }));
  poster(ctx, 152, 154, 18, 24, 1);
  finish(v, {});
}
/** 흔적 쫓기: 갈림길 이정표, 진흙에 찍힌 발자국, 말을 끌고 내려다보는 나. 멀리 고개를 넘는 작은 그림자 */
function bhTrail(v) {
  const { ctx } = v; sky(v); far(v, {});
  ground(v, () => 176, { color: '#5e5a40', color2: '#363424', tufts: 5 });
  road(v, 250, 470, 128, { w: 180 }); road(v, 250, 140, 140, { w: 110 });
  for (const [x, h] of [[40, 130], [90, 100], [590, 140], [620, 110]]) tree(v, x, 180, h, {});
  // 이정표
  rect(ctx, 300, 120, 5, 76, '#3a2c1e'); poly(ctx, [304, 128, 352, 124, 360, 132, 352, 140, 304, 138], '#6a4e30'); poly(ctx, [300, 146, 256, 142, 248, 150, 256, 158, 300, 156], '#6a4e30');
  // 발자국
  for (let i = 0; i < 7; i++) { const x = 330 + i * 18 - i * i * 0.6, y = 224 - i * 12; oval(ctx, x, y, 4.4 - i * 0.4, 2.4 - i * 0.2, 'rgba(30,24,16,.55)', -0.3); oval(ctx, x + 8, y - 5, 4.2 - i * 0.4, 2.2 - i * 0.2, 'rgba(30,24,16,.55)', -0.3); }
  person(v, 462, 130, 16, folk(5, { f: 1, noShadow: true, hood: true })); // 고개 위 작은 그림자
  horseSil(v, 160, 226, 74, 1, '#4a3424');
  person(v, 270, 238, 100, mine(v, { f: 1, arm: 'chest', hood: true }));
  finish(v, {});
}
export const BOUNTY27 = { board: bhBoard, trail: bhTrail };

export const PLATES27 = {
  /** 숲의 마녀와 민간 주술. variant: hut·brew·hunt */
  witch(v) { return (WITCH27[v.variant] ?? wiHut)(v); },
  /** 자유도시 의회와 길드 정치. variant: hall·guild·vote */
  council(v) { return (COUNCIL27[v.variant] ?? cnHall)(v); },
  /** 현상금 사냥꾼. variant: board·trail */
  bounty(v) { return (BOUNTY27[v.variant] ?? bhBoard)(v); },
};

// 장면 → 판. 마녀(wi_·witch_)와 의회(cn_·council_) 장면 id는 도우미3·2 PR이 들어오면 표에 채운다. 그 전에는 낱말로 고른다.
export const BH_ART = { bh_board: 'bounty:board', bh_corner: 'bounty:trail', bh_rival: 'tavern:hall', bh_kin: 'stepfamily:door' };
export const WI_ART = { wi_hut: 'witch:hut', wi_gran: 'witch:hut', wi_learn: 'witch:hut', wi_lesson: 'witch:brew', wi_client: 'witch:brew', wi_hunt: 'witch:hunt', wi_scorn: 'witch:hut' }; // 50단계 도우미3 장면 id
export const CN_ART = { cn_invite: 'council:guild', cn_guildvote: 'council:guild', cn_election: 'council:vote', cn_vote: 'council:hall', cn_headvote: 'council:hall', cn_scandal: 'council:vote', cn_match: 'society:salon', cn_caught: 'watch:gate' }; // 50단계 도우미2 장면 id
const WI_WORDS = [[/마녀사냥|횃불|몰려|고발|화형|hunt/, 'witch:hunt'], [/솥|묘약|달여|부적|주문|약초|brew|charm|potion/, 'witch:brew']];
const CN_WORDS = [[/표결|투표|표를|선거|뽑|vote|elect/, 'council:vote'], [/길드|조합|장인|회관|guild/, 'council:guild']];
const byWords = (table, ...texts) => { for (const t of texts) for (const [re, art] of table) if (re.test(t)) return art; return null; };
export function plate50(key, words = '') {
  const k = String(key ?? '');
  if (/^(bh|bounty)_/.test(k)) return BH_ART[k] ?? 'bounty:board';
  if (/^(wi|witch)_/.test(k)) return WI_ART[k] ?? byWords(WI_WORDS, k, words) ?? 'witch:hut';
  if (/^(cn|council)_/.test(k)) return CN_ART[k] ?? byWords(CN_WORDS, k, words) ?? 'council:hall';
  return null;
}
export { poster, cauldron, hutAt };
