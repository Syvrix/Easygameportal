/**
 * LinuxGSM Web GUI – Frontend (React)
 * Wired to the Node.js backend via REST + WebSocket.
 *
 * Set VITE_API_BASE and VITE_WS_BASE in your .env, or it defaults to localhost:3001.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "http://localhost:3001";
const WS_BASE  = (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_BASE)  || "ws://localhost:3001";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Game catalogue (mirrors backend games.js) ─────────────────────────────────
const GAMES = [
  { id: "csgo",         name: "CS2",          game: "Counter-Strike 2",      cmd: "cs2server",   category: "FPS",      icon: "🔫", ram: "2GB",   cpu: "2 cores", disk: "60GB",  defaultPort: 27015 },
  { id: "tf2",          name: "TF2",          game: "Team Fortress 2",       cmd: "tf2server",   category: "FPS",      icon: "🎩", ram: "1GB",   cpu: "1 core",  disk: "15GB",  defaultPort: 27015 },
  { id: "minecraft",    name: "Minecraft",    game: "Minecraft Java",        cmd: "mcserver",    category: "Sandbox",  icon: "⛏️", ram: "2GB",   cpu: "2 cores", disk: "10GB",  defaultPort: 25565 },
  { id: "ark",          name: "ARK",          game: "ARK: Survival Evolved", cmd: "arkserver",   category: "Survival", icon: "🦕", ram: "8GB",   cpu: "4 cores", disk: "60GB",  defaultPort: 7777  },
  { id: "rust",         name: "Rust",         game: "Rust",                  cmd: "rustserver",  category: "Survival", icon: "🔧", ram: "4GB",   cpu: "2 cores", disk: "20GB",  defaultPort: 28015 },
  { id: "valheim",      name: "Valheim",      game: "Valheim",               cmd: "vhserver",    category: "Survival", icon: "⚔️", ram: "2GB",   cpu: "2 cores", disk: "2GB",   defaultPort: 2456  },
  { id: "7dtd",         name: "7 Days",       game: "7 Days to Die",         cmd: "sdtdserver",  category: "Survival", icon: "🧟", ram: "4GB",   cpu: "2 cores", disk: "12GB",  defaultPort: 26900 },
  { id: "gmod",         name: "Garry's Mod",  game: "Garry's Mod",           cmd: "gmodserver",  category: "Sandbox",  icon: "🔩", ram: "1GB",   cpu: "1 core",  disk: "30GB",  defaultPort: 27015 },
  { id: "terraria",     name: "Terraria",     game: "Terraria",              cmd: "terrserver",  category: "Sandbox",  icon: "🌿", ram: "512MB", cpu: "1 core",  disk: "1GB",   defaultPort: 7777  },
  { id: "squad",        name: "Squad",        game: "Squad",                 cmd: "squadserver", category: "Military", icon: "🪖", ram: "8GB",   cpu: "4 cores", disk: "40GB",  defaultPort: 7787  },
  { id: "factorio",     name: "Factorio",     game: "Factorio",              cmd: "fctrserver",  category: "Strategy", icon: "⚙️", ram: "1GB",   cpu: "2 cores", disk: "2GB",   defaultPort: 34197 },
  { id: "satisfactory", name: "Satisfactory", game: "Satisfactory",          cmd: "sfserver",    category: "Strategy", icon: "🏭", ram: "8GB",   cpu: "4 cores", disk: "15GB",  defaultPort: 7777  },
];

const CATEGORIES = ["All", "FPS", "Survival", "Sandbox", "Military", "Strategy"];
const STEPS = [{ id: 1, label: "Choose Game" }, { id: 2, label: "Configure" }, { id: 3, label: "Install" }];

// ── Sub-components ────────────────────────────────────────────────────────────
function Terminal({ lines }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  return (
    <div style={{ background:"#0a0a0a", border:"1px solid #1e3a1e", borderRadius:8, padding:16, fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:12, lineHeight:1.7, maxHeight:320, overflowY:"auto", boxShadow:"inset 0 0 30px rgba(0,255,0,0.03)" }}>
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"#FF5F57" }}/>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"#FFBD2E" }}/>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"#28C840" }}/>
        <span style={{ marginLeft:8, color:"#3a3a3a", fontSize:11 }}>linuxgsm — bash</span>
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.stream==="cmd"?"#4ade80": line.stream==="error"?"#f87171": line.stream==="stderr"?"#fb923c":"#9ca3af", display:"flex", gap:8 }}>
          {line.stream==="cmd" && <span style={{ color:"#6b7280" }}>$</span>}
          <span style={{ whiteSpace:"pre-wrap" }}>{line.text}</span>
        </div>
      ))}
      <div ref={bottomRef}/>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { running:{color:"#4ade80",bg:"rgba(74,222,128,0.1)",label:"ONLINE"}, stopped:{color:"#6b7280",bg:"rgba(107,114,128,0.1)",label:"OFFLINE"}, installing:{color:"#facc15",bg:"rgba(250,204,21,0.1)",label:"INSTALLING"}, updating:{color:"#60a5fa",bg:"rgba(96,165,250,0.1)",label:"UPDATING"}, error:{color:"#f87171",bg:"rgba(248,113,113,0.1)",label:"ERROR"}, pending:{color:"#a78bfa",bg:"rgba(167,139,250,0.1)",label:"PENDING"} };
  const s = map[status] || map.stopped;
  return <span style={{ fontSize:10, fontFamily:"monospace", letterSpacing:"0.1em", padding:"2px 8px", borderRadius:4, background:s.bg, color:s.color, border:`1px solid ${s.color}33`, fontWeight:700 }}>{s.label}</span>;
}

// ── WebSocket hook ────────────────────────────────────────────────────────────
function useWS(onMessage) {
  const wsRef = useRef(null);
  const cbRef = useRef(onMessage);
  useEffect(() => { cbRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`${WS_BASE}/ws`);
    ws.onmessage = (e) => { try { cbRef.current(JSON.parse(e.data)); } catch {} };
    ws.onerror = () => {};
    wsRef.current = ws;
  }, []);

  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }, []);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);
  return { send, connect };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:     { minHeight:"100vh", background:"#080c08", color:"#e2e8e2", fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", flexDirection:"column" },
  header:  { borderBottom:"1px solid #1a2e1a", padding:"0 32px", display:"flex", alignItems:"center", gap:"32px", height:58, background:"rgba(8,12,8,0.95)", backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:100 },
  logo:    { display:"flex", alignItems:"center", gap:10, fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:"#4ade80", letterSpacing:"-0.02em" },
  main:    { flex:1, padding:32, maxWidth:1100, margin:"0 auto", width:"100%" },
  card:    { background:"#0d150d", border:"1px solid #1a2e1a", borderRadius:12, padding:20 },
  label:   { fontSize:12, color:"#6b7280", marginBottom:6, letterSpacing:"0.05em", fontWeight:600, textTransform:"uppercase" },
  input:   { background:"#060b06", border:"1px solid #1a2e1a", borderRadius:8, padding:"10px 14px", color:"#e2e8e2", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", transition:"border-color 0.15s" },
  navBtn:  (a) => ({ padding:"6px 16px", borderRadius:6, border:"none", background:a?"rgba(74,222,128,0.12)":"transparent", color:a?"#4ade80":"#6b7280", fontSize:13, fontWeight:a?600:400, cursor:"pointer", letterSpacing:"0.01em" }),
  btn:     (v="primary") => ({ padding:v==="sm"?"6px 14px":"10px 24px", borderRadius:8, border:v==="ghost"?"1px solid #1a2e1a":v==="danger"?"1px solid rgba(248,113,113,0.3)":"none", background:v==="primary"?"#4ade80":v==="danger"?"rgba(248,113,113,0.15)":"rgba(74,222,128,0.1)", color:v==="primary"?"#080c08":v==="danger"?"#f87171":"#4ade80", fontSize:v==="sm"?12:14, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }),
  gameCard:(sel)=>({ background:sel?"rgba(74,222,128,0.07)":"#0d150d", border:`1px solid ${sel?"#4ade80":"#1a2e1a"}`, borderRadius:10, padding:16, cursor:"pointer", transition:"all 0.15s", position:"relative", overflow:"hidden" }),
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,      setTab]      = useState("dashboard");
  const [servers,  setServers]  = useState([]);
  const [sysInfo,  setSysInfo]  = useState(null);
  const [notif,    setNotif]    = useState(null);
  const [termLines,setTermLines]= useState([]);
  const [step,     setStep]     = useState(1);
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [installing,setInstalling]=useState(false);
  const [installDone,setInstallDone]=useState(false);
  const [activeServer,setActiveServer]=useState(null); // id being acted upon
  const [config, setConfig] = useState({ serverName:"", port:"", maxPlayers:"16", password:"", autoUpdate:true, autoStart:false, customFlags:"" });

  // ── Notification ────────────────────────────────────────────────────────────
  const notify = useCallback((msg, type="success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  // ── WS message handler ───────────────────────────────────────────────────────
  const handleWS = useCallback((msg) => {
    if (msg.type === "terminal") {
      setTermLines(prev => [...prev, { stream: msg.stream, text: msg.text }]);
    } else if (msg.type === "status") {
      setServers(prev => prev.map(s => s.id === msg.serverId ? { ...s, status: msg.status } : s));
    } else if (msg.type === "done") {
      setInstalling(false);
      if (msg.action === "install") {
        setInstallDone(true);
        if (msg.success) { notify(`Server installed successfully!`); loadServers(); }
        else notify(`Install failed: ${msg.error}`, "error");
      } else if (msg.success) {
        notify(`${msg.action} completed`);
        loadServers();
      } else {
        notify(`${msg.action} failed: ${msg.error}`, "error");
      }
    }
  }, [notify]);

  const { send: wsSend, connect: wsConnect } = useWS(handleWS);

  // ── Load servers from API ────────────────────────────────────────────────────
  const loadServers = useCallback(async () => {
    try {
      const { servers } = await apiFetch("/api/servers");
      setServers(servers);
    } catch (err) {
      console.error("loadServers:", err.message);
    }
  }, []);

  // ── Load system info ─────────────────────────────────────────────────────────
  const loadSysInfo = useCallback(async () => {
    try { setSysInfo(await apiFetch("/api/system")); } catch {}
  }, []);

  useEffect(() => { loadServers(); loadSysInfo(); const t = setInterval(loadSysInfo, 15000); return () => clearInterval(t); }, [loadServers, loadSysInfo]);

  // ── Deploy new server ────────────────────────────────────────────────────────
  const deployServer = async () => {
    if (!selected) return;
    const game = GAMES.find(g => g.id === selected);
    try {
      // 1. Create server record via REST
      const { server } = await apiFetch("/api/servers", {
        method: "POST",
        body: JSON.stringify({ gameId: selected, serverName: config.serverName, port: config.port || game.defaultPort, maxPlayers: config.maxPlayers, password: config.password, autoUpdate: config.autoUpdate, autoStart: config.autoStart, customFlags: config.customFlags }),
      });
      setServers(prev => [...prev, server]);

      // 2. Stream install over WebSocket
      setInstalling(true);
      setTermLines([]);
      wsConnect();
      setTimeout(() => wsSend({ type: "install", serverId: server.id }), 300);
    } catch (err) {
      notify(`Failed to create server: ${err.message}`, "error");
    }
  };

  // ── Server action (start/stop/restart/update/backup) ─────────────────────────
  const serverAction = useCallback((server, action) => {
    wsConnect();
    setActiveServer(server.id);
    setTimeout(() => wsSend({ type: action, serverId: server.id }), 100);
    notify(`Sending ${action} to ${server.name}…`, "info");
  }, [wsConnect, wsSend, notify]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteServer = async (id) => {
    try {
      await apiFetch(`/api/servers/${id}`, { method: "DELETE" });
      setServers(prev => prev.filter(s => s.id !== id));
      notify("Server deleted");
    } catch (err) { notify(err.message, "error"); }
  };

  const filtered = category === "All" ? GAMES : GAMES.filter(g => g.category === category);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        input:focus{border-color:#4ade80!important}
        button:hover{opacity:.85}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#1a2e1a;border-radius:2px}
      `}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}><span style={{fontSize:20}}>⚡</span><span>LGSM<span style={{color:"#2d6a2d"}}>.gui</span></span></div>
        <nav style={{display:"flex",gap:4,flex:1}}>
          {["dashboard","deploy","settings"].map(t=>(
            <button key={t} style={S.navBtn(tab===t)} onClick={()=>{setTab(t);if(t==="deploy"){setStep(1);setSelected(null);setInstallDone(false);setTermLines([]);}}}>
              {t==="dashboard"?"⬛ Dashboard":t==="deploy"?"＋ Deploy Server":"⚙ Settings"}
            </button>
          ))}
        </nav>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80"}}/>
          <span style={{fontSize:12,color:"#4b5563",fontFamily:"monospace"}}>LinuxGSM v24.5</span>
        </div>
      </header>

      {/* Notification */}
      {notif && (
        <div style={{position:"fixed",top:70,right:24,zIndex:200,background:notif.type==="success"?"rgba(74,222,128,0.15)":notif.type==="info"?"rgba(96,165,250,0.15)":"rgba(248,113,113,0.15)",border:`1px solid ${notif.type==="success"?"#4ade8066":notif.type==="info"?"#60a5fa66":"#f8717166"}`,borderRadius:10,padding:"12px 20px",color:notif.type==="success"?"#4ade80":notif.type==="info"?"#60a5fa":"#f87171",fontSize:13,fontWeight:600,animation:"fadeIn 0.2s ease",backdropFilter:"blur(10px)"}}>
          {notif.type==="success"?"✓ ":notif.type==="info"?"ℹ ":"✗ "}{notif.msg}
        </div>
      )}

      <main style={S.main}>

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab==="dashboard" && (
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:22,fontWeight:700,color:"#f0fdf0",marginBottom:6,letterSpacing:"-0.03em"}}>Server Dashboard</div>
            <div style={{fontSize:13,color:"#4b5563",marginBottom:24}}>Manage your game servers</div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
              {[
                {label:"Total Servers",value:servers.length,icon:"🖥"},
                {label:"Online",value:servers.filter(s=>s.status==="running").length,icon:"🟢"},
                {label:"CPU Usage",value:sysInfo?`${sysInfo.cpu}%`:"—",icon:"⚡"},
                {label:"RAM Used",value:sysInfo?`${Math.round(sysInfo.memUsed/1073741824)}/${Math.round(sysInfo.memTotal/1073741824)} GB`:"—",icon:"💾"},
              ].map(stat=>(
                <div key={stat.label} style={{...S.card,display:"flex",alignItems:"center",gap:16}}>
                  <span style={{fontSize:26}}>{stat.icon}</span>
                  <div>
                    <div style={{fontSize:22,fontWeight:700,color:"#f0fdf0",letterSpacing:"-0.04em"}}>{stat.value}</div>
                    <div style={{fontSize:12,color:"#4b5563",fontWeight:500}}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Server list */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {servers.length===0 && (
                <div style={{...S.card,textAlign:"center",padding:"48px 24px",color:"#374151"}}>
                  <div style={{fontSize:40,marginBottom:12}}>🖥</div>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>No servers yet</div>
                  <div style={{fontSize:13,marginBottom:20}}>Deploy your first game server to get started</div>
                  <button style={S.btn("primary")} onClick={()=>setTab("deploy")}>Deploy Server</button>
                </div>
              )}
              {servers.map(srv=>(
                <div key={srv.id} style={{...S.card,display:"flex",alignItems:"center",gap:20,animation:"fadeIn 0.3s ease"}}>
                  <div style={{width:42,height:42,borderRadius:10,background:"rgba(74,222,128,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {GAMES.find(g=>g.game===srv.game)?.icon||"🖥"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:"#f0fdf0",fontSize:15}}>{srv.name}</div>
                    <div style={{fontSize:12,color:"#4b5563",fontFamily:"monospace",marginTop:2}}>{srv.game} · ./{srv.cmd} · port {srv.port}</div>
                  </div>
                  <StatusBadge status={srv.status}/>
                  <div style={{display:"flex",gap:6}}>
                    {srv.status!=="running"?(
                      <button style={S.btn("ghost")} onClick={()=>serverAction(srv,"start")}>▶ Start</button>
                    ):(
                      <>
                        <button style={S.btn("ghost")} onClick={()=>serverAction(srv,"restart")}>↺</button>
                        <button style={S.btn("ghost")} onClick={()=>serverAction(srv,"stop")}>■ Stop</button>
                      </>
                    )}
                    <button style={S.btn("ghost")} onClick={()=>serverAction(srv,"update")}>↑ Update</button>
                    <button style={S.btn("danger")} onClick={()=>deleteServer(srv.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Live terminal for server actions */}
            {activeServer && termLines.length>0 && (
              <div style={{marginTop:20,animation:"fadeIn 0.3s ease"}}>
                <div style={{fontSize:13,color:"#4b5563",marginBottom:8,fontWeight:600}}>Terminal Output</div>
                <Terminal lines={termLines}/>
                <button style={{...S.btn("ghost"),marginTop:8,fontSize:12}} onClick={()=>{setTermLines([]);setActiveServer(null);}}>Clear</button>
              </div>
            )}

            {servers.length>0 && <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}><button style={S.btn("primary")} onClick={()=>setTab("deploy")}>＋ Deploy Another</button></div>}
          </div>
        )}

        {/* ── DEPLOY ────────────────────────────────────────────────────────── */}
        {tab==="deploy" && (
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:22,fontWeight:700,color:"#f0fdf0",marginBottom:6,letterSpacing:"-0.03em"}}>Deploy Game Server</div>
            <div style={{fontSize:13,color:"#4b5563",marginBottom:24}}>Set up a new server using LinuxGSM</div>

            {/* Step bar */}
            <div style={{display:"flex",alignItems:"center",marginBottom:28}}>
              {STEPS.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",borderRadius:8,background:step===s.id?"rgba(74,222,128,0.1)":"transparent"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:step>s.id?"#1a2e1a":step===s.id?"#4ade80":"#111",border:`2px solid ${step>=s.id?"#4ade80":"#1a2e1a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:step>s.id?"#4ade80":step===s.id?"#080c08":"#374151",flexShrink:0}}>{step>s.id?"✓":s.id}</div>
                    <span style={{fontSize:13,fontWeight:step===s.id?600:400,color:step===s.id?"#4ade80":"#374151"}}>{s.label}</span>
                  </div>
                  {i<STEPS.length-1 && <div style={{width:24,height:1,background:"#1a2e1a"}}/>}
                </div>
              ))}
            </div>

            {/* Step 1: Choose game */}
            {step===1 && (
              <div style={{animation:"slideIn 0.25s ease"}}>
                <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
                  {CATEGORIES.map(cat=><button key={cat} style={{...S.btn(category===cat?"primary":"ghost"),padding:"6px 16px",fontSize:12}} onClick={()=>setCategory(cat)}>{cat}</button>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                  {filtered.map(g=>(
                    <div key={g.id} style={S.gameCard(selected===g.id)} onClick={()=>setSelected(g.id)}>
                      {selected===g.id && <div style={{position:"absolute",top:10,right:10,width:18,height:18,borderRadius:"50%",background:"#4ade80",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#080c08",fontWeight:700}}>✓</div>}
                      <div style={{fontSize:32,marginBottom:10}}>{g.icon}</div>
                      <div style={{fontWeight:700,fontSize:15,color:"#f0fdf0",marginBottom:2}}>{g.name}</div>
                      <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>{g.game}</div>
                      {[["RAM",g.ram],["CPU",g.cpu],["Disk",g.disk]].map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#374151"}}>{k}</span><span style={{fontSize:11,color:"#6b7280",fontFamily:"monospace"}}>{v}</span></div>
                      ))}
                      <div style={{marginTop:10}}><span style={{fontSize:10,color:"#374151",background:"#111",padding:"2px 8px",borderRadius:4,fontFamily:"monospace"}}>./{g.cmd}</span></div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:24,display:"flex",justifyContent:"flex-end"}}>
                  <button style={{...S.btn("primary"),opacity:selected?1:0.4,cursor:selected?"pointer":"not-allowed"}} onClick={()=>selected&&setStep(2)}>Configure →</button>
                </div>
              </div>
            )}

            {/* Step 2: Configure */}
            {step===2 && (()=>{
              const g=GAMES.find(x=>x.id===selected);
              return (
                <div style={{animation:"slideIn 0.25s ease"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                    <div style={{...S.card}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                        <span style={{fontSize:32}}>{g.icon}</span>
                        <div><div style={{fontWeight:700,color:"#f0fdf0"}}>{g.game}</div><div style={{fontSize:12,color:"#4b5563",fontFamily:"monospace"}}>./{g.cmd}</div></div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:16}}>
                        {[{key:"serverName",label:"Server Name",placeholder:`My ${g.name} Server`,type:"text"},{key:"port",label:"Port",placeholder:String(g.defaultPort),type:"number"},{key:"maxPlayers",label:"Max Players",placeholder:"16",type:"number"},{key:"password",label:"Server Password",placeholder:"Leave empty for public",type:"password"}].map(f=>(
                          <div key={f.key}><div style={S.label}>{f.label}</div><input style={S.input} type={f.type} placeholder={f.placeholder} value={config[f.key]} onChange={e=>setConfig(c=>({...c,[f.key]:e.target.value}))}/></div>
                        ))}
                        <div><div style={S.label}>Custom Flags</div><input style={S.input} placeholder="-tickrate 128" value={config.customFlags} onChange={e=>setConfig(c=>({...c,customFlags:e.target.value}))}/></div>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:16}}>
                      <div style={S.card}>
                        <div style={{fontWeight:600,color:"#f0fdf0",marginBottom:16,fontSize:14}}>Options</div>
                        {[{key:"autoUpdate",label:"Auto Update",desc:"Update on startup"},{key:"autoStart",label:"Auto Start",desc:"Start on system boot"}].map(opt=>(
                          <div key={opt.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #111"}}>
                            <div><div style={{fontSize:13,color:"#d1d5db"}}>{opt.label}</div><div style={{fontSize:11,color:"#374151"}}>{opt.desc}</div></div>
                            <div style={{width:40,height:22,borderRadius:11,background:config[opt.key]?"#4ade80":"#1a2e1a",cursor:"pointer",position:"relative",transition:"background 0.2s"}} onClick={()=>setConfig(c=>({...c,[opt.key]:!c[opt.key]}))}>
                              <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:config[opt.key]?21:3,transition:"left 0.2s"}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{...S.card,background:"rgba(74,222,128,0.04)"}}>
                        <div style={{fontSize:12,color:"#4b5563",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Requirements</div>
                        {[["RAM",g.ram],["CPU",g.cpu],["Disk",g.disk],["Default Port",g.defaultPort]].map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #111"}}><span style={{fontSize:13,color:"#6b7280"}}>{k}</span><span style={{fontSize:13,color:"#4ade80",fontFamily:"monospace"}}>{v}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:24,display:"flex",justifyContent:"space-between"}}>
                    <button style={S.btn("ghost")} onClick={()=>setStep(1)}>← Back</button>
                    <button style={S.btn("primary")} onClick={()=>{setStep(3);deployServer();}}>Install Server →</button>
                  </div>
                </div>
              );
            })()}

            {/* Step 3: Install */}
            {step===3 && (
              <div style={{animation:"slideIn 0.25s ease"}}>
                <div style={{...S.card,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:installing?"#facc15":installDone?"#4ade80":"#374151",boxShadow:installing?"0 0 8px #facc15":installDone?"0 0 8px #4ade80":"none",animation:installing?"blink 1s infinite":"none"}}/>
                    <span style={{fontWeight:600,color:"#f0fdf0"}}>{installing?"Installing…":installDone?"Installation Complete":"Waiting…"}</span>
                  </div>
                  <Terminal lines={termLines}/>
                </div>
                {installDone && (
                  <div style={{...S.card,background:"rgba(74,222,128,0.06)",border:"1px solid #4ade8033",animation:"fadeIn 0.4s ease"}}>
                    <div style={{fontWeight:700,color:"#4ade80",marginBottom:8,fontSize:15}}>✓ Server is online!</div>
                    <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>Your server has been deployed and is ready for connections.</div>
                    <div style={{display:"flex",gap:10}}>
                      <button style={S.btn("primary")} onClick={()=>setTab("dashboard")}>View Dashboard</button>
                      <button style={S.btn("ghost")} onClick={()=>{setStep(1);setSelected(null);setInstallDone(false);setTermLines([]);}}>Deploy Another</button>
                    </div>
                  </div>
                )}
                {!installDone && <div style={{marginTop:12}}><button style={S.btn("ghost")} onClick={()=>setStep(2)}>← Back to Config</button></div>}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
        {tab==="settings" && (
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:22,fontWeight:700,color:"#f0fdf0",marginBottom:6,letterSpacing:"-0.03em"}}>Settings</div>
            <div style={{fontSize:13,color:"#4b5563",marginBottom:24}}>LinuxGSM environment configuration</div>
            <div style={{...S.card,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:"#f0fdf0",marginBottom:4}}>API / WebSocket</div>
              <div style={{fontSize:12,color:"#4b5563",marginBottom:12}}>Set VITE_API_BASE and VITE_WS_BASE in your .env file to connect to your backend.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><div style={S.label}>API Base URL</div><input style={S.input} defaultValue={API_BASE} readOnly/></div>
                <div><div style={S.label}>WebSocket URL</div><input style={S.input} defaultValue={WS_BASE} readOnly/></div>
              </div>
            </div>
            {sysInfo && (
              <div style={{...S.card,marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:600,color:"#f0fdf0",marginBottom:12}}>System Information</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
                  {[["OS",sysInfo.os],["CPU Load",`${sysInfo.cpu}%`],["Memory",`${Math.round(sysInfo.memUsed/1073741824)} / ${Math.round(sysInfo.memTotal/1073741824)} GB`],["Disk",sysInfo.disk?`${Math.round(sysInfo.disk.used/1073741824)} / ${Math.round(sysInfo.disk.size/1073741824)} GB`:"—"]].map(([k,v])=>(
                    <div key={k} style={{background:"#060b06",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#4b5563",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{k}</div>
                      <div style={{fontSize:14,color:"#4ade80",fontFamily:"monospace",fontWeight:600}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button style={S.btn("ghost")} onClick={()=>{loadServers();loadSysInfo();notify("Refreshed");}}>↺ Refresh</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
