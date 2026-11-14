// 화면 모듈들이 같이 쓰는 작은 도구.
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const root = () => $('#app');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
