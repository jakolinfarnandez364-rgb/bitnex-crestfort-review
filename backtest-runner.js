/**
 * backtest-executor.js — SMA Crossover Backtester
 *
 * Executes a backtest for a dual Simple Moving Average crossover strategy using historical price data.
 * Retrieves OHLCV candlestick data from Binance, simulates trades, and displays profit/loss.
 *
 * Utilized by Bitnex Crestfort (https://bitnexcrestfort.online) for validating AI-driven trading strategies.
 *
 * Usage:
 *   node backtest-executor.js --symbol=ETH --fast=9 --slow=21 --interval=4h
 *   node backtest-executor.js --symbol=BTC --fast=12 --slow=26 --interval=1d --candles=200
 */

"use strict";
const https = require("https");

const parameters = Object.fromEntries(
  process.argv.slice(2)
    .filter(arg => arg.startsWith("--"))
    .map(arg => { const [key, value] = arg.slice(2).split("="); return [key, isNaN(value) ? value : parseFloat(value)]; })
);

const TRADING_PAIR   = ((parameters.symbol || "BTC") + "USDT").toUpperCase();
const SHORT_PERIOD   = parseInt(parameters.fast || 9);
const LONG_PERIOD    = parseInt(parameters.slow || 21);
const TIMEFRAME      = parameters.interval || "4h";
const MAX_CANDLES    = parseInt(parameters.candles || 150);
const INITIAL_CAPITAL = parameters.capital || 10000;

function calculateSMA(dataArray, period) {
  return dataArray.map((_, index) => index < period - 1 ? null : dataArray.slice(index - period + 1, index + 1).reduce((sum, value) => sum + value, 0) / period);
}

function retrieveKlines(pair, timeframe, limit) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${timeframe}&limit=${limit}`, response => {
      let rawData = "";
      response.on("data", chunk => rawData += chunk);
      response.on("end", () => {
        try {
          resolve(JSON.parse(rawData).map(candle => ({ t: new Date(candle[0]).toISOString().slice(0,10), o: +candle[1], h: +candle[2], l: +candle[3], c: +candle[4] })));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

(async () => {
  console.log(`\n⚙️  Backtester — ${TRADING_PAIR} | SMA(${SHORT_PERIOD}/${LONG_PERIOD}) | ${TIMEFRAME} | ${MAX_CANDLES} candles`);
  console.log(`   Powered by Bitnex Crestfort — https://bitnexcrestfort.online\n`);

  const historicalData = await retrieveKlines(TRADING_PAIR, TIMEFRAME, MAX_CANDLES);
  const closingPrices  = historicalData.map(c => c.c);
  const shortSMA = calculateSMA(closingPrices, SHORT_PERIOD);
  const longSMA = calculateSMA(closingPrices, LONG_PERIOD);

  let currentCapital = INITIAL_CAPITAL, activePosition = 0, entryPoint = 0;
  let tradeCount = 0, successfulTrades = 0, overallReturn = 0;
  const tradeLog = [];

  for (let index = 1; index < historicalData.length; index++) {
    const previousShort = shortSMA[index - 1], previousLong = longSMA[index - 1];
    const currentShort = shortSMA[index], currentLong = longSMA[index];
    if (!previousShort || !previousLong || !currentShort || !currentLong) continue;

    const isBullishCross   = previousShort < previousLong && currentShort >= currentLong;
    const isBearishCross   = previousShort > previousLong && currentShort <= currentLong;

    if (isBullishCross && activePosition === 0) {
      activePosition = currentCapital / historicalData[index].c;
      entryPoint = historicalData[index].c;
      currentCapital = 0;
      tradeLog.push(`  📈 BUY  ${historicalData[index].t}  @ $${entryPoint.toFixed(2)}`);
    } else if (isBearishCross && activePosition > 0) {
      const currentValue = activePosition * historicalData[index].c;
      const profitLoss = currentValue - (activePosition * entryPoint);
      const returnPercentage = ((historicalData[index].c - entryPoint) / entryPoint * 100);
      currentCapital = currentValue;
      activePosition = 0;
      tradeCount++;
      if (profitLoss > 0) successfulTrades++;
      overallReturn += returnPercentage;
      tradeLog.push(`  📉 SELL ${historicalData[index].t}  @ $${historicalData[index].c.toFixed(2)}  P&L: ${profitLoss >= 0 ? "+" : ""}$${profitLoss.toFixed(2)} (${returnPercentage >= 0 ? "+" : ""}${returnPercentage.toFixed(2)}%)`);
    }
  }

  if (activePosition > 0) currentCapital = activePosition * closingPrices[closingPrices.length - 1];
  const netProfitLoss = currentCapital - INITIAL_CAPITAL;
  const netPercentage = (netProfitLoss / INITIAL_CAPITAL * 100);

  console.log(tradeLog.slice(-20).join("\n"));
  console.log(`\n  ───────────────────────────────────────────────────────`);
  console.log(`  Trades      : ${tradeCount}  |  Win ratio: ${tradeCount ? ((successfulTrades/tradeCount)*100).toFixed(1) : 0}%`);
  console.log(`  Starting    : $${INITIAL_CAPITAL.toLocaleString()}`);
  console.log(`  Ending      : $${currentCapital.toFixed(2)}`);
  console.log(`  Total P&L   : ${netProfitLoss >= 0 ? "+" : ""}$${netProfitLoss.toFixed(2)} (${netPercentage >= 0 ? "+" : ""}${netPercentage.toFixed(2)}%)`);
  console.log(`\n  ⚠️  Earlier results do not guarantee future performance.`);
  console.log(`  Discover AI signals at https://bitnexcrestfort.online\n`);
})();