# LinuxGSM Web GUI

A web-based management interface for [LinuxGSM](https://linuxgsm.com/) game servers.
Deploy, start, stop, update, and monitor game servers through a browser — all powered by a real Node.js backend that runs actual LinuxGSM commands.

---

## Architecture

```
browser (React + Vite)
    │
    ├── REST  ──► Express (server.js)  ──► db.json  (server records)
    └── WS    ──► WebSocket (ws://)    ──► serverManager.js ──► LinuxGSM shell scripts
```

The WebSocket connection streams stdout/stderr from LinuxGSM commands back to the browser in real time, giving you a live terminal view during installs, updates, and start/stop operations.

---

## Prerequisites

These must be installed on the **Linux host** running the backend:

| Tool | Why |
|---|---|
| Node.js ≥ 18 | Backend runtime |
| wget / curl | LinuxGSM installer download |
| SteamCMD | Required by Steam-based games |
| tmux | LinuxGSM uses it to keep servers running |
| tar, gzip | For backups |
| Standard GNU tools | grep, awk, sed, etc. |

Install SteamCMD on Debian/Ubuntu:
```bash
sudo add-apt-repository multiverse
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install steamcmd lib32gcc-s1
```

---

## Quick Start

### 1. Clone / copy the project

```
linuxgsm-webgui/
├── backend/      ← Node.js API + WebSocket server
└── frontend/     ← React + Vite SPA
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # edit values as needed
npm install
npm start                     # runs on http://0.0.0.0:3001
```

Key `.env` options:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend HTTP/WS port |
| `SERVERS_ROOT` | `/home/gameservers` | Where server directories are created |
| `DB_PATH` | `./data/servers.json` | Flat-file database path |
| `FRONTEND_ORIGIN` | `*` | CORS allowed origin |
| `LOG_LEVEL` | `info` | `error\|warn\|info\|debug` |

### 3. Frontend (development)

```bash
cd frontend
cp .env.example .env          # set VITE_API_BASE and VITE_WS_BASE
npm install
npm run dev                   # http://localhost:5173
```

### 4. Frontend (production build)

```bash
cd frontend
npm run build
# Outputs to backend/public/ — served automatically by the backend
```

Then just run the backend and visit `http://<your-server>:3001`.

---

## REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/servers` | List all servers |
| GET | `/api/servers/:id` | Get one server |
| POST | `/api/servers` | Create server record |
| DELETE | `/api/servers/:id` | Delete server + stop it |
| GET | `/api/system` | CPU / RAM / Disk info |
| GET | `/api/lgsm/check` | Check SteamCMD availability |

### POST /api/servers body

```json
{
  "gameId":     "minecraft",
  "serverName": "My Server",
  "port":       25565,
  "maxPlayers": 20,
  "password":   "",
  "autoUpdate": true,
  "autoStart":  false,
  "customFlags": ""
}
```

---

## WebSocket Protocol

Connect to `ws://<host>:<port>/ws`. Messages are JSON.

### Client → Server

```jsonc
{ "type": "install",  "serverId": "<uuid>" }   // download + install + start
{ "type": "start",    "serverId": "<uuid>" }
{ "type": "stop",     "serverId": "<uuid>" }
{ "type": "restart",  "serverId": "<uuid>" }
{ "type": "update",   "serverId": "<uuid>" }
{ "type": "backup",   "serverId": "<uuid>" }
{ "type": "details",  "serverId": "<uuid>" }
{ "type": "console",  "serverId": "<uuid>", "command": "say Hello" }
{ "type": "ping" }
```

### Server → Client

```jsonc
{ "type": "terminal", "stream": "cmd|output|stderr|error", "text": "..." }
{ "type": "status",   "serverId": "<uuid>", "status": "running|stopped|error|..." }
{ "type": "done",     "action": "install", "success": true }
{ "type": "done",     "action": "install", "success": false, "error": "..." }
{ "type": "pong" }
```

---

## File Structure

```
backend/
├── server.js          Main Express + WebSocket server
├── serverManager.js   Spawns LinuxGSM shell commands, streams output
├── db.js              JSON flat-file database (swap with SQLite for prod)
├── config.js          All config pulled from env vars
├── games.js           Supported game server catalogue
├── logger.js          Minimal structured logger
├── package.json
└── .env.example

frontend/
├── src/
│   ├── main.jsx       React entry point
│   └── App.jsx        Full SPA — Dashboard, Deploy wizard, Settings
├── index.html
├── vite.config.js     Dev proxy + production build → backend/public
├── package.json
└── .env.example
```

---

## Security Notes

- This GUI runs shell commands on your server. **Do not expose it to the public internet** without adding authentication (JWT/session) and ideally a reverse proxy with TLS (nginx + Let's Encrypt).
- The `APP_SECRET` env var is wired up ready for future JWT middleware.
- Run the backend as a **non-root, dedicated user** (e.g. `gameservers`) with write access only to `SERVERS_ROOT`.

---

## Production Deployment (quick guide)

```bash
# 1. Create a dedicated user
sudo useradd -m -s /bin/bash gameservers
sudo mkdir -p /home/gameservers && sudo chown gameservers: /home/gameservers

# 2. Install Node.js 20 (e.g. via nvm)
# 3. Build frontend, then run backend
cd linuxgsm-webgui/frontend && npm run build
cd ../backend && npm start

# 4. Reverse proxy with nginx (recommended)
# Point /  →  http://127.0.0.1:3001
# Point /ws →  ws://127.0.0.1:3001/ws  (with proxy_http_version 1.1 + Upgrade headers)
```

---

## Supported Games

| Game | ID | LinuxGSM cmd | Default Port |
|---|---|---|---|
| Counter-Strike 2 | csgo | cs2server | 27015 |
| Team Fortress 2 | tf2 | tf2server | 27015 |
| Minecraft Java | minecraft | mcserver | 25565 |
| ARK: Survival Evolved | ark | arkserver | 7777 |
| Rust | rust | rustserver | 28015 |
| Valheim | valheim | vhserver | 2456 |
| 7 Days to Die | 7dtd | sdtdserver | 26900 |
| Garry's Mod | gmod | gmodserver | 27015 |
| Terraria | terraria | terrserver | 7777 |
| Squad | squad | squadserver | 7787 |
| Factorio | factorio | fctrserver | 34197 |
| Satisfactory | satisfactory | sfserver | 7777 |

More games can be added in `backend/games.js` and `frontend/src/App.jsx`.
