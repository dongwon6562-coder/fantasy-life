// 행동 카드에 쓰는 아이콘: 먹선 판화풍 (38단계, 도우미스레드3).
// 판목에 먹을 먹인 덩어리(s)를 찍고, 칼로 파낸 흰 선(c)으로 빛과 결을 낸다. 가는 먹선(l)은 덩어리 밖의 선.
// 색은 글자색(currentColor)을 따르고, 파낸 자리는 비어 있어(마스크) 어떤 바탕에도 맞는다. 24×24 판에 그린다.
// 다른 갈래가 새 행동을 더하면 action.icon에 아래 이름 하나를 적거나, 적지 않으면 BY_ID·WORDS로 짐작한다.
// 예전 이름(play home book … ship)은 모두 남아 있다. 새 이름이 예전 어느 갈래인지는 iconBase(name) (소리가 쓸 수 있게).

/* 덩어리(s)·파낸 선(c, 마스크에서 검게)·먹선(l). c 안에서 fill을 적으면 파낸 면이 된다. */
const I = {
  // ---------- 예전 이름 ----------
  play: {
    s: '<circle cx="7.5" cy="5" r="2.4"/><path d="M6 8.5h3l1.6 5.2 3.2 1.4-.8 1.9-4-1.6-1.2-2.8-1.3 3.4L8.8 21H6.6l-1-5.2 1.1-4.3-2.3 1.2-1-1.7z"/><circle cx="17.5" cy="16.5" r="3.6"/>',
    c: '<path d="M15.6 14.6c1.4.4 2.6 1.6 3 3.1M17.5 12.9v7.2"/><path d="M6.4 4.4a1.4 1.4 0 0 1 1.4-1"/>',
  },
  home: {
    s: '<path d="M1.8 12L12 3.2 22.2 12l-1.5 1.6-1.2-1V21h-15v-8.4l-1.2 1z"/><path d="M15.5 4.2h2.6v4l-2.6-2.2z"/>',
    c: '<path d="M10 21v-4.6a2 2 0 0 1 4 0V21z" fill="#000" stroke="none"/><path d="M6.6 14h2.6v2.4H6.6zM14.8 14h2.6v2.4h-2.6z" fill="#000" stroke="none"/><path d="M5.8 11.2L12 5.9l6.2 5.3"/><path d="M5.5 19h3.2M15.3 19h3.2"/>',
  },
  book: {
    s: '<path d="M2 5.4C5 4 8.6 4.1 11.3 5.8V21c-2.7-1.6-6.3-1.7-9.3-.4z"/><path d="M22 5.4C19 4 15.4 4.1 12.7 5.8V21c2.7-1.6 6.3-1.7 9.3-.4z"/>',
    c: '<path d="M4.2 8.4c1.8-.5 3.6-.4 5.2.4M4.2 11.4c1.8-.5 3.6-.4 5.2.4M4.2 14.4c1.8-.5 3.6-.4 5.2.4M14.6 8.8c1.6-.8 3.4-.9 5.2-.4M14.6 11.8c1.6-.8 3.4-.9 5.2-.4M14.6 14.8c1.6-.8 3.4-.9 5.2-.4"/>',
  },
  body: {
    s: '<circle cx="12" cy="4.3" r="2.5"/><path d="M5 8h14l-.4 2.2-4.4.4.4 4.4 2.6 5.8-2 .9-3.2-5.6-3.2 5.6-2-.9 2.6-5.8.4-4.4-4.4-.4z"/><path d="M2 6.4h2.2v5.4H2zM19.8 6.4H22v5.4h-2.2z"/>',
    c: '<path d="M10.6 9.8h2.8"/><path d="M11.2 3.6a1.3 1.3 0 0 1 1.3-.6"/>',
  },
  sword: {
    s: '<path d="M20.8 2.2l1 1-1.1 5L10.5 18.4 6.6 14.5 16.8 4.3z"/><path d="M4.2 13.6l1.6-1.6 7.2 7.2-1.6 1.6z"/><path d="M5.8 18.2l1.4 1.4-3.6 3.6-1.4-1.4z"/>',
    c: '<path d="M19.6 4.4L9.4 14.6"/>',
  },
  shield: {
    s: '<path d="M12 2l8.6 3.3V11c0 5.4-3.7 9.2-8.6 11-4.9-1.8-8.6-5.6-8.6-11V5.3z"/>',
    c: '<path d="M12 4.4v15.4M5.6 10.6h12.8"/><path d="M6.4 7l5.6-2.1L17.6 7"/>',
  },
  meditate: {
    s: '<circle cx="12" cy="5.4" r="2.5"/><path d="M8.2 9.2h7.6l1.6 6.4 3.6 2.2-.8 2H3.8l-.8-2 3.6-2.2z"/>',
    c: '<path d="M8.6 17.6c2.2-1 4.6-1 6.8 0"/><path d="M10.4 11.4l-1 3.6M13.6 11.4l1 3.6"/>',
    l: '<path d="M12 .8v1M5.4 2.6l.8.8M18.6 2.6l-.8.8"/>',
  },
  magic: {
    s: '<path d="M2.4 20.2L14.2 8.4l1.4 1.4L3.8 21.6z"/><path d="M18 1.6l1.1 3.3 3.3 1.1-3.3 1.1L18 10.4l-1.1-3.3-3.3-1.1 3.3-1.1z"/><path d="M8.6 3l.6 1.8 1.8.6-1.8.6L8.6 7.8 8 6l-1.8-.6L8 4.8zM19.2 13.6l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z"/>',
    c: '<path d="M18 4.2v3.6M16.2 6h3.6"/>',
  },
  herb: {
    s: '<path d="M11.2 22V9h1.6v13z"/><path d="M12 14C7 14.2 4.2 10.6 4.4 6.2 9 6.2 12 9.4 12 14z"/><path d="M12 11c.2-4 2.6-7.2 7.4-7.4.2 4-2.4 7.4-7.4 7.4z"/><path d="M12 19c.6-3 3.2-5.2 7-5.2-.4 3.2-3.4 5.2-7 5.2z"/>',
    c: '<path d="M6.4 8.2c1.8 1.4 3.4 3 4.6 5M17.6 5.4c-1.6 1.2-3.2 3-4.6 4.8M17.4 15.6c-1.4.8-3 1.8-4.4 2.8"/>',
  },
  cook: {
    s: '<path d="M2 10.4h20v1.8h-1.4c-.2 4.6-3.6 8.2-8.6 8.2s-8.4-3.6-8.6-8.2H2z"/><path d="M8 21h8v1.4H8z"/>',
    c: '<path d="M5.6 13.6c.6 2.6 2.8 4.4 5.6 4.6"/>',
    l: '<path d="M8.4 2.6c-1.4 1.6 1.2 3 0 5.2M12 1.8c-1.4 1.8 1.2 3.4 0 6M15.6 2.6c-1.4 1.6 1.2 3 0 5.2"/>',
  },
  coin: {
    s: '<ellipse cx="12" cy="6.4" rx="8.4" ry="3.6"/><path d="M3.6 8.2c1 2 4.4 3.2 8.4 3.2s7.4-1.2 8.4-3.2v4c0 2-3.8 3.6-8.4 3.6s-8.4-1.6-8.4-3.6z"/><path d="M3.6 14.2c1 2 4.4 3.2 8.4 3.2s7.4-1.2 8.4-3.2v4c0 2-3.8 3.6-8.4 3.6s-8.4-1.6-8.4-3.6z"/>',
    c: '<ellipse cx="12" cy="6.4" rx="5.4" ry="1.9"/><path d="M6.2 13.4v1.6M9 14v1.8M12 14.2V16M15 14v1.8M17.8 13.4v1.6M6.2 19.4V21M9 20v1.6M15 20v1.6M17.8 19.4V21"/>',
  },
  labor: {
    s: '<path d="M13.2 2.6l2-1.6 6.8 6.8-1.6 2-2.4-.6-1.6 1.6-3.2-3.2 1.6-1.6z"/><path d="M12 8.6l3.4 3.4L5.2 22.2 1.8 18.8z"/>',
    c: '<path d="M14.6 4.4l4.8 4.8"/><path d="M4 18.8l8.6-8.6"/>',
  },
  wander: {
    s: '<circle cx="12" cy="12" r="10"/>',
    c: '<circle cx="12" cy="12" r="7.6"/><path d="M16.6 7.4l-3 6.2-6.2 3 3-6.2z" fill="#000"/><path d="M12 2.6v1.6M12 19.8v1.6M2.6 12h1.6M19.8 12h1.6"/>',
    l: '',
  },
  visit: {
    s: '<circle cx="8" cy="6.6" r="3.2"/><circle cx="17" cy="7.6" r="2.7"/><path d="M1.6 21c.4-5 3.2-7.6 6.4-7.6s6 2.6 6.4 7.6z"/><path d="M13.6 14.2c1-.6 2.2-.9 3.4-.9 3 0 5.2 2.4 5.4 6.6h-6.6c-.3-2.4-1-4.2-2.2-5.7z"/>',
    c: '<path d="M4.6 18.4c.6-1.6 1.8-2.6 3.4-2.8"/><path d="M6.8 5.6a1.6 1.6 0 0 1 1.6-1.1"/>',
  },
  rest: {
    s: '<path d="M14.8 2.4a9.6 9.6 0 1 0 7 13.8A8 8 0 0 1 14.8 2.4z"/>',
    c: '<path d="M7.4 7.6a6.8 6.8 0 0 0 1 9.6"/><circle cx="9" cy="12" r=".7" fill="#000"/><circle cx="12.4" cy="16.6" r=".9" fill="#000"/>',
    l: '<path d="M16.4 3.6h3.4l-3.4 3.6h3.4"/>',
  },
  farm: {
    s: '<path d="M11.2 22V7h1.6v15z"/><path d="M12 7.6C9.6 6.8 8.4 4.6 8.6 2 11 2.6 12.2 4.8 12 7.6zM12 7.6c2.4-.8 3.6-3 3.4-5.6C13 2.6 11.8 4.8 12 7.6zM12 12.4c-2.6-.8-3.8-3-3.6-5.6 2.6.6 3.8 2.8 3.6 5.6zM12 12.4c2.6-.8 3.8-3 3.6-5.6-2.6.6-3.8 2.8-3.6 5.6zM12 17.2c-2.6-.8-3.8-3-3.6-5.6 2.6.6 3.8 2.8 3.6 5.6zM12 17.2c2.6-.8 3.8-3 3.6-5.6-2.6.6-3.8 2.8-3.6 5.6z"/>',
    l: '<path d="M3 22h18"/>',
  },
  pray: {
    s: '<path d="M12 1.4c1.3 2.2 2.3 3 4.4 3.6-2.1.6-3.1 1.4-4.4 3.6-1.3-2.2-2.3-3-4.4-3.6 2.1-.6 3.1-1.4 4.4-3.6z"/><path d="M9.6 22v-6.4c0-1 .4-1.8 1-2.6l1.4-2.2 1.4 2.2c.6.8 1 1.6 1 2.6V22z"/><path d="M6.6 22l1.6-7.6 2 .4-1.3 7.2zM17.4 22l-1.6-7.6-2 .4 1.3 7.2z"/>',
    c: '<path d="M12 14.6V21"/>',
    l: '<path d="M4 9.6l1.4.8M20 9.6l-1.4.8M12 9.8v.6"/>',
  },
  hunt: {
    s: '<path d="M4.4 2c7.4 3 7.4 17 0 20l-1-1.4c5.6-3 5.6-14.2 0-17.2z"/><path d="M2.4 11.2h15.4l-1.6-2.6 1.4-.8 3.6 4.2-3.6 4.2-1.4-.8 1.6-2.6H2.4z"/>',
    l: '<path d="M4 2.8v18.4"/>',
  },
  travel: {
    s: '<path d="M3.4 21.6c3.6-2.4 5.6-6.4 7.6-10.4 2-4 4.6-6.6 8.4-7.4l.4 1.8c-3.2.8-5.4 3-7.2 6.6-2.2 4.4-4.4 8.6-8.4 11.2z"/><circle cx="3.6" cy="20.4" r="2.2"/><path d="M16.4 1.6l5 1.6-1.6 5-1.4-.5 1-3.2-3.4-1z"/>',
    c: '<path d="M2.8 19.8a1 1 0 0 1 1-.8"/>',
  },
  smith: {
    s: '<path d="M2.6 13.4h14.2l2.8-3.6h1.8l-.8 2.8-2.4 3H6.8z"/><path d="M8.4 16h5v3.6h2.4V22H6v-2.4h2.4z"/><path d="M13.6 2.2l1.4-1.2 5.4 5.4-1.2 1.4-1.6-.2-4.4 4.4-1.8-1.8 4.4-4.4z"/>',
    c: '<path d="M4.6 14.6h10.4"/>',
    l: '<path d="M6.4 9.2l-1-1.6M9.4 8.6V6.8M3.6 10.6l-1.6-.8"/>',
  },
  dungeon: {
    s: '<path d="M2.6 22V10.4a9.4 9.4 0 0 1 18.8 0V22z"/>',
    c: '<path d="M7.4 22v-9a4.6 4.6 0 0 1 9.2 0v9z" fill="#000" stroke="none"/><path d="M4.8 10.2l2.6.8M5.8 6.6l2.4 1.6M8.6 3.8l1.6 2.4M12 2.9V5.6M15.4 3.8l-1.6 2.4M18.2 6.6l-2.4 1.6M19.2 10.2l-2.6.8M4.6 15.6h2.8M16.6 15.6h2.8M4.6 19h2.8M16.6 19h2.8"/>',
    l: '<path d="M1 22h22"/>',
  },
  heart: {
    s: '<path d="M12 21.4S2.6 15.6 2.2 9.4C2 5.8 4.6 3.4 7.4 3.4c2 0 3.6 1.2 4.6 2.8 1-1.6 2.6-2.8 4.6-2.8 2.8 0 5.4 2.4 5.2 6-.4 6.2-9.8 12-9.8 12z"/>',
    c: '<path d="M5 8.6c.2-1.6 1.2-2.6 2.6-2.8"/><path d="M6.4 12.6c1.4 2.4 3.4 4.4 5.6 6"/>',
  },
  scroll: {
    s: '<path d="M6.4 2.6h12.4a2.6 2.6 0 0 1 0 5.2H17V19a2.6 2.6 0 0 1-2.6 2.6H5.2a2.6 2.6 0 0 1 0-5.2h1.2z"/>',
    c: '<path d="M9.4 7.4h5M9.4 10.4h5M9.4 13.4h3.6"/><path d="M17 7.8V5.2a2.6 2.6 0 0 0-2.4-2.6"/><path d="M6.4 16.4h3.2v2.6a2.6 2.6 0 0 1-2.6 2.6"/>',
  },
  crown: {
    s: '<path d="M2 7.6l5 4.4L12 3.4l5 8.6 5-4.4-2 11.8H4z"/><path d="M4 20.6h16v1.8H4z"/>',
    c: '<path d="M5.6 17.4h12.8"/><circle cx="12" cy="13.6" r="1.3" fill="#000"/><circle cx="7.6" cy="14.6" r=".8" fill="#000"/><circle cx="16.4" cy="14.6" r=".8" fill="#000"/>',
  },
  gear: {
    s: '<path d="M10.4 1.8h3.2l.5 2.8 1.9.8 2.3-1.6 2.3 2.3-1.6 2.3.8 1.9 2.8.5v3.2l-2.8.5-.8 1.9 1.6 2.3-2.3 2.3-2.3-1.6-1.9.8-.5 2.8h-3.2l-.5-2.8-1.9-.8-2.3 1.6-2.3-2.3 1.6-2.3-.8-1.9-2.8-.5v-3.2l2.8-.5.8-1.9-1.6-2.3 2.3-2.3 2.3 1.6 1.9-.8z"/>',
    c: '<circle cx="12" cy="12" r="3.3" fill="#000"/><circle cx="12" cy="12" r="6"/>',
  },
  ship: {
    s: '<path d="M1.8 15.6h20.4l-3.4 5.4H5.2z"/><path d="M11.2 1.6h1.6v14h-1.6z"/><path d="M13.4 3.4c3.4 2.4 5.4 6 5.8 10.4h-5.8zM10.6 5.4c-2.6 2-4.2 4.8-4.6 8.4h4.6z"/>',
    c: '<path d="M4.4 18.2h15.2"/><path d="M15 6.8c1.4 1.6 2.4 3.6 2.8 5.6"/>',
  },

  // ---------- 새 이름 (38단계) ----------
  quill: {
    s: '<path d="M21.6 2.2c-6.4.6-11.4 4.8-13.6 11.6l1.8.8 1.2-1.4 1.4.6c4.4-2.8 7.6-6.6 9.2-11.6z"/><path d="M8 13.8l1.8.8L5 22l-1-.6z"/>',
    c: '<path d="M19.4 4.2c-3.6 2.4-6.4 5.6-8.6 9.6M13.4 6.4l1.6 1.4M11.4 9l1.6 1.2"/>',
    l: '<path d="M2 22h8"/>',
  },
  mask: {
    s: '<path d="M2 7.4c3.4-1.2 6.8-1.2 10 .6 3.2-1.8 6.6-1.8 10-.6-.2 5.4-2.4 9.2-6.4 9.6-1.6.2-2.8-.8-3.6-2.4-.8 1.6-2 2.6-3.6 2.4C4.4 16.6 2.2 12.8 2 7.4z"/>',
    c: '<path d="M5 10.4c1-.8 2.4-1 3.8-.4l-.6 1.6c-1 .4-2.2.2-3.2-1.2zM19 10.4c-1-.8-2.4-1-3.8-.4l.6 1.6c1 .4 2.2.2 3.2-1.2z" fill="#000"/><path d="M12 9.6v3"/>',
    l: '<path d="M2 7.4L.6 5.4M22 7.4l1.4-2"/>',
  },
  key: {
    s: '<circle cx="7" cy="7" r="5.4"/><path d="M10.2 9.4l1.4-1.4 10.4 10.4v3.4h-3.4l-1-1v-2h-2v-2h-2z"/>',
    c: '<circle cx="6.4" cy="6.4" r="1.8" fill="#000"/><path d="M12.6 11.2l7.4 7.4"/>',
  },
  dagger: {
    s: '<path d="M12 1.4l2 3.4v9.6h-4V4.8z"/><path d="M6.2 14.4h11.6v2H6.2z"/><path d="M10.8 16.4h2.4v4.4h-2.4z"/><circle cx="12" cy="21.6" r="1.6"/>',
    c: '<path d="M12 4v9.4"/>',
  },
  chain: {
    s: '<path d="M8.8 2.6a4.4 4.4 0 0 1 6.2 0l1.2 1.2a4.4 4.4 0 0 1 0 6.2l-1.6 1.6-1.8-1.8 1.6-1.6a1.8 1.8 0 0 0 0-2.6l-1.2-1.2a1.8 1.8 0 0 0-2.6 0L8.4 6.6 6.6 4.8z"/><path d="M15.2 21.4a4.4 4.4 0 0 1-6.2 0l-1.2-1.2a4.4 4.4 0 0 1 0-6.2l1.6-1.6 1.8 1.8-1.6 1.6a1.8 1.8 0 0 0 0 2.6l1.2 1.2a1.8 1.8 0 0 0 2.6 0l2.2-2.2 1.8 1.8z"/><path d="M9.6 13.2l3.6-3.6 1.8 1.8-3.6 3.6z"/>',
  },
  tower: {
    s: '<path d="M8 22V9.4L6.6 8V5.2h1.8v1.4h1.6V5.2h1.2V1.6h1.6v3.6h1.2v1.4h1.6V5.2h1.8V8L16 9.4V22z"/>',
    c: '<path d="M10.6 22v-3.6a1.4 1.4 0 0 1 2.8 0V22z" fill="#000" stroke="none"/><path d="M11.2 11.6h1.6v2.6h-1.6z" fill="#000" stroke="none"/><path d="M9.2 9.4h5.6"/>',
    l: '<path d="M12 1.6l3 1.4-3 1.2M3 22h18"/>',
  },
  hammer: {
    s: '<path d="M4.2 3.4h9.6l3 2v3.2h-3l-1.4-1.4H9.2v2.2H6V7.2H4.2z"/><path d="M6.2 9.4h2.8v12.4H6.2z"/>',
    c: '<path d="M5.6 5.2h6.6"/><path d="M7.6 11.4v8.4"/>',
    l: '<path d="M14 22h7M15.6 22v-4h3.8v4"/>',
  },
  lute: {
    s: '<path d="M14.2 9.8c3 3 3 7.6.2 10.4s-7.4 2.8-10.4-.2-3-7.6-.2-10.4 7.4-2.8 10.4.2z"/><path d="M13 9.4l7-7 1.6 1.6-7 7z"/><path d="M19.4 1.4l3.2 3.2-1.2 1.2-3.2-3.2z"/>',
    c: '<circle cx="9.2" cy="14.8" r="2" fill="#000"/><path d="M6 18l7.6-7.6M5.2 16.8l7.2-7.2"/>',
  },
  bowl: {
    s: '<path d="M2 10.6h20c-.2 5.2-4.2 9-10 9s-9.8-3.8-10-9z"/><path d="M8 19.6h8v2.2H8z"/>',
    c: '<path d="M5 12.8c.8 2.6 3.4 4.4 7 4.6"/>',
    l: '<path d="M10 2.6c-1.2 1.6 1 2.8 0 5M14 2.6c-1.2 1.6 1 2.8 0 5"/>',
  },
  horse: {
    s: '<path d="M7.6 2.4l1.8 2.4c3-.4 5.6.6 7.6 2.8l4.4 5.6-1 2.6-2.6-.2-2.8-3c-.6 2.8-2.2 4.4-4.6 5.4l.6 4H8.4l-.8-3.4-2.2.2.2 3.2H3.2l-.4-5.4c-.8-3.6.4-6.8 3.2-9.6l-.4-3z"/>',
    c: '<path d="M7.6 6.4c-1.8 2-2.6 4.6-2.2 7.6"/><circle cx="13.8" cy="8.4" r=".8" fill="#000"/>',
  },
  wing: {
    s: '<path d="M2 18.6C4.6 9.8 11 4.2 21.6 2.4c-.2 3-1.4 5.4-3.4 7 1-.1 1.8-.2 2.6-.4-.8 2.4-2.4 4-4.6 4.8.8.2 1.6.2 2.4.2-1.4 2.2-3.6 3.4-6.4 3.6L4 21.4z"/>',
    c: '<path d="M5.4 17.6c3.6-5.4 8.2-9.4 13.8-12M10 14.2c2.4-.8 4.8-1.8 7.2-3.4M13 16c1.4-.2 2.6-.6 3.8-1.2"/>',
  },
  skull: {
    s: '<path d="M12 2C6.8 2 3.4 5.4 3.4 10c0 2.8 1.2 4.6 3 5.8V19h2v2.4h1.8V19h1v2.4h1.6V19h1v2.4h1.8V19h2v-3.2c1.8-1.2 3-3 3-5.8C20.6 5.4 17.2 2 12 2z"/>',
    c: '<path d="M6.6 10.4c0-1.4 1-2.2 2.2-2.2s2 1 2 2.2-1 2.2-2.2 2.2-2-.8-2-2.2zM13.2 10.4c0-1.2.8-2.2 2-2.2s2.2.8 2.2 2.2-.8 2.2-2 2.2-2.2-1-2.2-2.2z" fill="#000" stroke="none"/><path d="M12 13.2l-1 2.2h2z" fill="#000" stroke="none"/><path d="M6 5.6c1-1.2 2.4-2 4-2.2"/>',
  },
  candle: {
    s: '<path d="M8.8 8.6h6.4v11.2H8.8z"/><path d="M5 19.4h14v2.6H5z"/><path d="M12 1.4c1.8 2 2.4 3.4 2 4.8-.3 1-1 1.6-2 1.6s-1.7-.6-2-1.6c-.4-1.4.2-2.8 2-4.8z"/>',
    c: '<path d="M10.4 10v8.4"/><path d="M12 4.4c.6.8.8 1.4.6 2"/><path d="M15.2 10.4c-.8.2-1 1-1 2"/>',
  },
  scale: {
    s: '<path d="M11.2 3.6h1.6v16h-1.6z"/><path d="M3 5.2h18v1.6H3z"/><path d="M7 21h10v1.6H7z"/><circle cx="12" cy="3" r="1.6"/><path d="M1.4 13.4h7c-.2 2-1.6 3.2-3.5 3.2s-3.3-1.2-3.5-3.2zM15.6 13.4h7c-.2 2-1.6 3.2-3.5 3.2s-3.3-1.2-3.5-3.2z"/>',
    l: '<path d="M4.9 6.8l-3 6.6M4.9 6.8l3 6.6M19.1 6.8l-3 6.6M19.1 6.8l3 6.6"/>',
  },
  seal: {
    s: '<path d="M9.4 2.4h5.2l-.8 7.2h-3.6z"/><path d="M7.4 9.6h9.2l1.4 4.4H6z"/><path d="M4.6 14h14.8v2.2H4.6z"/><path d="M5 18.4h14l1.4 3.6H3.6z"/>',
    c: '<path d="M11 4.4l-.4 4.4"/><path d="M8.4 20.2h7.2"/>',
  },
  banner: {
    s: '<path d="M3.8 1.6h1.8v20.8H3.8z"/><path d="M5.6 3h14.8l-3.2 5 3.2 5H5.6z"/>',
    c: '<path d="M10.6 5.4l1.4 2.2 2.4.2-1.8 1.6.6 2.4-2.6-1.4-2.6 1.4.6-2.4-1.8-1.6 2.4-.2z" fill="#000" stroke="none"/>',
    l: '<path d="M1.6 22.4h6"/>',
  },
  tent: {
    s: '<path d="M12 2.6l10 18.6H2z"/>',
    c: '<path d="M12 9.4l-3.4 11.8h6.8z" fill="#000" stroke="none"/><path d="M12 5.4L4.8 18.8M12 5.4l7.2 13.4"/>',
    l: '<path d="M12 2.6V.8M1 21.2h22"/>',
  },
  flag: {
    s: '<path d="M4 1.6h1.8v20.8H4z"/><path d="M5.8 3c3.2-1.6 5.8 1.4 9 0 2-.8 3.6-.8 5.6 0v9.6c-2-.8-3.6-.8-5.6 0-3.2 1.4-5.8-1.6-9 0z"/>',
    c: '<path d="M8 6c2.2-.4 4 1.2 6.4.6M8 9c2.2-.4 4 1.2 6.4.6"/>',
  },
  torch: {
    s: '<path d="M10 11.4h4l-1 10.6h-2z"/><path d="M8.6 9.4h6.8l-.6 2.6H9.2z"/><path d="M12 1c3.2 2.4 4.6 4.8 4 7-.4 1.2-1.4 1.8-4 1.8S8.4 9.2 8 8c-.6-2.2.8-4.6 4-7z"/>',
    c: '<path d="M12 4.6c1.2 1.2 1.6 2.4 1.2 3.6"/><path d="M11.4 13.4l-.2 6"/>',
  },
  eye: {
    s: '<path d="M1.2 12C3.8 7.4 7.6 5 12 5s8.2 2.4 10.8 7c-2.6 4.6-6.4 7-10.8 7s-8.2-2.4-10.8-7z"/>',
    c: '<circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.8" fill="#000"/><path d="M4.2 12c1.4-2.4 3.4-4 5.8-4.6"/>',
  },
  tankard: {
    s: '<path d="M4 5.6h11.6v15.6H4z"/><path d="M15.6 8.4h2.6a2.8 2.8 0 0 1 2.8 2.8v3.4a2.8 2.8 0 0 1-2.8 2.8h-2.6v-2.2h2.4a.8.8 0 0 0 .8-.8v-3a.8.8 0 0 0-.8-.8h-2.4z"/><path d="M3.4 3.6c1.4-1.6 3.4-2 5-1 1.6-1.2 3.8-1 5 .2 1.2-.4 2.4.2 2.8 1.6v1.4H3.4z"/>',
    c: '<path d="M6.6 8.4v10.4M9.8 8.4v10.4M13 8.4v10.4"/>',
  },
  spool: {
    s: '<path d="M4.6 2.4h12.8v2.6H4.6zM4.6 19h12.8v2.6H4.6z"/><path d="M6.6 5h8.8v14H6.6z"/>',
    c: '<path d="M6.6 7.4l8.8 1.4M6.6 10.2l8.8 1.4M6.6 13l8.8 1.4M6.6 15.8l8.8 1.4"/>',
    l: '<path d="M15.4 17c3 0 4.6 1.6 4.8 5M19.6 2v5.6l1.2-1.4"/>',
  },
  fish: {
    s: '<path d="M2.4 12c2.6-3.8 6.2-5.6 10.6-5.6 3.4 0 6 1.4 7.6 3.4l2.4-2.6v9.6l-2.4-2.6c-1.6 2-4.2 3.4-7.6 3.4-4.4 0-8-1.8-10.6-5.6z"/>',
    c: '<circle cx="6.6" cy="11" r="1" fill="#000"/><path d="M9.6 8.4c1 2.4 1 4.8 0 7.2M12.4 9.6l1.6 1.4-1.6 1.4M15 9.6l1.6 1.4-1.6 1.4"/>',
  },
  pick: {
    s: '<path d="M2.4 9.4C6.4 4 12.6 2 19.4 3.6l.4 2.2C13.6 4.8 8.2 6.6 4.4 10.6z"/><path d="M10 6.4l2.2-1.2 9.4 15.6-2.2 1.4z"/>',
    c: '<path d="M5.4 8.2c3-2.4 6.6-3.6 10.4-3.6"/>',
  },
  flask: {
    s: '<path d="M9.2 1.8h5.6v1.8h-.8v5.2l6 9.8c.8 1.4-.2 3.2-1.8 3.2H5.8c-1.6 0-2.6-1.8-1.8-3.2l6-9.8V3.6h-.8z"/>',
    c: '<path d="M6.6 16h10.8" /><path d="M10 13.4l.6.6M13.4 17.4l.8.8M9 18.6l.6.6"/><path d="M12 3.6v5.4"/>',
  },
  wheel: {
    s: '<circle cx="12" cy="12" r="10"/>',
    c: '<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="12" r="2" fill="#000"/><path d="M12 4.6v5.4M12 14v5.4M4.6 12H10M14 12h5.4M6.8 6.8l3.8 3.8M13.4 13.4l3.8 3.8M17.2 6.8l-3.8 3.8M10.6 13.4l-3.8 3.8"/>',
  },
  compass: {
    s: '<path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z"/>',
    c: '<path d="M12 4.6v14.8M4.6 12h14.8"/><circle cx="12" cy="12" r="1.4" fill="#000"/>',
    l: '<circle cx="12" cy="12" r="7.2"/>',
  },
  lantern: {
    s: '<path d="M8.4 4.4h7.2l1.4 3H7z"/><path d="M7.4 7.4h9.2v11.2H7.4z"/><path d="M6.4 18.6h11.2v2.6H6.4z"/>',
    c: '<path d="M9.8 9.6h4.4v6.8H9.8z" fill="#000" stroke="none"/><path d="M8.6 8.6v8.8M15.4 8.6v8.8"/>',
    l: '<path d="M10 4.4a2 2 0 0 1 4 0M12 1.6v.8"/><path d="M12 11.2c.8.8 1.2 1.6.8 2.6-.4.6-1.2.6-1.6 0-.4-1 0-1.8.8-2.6z" stroke-width="0" fill="currentColor"/>',
  },
  rune: {
    s: '<path d="M6.6 22L5 9.4C4.8 5 7.6 1.8 12 1.8s7.2 3.2 7 7.6L17.4 22z"/>',
    c: '<path d="M12 5v13M12 7.6l3.2 2.6M12 11.4l-3.2 2.6M12 14.6l3.2 2.4"/>',
    l: '<path d="M2.6 22h18.8"/>',
  },
  egg: {
    s: '<path d="M12 1.8c4.2 0 7.4 6 7.4 11 0 4.8-3.2 8.4-7.4 8.4s-7.4-3.6-7.4-8.4c0-5 3.2-11 7.4-11z"/>',
    c: '<path d="M6.8 12.8l2.4-1.6 2 1.8 2.2-2 2.2 1.8 1.8-1.4"/><path d="M8 7.4c.6-1.6 1.6-2.8 2.8-3.4"/>',
  },
  letter: {
    s: '<path d="M2 5h20v14H2z"/>',
    c: '<path d="M2.6 5.8L12 13l9.4-7.2M2.6 18.2l7-6.2M21.4 18.2l-7-6.2"/>',
    l: '',
  },
  dice: {
    s: '<path d="M3 7.6L11.2 3.4l8 4.2v8.8l-8 4.4L3 16.4z"/>',
    c: '<path d="M3.6 7.8l7.6 4 7.4-4M11.2 11.8v8.4"/><circle cx="11.2" cy="7.6" r=".9" fill="#000"/><circle cx="6.4" cy="12.4" r=".9" fill="#000"/><circle cx="8.6" cy="15.8" r=".9" fill="#000"/><circle cx="15.2" cy="13.4" r=".9" fill="#000"/>',
  },
  mortar: {
    s: '<path d="M3 11h18v1.6c0 4-3 7.2-7 7.6v1.6h-4v-1.6c-4-.4-7-3.6-7-7.6z"/><path d="M13.6 9.4L19.4 1.6l1.8 1.2-5.4 7.6z"/>',
    c: '<path d="M5.8 13.6c.6 2.4 2.6 4.2 5.2 4.6"/>',
  },
  sheaf: {
    s: '<path d="M11.2 9.6h1.6V22h-1.6zM11.4 10l-4 11.4-1.6-.4 3.8-11.2zM12.6 10l4 11.4 1.6-.4-3.8-11.2z"/><path d="M12 1.6c1.6 1.6 2 3.6 1.2 5.6L12 9.6l-1.2-2.4c-.8-2-.4-4 1.2-5.6zM7.4 3.4c1.8 1 2.8 2.8 2.6 5l-.4 2.2-1.8-1.6C6.4 7.6 6.2 5.4 7.4 3.4zM16.6 3.4c1.2 2 1 4.2-.4 5.6L14.4 10.6 14 8.4c-.2-2.2.8-4 2.6-5z"/><path d="M7.6 13h8.8v2H7.6z"/>',
  },
  sheep: {
    s: '<path d="M6 8.2c.6-2 2.6-3 4.4-2.4 1-1.4 3.2-1.6 4.4-.4 1.6-.4 3.2.6 3.6 2.2 1.6.6 2.4 2.4 1.8 4-.4 1.6-2 2.4-3.4 2.2-1 1.2-2.8 1.6-4.2.8-1.4.8-3.4.6-4.4-.6-1.6 0-3-1.2-3-2.8s1.2-2.8 2.4-3z"/><path d="M2.6 9.6c0-1.6 1-2.6 2.4-2.6l1 1.2-.2 3.6c-1.6 0-3.2-.6-3.2-2.2z"/><path d="M7.4 14.2h1.8v7H7.4zM15 14.2h1.8v7H15z"/>',
    c: '<path d="M8.4 9c.8-.6 1.8-.6 2.6 0M12.4 8c.8-.6 1.8-.6 2.6 0M10.6 12c.8-.6 1.8-.6 2.6 0"/>',
  },
  hourglass: {
    s: '<path d="M4.6 1.6h14.8v2.2H4.6zM4.6 20.2h14.8v2.2H4.6z"/><path d="M6.4 3.8h11.2c0 4-2 6.4-4.4 8.2 2.4 1.8 4.4 4.2 4.4 8.2H6.4c0-4 2-6.4 4.4-8.2C8.4 10.2 6.4 7.8 6.4 3.8z"/>',
    c: '<path d="M8.4 5.4c.4 2.4 1.6 4 3.6 5.6 2-1.6 3.2-3.2 3.6-5.6z" fill="#000" stroke="none"/><path d="M12 13.4v3"/><path d="M9.6 18.6h4.8l-2.4-1.8z" fill="#000" stroke="none"/>',
  },
  grave: {
    s: '<path d="M5.6 20V9.6C5.6 5.4 8.4 2.6 12 2.6s6.4 2.8 6.4 7V20z"/><path d="M2.6 20h18.8v2H2.6z"/>',
    c: '<path d="M12 6.4v8.4M8.8 9.2h6.4"/><path d="M7.4 9.4c0-2 .8-3.6 2.2-4.4"/>',
  },
  ring: {
    s: '<path d="M12 7c4.4 0 7.8 3.2 7.8 7.4S16.4 21.8 12 21.8s-7.8-3.2-7.8-7.4S7.6 7 12 7z"/><path d="M9.2 2.4h5.6L16.6 5 12 8.2 7.4 5z"/>',
    c: '<path d="M12 9.6c3 0 5.2 2.2 5.2 4.8S15 19.2 12 19.2s-5.2-2.2-5.2-4.8S9 9.6 12 9.6z" fill="#000" stroke="none"/><path d="M9.6 4.8h4.8"/>',
  },
  pact: {
    s: '<path d="M1.4 10.4l4-3.4 4 1.4 3.4-1.6 4.2 1 5.6 3.4-1.2 2-2.6.2-4.8 5.4c-.8.8-2 .8-2.8 0l-.4-.4-.6.6c-.8.6-1.8.6-2.4 0l-.4-.4-.4.2c-.8.4-1.8.2-2.2-.6l-.2-.4c-.8.2-1.6-.2-1.8-1L1 14.2z"/>',
    c: '<path d="M9.4 8.4l-2.6 2.4c-.6.8.2 1.8 1 1.4l3.6-2.2 4.6 4.2M8 13.6l2.4 2.4M6.2 14.8l1.8 1.8"/>',
  },
  door: {
    s: '<path d="M4.4 22V7.6C4.4 4 7.6 1.6 12 1.6s7.6 2.4 7.6 6V22z"/>',
    c: '<path d="M8.4 22V9a3.6 3.6 0 0 1 7.2 0v13z" fill="#000" stroke="none"/><path d="M12 6v-2"/>',
    l: '<path d="M2 22h20"/><circle cx="14" cy="15" r=".9" fill="currentColor" stroke="none"/>',
  },
  crystal: {
    s: '<path d="M12 1.4l6 7.4-6 13.8-6-13.8z"/>',
    c: '<path d="M6.4 8.8h11.2M12 1.8v20.4M9.2 8.8l2.8-6.6 2.8 6.6"/>',
    l: '<path d="M2.4 5.4l1.6.6M21.6 5.4l-1.6.6M3.4 14.4l1.4-.8M20.6 14.4l-1.4-.8"/>',
  },
  dragon: {
    s: '<path d="M2 14.4c2.6-.6 4.6-2 6-4.4L6.4 6.4l3.4 1.4C11.4 4 14.6 2.2 18.6 2.6l-1.4 1.6 3 .6-2.4 1.4 2.8 1.4c-1.2 1.4-3 2-5 1.8-.2 4.2-2.6 7.8-6.2 9.8l1.6 2.8-3-1.2-.8 2.4-1.4-3c-1.6.4-3.4.4-5-.2z"/>',
    c: '<circle cx="16.4" cy="5.6" r=".8" fill="#000"/><path d="M5 15.2c2.4-.8 4.4-2.4 5.8-4.6M8.8 16.2c1.6-1 3-2.4 3.8-4"/>',
  },
  griffin: {
    s: '<path d="M14 3.2c1.6-.6 3.4 0 4.2 1.4l3 1-2.6 1.4c0 2-1 3.6-2.6 4.6l-.6 3.4 2 5.8h-2.2l-2.2-4.6-3 .6-1.4 4H6.4l1-5.2C4.6 14.6 3 12.6 2.6 9.8c2.6 1.2 5.2 1.4 7.6.6l1.4-3c.4-2 1.2-3.6 2.4-4.2z"/>',
    c: '<circle cx="16" cy="5.4" r=".8" fill="#000"/><path d="M4.4 11.2c2 .8 4 .8 6 .2M6.4 13c1.6.4 3.2.4 4.6 0"/>',
  },
  cart: {
    s: '<path d="M2 6.4h15.6v8.8H2z"/><path d="M17.6 9.4H23v1.6h-5.4z"/><circle cx="6" cy="18" r="3.4"/><circle cx="14.6" cy="18" r="3.4"/>',
    c: '<path d="M2.6 9h14.4M2.6 11.8h14.4"/><circle cx="6" cy="18" r="1.4" fill="#000"/><circle cx="14.6" cy="18" r="1.4" fill="#000"/>',
  },
  anvil: {
    s: '<path d="M2 6.4h14.4c0 2 1.6 3.4 5.6 3.4v1.8c-3 .2-5 1.2-5.8 3H7.6c-.6-2-2.6-3.4-5.6-3.8z"/><path d="M8 14.6h8v2.8h2.6V21H5.4v-3.6H8z"/>',
    c: '<path d="M3.6 8.2h11.4"/>',
  },
  bread: {
    s: '<path d="M2.4 15.8c0-5.4 4.4-9.2 9.6-9.2s9.6 3.8 9.6 9.2v2.6H2.4z"/>',
    c: '<path d="M7.4 10.2l1.8 3M11.4 9.2l1.6 3.2M15.4 10l1.6 3"/><path d="M4.4 16.4h15.2"/>',
  },
  cauldron: {
    s: '<path d="M3 9.4h18v1.4c0 5.4-3.6 9-9 9s-9-3.6-9-9z"/><path d="M1.6 8h20.8v1.8H1.6z"/><path d="M5.4 18.4l-1.2 3.4h2l1.4-2.6zM18.6 18.4l1.2 3.4h-2l-1.4-2.6z"/>',
    c: '<path d="M5.6 12c.4 2.8 2.4 4.8 5.2 5.2"/>',
    l: '<circle cx="9" cy="4.6" r="1.4"/><circle cx="14" cy="3.2" r="1"/><circle cx="12.6" cy="6" r=".7"/>',
  },
  boot: {
    s: '<path d="M6.4 2h8v10.6l5.8 2.6c1.4.6 2.2 2 2.2 3.4V21H2.6v-5.6L6.4 13z"/>',
    c: '<path d="M7.6 5h5.6M7.6 7.8h5.6"/><path d="M3.4 18.2h18.2"/>',
  },
  owl: {
    s: '<path d="M5 3.4l2.6 1.8C8.8 4.6 10.4 4.2 12 4.2s3.2.4 4.4 1L19 3.4l-.2 4c1 1.4 1.6 3.2 1.6 5.2 0 5-3.6 8.8-8.4 8.8s-8.4-3.8-8.4-8.8c0-2 .6-3.8 1.6-5.2z"/>',
    c: '<circle cx="8.6" cy="10" r="2.4"/><circle cx="15.4" cy="10" r="2.4"/><circle cx="8.6" cy="10" r=".8" fill="#000"/><circle cx="15.4" cy="10" r=".8" fill="#000"/><path d="M12 12.4l-1 1.8h2zM8.4 16.4c1 .8 2.2 1.2 3.6 1.2s2.6-.4 3.6-1.2"/>',
  },
  sun: {
    s: '<circle cx="12" cy="12" r="5.4"/><path d="M11 .8h2l-.4 3.6h-1.2zM11 23.2h2l-.4-3.6h-1.2zM.8 11v2l3.6-.4v-1.2zM23.2 11v2l-3.6-.4v-1.2zM3.8 5.2l1.4-1.4 2.4 2.8-.8.8zM20.2 18.8l-1.4 1.4-2.4-2.8.8-.8zM5.2 20.2l-1.4-1.4 2.8-2.4.8.8zM18.8 3.8l1.4 1.4-2.8 2.4-.8-.8z"/>',
    c: '<path d="M9.4 10.4c.6-1 1.6-1.6 2.6-1.6"/>',
  },
};

