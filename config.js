/**
 * config.js
 * Central configuration. All values can be overridden with environment variables.
 */

require("dotenv").config();

module.exports = {
  // Port the HTTP/WS server listens on
  port: parseInt(process.env.PORT || "3001", 10),

  // Origin allowed for CORS (set to your frontend URL in production)
  frontendOrigin: process.env.FRONTEND_ORIGIN || "*",

  // Root directory where each game server is installed as a sub-folder
  // e.g. /home/gameservers/<uuid>/
  serversRoot: process.env.SERVERS_ROOT || "/home/gameservers",

  // Path to the JSON database file
  dbPath: process.env.DB_PATH || "./data/servers.json",

  // Log level: error | warn | info | debug
  logLevel: process.env.LOG_LEVEL || "info",

  // Secret for signed cookies / JWT (unused by default, ready for auth)
  secret: process.env.APP_SECRET || "change-me-in-production",
};
