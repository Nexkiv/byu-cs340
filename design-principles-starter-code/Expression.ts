// 1. What design principles does this code violate?
// Code Duplication/Isolated Change Principle: The code was checking for income > 100_000 twice.
// Principle of Least Astonishement: What does authorization have to do with risk?
// 2. Refactor the code to improve its design.

const OK_SCORE = 500;
const GOOD_SCORE = 700;
const OK_INCOME = 40_000;
const GOOD_INCOME = 100_000;

function isLowRiskClient(
  score: number,
  income: number,
  authorized: boolean
): boolean {
  return (
    score > GOOD_SCORE ||
    income > GOOD_INCOME ||
    (score > OK_SCORE && income >= OK_INCOME && authorized)
  );

  //   if (
  //     !(
  //       score > 700 ||
  //       (income >= 40000 && income <= 100000 && authorized && score > 500) ||
  //       income > 100000
  //     )
  //   ) {
  //     return false;
  //   } else {
  //     return true;
  //   }
}