// 새 이름 → 예전 갈래 (소리·옛 표가 쓸 수 있게)
const BASE = {
  quill: 'book', mask: 'shield', key: 'shield', dagger: 'sword', chain: 'labor', tower: 'magic', hammer: 'labor', lute: 'play', bowl: 'coin',
  horse: 'travel', wing: 'travel', skull: 'pray', candle: 'pray', scale: 'book', seal: 'crown', banner: 'crown', tent: 'home', flag: 'crown',
  torch: 'sword', eye: 'wander', tankard: 'cook', spool: 'labor', fish: 'ship', pick: 'labor', flask: 'herb', wheel: 'travel', compass: 'wander',
  lantern: 'wander', rune: 'magic', egg: 'hunt', letter: 'book', dice: 'coin', mortar: 'herb', sheaf: 'farm', sheep: 'farm', hourglass: 'rest',
  grave: 'pray', ring: 'heart', pact: 'heart', door: 'visit', crystal: 'magic', dragon: 'magic', griffin: 'hunt', cart: 'travel', anvil: 'smith',
  bread: 'cook', cauldron: 'herb', boot: 'travel', owl: 'book', sun: 'pray',
};
export const iconBase = (name) => (BASE[name] ?? (I[name] ? name : 'scroll'));
export const ICON_NAMES = Object.keys(I);

