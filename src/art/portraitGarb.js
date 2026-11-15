// 초상의 옷과 쓰개. 직업마다 옷차림이 다르고, 같은 직업 안에서도 빛깔과 꾸밈이 사람마다 조금씩 다르다.
import { INK, f, shade, tint, mixHex, spline } from './portraitKit.js';

const pick = (arr, r) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];
const EARTH = ['#6e6040', '#5f6843', '#7b5e3c', '#5d5546', '#6a5a4c', '#4f5a52'];
const RICH = ['#6e2f2a', '#2f5248', '#3d3a66', '#5a4a26', '#4a2f4f', '#274a5c'];
const GOLD = '#c9a25a', SILVER = '#b9bcc0', LINEN = '#d9cfba', STEEL = '#8a8f96';

/**
 * 직업·나이·성별에서 옷차림을 정한다.
 * r1~r3: 그 사람에게 고정된 난수 (빛깔, 꾸밈, 쓰개)
 */
export function outfitOf(job, sex, stage, r1, r2, r3) {
  const fem = sex === 'f';
  if (stage === 'baby') return { kind: 'swaddle', main: '#cdbf9f', trim: '#a8987a' };
  if (stage === 'child' || job === 'child') return { kind: 'tunic', main: pick(['#6b5b3e', '#5a6248', '#73563f', '#4f5a62', '#7a6a4a'], r1), under: r2 < 0.5 ? LINEN : null, neck: 'round', patch: r2 > 0.7 };
  switch (job) {
    case 'farmer': return { kind: fem ? 'dress' : 'tunic', main: pick(EARTH, r1), under: LINEN, neck: fem ? 'square' : 'v', lace: true, head: fem && r3 < 0.45 ? 'scarf' : !fem && r3 < 0.18 ? 'strawhat' : null, headCol: pick(['#a58f62', '#8a6a52', '#6f7a5c'], r2), patch: r2 > 0.6 };
    case 'laborer': return { kind: 'tunic', main: pick(['#6a5640', '#5a5348', '#57493a'], r1), under: r2 < 0.6 ? '#b9ad94' : null, neck: 'v', jerkin: '#4a3a2a', patch: true };
    case 'miller': return { kind: 'tunic', main: '#b8ab8e', under: LINEN, neck: 'round', dust: true, apron: r2 < 0.5 ? '#cfc4ab' : null };
    case 'apprentice': return { kind: 'tunic', main: pick(['#655a48', '#56604c', '#5d5360'], r1), under: LINEN, neck: 'v', lace: true, apron: r2 < 0.4 ? '#6a5138' : null };
    case 'old_knight': return { kind: 'mail', main: STEEL, cloth: pick(['#34405a', '#4a3030', '#3a4a3a'], r1), trim: '#a8935e', gorget: r2 < 0.5, worn: true, emblem: 'sun' };
    case 'guard': return { kind: 'mail', main: STEEL, cloth: '#2f4a73', trim: GOLD, gambeson: true, emblem: 'tower', head: r3 < 0.3 ? 'mailcoif' : r3 < 0.5 ? 'kettle' : null };
    case 'knight': return { kind: 'plate', main: '#9aa0a8', cloth: pick(['#7a2a2a', '#2f4a73', '#3a4a3a'], r1), trim: GOLD, emblem: pick(['sun', 'tower', 'chevron'], r2), cloak: r2 < 0.5 ? shade(pick(RICH, r1), 0.2) : null };
    case 'knight_captain': return { kind: 'plate', main: '#a7adb5', cloth: '#6a2326', trim: GOLD, emblem: 'sun', cloak: '#3a1f24', fur: '#5a4a3a', ornate: true };
    case 'sword_master': return { kind: 'wrap', main: pick(['#2f3038', '#3a2f2a', '#2c3a36'], r1), under: LINEN, trim: '#8a7a5a', strap: '#3a2a1c', sash: pick(['#6a2a26', '#5a5030', '#2a3f5a'], r2) };
    case 'adventurer': return { kind: 'leather', main: pick(['#5b4330', '#4c4234', '#5a3a2e'], r1), under: pick(['#7a7460', '#5c6a5a', '#6a5a66'], r2), strap: '#2f241a', cloak: r2 < 0.55 ? pick(['#3f4a3a', '#4a3a36', '#35405a'], r3) : null, pauldron: r3 > 0.6 };
    case 'hunter': return { kind: 'leather', main: pick(['#4f5236', '#5a4a30'], r1), under: '#6f6a50', strap: '#2c2a1c', quiver: true, head: r3 < 0.35 ? 'hood' : null, hoodDown: r3 >= 0.35, headCol: '#3f4a34', furCollar: r2 < 0.4 ? '#6a5a44' : null };
    case 'merchant': case 'shopkeeper': case 'shop': return { kind: 'doublet', main: pick(RICH, r1), trim: GOLD, under: LINEN, ruff: r2 < 0.5, chain: r2 > 0.7 ? GOLD : null, head: r3 < 0.3 ? 'beret' : null, headCol: shade(pick(RICH, r1), 0.25) };
    case 'trade_master': return { kind: 'doublet', main: pick(['#5a2a2a', '#2a4a44', '#3d355c'], r1), trim: GOLD, under: LINEN, fur: '#6a5540', chain: GOLD, ornate: true, head: r3 < 0.5 ? 'beret' : null, headCol: '#2a2028' };
    case 'guildmaster': return { kind: 'doublet', main: pick(['#3a3a44', '#4a3028', '#2f4038'], r1), trim: SILVER, under: LINEN, fur: '#4a4038', chain: SILVER, strap: r2 < 0.4 ? '#2f241a' : null };
    case 'guild_clerk': return { kind: 'doublet', main: pick(['#4a4a3a', '#3f4650', '#51443c'], r1), trim: '#8a7a5a', under: LINEN, tabs: true, pin: true };
    case 'count': return { kind: 'noble', main: pick(['#4a1f2a', '#1f3350', '#2a3f34'], r1), trim: GOLD, under: '#e6dcc8', fur: '#e8e0d0', ermine: true, chain: GOLD, jewel: pick(['#8a2a2a', '#2a5a8a', '#2a7a5a'], r2), head: 'circlet' };
    case 'priest': return { kind: 'robe', main: '#e3dccb', trim: GOLD, stole: pick(['#7a2f2a', '#5a4a26', '#3f4a66'], r1), emblem: 'sunpendant', head: r3 < 0.25 ? 'skullcap' : null, headCol: '#e3dccb' };
    case 'bishop': return { kind: 'robe', main: '#efe8d8', trim: GOLD, stole: '#5a2a5a', cope: '#6a2a3a', emblem: 'sunpendant', ornate: true, head: 'skullcap', headCol: '#6a2a3a' };
    case 'hedge_mage': return { kind: 'cloak', main: pick(['#2c3550', '#3a2f44', '#2f3f3c'], r1), trim: '#7fb3d5', under: '#5a5648', clasp: '#7fb3d5', head: r3 < 0.4 ? 'hood' : null, hoodDown: r3 >= 0.4, headCol: pick(['#2c3550', '#3a2f44', '#2f3f3c'], r1), charm: true };
    case 'court_mage': return { kind: 'magerobe', main: pick(['#27304f', '#3d2748', '#1f3a40'], r1), trim: GOLD, under: '#d9d0c0', clasp: pick(['#6fc2d0', '#b07fd8', '#d0b46f'], r2), embroid: true };
    case 'scholar': return { kind: 'gown', main: pick(['#2e2a2a', '#2f3440', '#3a302a'], r1), trim: '#7a6a4a', under: LINEN, tabs: true, head: r3 < 0.5 ? 'scholarcap' : null, headCol: '#2a2424' };
    case 'smith': return { kind: 'apron', main: pick(['#5c4a3a', '#4f4a44'], r1), under: null, apron: '#4a3526', apronStrap: true, soot: true, rolled: true };
    case 'carpenter': return { kind: 'apron', main: '#6b5a3c', under: LINEN, apron: '#7a5a38', apronStrap: true };
    case 'baker': case 'cook': return { kind: 'apron', main: '#8a7a62', under: LINEN, apron: '#ddd3bf', apronStrap: false, head: r3 < 0.6 ? 'coif' : null, headCol: '#ddd3bf' };
    case 'innkeeper': return { kind: 'apron', main: pick(['#5a4636', '#4a4a3a', '#5c3a34'], r1), under: LINEN, apron: '#c9bea6', vest: true };
    case 'herbalist': return { kind: fem ? 'dress' : 'tunic', main: pick(['#4f5e42', '#55604e'], r1), under: LINEN, neck: fem ? 'square' : 'v', shawl: '#6f7a4c', pouch: true, head: fem && r3 < 0.4 ? 'scarf' : null, headCol: '#6f7a4c' };
    // 새 일: 의원·음유시인·선생·연금술사·석공
    case 'physician': return { kind: 'coat', main: pick(['#2e3a34', '#3a2e2a', '#2c3038'], r1), trim: '#5a5a48', under: LINEN, pouch: true, strap: r2 < 0.5 ? '#3a2a1c' : null, head: r3 < 0.45 ? (fem ? 'coif' : 'skullcap') : null, headCol: fem ? '#d8d0bc' : '#2a2a28' };
    case 'bard': return { kind: 'doublet', main: pick(['#7a2f34', '#2f5a5e', '#8a6a2a', '#4a3a6a'], r1), trim: pick(['#c9a25a', '#d8cfb8'], r2), under: LINEN, lace: true, scarfNeck: r2 < 0.45 ? pick(['#c9a25a', '#3a5a4a', '#7a2f2a'], r3) : null, earring: r2 > 0.6, head: r3 < 0.55 ? 'beret' : null, headCol: pick(['#3a2a3a', '#5a2a2a', '#2f4a4a'], r2) };
    case 'tutor': return { kind: 'gown', main: pick(['#4a4238', '#3e4448', '#4a3e44'], r1), trim: '#6a6252', under: LINEN, shawl: fem && r2 < 0.5 ? '#7a7260' : null, head: fem && r3 < 0.35 ? 'coif' : null, headCol: '#d8d0bc' };
    case 'alchemist': return { kind: 'apron', main: pick(['#34343e', '#3a3430', '#2e3a3a'], r1), under: r2 < 0.5 ? LINEN : null, apron: '#4a3a2a', apronStrap: true, soot: true, rolled: r2 > 0.4, head: r3 < 0.5 ? 'skullcap' : null, headCol: '#2a2622' };
    case 'mason': return { kind: 'apron', main: pick(['#6a665e', '#5e5a50', '#6e6252'], r1), under: null, apron: '#5a4a38', apronStrap: true, dust: true, rolled: true, head: r3 < 0.35 ? 'coif' : r3 < 0.5 ? 'hood' : null, headCol: '#8a8474' };
    case 'weaver': return { kind: 'dress', main: pick(['#6d4b52', '#5a4a66', '#4f5a62'], r1), under: LINEN, neck: 'square', shawl: '#9a8a6a', embroidHem: true, head: r3 < 0.35 ? 'scarf' : null, headCol: '#9a8a6a' };
    case 'elder': return { kind: 'robe', main: '#3e3428', trim: '#8a7a5a', fur: '#8a7a62', chain: r2 < 0.5 ? '#8a7a5a' : null };
    case 'gang_boss': return { kind: 'coat', main: pick(['#22201f', '#2a1f22', '#1f262a'], r1), trim: '#6a5a3a', under: '#3a3230', scarfNeck: pick(['#5a1f1f', '#3a3a3a', '#4a3a1f'], r2), earring: true };
    // 바다와 강
    case 'fisher': return { kind: 'tunic', main: pick(['#4f5a5e', '#5a5648', '#465660'], r1), under: r2 < 0.6 ? LINEN : null, neck: 'round', jerkin: r2 > 0.5 ? '#3a3a34' : null, head: r3 < 0.3 ? 'strawhat' : fem && r3 < 0.6 ? 'scarf' : null, headCol: '#6a705c', patch: r2 > 0.6 };
    case 'sailor': return { kind: 'tunic', main: pick(['#3f4c5c', '#4a4a44', '#5a4a3a'], r1), under: '#cfc6b2', neck: 'v', lace: true, strap: r2 < 0.4 ? '#2f241a' : null, head: r3 < 0.3 ? 'scarf' : null, headCol: pick(['#7a2f2a', '#3a4a5a', '#5a5030'], r2), earring: r2 > 0.7 };
    case 'sea_captain': return { kind: 'coat', main: pick(['#1f2c44', '#2a2a30', '#3a2428'], r1), trim: GOLD, under: LINEN, scarfNeck: pick(['#d9cfba', '#6a2a26'], r2), head: r3 < 0.35 ? 'beret' : null, headCol: '#1a1f2c' };
    case 'pirate': return { kind: 'leather', main: pick(['#4a3528', '#3a3230'], r1), under: pick(['#8a8068', '#6a3a34', '#4a5a5e'], r2), strap: '#241a12', head: r3 < 0.6 ? 'scarf' : null, headCol: pick(['#6a2622', '#2a2a30', '#5a4a26'], r2), earring: true };
    case 'pirate_lord': return { kind: 'coat', main: pick(['#4a1c1e', '#1f1f26', '#2a2f1f'], r1), trim: GOLD, under: '#cfc6b2', scarfNeck: '#1a1616', fur: r2 < 0.4 ? '#3a3028' : null, chain: GOLD, earring: true, head: r3 < 0.5 ? 'scarf' : null, headCol: '#1f1a1a' };
    // 뒷골목
    case 'rat_boss': return { kind: 'coat', main: pick(['#2c2a24', '#33282a', '#262c2a'], r1), trim: '#5a5040', under: '#4a4238', scarfNeck: pick(['#4a3a2a', '#3a3a3a'], r2), earring: r2 > 0.5, patch: true };
    case 'gang_member': return { kind: 'leather', main: pick(['#3a302a', '#2f2c2c', '#40342a'], r1), under: pick(['#4a4640', '#5a4a44'], r2), strap: '#1f1814', hoodDown: r3 < 0.5, headCol: '#2a2826' };
    case 'fence': return { kind: 'doublet', main: pick(['#3f3a34', '#3a3440', '#44382c'], r1), trim: '#7a6a4a', under: '#bdb29a', pin: r2 < 0.4 };
    case 'prisoner': return { kind: 'tunic', main: '#6a6253', under: null, neck: 'round', patch: true, torn: true };
    case 'beggar': return { kind: 'tunic', main: pick(['#54493c', '#4c4a42', '#5a4c40'], r1), under: null, neck: 'v', patch: true, torn: true, shawl: r2 < 0.5 ? '#3f3a32' : null };
    // 싸우는 사람들
    case 'mercenary': return { kind: 'leather', main: pick(['#4a3a2c', '#3f3a36', '#4c4030'], r1), under: STEEL, strap: '#2a2018', pauldron: r3 > 0.3, furCollar: r2 < 0.3 ? '#5a4c3c' : null, cloak: r2 > 0.7 ? '#3a3430' : null };
    case 'soldier': return { kind: 'mail', main: STEEL, cloth: pick(['#5a2a2a', '#3a4a3a', '#34405a', '#4a4030'], r1), trim: '#a8935e', gambeson: true, emblem: pick(['chevron', 'tower'], r2), head: r3 < 0.35 ? 'kettle' : r3 < 0.5 ? 'mailcoif' : null };
    case 'heavy': return { kind: 'plate', main: '#8f959c', cloth: pick(['#3a3a40', '#4a3a30', '#2f3a44'], r1), trim: '#8a8478', emblem: null, cloak: r2 < 0.5 ? '#2f2c2a' : null };
    case 'delver': return { kind: 'leather', main: pick(['#4a4038', '#3c3a34'], r1), under: '#5a564c', strap: '#241c14', head: r3 < 0.4 ? 'hood' : null, hoodDown: r3 >= 0.4, headCol: '#3a362e', pauldron: r2 > 0.6 };
    case 'trapper': return { kind: 'leather', main: pick(['#5a4a30', '#4f4634'], r1), under: '#6a6450', strap: '#2c241a', furCollar: pick(['#7a6a52', '#5a4c3e', '#8a8478'], r2) };
    // 신전과 관청
    case 'inquisitor': return { kind: 'robe', main: '#231f22', trim: '#8a2a2a', stole: '#6a1f1f', emblem: 'sunpendant', head: r3 < 0.4 ? 'hood' : null, headCol: '#1c181b' };
    case 'acolyte': return { kind: 'robe', main: '#cfc6b0', trim: '#a8987a', head: fem && r3 < 0.5 ? 'coif' : null, headCol: '#d9cfba' };
    case 'sea_priest': return { kind: 'robe', main: '#2f4a5a', trim: SILVER, stole: '#c9d2d4', chain: SILVER };
    case 'keeper': return { kind: 'robe', main: pick(['#5a3226', '#4a4030', '#3f3a34'], r1), trim: '#a8935e', stole: pick(['#8a4a26', '#5a5a3a'], r2) };
    case 'official': return { kind: 'doublet', main: pick(['#3a3f4a', '#44403a', '#3a4440'], r1), trim: '#a8935e', under: LINEN, tabs: true, chain: r2 < 0.4 ? '#a8935e' : null, head: r3 < 0.25 ? 'beret' : null, headCol: '#2a2a30' };
    case 'courtier': return { kind: 'doublet', main: pick(RICH, r1), trim: GOLD, under: LINEN, ruff: true, chain: r2 < 0.6 ? GOLD : null, ornate: true, head: r3 < 0.3 ? 'beret' : null, headCol: shade(pick(RICH, r1), 0.3) };
    case 'minister': return { kind: 'noble', main: pick(['#2a2430', '#3a1f24', '#1f2f3a'], r1), trim: GOLD, under: '#e6dcc8', fur: '#4a3c30', chain: GOLD, jewel: pick(['#8a2a2a', '#2a5a8a'], r2) };
    case 'lord': return { kind: 'noble', main: pick(['#4a1f2a', '#1f3350', '#2a3f34', '#3a3020'], r1), trim: GOLD, under: '#e6dcc8', fur: pick(['#5a4a3a', '#8a7a62', '#3a3028'], r2), chain: GOLD, jewel: pick(['#8a2a2a', '#2a5a8a', '#2a7a5a'], r2) };
    case 'royal': return { kind: 'noble', main: pick(['#5a1a26', '#2a1f4a', '#1f3350'], r1), trim: GOLD, under: '#efe6d2', fur: '#e8e0d0', ermine: true, chain: GOLD, jewel: pick(['#8a2a2a', '#2a5a8a', '#6a2a7a'], r2), head: 'circlet', ornate: true };
    // 만드는 사람들
    case 'artificer': return { kind: 'apron', main: pick(['#3f4650', '#4a4438'], r1), under: LINEN, apron: '#5a4a38', apronStrap: true, rolled: true };
    case 'gardener': return { kind: 'tunic', main: pick(['#4f6044', '#5a6a4a'], r1), under: LINEN, neck: 'v', lace: true, apron: r2 < 0.5 ? '#6a5a40' : null };
    case 'undertaker': return { kind: 'gown', main: '#262224', trim: '#5a544c', under: '#bdb5a4', head: r3 < 0.3 ? 'scholarcap' : null, headCol: '#1f1c1e' };
    case 'warden': return { kind: 'mail', main: '#7a7f86', cloth: '#3a3632', trim: '#7a7468', gambeson: true, emblem: null, worn: true };
    case 'idle': return { kind: fem ? 'dress' : 'tunic', main: pick(['#5c5140', '#4c5a52', '#6a4e3c', '#4e4a5e', '#5a4a4a'], r1), under: r2 < 0.7 ? LINEN : null, neck: fem ? (r2 < 0.5 ? 'square' : 'round') : 'v', lace: r2 > 0.5 };
    default: {
      return { kind: fem ? 'dress' : 'tunic', main: pick(['#5c5140', '#4c5a52', '#6a4e3c', '#4e4a5e', '#5a4a4a'], r1), under: r2 < 0.7 ? LINEN : null, neck: fem ? (r2 < 0.5 ? 'square' : 'round') : 'v', lace: r2 > 0.5 };
    }
  }
}

