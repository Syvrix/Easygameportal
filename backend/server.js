/**
 * LinuxGSM Web GUI - Backend Server
 * Express + WebSocket server for managing game servers via LinuxGSM
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const helmet = require("helmet");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const serverManager = require("./serverManager");
const db = require("./db");
const logger = require("./logger");

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

// Serve built frontend from /public if present
const publicDir = path.join(__dirname, "public");

if (fs.existsSync(publicDir)) {
  console.log("Serving frontend from:", publicDir);

  app.use(express.static(publicDir));

  app.get("*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// ── REST Routes ───────────────────────────────────────────────────────────────

// List all servers
app.get("/api/servers", (req, res) => {
  try {
    const servers = db.getAllServers();
    res.json({ servers });
  } catch (err) {
    logger.error("GET /api/servers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get single server
app.get("/api/servers/:id", (req, res) => {
  const server = db.getServer(req.params.id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  res.json({ server });
});

// Create/register a new server
app.post("/api/servers", async (req, res) => {
  const { gameId, serverName, port, maxPlayers, password, autoUpdate, autoStart, customFlags } = req.body;
  if (!gameId) return res.status(400).json({ error: "gameId is required" });

  const GAMES = require("./games");
  const game = GAMES.find((g) => g.id === gameId);
  if (!game) return res.status(400).json({ error: `Unknown gameId: ${gameId}` });

  const id = uuidv4();
  const record = {
    id,
    gameId,
    game: game.game,
    cmd: game.cmd,
    name: serverName || `My ${game.name} Server`,
    port: port || game.defaultPort,
    maxPlayers: maxPlayers || 16,
    password: password || "",
    autoUpdate: !!autoUpdate,
    autoStart: !!autoStart,
    customFlags: customFlags || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  db.saveServer(record);
  logger.info(`Server created: ${id} (${game.game})`);
  res.status(201).json({ server: record });
});

// Delete a server
app.delete("/api/servers/:id", async (req, res) => {
  const server = db.getServer(req.params.id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  try {
    await serverManager.stop(server, null);
  } catch (_) {}
  db.deleteServer(req.params.id);
  logger.info(`Server deleted: ${req.params.id}`);
  res.json({ ok: true });
});

// Simple action endpoint (start / stop / restart / update / backup)
app.post("/api/servers/:id/:action", (req, res) => {
  const validActions = ["start", "stop", "restart", "update", "backup", "details"];
  const { id, action } = req.params;
  if (!validActions.includes(action))
    return res.status(400).json({ error: `Unknown action: ${action}` });

  const server = db.getServer(id);
  if (!server) return res.status(404).json({ error: "Server not found" });

  // Actions are streamed over WebSocket; acknowledge here and let client connect
  res.json({ ok: true, message: `Connect to ws://<host>/ws and send {"type":"${action}","serverId":"${id}"}` });
});

// System info
app.get("/api/system", async (req, res) => {
  const si = require("systeminformation");
  try {
    const [cpu, mem, disk, os] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
    ]);
    res.json({
      cpu: Math.round(cpu.currentLoad),
      memUsed: mem.used,
      memTotal: mem.total,
      disk: disk[0] ? { used: disk[0].used, size: disk[0].size } : null,
      os: `${os.distro} ${os.release}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LinuxGSM version / dependency check
app.get("/api/lgsm/check", async (req, res) => {
  const { execFile } = require("child_process");
  execFile("bash", ["-c", "command -v steamcmd && steamcmd +quit 2>&1 | head -1"], (err, stdout) => {
    res.json({ steamcmd: !err, raw: stdout.trim() });
  });
});

// ── WebSocket – real-time terminal streaming ──────────────────────────────────
wss.on("connection", (ws) => {
  const clientId = uuidv4().slice(0, 8);
  logger.info(`WS connected: ${clientId}`);

  ws.send(JSON.stringify({ type: "connected", clientId }));

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return ws.send(JSON.stringify({ type: "error", text: "Invalid JSON" }));
    }

    const { type, serverId } = msg;
    const server = serverId ? db.getServer(serverId) : null;

    if (!server && type !== "ping") {
      return ws.send(JSON.stringify({ type: "error", text: `Server ${serverId} not found` }));
    }

    const send = (payload) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    };

    switch (type) {
      case "ping":
        return send({ type: "pong" });

      case "install":
        return serverManager.install(server, send);

      case "start":
        return serverManager.start(server, send);

      case "stop":
        return serverManager.stop(server, send);

      case "restart":
        return serverManager.restart(server, send);

      case "update":
        return serverManager.update(server, send);

      case "backup":
        return serverManager.backup(server, send);

      case "console":
        return serverManager.sendConsoleCommand(server, msg.command, send);

      case "details":
        return serverManager.details(server, send);

      default:
        send({ type: "error", text: `Unknown action: ${type}` });
    }
  });

  ws.on("close", () => logger.info(`WS disconnected: ${clientId}`));
  ws.on("error", (err) => logger.error(`WS error (${clientId}):`, err.message));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`LinuxGSM GUI backend running on http://0.0.0.0:${PORT}`);
  logger.info(`WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
});

module.exports = { app, httpServer };