const BY_ID = {
  play: 'play', help_home: 'home', study: 'book', train_body: 'body', sword_father: 'sword', sword_guard: 'shield',
  meditate: 'meditate', magic_lesson: 'magic', herbs: 'herb', inn_kitchen: 'cook', day_labor: 'labor',
  wander: 'wander', visit: 'visit', rest: 'rest',
  peoples_custom: 'visit', peoples_rite: 'pray',
  // 38단계: 예전에 두루마리로 떨어지던 행동들
  housing: 'home', harfen_dojo: 'sword', verden_yard: 'shield', leocast_dojo: 'sword', harfen_library: 'owl', leocast_library: 'owl',
  leocast_tower: 'tower', slums: 'bowl', crime_fraud: 'dice', crime_blackmail: 'letter', faction_door: 'door', gear: 'anvil',
  realm_office: 'seal', eisen_academy: 'owl', solaris_mass: 'candle', serenia_lecture: 'crystal', barka_exchange: 'coin', graubel_watch: 'tower',
  eisen_arena: 'sword', solaris_pilgrims: 'boot', serenia_teahouse: 'tankard', barka_harbor: 'ship', silverleaf_tree: 'herb', fur_trial: 'skull',
  court_plot: 'mask', circle_exam: 'crystal', party_quest: 'banner', tag_along: 'boot', beg_story: 'bowl', mud_play: 'play', sea_bounty: 'ship',
  research: 'flask', kin_will: 'seal', repute_clear: 'scale', mentor_heritage: 'scroll', seal_study: 'rune', tower_exam: 'tower', tower_craft: 'crystal',
  explore_give: 'compass', arts_begin: 'quill', elder_memoir: 'quill', oath_pact: 'pact', omen_preach: 'eye', law_sue: 'scale', school_exam: 'owl',
  letters_write: 'letter', letters_forge: 'quill', aftermath_petition: 'seal', secret_alias: 'mask', secret_mask: 'mask', secret_night: 'mask',
  lineage_motto: 'banner', lineage_branch: 'tent', heist_crew: 'key', heist_scout: 'eye', haunt_item: 'skull', revolt_stir: 'torch', revolt_raid: 'torch',
  herd_rustle: 'sheep', frontier_charter: 'seal', exile_petition: 'seal', exile_settle: 'tent', exile_escape: 'boot', exile_flee: 'boot', exile_plot: 'mask',
  cuisine_create: 'cauldron', spy_seek: 'eye', spy_train: 'dagger', spy_cover: 'mask', spy_task: 'letter', spy_quit: 'door', claim_search: 'lantern',
  claim_hide: 'mask', apo_brew: 'mortar', relic_trail: 'lantern', noah_archive: 'owl', noah_seek: 'hourglass', dragonname_study: 'dragon',
  dragonname_call: 'dragon', after_rename: 'quill', envoy_mission: 'seal', envoy_resign: 'door', ruin_book: 'rune', builder_seek: 'hammer',
  builder_exam: 'hammer', carrier_haul: 'cart', carrier_cart: 'cart', hunter_license: 'seal', mount_brood: 'egg', mount_courier: 'griffin', mount_leave: 'griffin',
  // 다른 갈래보다 더 맞는 그림
  crime_pickpocket: 'key', crime_burglary: 'key', crime_assassinate: 'dagger', crime_snoop: 'eye', crime_lie_low: 'mask', gang_job: 'dagger', gang_seek: 'mask',
  jail_escape: 'chain', jail_labor: 'chain', jail_endure: 'chain', jail_talk: 'chain', bondage_serve: 'chain', bondage_escape: 'chain', bondage_manumit: 'chain',
  bondage_ransom: 'chain', bondage_market: 'chain', bondage_drive: 'chain', bondage_rescue: 'chain', poor_beg: 'bowl', poor_soup: 'bowl', poor_alms: 'bowl',
  beast_ride: 'horse', herd_steed: 'horse', beast_buy: 'horse', beast_sell: 'horse', mount_fly: 'griffin', mount_nest: 'egg', mount_join: 'griffin', mount_sortie: 'griffin',
  voc_busk: 'lute', troupe_join: 'lute', troupe_found: 'lute', troupe_manage: 'lute', troupe_show: 'lute', arts_work: 'quill', arts_read: 'book', na_write: 'quill',
  inn_work: 'tankard', inn_open: 'tankard', inn_manage: 'tankard', brew_make: 'tankard', brew_cellar: 'tankard', deep_tavern: 'tankard',
  harbor_fish: 'fish', harbor_cure: 'fish', harbor_sell: 'fish', harbor_boat: 'ship', cloth_spin: 'spool', cloth_weave: 'spool', cloth_dye: 'spool', cloth_sell: 'spool',
  cloth_tend: 'spool', cloth_loom: 'spool', cloth_wear: 'spool', cloth_shop: 'spool', cloth_manage: 'spool', mine_manage: 'pick', mine_prospect: 'pick', mine_deep: 'pick', mine_dwarf: 'pick',
  apo_gather: 'herb', apo_dose: 'flask', apo_shop: 'mortar', voc_potions: 'flask', holy_heal: 'candle', health_seek: 'flask', health_tend: 'flask', health_rest: 'rest',
  elder_funeral: 'grave', elder_tomb: 'grave', love_grave: 'grave', haunt_medium: 'candle', haunt_lift: 'candle', haunt_visit: 'skull', haunt_rite: 'candle', forbidden_rite: 'skull',
  dawn_rite: 'sun', worship: 'candle', keep_feast: 'bread', love_date: 'heart', court_match: 'ring', love_spouse: 'ring', oath_blood: 'pact', oath_vow: 'candle', oath_liege: 'banner', oath_man: 'shield',
  court_attend: 'crown', court_side: 'banner', law_study: 'scale', law_advocate: 'scale', school_study: 'owl', letters_read: 'letter', omen_read: 'eye', mystery_probe: 'lantern',
  explore_plan: 'compass', explore_sell: 'compass', explore_unhide: 'compass', explore_turnback: 'compass', explore_hide: 'tent', pioneer: 'tent', frontier_go: 'tent',
  frontier_gather: 'tent', frontier_work: 'hammer', house_build: 'hammer', domain_build: 'hammer', builder_shop: 'hammer', builder_apprentice: 'hammer', works_labor: 'hammer',
  works_oversee: 'hammer', works_fund: 'coin', trade_caravan: 'cart', cargo: 'cart', carrier_station: 'horse', house_move: 'cart', pilgrimage: 'boot', elder_journey: 'boot', on_road: 'boot',
  found_declare: 'flag', claim_declare: 'flag', claim_rally: 'banner', revolt_suppress: 'shield', company_found: 'banner', company_lead: 'banner', company_take: 'banner',
  order_join: 'banner', order_lead: 'banner', order_refound: 'banner', order_duty: 'shield', contest_gamble: 'dice', contest_fair: 'dice', heist_plan: 'key', heist_go: 'key',
  heist_fence: 'coin', heist_lay_low: 'mask', secret_twohome: 'mask', secret_unmask: 'mask', spell_study: 'rune', spell_work: 'magic', ruin_read: 'rune', ruin_restore: 'rune',
  ruin_dig: 'pick', tower_join: 'tower', tower_duty: 'tower', mana_well: 'crystal', mana_ward: 'crystal', spirit_seek: 'eye', spirit_learn: 'rune', beast_familiar: 'owl',
  nature_sow: 'sheaf', nature_harvest: 'sheaf', farm_sow: 'sheaf', farm_work: 'farm', farm_land: 'farm', farm_market: 'sheaf', farm_manage: 'farm', herd_work: 'sheep', herd_tend: 'sheep',
  herd_market: 'sheep', herd_band_join: 'tent', herd_band_life: 'tent', nature_winterprep: 'bread', cuisine_kitchen: 'cauldron', cuisine_cook: 'cauldron', cuisine_taste: 'cauldron',
  cuisine_serve: 'bread', cuisine_feast: 'bread', drift_years: 'hourglass', elder_retire: 'hourglass', elder_care: 'hourglass', bloodyears_rite: 'hourglass', claim_forge: 'anvil',
  graubel_forge: 'anvil', pirate_raid: 'ship', pirate_den: 'tankard', hunter_go: 'hunt', hunter_poach: 'hunt', hunter_sell: 'coin', hunter_lodge: 'home', hunter_apprentice: 'hunt',
  credit_pawn: 'ring', credit_bank: 'seal', credit_lend: 'scale', // 39단계 빚과 돈놀이
  mg_camp: 'tent', mg_help: 'bread', // 40단계 피난과 이주
  st_watch: 'eye', st_learn: 'owl', st_horoscope: 'dice', st_chart: 'compass', // 41단계 하늘의 별과 점성술사
  sp_school: 'rune', sp_chant: 'magic', sp_create: 'quill', // 42단계 마법 깊게
  dg_lore: 'scroll', dg_relic: 'skull', dg_order: 'mask', dg_watch: 'lantern', // 43단계 마신 깊게
  ld_work: 'labor', ld_pass: 'seal', // 44단계 고장 늘리기
  ac_smuggle: 'coin', ac_mediate: 'seal', ac_spy: 'eye', // 45단계 나라 사이 흐름
  out_ride: 'torch', out_hunt: 'hunt', out_give: 'bread', out_lie_low: 'mask', spread_patron: 'flask', envoy_join: 'seal', envoy_tongue: 'letter', demon_trade: 'coin', demon_voyage: 'ship',
  army_enlist: 'banner', army_escape: 'boot', army_resign: 'door', army_captive_wait: 'chain', dragon_climb: 'dragon', serpent_lair: 'dungeon', kin_adopt: 'home', kin_time: 'heart',
};
const WORDS = [
  [/sword|fence|duel|knight/, 'sword'], [/guard|patrol|defen/, 'shield'], [/magic|spell|mana|circle/, 'magic'],
  [/medit/, 'meditate'], [/pray|church|temple|faith/, 'pray'], [/herb|potion|alchem/, 'herb'], [/cook|kitchen|bake/, 'cook'],
  [/inn|tavern|brew|ale/, 'tankard'], [/jail|prison|chain|slave|bond/, 'chain'], [/spy|secret|disguise|mask/, 'mask'],
  [/trade|shop|sell|market|merchant|money/, 'coin'], [/farm|field|harvest|plant|sow/, 'farm'], [/hunt|bow|trap/, 'hunt'],
  [/letter|write|poem|pen/, 'quill'], [/study|book|read|school|library/, 'book'], [/train|body|run/, 'body'],
  [/build|carpent|mason|house/, 'hammer'], [/labor|work|job|craft/, 'labor'], [/mine|dig|ore/, 'pick'],
  [/smith|forge/, 'smith'], [/dungeon|ruin|delve|adventure|quest/, 'dungeon'], [/explore|map/, 'compass'], [/travel|move|journey|road/, 'travel'],
  [/horse|ride|steed|cart/, 'horse'], [/grave|funeral|tomb|death|haunt/, 'grave'], [/law|court_case|sue|judge/, 'scale'],
  [/court|love|date|marry|confess|propose/, 'heart'], [/visit|talk|friend|meet/, 'visit'], [/rest|sleep/, 'rest'],
  [/noble|politic|rule|throne/, 'crown'], [/ship|sea|sail/, 'ship'], [/fish|harbor/, 'fish'], [/home|family/, 'home'],
];