const CLOTH_KINDS = new Set(['tunic', 'dress', 'wrap', 'apron']);
const FINE_KINDS = new Set(['doublet', 'coat', 'robe', 'gown', 'cloak', 'magerobe']);
const HUMBLE = new Set(['idle', 'farmer', 'laborer', 'apprentice', 'fisher', 'sailor', 'herbalist', 'weaver', 'miller', 'gardener', undefined, null]);
/**
 * 살림 형편을 옷에 입힌다. tier: 0 빈털터리 ~ 4 부자. job: 옷차림 이름 (없으면 평범한 옷으로 본다)
 * 가난하면 빛이 바래고 기운 자리가 생기고, 넉넉하면 평범한 일을 하는 사람도 좋은 옷을 입는다.
 */
export function wearTier(o, tier, job, sex, r1, r2) {
  if (!o || o.kind === 'swaddle') return o;
  const out = { ...o };
  if (tier <= 1) {
    const k = tier === 0 ? 0.55 : 0.22;
    out.main = shade(mixHex(o.main, '#5a5348', k), tier === 0 ? 0.12 : 0);
    if (o.trim && tier === 0) out.trim = mixHex(o.trim, '#6a6050', 0.6);
    if (o.under && CLOTH_KINDS.has(o.kind)) out.under = mixHex(o.under, '#8a8068', k);
    if (CLOTH_KINDS.has(o.kind) || o.kind === 'leather' || tier === 0) out.patch = true;
    if (tier === 0) { out.torn = true; out.chain = null; out.ruff = false; out.ornate = false; if (o.fur && o.kind !== 'noble') out.fur = null; }
  } else if (tier >= 3 && HUMBLE.has(job) && o.kind !== 'leather' && o.kind !== 'mail' && o.kind !== 'plate') {
    // 돈이 있는 사람: 일은 평범해도 옷감이 다르다
    const rich = pick(RICH, r1);
    if (tier >= 4) return { kind: 'doublet', main: rich, trim: GOLD, under: LINEN, fur: r2 < 0.5 ? '#5a4a3a' : null, chain: r2 > 0.3 ? GOLD : null, ruff: r2 < 0.3, head: o.head === 'scarf' || o.head === 'strawhat' ? null : o.head, headCol: o.headCol };
    out.main = mixHex(o.main, rich, 0.55); out.patch = false; out.under = o.under ?? LINEN; out.embroidHem = sex === 'f';
    if (o.kind === 'tunic') { out.jerkin = shade(rich, 0.35); out.lace = true; }
    if (out.head === 'strawhat') out.head = null;
  } else if (tier >= 4 && FINE_KINDS.has(o.kind) && !o.chain && o.kind !== 'cloak') out.chain = o.trim ?? GOLD;
  return out;
}

