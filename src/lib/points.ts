/** 관리자가 승인 시 참고할 추천 포인트값. 최종 값은 관리자가 직접 입력해 확정한다. */
export function suggestedPoints(unitCount: number, descriptionLength: number) {
  const base = 40;
  const unitBonus = Math.max(0, unitCount) * 8;
  const detailBonus = descriptionLength > 80 ? 20 : 0;
  return Math.min(base + unitBonus + detailBonus, 400);
}
