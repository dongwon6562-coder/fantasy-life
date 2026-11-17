// 17단계: 법과 재판. 나라마다 다른 법정(영주의 법정, 제국 법원, 교단 재판소, 협회 심판정, 의회 법정, 군사 법정, 장로 회의, 길드 중재소, 부족 회의),
// 고발하기와 당하기, 피고·원고·증인·재판관 자리, 변론인, 결투 재판·신명 재판·진실의 주문, 뇌물과 사면, 판결이 남기는 낙인.
// 체포 장면에 "재판을 청한다"가 붙는다. 화면용: lawInfo(g), lawLine(g)
import { LS, LAWS, CHARGES, FORM_NAME, lawOf, skillWord, stainWord, openCases, placeName } from './state.js';
import './trial.js';
import './life.js';
import './events.js';
import { L } from '../adventure/core.js';
import { realmName, realmOf } from '../realms/index.js';
import { evidenceWord } from './trial.js';

export { LAWS, CHARGES };
export { openCase, askTrial, verdict, lean, trialOptions, noble } from './trial.js';
export { addGrievance } from './life.js';
export const lawState = LS;

const ROLE = { accused: '피고', plaintiff: '원고' };
const STATE = { open: '재판 중', won: '이겼다', lost: '졌다', settled: '합의했다', dropped: '흐지부지되었다' };
const caseView = (c) => ({
  id: c.id, role: ROLE[c.role] ?? '', charge: c.crime ? c.crimeName ?? '죄' : CHARGES[c.charge]?.name ?? '', other: c.crime ? '경비대' : c.other?.name ?? '',
  place: placeName(c.place), state: STATE[c.state] ?? '', form: c.form ? FORM_NAME[c.form] ?? (c.form === 'plead' ? '죄를 인정함' : c.form === 'bribe' ? '뇌물' : c.form === 'absent' ? '궐석' : '') : null,
  evidence: evidenceWord(c.evidence), verdict: c.verdict ?? null,
});

export function lawInfo(g) {
  const S = LS(g), pl = L(g).place, Lw = lawOf(pl);
  return {
    here: { realm: realmName(realmOf(pl)), court: Lw.court, judge: Lw.judge, sum: Lw.sum, forms: Lw.forms.map((f) => FORM_NAME[f]), advocate: Lw.advocate > 0 },
    open: openCases(g).map(caseView),
    past: S.cases.filter((c) => c.state !== 'open').slice(-8).reverse().map(caseView),
    grievances: S.grievances.map((x) => ({ charge: CHARGES[x.charge]?.name ?? '', other: x.other?.name ?? '', place: placeName(x.place) })),
    skill: Math.round(S.skill), skillWord: skillWord(S.skill),
    stain: Math.round(S.stain), stainWord: stainWord(S.stain),
    rec: { ...S.rec },
    log: S.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 걸린 재판, 고발할 일, 집안의 낙인
export function lawLine(g) {
  const S = LS(g), parts = [];
  const c = openCases(g)[0];
  if (c) parts.push(`${ROLE[c.role]}로 재판 중: ${c.crime ? c.crimeName ?? '죄' : CHARGES[c.charge]?.name ?? ''} (${placeName(c.place)})`);
  if (S.grievances.length) parts.push(`고발할 일 ${S.grievances.length}`);
  const w = stainWord(S.stain);
  if (w) parts.push(`집안의 낙인: ${w}`);
  return parts.join(' · ');
}