/* ---------- 그리기 ---------- */
// c: { cx, chin, hw, male, kid, stage, uid, detail, nw, baseY, sw, sy }
export function drawGarb(o, c) {
  const { cx, nw, baseY, sw, sy, detail } = c;
  const ink = (w = 0.55, op = 1) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${op < 1 ? ` stroke-opacity="${op}"` : ''}`;
  const out = { behind: '', torso: '', collar: '', head: '', headBack: '' };
  const dark = shade(o.main, 0.35), light = tint(o.main, 0.14);
  // 어깨 윤곽 (오른쪽 점들, 목 밑 → 어깨 끝 → 아래)
  const sh = (s, grow = 0) => [
    [cx + s * (nw + 0.5), baseY - 1.2 - grow * 0.4],
    [cx + s * (nw + (sw - nw) * 0.45), sy - 2.2 - grow],
    [cx + s * (sw - 3 + grow), sy + 1.2 - grow],
    [cx + s * (sw + 1.2 + grow), sy + 9],
    [cx + s * (sw + 2.5 + grow), 104],
  ];
  const torsoPath = (grow = 0) => {
    const R = sh(1, grow), L = sh(-1, grow).reverse();
    return `${spline(L)} L${f(R[0][0])} ${f(R[0][1])} ${spline(R, false, false)}Z`;
  };
  const fill = (d, col, extra = '') => `<path d="${d}" fill="${col}" ${ink()} ${extra}/>`;
  const shadeR = `<path d="M${f(cx + sw * 0.18)} ${f(sy - 3)} Q${f(cx + sw * 0.8)} ${f(sy)} ${f(cx + sw + 3)} 104 L${f(cx + sw * 0.3)} 104Z" fill="#0b0705" opacity="0.2"/>`;
  const lightL = `<path d="M${f(cx - sw + 2)} ${f(sy + 3)} Q${f(cx - sw * 0.6)} ${f(sy - 1.5)} ${f(cx - nw - 2)} ${f(baseY)}" fill="none" stroke="${tint(o.main, 0.35)}" stroke-width="1.1" stroke-linecap="round" opacity="0.35"/>`;
  const folds = (col = dark, n = 3) => {
    if (!detail) return '';
    let d = '';
    for (let i = 0; i < n; i++) { const x = cx - sw * 0.62 + i * (sw * 1.24 / (n - 1 || 1)); d += `M${f(x)} ${f(sy + 6 + Math.abs(x - cx) * 0.1)} q${f((x - cx) * 0.06)} 8 ${f((cx - x) * 0.05)} 20 `; }
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="0.5" opacity="0.55"/>`;
  };
  // 목둘레: 속옷이 보이는 자리
  const neckline = (kind, depth = 1) => {
    const y0 = baseY - 1.6;
    if (kind === 'v') return `M${f(cx - nw - 1.2)} ${f(y0)} L${cx} ${f(baseY + 9 * depth)} L${f(cx + nw + 1.2)} ${f(y0)}`;
    if (kind === 'square') return `M${f(cx - nw - 2.4)} ${f(y0)} L${f(cx - nw - 1.6)} ${f(baseY + 6.5 * depth)} L${f(cx + nw + 1.6)} ${f(baseY + 6.5 * depth)} L${f(cx + nw + 2.4)} ${f(y0)}`;
    return `M${f(cx - nw - 1.4)} ${f(y0)} Q${cx} ${f(baseY + 7.5 * depth)} ${f(cx + nw + 1.4)} ${f(y0)}`;
  };
  const under = (kind, col, depth = 1) => (col ? `<path d="${neckline(kind, depth)}Z" fill="${col}" ${ink(0.45)}/>${detail ? `<path d="${neckline(kind, depth * 0.55)}" fill="none" stroke="${shade(col, 0.25)}" stroke-width="0.4" opacity="0.7"/>` : ''}` : `<path d="${neckline(kind, depth)}" fill="none" ${ink(0.5)}/>`);
  const lacing = (y0, n = 3) => { let d = ''; for (let i = 0; i < n; i++) d += `M${f(cx - 1.5)} ${f(y0 + i * 2.2)} l3 1.5 m0 -1.5 l-3 1.5 `; return `<path d="${d}" fill="none" stroke="${shade(o.main, 0.55)}" stroke-width="0.4"/>`; };
  const chainOf = (col, drop = 15, pend = null) => `<path d="M${f(cx - nw - 4)} ${f(baseY + 0.5)} Q${cx} ${f(baseY + drop * 1.5)} ${f(cx + nw + 4)} ${f(baseY + 0.5)}" fill="none" stroke="${shade(col, 0.45)}" stroke-width="1.5"/><path d="M${f(cx - nw - 4)} ${f(baseY + 0.5)} Q${cx} ${f(baseY + drop * 1.5)} ${f(cx + nw + 4)} ${f(baseY + 0.5)}" fill="none" stroke="${col}" stroke-width="0.9" stroke-dasharray="1.3 0.7"/>${pend ? `<circle cx="${cx}" cy="${f(baseY + drop * 0.76)}" r="2" fill="${pend}" ${ink(0.4)}/><circle cx="${f(cx - 0.6)}" cy="${f(baseY + drop * 0.76 - 0.6)}" r="0.5" fill="#fff" opacity="0.5"/>` : ''}`;
  const furBand = (col, w = 6) => {
    const top = [[cx - sw + 1, sy + 3], [cx - nw - 5, baseY + 1.5], [cx, baseY + 7.5], [cx + nw + 5, baseY + 1.5], [cx + sw - 1, sy + 3]];
    const bot = [[cx + sw - 3, sy + 3 + w], [cx + nw + 3, baseY + 3 + w], [cx, baseY + 9 + w], [cx - nw - 3, baseY + 3 + w], [cx - sw + 3, sy + 3 + w]];
    let tufts = '';
    if (detail) for (let i = 0; i < 14; i++) { const t = i / 13; const x = cx - sw + 4 + t * (sw * 2 - 8); const y = baseY + 6 + w * 0.5 - Math.abs(t - 0.5) * (baseY + 3 - sy) * 1.4 + (i % 2); tufts += `M${f(x)} ${f(y - 1.4)} l${i % 2 ? 0.6 : -0.6} 2.6 `; }
    return `<path d="${spline(top)} L${f(bot[0][0])} ${f(bot[0][1])} ${spline(bot, false, false)}Z" fill="${col}" ${ink(0.5)}/><path d="${tufts}" stroke="${shade(col, 0.4)}" stroke-width="0.45" opacity="0.7" fill="none"/>${o.ermine && detail ? [0.2, 0.36, 0.64, 0.8].map((t) => `<path d="M${f(cx - sw + 4 + t * (sw * 2 - 8))} ${f(baseY + 5 + w * 0.5 - Math.abs(t - 0.5) * (baseY + 3 - sy) * 1.4)} l0 1.8" stroke="#1c1512" stroke-width="0.9" stroke-linecap="round"/>`).join('') : ''}`;
  };
  const emblem = (kind, y, col) => {
    if (kind === 'sun') return `<circle cx="${cx}" cy="${f(y)}" r="2.3" fill="${col}" ${ink(0.35)}/><path d="M${cx} ${f(y - 4.4)} v1.5 M${cx} ${f(y + 2.9)} v1.5 M${f(cx - 4.4)} ${f(y)} h1.5 M${f(cx + 2.9)} ${f(y)} h1.5 M${f(cx - 3.1)} ${f(y - 3.1)} l1 1 M${f(cx + 2.1)} ${f(y + 2.1)} l1 1 M${f(cx + 3.1)} ${f(y - 3.1)} l-1 1 M${f(cx - 2.1)} ${f(y + 2.1)} l-1 1" stroke="${col}" stroke-width="0.7" stroke-linecap="round"/>`;
    if (kind === 'tower') return `<path d="M${f(cx - 2.4)} ${f(y + 3.4)} v-5.6 h-0.7 v-1.8 h1.2 v0.9 h1.1 v-0.9 h1.6 v0.9 h1.1 v-0.9 h1.2 v1.8 h-0.7 v5.6Z" fill="${col}" ${ink(0.35)}/>`;
    if (kind === 'chevron') return `<path d="M${f(cx - 4)} ${f(y + 2.6)} L${cx} ${f(y - 2.6)} L${f(cx + 4)} ${f(y + 2.6)}" fill="none" stroke="${col}" stroke-width="1.5"/>`;
    return '';
  };

  let t = '';
  const base = (col = o.main) => fill(torsoPath(), col);
  switch (o.kind) {
    case 'swaddle': {
      t += base(o.main) + `<path d="M${f(cx - sw)} ${f(sy + 9)} Q${cx} ${f(sy - 2)} ${f(cx + sw)} ${f(sy + 12)} M${f(cx - sw - 1)} ${f(sy + 17)} Q${cx} ${f(sy + 5)} ${f(cx + sw + 1)} ${f(sy + 21)}" fill="none" stroke="${o.trim}" stroke-width="0.9"/>` + shadeR;
      out.collar = `<path d="M${f(cx - nw - 5)} ${f(baseY - 1)} Q${cx} ${f(baseY + 6)} ${f(cx + nw + 5)} ${f(baseY - 1)} Q${cx} ${f(baseY + 11)} ${f(cx - nw - 5)} ${f(baseY - 1)}Z" fill="${tint(o.main, 0.2)}" ${ink(0.5)}/>`;
      break;
    }
    case 'tunic': case 'dress': case 'wrap': {
      t += base() + shadeR + lightL + folds();
      if (o.jerkin) t += `<path d="M${f(cx - sw + 5)} 104 L${f(cx - sw * 0.6)} ${f(sy - 1)} L${f(cx - nw - 1.5)} ${f(baseY)} L${f(cx - 3.4)} 104Z M${f(cx + sw - 5)} 104 L${f(cx + sw * 0.6)} ${f(sy - 1)} L${f(cx + nw + 1.5)} ${f(baseY)} L${f(cx + 3.4)} 104Z" fill="${o.jerkin}" ${ink(0.5)}/>`;
      if (o.kind === 'wrap') {
        t += `<path d="M${f(cx - nw - 1.2)} ${f(baseY - 1.6)} L${f(cx + 3)} ${f(baseY + 13)} L${f(cx + nw + 1.2)} ${f(baseY - 1.6)}Z" fill="${o.under}" ${ink(0.45)}/>`;
        t += `<path d="M${f(cx - nw - 3.4)} ${f(baseY - 1)} L${f(cx + 4.2)} ${f(baseY + 16)} L${f(cx + 7.2)} ${f(baseY + 14)} L${f(cx - nw - 0.6)} ${f(baseY - 2.4)}Z" fill="${shade(o.main, 0.18)}" ${ink(0.45)}/><path d="M${f(cx + nw + 3.4)} ${f(baseY - 1)} L${f(cx + 3.2)} ${f(baseY + 13)} L${f(cx + 5.4)} ${f(baseY + 11.4)} L${f(cx + nw + 0.8)} ${f(baseY - 2.4)}Z" fill="${light}" ${ink(0.45)}/>`;
        if (o.sash) t += `<path d="M${f(cx - sw)} 97 Q${cx} 93 ${f(cx + sw)} 97 L${f(cx + sw)} 104 L${f(cx - sw)} 104Z" fill="${o.sash}" ${ink(0.5)}/>`;
      } else {
        t += under(o.neck ?? 'round', o.under, o.kind === 'dress' ? 1.15 : 1);
        if (o.lace && detail) t += lacing(baseY + (o.neck === 'square' ? 8.5 : 9.5), o.kind === 'dress' ? 4 : 3);
        if (o.kind === 'dress' && detail) t += `<path d="M${f(cx - nw - 5)} ${f(baseY + 9)} Q${cx} ${f(baseY + 13)} ${f(cx + nw + 5)} ${f(baseY + 9)}" fill="none" stroke="${dark}" stroke-width="0.5" opacity="0.7"/>`;
      }
      if (o.apron) t += `<path d="M${f(cx - 10)} ${f(baseY + 10)} L${f(cx - 12)} 104 L${f(cx + 12)} 104 L${f(cx + 10)} ${f(baseY + 10)}Z" fill="${o.apron}" ${ink(0.5)}/>`;
      if (o.torn) t += `<path d="M${f(cx - nw - 1.4)} ${f(baseY - 1.4)} l-1.6 2.6 l1.8 0.6 l-1.4 2.4 M${f(cx + sw * 0.5)} ${f(sy + 14)} l1.6 3 l-2 1.4 l1.4 3" fill="none" stroke="${shade(o.main, 0.55)}" stroke-width="0.55" stroke-linecap="round"/>` + (detail ? `<path d="M${f(cx + sw * 0.2)} ${f(sy + 7)} l4 0.4 0.2 3.8 -4.4 -0.2Z" fill="${mixHex(o.main, '#3a3a30', 0.4)}" stroke="${shade(o.main, 0.5)}" stroke-width="0.35" stroke-dasharray="0.8 0.6"/>` : '');
      if (o.patch && detail) t += `<path d="M${f(cx - sw * 0.6)} ${f(sy + 9)} l5 -0.7 0.6 4.8 -5.2 0.5Z" fill="${mixHex(o.main, '#8a7c62', 0.35)}" stroke="${shade(o.main, 0.55)}" stroke-width="0.4" stroke-dasharray="0.8 0.6"/>`;
      if (o.dust && detail) t += `<path d="M${f(cx - sw * 0.5)} ${f(sy + 6)} q6 3 12 0 M${f(cx + 4)} ${f(sy + 12)} q5 2 10 -1" fill="none" stroke="#efe8d6" stroke-width="1.6" opacity="0.25" stroke-linecap="round"/>`;
      if (o.shawl) t += `<path d="M${f(cx - sw + 1)} ${f(sy + 7)} Q${f(cx - nw - 4)} ${f(baseY - 1)} ${f(cx - nw - 1)} ${f(baseY - 2)} L${f(cx - 2)} ${f(baseY + 17)} L${f(cx - sw + 6)} ${f(sy + 22)}Z M${f(cx + sw - 1)} ${f(sy + 7)} Q${f(cx + nw + 4)} ${f(baseY - 1)} ${f(cx + nw + 1)} ${f(baseY - 2)} L${f(cx + 2)} ${f(baseY + 17)} L${f(cx + sw - 6)} ${f(sy + 22)}Z" fill="${o.shawl}" ${ink(0.5)}/>${detail ? `<path d="M${f(cx - sw + 5)} ${f(sy + 12)} L${f(cx - 4)} ${f(baseY + 12)} M${f(cx + sw - 5)} ${f(sy + 12)} L${f(cx + 4)} ${f(baseY + 12)}" stroke="${shade(o.shawl, 0.3)}" stroke-width="0.45" stroke-dasharray="1.6 1" fill="none"/>` : ''}`;
      if (o.strap) t += `<path d="M${f(cx - sw + 3)} ${f(sy + 4)} L${f(cx + sw * 0.5)} 104 L${f(cx + sw * 0.5 + 5)} 104 L${f(cx - sw + 7)} ${f(sy + 2)}Z" fill="${o.strap}" ${ink(0.45)}/>`;
      if (o.pouch && detail) t += `<path d="M${f(cx - sw * 0.72)} ${f(sy + 2)} L${f(cx + 9)} 104" stroke="#4a3a28" stroke-width="1.1" fill="none"/>`;
      break;
    }
    case 'mail': case 'plate': {
      // 사슬 갑옷 바탕
      t += base(o.kind === 'plate' ? shade(o.main, 0.25) : o.main) + shadeR;
      if (detail) {
        let rings = '';
        for (let y = sy - 1; y < 102; y += 1.9) for (let x = cx - sw; x < cx + sw; x += 2.5) rings += `M${f(x + ((Math.round(y / 1.9)) % 2) * 1.25)} ${f(y)} a1.05 0.9 0 0 0 2.1 0 `;
        t += `<path d="${rings}" fill="none" stroke="#33363b" stroke-width="0.34" opacity="0.75" clip-path="url(#${c.uid}t)"/>`;
        out.defs = `<clipPath id="${c.uid}t"><path d="${torsoPath()}"/></clipPath>`;
      }
      if (o.gambeson) t += `<path d="M${f(cx - nw - 3)} ${f(baseY - 1)} Q${cx} ${f(baseY + 9)} ${f(cx + nw + 3)} ${f(baseY - 1)} L${f(cx + nw + 6)} ${f(baseY + 2)} Q${cx} ${f(baseY + 14)} ${f(cx - nw - 6)} ${f(baseY + 2)}Z" fill="#8a7a5c" ${ink(0.45)}/>`;
      // 겉옷(문장이 있는 천)
      t += `<path d="M${f(cx - sw * 0.5)} 104 L${f(cx - sw * 0.46)} ${f(sy + 2)} Q${f(cx - nw - 2)} ${f(baseY + 2)} ${f(cx - nw + 0.5)} ${f(baseY + 5)} Q${cx} ${f(baseY + 12)} ${f(cx + nw - 0.5)} ${f(baseY + 5)} Q${f(cx + nw + 2)} ${f(baseY + 2)} ${f(cx + sw * 0.46)} ${f(sy + 2)} L${f(cx + sw * 0.5)} 104Z" fill="${o.cloth}" ${ink(0.5)}/>`;
      t += `<path d="M${f(cx + 3)} ${f(baseY + 10)} L${f(cx + sw * 0.46)} ${f(sy + 2)} L${f(cx + sw * 0.5)} 104 L${f(cx + 5)} 104Z" fill="#0b0705" opacity="0.2"/>`;
      if (detail) t += `<path d="M${f(cx - sw * 0.46)} ${f(sy + 3)} L${f(cx - sw * 0.5)} 104 M${f(cx + sw * 0.46)} ${f(sy + 3)} L${f(cx + sw * 0.5)} 104" stroke="${o.trim}" stroke-width="0.8" opacity="0.85"/>`;
      t += emblem(o.emblem, Math.min(96, baseY + 19), o.trim);
      if (o.kind === 'plate') {
        for (const s of [-1, 1]) {
          const px = cx + s * (sw - 5);
          t += `<path d="M${f(cx + s * (nw + 3.5))} ${f(baseY + 0.5)} Q${f(px - s * 2)} ${f(sy - 6)} ${f(px + s * 7)} ${f(sy + 1)} Q${f(px + s * 9.5)} ${f(sy + 9)} ${f(px + s * 6)} ${f(sy + 15)} Q${f(px - s * 3)} ${f(sy + 10)} ${f(cx + s * (nw + 5))} ${f(baseY + 8)}Z" fill="${s < 0 ? tint(o.main, 0.12) : shade(o.main, 0.2)}" ${ink(0.55)}/>`;
          t += `<path d="M${f(cx + s * (nw + 6))} ${f(baseY + 3)} Q${f(px)} ${f(sy - 1.5)} ${f(px + s * 7.4)} ${f(sy + 6)}" fill="none" stroke="${s < 0 ? '#f2f0ea' : shade(o.main, 0.45)}" stroke-width="${s < 0 ? 0.8 : 0.5}" opacity="${s < 0 ? 0.55 : 0.8}"/>`;
          if (o.ornate) t += `<path d="M${f(cx + s * (nw + 5))} ${f(baseY + 7.4)} Q${f(px - s * 2)} ${f(sy + 9)} ${f(px + s * 5.6)} ${f(sy + 14)}" fill="none" stroke="${o.trim}" stroke-width="0.7"/>`;
          if (detail) t += `<circle cx="${f(px + s * 3.2)}" cy="${f(sy + 6.4)}" r="0.7" fill="${shade(o.main, 0.5)}"/>`;
        }
      }
      if (o.fur) out.collar += furBand(o.fur, 5);
      break;
    }
    case 'leather': {
      t += base(o.under ?? shade(o.main, 0.2)) + folds(shade(o.under ?? o.main, 0.4));
      // 가죽 조끼
      t += `<path d="M${f(cx - sw + 1.5)} 104 L${f(cx - sw + 3)} ${f(sy + 6)} Q${f(cx - sw * 0.6)} ${f(sy - 3)} ${f(cx - nw - 1.5)} ${f(baseY - 1)} L${f(cx - 2.2)} ${f(baseY + 12)} L${f(cx - 2.8)} 104Z M${f(cx + sw - 1.5)} 104 L${f(cx + sw - 3)} ${f(sy + 6)} Q${f(cx + sw * 0.6)} ${f(sy - 3)} ${f(cx + nw + 1.5)} ${f(baseY - 1)} L${f(cx + 2.2)} ${f(baseY + 12)} L${f(cx + 2.8)} 104Z" fill="${o.main}" ${ink(0.5)}/>` + shadeR;
      if (detail) t += `<path d="M${f(cx - 3.4)} ${f(baseY + 12)} L${f(cx - 4)} 104 M${f(cx + 3.4)} ${f(baseY + 12)} L${f(cx + 4)} 104" stroke="${shade(o.main, 0.5)}" stroke-width="0.4" stroke-dasharray="1 0.8"/><path d="M${f(cx - 2.2)} ${f(baseY + 15)} h4.4 M${f(cx - 2.4)} ${f(baseY + 20)} h4.8" stroke="${o.strap}" stroke-width="0.7"/>`;
      t += `<path d="M${f(cx - sw + 2)} ${f(sy + 5)} L${f(cx + sw * 0.55)} 104 L${f(cx + sw * 0.55 + 5.5)} 104 L${f(cx - sw + 6.5)} ${f(sy + 2.5)}Z" fill="${o.strap}" ${ink(0.45)}/><rect x="${f(cx - 4)}" y="${f(sy + 14.5)}" width="4.4" height="3.6" rx="0.6" transform="rotate(38 ${cx} ${f(sy + 16)})" fill="none" stroke="#a8935e" stroke-width="0.8"/>`;
      if (o.quiver) out.behind += `<path d="M${f(cx + sw - 13)} ${f(sy - 1)} l4 -15 l5.5 1.4 l-3 15.6Z" fill="#4a3a26" ${ink(0.5)}/>` + [0, 1, 2].map((i) => `<path d="M${f(cx + sw - 8.2 + i * 1.7)} ${f(sy - 15.4 + i * 0.4)} l${f(0.8 + i * 0.2)} -5.4 l1.5 2.2 M${f(cx + sw - 8.2 + i * 1.7)} ${f(sy - 15.4 + i * 0.4)} l${f(0.8 + i * 0.2)} -5.4 l-1.3 1.8" fill="none" stroke="${i === 1 ? '#b9ad94' : '#8a8f6a'}" stroke-width="0.7"/>`).join('');
      if (o.pauldron) t += `<path d="M${f(cx - nw - 3)} ${f(baseY + 0.5)} Q${f(cx - sw + 6)} ${f(sy - 6)} ${f(cx - sw - 3)} ${f(sy + 2)} Q${f(cx - sw - 4.5)} ${f(sy + 9)} ${f(cx - sw - 1)} ${f(sy + 13)} Q${f(cx - sw + 8)} ${f(sy + 8)} ${f(cx - nw - 4)} ${f(baseY + 7)}Z" fill="${shade(o.main, 0.3)}" ${ink(0.55)}/><path d="M${f(cx - nw - 5)} ${f(baseY + 3)} Q${f(cx - sw + 5)} ${f(sy - 2)} ${f(cx - sw - 2)} ${f(sy + 6)}" fill="none" stroke="${tint(o.main, 0.3)}" stroke-width="0.6" opacity="0.6"/>`;
      break;
    }
    case 'doublet': case 'noble': case 'coat': {
      t += base() + shadeR + lightL;
      // 누빔 줄
      if (detail && o.kind !== 'coat') { let q = ''; for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) q += `M${f(cx + s * (nw + i * (sw - nw) * 0.27))} ${f(sy - 1 + i * 1.5)} L${f(cx + s * (nw + i * (sw - nw) * 0.3 + 2))} 104 `; t += `<path d="${q}" stroke="${dark}" stroke-width="0.45" opacity="0.6" fill="none"/>`; }
      t += `<path d="M${cx} ${f(baseY + 5)} L${cx} 104" stroke="${INK}" stroke-width="0.5" opacity="0.7"/>`;
      for (let y = baseY + 9; y < 101; y += 4.4) t += `<circle cx="${cx}" cy="${f(y)}" r="${o.ornate || o.kind === 'noble' ? 1 : 0.8}" fill="${o.trim}" stroke="${shade(o.trim, 0.5)}" stroke-width="0.3"/>`;
      if (o.kind === 'coat') t += `<path d="M${f(cx - nw - 2)} ${f(baseY - 1)} L${f(cx - 1)} ${f(baseY + 16)} L${f(cx - 9)} ${f(baseY + 22)} L${f(cx - sw * 0.52)} ${f(sy + 1)}Z M${f(cx + nw + 2)} ${f(baseY - 1)} L${f(cx + 1)} ${f(baseY + 16)} L${f(cx + 9)} ${f(baseY + 22)} L${f(cx + sw * 0.52)} ${f(sy + 1)}Z" fill="${shade(o.main, 0.25)}" ${ink(0.5)}/><path d="M${f(cx - nw - 1)} ${f(baseY - 1.5)} L${cx} ${f(baseY + 12)} L${f(cx + nw + 1)} ${f(baseY - 1.5)}Z" fill="${o.under}" ${ink(0.4)}/>`;
      if (o.strap) t += `<path d="M${f(cx - sw + 3)} ${f(sy + 4)} L${f(cx + sw * 0.5)} 104 L${f(cx + sw * 0.5 + 4.6)} 104 L${f(cx - sw + 7)} ${f(sy + 2)}Z" fill="${o.strap}" ${ink(0.45)}/>`;
      if (o.fur) out.collar += furBand(o.fur, o.kind === 'noble' ? 8 : 6);
      if (o.chain) out.collar += chainOf(o.chain, o.fur ? 17 : 13, o.jewel ?? (o.ornate ? o.chain : null));
      if (o.pin && detail) t += `<path d="M${f(cx - sw * 0.5)} ${f(sy + 8)} l3.6 -5.4" stroke="#d9d0c0" stroke-width="0.8" stroke-linecap="round"/><path d="M${f(cx - sw * 0.5 + 3.6)} ${f(sy + 2.6)} l1.4 -2.6 l-2.2 1.6Z" fill="#d9d0c0"/>`;
      break;
    }
    case 'robe': case 'magerobe': case 'gown': case 'cloak': {
      t += base() + shadeR + lightL + folds(dark, 4);
      if (o.kind === 'cloak') {
        t += `<path d="M${f(cx - nw - 1)} ${f(baseY - 1.5)} L${cx} ${f(baseY + 13)} L${f(cx + nw + 1)} ${f(baseY - 1.5)}Z" fill="${o.under}" ${ink(0.4)}/>`;
        t += `<path d="M${f(cx - nw - 2.5)} ${f(baseY - 1)} Q${f(cx - 5)} ${f(baseY + 8)} ${f(cx - 4.5)} 104 M${f(cx + nw + 2.5)} ${f(baseY - 1)} Q${f(cx + 5)} ${f(baseY + 8)} ${f(cx + 4.5)} 104" fill="none" ${ink(0.55)}/>`;
        if (o.charm && detail) t += `<path d="M${f(cx - 3)} ${f(baseY + 4)} Q${cx} ${f(baseY + 20)} ${f(cx + 3)} ${f(baseY + 4)}" fill="none" stroke="#6a5a44" stroke-width="0.5"/><path d="M${cx} ${f(baseY + 12.6)} l1.5 2.6 l-1.5 2.4 l-1.5 -2.4Z" fill="${o.trim}" ${ink(0.3)}/>`;
      }
      if (o.kind === 'magerobe') {
        t += `<path d="M${f(cx - 4.6)} ${f(baseY + 3)} L${f(cx - 5.6)} 104 L${f(cx + 5.6)} 104 L${f(cx + 4.6)} ${f(baseY + 3)}Z" fill="${shade(o.main, 0.3)}" ${ink(0.45)}/><path d="M${f(cx - 4.6)} ${f(baseY + 3)} L${f(cx - 5.6)} 104 M${f(cx + 4.6)} ${f(baseY + 3)} L${f(cx + 5.6)} 104" stroke="${o.trim}" stroke-width="0.8"/>`;
        if (o.embroid && detail) { let e = ''; for (let y = baseY + 12; y < 102; y += 5) e += `M${f(cx - 2.2)} ${f(y)} l2.2 -2 l2.2 2 l-2.2 2Z `; t += `<path d="${e}" fill="none" stroke="${o.trim}" stroke-width="0.45" opacity="0.85"/>`; for (const s of [-1, 1]) t += `<path d="M${f(cx + s * (sw - 6))} ${f(sy + 6)} q${-s * 4} 3 ${-s * 2} 8 q${s * 3} 4 ${-s * 1} 9" fill="none" stroke="${o.trim}" stroke-width="0.45" opacity="0.6"/>`; }
      }
      if (o.kind === 'gown') t += `<path d="M${f(cx - nw - 2)} ${f(baseY - 1)} L${f(cx - 2)} ${f(baseY + 12)} L${f(cx - 6)} 104 L${f(cx + 6)} 104 L${f(cx + 2)} ${f(baseY + 12)} L${f(cx + nw + 2)} ${f(baseY - 1)}" fill="${shade(o.main, 0.3)}" ${ink(0.45)}/>`;
      if (o.cope) t += `<path d="M${f(cx - sw - 2)} 104 L${f(cx - sw)} ${f(sy + 6)} Q${f(cx - sw * 0.6)} ${f(sy - 3)} ${f(cx - nw - 2)} ${f(baseY - 1)} L${f(cx - 7)} 104Z M${f(cx + sw + 2)} 104 L${f(cx + sw)} ${f(sy + 6)} Q${f(cx + sw * 0.6)} ${f(sy - 3)} ${f(cx + nw + 2)} ${f(baseY - 1)} L${f(cx + 7)} 104Z" fill="${o.cope}" ${ink(0.5)}/><path d="M${f(cx - nw - 2)} ${f(baseY - 1)} L${f(cx - 7)} 104 M${f(cx + nw + 2)} ${f(baseY - 1)} L${f(cx + 7)} 104" stroke="${o.trim}" stroke-width="1.6"/>` + shadeR;
      if (o.stole) {
        for (const s of [-1, 1]) t += `<path d="M${f(cx + s * (nw + 3))} ${f(baseY - 0.5)} L${f(cx + s * 4.2)} 104 L${f(cx + s * 9.4)} 104 L${f(cx + s * (nw + 7.4))} ${f(baseY + 1.5)}Z" fill="${o.stole}" ${ink(0.45)}/>${detail ? `<path d="M${f(cx + s * 6.8)} 90 v5 M${f(cx + s * 6.8 - 2)} 92 h4" stroke="${o.trim}" stroke-width="0.7"/>` : ''}`;
      }
      if (o.emblem === 'sunpendant') out.collar += `<path d="M${f(cx - nw - 2)} ${f(baseY)} Q${cx} ${f(baseY + 22)} ${f(cx + nw + 2)} ${f(baseY)}" fill="none" stroke="${shade(o.trim, 0.3)}" stroke-width="0.55"/>` + emblem('sun', baseY + 12.5, o.trim);
      if (o.fur) out.collar += furBand(o.fur, 6);
      if (o.chain) out.collar += chainOf(o.chain, 15, null);
      break;
    }
    case 'apron': {
      t += base() + shadeR + lightL;
      t += under('v', o.under, 0.9);
      if (o.rolled && detail) t += `<path d="M${f(cx - sw + 1)} ${f(sy + 12)} q3 2.4 7 1 M${f(cx + sw - 1)} ${f(sy + 12)} q-3 2.4 -7 1" fill="none" stroke="${dark}" stroke-width="0.6"/>`;
      if (o.vest) t += `<path d="M${f(cx - sw * 0.62)} 104 L${f(cx - sw * 0.56)} ${f(sy)} L${f(cx - nw - 1.5)} ${f(baseY - 1)} L${f(cx - 5)} ${f(baseY + 14)} L${f(cx - 6)} 104Z M${f(cx + sw * 0.62)} 104 L${f(cx + sw * 0.56)} ${f(sy)} L${f(cx + nw + 1.5)} ${f(baseY - 1)} L${f(cx + 5)} ${f(baseY + 14)} L${f(cx + 6)} 104Z" fill="${shade(o.main, 0.3)}" ${ink(0.45)}/>`;
      t += `<path d="M${f(cx - 10.5)} ${f(baseY + 9)} L${f(cx - 12.5)} 104 L${f(cx + 12.5)} 104 L${f(cx + 10.5)} ${f(baseY + 9)} Q${cx} ${f(baseY + 11.5)} ${f(cx - 10.5)} ${f(baseY + 9)}Z" fill="${o.apron}" ${ink(0.5)}/><path d="M${f(cx + 3)} ${f(baseY + 11)} L${f(cx + 10.5)} ${f(baseY + 9)} L${f(cx + 12.5)} 104 L${f(cx + 5)} 104Z" fill="#0b0705" opacity="0.14"/>`;
      if (o.apronStrap !== false) t += `<path d="M${f(cx - 10.5)} ${f(baseY + 9.4)} L${f(cx - nw - 2.4)} ${f(baseY - 0.4)} M${f(cx + 10.5)} ${f(baseY + 9.4)} L${f(cx + nw + 2.4)} ${f(baseY - 0.4)}" stroke="${shade(o.apron, 0.15)}" stroke-width="1.7"/><circle cx="${f(cx - 10.2)}" cy="${f(baseY + 9.8)}" r="0.7" fill="#a8935e"/><circle cx="${f(cx + 10.2)}" cy="${f(baseY + 9.8)}" r="0.7" fill="#a8935e"/>`;
      if (o.soot && detail) t += `<path d="M${f(cx - 6)} ${f(baseY + 17)} q3 2 6 -1 M${f(cx + 1)} ${f(baseY + 24)} q4 1 6 -2" fill="none" stroke="#1a1512" stroke-width="2" opacity="0.22" stroke-linecap="round"/>`;
      break;
    }
    default: t += base() + shadeR;
  }
  // 기운 자리와 해진 단: 어떤 옷이든 형편이 어려우면 드러난다
  if (o.patch && !['tunic', 'dress', 'wrap'].includes(o.kind)) t += `<path d="M${f(cx - sw * 0.62)} ${f(sy + 10)} l5 -0.7 0.6 4.8 -5.2 0.5Z" fill="${mixHex(o.main, '#8a7c62', 0.35)}" stroke="${shade(o.main, 0.55)}" stroke-width="0.4" stroke-dasharray="0.9 0.6"/>`;
  if (o.torn && !['tunic', 'dress', 'wrap'].includes(o.kind)) t += `<path d="M${f(cx + sw * 0.5)} ${f(sy + 14)} l1.6 3 l-2 1.4 l1.4 3" fill="none" stroke="${shade(o.main, 0.55)}" stroke-width="0.55" stroke-linecap="round"/>`;
  out.torso = t;

  /* ----- 목 위로 올라오는 것들 ----- */
  const y0 = baseY;
  let col = out.collar;
  if (o.kind === 'mail') col = `<path d="M${f(cx - nw - 4.5)} ${f(y0 + 2)} Q${cx} ${f(y0 + 10)} ${f(cx + nw + 4.5)} ${f(y0 + 2)} L${f(cx + nw + 1.2)} ${f(y0 - 4.4)} Q${cx} ${f(y0 + 2.5)} ${f(cx - nw - 1.2)} ${f(y0 - 4.4)}Z" fill="${shade(o.main, 0.18)}" ${ink(0.5)}/>${detail ? `<path d="M${f(cx - nw - 2.4)} ${f(y0 - 1.4)} Q${cx} ${f(y0 + 6)} ${f(cx + nw + 2.4)} ${f(y0 - 1.4)}" fill="none" stroke="#33363b" stroke-width="0.45" stroke-dasharray="0.9 0.7"/>` : ''}` + col;
  if (o.kind === 'plate' || o.gorget) col = `<path d="M${f(cx - nw - 4)} ${f(y0 + 3)} Q${cx} ${f(y0 + 11)} ${f(cx + nw + 4)} ${f(y0 + 3)} L${f(cx + nw + 1.6)} ${f(y0 - 6)} Q${cx} ${f(y0 + 0.5)} ${f(cx - nw - 1.6)} ${f(y0 - 6)}Z" fill="${o.kind === 'plate' ? o.main : '#8a8f96'}" ${ink(0.55)}/><path d="M${f(cx - nw - 1)} ${f(y0 - 3.4)} Q${f(cx - 2)} ${f(y0 + 2.6)} ${f(cx + 1)} ${f(y0 + 2.4)}" fill="none" stroke="#f2f0ea" stroke-width="0.7" opacity="0.5"/><path d="M${f(cx - nw - 3.4)} ${f(y0 + 2.4)} Q${cx} ${f(y0 + 9.8)} ${f(cx + nw + 3.4)} ${f(y0 + 2.4)}" fill="none" stroke="${o.trim ?? '#55585d'}" stroke-width="0.6"/>` + col;
  if (o.kind === 'doublet') col = (o.ruff
    ? `<path d="M${f(cx - nw - 4.5)} ${f(y0 - 3)} q1.6 3 3.2 0.6 q1.6 3 3.2 1.2 q1.6 3 3.4 1.6 q1.8 1.6 3.4 0 q1.8 1.4 3.4 -1.6 q1.6 1.8 3.2 -1.2 q1.6 2.4 3.2 -0.6 l-1.2 5.4 Q${cx} ${f(y0 + 9)} ${f(cx - nw - 3.3)} ${f(y0 + 2.4)}Z" fill="#e6dcc8" ${ink(0.4)}/>`
    : `<path d="M${f(cx - nw - 3.4)} ${f(y0 - 4.5)} L${f(cx - 1)} ${f(y0 + 6.5)} L${f(cx - nw - 6.5)} ${f(y0 + 3.5)}Z M${f(cx + nw + 3.4)} ${f(y0 - 4.5)} L${f(cx + 1)} ${f(y0 + 6.5)} L${f(cx + nw + 6.5)} ${f(y0 + 3.5)}Z" fill="${tint(o.main, 0.16)}" ${ink(0.5)}/>`) + col;
  if (o.kind === 'noble') col = `<path d="M${f(cx - nw - 2.2)} ${f(y0 - 8)} L${f(cx - 1.2)} ${f(y0 + 5)} L${f(cx - nw - 5.4)} ${f(y0 + 3)}Z M${f(cx + nw + 2.2)} ${f(y0 - 8)} L${f(cx + 1.2)} ${f(y0 + 5)} L${f(cx + nw + 5.4)} ${f(y0 + 3)}Z" fill="${o.main}" ${ink(0.5)}/><path d="M${f(cx - nw - 2.2)} ${f(y0 - 8)} L${f(cx - 1.2)} ${f(y0 + 5)} M${f(cx + nw + 2.2)} ${f(y0 - 8)} L${f(cx + 1.2)} ${f(y0 + 5)}" stroke="${o.trim}" stroke-width="0.7"/>` + col;
  if (o.kind === 'magerobe') col = `<path d="M${f(cx - nw - 2.6)} ${f(y0 - 9)} Q${f(cx - nw - 5)} ${f(y0 - 2)} ${f(cx - 2)} ${f(y0 + 6)} L${f(cx - nw - 6.4)} ${f(y0 + 4)}Z M${f(cx + nw + 2.6)} ${f(y0 - 9)} Q${f(cx + nw + 5)} ${f(y0 - 2)} ${f(cx + 2)} ${f(y0 + 6)} L${f(cx + nw + 6.4)} ${f(y0 + 4)}Z" fill="${shade(o.main, 0.12)}" ${ink(0.5)}/><path d="M${f(cx - nw - 2.6)} ${f(y0 - 9)} Q${f(cx - nw - 5)} ${f(y0 - 2)} ${f(cx - 2)} ${f(y0 + 6)} M${f(cx + nw + 2.6)} ${f(y0 - 9)} Q${f(cx + nw + 5)} ${f(y0 - 2)} ${f(cx + 2)} ${f(y0 + 6)}" fill="none" stroke="${o.trim}" stroke-width="0.6"/><path d="M${cx} ${f(y0 + 3.6)} l2.3 2.9 l-2.3 2.9 l-2.3 -2.9Z" fill="${o.clasp}" ${ink(0.4)}/><path d="M${f(cx - 0.9)} ${f(y0 + 5.6)} l0.9 -1.1" stroke="#fff" stroke-width="0.4" opacity="0.7"/>` + col;
  if (o.kind === 'cloak') col = `<path d="M${f(cx - nw - 5)} ${f(y0 + 0.5)} Q${cx} ${f(y0 + 8)} ${f(cx + nw + 5)} ${f(y0 + 0.5)} L${f(cx + nw + 3)} ${f(y0 - 3)} Q${cx} ${f(y0 + 4)} ${f(cx - nw - 3)} ${f(y0 - 3)}Z" fill="${shade(o.main, 0.15)}" ${ink(0.5)}/><circle cx="${cx}" cy="${f(y0 + 4.6)}" r="1.7" fill="${o.clasp}" ${ink(0.4)}/>` + col;
  if ((o.kind === 'gown' || o.kind === 'doublet') && o.tabs) col += `<path d="M${f(cx - 2.6)} ${f(y0 + 2.6)} l-0.5 6 l2.6 0.4 l0.5 -6Z M${f(cx + 2.6)} ${f(y0 + 2.6)} l0.5 6 l-2.6 0.4 l-0.5 -6Z" fill="#e6dcc8" ${ink(0.4)}/>`;
  if (o.kind === 'robe' && !o.fur) col = `<path d="M${f(cx - nw - 3)} ${f(y0 - 2.5)} Q${cx} ${f(y0 + 6.5)} ${f(cx + nw + 3)} ${f(y0 - 2.5)} L${f(cx + nw + 4)} ${f(y0 + 0.5)} Q${cx} ${f(y0 + 9.5)} ${f(cx - nw - 4)} ${f(y0 + 0.5)}Z" fill="${tint(o.main, 0.1)}" stroke="${o.trim}" stroke-width="0.6"/>` + col;
  if (o.scarfNeck) col += `<path d="M${f(cx - nw - 3)} ${f(y0 - 4)} Q${cx} ${f(y0 + 3)} ${f(cx + nw + 3)} ${f(y0 - 4)} L${f(cx + nw + 3.6)} ${f(y0 + 1.6)} Q${cx} ${f(y0 + 8.5)} ${f(cx - nw - 3.6)} ${f(y0 + 1.6)}Z" fill="${o.scarfNeck}" ${ink(0.5)}/><path d="M${f(cx - 3)} ${f(y0 + 4)} l-2 9 l5 0.6 l1 -8.6Z" fill="${shade(o.scarfNeck, 0.15)}" ${ink(0.45)}/>`;
  if (o.furCollar) col += furBand(o.furCollar, 4.5);
  // 망토: 어깨 뒤와 앞 여밈
  if (o.cloak) {
    out.behind += `<path d="M${f(cx - sw - 5)} 104 L${f(cx - sw - 1)} ${f(sy + 3)} Q${f(cx - sw * 0.5)} ${f(sy - 7)} ${f(cx - nw)} ${f(baseY - 6)} L${f(cx + nw)} ${f(baseY - 6)} Q${f(cx + sw * 0.5)} ${f(sy - 7)} ${f(cx + sw + 1)} ${f(sy + 3)} L${f(cx + sw + 5)} 104Z" fill="${o.cloak}" ${ink(0.55)}/>`;
    col += `<path d="M${f(cx - sw - 2)} ${f(sy + 12)} Q${f(cx - sw * 0.75)} ${f(sy - 4)} ${f(cx - nw - 2.4)} ${f(baseY - 2)} L${f(cx - nw + 1)} ${f(baseY + 4.5)} Q${f(cx - sw * 0.5)} ${f(sy + 5)} ${f(cx - sw + 3)} ${f(sy + 19)}Z" fill="${o.cloak}" ${ink(0.5)}/><circle cx="${f(cx - nw - 0.4)}" cy="${f(baseY + 2.6)}" r="1.5" fill="${o.trim ?? '#a8935e'}" ${ink(0.4)}/>`;
  }
  // 내린 두건
  if (o.hoodDown) col = `<path d="M${f(cx - nw - 8)} ${f(y0 + 4)} Q${f(cx - nw - 7.5)} ${f(y0 - 6.5)} ${f(cx - nw + 0.5)} ${f(y0 - 5)} Q${cx} ${f(y0 + 5.5)} ${f(cx + nw - 0.5)} ${f(y0 - 5)} Q${f(cx + nw + 7.5)} ${f(y0 - 6.5)} ${f(cx + nw + 8)} ${f(y0 + 4)} Q${cx} ${f(y0 + 14)} ${f(cx - nw - 8)} ${f(y0 + 4)}Z" fill="${shade(o.headCol ?? o.main, 0.1)}" ${ink(0.5)}/><path d="M${f(cx - nw - 4.6)} ${f(y0 - 1.6)} Q${cx} ${f(y0 + 9)} ${f(cx + nw + 4.6)} ${f(y0 - 1.6)}" fill="none" stroke="#0b0705" stroke-width="1.4" opacity="0.25"/>` + col;
  out.collar = col;
  return out;
}

