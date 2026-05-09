/**
 * db.js
 * Simple JSON flat-file database for server records.
 * For production, swap this with SQLite (better-sqlite3) or PostgreSQL.
 */

const fs = require("fs");
const path = require("path");
const config = require("./config");

const DB_PATH = path.resolve(config.dbPath);

function _load() {
  if (!fs.existsSync(DB_PATH)) return { servers: {} };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { servers: {} };
  }
}

function _save(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getAllServers() {
  return Object.values(_load().servers);
}

function getServer(id) {
  return _load().servers[id] || null;
}

function saveServer(record) {
  const data = _load();
  data.servers[record.id] = record;
  _save(data);
  return record;
}

function updateServer(id, fields) {
  const data = _load();
  if (!data.servers[id]) throw new Error(`Server ${id} not found`);
  data.servers[id] = { ...data.servers[id], ...fields, updatedAt: new Date().toISOString() };
  _save(data);
  return data.servers[id];
}

function deleteServer(id) {
  const data = _load();
  delete data.servers[id];
  _save(data);
}

module.exports = { getAllServers, getServer, saveServer, updateServer, deleteServer };