export function iconName(action) {
  // 38단계 표(BY_ID)가 먼저: 예전 행동들이 icon에 두루마리·동전 같은 대강의 이름을 적어 둔 것을 더 맞는 그림으로
  if (BY_ID[action.id]) return BY_ID[action.id];
  if (action.icon && I[action.icon]) return action.icon;
  for (const [re, n] of WORDS) if (re.test(action.id)) return n;
  return 'scroll';
}

// 같은 그림이 한 화면에 여러 번 나와도 마스크 id가 겹치지 않게
let seq = 0;
const cache = new Map();
function body(name) {
  if (cache.has(name)) return cache.get(name);
  const d = I[name] ?? I.scroll;
  const out = { s: d.s ?? '', c: d.c ?? '', l: d.l ?? '' };
  cache.set(name, out);
  return out;
}
export function icon(name, size = 24) {
  const d = body(I[name] ? name : 'scroll');
  const id = `ic${(seq = (seq + 1) % 1e6)}`;
  const mask = d.c ? `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="#fff"/><g fill="none" stroke="#000" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round">${d.c}</g></mask></defs>` : '';
  return `<svg class="ico ico-cut" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" data-ico="${I[name] ? name : 'scroll'}">${mask}<g fill="currentColor"${d.c ? ` mask="url(#${id})"` : ''}>${d.s}</g>${d.l ? `<g fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${d.l}</g>` : ''}</svg>`;
}

export const actionIcon = (action, size) => icon(iconName(action), size);
