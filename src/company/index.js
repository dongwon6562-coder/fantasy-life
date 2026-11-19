// 용병단 꾸리기 (21단계): 내 깃발 세우기, 계약과 고용주(전쟁·상단 호위·영주의 싸움·마물 토벌), 싸움터에서 이끌기,
// 몫 나누기와 약탈 규율, 배신과 이적, 맞수 용병단, 다치거나 죽은 단원의 식구, 어린 상속자 대신 부관이 지키는 깃발.
// politics의 혼자 칼 파는 용병 일(pol_merc)과 따로 놀고, 전쟁(politics wars)의 전선을 조금 민다. repute(deed)·crime(reportCrime)과 이어진다.
import './core.js';
import './life.js';
import './events.js';
export { companyStatus, companyLine } from './status.js';
export { S as companyState, myCo, commanding, withCo, SIGNS, SPLITS, LOOTS, FOUND_COST, endCompany, newCompany } from './core.js';
export { makeOffers, fight, PLANS, contractHere, canCommand } from './life.js';
