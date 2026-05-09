/**
 * games.js
 * Supported LinuxGSM game server definitions.
 * Matches the SERVERS array in the frontend.
 */

module.exports = [
  { id: "csgo",        name: "CS2",          game: "Counter-Strike 2",      cmd: "cs2server",   category: "FPS",      defaultPort: 27015, ram: "2GB",   cpu: "2 cores", disk: "60GB" },
  { id: "tf2",         name: "TF2",          game: "Team Fortress 2",       cmd: "tf2server",   category: "FPS",      defaultPort: 27015, ram: "1GB",   cpu: "1 core",  disk: "15GB" },
  { id: "minecraft",   name: "Minecraft",    game: "Minecraft Java",        cmd: "mcserver",    category: "Sandbox",  defaultPort: 25565, ram: "2GB",   cpu: "2 cores", disk: "10GB" },
  { id: "ark",         name: "ARK",          game: "ARK: Survival Evolved", cmd: "arkserver",   category: "Survival", defaultPort: 7777,  ram: "8GB",   cpu: "4 cores", disk: "60GB" },
  { id: "rust",        name: "Rust",         game: "Rust",                  cmd: "rustserver",  category: "Survival", defaultPort: 28015, ram: "4GB",   cpu: "2 cores", disk: "20GB" },
  { id: "valheim",     name: "Valheim",      game: "Valheim",               cmd: "vhserver",    category: "Survival", defaultPort: 2456,  ram: "2GB",   cpu: "2 cores", disk: "2GB"  },
  { id: "7dtd",        name: "7 Days",       game: "7 Days to Die",         cmd: "sdtdserver",  category: "Survival", defaultPort: 26900, ram: "4GB",   cpu: "2 cores", disk: "12GB" },
  { id: "gmod",        name: "Garry's Mod",  game: "Garry's Mod",           cmd: "gmodserver",  category: "Sandbox",  defaultPort: 27015, ram: "1GB",   cpu: "1 core",  disk: "30GB" },
  { id: "terraria",    name: "Terraria",     game: "Terraria",              cmd: "terrserver",  category: "Sandbox",  defaultPort: 7777,  ram: "512MB", cpu: "1 core",  disk: "1GB"  },
  { id: "squad",       name: "Squad",        game: "Squad",                 cmd: "squadserver", category: "Military", defaultPort: 7787,  ram: "8GB",   cpu: "4 cores", disk: "40GB" },
  { id: "factorio",    name: "Factorio",     game: "Factorio",              cmd: "fctrserver",  category: "Strategy", defaultPort: 34197, ram: "1GB",   cpu: "2 cores", disk: "2GB"  },
  { id: "satisfactory",name: "Satisfactory", game: "Satisfactory",          cmd: "sfserver",    category: "Strategy", defaultPort: 7777,  ram: "8GB",   cpu: "4 cores", disk: "15GB" },
];
