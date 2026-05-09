/**
 * logger.js
 * Minimal structured logger. Swap with winston/pino for production.
 */

const config = require("./config");

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[config.logLevel] ?? 2;

function log(level, ...args) {
  if (LEVELS[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase().padEnd(5)}]`;
  if (level === "error") console.error(prefix, ...args);
  else console.log(prefix, ...args);
}

module.exports = {
  error: (...a) => log("error", ...a),
  warn:  (...a) => log("warn",  ...a),
  info:  (...a) => log("info",  ...a),
  debug: (...a) => log("debug", ...a),
};