/** 머리에 쓰는 것. h: 머리 치수 { cx, cy, hw, hh, top, eyeY, browY }. 돌려주는 것: { back, front, hidesHair } */
export function drawHeadwear(o, h, detail) {
  const { cx, cy, hw, hh, top, browY } = h;
  const ink = (w = 0.55) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const col = o.headCol ?? o.main;
  const res = { back: '', front: '', hidesHair: false, coversEars: false };
  if (o.head === 'hood') {
    const w = hw + 5.5;
    res.back = `<path d="M${f(cx - w - 4)} ${f(cy + hh + 12)} C${f(cx - w - 6)} ${f(top - 13)} ${f(cx + w + 6)} ${f(top - 13)} ${f(cx + w + 4)} ${f(cy + hh + 12)}Z" fill="${shade(col, 0.45)}" ${ink()}/>`;
    res.front = `<path d="M${f(cx - w - 3.4)} ${f(cy + hh + 11)} C${f(cx - w - 6)} ${f(top - 12)} ${f(cx + w + 6)} ${f(top - 12)} ${f(cx + w + 3.4)} ${f(cy + hh + 11)} L${f(cx + hw * 0.86)} ${f(cy + hh * 0.72)} C${f(cx + hw + 2.6)} ${f(cy - hh * 0.2)} ${f(cx + hw * 0.8)} ${f(top + hh * 0.2)} ${cx} ${f(top + hh * 0.17)} C${f(cx - hw * 0.8)} ${f(top + hh * 0.2)} ${f(cx - hw - 2.6)} ${f(cy - hh * 0.2)} ${f(cx - hw * 0.86)} ${f(cy + hh * 0.72)}Z" fill="${col}" ${ink(0.6)}/>
      <path d="M${f(cx - hw * 0.86)} ${f(cy + hh * 0.72)} C${f(cx - hw - 2.6)} ${f(cy - hh * 0.2)} ${f(cx - hw * 0.8)} ${f(top + hh * 0.2)} ${cx} ${f(top + hh * 0.17)} C${f(cx + hw * 0.8)} ${f(top + hh * 0.2)} ${f(cx + hw + 2.6)} ${f(cy - hh * 0.2)} ${f(cx + hw * 0.86)} ${f(cy + hh * 0.72)}" fill="none" stroke="#0b0705" stroke-width="3.4" opacity="0.28"/>
      <path d="M${f(cx - w + 1)} ${f(cy + hh)} C${f(cx - w - 1)} ${f(top - 4)} ${f(cx - hw * 0.4)} ${f(top - 8.5)} ${cx} ${f(top - 9)}" fill="none" stroke="${tint(col, 0.3)}" stroke-width="0.9" opacity="0.4"/>
      ${detail ? `<path d="M${f(cx + w - 2)} ${f(cy + hh * 0.6)} q2 -14 -5 -26 M${f(cx - w + 3)} ${f(cy + hh * 0.5)} q-1 -12 5 -22" fill="none" stroke="${shade(col, 0.4)}" stroke-width="0.5" opacity="0.7"/>` : ''}`;
    res.hidesHair = 'top'; res.coversEars = true;
  } else if (o.head === 'scarf') {
    const w = hw + 2.2;
    res.front = `<path d="M${f(cx - w)} ${f(cy + hh * 0.18)} C${f(cx - w - 2.4)} ${f(top - 6.5)} ${f(cx + w + 2.4)} ${f(top - 6.5)} ${f(cx + w)} ${f(cy + hh * 0.18)} L${f(cx + hw * 0.93)} ${f(cy - hh * 0.02)} C${f(cx + hw * 0.9)} ${f(top + hh * 0.5)} ${f(cx + hw * 0.5)} ${f(top + hh * 0.26)} ${cx} ${f(top + hh * 0.25)} C${f(cx - hw * 0.5)} ${f(top + hh * 0.26)} ${f(cx - hw * 0.9)} ${f(top + hh * 0.5)} ${f(cx - hw * 0.93)} ${f(cy - hh * 0.02)}Z" fill="${col}" ${ink(0.55)}/>
      <path d="M${f(cx - hw * 0.85)} ${f(top + hh * 0.44)} Q${cx} ${f(top + hh * 0.2)} ${f(cx + hw * 0.85)} ${f(top + hh * 0.44)}" fill="none" stroke="${shade(col, 0.35)}" stroke-width="0.6"/>
      <path d="M${f(cx - w + 2)} ${f(cy - hh * 0.3)} C${f(cx - w + 1)} ${f(top - 1)} ${f(cx - hw * 0.3)} ${f(top - 3.6)} ${cx} ${f(top - 3.8)}" fill="none" stroke="${tint(col, 0.35)}" stroke-width="0.9" opacity="0.4"/>
      ${detail ? `<path d="M${f(cx + 3)} ${f(top - 2.6)} q5 3 7 9 M${f(cx + 8)} ${f(top + 0.5)} q4 4 4.6 10" fill="none" stroke="${shade(col, 0.35)}" stroke-width="0.45" opacity="0.8"/>` : ''}`;
    res.back = `<path d="M${f(cx - w)} ${f(cy - 2)} Q${f(cx - w - 3.6)} ${f(cy + hh * 0.8)} ${f(cx - w + 0.5)} ${f(cy + hh + 5)} L${f(cx + w - 0.5)} ${f(cy + hh + 5)} Q${f(cx + w + 3.6)} ${f(cy + hh * 0.8)} ${f(cx + w)} ${f(cy - 2)}Z" fill="${shade(col, 0.3)}" ${ink()}/>`;
    res.hidesHair = 'top'; res.coversEars = true;
  } else if (o.head === 'coif') {
    // 머릿수건: 정수리를 다 덮고 이마에 접힌 단이 있다
    const w = hw + 2.6; const c2 = shade(col, 0.12);
    res.back = `<path d="M${f(cx - w)} ${f(cy)} Q${f(cx - w - 2)} ${f(cy + hh * 0.6)} ${f(cx - hw * 0.7)} ${f(cy + hh * 0.9)} L${f(cx + hw * 0.7)} ${f(cy + hh * 0.9)} Q${f(cx + w + 2)} ${f(cy + hh * 0.6)} ${f(cx + w)} ${f(cy)}Z" fill="${shade(col, 0.3)}" ${ink()}/>`;
    res.front = `<path d="M${f(cx - w)} ${f(cy + hh * 0.14)} C${f(cx - w - 3.4)} ${f(top - 10.5)} ${f(cx + w + 3.4)} ${f(top - 10.5)} ${f(cx + w)} ${f(cy + hh * 0.14)} L${f(cx + hw * 0.93)} ${f(cy - hh * 0.04)} C${f(cx + hw * 0.9)} ${f(top + hh * 0.46)} ${f(cx + hw * 0.5)} ${f(top + hh * 0.27)} ${cx} ${f(top + hh * 0.27)} C${f(cx - hw * 0.5)} ${f(top + hh * 0.27)} ${f(cx - hw * 0.9)} ${f(top + hh * 0.46)} ${f(cx - hw * 0.93)} ${f(cy - hh * 0.04)}Z" fill="${c2}" ${ink(0.55)}/>
      <path d="M${f(cx - hw * 0.93)} ${f(cy - hh * 0.04)} C${f(cx - hw * 0.9)} ${f(top + hh * 0.46)} ${f(cx - hw * 0.5)} ${f(top + hh * 0.27)} ${cx} ${f(top + hh * 0.27)} C${f(cx + hw * 0.5)} ${f(top + hh * 0.27)} ${f(cx + hw * 0.9)} ${f(top + hh * 0.46)} ${f(cx + hw * 0.93)} ${f(cy - hh * 0.04)} L${f(cx + w - 0.4)} ${f(cy - hh * 0.2)} C${f(cx + hw)} ${f(top + hh * 0.3)} ${f(cx + hw * 0.5)} ${f(top + hh * 0.1)} ${cx} ${f(top + hh * 0.1)} C${f(cx - hw * 0.5)} ${f(top + hh * 0.1)} ${f(cx - hw)} ${f(top + hh * 0.3)} ${f(cx - w + 0.4)} ${f(cy - hh * 0.2)}Z" fill="${tint(col, 0.25)}" ${ink(0.45)}/>

      ${detail ? `<path d="M${f(cx + 2)} ${f(top - 6)} q6 2 8 9 M${f(cx - 4)} ${f(top - 6.4)} q-5 3 -6.4 9 M${f(cx + 9)} ${f(top - 3)} q3.4 4 4 9" fill="none" stroke="${shade(col, 0.4)}" stroke-width="0.45" opacity="0.7"/>` : ''}`;
    res.hidesHair = 'top'; res.coversEars = true;
  } else if (o.head === 'skullcap') {
    res.front = `<path d="M${f(cx - hw * 0.72)} ${f(top + hh * 0.2)} C${f(cx - hw * 0.7)} ${f(top - 6.4)} ${f(cx + hw * 0.7)} ${f(top - 6.4)} ${f(cx + hw * 0.72)} ${f(top + hh * 0.2)} Q${cx} ${f(top + hh * 0.04)} ${f(cx - hw * 0.72)} ${f(top + hh * 0.2)}Z" fill="${col}" ${ink(0.5)}/><path d="M${f(cx - hw * 0.5)} ${f(top - 1.6)} Q${f(cx - 3)} ${f(top - 4.6)} ${cx} ${f(top - 4.7)}" fill="none" stroke="${tint(col, 0.4)}" stroke-width="0.7" opacity="0.5"/>`;
  } else if (o.head === 'scholarcap') {
    res.front = `<path d="M${f(cx - hw - 1.2)} ${f(top + hh * 0.3)} C${f(cx - hw - 3)} ${f(top - 9)} ${f(cx + hw + 3)} ${f(top - 9)} ${f(cx + hw + 1.2)} ${f(top + hh * 0.3)} Q${cx} ${f(top + hh * 0.12)} ${f(cx - hw - 1.2)} ${f(top + hh * 0.3)}Z" fill="${col}" ${ink(0.55)}/><path d="M${f(cx - hw - 1.4)} ${f(top + hh * 0.3)} Q${cx} ${f(top + hh * 0.12)} ${f(cx + hw + 1.4)} ${f(top + hh * 0.3)} L${f(cx + hw + 1)} ${f(top + hh * 0.42)} Q${cx} ${f(top + hh * 0.24)} ${f(cx - hw - 1)} ${f(top + hh * 0.42)}Z" fill="${shade(col, 0.3)}" ${ink(0.45)}/>`;
    res.hidesHair = 'crown';
  } else if (o.head === 'beret') {
    res.front = `<path d="M${f(cx - hw - 1.6)} ${f(top + hh * 0.32)} C${f(cx - hw - 8)} ${f(top - 9)} ${f(cx + hw + 2)} ${f(top - 11)} ${f(cx + hw + 3.4)} ${f(top + hh * 0.2)} Q${f(cx + 2)} ${f(top + hh * 0.06)} ${f(cx - hw - 1.6)} ${f(top + hh * 0.32)}Z" fill="${col}" ${ink(0.55)}/><path d="M${f(cx - hw - 1.6)} ${f(top + hh * 0.32)} Q${f(cx + 2)} ${f(top + hh * 0.06)} ${f(cx + hw + 3.4)} ${f(top + hh * 0.2)}" fill="none" stroke="${shade(col, 0.4)}" stroke-width="1.2"/>${detail ? `<path d="M${f(cx + hw - 1)} ${f(top - 1)} q5 -7 9 -3 q-4 0 -7 5Z" fill="#c9bfa8" ${ink(0.35)}/>` : ''}`;
    res.hidesHair = 'crown';
  } else if (o.head === 'strawhat') {
    res.back = `<ellipse cx="${cx}" cy="${f(top + hh * 0.2)}" rx="${f(hw + 13)}" ry="5.4" fill="#8a7440" ${ink(0.5)}/>`;
    res.front = `<path d="M${f(cx - hw - 13)} ${f(top + hh * 0.2)} Q${cx} ${f(top + hh * 0.48)} ${f(cx + hw + 13)} ${f(top + hh * 0.2)} Q${cx} ${f(top + hh * 0.02)} ${f(cx - hw - 13)} ${f(top + hh * 0.2)}Z" fill="#b89a58" ${ink(0.5)}/><path d="M${f(cx - hw * 0.86)} ${f(top + hh * 0.2)} C${f(cx - hw * 0.8)} ${f(top - 8.5)} ${f(cx + hw * 0.8)} ${f(top - 8.5)} ${f(cx + hw * 0.86)} ${f(top + hh * 0.2)} Q${cx} ${f(top + hh * 0.33)} ${f(cx - hw * 0.86)} ${f(top + hh * 0.2)}Z" fill="#c2a562" ${ink(0.5)}/>${detail ? `<path d="M${f(cx - hw * 0.8)} ${f(top + hh * 0.13)} Q${cx} ${f(top + hh * 0.26)} ${f(cx + hw * 0.8)} ${f(top + hh * 0.13)}" fill="none" stroke="#6a5a34" stroke-width="1.3"/><path d="M${f(cx - hw - 9)} ${f(top + hh * 0.22)} Q${cx} ${f(top + hh * 0.42)} ${f(cx + hw + 9)} ${f(top + hh * 0.22)}" fill="none" stroke="#8a7440" stroke-width="0.4" stroke-dasharray="1.4 1"/>` : ''}`;
    res.hidesHair = 'crown';
  } else if (o.head === 'circlet') {
    res.front = `<path d="M${f(cx - hw * 0.93)} ${f(top + hh * 0.36)} Q${cx} ${f(top + hh * 0.2)} ${f(cx + hw * 0.93)} ${f(top + hh * 0.36)}" fill="none" stroke="${shade(o.trim, 0.45)}" stroke-width="2"/><path d="M${f(cx - hw * 0.93)} ${f(top + hh * 0.36)} Q${cx} ${f(top + hh * 0.2)} ${f(cx + hw * 0.93)} ${f(top + hh * 0.36)}" fill="none" stroke="${o.trim}" stroke-width="1.2"/><path d="M${cx} ${f(top + hh * 0.2)} l1.7 2 l-1.7 2 l-1.7 -2Z" fill="${o.jewel ?? '#8a2a2a'}" ${ink(0.35)}/>`;
  } else if (o.head === 'mailcoif') {
    const w = hw + 2.4;
    res.back = `<path d="M${f(cx - w - 1)} ${f(cy + hh + 9)} C${f(cx - w - 3)} ${f(top - 8)} ${f(cx + w + 3)} ${f(top - 8)} ${f(cx + w + 1)} ${f(cy + hh + 9)}Z" fill="#5d6166" ${ink()}/>`;
    res.front = `<path d="M${f(cx - w - 1)} ${f(cy + hh + 8)} C${f(cx - w - 3)} ${f(top - 7.5)} ${f(cx + w + 3)} ${f(top - 7.5)} ${f(cx + w + 1)} ${f(cy + hh + 8)} L${f(cx + hw * 0.8)} ${f(cy + hh * 0.8)} C${f(cx + hw + 1.4)} ${f(cy)} ${f(cx + hw * 0.86)} ${f(top + hh * 0.3)} ${cx} ${f(top + hh * 0.28)} C${f(cx - hw * 0.86)} ${f(top + hh * 0.3)} ${f(cx - hw - 1.4)} ${f(cy)} ${f(cx - hw * 0.8)} ${f(cy + hh * 0.8)}Z" fill="#7d8187" ${ink(0.55)}/>${detail ? `<path d="M${f(cx - w + 1)} ${f(cy + hh * 0.3)} C${f(cx - w)} ${f(top - 2)} ${f(cx + w)} ${f(top - 2)} ${f(cx + w - 1)} ${f(cy + hh * 0.3)} M${f(cx - w + 2.4)} ${f(cy + hh * 0.5)} C${f(cx - w + 2)} ${f(top + 1)} ${f(cx + w - 2)} ${f(top + 1)} ${f(cx + w - 2.4)} ${f(cy + hh * 0.5)}" fill="none" stroke="#33363b" stroke-width="0.5" stroke-dasharray="0.9 0.7" opacity="0.8"/>` : ''}`;
    res.hidesHair = 'top'; res.coversEars = true;
  } else if (o.head === 'kettle') {
    res.back = `<ellipse cx="${cx}" cy="${f(top + hh * 0.26)}" rx="${f(hw + 8)}" ry="3.6" fill="#55595e" ${ink(0.5)}/>`;
    res.front = `<path d="M${f(cx - hw - 8)} ${f(top + hh * 0.26)} Q${cx} ${f(top + hh * 0.46)} ${f(cx + hw + 8)} ${f(top + hh * 0.26)} Q${cx} ${f(top + hh * 0.12)} ${f(cx - hw - 8)} ${f(top + hh * 0.26)}Z" fill="#8a8f96" ${ink(0.5)}/><path d="M${f(cx - hw * 0.9)} ${f(top + hh * 0.24)} C${f(cx - hw * 0.86)} ${f(top - 8)} ${f(cx + hw * 0.86)} ${f(top - 8)} ${f(cx + hw * 0.9)} ${f(top + hh * 0.24)} Q${cx} ${f(top + hh * 0.36)} ${f(cx - hw * 0.9)} ${f(top + hh * 0.24)}Z" fill="#9aa0a8" ${ink(0.5)}/><path d="M${f(cx - hw * 0.55)} ${f(top + hh * 0.06)} Q${f(cx - hw * 0.4)} ${f(top - 4.6)} ${f(cx - 1)} ${f(top - 5.4)}" fill="none" stroke="#f2f0ea" stroke-width="0.9" opacity="0.5"/><path d="M${cx} ${f(top - 6.2)} L${cx} ${f(top + hh * 0.3)}" stroke="#55595e" stroke-width="0.6"/>`;
    res.hidesHair = 'crown';
  }
  void browY; void mixHex;
  return res;
}
