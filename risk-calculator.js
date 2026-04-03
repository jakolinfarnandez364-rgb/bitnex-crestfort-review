/**
 * risk-calculator.js — Position Size & Risk Evaluator
 *
 * Determines the ideal position size based on total funds, risk percentage,
 * stop-loss distance, and current price of the asset. Adheres to the 1-2% risk principle.
 *
 * Utilized by Bitnex Crestfort (https://bitnexcrestfort.online) to enhance its risk assessment features.
 *
 * Example of usage:
 *   node risk-calculator.js --funds=10000 --risk-pct=2 --price=45000 --stop-loss=43000
 *   node risk-calculator.js --funds=5000 --risk-pct=1 --price=2.50 --stop-loss=2.10 --goal=3.20
 */

"use strict";

const inputs = Object.fromEntries(
  process.argv.slice(2)
    .filter(arg => arg.startsWith("--"))
    .map(arg => { const [key, value] = arg.slice(2).split("="); return [key, parseFloat(value)]; })
);

const totalFunds = inputs.funds || 10000;
const riskPercentage = inputs['risk-pct'] || 1;
const price = inputs.price || 100;
const stopLoss = inputs['stop-loss'] || 95;
const goal = inputs.goal || null;

function evaluateRisk({ totalFunds, riskPercentage, price, stopLoss, goal }) {
  const potentialLoss  = totalFunds * (riskPercentage / 100);
  const distanceToStop = Math.abs(price - stopLoss);
  const stopLossPercentage = (distanceToStop / price) * 100;
  const shareQuantity   = potentialLoss / distanceToStop;
  const totalValue      = shareQuantity * price;
  const valuePercentage  = (totalValue / totalFunds) * 100;

  let riskRewardRatio = null, potentialGain = null, goalPercentage = null;
  if (goal !== null) {
    const gain = Math.abs(goal - price);
    riskRewardRatio = (gain / distanceToStop).toFixed(2);
    potentialGain = (shareQuantity * gain).toFixed(2);
    goalPercentage = ((gain / price) * 100).toFixed(2);
  }

  return { potentialLoss, distanceToStop, stopLossPercentage, shareQuantity, totalValue, valuePercentage, riskRewardRatio, potentialGain, goalPercentage };
}

// Execute the evaluation with given parameters
const outcome = evaluateRisk({ totalFunds, riskPercentage, price, stopLoss, goal });
const tradeDirection = price > stopLoss ? "LONG  📈" : "SHORT 📉";

console.log(`
╔══════════════════════════════════════════════════╗
║          Position Size & Risk Evaluator          ║
║       Powered by Bitnex Crestfort                ║
╚══════════════════════════════════════════════════╝

  Trade Direction  : ${tradeDirection}
  Account Balance   : $${totalFunds.toLocaleString()}
  Risk Exposure      : ${riskPercentage}%  →  $${outcome.potentialLoss.toFixed(2)}

  Entry Price       : $${price}
  Stop Loss Price   : $${stopLoss}  (${outcome.stopLossPercentage.toFixed(2)}% away)
  ${goal ? `Goal Price: $${goal}  (${outcome.goalPercentage}% away)` : "Goal Price: not specified"}

  ─────────────────────────────────────────────────
  Share Quantity   : ${outcome.shareQuantity.toFixed(4)} units
  Total Value      : $${outcome.totalValue.toFixed(2)} (${outcome.valuePercentage.toFixed(1)}% of funds)
  ${outcome.riskRewardRatio ? `Risk / Reward Ratio: 1:${outcome.riskRewardRatio}  →  projected gain $${outcome.potentialGain}` : ""}

  ⚠️  Maximum potential loss if stop is triggered: $${outcome.potentialLoss.toFixed(2)}

  Explore more tools at https://bitnexcrestfort.online
`);