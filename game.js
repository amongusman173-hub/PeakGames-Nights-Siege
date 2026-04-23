'use strict';
// ═══════════════════════════════════════════════════════════════
//  NIGHT SIEGE  —  Wave Survival Game
// ═══════════════════════════════════════════════════════════════

// ── Polyfill: roundRect for older browsers ──────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w <= 0 || h <= 0) { this.rect(x, y, Math.max(0,w), Math.max(0,h)); return this; }
    r = Math.min(Math.abs(r)||0, w/2, h/2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ── Constants ──────────────────────────────────────────────────
const TILE   = 40;
const MAP_W  = 120; // expanded map
const MAP_H  = 120; // expanded map
const BASE_X = Math.floor(MAP_W / 2);
const BASE_Y = Math.floor(MAP_H / 2);

// ── Weapon Definitions ─────────────────────────────────────────
// drawFn: function(ctx, w, h) draws the gun clipart
const WEAPONS = {
  pistol:       { name:'Pistol',        damage:25,  fireRate:400,  range:600,  spread:0.05, ammo:12,  maxAmmo:12,  reloadTime:1800, bulletSize:5,  speed:10, auto:false, price:0,    color:'#f1c40f', reserveAmmo:48,  maxReserve:96,  draw(c,w,h){drawPistol(c,w,h);} },
  shotgun:      { name:'Shotgun',       damage:20,  fireRate:900,  range:400,  spread:0.25, ammo:6,   maxAmmo:6,   reloadTime:700,  bulletSize:7,  speed:9,  auto:false, pellets:6, price:300,  color:'#e67e22', reserveAmmo:24,  maxReserve:48,  draw(c,w,h){drawShotgun(c,w,h);} },
  smg:          { name:'SMG',           damage:15,  fireRate:110,  range:550,  spread:0.12, ammo:30,  maxAmmo:30,  reloadTime:2000, bulletSize:4,  speed:12, auto:true,  price:500,  color:'#3498db', reserveAmmo:90,  maxReserve:180, draw(c,w,h){drawSMG(c,w,h);} },
  rifle:        { name:'Rifle',         damage:60,  fireRate:600,  range:800,  spread:0.02, ammo:20,  maxAmmo:20,  reloadTime:2200, bulletSize:6,  speed:16, auto:false, price:800,  color:'#2ecc71', reserveAmmo:60,  maxReserve:120, draw(c,w,h){drawRifle(c,w,h);} },
  sniper:       { name:'Sniper',        damage:150, fireRate:1500, range:1200, spread:0.005,ammo:5,   maxAmmo:5,   reloadTime:3500, bulletSize:8,  speed:22, auto:false, price:1200, color:'#9b59b6', reserveAmmo:15,  maxReserve:30,  draw(c,w,h){drawSniper(c,w,h);} },
  minigun:      { name:'Minigun',       damage:12,  fireRate:75,   range:600,  spread:0.18, ammo:200, maxAmmo:200, reloadTime:4000, bulletSize:4,  speed:13, auto:true,  price:2500, color:'#e74c3c', reserveAmmo:400, maxReserve:600, draw(c,w,h){drawMinigun(c,w,h);} },
  flamethrower: { name:'Flamethrower',  damage:8,   fireRate:55,   range:280,  spread:0.4,  ammo:100, maxAmmo:100, reloadTime:2200, bulletSize:10, speed:7,  auto:true,  price:1800, color:'#ff6b35', reserveAmmo:200, maxReserve:400, flame:true, draw(c,w,h){drawFlamethrower(c,w,h);} },
  // ── New weapons ──
  revolver:     { name:'Revolver',      damage:70,  fireRate:700,  range:700,  spread:0.03, ammo:6,   maxAmmo:6,   reloadTime:1800, bulletSize:6,  speed:14, auto:false, price:600,  color:'#c0392b', reserveAmmo:30,  maxReserve:60,  draw(c,w,h){drawRevolver(c,w,h);} },
  deagle:       { name:'Desert Eagle',  damage:90,  fireRate:600,  range:700,  spread:0.04, ammo:7,   maxAmmo:7,   reloadTime:1800, bulletSize:7,  speed:15, auto:false, price:900,  color:'#f39c12', reserveAmmo:28,  maxReserve:56,  draw(c,w,h){drawDeagle(c,w,h);} },
  ak47:         { name:'AK-47',         damage:35,  fireRate:130,  range:650,  spread:0.09, ammo:30,  maxAmmo:30,  reloadTime:3500, bulletSize:5,  speed:14, auto:true,  price:700,  color:'#e67e22', reserveAmmo:90,  maxReserve:180, draw(c,w,h){drawAK47(c,w,h);} },
  m4:           { name:'M4A1',          damage:30,  fireRate:100,  range:700,  spread:0.06, ammo:30,  maxAmmo:30,  reloadTime:2200, bulletSize:5,  speed:15, auto:true,  price:850,  color:'#27ae60', reserveAmmo:90,  maxReserve:180, draw(c,w,h){drawM4(c,w,h);} },
  rpg:          { name:'RPG',           damage:450, fireRate:3000, range:900,  spread:0.01, ammo:1,   maxAmmo:1,   reloadTime:3500, bulletSize:14, speed:10, auto:false, price:2000, color:'#e74c3c', reserveAmmo:3,   maxReserve:6,   explosive:5, draw(c,w,h){drawRPG(c,w,h);} },
  crossbow:     { name:'Crossbow',      damage:120, fireRate:1200, range:900,  spread:0.01, ammo:6,   maxAmmo:6,   reloadTime:3500, bulletSize:6,  speed:20, auto:false, price:1000, color:'#8e44ad', reserveAmmo:18,  maxReserve:36,  draw(c,w,h){drawCrossbow(c,w,h);} },
  uzi:          { name:'Uzi',           damage:12,  fireRate:80,   range:450,  spread:0.15, ammo:32,  maxAmmo:32,  reloadTime:1800, bulletSize:4,  speed:13, auto:true,  price:650,  color:'#16a085', reserveAmmo:96,  maxReserve:192, draw(c,w,h){drawUzi(c,w,h);} },
  lmg:          { name:'LMG',           damage:22,  fireRate:95,   range:700,  spread:0.1,  ammo:100, maxAmmo:100, reloadTime:2200, bulletSize:5,  speed:14, auto:true,  price:1600, color:'#d35400', reserveAmmo:200, maxReserve:400, draw(c,w,h){drawLMG(c,w,h);} },
  railgun:      { name:'Railgun',       damage:300, fireRate:2500, range:1400, spread:0.0,  ammo:3,   maxAmmo:3,   reloadTime:3500, bulletSize:10, speed:32, auto:false, price:3500, color:'#00d2ff', reserveAmmo:6,   maxReserve:12,  draw(c,w,h){drawRailgun(c,w,h);} },
};

// ── Gun Clipart Drawing Functions ──────────────────────────────
function drawPistol(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // barrel
  c.fillStyle='#888'; c.fillRect(-2,-4,s*0.45,7);
  // slide
  c.fillStyle='#666'; c.fillRect(-2,-4,s*0.35,5);
  // grip
  c.fillStyle='#555'; c.fillRect(-s*0.18,2,s*0.18,s*0.35);
  // trigger guard
  c.strokeStyle='#777'; c.lineWidth=1.5;
  c.beginPath(); c.arc(-s*0.05,s*0.18,s*0.1,0,Math.PI); c.stroke();
  // highlight
  c.fillStyle='rgba(255,255,255,0.15)'; c.fillRect(-2,-4,s*0.35,2);
  c.restore();
}
function drawShotgun(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // long barrel (double)
  c.fillStyle='#777'; c.fillRect(-4,-5,s*0.6,4);
  c.fillStyle='#888'; c.fillRect(-4,1,s*0.6,4);
  // receiver
  c.fillStyle='#5a3a1a'; c.fillRect(-s*0.25,-5,s*0.25,9);
  // stock
  c.fillStyle='#7a4a1a'; c.fillRect(-s*0.45,-3,s*0.22,7);
  c.fillStyle='rgba(255,255,255,0.1)'; c.fillRect(-4,-5,s*0.6,2);
  c.restore();
}
function drawSMG(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // body
  c.fillStyle='#555'; c.fillRect(-s*0.3,-4,s*0.55,8);
  // barrel
  c.fillStyle='#888'; c.fillRect(s*0.2,-3,s*0.25,6);
  // mag
  c.fillStyle='#444'; c.fillRect(-s*0.1,4,s*0.12,s*0.28);
  // stock
  c.fillStyle='#444'; c.fillRect(-s*0.45,-3,s*0.18,6);
  c.fillStyle='rgba(255,255,255,0.12)'; c.fillRect(-s*0.3,-4,s*0.55,2);
  c.restore();
}
function drawRifle(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // barrel
  c.fillStyle='#888'; c.fillRect(-2,-3,s*0.55,6);
  // body
  c.fillStyle='#4a3a2a'; c.fillRect(-s*0.3,-4,s*0.35,8);
  // mag
  c.fillStyle='#333'; c.fillRect(-s*0.12,4,s*0.14,s*0.3);
  // scope
  c.fillStyle='#222'; c.fillRect(-s*0.05,-7,s*0.2,4);
  c.fillStyle='#3498db'; c.fillRect(-s*0.04,-6,s*0.04,2);
  // stock
  c.fillStyle='#5a4a3a'; c.fillRect(-s*0.48,-3,s*0.2,6);
  c.fillStyle='rgba(255,255,255,0.1)'; c.fillRect(-2,-3,s*0.55,2);
  c.restore();
}
function drawSniper(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // very long barrel
  c.fillStyle='#999'; c.fillRect(-2,-2,s*0.65,5);
  // suppressor
  c.fillStyle='#aaa'; c.fillRect(s*0.55,-3,s*0.1,7);
  // body
  c.fillStyle='#3a2a1a'; c.fillRect(-s*0.28,-4,s*0.3,8);
  // big scope
  c.fillStyle='#222'; c.fillRect(-s*0.1,-8,s*0.28,5);
  c.fillStyle='#9b59b6'; c.fillRect(-s*0.08,-7,s*0.06,3);
  c.fillStyle='#9b59b6'; c.fillRect(s*0.12,-7,s*0.06,3);
  // bipod
  c.strokeStyle='#666'; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(s*0.1,3); c.lineTo(s*0.05,s*0.3); c.stroke();
  c.beginPath(); c.moveTo(s*0.1,3); c.lineTo(s*0.15,s*0.3); c.stroke();
  c.restore();
}
function drawMinigun(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // barrels (6 rotating)
  const cols = ['#888','#777','#999','#888','#777','#999'];
  for(let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const ox = Math.cos(a)*4, oy = Math.sin(a)*4;
    c.fillStyle=cols[i]; c.fillRect(ox-1+s*0.05,oy-1,s*0.45,3);
  }
  // housing
  c.fillStyle='#e74c3c'; c.beginPath(); c.arc(0,0,s*0.18,0,Math.PI*2); c.fill();
  c.fillStyle='#c0392b'; c.beginPath(); c.arc(0,0,s*0.1,0,Math.PI*2); c.fill();
  // handle
  c.fillStyle='#444'; c.fillRect(-s*0.35,-3,s*0.2,6);
  c.restore();
}
function drawFlamethrower(c,w,h) {
  const s = Math.min(w,h);
  c.save(); c.translate(w/2,h/2);
  // tank
  c.fillStyle='#c0392b'; c.beginPath(); c.ellipse(-s*0.2,0,s*0.18,s*0.22,0,0,Math.PI*2); c.fill();
  c.fillStyle='#e74c3c'; c.beginPath(); c.ellipse(-s*0.2,0,s*0.12,s*0.16,0,0,Math.PI*2); c.fill();
  // hose
  c.strokeStyle='#555'; c.lineWidth=3;
  c.beginPath(); c.moveTo(-s*0.02,0); c.bezierCurveTo(s*0.1,-s*0.1,s*0.1,s*0.1,s*0.2,0); c.stroke();
  // nozzle
  c.fillStyle='#888'; c.fillRect(s*0.15,-3,s*0.3,6);
  c.fillStyle='#ff6b35'; c.beginPath(); c.arc(s*0.45,0,4,0,Math.PI*2); c.fill();
  c.restore();
}
function drawRevolver(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#888';c.fillRect(-2,-3,s*0.42,6);c.fillStyle='#c0392b';c.beginPath();c.arc(-s*0.05,0,s*0.18,0,Math.PI*2);c.fill();c.fillStyle='#999';c.beginPath();c.arc(-s*0.05,0,s*0.12,0,Math.PI*2);c.fill();c.fillStyle='#5a3a1a';c.fillRect(-s*0.28,1,s*0.22,s*0.32);c.restore();}
function drawDeagle(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#aaa';c.fillRect(-2,-5,s*0.5,9);c.fillStyle='#888';c.fillRect(-2,-5,s*0.38,6);c.fillStyle='#666';c.fillRect(-s*0.2,3,s*0.2,s*0.3);c.fillStyle='rgba(255,255,255,0.2)';c.fillRect(-2,-5,s*0.5,2);c.restore();}
function drawAK47(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#8B4513';c.fillRect(-s*0.45,-3,s*0.2,6);c.fillStyle='#555';c.fillRect(-s*0.25,-4,s*0.55,8);c.fillStyle='#888';c.fillRect(s*0.25,-3,s*0.2,5);c.fillStyle='#8B4513';c.fillRect(-s*0.1,4,s*0.14,s*0.28);c.restore();}
function drawM4(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#444';c.fillRect(-s*0.45,-3,s*0.6,6);c.fillStyle='#333';c.fillRect(s*0.1,-4,s*0.05,8);c.fillStyle='#555';c.fillRect(s*0.15,-3,s*0.2,5);c.fillStyle='#333';c.fillRect(-s*0.08,3,s*0.12,s*0.26);c.fillStyle='#222';c.fillRect(-s*0.08,-7,s*0.22,4);c.restore();}
function drawRPG(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#5a5a2a';c.fillRect(-s*0.45,-4,s*0.7,8);c.fillStyle='#888';c.fillRect(s*0.2,-3,s*0.25,6);c.fillStyle='#e74c3c';c.beginPath();c.arc(s*0.45,0,5,0,Math.PI*2);c.fill();c.fillStyle='#333';c.fillRect(-s*0.1,4,s*0.12,s*0.22);c.restore();}
function drawCrossbow(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#5a3a1a';c.fillRect(-s*0.4,-2,s*0.6,4);c.strokeStyle='#888';c.lineWidth=2;c.beginPath();c.moveTo(-s*0.1,-s*0.3);c.lineTo(-s*0.1,s*0.3);c.stroke();c.beginPath();c.moveTo(-s*0.1,-s*0.3);c.lineTo(s*0.15,0);c.stroke();c.beginPath();c.moveTo(-s*0.1,s*0.3);c.lineTo(s*0.15,0);c.stroke();c.fillStyle='#9b59b6';c.fillRect(s*0.15,-1,s*0.05,2);c.restore();}
function drawUzi(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#444';c.fillRect(-s*0.2,-4,s*0.45,8);c.fillStyle='#555';c.fillRect(s*0.2,-3,s*0.15,5);c.fillStyle='#333';c.fillRect(-s*0.05,4,s*0.1,s*0.3);c.fillStyle='#555';c.fillRect(-s*0.35,-3,s*0.16,6);c.restore();}
function drawLMG(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#555';c.fillRect(-s*0.4,-5,s*0.65,9);c.fillStyle='#888';c.fillRect(s*0.2,-4,s*0.2,7);c.fillStyle='#d35400';c.fillRect(-s*0.15,4,s*0.22,s*0.28);c.fillStyle='#444';c.fillRect(-s*0.4,-5,s*0.15,9);c.restore();}
function drawRailgun(c,w,h){const s=Math.min(w,h);c.save();c.translate(w/2,h/2);c.fillStyle='#1a1a2e';c.fillRect(-s*0.35,-4,s*0.65,8);c.fillStyle='#00d2ff';c.fillRect(-s*0.35,-2,s*0.65,4);c.fillStyle='rgba(0,210,255,0.3)';c.fillRect(-s*0.35,-4,s*0.65,8);c.fillStyle='#fff';c.beginPath();c.arc(s*0.28,0,3,0,Math.PI*2);c.fill();c.restore();}

// ── Item Definitions ───────────────────────────────────────────
const ITEMS = {
  mine:       { name:'Mine',         icon:'💣', price:150, count:3,  type:'mine'     },
  grenade:    { name:'Grenade',      icon:'💥', price:100, count:5,  type:'grenade'  },
  medkit:     { name:'Med Kit',      icon:'💊', price:200, count:2,  type:'medkit'   },
  antidote:   { name:'Antidote',     icon:'💉', price:300, count:1,  type:'antidote' },
  nightvision:{ name:'Night Vision', icon:'👁', price:400, count:1,  type:'nightvision', permanent:true },
  nv_detection:{ name:'NV: Zombie Detect', icon:'🔍', price:600, count:1, type:'nv_detection', permanent:true },
  nv_battery:  { name:'NV: Extended Battery', icon:'🔋', price:500, count:1, type:'nv_battery', permanent:true },
  nv_recharge: { name:'NV: Fast Recharge', icon:'⚡', price:450, count:1, type:'nv_recharge', permanent:true },
  armor:      { name:'Body Armor',    icon:'🛡', price:500,  count:1, type:'armor',       permanent:true },
  turret:     { name:'Turret',        icon:'🗼', price:600,  count:1, type:'turret'   },
  barricade:  { name:'Barricade',     icon:'🧱', price:80,   count:5, type:'barricade'},
  // ── New gear ──
  c4:         { name:'C4 Charge',     icon:'🟥', price:200,  count:2, type:'c4'       },
  molotov:    { name:'Molotov',       icon:'🍾', price:80,   count:4, type:'molotov'  },
  smokegrenade:{ name:'Smoke Grenade',icon:'💨', price:60,   count:4, type:'smoke'    },
  flashbang:  { name:'Flashbang',     icon:'💡', price:80,   count:3, type:'flash'    },
  sentry:     { name:'Sentry Gun',    icon:'🤖', price:900,  count:1, type:'sentry'   },
  landmine:   { name:'Landmine Pack', icon:'⚠', price:200,  count:5, type:'mine'     },
  stimpack:   { name:'Stim Pack',     icon:'⚡', price:250,  count:2, type:'stim'     },
  heavyarmor: { name:'Heavy Armor',   icon:'🦺', price:800,  count:1, type:'heavyarmor', permanent:true },
  airstrike:  { name:'Airstrike',     icon:'✈', price:1500, count:1, type:'airstrike' },
};

// ── Fort Upgrade Tiers ─────────────────────────────────────────
const FORT_TIERS = [
  { level:0, name:'Campfire',     hp:200,  maxHp:200,  radius:30,  wallRadius:0,   lightRadius:180, cost:0,    color:'#ff6b35', desc:'A small campfire. Barely any protection.' },
  { level:1, name:'Small Camp',   hp:400,  maxHp:400,  radius:60,  wallRadius:0,   lightRadius:160, cost:300,  color:'#e67e22', desc:'Tents and sandbags. Some cover.' },
  { level:2, name:'Wooden Fort',  hp:800,  maxHp:800,  radius:100, wallRadius:120, lightRadius:200, cost:800,  color:'#8B4513', desc:'Wooden walls. Zombies must break through.' },
  { level:3, name:'Stone Fort',   hp:1500, maxHp:1500, radius:130, wallRadius:160, lightRadius:240, cost:1800, color:'#7f8c8d', desc:'Stone walls. Much harder to breach.' },
];

// ── NPC Definitions ────────────────────────────────────────────
const NPC_DEFS = {
  sniper_npc: { name:'Hired Sniper',   icon:'🎯', price:800,  color:'#9b59b6', damage:120, range:500, fireRate:2000, hp:80,  desc:'Stays near base, picks off distant zombies' },
  soldier:    { name:'Soldier',        icon:'💂', price:500,  color:'#27ae60', damage:35,  range:280, fireRate:600,  hp:120, desc:'Follows you and fights zombies' },
  medic:      { name:'Medic',          icon:'⚕',  price:600,  color:'#3498db', damage:15,  range:200, fireRate:1000, hp:60,  desc:'Heals you slowly over time when nearby' },
  engineer:   { name:'Engineer',       icon:'🔧', price:700,  color:'#e67e22', damage:20,  range:240, fireRate:800,  hp:90,  desc:'Repairs barricades and turrets' },
  heavy:      { name:'Heavy Gunner',   icon:'💪', price:1000, color:'#e74c3c', damage:50,  range:250, fireRate:400,  hp:200, desc:'Slow but tanky, draws zombie attention' },
};

// ── Zombie Definitions ─────────────────────────────────────────
const ZOMBIE_TYPES = {
  walker:   { name:'Walker',    color:'#4a7a2a', hp:60,   speed:0.8, damage:10, reward:20,  size:13 },
  runner:   { name:'Runner',    color:'#7a4a1a', hp:40,   speed:1.8, damage:8,  reward:30,  size:11 },
  brute:    { name:'Brute',     color:'#2a4a7a', hp:200,  speed:0.5, damage:25, reward:60,  size:19 },
  spitter:  { name:'Spitter',   color:'#7a2a4a', hp:50,   speed:1.0, damage:5,  reward:40,  size:12, ranged:true },
  exploder: { name:'Exploder',  color:'#7a6a2a', hp:80,   speed:1.1, damage:60, reward:50,  size:15, explodes:true },
  boss:     { name:'BOSS',      color:'#aa0000', hp:2000, speed:0.7, damage:40, reward:1000,size:34, boss:true },
  tank:     { name:'Tank',      color:'#1a3a5a', hp:600,  speed:0.35,damage:35, reward:120, size:26, tank:true },
  speedy:   { name:'Speedy',    color:'#c0392b', hp:30,   speed:3.2, damage:12, reward:45,  size:9,  speedy:true },
  ghost:    { name:'Ghost',     color:'#8e44ad', hp:70,   speed:1.2, damage:18, reward:80,  size:12, invisible:true },
  screamer: { name:'Screamer',  color:'#e67e22', hp:45,   speed:0.9, damage:5,  reward:35,  size:11, screamer:true },
  armored:  { name:'Armored',   color:'#555',    hp:150,  speed:0.6, damage:20, reward:90,  size:16, armored:true },
  // ── L4D-style specials ──
  boomer:   { name:'Boomer',    color:'#8a9a2a', hp:60,   speed:0.6, damage:5,  reward:70,  size:18, boomer:true   },
  hunter:   { name:'Hunter',    color:'#2a2a4a', hp:80,   speed:2.8, damage:30, reward:90,  size:11, hunter:true   },
  smoker:   { name:'Smoker',    color:'#4a6a4a', hp:70,   speed:0.7, damage:8,  reward:80,  size:13, smoker:true, ranged:true },
  charger:  { name:'Charger',   color:'#5a3a1a', hp:300,  speed:2.5, damage:40, reward:110, size:20, charger:true  },
  jockey:   { name:'Jockey',    color:'#6a4a2a', hp:50,   speed:2.2, damage:15, reward:85,  size:10, jockey:true   },
  witch:    { name:'Witch',     color:'#cc88aa', hp:500,  speed:0,   damage:80, reward:200, size:14, witch:true    },
};

// ── Weather ────────────────────────────────────────────────────
const WEATHERS = [
  { name:'Clear',    icon:'☀',  fog:0,    rain:false, lightning:false, wind:0   },
  { name:'Cloudy',   icon:'☁',  fog:0.1,  rain:false, lightning:false, wind:0.5 },
  { name:'Foggy',    icon:'🌫', fog:0.5,  rain:false, lightning:false, wind:0   },
  { name:'Rainy',    icon:'🌧', fog:0.15, rain:true,  lightning:false, wind:1   },
  { name:'Storm',    icon:'⛈', fog:0.2,  rain:true,  lightning:true,  wind:2   },
  { name:'Blizzard', icon:'❄',  fog:0.6,  rain:true,  lightning:false, wind:3   },
];

// ── Skill Tree Definition ──────────────────────────────────────
// Each node: { id, name, icon, desc, maxLevel, cost, x, y, requires, branch, effect }
// x/y are grid positions, rendered as a canvas tree
const SKILL_TREE = [
  // ── ROOT ──
  { id:'root', name:'Survivor', icon:'⭐', desc:'You survived. Now get stronger.', maxLevel:1, cost:0, x:4, y:0, requires:null, branch:'root', color:'#f1c40f',
    effect:(p,l)=>{} },

  // ══ COMBAT BRANCH (left) ══
  { id:'dmg_up',    name:'Lethal Rounds',    icon:'🎯', desc:'+12% bullet damage',      maxLevel:5, cost:3, x:1, y:1, requires:'root',     branch:'combat', color:'#e74c3c',
    effect:(p,l)=>{ p.dmgMult=1+l*0.12; } },
  { id:'fire_rate', name:'Trigger Finger',   icon:'⚡', desc:'-8% fire rate delay',     maxLevel:5, cost:4, x:0, y:2, requires:'dmg_up',   branch:'combat', color:'#e74c3c',
    effect:(p,l)=>{ p.fireRateMult=1-l*0.08; } },
  { id:'spread',    name:'Steady Aim',       icon:'🔭', desc:'-15% bullet spread',      maxLevel:4, cost:3, x:2, y:2, requires:'dmg_up',   branch:'combat', color:'#e74c3c',
    effect:(p,l)=>{ p.spreadMult=1-l*0.15; } },
  { id:'range',     name:'Long Barrel',      icon:'📏', desc:'+15% bullet range',       maxLevel:4, cost:3, x:0, y:3, requires:'fire_rate', branch:'combat', color:'#e74c3c',
    effect:(p,l)=>{ p.rangeMult=1+l*0.15; } },
  { id:'explosive', name:'Explosive Rounds', icon:'💥', desc:'Bullets have AoE',        maxLevel:3, cost:6, x:1, y:3, requires:'spread',    branch:'combat', color:'#e74c3c',
    effect:(p,l)=>{ p.explosiveRounds=l; } },
  { id:'double_tap',name:'Double Tap',       icon:'🔫', desc:'10% chance fire twice',   maxLevel:3, cost:5, x:2, y:3, requires:'spread',    branch:'combat', color:'#e74c3c',
    effect:(p,l)=>{ p.doubleTap=l*0.1; } },
  // Melee branch off combat
  { id:'melee_dmg', name:'Iron Fist',        icon:'👊', desc:'+20 melee damage/level',  maxLevel:4, cost:4, x:0, y:4, requires:'range',     branch:'combat', color:'#c0392b',
    effect:(p,l)=>{ p.meleeDmgBonus=l*20; } },
  { id:'melee_range',name:'Long Reach',      icon:'🦾', desc:'+15 melee range/level',   maxLevel:3, cost:3, x:1, y:4, requires:'melee_dmg', branch:'combat', color:'#c0392b',
    effect:(p,l)=>{ p.meleeRangeBonus=l*15; } },
  { id:'melee_speed',name:'Flurry',          icon:'💨', desc:'-20% melee cooldown',     maxLevel:3, cost:4, x:2, y:4, requires:'melee_dmg', branch:'combat', color:'#c0392b',
    effect:(p,l)=>{ p.meleeCooldownMult=1-l*0.2; } },

  // ══ SURVIVAL BRANCH (center-left) ══
  { id:'max_hp',    name:'Iron Constitution',icon:'❤', desc:'+20 max HP/level',         maxLevel:5, cost:3, x:3, y:1, requires:'root',      branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.maxHp=100+l*20; } },
  { id:'regen',     name:'Regeneration',     icon:'💚', desc:'Regen HP out of combat',  maxLevel:3, cost:5, x:2, y:2, requires:'max_hp',    branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.regenRate=l*0.5; } },
  { id:'armor_perk',name:'Kevlar',           icon:'🛡', desc:'+8% damage reduction',    maxLevel:5, cost:4, x:3, y:2, requires:'max_hp',    branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.armorPerk=l*8; } },
  { id:'speed',     name:'Fleet Foot',       icon:'👟', desc:'+0.4 move speed/level',   maxLevel:4, cost:3, x:4, y:2, requires:'max_hp',    branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.speedBonus=l*0.4; } },
  { id:'last_stand',name:'Last Stand',       icon:'⚰', desc:'Survive one lethal hit',  maxLevel:1, cost:8, x:3, y:3, requires:'armor_perk',branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.lastStand=l>0; } },
  { id:'infection', name:'Immunity',         icon:'☣', desc:'-20% infection gain',     maxLevel:4, cost:4, x:4, y:3, requires:'speed',     branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.infectionResist=l*0.2; } },
  { id:'vampire',   name:'Vampire',          icon:'🧛', desc:'Heal 2HP per kill',       maxLevel:3, cost:5, x:2, y:3, requires:'regen',     branch:'survival', color:'#27ae60',
    effect:(p,l)=>{ p.vampireHeal=l*2; } },
  { id:'berserker', name:'Berserker',        icon:'😡', desc:'+5% dmg per 10% missing HP',maxLevel:3,cost:6,x:3,y:4, requires:'last_stand',branch:'survival', color:'#27ae60',
    effect:(p,l)=>{ p.berserker=l; } },
  { id:'adrenaline',name:'Adrenaline',       icon:'💉', desc:'Speed burst on kill',     maxLevel:2, cost:6, x:4, y:4, requires:'infection', branch:'survival', color:'#27ae60',
    effect:(p,l)=>{ p.adrenaline=l; } },
  { id:'endurance', name:'Endurance',        icon:'⚡', desc:'+25 max stamina/level',    maxLevel:4, cost:3, x:2, y:1, requires:'root',      branch:'survival', color:'#2ecc71',
    effect:(p,l)=>{ p.maxStamina=100+l*25; } },
  { id:'sprint_eff',name:'Sprint Efficiency',icon:'🏃', desc:'-20% stamina drain/level', maxLevel:3, cost:4, x:2, y:2, requires:'endurance', branch:'survival', color:'#27ae60',
    effect:(p,l)=>{ p.sprintDrainMult=1-l*0.2; } },
  { id:'quick_regen',name:'Quick Recovery',  icon:'💨', desc:'+30% stamina regen/level', maxLevel:3, cost:4, x:1, y:3, requires:'sprint_eff',branch:'survival', color:'#27ae60',
    effect:(p,l)=>{ p.staminaRegenMult=1+l*0.3; } },

  // ══ TECH BRANCH (center-right) ══
  { id:'fl_battery',name:'Extended Battery', icon:'🔋', desc:'+30s flashlight life/lvl',maxLevel:4, cost:3, x:5, y:1, requires:'root',      branch:'tech', color:'#3498db',
    effect:(p,l)=>{ p.flashBatteryBonus=l*30; } },
  { id:'fl_range',  name:'Beam Extender',    icon:'🔦', desc:'+60px flashlight range',  maxLevel:3, cost:4, x:5, y:2, requires:'fl_battery',branch:'tech', color:'#3498db',
    effect:(p,l)=>{ p.flashRangeBonus=l*60; } },
  { id:'fl_width',  name:'Wide Beam',        icon:'📐', desc:'+15° cone width/level',   maxLevel:3, cost:4, x:6, y:2, requires:'fl_battery',branch:'tech', color:'#3498db',
    effect:(p,l)=>{ p.flashWidthBonus=l*0.26; } },
  { id:'fl_recharge',name:'Solar Cell',      icon:'☀', desc:'2x faster recharge',      maxLevel:2, cost:5, x:5, y:3, requires:'fl_range',  branch:'tech', color:'#3498db',
    effect:(p,l)=>{ p.flashRechargeMult=1+l; } },
  { id:'turret_up', name:'Turret Upgrade',   icon:'🗼', desc:'+25% turret damage/range',maxLevel:3, cost:5, x:6, y:3, requires:'fl_width',  branch:'tech', color:'#2980b9',
    effect:(p,l)=>{ p.turretMult=1+l*0.25; } },
  { id:'reload',    name:'Speed Loader',     icon:'🔄', desc:'-10% reload time/level',  maxLevel:4, cost:3, x:7, y:2, requires:'fl_battery',branch:'tech', color:'#3498db',
    effect:(p,l)=>{ p.reloadMult=1-l*0.1; } },
  { id:'start_ammo',name:'Prepared',         icon:'📦', desc:'Start with extra ammo',   maxLevel:3, cost:3, x:7, y:3, requires:'reload',    branch:'tech', color:'#2980b9',
    effect:(p,l)=>{ p.startAmmoPacks=l; } },
  { id:'sentry_up', name:'Sentry AI',        icon:'🤖', desc:'Sentries target faster',  maxLevel:2, cost:6, x:6, y:4, requires:'turret_up', branch:'tech', color:'#1a6b9a',
    effect:(p,l)=>{ p.sentryMult=1+l*0.3; } },

  // ══ SHADOW BRANCH (right) ══
  { id:'lucky',     name:'Lucky Drop',       icon:'🍀', desc:'+15% money from kills',   maxLevel:4, cost:4, x:7, y:1, requires:'root',      branch:'shadow', color:'#9b59b6',
    effect:(p,l)=>{ p.luckyMult=1+l*0.15; } },
  { id:'kill_bonus',name:'Bounty Hunter',    icon:'🏆', desc:'+$5 per kill/level',      maxLevel:5, cost:3, x:7, y:2, requires:'lucky',     branch:'shadow', color:'#9b59b6',
    effect:(p,l)=>{ p.killBonus=l*5; } },
  { id:'shop_disc', name:'Bargain',          icon:'🏷', desc:'-8% shop prices/level',   maxLevel:4, cost:4, x:8, y:2, requires:'lucky',     branch:'shadow', color:'#9b59b6',
    effect:(p,l)=>{ p.shopDiscount=l*0.08; } },
  { id:'interest',  name:'Interest',         icon:'📈', desc:'Earn 2% money each wave', maxLevel:3, cost:5, x:7, y:3, requires:'kill_bonus',branch:'shadow', color:'#8e44ad',
    effect:(p,l)=>{ p.interest=l*0.02; } },
  { id:'start_money',name:'Investor',        icon:'💵', desc:'+$50 starting money',     maxLevel:5, cost:2, x:8, y:3, requires:'shop_disc', branch:'shadow', color:'#8e44ad',
    effect:(p,l)=>{ p.startMoneyBonus=l*50; } },
  { id:'scavenger', name:'Scavenger',        icon:'🎒', desc:'Find ammo on kills',      maxLevel:3, cost:3, x:7, y:4, requires:'interest',  branch:'shadow', color:'#8e44ad',
    effect:(p,l)=>{ p.scavenger=l*0.15; } },
  { id:'wave_bonus',name:'Wave Bonus',       icon:'🌊', desc:'+$50 wave clear bonus',   maxLevel:4, cost:3, x:8, y:4, requires:'start_money',branch:'shadow',color:'#6c3483',
    effect:(p,l)=>{ p.waveBonusMult=1+l*0.25; } },
];

// Build lookup map
const SKILL_MAP = {};
SKILL_TREE.forEach(n => SKILL_MAP[n.id] = n);

const BRANCH_COLORS = { root:'#f1c40f', combat:'#e74c3c', survival:'#2ecc71', tech:'#3498db', shadow:'#9b59b6' };

// ═══════════════════════════════════════════════════════════════
//  AUDIO SYSTEM
// ═══════════════════════════════════════════════════════════════
const SFX = {};
const LOOPS = {};
let _audioUnlocked = false;

function _loadSound(key, path, loop=false, volume=1.0) {
  const a = new Audio(path);
  a.loop = loop;
  a.volume = volume;
  if (loop) LOOPS[key] = a;
  else SFX[key] = a;
  return a;
}

// ── One-shot SFX ──
_loadSound('pistol_shot',    'sounds/PistolShot.mp3',                    false, 0.5);
_loadSound('ak47_shot',      'sounds/ak47shot.wav',                      false, 0.5);
_loadSound('m4_shot',        'sounds/M4A1_shot.mp3',                     false, 0.5);
_loadSound('uzi_shot',       'sounds/UziShot.mp3',                       false, 0.45);
_loadSound('burst_shot',     'sounds/BurstShotX3.mp3',                   false, 0.5);
_loadSound('laser_shot',     'sounds/lasergunshot.wav',                   false, 0.5);
_loadSound('revolver_shot',  'sounds/revolver-shoot.ogg',                 false, 0.55);
_loadSound('shotgun_shot',   'sounds/shotgunshoot.wav',                   false, 0.6);
_loadSound('shotgun_reload', 'sounds/shotgunreload.wav',                  false, 0.65);
_loadSound('shotgun_pump',   'sounds/shotgunpump.wav',                    false, 0.65);
_loadSound('rifle_shot',     'sounds/rifle-fire.ogg',                     false, 0.5);
_loadSound('rifle_reload',   'sounds/rifle-reload.ogg',                   false, 0.65);
_loadSound('crossbow_shot',  'sounds/crossbowshoot.ogg',                  false, 0.55);
_loadSound('crossbow_reload','sounds/crossbow-reload-part1.ogg',          false, 0.6);
_loadSound('rpg_shot',       'sounds/rpg-shoot.ogg',                      false, 0.65);
_loadSound('rpg_reload',     'sounds/rpg-reload.ogg',                     false, 0.6);
_loadSound('revolver_reload','sounds/revolver-reload.ogg',                false, 0.6);
_loadSound('ak47_reload',    'sounds/ak47reload.wav',                     false, 0.6);
_loadSound('m4_reload',      'sounds/m4a1 reload.mp3',                    false, 0.75);
_loadSound('pistol_reload',  'sounds/pistolreload:uziandotherstuff.wav',  false, 0.6);
_loadSound('melee',          'sounds/melee.wav',                          false, 0.7);
_loadSound('melee_hit',      'sounds/melee-hit.ogg',                      false, 0.75);
_loadSound('take_damage',    'sounds/take_damage.wav',                    false, 0.7);
_loadSound('flashlight_on',  'sounds/flashlight-on.ogg',                  false, 0.85);
_loadSound('flashlight_off', 'sounds/flashlight-off.ogg',                 false, 0.85);
_loadSound('night_vision_on',  'sounds/nightvision-on.ogg',                false, 0.65);
_loadSound('night_vision_off', 'sounds/nightvision-off.ogg',               false, 0.65);
_loadSound('btn_click',      'sounds/buttonclick.mp3',                    false, 0.5);
_loadSound('shop_open',      'sounds/Open shop doorbell - Creator Store.ogg', false, 0.55);
_loadSound('throw_item',     'sounds/throw-item.ogg',                     false, 0.6);
_loadSound('loot',           'sounds/loot.wav',                           false, 0.55);
_loadSound('explosion',      'sounds/explosion.ogg',                      false, 0.35);
_loadSound('molotov',        'sounds/molotove-explode.mp3',               false, 0.6);
_loadSound('pause_in',       'sounds/pause_game.mp3',                     false, 0.5);
_loadSound('pause_out',      'sounds/unpause_game.mp3',                   false, 0.5);
_loadSound('lightning',      'sounds/lightningsound.mp3',                 false, 0.4);
_loadSound('walk_water',     'sounds/walk_in_water.mp3',                  false, 0.4);
_loadSound('step_grass',     'sounds/grass-step.ogg',                      false, 0.35);
_loadSound('step_concrete',  'sounds/concrete-step.ogg',                   false, 0.35);

// ── Ambient loops ──
_loadSound('day_amb',       'sounds/day_ambience.mp3',          true,  0.25);
_loadSound('night_amb',     'sounds/night_ambience.mp3',        true,  0.3);
_loadSound('campfire',      'sounds/campfire_ambience.mp3',     true,  0.2);
_loadSound('rain_loop',     'sounds/rain.mp3',                  true,  0.0);
_loadSound('flame_loop',    'sounds/flamethrower.mp3',          true,  0.0);
_loadSound('zombie_loop',   'sounds/zombiesounds.mp3',          true,  0.0);
_loadSound('river_loop',    'sounds/river_ambience.mp3',        true,  0.0);
_loadSound('mm_music',      'sounds/main-menu-soundtrack.ogg',  true,  0.35);

// Weapon → shot sound mapping
const WEAPON_SHOT_SFX = {
  pistol:'pistol_shot', deagle:'pistol_shot',
  revolver:'revolver_shot',
  ak47:'ak47_shot',
  m4:'m4_shot',
  uzi:'uzi_shot', smg:'uzi_shot',
  shotgun:'shotgun_shot',
  rifle:'rifle_shot',
  lmg:'burst_shot',
  sniper:'laser_shot', railgun:'laser_shot',
  crossbow:'crossbow_shot',
  rpg:'rpg_shot',
  minigun:'uzi_shot',
  flamethrower:null, // handled by loop
};

// Weapon → reload sound mapping
const WEAPON_RELOAD_SFX = {
  pistol:'pistol_reload', deagle:'pistol_reload',
  uzi:'pistol_reload', smg:'pistol_reload',
  revolver:'revolver_reload',
  shotgun:'shotgun_reload',
  ak47:'ak47_reload',
  m4:'m4_reload', lmg:'m4_reload',
  rifle:'rifle_reload',
  crossbow:'crossbow_reload',
  rpg:'rpg_reload',
  sniper:'ak47_reload', railgun:'ak47_reload',
  minigun:'m4_reload', flamethrower:'pistol_reload',
};

function playSound(key, pitchVariance=0) {
  if (!_audioUnlocked) return;
  const src = SFX[key];
  if (!src) return;
  try {
    const clone = src.cloneNode();
    clone.volume = src.volume;
    if (pitchVariance > 0) clone.playbackRate = 1 + (Math.random()-0.5)*pitchVariance;
    clone.play().catch(()=>{});
  } catch(e) {}
}

function startLoop(key, vol) {
  if (!_audioUnlocked) return;
  const a = LOOPS[key];
  if (!a) return;
  if (vol !== undefined) a.volume = vol;
  if (a.paused) a.play().catch(()=>{});
}

function stopLoop(key, fadeMs=500) {
  const a = LOOPS[key];
  if (!a || a.paused) return;
  if (fadeMs <= 0) { a.pause(); a.currentTime=0; return; }
  const startVol = a.volume;
  const step = startVol / (fadeMs/50);
  const iv = setInterval(()=>{
    a.volume = Math.max(0, a.volume - step);
    if (a.volume <= 0) { a.pause(); a.currentTime=0; a.volume=startVol; clearInterval(iv); }
  }, 50);
}

function setLoopVolume(key, vol) {
  const a = LOOPS[key];
  if (a) a.volume = Math.max(0, Math.min(1, vol));
}

// Unlock audio on first user interaction
function _unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  // Warm up all audio
  Object.values(SFX).forEach(a => { a.play().catch(()=>{}); a.pause(); a.currentTime=0; });
  Object.values(LOOPS).forEach(a => { a.play().catch(()=>{}); a.pause(); a.currentTime=0; });
}
document.addEventListener('click', _unlockAudio, { once:true });
document.addEventListener('keydown', _unlockAudio, { once:true });

// ── Ambient phase switcher ──
function updateAmbience() {
  if (!G.running || G.gameOver) return;
  if (G.phase === 'day') {
    startLoop('day_amb', 0.25);
    stopLoop('night_amb');
    // Campfire near base
    const distToBase = Math.hypot(G.player.x-(G.base.x+G.base.w/2), G.player.y-(G.base.y+G.base.h/2));
    setLoopVolume('campfire', Math.max(0, 0.3 - distToBase/1200));
    startLoop('campfire');
  } else {
    startLoop('night_amb', 0.3);
    stopLoop('day_amb');
    // Zombie ambient volume scales with nearby zombies
    const nearbyZ = G.zombies.filter(z=>Math.hypot(z.x-G.player.x,z.y-G.player.y)<400).length;
    setLoopVolume('zombie_loop', Math.min(0.35, nearbyZ*0.04));
    if (nearbyZ > 0) startLoop('zombie_loop'); else stopLoop('zombie_loop', 800);
    // Campfire fades with distance
    const d2 = Math.hypot(G.player.x-(G.base.x+G.base.w/2), G.player.y-(G.base.y+G.base.h/2));
    setLoopVolume('campfire', Math.max(0, 0.2 - d2/1500));
    startLoop('campfire');
  }
  // Rain
  if (G.weather && G.weather.rain) {
    startLoop('rain_loop', 0.3);
  } else {
    stopLoop('rain_loop', 1000);
  }
  // River — volume based on proximity to nearest water tile
  if (G.player && mapTiles.length) {
    const px = Math.floor(G.player.x/TILE), py = Math.floor(G.player.y/TILE);
    let nearestWaterDist = 999;
    for (let dy=-8; dy<=8; dy++) for (let dx=-8; dx<=8; dx++) {
      const tx=px+dx, ty=py+dy;
      if (tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H&&mapTiles[ty][tx]==='water') {
        nearestWaterDist = Math.min(nearestWaterDist, Math.hypot(dx,dy));
      }
    }
    const riverVol = Math.max(0, 0.28 - nearestWaterDist*0.035);
    if (riverVol > 0.01) { startLoop('river_loop', riverVol); }
    else stopLoop('river_loop', 1500);
  }
}

// ── Persistent Storage ─────────────────────────────────────────
function loadSave() {
  try {
    const raw = localStorage.getItem('nightsiege_save');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { perkCoins: 0, perks: {} };
}
function writeSave(data) {
  try { localStorage.setItem('nightsiege_save', JSON.stringify(data)); } catch(e) {}
}
let SAVE = loadSave();

// ── Game State Save/Load ───────────────────────────────────────
function saveGameState() {
  try {
    const state = {
      wave: G.wave,
      phase: G.phase,
      dayTimer: G.dayTimer,
      money: G.money,
      totalKills: G.totalKills,
      earnedMoney: G.earnedMoney,
      fortLevel: G.fortLevel,
      fortWallHp: G.fortWallHp || 0,
      fortWallMaxHp: G.fortWallMaxHp || 0,
      base: { hp: G.base.hp, maxHp: G.base.maxHp },
      player: {
        hp: G.player.hp, maxHp: G.player.maxHp,
        stamina: G.player.stamina, maxStamina: G.player.maxStamina,
        infection: G.player.infection, infectionDeathTimer: G.player.infectionDeathTimer,
        armor: G.player.armor, hasArmor: G.player.hasArmor,
        hasNightVision: G.player.hasNightVision,
        nvBatteryLevel: G.player.nvBatteryLevel||0,
        nvRechargeLevel: G.player.nvRechargeLevel||0,
        nvDetection: G.player.nvDetection||false,
        nvBatteryCurrent: G.nvBatteryCurrent||0,
        slots: JSON.parse(JSON.stringify(G.player.slots)),
        inventory: JSON.parse(JSON.stringify(G.player.inventory)),
        selectedSlot: G.player.selectedSlot,
      },
      flashlightBattery: G.flashlightBattery,
    };
    localStorage.setItem('nightsiege_gamestate', JSON.stringify(state));
  } catch(e) {}
}
function loadGameState() {
  try {
    const raw = localStorage.getItem('nightsiege_gamestate');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}
function clearGameState() {
  try { localStorage.removeItem('nightsiege_gamestate'); } catch(e) {}
}
function hasSavedGame() {
  return !!localStorage.getItem('nightsiege_gamestate');
}

function getPerkLevel(id) { return SAVE.perks[id] || 0; }
function getPerkCost(node) {
  const lvl = getPerkLevel(node.id);
  return node.cost + lvl * Math.ceil(node.cost * 0.6);
}
function isPerkUnlocked(node) {
  if (!node.requires) return true;
  return getPerkLevel(node.requires) > 0;
}

// ═══════════════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════════════
let G = {};
let mapTiles = [];
let mapCanvas = null; // offscreen map cache

function initGame() {
  const p = buildPlayerFromPerks();
  G = {
    phase: 'day',
    wave: 1,
    dayTimer: 60,
    nightTimer: 0,
    zombiesLeft: 0,
    zombiesSpawned: 0,
    totalZombies: 0,
    bossSpawned: false,
    shopOpen: false,
    shopTab: 'weapons',
    shopManuallyDismissed: false,

    player: p,
    base: { hp:500, maxHp:500, x:BASE_X*TILE, y:BASE_Y*TILE, w:TILE*3, h:TILE*3 },
    fortLevel: 0, // 0=campfire, 1=small camp, 2=wooden fort, 3=stone fort
    fortWallHp: 0, fortWallMaxHp: 0, // wall HP for level 2+ forts

    money: 100 + (p.startMoneyBonus||0),
    totalKills: 0,
    earnedMoney: 0,

    zombies: [],
    bullets: [],
    particles: [],
    mines: [],
    turrets: [],
    barricades: [],
    lootables: [],
    npcs: [],
    structures: [],
    projectiles: [],
    floatingTexts: [],
    rainDrops: [],
    lightningFlash: 0,

    cam: { x:0, y:0 },
    weather: WEATHERS[0],
    weatherTimer: 120000,
    nightVisionActive: false,
    nvBatteryCurrent: 0,  // current NV battery charge (seconds)
    skyBrightness: 1.0,   // 0=night, 1=day — lerps during transitions
    skyTransitioning: false,
    flashlightOn: false,
    flashlightBattery: 100, // percent, drains while on

    keys: {},
    mouse: { x: canvas.width/2, y: canvas.height/2, down: false },
    lastTime: 0,
    running: false,
    gameOver: false,
    paused: false,
    lastDamageTime: 0,
  };

  generateMap();
  updateHUD();
  updateToolbar();
}

function buildPlayerFromPerks() {
  const p = {
    x: BASE_X*TILE + TILE/2,
    y: BASE_Y*TILE + TILE/2,
    hp: 100, maxHp: 100,
    speed: 3.5, speedBonus: 0,
    armor: 0, armorPerk: 0,
    infection: 0, infectionResist: 0,
    hasNightVision: false, hasArmor: false,
    nvBattery: 0,        // 0 = no NV, >0 = has NV with this max battery
    nvBatteryLevel: 0,   // 0=none, 1=basic(100s), 2=extended(200s), 3=ultra(350s)
    nvRechargeLevel: 0,  // 0=base, 1=fast, 2=faster
    nvDetection: false,  // zombie highlight upgrade
    selectedSlot: 0,
    slots: [
      { weapon:'pistol', ammo:12, reserve:48, reloading:false, reloadStart:0 },
      null, null, null, null
    ],
    inventory: { mine:0, grenade:0, medkit:0, antidote:0, turret:0, barricade:0, c4:0, molotov:0, smoke:0, flash:0, stim:0, sentry:0, airstrike:0 },
    lastShot: 0, facing: 0,
    downed: false, downedTimer: 0, infectionDeathTimer: 0,
    lastMelee: 0,
    stamina: 100, maxStamina: 100, sprinting: false,
    sprintDrainMult: 1, staminaRegenMult: 1,
    // skill tree stats (defaults)
    dmgMult:1, fireRateMult:1, reloadMult:1, rangeMult:1, spreadMult:1,
    explosiveRounds:0, regenRate:0, vampireHeal:0, berserker:0,
    luckyMult:1, adrenaline:0, lastStand:false, lastStandUsed:false,
    startMoneyBonus:0, killBonus:0, waveBonusMult:1, shopDiscount:0,
    interest:0, scavenger:0, doubleTap:0, startAmmoPacks:0,
    adrenalineTimer:0,
    meleeDmgBonus:0, meleeRangeBonus:0, meleeCooldownMult:1,
    flashBatteryBonus:0, flashRangeBonus:0, flashWidthBonus:0, flashRechargeMult:1,
    turretMult:1, sentryMult:1,
  };
  // Apply all purchased skill tree nodes
  SKILL_TREE.forEach(node => {
    const lvl = getPerkLevel(node.id);
    if (lvl > 0) node.effect(p, lvl);
  });
  p.hp = p.maxHp;
  return p;
}

// ═══════════════════════════════════════════════════════════════
//  MAP GENERATION
// ═══════════════════════════════════════════════════════════════
function generateMap() {
  mapTiles = [];

  // ── Step 1: Fill with grass ──
  for (let y = 0; y < MAP_H; y++) {
    mapTiles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      mapTiles[y][x] = (x===0||y===0||x===MAP_W-1||y===MAP_H-1) ? 'wall' : 'grass';
    }
  }

  function placeRect(bx,by,bw,bh,tile) {
    for (let dy=0;dy<bh;dy++) for (let dx=0;dx<bw;dx++) {
      if (bx+dx>0&&by+dy>0&&bx+dx<MAP_W-1&&by+dy<MAP_H-1)
        mapTiles[by+dy][bx+dx]=tile;
    }
  }
  function clearRect(bx,by,bw,bh) { placeRect(bx,by,bw,bh,'grass'); }
  function isWater(tx,ty) { return tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H&&mapTiles[ty][tx]==='water'; }

  // ── Step 2: Roads first ──
  for (let x=1;x<MAP_W-1;x++) mapTiles[BASE_Y][x]='road';
  for (let y=1;y<MAP_H-1;y++) mapTiles[y][BASE_X]='road';
  const roadSpacing = 18;
  for (let r=roadSpacing; r<MAP_H-1; r+=roadSpacing) {
    if (Math.abs(r-BASE_Y)>3) for (let x=1;x<MAP_W-1;x++) mapTiles[r][x]='road';
  }
  for (let c=roadSpacing; c<MAP_W-1; c+=roadSpacing) {
    if (Math.abs(c-BASE_X)>3) for (let y=1;y<MAP_H-1;y++) mapTiles[y][c]='road';
  }

  // ── Step 3: River (before trees/rocks so they don't spawn in it) ──
  // Track which columns have water for bridge placement
  const riverCols = new Set();
  let riverY = Math.floor(MAP_H * 0.35);
  for (let x=1; x<MAP_W-1; x++) {
    riverY += Math.floor(Math.sin(x*0.18)*1.5);
    riverY = Math.max(5, Math.min(MAP_H-6, riverY));
    if (Math.abs(riverY - BASE_Y) < 10) continue;
    for (let w=-1; w<=1; w++) {
      const ry = riverY+w;
      if (ry>0&&ry<MAP_H-1) { mapTiles[ry][x]='water'; riverCols.add(x); }
    }
  }
  // Bridges at road crossings — clear water on roads so you can cross
  for (let x=1;x<MAP_W-1;x++) {
    for (let y=1;y<MAP_H-1;y++) {
      if (mapTiles[y][x]==='water' && (
        (y===BASE_Y) ||
        (Math.abs(y - Math.round(y/roadSpacing)*roadSpacing) <= 1)
      )) {
        mapTiles[y][x]='road'; // bridge
      }
    }
  }

  // ── Step 4: Scattered individual trees (not clumps) ──
  // Use a minimum spacing to prevent clumping
  const treePlaced = [];
  const MIN_TREE_DIST = 3; // tiles apart
  for (let attempt=0; attempt<800; attempt++) {
    const tx = 2 + Math.floor(Math.random()*(MAP_W-4));
    const ty = 2 + Math.floor(Math.random()*(MAP_H-4));
    if (mapTiles[ty][tx] !== 'grass') continue;
    if (Math.hypot(tx-BASE_X,ty-BASE_Y) < 12) continue;
    // Check spacing from other trees
    let tooClose = false;
    for (const [ox,oy] of treePlaced) {
      if (Math.hypot(tx-ox,ty-oy) < MIN_TREE_DIST) { tooClose=true; break; }
    }
    if (tooClose) continue;
    mapTiles[ty][tx]='tree';
    treePlaced.push([tx,ty]);
    if (treePlaced.length >= 180) break;
  }

  // ── Step 5: Small forest patches (max 5 trees each, with gaps) ──
  const forestCenters = [
    [10,10],[MAP_W-12,10],[10,MAP_H-12],[MAP_W-12,MAP_H-12],
    [Math.floor(MAP_W*0.45),Math.floor(MAP_H*0.15)],
    [Math.floor(MAP_W*0.45),Math.floor(MAP_H*0.78)],
    [Math.floor(MAP_W*0.2),Math.floor(MAP_H*0.5)],
    [Math.floor(MAP_W*0.8),Math.floor(MAP_H*0.5)],
  ];
  forestCenters.forEach(([fx,fy])=>{
    const fr = 5 + Math.floor(Math.random()*3); // radius 5-7
    for(let dy=-fr;dy<=fr;dy++) for(let dx=-fr;dx<=fr;dx++) {
      if(Math.hypot(dx,dy)<fr && Math.random()<0.45) { // 45% fill = open forest, not solid wall
        const tx=fx+dx, ty=fy+dy;
        if(tx>2&&ty>2&&tx<MAP_W-3&&ty<MAP_H-3
           && mapTiles[ty][tx]==='grass'
           && Math.hypot(tx-BASE_X,ty-BASE_Y)>14)
          mapTiles[ty][tx]='tree';
      }
    }
    // Always leave a clear path through the forest (horizontal corridor)
    for(let dx=-fr;dx<=fr;dx++) {
      const tx=fx+dx, ty=fy;
      if(tx>1&&tx<MAP_W-2&&ty>1&&ty<MAP_H-2) mapTiles[ty][tx]='grass';
    }
  });

  // ── Step 6: Rocky outcrops (small, spaced apart) ──
  for (let i=0;i<12;i++) {
    const rx=4+Math.floor(Math.random()*(MAP_W-8));
    const ry=4+Math.floor(Math.random()*(MAP_H-8));
    if (Math.hypot(rx-BASE_X,ry-BASE_Y)<12) continue;
    if (mapTiles[ry][rx]==='water') continue;
    // Small L-shaped or single rocks, never fully enclosing
    const rockCount = 2 + Math.floor(Math.random()*4);
    for(let r=0;r<rockCount;r++) {
      const tx=rx+Math.floor(Math.random()*3)-1;
      const ty=ry+Math.floor(Math.random()*3)-1;
      if(tx>1&&ty>1&&tx<MAP_W-2&&ty<MAP_H-2&&mapTiles[ty][tx]==='grass')
        mapTiles[ty][tx]='rock';
    }
  }

  // ── Step 7: City block buildings ──
  const cityZones = [
    {x:Math.floor(MAP_W*0.1), y:Math.floor(MAP_H*0.1), w:Math.floor(MAP_W*0.22), h:Math.floor(MAP_H*0.22)},
    {x:Math.floor(MAP_W*0.68), y:Math.floor(MAP_H*0.1), w:Math.floor(MAP_W*0.22), h:Math.floor(MAP_H*0.22)},
    {x:Math.floor(MAP_W*0.1), y:Math.floor(MAP_H*0.68), w:Math.floor(MAP_W*0.22), h:Math.floor(MAP_H*0.22)},
    {x:Math.floor(MAP_W*0.68), y:Math.floor(MAP_H*0.68), w:Math.floor(MAP_W*0.22), h:Math.floor(MAP_H*0.22)},
  ];
  cityZones.forEach(zone => {
    for (let i=0; i<18; i++) {
      const bx = zone.x + Math.floor(Math.random()*zone.w);
      const by = zone.y + Math.floor(Math.random()*zone.h);
      const bw = Math.floor(Math.random()*3)+2;
      const bh = Math.floor(Math.random()*3)+2;
      if (Math.hypot(bx-BASE_X,by-BASE_Y)<14) continue;
      if (mapTiles[by]&&(mapTiles[by][bx]==='road'||mapTiles[by][bx]==='water')) continue;
      placeRect(bx,by,bw,bh,'building');
    }
  });
  for (let i=0;i<25;i++) {
    const bx=Math.floor(Math.random()*(MAP_W-20))+10;
    const by=Math.floor(Math.random()*(MAP_H-20))+10;
    const bw=Math.floor(Math.random()*4)+2;
    const bh=Math.floor(Math.random()*4)+2;
    if (Math.hypot(bx-BASE_X,by-BASE_Y)<14) continue;
    if (mapTiles[by]&&(mapTiles[by][bx]==='water')) continue;
    placeRect(bx,by,bw,bh,'building');
  }

  // ── Step 8: Clear base area (after everything else) ──
  for (let dy=-9;dy<=9;dy++) for (let dx=-9;dx<=9;dx++) {
    const tx=BASE_X+dx, ty=BASE_Y+dy;
    if (tx>0&&ty>0&&tx<MAP_W-1&&ty<MAP_H-1) mapTiles[ty][tx]='grass';
  }
  // Re-draw main roads through base
  for (let x=1;x<MAP_W-1;x++) mapTiles[BASE_Y][x]='road';
  for (let y=1;y<MAP_H-1;y++) mapTiles[y][BASE_X]='road';

  // ── Step 9: Named structures (clear area first, no water check needed — base area is clear) ──
  G.structures = [];

  const gsX=Math.floor(MAP_W*0.18), gsY=Math.floor(MAP_H*0.18);
  clearRect(gsX-2,gsY-2,12,9);
  placeRect(gsX,gsY,4,3,'building'); placeRect(gsX+5,gsY,2,2,'building');
  G.structures.push({type:'gas_station',x:gsX*TILE,y:gsY*TILE,w:7*TILE,h:4*TILE,label:'⛽ Gas Station',looted:false,
    loot:[{type:'ammo',count:30},{type:'molotov',count:2},{type:'c4',count:1}]});

  const hX=Math.floor(MAP_W*0.78), hY=Math.floor(MAP_H*0.18);
  clearRect(hX-2,hY-2,14,11); placeRect(hX,hY,8,6,'building');
  G.structures.push({type:'hospital',x:hX*TILE,y:hY*TILE,w:8*TILE,h:6*TILE,label:'🏥 Hospital',looted:false,
    loot:[{type:'medkit',count:4},{type:'antidote',count:3},{type:'stim',count:2}]});

  const scX=Math.floor(MAP_W*0.18), scY=Math.floor(MAP_H*0.78);
  clearRect(scX-2,scY-2,16,12); placeRect(scX,scY,10,6,'building');
  G.structures.push({type:'school',x:scX*TILE,y:scY*TILE,w:10*TILE,h:6*TILE,label:'🏫 School',looted:false,
    loot:[{type:'grenade',count:5},{type:'mine',count:4},{type:'barricade',count:6}]});

  const psX=Math.floor(MAP_W*0.78), psY=Math.floor(MAP_H*0.78);
  clearRect(psX-2,psY-2,12,10); placeRect(psX,psY,7,5,'building');
  G.structures.push({type:'police',x:psX*TILE,y:psY*TILE,w:7*TILE,h:5*TILE,label:'🚔 Police Station',looted:false,
    loot:[{type:'grenade',count:4},{type:'mine',count:5},{type:'flash',count:4}]});

  const wX=Math.floor(MAP_W*0.08), wY=Math.floor(MAP_H*0.5);
  clearRect(wX-1,wY-2,12,9); placeRect(wX,wY,9,6,'building');
  G.structures.push({type:'warehouse',x:wX*TILE,y:wY*TILE,w:9*TILE,h:6*TILE,label:'🏭 Warehouse',looted:false,
    loot:[{type:'barricade',count:10},{type:'turret',count:1},{type:'sentry',count:1}]});

  const mbX=Math.floor(MAP_W*0.88), mbY=Math.floor(MAP_H*0.5);
  clearRect(mbX-2,mbY-2,12,10); placeRect(mbX,mbY,8,6,'building');
  G.structures.push({type:'bunker',x:mbX*TILE,y:mbY*TILE,w:8*TILE,h:6*TILE,label:'🪖 Military Bunker',looted:false,
    loot:[{type:'grenade',count:6},{type:'c4',count:3},{type:'airstrike',count:1}]});

  const smX=Math.floor(MAP_W*0.55), smY=Math.floor(MAP_H*0.3);
  clearRect(smX-2,smY-2,16,12); placeRect(smX,smY,12,8,'building');
  G.structures.push({type:'supermarket',x:smX*TILE,y:smY*TILE,w:12*TILE,h:8*TILE,label:'🛒 Supermarket',looted:false,
    loot:[{type:'medkit',count:3},{type:'ammo',count:50},{type:'barricade',count:4}]});

  // ── Step 10: Connectivity pass — ensure no fully enclosed grass islands ──
  // Flood-fill from base to find reachable tiles; open any blocked corridors
  const reachable = Array.from({length:MAP_H},()=>new Array(MAP_W).fill(false));
  const queue = [[BASE_X, BASE_Y]];
  reachable[BASE_Y][BASE_X] = true;
  while (queue.length) {
    const [cx,cy] = queue.shift();
    for (const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]) {
      if (nx<0||ny<0||nx>=MAP_W||ny>=MAP_H||reachable[ny][nx]) continue;
      const t = mapTiles[ny][nx];
      if (t==='wall'||t==='tree'||t==='rock') continue; // solid
      reachable[ny][nx]=true;
      queue.push([nx,ny]);
    }
  }
  // Any grass/road/building/water tile not reachable → clear a path to nearest reachable
  for (let y=1;y<MAP_H-1;y++) for (let x=1;x<MAP_W-1;x++) {
    const t = mapTiles[y][x];
    if (reachable[y][x]||t==='wall'||t==='tree'||t==='rock'||t==='water') continue;
    // Carve a 1-tile corridor toward base
    let cx=x, cy=y;
    for (let step=0;step<MAP_W;step++) {
      if (reachable[cy][cx]) break;
      const dx2 = BASE_X>cx?1:BASE_X<cx?-1:0;
      const dy2 = BASE_Y>cy?1:BASE_Y<cy?-1:0;
      if (dx2!==0&&mapTiles[cy][cx+dx2]!=='water') cx+=dx2;
      else if (dy2!==0&&mapTiles[cy+dy2][cx]!=='water') cy+=dy2;
      else break;
      if (mapTiles[cy][cx]==='tree'||mapTiles[cy][cx]==='rock') mapTiles[cy][cx]='grass';
    }
  }

  bakeMapCanvas();
  generateLootables();
}

// Pre-render map to offscreen canvas for performance
function bakeMapCanvas() {
  mapCanvas = document.createElement('canvas');
  mapCanvas.width  = MAP_W * TILE;
  mapCanvas.height = MAP_H * TILE;
  const mc = mapCanvas.getContext('2d');
  for (let bty=0;bty<MAP_H;bty++) {
    for (let btx=0;btx<MAP_W;btx++) {
      drawTile(mc, mapTiles[bty][btx], btx*TILE, bty*TILE, btx, bty);
    }
  }
}

function drawTile(c, tile, sx, sy, tileX, tileY) {
  const tx = tileX||0, ty = tileY||0;
  switch(tile) {
    case 'grass': {
      // Base grass with subtle color variation per tile
      const gv = ((tileX*7+tileY*13)%5)*3;
      c.fillStyle=`rgb(${38+gv},${82+gv},${24+gv})`; c.fillRect(sx,sy,TILE,TILE);
      c.fillStyle=`rgb(${42+gv},${90+gv},${28+gv})`; c.fillRect(sx+1,sy+1,TILE-2,TILE-2);
      // Grass blades
      c.fillStyle=`rgb(${55+gv},${115+gv},${38+gv})`;
      for(let i=0;i<5;i++){
        const gx=sx+3+i*7+Math.sin(tx*7+i)*2, gy=sy+5+Math.cos(ty*5+i)*4;
        c.fillRect(gx,gy,2,5);
      }
      // Occasional flower/pebble
      if ((tx*17+ty*31)%20===0) { c.fillStyle='#f1c40f'; c.beginPath(); c.arc(sx+TILE/2,sy+TILE/2,2,0,Math.PI*2); c.fill(); }
      break;
    }
    case 'road': {
      c.fillStyle='#2e2e2e'; c.fillRect(sx,sy,TILE,TILE);
      c.fillStyle='#383838'; c.fillRect(sx+1,sy+1,TILE-2,TILE-2);
      // Cracks
      c.strokeStyle='rgba(0,0,0,0.3)'; c.lineWidth=1;
      if ((tx+ty)%4===0) { c.beginPath(); c.moveTo(sx+5,sy+8); c.lineTo(sx+12,sy+20); c.stroke(); }
      // Lane markings
      c.fillStyle='rgba(255,255,255,0.18)';
      c.fillRect(sx+TILE/2-1,sy+4,2,TILE-8);
      break;
    }
    case 'water': {
      const wt = (tx+ty)*0.4;
      c.fillStyle='#1a4a7a'; c.fillRect(sx,sy,TILE,TILE);
      c.fillStyle='#1e5a8a'; c.fillRect(sx+1,sy+1,TILE-2,TILE-2);
      // Wave lines
      c.strokeStyle='rgba(100,180,255,0.3)'; c.lineWidth=1.5;
      for(let w=0;w<3;w++){
        c.beginPath();
        c.moveTo(sx+2, sy+8+w*10);
        c.bezierCurveTo(sx+TILE*0.3, sy+5+w*10, sx+TILE*0.6, sy+11+w*10, sx+TILE-2, sy+8+w*10);
        c.stroke();
      }
      break;
    }
    case 'wall': {
      c.fillStyle='#2a2a2a'; c.fillRect(sx,sy,TILE,TILE);
      c.fillStyle='#333'; c.fillRect(sx+2,sy+2,TILE-4,TILE-4);
      break;
    }
    case 'tree': {
      c.fillStyle='#1e3d0e'; c.fillRect(sx,sy,TILE,TILE);
      // Trunk
      c.fillStyle='#5a3a1a'; c.fillRect(sx+TILE/2-3,sy+TILE/2-2,6,TILE/2+2);
      // Canopy layers
      c.fillStyle='#1a4a0a';
      c.beginPath(); c.arc(sx+TILE/2,sy+TILE/2-2,TILE/2-2,0,Math.PI*2); c.fill();
      c.fillStyle='#2a6a14';
      c.beginPath(); c.arc(sx+TILE/2-3,sy+TILE/2-4,TILE/2-6,0,Math.PI*2); c.fill();
      c.fillStyle='#3a8a1e';
      c.beginPath(); c.arc(sx+TILE/2+2,sy+TILE/2-6,TILE/2-8,0,Math.PI*2); c.fill();
      break;
    }
    case 'rock': {
      c.fillStyle='#2a2a2a'; c.fillRect(sx,sy,TILE,TILE);
      c.fillStyle='#555';
      c.beginPath(); c.ellipse(sx+TILE/2,sy+TILE/2,TILE/2-4,TILE/2-7,0.3,0,Math.PI*2); c.fill();
      c.fillStyle='#777';
      c.beginPath(); c.ellipse(sx+TILE/2-3,sy+TILE/2-3,TILE/2-10,TILE/2-12,0.2,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,255,255,0.08)';
      c.beginPath(); c.ellipse(sx+TILE/2-4,sy+TILE/2-5,4,3,0.5,0,Math.PI*2); c.fill();
      break;
    }
    case 'building': {
      c.fillStyle='#252530'; c.fillRect(sx,sy,TILE,TILE);
      c.fillStyle='#2e2e3a'; c.fillRect(sx+1,sy+1,TILE-2,TILE-2);
      // Window
      c.fillStyle='#1a2a3a';
      c.fillRect(sx+6,sy+6,TILE-12,TILE-12);
      c.fillStyle='rgba(100,150,255,0.15)';
      c.fillRect(sx+7,sy+7,TILE-14,TILE-14);
      // Frame
      c.strokeStyle='#3a3a4a'; c.lineWidth=1;
      c.strokeRect(sx+0.5,sy+0.5,TILE-1,TILE-1);
      break;
    }
    default: {
      c.fillStyle='#222'; c.fillRect(sx,sy,TILE,TILE);
    }
  }
}



function isSolid(ttx, tty) {
  if (ttx<0||tty<0||ttx>=MAP_W||tty>=MAP_H) return true;
  const t = mapTiles[tty][ttx];
  // Buildings are walkable — player can enter them
  return t==='wall'||t==='tree'||t==='rock';
}
function isSolidWorld(wx, wy) {
  return isSolid(Math.floor(wx/TILE), Math.floor(wy/TILE));
}
// Bullets pass through trees, water, and buildings but not rocks/walls
function isSolidForBullet(wx, wy) {
  const ttx=Math.floor(wx/TILE), tty=Math.floor(wy/TILE);
  if (ttx<0||tty<0||ttx>=MAP_W||tty>=MAP_H) return true;
  const t = mapTiles[tty][ttx];
  return t==='wall'||t==='rock';
}
// Zombies pass through trees, water, and buildings
function isSolidForZombie(wx, wy) {
  const ttx=Math.floor(wx/TILE), tty=Math.floor(wy/TILE);
  if (ttx<0||tty<0||ttx>=MAP_W||tty>=MAP_H) return true;
  const t = mapTiles[tty][ttx];
  return t==='wall';
}
function isSolidBarricade(wx, wy) {
  for (const b of G.barricades) {
    if (Math.hypot(wx-b.x, wy-b.y) < 18) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  LOOTABLES
// ═══════════════════════════════════════════════════════════════
const LOOT_TYPES = {
  car:       { w:52, h:28, color:'#4a5568', accent:'#2d3748', label:'Car',       loot:()=>lootCar()   },
  crate:     { w:22, h:22, color:'#8B4513', accent:'#5D2E0C', label:'Crate',     loot:()=>lootCrate() },
  barrel:    { w:18, h:18, color:'#c0392b', accent:'#922b21', label:'Barrel',    loot:()=>lootBarrel()},
  cabinet:   { w:20, h:24, color:'#2c3e50', accent:'#1a252f', label:'Cabinet',   loot:()=>lootCabinet()},
  dumpster:  { w:36, h:20, color:'#27ae60', accent:'#1e8449', label:'Dumpster',  loot:()=>lootDumpster()},
};

function lootCar()      { return { money: 20+Math.floor(Math.random()*60), ammo: Math.random()<0.6 ? 'pistol' : null }; }
function lootCrate()    { return { money: 10+Math.floor(Math.random()*40), ammo: Math.random()<0.5 ? pickRandAmmo() : null }; }
function lootBarrel()   { return { money: 0, ammo: pickRandAmmo(), hp: Math.random()<0.3 ? 20 : 0 }; }
function lootCabinet()  { return { money: 30+Math.floor(Math.random()*80), ammo: Math.random()<0.7 ? pickRandAmmo() : null }; }
function lootDumpster() { return { money: 5+Math.floor(Math.random()*25), ammo: Math.random()<0.4 ? pickRandAmmo() : null, hp: Math.random()<0.2 ? 10 : 0 }; }

function pickRandAmmo() {
  const owned = G.player.slots.filter(s=>s).map(s=>s.weapon);
  if (owned.length === 0) return 'pistol';
  return owned[Math.floor(Math.random()*owned.length)];
}

function generateLootables() {
  G.lootables = [];
  const types = Object.keys(LOOT_TYPES);
  const count = 35 + Math.floor(Math.random()*20);
  let attempts = 0;
  while (G.lootables.length < count && attempts < 500) {
    attempts++;
    const tx = 2 + Math.floor(Math.random()*(MAP_W-4));
    const ty = 2 + Math.floor(Math.random()*(MAP_H-4));
    // Don't place on solid tiles or near base
    if (isSolid(tx,ty)) continue;
    if (Math.hypot(tx-BASE_X, ty-BASE_Y) < 7) continue;
    const type = types[Math.floor(Math.random()*types.length)];
    const def = LOOT_TYPES[type];
    G.lootables.push({
      x: tx*TILE + TILE/2,
      y: ty*TILE + TILE/2,
      type, def,
      looted: false,
      angle: Math.floor(Math.random()*4) * Math.PI/2,
    });
  }
}

function tryLoot() {
  if (!G.lootables) return;
  const px = G.player.x, py = G.player.y;
  for (const obj of G.lootables) {
    if (obj.looted) continue;
    if (Math.hypot(px-obj.x, py-obj.y) > 40) continue;
    // Loot it
    obj.looted = true;
    playSound('loot', 0.1);
    const reward = obj.def.loot();
    let msgs = [];
    if (reward.money > 0) {
      G.money += reward.money;
      msgs.push('+$'+reward.money);
    }
    if (reward.ammo) {
      const slot = G.player.slots.find(s=>s&&s.weapon===reward.ammo);
      if (slot) {
        const wDef = WEAPONS[reward.ammo];
        const add = Math.ceil(wDef.maxAmmo * 0.5);
        slot.reserve = Math.min(wDef.maxReserve, (slot.reserve||0) + add);
        msgs.push('+'+add+' '+wDef.name+' ammo');
      }
    }
    if (reward.hp > 0) {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + reward.hp);
      msgs.push('+'+reward.hp+' HP');
    }
    const sx = obj.x - G.cam.x, sy = obj.y - G.cam.y;
    msgs.forEach((m,i) => addFloatingText(m, sx, sy - 20 - i*18, '#f1c40f'));
    updateHUD();
    return;
  }
  addFloatingText('Nothing nearby', px-G.cam.x, py-G.cam.y-30, '#666');
}

// ═══════════════════════════════════════════════════════════════
//  WAVE / SPAWN SYSTEM
// ═══════════════════════════════════════════════════════════════
function getWaveConfig(wave) {
  const isBoss = wave % 5 === 0;
  const base = 8 + wave * 4;
  return {
    total: isBoss ? base + 20 : base,
    boss: isBoss,
    spawnRate: Math.max(350, 2000 - wave * 80),
    types: getZombiePool(wave),
  };
}
function getZombiePool(wave) {
  const pool = ['walker','walker'];
  if (wave>=2) pool.push('runner');
  if (wave>=3) pool.push('brute');
  if (wave>=4) pool.push('spitter','speedy');
  if (wave>=5) pool.push('exploder','boomer');
  if (wave>=6) pool.push('tank','armored','hunter');
  if (wave>=7) pool.push('screamer','smoker','charger');
  if (wave>=8) pool.push('ghost','jockey');
  if (wave>=10) pool.push('witch');
  return pool;
}

function startNightWave() {
  G.phase = 'night';
  G.bossSpawned = false;
  G.skyTransitioning = true; // will lerp skyBrightness to 0
  stopLoop('day_amb');
  startLoop('night_amb', 0.3);
  G.shopOpen = false;
  G.shopManuallyDismissed = false;
  G.nightTimer = 120; // 2 minutes of night
  document.getElementById('shop-overlay').classList.add('hidden');
  document.getElementById('skip-btn').classList.add('hidden');
  document.getElementById('shop-btn').classList.add('hidden');

  const el = document.getElementById('phase-badge');
  el.textContent = '🌙 NIGHT PHASE'; el.className = 'night';

  const cfg = getWaveConfig(G.wave);
  G.totalZombies = cfg.total;
  G.zombiesLeft  = cfg.total;
  G.zombiesSpawned = 0;

  // Interest perk
  if (G.player.interest > 0) {
    const bonus = Math.floor(G.money * G.player.interest);
    if (bonus > 0) { G.money += bonus; addFloatingText(`+$${bonus} interest`, canvas.width/2, canvas.height/2-60, '#f1c40f'); }
  }

  let spawned = 0;
  const spawnNext = () => {
    if (!G.running || G.phase !== 'night') return;
    if (spawned >= cfg.total) return;
    if (cfg.boss && !G.bossSpawned && spawned >= Math.floor(cfg.total/2)) {
      spawnZombie('boss'); G.bossSpawned = true;
      document.getElementById('boss-warning').classList.remove('hidden');
      setTimeout(()=>document.getElementById('boss-warning').classList.add('hidden'), 3000);
    }
    const type = cfg.types[Math.floor(Math.random()*cfg.types.length)];
    spawnZombie(type);
    spawned++; G.zombiesSpawned++;
    setTimeout(spawnNext, cfg.spawnRate + Math.random()*400);
  };
  spawnNext();
  updateHUD();
}

function spawnZombie(type) {
  const def = ZOMBIE_TYPES[type];
  let x, y;
  // Spawn in a ring around the player — far enough not to pop in, close enough to be relevant
  const MIN_DIST = 900, MAX_DIST = 1400;
  let attempts = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
    x = G.player.x + Math.cos(angle) * dist;
    y = G.player.y + Math.sin(angle) * dist;
    // Clamp to map bounds
    x = Math.max(TILE*2, Math.min((MAP_W-2)*TILE, x));
    y = Math.max(TILE*2, Math.min((MAP_H-2)*TILE, y));
    attempts++;
  } while (isSolidWorld(x, y) && attempts < 20);
  // Fallback to map edge if stuck
  if (isSolidWorld(x, y)) {
    const side = Math.floor(Math.random()*4), m = TILE*2;
    if      (side===0) { x=m+Math.random()*(MAP_W*TILE-m*2); y=m; }
    else if (side===1) { x=MAP_W*TILE-m; y=m+Math.random()*(MAP_H*TILE-m*2); }
    else if (side===2) { x=m+Math.random()*(MAP_W*TILE-m*2); y=MAP_H*TILE-m; }
    else               { x=m; y=m+Math.random()*(MAP_H*TILE-m*2); }
  }

  const scale = 1 + (G.wave-1)*0.12;
  G.zombies.push({
    type, x, y,
    hp: def.hp*scale, maxHp: def.hp*scale,
    speed: def.speed*(1+(G.wave-1)*0.05),
    damage: def.damage, reward: def.reward,
    size: def.size, color: def.color,
    ranged: def.ranged||false,
    explodes: def.explodes||false,
    boss: def.boss||false,
    lastAttack:0, lastShot:0,
    infected: Math.random()<0.3,
    angle:0, stagger:0,
    walkCycle:Math.random()*Math.PI*2,
  });
}

// Initialize fort wall HP based on current fort level
function initFortWalls() {
  if (G.fortLevel >= 2) {
    G.fortWallMaxHp = G.fortLevel === 2 ? 600 : 1200;
    if (!G.fortWallHp || G.fortWallHp <= 0) G.fortWallHp = G.fortWallMaxHp;
  } else {
    G.fortWallHp = 0; G.fortWallMaxHp = 0;
  }
}

function startDayPhase() {
  G.phase = 'day';
  G.dayTimer = 60;
  G.skyTransitioning = true; // will lerp skyBrightness to 1
  stopLoop('night_amb');
  stopLoop('zombie_loop', 1000);
  startLoop('day_amb', 0.25);
  startLoop('campfire', 0.2);
  G.zombies = []; G.bullets = []; G.projectiles = [];

  const el = document.getElementById('phase-badge');
  el.textContent = '☀ DAY PHASE'; el.className = 'day';
  document.getElementById('skip-btn').classList.remove('hidden');
  document.getElementById('shop-btn').classList.remove('hidden');

  // Wave clear bonus
  const bonus = Math.floor(200 * (G.player.waveBonusMult||1));
  G.money += bonus;
  addFloatingText(`WAVE CLEAR! +$${bonus}`, canvas.width/2, canvas.height/2-40, '#f1c40f');
  // Show wave clear banner
  const wcb = document.getElementById('wave-clear-banner');
  if (wcb) {
    wcb.classList.remove('hidden');
    wcb.style.animation = 'none';
    void wcb.offsetHeight; // reflow to restart animation
    wcb.style.animation = '';
    setTimeout(() => wcb.classList.add('hidden'), 2500);
  }

  // Last stand reset
  G.player.lastStandUsed = false;
  G.flashlightBattery = 100; // recharge at dawn
  G.flashlightOn = false;

  // Respawn lootables each day
  generateLootables();
  // Reset structure loot each new day
  if (G.structures) G.structures.forEach(s => { s.looted = false; });

  updateHUD();
}

function endNightWave() {
  if (G.phase !== 'night') return;
  G.wave++;
  document.getElementById('wave-num').textContent = G.wave;
  startDayPhase();
  // Autosave after each wave
  saveGameState();
  addFloatingText('💾 Game Saved', canvas.width/2, canvas.height/2-80, '#2ecc71');
}

// ═══════════════════════════════════════════════════════════════
//  SHOP
// ═══════════════════════════════════════════════════════════════
function openShop() {
  G.shopOpen = true;
  playSound('shop_open');
  document.getElementById('shop-wave').textContent = G.wave;
  document.getElementById('shop-money-val').textContent = G.money;
  renderShopTab(G.shopTab);
  document.getElementById('shop-overlay').classList.remove('hidden');
}

function renderShopTab(tab) {
  G.shopTab = tab;
  document.querySelectorAll('.stab').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
  const container = document.getElementById('shop-items');
  container.innerHTML = '';

  let items = [];
  const disc = G.player.shopDiscount || 0;

  if (tab === 'weapons') {
    items = Object.entries(WEAPONS).filter(([k])=>k!=='pistol').map(([k,v])=>({
      key:k, name:v.name, price:Math.floor(v.price*(1-disc)),
      category:'weapon', draw:v.draw,
      desc:`DMG:${v.damage} | RNG:${v.range} | AMO:${v.maxAmmo} | ${v.auto?'AUTO':'SEMI'}`,
      stats:[
        {label:'DMG', val:v.damage, max:160},
        {label:'RNG', val:v.range,  max:700},
        {label:'AMO', val:v.maxAmmo,max:200},
      ],
      badge: v.auto ? 'AUTO' : 'SEMI',
    }));
  } else if (tab === 'gear') {
    items = Object.entries(ITEMS).map(([k,v])=>({
      key:k, name:v.name, price:Math.floor(v.price*(1-disc)),
      category:'item', icon:v.icon,
      desc: v.permanent ? 'Permanent upgrade' : `x${v.count} per purchase`,
    }));
  } else {
    items = [
      { key:'heal',       name:'Heal +50',     icon:'❤',  price:Math.floor(150*(1-disc)),  category:'service', desc:'Restore 50 HP' },
      { key:'fullheal',   name:'Full Heal',     icon:'💖', price:Math.floor(400*(1-disc)),  category:'service', desc:'Fully restore HP' },
      { key:'baserepair', name:'Base Repair',   icon:'🏠', price:Math.floor(250*(1-disc)),  category:'service', desc:'Restore 200 base HP' },
      { key:'basefull',   name:'Base Full Fix',  icon:'🏰', price:Math.floor(600*(1-disc)),  category:'service', desc:'Fully restore base HP' },
      { key:'ammo',       name:'Ammo Pack',     icon:'📦', price:Math.floor(80*(1-disc)),   category:'service', desc:'+50% reserve ammo per weapon' },
      { key:'infection',  name:'Cure Infection',icon:'🧪', price:Math.floor(200*(1-disc)),  category:'service', desc:'Clear all infection' },
      { key:'cure_full',  name:'Full Cure',      icon:'💉', price:Math.floor(350*(1-disc)),  category:'service', desc:'Clear infection + reset death timer' },
      // Fort upgrade
      ...(G.fortLevel < FORT_TIERS.length-1 ? [{
        key:'fort_upgrade', name:'Upgrade Fort',
        icon: FORT_TIERS[G.fortLevel+1] ? FORT_TIERS[G.fortLevel+1].color ? '🏰' : '🏕' : '🏰',
        price: FORT_TIERS[G.fortLevel+1]?.cost || 9999,
        category:'service',
        desc:`Upgrade to ${FORT_TIERS[G.fortLevel+1]?.name||'Max'} — ${FORT_TIERS[G.fortLevel+1]?.desc||''}`,
      }] : [{ key:'fort_max', name:'Fort: MAXED', icon:'🏰', price:0, category:'service', desc:'Your fort is fully upgraded!' }]),
      ...Object.entries(NPC_DEFS).map(([k,v])=>({
        key:'npc_'+k, name:'Hire: '+v.name, icon:v.icon,
        price:Math.floor(v.price*(1-disc)), category:'npc', desc:v.desc,
        npcKey:k,
      })),
    ];
  }

  items.forEach(item => {
    const div = document.createElement('div');
    const cantAfford = G.money < item.price;
    let ownedStr = '';
    let isOwned = false;
    if (item.category==='weapon') {
      const has = G.player.slots.some(s=>s&&s.weapon===item.key);
      if (has) { ownedStr = '<div class="si-owned">✓ Equipped</div>'; isOwned = true; }
    } else if (item.category==='item') {
      const cnt = G.player.inventory[item.key]||0;
      if (cnt>0) ownedStr = `<div class="si-owned">x${cnt} owned</div>`;
      // Permanent gear
      if (item.key==='nightvision' && G.player.hasNightVision) { ownedStr = '<div class="si-owned">✓ Owned — buy again to recharge flashlight</div>'; isOwned = false; }
      if (item.key==='nv_detection') {
        if (!G.player.hasNightVision) { ownedStr='<div class="si-owned">⚠ Requires Night Vision</div>'; isOwned=true; }
        else if (G.player.nvDetection) { ownedStr='<div class="si-owned">✓ Active</div>'; isOwned=true; }
      }
      if (item.key==='nv_battery') {
        if (!G.player.hasNightVision) { ownedStr='<div class="si-owned">⚠ Requires Night Vision</div>'; isOwned=true; }
        else if ((G.player.nvBatteryLevel||1)>=3) { ownedStr='<div class="si-owned">✓ MAX</div>'; isOwned=true; }
        else { ownedStr=`<div class="si-owned">Lv ${G.player.nvBatteryLevel||1}/3</div>`; }
      }
      if (item.key==='nv_recharge') {
        if (!G.player.hasNightVision) { ownedStr='<div class="si-owned">⚠ Requires Night Vision</div>'; isOwned=true; }
        else if ((G.player.nvRechargeLevel||0)>=2) { ownedStr='<div class="si-owned">✓ MAX</div>'; isOwned=true; }
        else { ownedStr=`<div class="si-owned">Lv ${G.player.nvRechargeLevel||0}/2</div>`; }
      }
      if ((item.key==='armor'||item.key==='heavyarmor') && G.player.hasArmor) { ownedStr = '<div class="si-owned">✓ Owned — click to unequip</div>'; isOwned = true; }
    }
    div.className = 'shop-item' + (cantAfford&&!isOwned?' cant-afford':'') + (ownedStr?' owned-item':'');

    let iconHtml = '';
    if (item.draw) {
      iconHtml = `<canvas class="si-gun-canvas" width="64" height="36" data-weapon="${item.key}"></canvas>`;
    } else {
      iconHtml = `<span style="font-size:28px">${item.icon}</span>`;
    }

    // Build stat bars for weapons
    let statsHtml = '';
    if (item.stats) {
      statsHtml = '<div class="si-stats">' + item.stats.map(s =>
        `<span class="si-stat"><b>${s.label}</b> ${s.val}</span>`
      ).join('') + (item.badge ? `<span class="si-stat" style="color:#74b9ff">${item.badge}</span>` : '') + '</div>';
    }

    div.innerHTML = `
      <div class="si-icon">${iconHtml}</div>
      <div class="si-name">${item.name}</div>
      ${statsHtml || `<div class="si-desc">${item.desc}</div>`}
      <div class="si-price">💰 ${item.price}</div>
      ${ownedStr}
    `;
    div.addEventListener('click', ()=>buyItem(item));
    container.appendChild(div);

    // Draw gun on canvas
    if (item.draw) {
      const gc = div.querySelector('.si-gun-canvas');
      if (gc) { const gctx = gc.getContext('2d'); item.draw(gctx, 64, 36); }
    }
  });
}

function buyItem(item) {
  // Owned weapon — clicking does nothing, just show a message
  if (item.category==='weapon') {
    const ownedIdx = G.player.slots.findIndex((s,i)=>i>0&&s&&s.weapon===item.key);
    if (ownedIdx !== -1) {
      addFloatingText('Already equipped!', canvas.width/2, canvas.height/2-40, '#888');
      return;
    }
  }
  if (item.category==='item') {
    const def = ITEMS[item.key];
    if (def && def.permanent) {
      if (item.key==='nightvision' && G.player.hasNightVision) {
        G.player.hasNightVision = false;
        G.nightVisionActive = false;
        G.player.nvBatteryLevel = 0;
        G.player.nvRechargeLevel = 0;
        G.player.nvDetection = false;
        G.nvBatteryCurrent = 0;
        const refund = Math.floor(item.price * 0.5);
        G.money += refund;
        addFloatingText(`Night Vision removed — +${refund} refund`, canvas.width/2, canvas.height/2-40, '#e67e22');
        updateHUD();
        document.getElementById('shop-money-val').textContent = G.money;
        renderShopTab(G.shopTab);
        return;
      }
      if ((item.key==='armor'||item.key==='heavyarmor') && G.player.hasArmor) {
        G.player.hasArmor = false;
        G.player.armor = 0;
        const refund = Math.floor(item.price * 0.5);
        G.money += refund;
        addFloatingText(`Armor removed — +${refund} refund`, canvas.width/2, canvas.height/2-40, '#e67e22');
        updateHUD();
        document.getElementById('shop-money-val').textContent = G.money;
        renderShopTab(G.shopTab);
        return;
      }
    }
  }

  if (G.money < item.price) return;
  if (item.category==='weapon') {
    const emptySlot = G.player.slots.findIndex((s,i)=>i>0&&s===null);
    if (emptySlot===-1) { addFloatingText('No empty slot!', canvas.width/2, canvas.height/2, '#e74c3c'); return; }
    const wDef = WEAPONS[item.key];
    G.player.slots[emptySlot] = { weapon:item.key, ammo:wDef.maxAmmo, reserve:wDef.reserveAmmo, reloading:false, reloadStart:0 };
    G.money -= item.price;
    updateToolbar();
  } else if (item.category==='item') {
    const def = ITEMS[item.key];
    if (def.permanent) {
      if (item.key==='nightvision') {
        if (!G.player.hasNightVision) {
          G.player.hasNightVision = true;
          G.player.nvBatteryLevel = Math.max(1, G.player.nvBatteryLevel||0);
          G.nvBatteryCurrent = 100; // start with full basic battery
          addFloatingText('👁 Night Vision equipped! 100s battery', canvas.width/2, canvas.height/2-40, '#00ff88');
        } else {
          // Already owned — extra purchase recharges flashlight battery
          G.flashlightBattery = 100;
          addFloatingText('NV Battery Recharged!', canvas.width/2, canvas.height/2-40, '#2ecc71');
        }
      }
      if (item.key==='nv_detection') {
        G.player.nvDetection = true;
        addFloatingText('👁 NV: Zombie Detection active!', canvas.width/2, canvas.height/2-40, '#00ff88');
      }
      if (item.key==='nv_battery') {
        G.player.nvBatteryLevel = Math.min(3, (G.player.nvBatteryLevel||1) + 1);
        const newMax = [100,200,350][G.player.nvBatteryLevel-1];
        G.nvBatteryCurrent = newMax; // refill on upgrade
        addFloatingText(`👁 NV Battery upgraded! ${newMax}s`, canvas.width/2, canvas.height/2-40, '#00ff88');
      }
      if (item.key==='nv_recharge') {
        G.player.nvRechargeLevel = Math.min(2, (G.player.nvRechargeLevel||0) + 1);
        addFloatingText('👁 NV Recharge speed upgraded!', canvas.width/2, canvas.height/2-40, '#00ff88');
      }
      if (item.key==='armor') { G.player.hasArmor=true; G.player.armor=40; }
      if (item.key==='heavyarmor') { G.player.hasArmor=true; G.player.armor=60; }
    } else {
      G.player.inventory[item.key] = (G.player.inventory[item.key]||0) + def.count;
    }
    G.money -= item.price;
  } else if (item.category==='npc') {
    const npcDef = NPC_DEFS[item.npcKey];
    if (!npcDef) return;
    // Max 4 NPCs
    if ((G.npcs||[]).length >= 4) { addFloatingText('Max NPCs!', canvas.width/2, canvas.height/2, '#e74c3c'); return; }
    const isFollower = item.npcKey === 'soldier' || item.npcKey === 'medic' || item.npcKey === 'heavy';
    G.npcs.push({
      type: item.npcKey, ...npcDef,
      x: G.base.x + G.base.w/2 + (Math.random()-0.5)*60,
      y: G.base.y + G.base.h/2 + (Math.random()-0.5)*60,
      hp: npcDef.hp, maxHp: npcDef.hp,
      lastShot: 0, angle: 0,
      follows: isFollower,
      walkCycle: 0,
    });
    G.money -= item.price;
    addFloatingText(npcDef.name+' hired!', canvas.width/2, canvas.height/2-40, '#2ecc71');
  } else {
    if (item.key==='heal')       { G.player.hp=Math.min(G.player.maxHp,G.player.hp+50); }
    if (item.key==='fullheal')   { G.player.hp=G.player.maxHp; }
    if (item.key==='baserepair') { G.base.hp=Math.min(G.base.maxHp,G.base.hp+200); }
    if (item.key==='basefull')   { G.base.hp=G.base.maxHp; }
    if (item.key==='infection')  { G.player.infection=0; G.player.infectionDeathTimer=0; }
    if (item.key==='cure_full')  { G.player.infection=0; G.player.infectionDeathTimer=0; addFloatingText('CURED!', canvas.width/2, canvas.height/2-50, '#2ecc71'); }
    if (item.key==='fort_upgrade') {
      const nextTier = FORT_TIERS[G.fortLevel+1];
      if (nextTier && G.money >= nextTier.cost) {
        G.money -= nextTier.cost; // Deduct money first
        G.fortLevel++;
        G.base.maxHp = nextTier.maxHp;
        G.base.hp = nextTier.maxHp;
        // Set wall HP for walled forts
        if (G.fortLevel >= 2) {
          G.fortWallMaxHp = G.fortLevel === 2 ? 600 : 1200;
          G.fortWallHp = G.fortWallMaxHp;
        }
        addFloatingText('🏰 Fort upgraded to '+nextTier.name+'!', canvas.width/2, canvas.height/2-60, '#f1c40f');
        updateHUD();
        return; // Skip the generic money deduction below
      }
    }
    if (item.key==='fort_max') return; // nothing to buy
    if (item.key==='ammo') {
      // Give a fixed ammo pack — 50% of max reserve per weapon
      G.player.slots.forEach(s=>{
        if (s) {
          const wDef=WEAPONS[s.weapon];
          const add = Math.ceil(wDef.maxReserve * 0.5);
          s.reserve = Math.min(wDef.maxReserve, (s.reserve||0) + add);
        }
      });
      addFloatingText('+50% ammo per weapon', canvas.width/2, canvas.height/2-40, '#f1c40f');
    }
    G.money -= item.price;
  }
  updateHUD();
  document.getElementById('shop-money-val').textContent = G.money;
  renderShopTab(G.shopTab);
}

function dismissShop() {
  G.shopOpen = false;
  G.shopManuallyDismissed = true; // prevent auto-reopen
  document.getElementById('shop-overlay').classList.add('hidden');
}

function closeShop() {
  G.shopOpen = false;
  G.shopManuallyDismissed = false;
  document.getElementById('shop-overlay').classList.add('hidden');
  startNightWave();
}

// ── Shop Near Campfire ────────────────────────────────────────
// Simple shop interaction that opens the shop GUI
function getShopPosition() {
  return {
    x: G.base.x + G.base.w/2,
    y: G.base.y + G.base.h + 50,
  };
}

function tryOpenShopNearCampfire() {
  if (G.phase !== 'day') return false;
  const shop = getShopPosition();
  const dist = Math.hypot(G.player.x - shop.x, G.player.y - shop.y);
  if (dist > 60) return false;
  openShop();
  addFloatingText('Shop opened!', canvas.width/2, canvas.height/2-60, '#f1c40f');
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  G.keys[e.code] = true;
  if (!G.running && e.code !== 'Escape') return;

  // Pause toggle
  if (e.code === 'Escape') {
    if (G.running && !G.gameOver) togglePause();
    return;
  }

  if (G.paused) return;

  if (e.code==='KeyR') reloadWeapon();                 // R = Reload
  if (e.code==='KeyV') doMelee();                       // V = Melee
  if (e.code==='KeyF') toggleFlashlight();              // F = Flashlight (works day & night)
  if (e.code==='KeyN') toggleNightVision();             // N = Night Vision
  if (e.code==='KeyE') {                                // E = Interact / Medkit / Loot / Shop
    if (G.phase==='day' && tryOpenShopNearCampfire()) { /* shop */ }
    else if (tryEnterStructure()) { /* structure */ }
    else if (G.player.inventory.medkit>0) useMedkit();
    else tryLoot();
  }
  if (e.code==='KeyG') throwGrenade();                  // G = Grenade
  if (e.code==='KeyH') placeMine();                     // H = Mine
  if (e.code==='KeyT') throwMolotov();                  // T = Molotov
  if (e.code==='KeyY') callAirstrike();                 // Y = Airstrike
  if (e.code==='KeyQ') useAntidote();                   // Q = Antidote
  if (e.code==='KeyZ') useStim();                       // Z = Stim
  if (e.code==='KeyB') placeBarricade();                // B = Barricade
  if (e.code==='KeyU') placeTurret();                   // U = Turret
  if (e.code==='KeyL') tryLoot();                       // L = Loot (explicit)
  if (e.code==='Tab')  { e.preventDefault(); if(G.phase==='day') G.shopOpen ? closeShopOnly() : openShop(); }
  if (e.code==='Digit1') selectSlot(0);
  if (e.code==='Digit2') selectSlot(1);
  if (e.code==='Digit3') selectSlot(2);
  if (e.code==='Digit4') selectSlot(3);
  if (e.code==='Digit5') selectSlot(4);
});
document.addEventListener('keyup', e => { G.keys[e.code]=false; });

canvas.addEventListener('mousemove', e => {
  if (!G) return;
  G.mouse.x = e.clientX; G.mouse.y = e.clientY;
  document.getElementById('crosshair').style.left = e.clientX+'px';
  document.getElementById('crosshair').style.top  = e.clientY+'px';
});
canvas.addEventListener('mousedown', e => { if(e.button===0) G.mouse.down=true; });
canvas.addEventListener('mouseup',   e => { if(e.button===0) G.mouse.down=false; });
canvas.addEventListener('click', () => {
  if (!G.running) return;
  const slot = G.player.slots[G.player.selectedSlot];
  if (!slot) return;
  if (!WEAPONS[slot.weapon].auto) shoot();
});

document.querySelectorAll('.tool-slot').forEach(el => {
  el.addEventListener('click', ()=>selectSlot(parseInt(el.dataset.slot)));
});

// Shop tabs
document.querySelectorAll('.stab').forEach(b => {
  b.addEventListener('click', ()=>renderShopTab(b.dataset.tab));
});

document.getElementById('nv-btn').addEventListener('click', toggleNightVision);
document.getElementById('skip-btn').addEventListener('click', ()=>{ if(G.phase==='day'){ document.getElementById('shop-overlay').classList.add('hidden'); startNightWave(); } });
document.getElementById('shop-btn').addEventListener('click', ()=>{ if(G.phase==='day') G.shopOpen ? closeShopOnly() : openShop(); });
document.getElementById('shop-close').addEventListener('click', closeShop);
document.getElementById('shop-dismiss').addEventListener('click', dismissShop);

function closeShopOnly() {
  dismissShop();
}

// ── Main Menu buttons ──
document.getElementById('mm-play').addEventListener('click', startGame);
document.getElementById('mm-continue').addEventListener('click', continueGame);
document.getElementById('mm-perks-btn').addEventListener('click', ()=>{ showPerks(); });
document.getElementById('mm-how').addEventListener('click', ()=>{ document.getElementById('howto-screen').classList.remove('hidden'); });
document.getElementById('mm-privacy').addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('privacy-screen').classList.remove('hidden'); });
document.getElementById('howto-back').addEventListener('click', ()=>{ document.getElementById('howto-screen').classList.add('hidden'); });
document.getElementById('privacy-back').addEventListener('click', ()=>{ document.getElementById('privacy-screen').classList.add('hidden'); });
document.getElementById('perks-back').addEventListener('click', () => {
  document.getElementById('perks-screen').classList.add('hidden');
  // If game is over (not running), go back to main menu
  if (!G.running || G.gameOver) {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('toolbar').classList.add('hidden');
    document.getElementById('side-btns').classList.add('hidden');
    document.getElementById('crosshair').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('mm-coins').textContent = SAVE.perkCoins;
  }
});
document.getElementById('go-perks-btn').addEventListener('click', ()=>{ document.getElementById('game-over').classList.add('hidden'); showPerks(); });
document.getElementById('go-restart-btn').addEventListener('click', ()=>{ document.getElementById('game-over').classList.add('hidden'); initGame(); startGame(); });

function startGame() {
  try {
  stopLoop('mm_music', 0);
  document.getElementById('main-menu').classList.add('hidden');
  // Show gameplay UI
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('toolbar').classList.remove('hidden');
  document.getElementById('inv-bar').classList.remove('hidden');
  document.getElementById('side-btns').classList.remove('hidden');
  document.getElementById('crosshair').classList.remove('hidden');
  initGame();
  clearGameState(); // fresh run clears any old save
  G.running = true;
  G.phase = 'day';
  G.dayTimer = 60;
  G.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  } catch(e) { console.error('startGame error:', e); }
}

function continueGame() {
  try {
  stopLoop('mm_music', 0);
  const state = loadGameState();
  if (!state) { startGame(); return; }
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('toolbar').classList.remove('hidden');
  document.getElementById('inv-bar').classList.remove('hidden');
  document.getElementById('side-btns').classList.remove('hidden');
  document.getElementById('crosshair').classList.remove('hidden');
  initGame(); // build base state from perks
  // Restore saved state on top
  G.wave = state.wave;
  G.phase = state.phase;
  G.dayTimer = state.dayTimer;
  G.money = state.money;
  G.totalKills = state.totalKills;
  G.earnedMoney = state.earnedMoney;
  G.fortLevel = state.fortLevel;
  G.base.hp = state.base.hp;
  G.base.maxHp = state.base.maxHp;
  G.flashlightBattery = state.flashlightBattery;
  G.fortWallHp = state.fortWallHp || 0;
  G.fortWallMaxHp = state.fortWallMaxHp || 0;
  initFortWalls(); // ensure wall HP is valid
  // Restore player fields
  const p = G.player;
  p.hp = state.player.hp;
  p.maxHp = state.player.maxHp;
  p.stamina = state.player.stamina;
  p.maxStamina = state.player.maxStamina;
  p.infection = state.player.infection;
  p.infectionDeathTimer = state.player.infectionDeathTimer;
  p.armor = state.player.armor;
  p.hasArmor = state.player.hasArmor;
  p.hasNightVision = state.player.hasNightVision;
  p.nvBatteryLevel = state.player.nvBatteryLevel||0;
  p.nvRechargeLevel = state.player.nvRechargeLevel||0;
  p.nvDetection = state.player.nvDetection||false;
  G.nvBatteryCurrent = state.player.nvBatteryCurrent||0;
  p.slots = state.player.slots;
  p.inventory = state.player.inventory;
  p.selectedSlot = state.player.selectedSlot;
  // Restore fort tier HP
  const tier = FORT_TIERS[G.fortLevel] || FORT_TIERS[0];
  G.base.maxHp = tier.maxHp;
  document.getElementById('wave-num').textContent = G.wave;
  const phaseBadge = document.getElementById('phase-badge');
  if (G.phase === 'day') {
    phaseBadge.textContent = '☀ DAY PHASE'; phaseBadge.className = 'day';
    document.getElementById('skip-btn').classList.remove('hidden');
    document.getElementById('shop-btn').classList.remove('hidden');
    G.skyBrightness = 1.0;
    startLoop('day_amb', 0.25);
    startLoop('campfire', 0.2);
  } else {
    phaseBadge.textContent = '🌙 NIGHT PHASE'; phaseBadge.className = 'night';
    document.getElementById('skip-btn').classList.add('hidden');
    document.getElementById('shop-btn').classList.add('hidden');
    G.skyBrightness = 0.0;
    startLoop('night_amb', 0.3);
    // Re-start night wave spawning
    const cfg = getWaveConfig(G.wave);
    G.totalZombies = cfg.total;
    G.zombiesLeft = Math.max(0, G.zombiesLeft || cfg.total);
    G.zombiesSpawned = G.zombiesSpawned || 0;
  }
  generateLootables();
  if (G.structures) G.structures.forEach(s => { s.looted = false; });
  updateHUD();
  updateToolbar();
  G.running = true;
  G.gameOver = false;
  G.paused = false;
  G.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  addFloatingText('💾 Game Loaded — Wave '+G.wave, canvas.width/2, canvas.height/2-60, '#2ecc71');
  } catch(e) { console.error('continueGame error:', e); }
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER ACTIONS
// ═══════════════════════════════════════════════════════════════
function selectSlot(i) {
  // Cancel reload on the old slot when switching
  const oldSlot = G.player.slots[G.player.selectedSlot];
  if (oldSlot && oldSlot.reloading) {
    oldSlot.reloading = false;
    oldSlot.reloadStart = 0;
  }
  G.player.selectedSlot = i;
  document.querySelectorAll('.tool-slot').forEach((el,idx)=>el.classList.toggle('active',idx===i));
  updateHUD();
}

function reloadWeapon() {
  const slot = G.player.slots[G.player.selectedSlot];
  if (!slot||slot.reloading) return;
  const wDef = WEAPONS[slot.weapon];
  if (slot.ammo===wDef.maxAmmo) return;
  if ((slot.reserve||0) <= 0) { addFloatingText('NO AMMO!', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#e74c3c'); return; }
  slot.reloading=true; slot.reloadStart=performance.now();
  addFloatingText('Reloading...', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#f1c40f');
  const sfxKey = WEAPON_RELOAD_SFX[slot.weapon] || 'pistol_reload';
  playSound(sfxKey);
}

function toggleNightVision() {
  if (!G.player.hasNightVision) {
    addFloatingText('Need Night Vision!', canvas.width/2, canvas.height/2, '#e74c3c'); return;
  }
  if (!G.nightVisionActive && G.nvBatteryCurrent <= 0) {
    addFloatingText('👁 NV Battery Empty! Recharging...', canvas.width/2, canvas.height/2-40, '#00ff88'); return;
  }
  G.nightVisionActive = !G.nightVisionActive;
  document.getElementById('nv-btn').classList.toggle('active', G.nightVisionActive);
  // Separate on/off sounds
  const nvSfx = SFX[G.nightVisionActive ? 'night_vision_on' : 'night_vision_off'];
  if (nvSfx && _audioUnlocked) {
    try { const c=nvSfx.cloneNode(); c.volume=nvSfx.volume; c.play().catch(()=>{}); } catch(e) {}
  }
}

function toggleFlashlight() {
  if (!G.flashlightOn && G.flashlightBattery <= 2) {
    addFloatingText('🔦 No battery!', canvas.width/2, canvas.height/2-50, '#e74c3c');
    return;
  }
  G.flashlightOn = !G.flashlightOn;
  playSound(G.flashlightOn ? 'flashlight_on' : 'flashlight_off');
  addFloatingText(G.flashlightOn ? '🔦 Flashlight ON' : '🔦 Flashlight OFF',
    canvas.width/2, canvas.height/2 - 50, '#ffe066');
}

function placeMine() {
  if (G.player.inventory.mine<=0) return;
  G.player.inventory.mine--;
  G.mines.push({ x:G.player.x, y:G.player.y, armed:false, placed:performance.now() });
  addFloatingText('Mine placed!', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#f39c12');
}

function throwGrenade() {
  if (G.player.inventory.grenade<=0) return;
  G.player.inventory.grenade--;
  playSound('throw_item', 0.1);
  const angle = Math.atan2(G.mouse.y-(G.player.y-G.cam.y), G.mouse.x-(G.player.x-G.cam.x));
  G.projectiles.push({ x:G.player.x, y:G.player.y, vx:Math.cos(angle)*6, vy:Math.sin(angle)*6, type:'grenade', born:performance.now(), owner:'player' });
}

function useMedkit() {
  if (G.player.inventory.medkit<=0||G.player.hp>=G.player.maxHp) return;
  G.player.inventory.medkit--;
  G.player.hp = Math.min(G.player.maxHp, G.player.hp+60);
  addFloatingText('+60 HP', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#2ecc71');
  updateHUD();
}

function useAntidote() {
  if (G.player.inventory.antidote<=0) return;
  G.player.inventory.antidote--;
  G.player.infection = Math.max(0, G.player.infection-70);
  addFloatingText('Antidote!', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#9b59b6');
  updateHUD();
}

function placeTurret() {
  if (G.player.inventory.turret<=0) return;
  G.player.inventory.turret--;
  G.turrets.push({ x:G.player.x, y:G.player.y, cooldown:0, angle:0 });
  addFloatingText('Turret placed!', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#00ffff');
}

function placeBarricade() {
  if (G.player.inventory.barricade<=0) return;
  G.player.inventory.barricade--;
  const angle = G.player.facing;
  const dist = 30;
  G.barricades.push({ x:G.player.x+Math.cos(angle)*dist, y:G.player.y+Math.sin(angle)*dist, hp:100, maxHp:100, angle:angle });
  addFloatingText('Barricade placed!', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#8B4513');
}

function useStim() {
  if ((G.player.inventory.stim||0)<=0) return;
  G.player.inventory.stim--;
  G.player.adrenalineTimer = 8000;
  G.player.hp = Math.min(G.player.maxHp, G.player.hp+20);
  addFloatingText('STIM! Speed+', G.player.x-G.cam.x, G.player.y-G.cam.y-30, '#f39c12');
  updateHUD();
}

function throwMolotov() {
  if ((G.player.inventory.molotov||0)<=0) return;
  G.player.inventory.molotov--;
  playSound('throw_item', 0.1);
  const angle = Math.atan2(G.mouse.y-(G.player.y-G.cam.y), G.mouse.x-(G.player.x-G.cam.x));
  G.projectiles.push({ x:G.player.x, y:G.player.y, vx:Math.cos(angle)*5.5, vy:Math.sin(angle)*5.5, type:'molotov', born:performance.now(), owner:'player' });
}

function callAirstrike() {
  if ((G.player.inventory.airstrike||0)<=0) return;
  G.player.inventory.airstrike--;
  const wx = G.mouse.x + G.cam.x, wy = G.mouse.y + G.cam.y;
  addFloatingText('AIRSTRIKE!', G.mouse.x, G.mouse.y-30, '#e74c3c');
  for (let i=0;i<6;i++) {
    setTimeout(()=>{
      const ex = wx + (Math.random()-0.5)*120, ey = wy + (Math.random()-0.5)*120;
      explode(ex, ey, 100, 120, 'player');
      spawnParticles(ex, ey, '#ff6b35', 20, 8);
    }, i*200);
  }
}

function doMelee() {
  const now = performance.now();
  const baseCooldown = 800;
  const cooldown = baseCooldown * (G.player.meleeCooldownMult||1);
  if (now - (G.player.lastMelee||0) < cooldown) return;
  G.player.lastMelee = now;

  const baseDmg = 40 + (G.player.meleeDmgBonus||0);
  const baseRange = 65 + (G.player.meleeRangeBonus||0);
  const angle = G.player.facing;

  // Hit all zombies in a cone in front of player
  let hit = 0;
  for (let j=G.zombies.length-1;j>=0;j--) {
    const z = G.zombies[j];
    const dx = z.x - G.player.x, dy = z.y - G.player.y;
    const dist = Math.hypot(dx,dy);
    if (dist > baseRange + z.size) continue;
    const zAngle = Math.atan2(dy,dx);
    let diff = zAngle - angle;
    while(diff > Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    if (Math.abs(diff) > 0.9) continue; // ~52° cone
    z.hp -= baseDmg;
    z.stagger = 300;
    spawnParticles(z.x, z.y, '#ff6b35', 6, 4);
    if (z.hp <= 0) z._dead = true;
    hit++;
  }
  for (let j=G.zombies.length-1;j>=0;j--) {
    if (G.zombies[j]._dead) killZombie(j, G.zombies[j]);
  }

  // Visual slash effect
  G.meleeFlash = { x:G.player.x, y:G.player.y, angle, range:baseRange, born:now, hit };
  playSound('melee', 0.1);
  if (hit > 0) setTimeout(() => playSound('melee_hit', 0.1), 80);
  addFloatingText(hit>0 ? `MELEE x${hit}` : 'MISS', G.player.x-G.cam.x, G.player.y-G.cam.y-35, hit>0?'#ff6b35':'#888');
}

function shoot() {
  const slot = G.player.slots[G.player.selectedSlot];
  if (!slot||slot.reloading) return;
  const wDef = WEAPONS[slot.weapon];
  const now = performance.now();
  const adjustedFireRate = wDef.fireRate * (G.player.fireRateMult||1);
  if (now - G.player.lastShot < adjustedFireRate) return;
  if (slot.ammo<=0) { reloadWeapon(); return; }

  G.player.lastShot = now;
  slot.ammo--;

  const angle = Math.atan2(G.mouse.y-(G.player.y-G.cam.y), G.mouse.x-(G.player.x-G.cam.x));
  G.player.facing = angle;

  const pellets = wDef.pellets||1;
  const spreadMult = G.player.spreadMult||1;
  const rangeMult  = G.player.rangeMult||1;
  const dmgMult    = G.player.dmgMult||1;

  // Berserker bonus
  const hpPct = G.player.hp / G.player.maxHp;
  const berserkerBonus = G.player.berserker ? 1 + G.player.berserker * 0.05 * Math.floor((1-hpPct)*10) : 1;

  for (let p=0;p<pellets;p++) {
    const spread = (Math.random()-0.5)*wDef.spread*2*spreadMult;
    const a = angle+spread;
    G.bullets.push({
      x:G.player.x, y:G.player.y,
      vx:Math.cos(a)*wDef.speed, vy:Math.sin(a)*wDef.speed,
      damage: wDef.damage * dmgMult * berserkerBonus,
      range: wDef.range * rangeMult,
      traveled:0, color:wDef.color, size:wDef.bulletSize,
      flame:wDef.flame||false, owner:'player',
      explosive: G.player.explosiveRounds||0,
    });
  }

  // Double tap perk
  if (G.player.doubleTap && Math.random() < G.player.doubleTap) {
    for (let p=0;p<pellets;p++) {
      const spread = (Math.random()-0.5)*wDef.spread*2*spreadMult;
      const a = angle+spread;
      G.bullets.push({ x:G.player.x, y:G.player.y, vx:Math.cos(a)*wDef.speed, vy:Math.sin(a)*wDef.speed,
        damage:wDef.damage*dmgMult*0.5, range:wDef.range*rangeMult, traveled:0,
        color:wDef.color, size:wDef.bulletSize, flame:wDef.flame||false, owner:'player', explosive:0 });
    }
  }

  spawnParticles(G.player.x, G.player.y, wDef.color, 3, 2);
  // Play shot sound
  if (wDef.flame) {
    startLoop('flame_loop', 0.45);
  } else {
    const sfxKey = WEAPON_SHOT_SFX[slot.weapon] || 'pistol_shot';
    playSound(sfxKey, 0.08);
    // Shotgun pump after each shot (with short delay to follow the bang)
    if (slot.weapon === 'shotgun') {
      setTimeout(() => playSound('shotgun_pump', 0.05), 220);
    }
  }
  updateHUD();
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function movePlayer(dt) {
  const p = G.player;
  if (p.downed) return;

  // Sprint (Shift key) — exhausted until stamina fully recharges
  if (p.stamina <= 0) p.sprintExhausted = true;
  if (p.sprintExhausted && p.stamina >= p.maxStamina) p.sprintExhausted = false;
  const wantSprint = (G.keys['ShiftLeft']||G.keys['ShiftRight']) && p.stamina > 0 && !p.sprintExhausted;
  const isMoving = G.keys['KeyW']||G.keys['KeyS']||G.keys['KeyA']||G.keys['KeyD']||
                   G.keys['ArrowUp']||G.keys['ArrowDown']||G.keys['ArrowLeft']||G.keys['ArrowRight'];
  p.sprinting = wantSprint && isMoving;
  if (p.sprinting) {
    const drainMult = p.sprintDrainMult || 1;
    p.stamina = Math.max(0, p.stamina - dt * 0.025 * drainMult);
  } else {
    const regenMult = p.staminaRegenMult || 1;
    p.stamina = Math.min(p.maxStamina, p.stamina + dt * 0.02 * regenMult);
  }

  const infPenalty = p.infection >= 50 ? 1 - (p.infection-50)/100 * 0.5 : 1;
  const jockeySlow = p._jockeySlow > 0 ? 0.4 : 1;
  if (p._jockeySlow > 0) p._jockeySlow -= dt;
  // Water walk sound + splash particles
  const inWater = (mapTiles[Math.floor(p.y/TILE)]||[])[Math.floor(p.x/TILE)] === 'water';
  const waterSlow = inWater ? 0.45 : 1;
  if (inWater && isMoving) {
    // Splash particles (throttled)
    if (!p._lastWaterSplash) p._lastWaterSplash = 0;
    const nowW = performance.now();
    if (nowW - p._lastWaterSplash > 180) {
      p._lastWaterSplash = nowW;
      spawnParticles(p.x, p.y, '#4a9eff', 2, 1.5);
    }
    // Water step sound (separate, slower cadence)
    if (!p._lastWaterStep) p._lastWaterStep = 0;
    if (nowW - p._lastWaterStep > 520) {
      p._lastWaterStep = nowW;
      playSound('walk_water', 0.1);
    }
  } else {
    // Reset timers when out of water so sound doesn't queue up
    p._lastWaterStep = performance.now();
    p._lastWaterSplash = performance.now();
  }

  // Footstep sounds
  if (isMoving) {
    const stepInterval = p.sprinting ? 280 : 480; // faster cadence when sprinting
    if (!p._lastStep) p._lastStep = 0;
    const now2 = performance.now();
    if (now2 - p._lastStep > stepInterval) {
      p._lastStep = now2;
      if (!inWater) {
        const tile = (mapTiles[Math.floor(p.y/TILE)]||[])[Math.floor(p.x/TILE)];
        const sfx = (tile==='road'||tile==='building') ? 'step_concrete' : 'step_grass';
        // Subtle pitch variance for natural feel
        const pitchVar = p.sprinting ? 0.18 : 0.12;
        playSound(sfx, pitchVar);
      }
    }
  }
  const sprintMult = (p.sprinting) ? 1.85 : 1; // can sprint in water, just slower overall
  const spd = (p.speed + (p.speedBonus||0) + (p.adrenalineTimer>0?1.5:0)) * infPenalty * sprintMult * jockeySlow * waterSlow * (dt/16.67);
  let dx=0, dy=0;
  if (G.keys['KeyW']||G.keys['ArrowUp'])    dy-=1;
  if (G.keys['KeyS']||G.keys['ArrowDown'])  dy+=1;
  if (G.keys['KeyA']||G.keys['ArrowLeft'])  dx-=1;
  if (G.keys['KeyD']||G.keys['ArrowRight']) dx+=1;
  if (dx!==0&&dy!==0) { dx*=0.707; dy*=0.707; }

  p.facing = Math.atan2(G.mouse.y-(p.y-G.cam.y), G.mouse.x-(p.x-G.cam.x));

  const nx = p.x+dx*spd, ny = p.y+dy*spd;
  if (!isSolidWorld(nx,p.y)&&!isFortWall(nx,p.y)&&nx>TILE&&nx<(MAP_W-1)*TILE) p.x=nx;
  if (!isSolidWorld(p.x,ny)&&!isFortWall(p.x,ny)&&ny>TILE&&ny<(MAP_H-1)*TILE) p.y=ny;

  if (p.regenRate>0 && performance.now()-G.lastDamageTime>3000) {
    p.hp = Math.min(p.maxHp, p.hp + p.regenRate*(dt/1000));
  }
  if (p.adrenalineTimer>0) p.adrenalineTimer -= dt;
} // end movePlayer

function moveZombies(dt) {
  const now = performance.now();
  const bCX = G.base.x+G.base.w/2, bCY = G.base.y+G.base.h/2;
  const zLen = G.zombies.length;

  // ── Fast spatial separation: only check nearby zombies ──
  // Build a simple grid bucket for O(n) separation
  const CELL = 60;
  const grid = new Map();
  for (let i=0;i<zLen;i++) {
    const z = G.zombies[i];
    const key = (Math.floor(z.x/CELL)*1000 + Math.floor(z.y/CELL));
    if (!grid.has(key)) grid.set(key,[]);
    grid.get(key).push(i);
  }

  for (let i=0;i<zLen;i++) {
    const z = G.zombies[i];
    z.walkCycle += dt*0.005;
    if (z.stagger>0) { z.stagger-=dt; continue; }

    // Screamer: boost nearby zombies' speed
    if (z.screamer) {
      G.zombies.forEach(other => {
        if (other !== z && Math.hypot(other.x-z.x, other.y-z.y) < 120) {
          other._screamBoost = 1.5; // applied below
        }
      });
    }
    const speedMult = z._screamBoost || 1;
    z._screamBoost = 1; // reset each frame

    const dPlayer = Math.hypot(z.x-G.player.x, z.y-G.player.y);
    const dBase   = Math.hypot(z.x-bCX, z.y-bCY);
    let tx, ty;
    // When player is downed, all zombies target the base
    if (G.player.downed || dPlayer>=450 && dBase<=dPlayer) { tx=bCX; ty=bCY; }
    else { tx=G.player.x; ty=G.player.y; }

    const angle = Math.atan2(ty-z.y, tx-z.x);
    z.angle = angle;
    const spd = z.speed * speedMult * (dt/16.67);
    let nx=z.x+Math.cos(angle)*spd, ny=z.y+Math.sin(angle)*spd;

    // ── Separation: only check zombies in same + adjacent cells ──
    const cx = Math.floor(z.x/CELL), cy = Math.floor(z.y/CELL);
    for (let ox=-1;ox<=1;ox++) for (let oy=-1;oy<=1;oy++) {
      const neighbors = grid.get((cx+ox)*1000+(cy+oy));
      if (!neighbors) continue;
      for (const j of neighbors) {
        if (i===j) continue;
        const o = G.zombies[j];
        const sep = z.size + o.size - 2;
        const ddx = z.x-o.x, ddy = z.y-o.y;
        const dist = Math.hypot(ddx,ddy);
        if (dist < sep && dist > 0.01) {
          const push = (sep-dist)/sep*0.35;
          nx += (ddx/dist)*push; ny += (ddy/dist)*push;
        }
      }
    }

    // ── Base collision ──
    const bLeft=G.base.x-4, bRight=G.base.x+G.base.w+4;
    const bTop=G.base.y-4,  bBot=G.base.y+G.base.h+4;
    if (nx>bLeft&&nx<bRight&&ny>bTop&&ny<bBot) {
      const oL=nx-bLeft,oR=bRight-nx,oT=ny-bTop,oB=bBot-ny;
      if (Math.min(oL,oR)<Math.min(oT,oB)) nx=oL<oR?bLeft-z.size:bRight+z.size;
      else ny=oT<oB?bTop-z.size:bBot+z.size;
    }

    // ── Barricade collision ──
    let blockedByBarricade=false;
    for (let b=G.barricades.length-1;b>=0;b--) {
      const bar=G.barricades[b];
      if (Math.hypot(nx-bar.x,ny-bar.y)<22) {
        blockedByBarricade=true;
        if (now-z.lastAttack>600) { z.lastAttack=now; bar.hp-=z.damage*0.5; if(bar.hp<=0) G.barricades.splice(b,1); }
        break;
      }
    }

    if (!blockedByBarricade) {
      if (!isSolidForZombie(nx,z.y) && !isFortWall(nx,z.y)) z.x=nx;
      if (!isSolidForZombie(z.x,ny) && !isFortWall(z.x,ny)) z.y=ny;
    }

    // Ranged attack (spitter/smoker)
    if (z.ranged&&dPlayer<300&&now-z.lastShot>2000) {
      z.lastShot=now;
      const a=Math.atan2(G.player.y-z.y,G.player.x-z.x)+(Math.random()-0.5)*0.2;
      G.projectiles.push({x:z.x,y:z.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,type:'spit',born:now,damage:z.damage,owner:'zombie'});
    }

    // ── L4D Special Behaviors ──

    // Boomer: explodes on death (handled in killZombie), also vomits bile when close
    if (z.boomer && dPlayer < 60 && now-z.lastShot>3000) {
      z.lastShot=now;
      // Bile burst — spawns a horde of walkers nearby
      for(let h=0;h<4;h++) {
        const bx=z.x+(Math.random()-0.5)*80, by=z.y+(Math.random()-0.5)*80;
        G.zombies.push({type:'walker',x:bx,y:by,hp:60,maxHp:60,speed:1.2,damage:10,reward:5,size:13,color:'#4a7a2a',ranged:false,explodes:false,boss:false,lastAttack:0,lastShot:0,infected:true,angle:0,stagger:0,walkCycle:Math.random()*Math.PI*2});
        G.zombiesLeft++;
      }
      spawnParticles(z.x,z.y,'#8a9a2a',12,4);
      addFloatingText('BILE!',z.x-G.cam.x,z.y-G.cam.y-20,'#8a9a2a');
    }

    // Hunter: pounces — charges fast then pins player
    if (z.hunter && !z.pouncing && dPlayer<250 && dPlayer>60 && now-z.lastShot>4000) {
      z.lastShot=now; z.pouncing=true; z.pounceTimer=600;
      z.pounceVx=Math.cos(z.angle)*8; z.pounceVy=Math.sin(z.angle)*8;
      spawnParticles(z.x,z.y,'#2a2a4a',8,4);
    }
    if (z.pouncing) {
      z.pounceTimer-=dt;
      z.x+=z.pounceVx; z.y+=z.pounceVy;
      if (dPlayer<z.size+16) {
        damagePlayer(z.damage,false);
        // Knockback player
        const ka=Math.atan2(G.player.y-z.y,G.player.x-z.x);
        G.player.x+=Math.cos(ka)*40; G.player.y+=Math.sin(ka)*40;
        z.pouncing=false;
        addFloatingText('POUNCED!',G.player.x-G.cam.x,G.player.y-G.cam.y-30,'#2a2a4a');
      }
      if (z.pounceTimer<=0) z.pouncing=false;
    }

    // Charger: charges in a straight line
    if (z.charger && !z.charging && dPlayer<300 && dPlayer>80 && now-z.lastShot>5000) {
      z.lastShot=now; z.charging=true; z.chargeTimer=800;
      z.chargeAngle=z.angle;
      addFloatingText('CHARGE!',z.x-G.cam.x,z.y-G.cam.y-20,'#5a3a1a');
    }
    if (z.charging) {
      z.chargeTimer-=dt;
      z.x+=Math.cos(z.chargeAngle)*5; z.y+=Math.sin(z.chargeAngle)*5;
      if (dPlayer<z.size+18) {
        damagePlayer(z.damage,false);
        const ka=Math.atan2(G.player.y-z.y,G.player.x-z.x);
        G.player.x+=Math.cos(ka)*60; G.player.y+=Math.sin(ka)*60;
        z.charging=false;
      }
      if (z.chargeTimer<=0) z.charging=false;
    }

    // Jockey: leaps and steers player (simplified: fast approach + slow player)
    if (z.jockey && dPlayer<20 && now-z.lastAttack>1200) {
      z.lastAttack=now;
      damagePlayer(z.damage,false);
      // Slow player briefly
      G.player._jockeySlow = 800;
    }

    // Witch: stationary until player gets close, then enrages
    if (z.witch) {
      if (!z.enraged) {
        if (dPlayer < 80) {
          z.enraged=true; z.speed=3.5;
          addFloatingText('WITCH ENRAGED!',z.x-G.cam.x,z.y-G.cam.y-30,'#cc88aa');
          spawnParticles(z.x,z.y,'#cc88aa',20,6);
        }
        // Don't move until enraged
        continue;
      }
    }

    // Smoker: tongue pull (ranged, already handled above, but add slow effect)
    if (z.smoker && dPlayer<200 && now-z.lastShot>3000) {
      z.lastShot=now;
      // Pull player slightly toward smoker
      const pa=Math.atan2(z.y-G.player.y,z.x-G.player.x);
      G.player.x+=Math.cos(pa)*20; G.player.y+=Math.sin(pa)*20;
      damagePlayer(z.damage,false);
      spawnParticles(z.x,z.y,'#4a6a4a',6,3);
      addFloatingText('TONGUE!',G.player.x-G.cam.x,G.player.y-G.cam.y-30,'#4a6a4a');
    }

    // Melee player (only if not downed)
    if (!G.player.downed && dPlayer<z.size+14&&now-z.lastAttack>800) { z.lastAttack=now; damagePlayer(z.damage,z.infected); }
    // Attack base
    if (dBase<z.size+62&&now-z.lastAttack>1000) {
      z.lastAttack=now;
      if (G.fortLevel >= 2 && G.fortWallHp > 0) {
        // Walls still standing — damage the wall
        G.fortWallHp = Math.max(0, G.fortWallHp - z.damage);
        spawnParticles(bCX,bCY,'#8B4513',3,3);
        if (G.fortWallHp <= 0) {
          addFloatingText('⚠ WALLS BREACHED!', canvas.width/2, canvas.height/2-60, '#e74c3c');
          spawnParticles(bCX,bCY,'#e74c3c',20,6);
        }
        updateHUD();
      } else {
        // No walls or walls broken — damage the base directly
        G.base.hp=Math.max(0,G.base.hp-z.damage);
        spawnParticles(bCX,bCY,'#e74c3c',3,3); updateHUD();
        if (G.base.hp<=0) triggerGameOver('base');
      }
    }

    // NPC allies shoot zombies via bullet system (handled in updateNPCs)
  }
}

function damagePlayer(dmg, infected) {
  const totalArmor = (G.player.hasArmor?G.player.armor:0) + (G.player.armorPerk||0);
  const reduced = dmg * (1 - Math.min(0.8, totalArmor/100));

  // Last stand
  if (G.player.lastStand && !G.player.lastStandUsed && G.player.hp-reduced<=0) {
    G.player.lastStandUsed=true; G.player.hp=1;
    addFloatingText('LAST STAND!', G.player.x-G.cam.x, G.player.y-G.cam.y-40, '#f1c40f');
    return;
  }

  G.player.hp = Math.max(0, G.player.hp-reduced);
  G.lastDamageTime = performance.now();
  const infGain = infected ? 8*(1-(G.player.infectionResist||0)) : 0;
  if (infGain>0) G.player.infection = Math.min(100, G.player.infection+infGain);
  spawnParticles(G.player.x, G.player.y, '#e74c3c', 4, 3);
  playSound('take_damage', 0.15);
  G._damageFlash = performance.now(); // trigger red screen flash
  updateHUD();
  if (G.player.hp<=0) playerDowned();
}

function playerDowned() {
  if (G.player.downed) return;
  G.player.downed = true;
  G.player.downedTimer = 10;
  G.player.hp = 0;
  // Infection only drops by 10% on death, not reset
  G.player.infection = Math.max(0, G.player.infection - 10);
  addFloatingText('DOWNED! Reviving in 10s...', canvas.width/2, canvas.height/2-60, '#e74c3c');
  updateHUD();
}

function updateDownedTimer(dt) {
  if (!G.player.downed) return;
  G.player.downedTimer -= dt/1000;
  const t = Math.ceil(Math.max(0, G.player.downedTimer));
  // Show countdown on screen
  addFloatingText('Reviving: '+t+'s', canvas.width/2, canvas.height/2-40, '#e74c3c');
  if (G.player.downedTimer <= 0) revivePlayer();
}

function revivePlayer() {
  G.player.downed = false;
  G.player.hp = Math.floor(G.player.maxHp * 0.5);
  G.player.x = G.base.x + G.base.w/2;
  G.player.y = G.base.y + G.base.h/2;
  // Infection stays as-is (already reduced by 10% on death)
  addFloatingText('REVIVED!', canvas.width/2, canvas.height/2-60, '#2ecc71');
  updateHUD();
}

function updateBullets() {
  for (let i=G.bullets.length-1;i>=0;i--) {
    const b=G.bullets[i];
    b.x+=b.vx; b.y+=b.vy;
    b.traveled+=Math.hypot(b.vx,b.vy);
    if (b.traveled>b.range||isSolidForBullet(b.x,b.y)) {
      if (b.flame) spawnParticles(b.x,b.y,'#ff6b35',3,2);
      G.bullets.splice(i,1); continue;
    }
    let bulletRemoved = false;
    for (let j=G.zombies.length-1;j>=0;j--) {
      const z=G.zombies[j];
      if (Math.hypot(b.x-z.x,b.y-z.y)<z.size) {
        z.hp-=b.damage; z.stagger=80;
        spawnParticles(b.x,b.y,'#cc2200',4,2);
        if (b.explosive>0) explode(b.x,b.y,40+b.explosive*15,b.damage*0.5,'player');
        if (!b.flame && !bulletRemoved) { G.bullets.splice(i,1); bulletRemoved=true; }
        if (z.hp<=0) {
          // Mark for removal instead of splicing mid-loop
          z._dead = true;
        }
        break;
      }
    }
  }
  // Remove dead zombies after bullet loop
  for (let j=G.zombies.length-1;j>=0;j--) {
    if (G.zombies[j]._dead) killZombie(j, G.zombies[j]);
  }
}

function killZombie(idx, z) {
  // Guard: zombie may have already been removed
  if (!z || G.zombies[idx] !== z) {
    const realIdx = G.zombies.indexOf(z);
    if (realIdx === -1) return;
    idx = realIdx;
  }
  if (z.explodes) {
    explode(z.x,z.y,80,60,'player');
    // Iteratively flush any zombies killed by the explosion (and chain explosions)
    // without recursing into killZombie, which would cause a stack overflow.
    let keepFlushing = true;
    while (keepFlushing) {
      keepFlushing = false;
      for (let _j = G.zombies.length - 1; _j >= 0; _j--) {
        if (G.zombies[_j]._dead) {
          keepFlushing = true; // a chain explosion may mark more zombies dead
          const _z = G.zombies[_j];
          if (_z.explodes) explode(_z.x, _z.y, 80, 60, 'player');
          // Minimal kill: reward + remove (full killZombie side-effects run below for z)
          const _reward = Math.floor((_z.reward + (G.player.killBonus||0)) * (G.player.luckyMult||1));
          addFloatingText('+'+_reward, _z.x-G.cam.x, _z.y-G.cam.y-20, '#f1c40f');
          G.money += _reward;
          G.earnedMoney += _reward;
          G.totalKills++;
          G.zombiesLeft = Math.max(0, G.zombiesLeft - 1);
          spawnParticles(_z.x, _z.y, _z.color, 10, 4);
          spawnParticles(_z.x, _z.y, '#cc2200', 6, 3);
          if (G.player.vampireHeal > 0) G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.vampireHeal);
          if (G.player.adrenaline > 0) G.player.adrenalineTimer = 3000;
          G.zombies.splice(_j, 1);
        }
      }
    }
  }
  // Boomer: bile burst on death — spawns horde + infection cloud
  if (z.boomer) {
    spawnParticles(z.x,z.y,'#8a9a2a',25,6);
    for(let h=0;h<6;h++) {
      const bx=z.x+(Math.random()-0.5)*120, by=z.y+(Math.random()-0.5)*120;
      G.zombies.push({type:'walker',x:bx,y:by,hp:60,maxHp:60,speed:1.3,damage:10,reward:5,size:13,color:'#4a7a2a',ranged:false,explodes:false,boss:false,lastAttack:0,lastShot:0,infected:true,angle:0,stagger:0,walkCycle:Math.random()*Math.PI*2});
      G.zombiesLeft++;
    }
    // Infect player if nearby
    if (Math.hypot(G.player.x-z.x,G.player.y-z.y)<80) {
      G.player.infection=Math.min(100,G.player.infection+25);
      addFloatingText('BILE! +25% infection',G.player.x-G.cam.x,G.player.y-G.cam.y-40,'#8a9a2a');
    }
  }
  spawnParticles(z.x,z.y,z.color,10,4);
  spawnParticles(z.x,z.y,'#cc2200',6,3);

  const reward = Math.floor((z.reward + (G.player.killBonus||0)) * (G.player.luckyMult||1));
  addFloatingText('+$'+reward, z.x-G.cam.x, z.y-G.cam.y-20, '#f1c40f');
  G.money += reward;
  G.earnedMoney += reward;
  G.totalKills++;
  G.zombiesLeft = Math.max(0, G.zombiesLeft-1);
  G.zombies.splice(idx,1);

  if (G.player.vampireHeal>0) G.player.hp=Math.min(G.player.maxHp,G.player.hp+G.player.vampireHeal);
  if (G.player.adrenaline>0) G.player.adrenalineTimer=3000;
  if (G.player.scavenger>0&&Math.random()<G.player.scavenger) {
    const slot=G.player.slots[G.player.selectedSlot];
    if (slot) {
      const wDef=WEAPONS[slot.weapon];
      slot.reserve=Math.min(wDef.maxReserve,(slot.reserve||0)+Math.ceil(wDef.maxAmmo*0.25));
    }
  }

  updateHUD();
  if (G.zombiesLeft<=0&&G.zombiesSpawned>=G.totalZombies) setTimeout(endNightWave,1500);
}

function explode(x,y,radius,damage,owner) {
  spawnParticles(x,y,'#ff6b35',18,6);
  spawnParticles(x,y,'#f1c40f',12,4);
  playSound('explosion', 0.15);
  spawnParticles(x,y,'#fff',6,3);
  if (owner!=='zombie') {
    // Mark zombies in radius as dead — do NOT call killZombie here directly,
    // as exploding zombies would trigger another explode → infinite recursion.
    // The caller is responsible for flushing _dead zombies after the explosion.
    for (let j=G.zombies.length-1;j>=0;j--) {
      const z=G.zombies[j];
      const d=Math.hypot(z.x-x,z.y-y);
      if (d<radius) {
        z.hp-=damage*(1-d/radius);
        if (z.hp<=0) z._dead=true;
      }
    }
  }
  if (owner!=='player') {
    const d=Math.hypot(G.player.x-x,G.player.y-y);
    if (d<radius) damagePlayer(damage*(1-d/radius),false);
  }
}

function updateProjectiles() {
  const now=performance.now();
  for (let i=G.projectiles.length-1;i>=0;i--) {
    const p=G.projectiles[i];
    p.x+=p.vx; p.y+=p.vy;
    if (p.type==='grenade') {
      // Explode on wall/solid hit, on zombie hit, or after 2s
      let hitZombie = false;
      for (const z of G.zombies) {
        if (Math.hypot(z.x-p.x, z.y-p.y) < z.size+6) { hitZombie=true; break; }
      }
      if (now-p.born>2000 || isSolidWorld(p.x,p.y) || hitZombie) {
        explode(p.x,p.y,120,80,'player'); G.projectiles.splice(i,1);
      }
    } else if (p.type==='molotov') {
      // Detonate on wall/solid hit, on zombie hit, or after 1.8s
      let hitZombie = false;
      for (const z of G.zombies) {
        if (Math.hypot(z.x-p.x, z.y-p.y) < z.size+6) { hitZombie=true; break; }
      }
      if (now-p.born>1800 || isSolidWorld(p.x,p.y) || hitZombie) {
        playSound('molotov', 0.1);
        for (let f=0;f<5;f++) {
          const fx=p.x+(Math.random()-0.5)*50, fy=p.y+(Math.random()-0.5)*50;
          G.projectiles.push({ x:fx, y:fy, vx:0, vy:0, type:'fire', born:now, owner:'player', life:4000 });
        }
        spawnParticles(p.x,p.y,'#ff6b35',15,5);
        G.projectiles.splice(i,1);
      }
    } else if (p.type==='fire') {
      if (now-p.born>p.life) { G.projectiles.splice(i,1); continue; }
      // Damage zombies in fire ~5x/sec
      if (Math.floor(now/200) !== Math.floor((now-16)/200)) {
        for (let j=G.zombies.length-1;j>=0;j--) {
          const fz=G.zombies[j];
          if (Math.hypot(fz.x-p.x,fz.y-p.y)<22) {
            fz.hp-=8;
            if (fz.hp<=0) fz._dead=true;
          }
        }
        for (let j=G.zombies.length-1;j>=0;j--) {
          if (G.zombies[j]._dead) killZombie(j, G.zombies[j]);
        }
      }
    } else if (p.type==='spit') {
      if (now-p.born>3000||isSolidWorld(p.x,p.y)) { G.projectiles.splice(i,1); continue; }
      if (Math.hypot(p.x-G.player.x,p.y-G.player.y)<14) { damagePlayer(p.damage,true); G.projectiles.splice(i,1); }
    }
  }
}

function updateMines(dt) {
  const now=performance.now();
  for (let i=G.mines.length-1;i>=0;i--) {
    const m=G.mines[i];
    if (!m.armed&&now-m.placed>1500) m.armed=true;
    if (!m.armed) continue;
    for (let j=G.zombies.length-1;j>=0;j--) {
      if (Math.hypot(G.zombies[j].x-m.x,G.zombies[j].y-m.y)<22) {
        explode(m.x,m.y,100,70,'player');
        spawnParticles(m.x,m.y,'#ff6b35',20,7);
        spawnParticles(m.x,m.y,'#f1c40f',12,5);
        G.mines.splice(i,1); break;
      }
    }
  }
}

function updateTurrets(dt) {
  G.turrets.forEach(t => {
    t.cooldown=(t.cooldown||0)-dt;
    if (t.cooldown>0) return;
    let nearest=null, nearDist=320;
    G.zombies.forEach(z=>{ const d=Math.hypot(z.x-t.x,z.y-t.y); if(d<nearDist){nearest=z;nearDist=d;} });
    if (nearest) {
      t.cooldown=550; t.angle=Math.atan2(nearest.y-t.y,nearest.x-t.x);
      t._lastFired = performance.now();
      G.bullets.push({ x:t.x,y:t.y, vx:Math.cos(t.angle)*13,vy:Math.sin(t.angle)*13, damage:35,range:320,traveled:0,color:'#00ffff',size:5,owner:'turret',explosive:0 });
    }
  });
}

function updateNPCs(dt) {
  if (!G.npcs) return;
  const now = performance.now();
  for (let i = G.npcs.length-1; i >= 0; i--) {
    const npc = G.npcs[i];
    if (npc.hp <= 0) { G.npcs.splice(i,1); continue; }
    npc.walkCycle = (npc.walkCycle||0) + dt*0.004;

    // Movement
    if (npc.follows) {
      const dx = G.player.x - npc.x, dy = G.player.y - npc.y;
      const dist = Math.hypot(dx,dy);
      if (dist > 60) {
        const spd = 2.2 * (dt/16.67);
        let nx = npc.x + (dx/dist)*spd, ny = npc.y + (dy/dist)*spd;

        // NPC-to-NPC separation (no player collision)
        for (let j=0; j<G.npcs.length; j++) {
          if (j===i) continue;
          const other = G.npcs[j];
          const sep = 22;
          const ddx = npc.x-other.x, ddy = npc.y-other.y;
          const dd = Math.hypot(ddx,ddy);
          if (dd < sep && dd > 0.01) {
            nx += (ddx/dd)*(sep-dd)*0.3;
            ny += (ddy/dd)*(sep-dd)*0.3;
          }
        }

        if (!isSolidWorld(nx, npc.y)) npc.x = nx;
        if (!isSolidWorld(npc.x, ny)) npc.y = ny;
      }
    }

    // Medic: heal player when close
    if (npc.type === 'medic') {
      const d = Math.hypot(npc.x-G.player.x, npc.y-G.player.y);
      if (d < 80 && G.player.hp < G.player.maxHp) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + 0.005*dt); // nerfed: ~0.5 HP/s
        updateHUD();
      }
    }

    // Engineer: repair barricades
    if (npc.type === 'engineer') {
      G.barricades.forEach(b => {
        if (Math.hypot(b.x-npc.x, b.y-npc.y) < 60 && b.hp < b.maxHp) {
          b.hp = Math.min(b.maxHp, b.hp + 0.01*dt);
        }
      });
    }

    // Shoot nearest zombie
    let nearest = null, nearDist = npc.range;
    G.zombies.forEach(z => {
      const d = Math.hypot(z.x-npc.x, z.y-npc.y);
      if (d < nearDist) { nearest=z; nearDist=d; }
    });
    if (nearest && now - npc.lastShot > npc.fireRate) {
      npc.lastShot = now;
      npc.angle = Math.atan2(nearest.y-npc.y, nearest.x-npc.x);
      const spd = 13;
      G.bullets.push({
        x:npc.x, y:npc.y,
        vx:Math.cos(npc.angle)*spd, vy:Math.sin(npc.angle)*spd,
        damage:npc.damage, range:npc.range, traveled:0,
        color:npc.color, size:5, owner:'npc', explosive:0,
      });
    }

    // NPCs take damage from zombies
    G.zombies.forEach(z => {
      if (Math.hypot(z.x-npc.x, z.y-npc.y) < z.size+14 && now-(npc.lastHit||0) > 800) {
        npc.lastHit = now;
        npc.hp -= z.damage * 0.5;
        spawnParticles(npc.x, npc.y, '#e74c3c', 3, 2);
      }
    });
  }
}

function drawNPCs() {
  if (!G.npcs) return;
  G.npcs.forEach(npc => {
    const sx = npc.x - G.cam.x, sy = npc.y - G.cam.y;
    if (sx<-60||sx>canvas.width+60||sy<-60||sy>canvas.height+60) return;

    ctx.save();
    ctx.translate(sx, sy);

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0,6,11,4,0,0,Math.PI*2); ctx.fill();

    // Type aura
    const now_n = performance.now();
    if (npc.type === 'medic') {
      ctx.globalAlpha = 0.2 + Math.sin(now_n*0.003)*0.1;
      ctx.fillStyle = '#3498db';
      ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (npc.type === 'heavy') {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (npc.type === 'soldier') {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#27ae60';
      ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Body (upright, color-coded by type)
    ctx.fillStyle=npc.color;
    ctx.beginPath(); ctx.roundRect(-7,-9,14,16,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(-6,-8,12,7,2); ctx.fill();

    // Gun arm pointing at target
    ctx.save();
    ctx.rotate(npc.angle);
    ctx.fillStyle='#718096';
    ctx.fillRect(5,-2,14,4);
    ctx.restore();

    // Head
    ctx.fillStyle='#c8956c';
    ctx.beginPath(); ctx.ellipse(0,-14,6,7,0,0,Math.PI*2); ctx.fill();
    // Helmet/hat
    ctx.fillStyle=npc.color;
    ctx.beginPath(); ctx.ellipse(0,-16,6,5,0,Math.PI,Math.PI*2); ctx.fill();

    ctx.restore();

    // HP bar
    const hpPct = npc.hp/npc.maxHp;
    const bw = 28;
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(sx-bw/2, sy-22, bw, 4, 2); ctx.fill();
    ctx.fillStyle = hpPct>0.5?'#2ecc71':hpPct>0.25?'#f39c12':'#e74c3c';
    ctx.beginPath(); ctx.roundRect(sx-bw/2, sy-22, bw*hpPct, 4, 2); ctx.fill();

    // Name tag
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(sx-24, sy-32, 48, 12, 3); ctx.fill();
    ctx.fillStyle=npc.color; ctx.font='bold 9px Rajdhani,sans-serif';
    ctx.textAlign='center'; ctx.fillText(npc.name, sx, sy-23);
  });
}

function updateInfection(dt) {
  const inf = G.player.infection;
  if (inf <= 0) return;

  // 50%+ : slow and weaken
  if (inf >= 50) {
    // Speed penalty applied in movePlayer via infectionSpeedMult
    // HP drain scales with infection above 50
    const drain = 0.003 * dt * ((inf-50)/50);
    G.player.hp = Math.max(0, G.player.hp - drain);
    if (G.player.hp <= 0) { playerDowned(); return; }
  }

  // 100% : start 2-minute death countdown
  if (inf >= 100) {
    if (!G.player.infectionDeathTimer) {
      G.player.infectionDeathTimer = 120;
      addFloatingText('☣ FULLY INFECTED! Get the cure!', canvas.width/2, canvas.height/2-80, '#b44fff');
    }
    G.player.infectionDeathTimer -= dt/1000;
    const t = Math.ceil(Math.max(0, G.player.infectionDeathTimer));
    if (t % 10 === 0 && t > 0 && Math.floor(G.player.infectionDeathTimer) !== Math.floor(G.player.infectionDeathTimer + dt/1000)) {
      addFloatingText('☣ CURE IN '+t+'s', canvas.width/2, canvas.height/2-60, '#b44fff');
    }
    if (G.player.infectionDeathTimer <= 0) {
      triggerGameOver('infection');
      return;
    }
  } else {
    G.player.infectionDeathTimer = 0;
  }

  updateHUD();
}

function updateWeather(dt) {
  G.weatherTimer-=dt;
  if (G.weatherTimer<=0) {
    G._prevWeather = G.weather;
    G.weather=WEATHERS[Math.floor(Math.random()*WEATHERS.length)];
    G.weatherTimer=120000+Math.random()*180000; // 2–5 minutes between changes
    G.weatherAlpha = 0; // start fade-in of new weather
    document.getElementById('weather-icon').textContent=G.weather.icon;
    document.getElementById('weather-text').textContent=G.weather.name;
    addFloatingText(`${G.weather.icon} ${G.weather.name}`, canvas.width/2, canvas.height/2-120, '#74b9ff');
  }
  // Fade weather in over ~8 seconds
  if (G.weatherAlpha === undefined) G.weatherAlpha = 1;
  if (G.weatherAlpha < 1) G.weatherAlpha = Math.min(1, G.weatherAlpha + dt/8000);

  if (G.weather.rain) {
    const spawnRate = Math.round(2 * G.weatherAlpha);
    for (let i=0;i<spawnRate;i++) {
      G.rainDrops.push({ x:G.cam.x+Math.random()*canvas.width, y:G.cam.y+Math.random()*canvas.height, len:7+Math.random()*7, speed:8+G.weather.wind*2, alpha:(0.25+Math.random()*0.25)*G.weatherAlpha });
    }
    if (G.rainDrops.length>300) G.rainDrops.splice(0,G.rainDrops.length-300);
  } else {
    // Drain rain drops when weather clears
    if (G.rainDrops.length > 0) G.rainDrops.splice(0, Math.ceil(G.rainDrops.length * 0.01));
  }
  if (G.weather.lightning&&Math.random()<0.00015*dt*G.weatherAlpha) { G.lightningFlash=80; playSound('lightning', 0.3); }
  if (G.lightningFlash>0) G.lightningFlash-=dt;
}

function updateParticles(dt) {
  const camX=G.cam.x, camY=G.cam.y, cW=canvas.width+60, cH=canvas.height+60;
  for (let i=G.particles.length-1;i>=0;i--) {
    const p=G.particles[i];
    p.px=p.x; p.py=p.y;
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.06;
    p.vx*=0.98;
    p.life-=p.decay;
    if (p.life<=0) { G.particles.splice(i,1); continue; }
    // Remove particles that have drifted far off-screen
    const sx=p.x-camX, sy=p.y-camY;
    if (sx<-80||sx>cW||sy<-80||sy>cH) p.life-=0.05; // accelerate fade when off-screen
  }
}

function spawnParticles(x,y,color,count,speed,type) {
  if (G.particles.length>600) return;
  for (let i=0;i<count;i++) {
    const a=Math.random()*Math.PI*2, spd=Math.random()*speed;
    G.particles.push({
      x, y,
      vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
      life:1, decay:0.025+Math.random()*0.035,
      color, size:2+Math.random()*3,
      type: type||'default',
      trail: type==='ember'||type==='spark',
      px:x, py:y, // previous position for trail
    });
  }
}

// Spawn a burst of sparks (directional)
function spawnSparks(x,y,color,count,speed,angle,spread) {
  if (G.particles.length>600) return;
  for (let i=0;i<count;i++) {
    const a=(angle||0)+(Math.random()-0.5)*(spread||Math.PI*2);
    const spd=speed*0.5+Math.random()*speed;
    G.particles.push({
      x, y,
      vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-1,
      life:1, decay:0.04+Math.random()*0.04,
      color, size:1.5+Math.random()*2,
      type:'spark', trail:true, px:x, py:y,
    });
  }
}

function addFloatingText(text,x,y,color) {
  if (G.floatingTexts.length>30) return;
  G.floatingTexts.push({ text,x,y,color,life:1,vy:-1.5 });
}

function updateFloatingTexts() {
  for (let i=G.floatingTexts.length-1;i>=0;i--) {
    const t=G.floatingTexts[i];
    t.y+=t.vy; t.life-=0.02;
    if (t.life<=0) G.floatingTexts.splice(i,1);
  }
}

function updateReload() {
  const now=performance.now();
  G.player.slots.forEach(slot=>{
    if (!slot||!slot.reloading) return;
    const wDef=WEAPONS[slot.weapon];
    const reloadTime=wDef.reloadTime*(G.player.reloadMult||1);
    if (now-slot.reloadStart>=reloadTime) {
      const needed = wDef.maxAmmo - slot.ammo;
      const take = Math.min(needed, slot.reserve||0);
      slot.ammo += take;
      slot.reserve = (slot.reserve||0) - take;
      slot.reloading=false;
      // Shotgun pump sound at end of reload
      if (slot.weapon === 'shotgun') playSound('shotgun_pump', 0.05);
      updateHUD();
    }
  });
}

function updateDayTimer(dt) {
  if (G.phase!=='day') return;
  G.dayTimer-=dt/1000;
  if (G.dayTimer<=0) { document.getElementById('shop-overlay').classList.add('hidden'); startNightWave(); }
  document.getElementById('timer-text').textContent=Math.ceil(Math.max(0,G.dayTimer))+'s';
  if (G.shopOpen) document.getElementById('shop-timer').textContent=Math.ceil(Math.max(0,G.dayTimer));
  // Sunset tint when 20s left
  G._sunsetStrength = G.dayTimer <= 20 ? (20 - G.dayTimer) / 20 : 0;
  // Timer urgency flash when < 10s
  const timerBadge = document.getElementById('timer-badge');
  if (timerBadge) timerBadge.classList.toggle('urgent', G.dayTimer < 10);
}

function updateNightTimer(dt) {
  if (G.phase!=='night') return;
  G.nightTimer -= dt/1000;
  const t = Math.max(0, G.nightTimer);
  const mins = Math.floor(t/60);
  const secs = Math.ceil(t%60);
  document.getElementById('timer-text').textContent =
    (mins>0 ? mins+'m ' : '') + secs + 's';

  if (G.nightTimer <= 0) {
    // Dawn — burn all remaining zombies, no reward
    burnRemainingZombies();
  }
}

function burnRemainingZombies() {
  if (G.zombies.length === 0) { endNightWave(); return; }
  G.zombies.forEach(z => {
    spawnParticles(z.x, z.y, '#ff6b35', 12, 5);
    spawnParticles(z.x, z.y, '#f1c40f', 8, 3);
  });
  addFloatingText('DAWN — ZOMBIES BURN!', canvas.width/2, canvas.height/2-60, '#f39c12');
  G.zombies = [];
  G.zombiesLeft = 0;
  setTimeout(endNightWave, 1200);
}

function updateFlashlightBattery(dt) {
  const rechargeMult = G.player.flashRechargeMult || 1;
  const maxBattery = 100 + (G.player.flashBatteryBonus||0) * 0.71;
  if (G.flashlightOn) {
    G.flashlightBattery = Math.max(0, G.flashlightBattery - dt * 0.007);
    if (G.flashlightBattery <= 0) {
      G.flashlightOn = false;
      addFloatingText('🔦 Battery dead!', canvas.width/2, canvas.height/2-50, '#e74c3c');
    }
  } else {
    G.flashlightBattery = Math.min(maxBattery, G.flashlightBattery + dt * 0.006 * rechargeMult);
  }

  // ── NV Battery ──
  const p = G.player;
  if (!p.hasNightVision) return;
  // Max battery by upgrade level: 1=100s, 2=200s, 3=350s
  const nvMaxSec = [100, 200, 350][Math.min(2, (p.nvBatteryLevel||1)-1)];
  // Recharge rate: base=0.5%/s of max, level1=1%/s, level2=1.8%/s
  const nvRechargeRate = [0.5, 1.0, 1.8][Math.min(2, p.nvRechargeLevel||0)];

  if (G.nightVisionActive) {
    G.nvBatteryCurrent = Math.max(0, G.nvBatteryCurrent - dt/1000);
    if (G.nvBatteryCurrent <= 0) {
      G.nightVisionActive = false;
      document.getElementById('nv-btn').classList.remove('active');
      addFloatingText('👁 NV Battery Dead!', canvas.width/2, canvas.height/2-50, '#00ff88');
    }
  } else {
    // Recharge when off
    G.nvBatteryCurrent = Math.min(nvMaxSec, G.nvBatteryCurrent + (nvRechargeRate/100)*nvMaxSec*(dt/1000));
  }
}

function updateCamera() {
  const tx=G.player.x-canvas.width/2, ty=G.player.y-canvas.height/2;
  G.cam.x+=(tx-G.cam.x)*0.1; G.cam.y+=(ty-G.cam.y)*0.1;
  // Clamp camera to map bounds
  G.cam.x=Math.max(0,Math.min(MAP_W*TILE-canvas.width,G.cam.x));
  G.cam.y=Math.max(0,Math.min(MAP_H*TILE-canvas.height,G.cam.y));
}

// ═══════════════════════════════════════════════════════════════
//  RENDERING
// ═══════════════════════════════════════════════════════════════
function drawMap() {
  if (!mapCanvas) return;
  const sx = Math.max(0, Math.floor(G.cam.x));
  const sy = Math.max(0, Math.floor(G.cam.y));
  const sw = Math.min(canvas.width, mapCanvas.width - sx);
  const sh = Math.min(canvas.height, mapCanvas.height - sy);
  if (sw > 0 && sh > 0) {
    ctx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }
}

function drawLootables() {
  if (!G.lootables) return;
  const px = G.player.x, py = G.player.y;
  G.lootables.forEach(obj => {
    const sx = obj.x - G.cam.x, sy = obj.y - G.cam.y;
    if (sx < -80 || sx > canvas.width+80 || sy < -80 || sy > canvas.height+80) return;

    const def = obj.def;
    const nearby = !obj.looted && Math.hypot(px-obj.x, py-obj.y) < 40;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(obj.angle);

    if (obj.looted) {
      // Looted — draw darker/empty version
      ctx.globalAlpha = 0.45;
    }

    const hw = def.w/2, hh = def.h/2;

    if (obj.type === 'car') {
      // Car body
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.roundRect(-hw, -hh, def.w, def.h, 5); ctx.fill();
      // Windshield
      ctx.fillStyle = 'rgba(100,180,255,0.35)';
      ctx.fillRect(-hw+6, -hh+3, def.w*0.35, def.h-6);
      ctx.fillRect(hw-def.w*0.35-6, -hh+3, def.w*0.35, def.h-6);
      // Roof
      ctx.fillStyle = def.accent;
      ctx.beginPath(); ctx.roundRect(-hw+8, -hh+4, def.w-16, def.h-8, 3); ctx.fill();
      // Wheels
      ctx.fillStyle = '#111';
      [[-hw+4,-hh-3],[hw-10,-hh-3],[-hw+4,hh-1],[hw-10,hh-1]].forEach(([wx,wy])=>{
        ctx.beginPath(); ctx.ellipse(wx,wy,5,4,0,0,Math.PI*2); ctx.fill();
      });
      // Headlights
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(hw-4, -hh+4, 3, 5);
      ctx.fillRect(hw-4, hh-9, 3, 5);
    } else if (obj.type === 'crate') {
      ctx.fillStyle = def.color;
      ctx.fillRect(-hw, -hh, def.w, def.h);
      ctx.strokeStyle = def.accent; ctx.lineWidth = 2;
      ctx.strokeRect(-hw+1, -hh+1, def.w-2, def.h-2);
      // Cross planks
      ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, hh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw, -hh); ctx.lineTo(-hw, hh); ctx.stroke();
    } else if (obj.type === 'barrel') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI*2); ctx.stroke();
      // Bands
      ctx.strokeStyle = def.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, -hh*0.4, hw*0.9, hh*0.15, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0,  hh*0.4, hw*0.9, hh*0.15, 0, 0, Math.PI*2); ctx.stroke();
      // Hazard symbol
      ctx.fillStyle = '#f1c40f'; ctx.font = `${def.w*0.5}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('☢', 0, 0);
    } else if (obj.type === 'cabinet') {
      ctx.fillStyle = def.color;
      ctx.fillRect(-hw, -hh, def.w, def.h);
      ctx.strokeStyle = def.accent; ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw+1, -hh+1, def.w-2, def.h-2);
      // Drawer lines
      ctx.beginPath(); ctx.moveTo(-hw+2, 0); ctx.lineTo(hw-2, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-hw+2, -hh/2); ctx.lineTo(hw-2, -hh/2); ctx.stroke();
      // Handles
      ctx.fillStyle = '#aaa';
      ctx.fillRect(-3, -hh/4-2, 6, 3);
      ctx.fillRect(-3,  hh/4-2, 6, 3);
    } else if (obj.type === 'dumpster') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.roundRect(-hw, -hh, def.w, def.h, 4); ctx.fill();
      ctx.strokeStyle = def.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-hw+1, -hh+1, def.w-2, def.h-2, 3); ctx.stroke();
      // Lid
      ctx.fillStyle = def.accent;
      ctx.fillRect(-hw+2, -hh+2, def.w-4, def.h*0.35);
      // Text
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('LOOT', 0, hh*0.3);
    }

    ctx.restore();

    // Loot prompt when nearby
    if (nearby) {
      const now_l = performance.now();
      const pulse = 0.6 + Math.sin(now_l*0.005)*0.4;
      // Pulsing glow outline
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(obj.angle);
      ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 12*pulse;
      ctx.strokeStyle = `rgba(241,196,15,${0.5*pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-def.w/2-4, -def.h/2-4, def.w+8, def.h+8, 7); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      // Prompt label
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.beginPath(); ctx.roundRect(sx-36, sy-def.h/2-30, 72, 18, 5); ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 10px Orbitron,sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 6;
      ctx.fillText('[E] ' + def.label, sx, sy-def.h/2-16);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  });
}

function drawStructureLabels() {
  if (!G.structures) return;
  G.structures.forEach(s => {
    const sx = s.x - G.cam.x, sy = s.y - G.cam.y;
    if (sx<-200||sx>canvas.width+200||sy<-60||sy>canvas.height+60) return;
    ctx.save();
    const labelW = ctx.measureText(s.label).width + 16;
    ctx.fillStyle='rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(sx-2, sy-26, labelW, 20, 4); ctx.fill();
    ctx.fillStyle = s.looted ? '#888' : '#f1c40f';
    ctx.font='bold 11px Rajdhani,sans-serif';
    ctx.textAlign='left';
    ctx.fillText(s.label + (s.looted ? ' [LOOTED]' : ''), sx+6, sy-11);

    // Entry prompt when player is nearby
    if (s.w) {
      const pDist = Math.hypot(G.player.x-(s.x+s.w/2), G.player.y-(s.y+s.h/2));
      if (pDist < 80) {
        ctx.fillStyle='rgba(0,0,0,0.75)';
        ctx.beginPath(); ctx.roundRect(sx-2, sy-46, 100, 16, 4); ctx.fill();
        ctx.fillStyle = s.looted ? '#888' : '#2ecc71';
        ctx.font='bold 8px Orbitron,sans-serif';
        ctx.fillText(s.looted ? '[E] Already looted' : '[E] Enter & Loot', sx+6, sy-34);
      }
    }
    ctx.restore();
  });
}

function tryEnterStructure() {
  if (!G.structures) return false;
  for (const s of G.structures) {
    if (!s.w) continue;
    const pDist = Math.hypot(G.player.x-(s.x+s.w/2), G.player.y-(s.y+s.h/2));
    if (pDist > 80) continue;
    if (s.looted) {
      addFloatingText('Already looted!', canvas.width/2, canvas.height/2-40, '#888');
      return true;
    }
    // Give loot
    s.looted = true;
    playSound('loot', 0.1);
    let lootMsg = [];
    s.loot.forEach(l => {
      if (l.type === 'ammo') {
        G.player.slots.forEach(slot => {
          if (slot) { const wDef=WEAPONS[slot.weapon]; slot.reserve=Math.min(wDef.maxReserve,(slot.reserve||0)+l.count); }
        });
        lootMsg.push(`+${l.count} ammo`);
      } else {
        G.player.inventory[l.type] = (G.player.inventory[l.type]||0) + l.count;
        lootMsg.push(`+${l.count} ${l.type}`);
      }
    });
    addFloatingText(`${s.label}: ${lootMsg.join(', ')}`, canvas.width/2, canvas.height/2-60, '#2ecc71');
    spawnParticles(G.player.x, G.player.y, '#2ecc71', 12, 3);
    updateHUD();
    return true;
  }
  return false;
}

function drawBase() {
  const tier = FORT_TIERS[G.fortLevel] || FORT_TIERS[0];
  const cx = G.base.x + G.base.w/2 - G.cam.x;
  const cy = G.base.y + G.base.h/2 - G.cam.y;
  const now = performance.now();
  const hpPct = G.base.hp / G.base.maxHp;

  // ── Campfire light glow (drawn under everything) ──
  if (G.phase === 'night') {
    const lightR = tier.lightRadius;
    const flicker = 0.9 + Math.sin(now*0.007)*0.1;
    const lightGrad = ctx.createRadialGradient(cx,cy,0, cx,cy,lightR*flicker);
    lightGrad.addColorStop(0,   'rgba(255,140,30,0.22)');
    lightGrad.addColorStop(0.4, 'rgba(255,100,20,0.12)');
    lightGrad.addColorStop(1,   'rgba(255,80,0,0)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(cx-lightR*2, cy-lightR*2, lightR*4, lightR*4);
  }

  // ── Fort walls (level 2+) ──
  if (G.fortLevel >= 2) {
    const wallR = tier.wallRadius;
    const wallColor = G.fortLevel >= 3 ? '#7f8c8d' : '#8B4513';
    const wallDark  = G.fortLevel >= 3 ? '#5d6d7e' : '#5D2E0C';
    const wallThick = G.fortLevel >= 3 ? 14 : 10;

    // Draw wall as octagon
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = wallDark;
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = wallThick;
    ctx.beginPath();
    for (let i=0;i<8;i++) {
      const a = (i/8)*Math.PI*2 - Math.PI/8;
      const r = wallR + (i%2===0?4:0);
      i===0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.stroke();

    // Wall crenellations
    ctx.fillStyle = wallColor;
    for (let i=0;i<8;i++) {
      const a = (i/8)*Math.PI*2 - Math.PI/8;
      const r = wallR;
      const wx = Math.cos(a)*r, wy = Math.sin(a)*r;
      ctx.beginPath(); ctx.arc(wx, wy, wallThick*0.7, 0, Math.PI*2); ctx.fill();
    }

    // Gate (south side) — 28px wide opening
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-14, wallR-8, 28, 18);
    ctx.fillStyle = G.fortLevel>=3 ? '#7f8c8d' : '#8B4513';
    ctx.fillRect(-12, wallR-6, 24, 14);
    // Gate arch
    ctx.strokeStyle = G.fortLevel>=3 ? '#aaa' : '#c0832a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, wallR-6, 12, Math.PI, 0); ctx.stroke();

    // "ENTER" prompt near gate if player is close
    const pDist2 = Math.hypot(G.player.x-G.base.x-G.base.w/2, G.player.y-G.base.y-G.base.h/2);
    const pAngle = Math.atan2(G.player.y-(G.base.y+G.base.h/2), G.player.x-(G.base.x+G.base.w/2));
    const nearGate = pDist2 > wallR-40 && pDist2 < wallR+40 && Math.abs(pAngle - Math.PI/2) < 0.6;
    if (nearGate) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath(); ctx.roundRect(-30, wallR+12, 60, 14, 4); ctx.fill();
      ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 8px Orbitron,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WALK THROUGH GATE', 0, wallR+22);
    }

    ctx.restore();
  }

  // ── Fort interior ground ──
  const groundR = tier.radius;
  ctx.save();
  ctx.translate(cx, cy);

  if (G.fortLevel === 0) {
    // Just dirt circle for campfire
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.arc(0,0,groundR,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#5a3a1a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,groundR,0,Math.PI*2); ctx.stroke();
  } else if (G.fortLevel === 1) {
    // Dirt + tent outlines
    ctx.fillStyle = '#2a3a1a';
    ctx.beginPath(); ctx.arc(0,0,groundR,0,Math.PI*2); ctx.fill();
    // Sandbags
    ctx.fillStyle = '#8B7355';
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      ctx.beginPath(); ctx.ellipse(Math.cos(a)*(groundR-8),Math.sin(a)*(groundR-8),8,5,a,0,Math.PI*2); ctx.fill();
    }
  } else {
    // Stone/wood floor
    ctx.fillStyle = G.fortLevel>=3 ? '#2c2c2c' : '#3a2a1a';
    ctx.beginPath(); ctx.arc(0,0,groundR,0,Math.PI*2); ctx.fill();
    // Floor planks/stones
    ctx.strokeStyle = G.fortLevel>=3 ? '#333' : '#4a3a2a';
    ctx.lineWidth=1;
    for(let r2=10;r2<groundR;r2+=12){
      ctx.beginPath(); ctx.arc(0,0,r2,0,Math.PI*2); ctx.stroke();
    }
  }

  // ── Campfire ──
  const fireFlicker = Math.sin(now*0.015)*0.3 + Math.sin(now*0.023)*0.2;
  // Logs
  ctx.fillStyle = '#5a3a1a';
  ctx.save(); ctx.rotate(0.5);
  ctx.fillRect(-14,-4,28,7); ctx.restore();
  ctx.save(); ctx.rotate(-0.5);
  ctx.fillRect(-14,-4,28,7); ctx.restore();
  // Fire glow
  const fireGrad = ctx.createRadialGradient(0,0,0, 0,0,18+fireFlicker*4);
  fireGrad.addColorStop(0,'rgba(255,255,150,0.9)');
  fireGrad.addColorStop(0.3,'rgba(255,140,20,0.8)');
  fireGrad.addColorStop(0.7,'rgba(255,60,0,0.4)');
  fireGrad.addColorStop(1,'rgba(255,30,0,0)');
  ctx.fillStyle=fireGrad;
  ctx.beginPath(); ctx.arc(0,0,18+fireFlicker*4,0,Math.PI*2); ctx.fill();
  // Flame shapes
  for(let f=0;f<5;f++){
    const fa=(f/5)*Math.PI*2+now*0.003;
    const fr=6+Math.sin(now*0.01+f)*3;
    const fh=12+Math.sin(now*0.008+f*1.3)*5;
    ctx.fillStyle=`rgba(255,${100+f*20},0,${0.6+fireFlicker*0.3})`;
    ctx.beginPath();
    ctx.moveTo(Math.cos(fa)*fr, Math.sin(fa)*fr);
    ctx.quadraticCurveTo(Math.cos(fa+0.5)*fr*0.5, Math.sin(fa+0.5)*fr*0.5-fh*0.5, 0,-fh);
    ctx.quadraticCurveTo(Math.cos(fa-0.5)*fr*0.5, Math.sin(fa-0.5)*fr*0.5-fh*0.5, Math.cos(fa)*fr, Math.sin(fa)*fr);
    ctx.fill();
  }
  // Sparks
  if (Math.random()<0.3) spawnParticles(G.base.x+G.base.w/2, G.base.y+G.base.h/2, '#ff6b35', 1, 1.5);

  // Fort name label
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(-40,-groundR-22,80,16,4); ctx.fill();
  ctx.fillStyle=tier.color; ctx.font='bold 10px Orbitron,sans-serif';
  ctx.textAlign='center';
  ctx.fillText(tier.name.toUpperCase(), 0, -groundR-10);

  ctx.restore();

  // ── HP bar ──
  const barW = Math.max(60, groundR*2);
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(cx-barW/2, cy-groundR-38, barW, 8, 4); ctx.fill();
  ctx.fillStyle=hpPct>0.5?'#2ecc71':hpPct>0.25?'#f39c12':'#e74c3c';
  ctx.beginPath(); ctx.roundRect(cx-barW/2, cy-groundR-38, barW*hpPct, 8, 4); ctx.fill();

  // ── Wall HP bar (level 2+) ──
  if (G.fortLevel >= 2 && G.fortWallMaxHp > 0) {
    const wallPct = G.fortWallHp / G.fortWallMaxHp;
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(cx-barW/2, cy-groundR-52, barW, 6, 3); ctx.fill();
    ctx.fillStyle = wallPct > 0.5 ? '#8B4513' : wallPct > 0.2 ? '#d35400' : '#e74c3c';
    ctx.beginPath(); ctx.roundRect(cx-barW/2, cy-groundR-52, barW*wallPct, 6, 3); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='bold 8px Orbitron,sans-serif'; ctx.textAlign='center';
    ctx.fillText('WALL', cx, cy-groundR-47);
  }

  // ── Shop (south of campfire) ──
  const shop = getShopPosition();
  const sx = shop.x - G.cam.x, sy = shop.y - G.cam.y;
  const shopDist = Math.hypot(G.player.x-shop.x, G.player.y-shop.y);
  const shopNear = shopDist < 60;

  // Shop stand/tent
  ctx.fillStyle='#8B4513';
  ctx.beginPath(); ctx.moveTo(sx-30,sy); ctx.lineTo(sx,sy-25); ctx.lineTo(sx+30,sy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=shopNear?'#f1c40f':'#a0826d'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(sx-30,sy); ctx.lineTo(sx,sy-25); ctx.lineTo(sx+30,sy); ctx.closePath(); ctx.stroke();
  // Shop base
  ctx.fillStyle='#654321';
  ctx.fillRect(sx-28,sy,56,8);
  // Shop icon
  ctx.font='24px serif'; ctx.textAlign='center';
  ctx.fillText('🛒', sx, sy-5);
  // Label
  ctx.fillStyle='rgba(0,0,0,0.7)';
  ctx.beginPath(); ctx.roundRect(sx-30,sy-48,60,16,4); ctx.fill();
  ctx.fillStyle=shopNear?'#f1c40f':'#74b9ff'; ctx.font='bold 9px Orbitron,sans-serif'; ctx.textAlign='center';
  ctx.fillText('SHOP', sx, sy-37);
  if (shopNear && G.phase==='day') {
    ctx.fillStyle='rgba(0,0,0,0.8)';
    ctx.beginPath(); ctx.roundRect(sx-35,sy+12,70,14,4); ctx.fill();
    ctx.fillStyle='#f1c40f'; ctx.font='bold 8px Orbitron,sans-serif';
    ctx.fillText('[E] Open Shop', sx, sy+22);
  }

  // ── Proximity prompts (day only) ──
  if (G.phase==='day') {
    const pDist = Math.hypot(G.player.x-(G.base.x+G.base.w/2), G.player.y-(G.base.y+G.base.h/2));
    if (pDist < groundR + 80) {
      const pulse = 0.5+Math.sin(now*0.005)*0.3;
      ctx.strokeStyle=`rgba(241,196,15,${pulse})`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,groundR+6,0,Math.PI*2); ctx.stroke();
    }
  }
}

// Fort collision helper — returns true if point is inside fort walls
function isInsideFortWalls(wx, wy) {
  if (G.fortLevel < 2) return false;
  const tier = FORT_TIERS[G.fortLevel];
  const cx = G.base.x+G.base.w/2, cy = G.base.y+G.base.h/2;
  return Math.hypot(wx-cx, wy-cy) < tier.wallRadius - 8;
}

// Fort wall collision — blocks movement at wall boundary, with gate opening on south side
function isFortWall(wx, wy) {
  if (G.fortLevel < 2) return false;
  if (G.fortWallHp <= 0) return false; // walls broken — no collision
  const tier = FORT_TIERS[G.fortLevel];
  const cx = G.base.x+G.base.w/2, cy = G.base.y+G.base.h/2;
  const dist = Math.hypot(wx-cx, wy-cy);
  const wallR = tier.wallRadius;
  if (dist <= wallR - 10 || dist >= wallR + 10) return false;
  const angle = Math.atan2(wy-cy, wx-cx);
  const southAngle = Math.PI/2;
  const gateHalfWidth = Math.asin(28 / wallR);
  const angleDiff = Math.abs(angle - southAngle);
  if (angleDiff < gateHalfWidth) return false;
  return true;
}

function drawPlayer() {
  const px=G.player.x-G.cam.x, py=G.player.y-G.cam.y;
  const facing=G.player.facing;
  const isMoving = G.keys['KeyW']||G.keys['KeyS']||G.keys['KeyA']||G.keys['KeyD']||
                   G.keys['ArrowUp']||G.keys['ArrowDown']||G.keys['ArrowLeft']||G.keys['ArrowRight'];
  const walk = isMoving ? Math.sin(performance.now()*0.012) : 0;

  // Sprint VFX
  if (G.player.sprinting && isMoving) {
    const trailAngle = facing + Math.PI;
    const now_s = performance.now();

    // Motion blur streaks behind player
    for (let i=1;i<=4;i++) {
      const dist = i*12;
      const tx = px + Math.cos(trailAngle)*dist;
      const ty = py + Math.sin(trailAngle)*dist;
      ctx.globalAlpha = (0.18 - i*0.04);
      ctx.fillStyle = '#a0c4ff';
      ctx.beginPath();
      ctx.ellipse(tx, ty, 9-i*1.5, 3, trailAngle, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Speed lines radiating from sides
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(facing);
    ctx.strokeStyle = 'rgba(160,196,255,0.25)';
    ctx.lineWidth = 1.5;
    for (let s=-1;s<=1;s+=2) {
      const lineY = s * 10;
      const flicker = Math.sin(now_s*0.03 + s)*4;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(-8 + flicker, lineY);
      ctx.lineTo(-28 + flicker, lineY);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Dust puffs spawned into world particles (throttled)
    if (!G.player._lastDust) G.player._lastDust = 0;
    if (now_s - G.player._lastDust > 60) {
      G.player._lastDust = now_s;
      const dustX = G.player.x + Math.cos(trailAngle)*8 + (Math.random()-0.5)*6;
      const dustY = G.player.y + Math.sin(trailAngle)*8 + (Math.random()-0.5)*6;
      spawnParticles(dustX, dustY, '#8a7a6a', 2, 1.2);
    }
  }

  ctx.save();
  ctx.translate(px, py);

  // Ground shadow
  ctx.fillStyle='rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 6, 13, 5, 0, 0, Math.PI*2); ctx.fill();

  // ── Body stays UPRIGHT — no full rotation ──

  // Legs (walking animation, no rotation)
  ctx.fillStyle='#1a202c';
  ctx.save(); ctx.translate(-4, 6); ctx.rotate(walk*0.5);
  ctx.fillRect(-3,0,6,10); ctx.fillStyle='#2d3748'; ctx.fillRect(-3,8,7,4);
  ctx.restore();
  ctx.fillStyle='#1a202c';
  ctx.save(); ctx.translate(4, 6); ctx.rotate(-walk*0.5);
  ctx.fillRect(-3,0,6,10); ctx.fillStyle='#2d3748'; ctx.fillRect(-3,8,7,4);
  ctx.restore();

  // Body / torso
  ctx.fillStyle='#2d4a6e';
  ctx.beginPath(); ctx.roundRect(-8,-10,16,18,3); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.roundRect(-6,-9,12,8,2); ctx.fill();
  ctx.fillStyle='#1a252f'; ctx.fillRect(-8,5,16,3);
  if (G.player.hasArmor) {
    ctx.strokeStyle='#3498db'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(-8,-10,16,18,3); ctx.stroke();
    ctx.fillStyle='rgba(52,152,219,0.1)';
    ctx.beginPath(); ctx.roundRect(-8,-10,16,18,3); ctx.fill();
  }

  // Left arm (static, no gun)
  ctx.fillStyle='#2d4a6e';
  ctx.save(); ctx.translate(-8,-4); ctx.rotate(-0.3+walk*0.3);
  ctx.fillRect(-3,0,6,11);
  ctx.fillStyle='#c8956c'; ctx.beginPath(); ctx.arc(0,12,3.5,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // ── Gun arm — rotates toward mouse ──
  ctx.save();
  ctx.rotate(facing); // only the gun arm rotates
  // Right arm
  ctx.fillStyle='#2d4a6e';
  ctx.fillRect(4,-5,6,12);
  ctx.fillStyle='#c8956c'; ctx.beginPath(); ctx.arc(7,9,3.5,0,Math.PI*2); ctx.fill();
  // Gun
  const slot=G.player.slots[G.player.selectedSlot];
  ctx.fillStyle='#718096'; ctx.fillRect(8,-3,22,5);
  ctx.fillStyle='#4a5568'; ctx.fillRect(28,-2,5,3);
  ctx.fillStyle='#555'; ctx.fillRect(12,2,5,7);
  // Muzzle flash
  if (slot&&!slot.reloading&&G.mouse.down&&performance.now()-G.player.lastShot<70) {
    // Draw flash at gun tip (x=33 in rotated local space)
    ctx.save();
    ctx.translate(33, 0);
    ctx.shadowColor='#ffe066'; ctx.shadowBlur=18;
    // Core white flash
    ctx.fillStyle='rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
    // Orange bloom
    ctx.fillStyle='rgba(255,200,60,0.8)';
    ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
    // Outer glow
    ctx.fillStyle='rgba(255,160,30,0.35)';
    ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.fill();
    // Forward spike
    ctx.fillStyle='rgba(255,240,120,0.7)';
    ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(14,0); ctx.lineTo(0,3); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
    // Store muzzle flash world position at the actual gun tip
    G._muzzleFlash = {
      x: G.player.x + Math.cos(facing)*33,
      y: G.player.y + Math.sin(facing)*33,
      born: performance.now()
    };
  }
  ctx.restore(); // end gun arm rotation

  // Head (upright, no rotation)
  ctx.fillStyle='#c8956c'; ctx.fillRect(-3,-14,6,6);
  ctx.fillStyle='#c8956c'; ctx.beginPath(); ctx.ellipse(0,-19,8,9,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#2d4a6e'; ctx.beginPath(); ctx.ellipse(0,-21,8,7,0,Math.PI,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1a2f4a'; ctx.fillRect(-8,-21,16,4);
  ctx.fillStyle='rgba(100,200,255,0.35)'; ctx.beginPath(); ctx.ellipse(0,-19,7,4,0,Math.PI,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#1a2f4a'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(0,-19,8,0.2,Math.PI-0.2); ctx.stroke();

  ctx.restore(); // end translate

  // Night vision glow (screen space)
  if (G.nightVisionActive) {
    ctx.save(); ctx.globalAlpha=0.1; ctx.fillStyle='#00ff00';
    ctx.beginPath(); ctx.arc(px,py,220,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Melee slash arc
  if (G.meleeFlash) {
    const age = performance.now() - G.meleeFlash.born;
    const dur = 180;
    if (age < dur) {
      const t = age/dur;
      const alpha = 1-t;
      const r = G.meleeFlash.range * (0.5+t*0.5);
      const a = G.meleeFlash.angle;
      const sx2 = G.meleeFlash.x - G.cam.x;
      const sy2 = G.meleeFlash.y - G.cam.y;
      ctx.save();

      // Outer glow sweep
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = G.meleeFlash.hit > 0 ? '#ff6b35' : '#aaa';
      ctx.lineWidth = 14 - t*10;
      ctx.shadowColor = G.meleeFlash.hit > 0 ? '#ff6b35' : '#aaa';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(sx2, sy2, r*1.15, a-1.0, a+1.0);
      ctx.stroke();

      // Main arc
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = G.meleeFlash.hit > 0 ? '#ff9f43' : '#ccc';
      ctx.lineWidth = 4 - t*3;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx2, sy2, r, a-0.9, a+0.9);
      ctx.stroke();

      // Leading edge spark
      if (t < 0.4) {
        const sparkA = a + 0.9;
        const sx3 = sx2 + Math.cos(sparkA)*r;
        const sy3 = sy2 + Math.sin(sparkA)*r;
        ctx.globalAlpha = (0.4-t)/0.4;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(sx3, sy3, 4-t*8, 0, Math.PI*2); ctx.fill();
      }

      // Impact flash on hit
      if (G.meleeFlash.hit > 0 && t < 0.25) {
        ctx.globalAlpha = (0.25-t)/0.25 * 0.6;
        ctx.fillStyle = '#ff6b35';
        ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(sx2+Math.cos(a)*r*0.7, sy2+Math.sin(a)*r*0.7, 18*(1-t), 0, Math.PI*2); ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      G.meleeFlash = null;
    }
  }
}

function drawZombies() {
  G.zombies.forEach(z => {
    const sx=z.x-G.cam.x, sy=z.y-G.cam.y;
    if (sx<-80||sx>canvas.width+80||sy<-80||sy>canvas.height+80) return;

    const walk = Math.sin(z.walkCycle);
    const sz = z.size;

    // ── Invisible zombie visibility ──
    let zombieAlpha = 1;
    if (z.invisible && G.phase==='night') {
      // Base: nearly invisible
      zombieAlpha = 0.06;
      // Revealed by NV
      if (G.nightVisionActive) zombieAlpha = 0.75;
      // Revealed by flashlight if in cone
      else if (G.flashlightOn && G.flashlightBattery > 0) {
        const angle = G.player.facing;
        const dx = sx - (G.player.x-G.cam.x);
        const dy = sy - (G.player.y-G.cam.y);
        const dist = Math.hypot(dx,dy);
        const zAngle = Math.atan2(dy,dx);
        let diff = zAngle - angle;
        while(diff > Math.PI) diff -= Math.PI*2;
        while(diff < -Math.PI) diff += Math.PI*2;
        if (Math.abs(diff) < 0.4 && dist < 340) zombieAlpha = 0.85;
      }
    }
    ctx.globalAlpha = zombieAlpha;

    ctx.save();
    ctx.translate(sx, sy);

    // Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, sz*0.6, sz*0.9, sz*0.35, 0, 0, Math.PI*2); ctx.fill();

    ctx.rotate(z.angle);

    // Legs
    ctx.fillStyle=darkenColor(z.color, 30);
    ctx.save(); ctx.translate(-sz*0.3, sz*0.3); ctx.rotate(walk*0.5);
    ctx.beginPath(); ctx.roundRect(-sz*0.18, 0, sz*0.36, sz*0.7, sz*0.1); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(sz*0.3, sz*0.3); ctx.rotate(-walk*0.5);
    ctx.beginPath(); ctx.roundRect(-sz*0.18, 0, sz*0.36, sz*0.7, sz*0.1); ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle=z.color;
    ctx.beginPath(); ctx.ellipse(0, 0, sz*0.7, sz*0.85, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=darkenColor(z.color, 15);
    ctx.beginPath(); ctx.ellipse(0, sz*0.1, sz*0.45, sz*0.5, 0, 0, Math.PI*2); ctx.fill();

    // Infected glow
    if (z.infected) {
      ctx.strokeStyle='rgba(160,40,255,0.55)'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.ellipse(0,0,sz*0.72,sz*0.87,0,0,Math.PI*2); ctx.stroke();
    }

    // Left arm
    ctx.fillStyle=lightenColor(z.color, 15);
    ctx.save(); ctx.translate(-sz*0.7, -sz*0.1); ctx.rotate(-0.5 + walk*0.35);
    ctx.beginPath(); ctx.ellipse(0, sz*0.35, sz*0.22, sz*0.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=lightenColor(z.color, 30);
    ctx.beginPath(); ctx.arc(0, sz*0.72, sz*0.2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // Right arm
    ctx.fillStyle=lightenColor(z.color, 15);
    ctx.save(); ctx.translate(sz*0.7, -sz*0.1); ctx.rotate(0.5 - walk*0.35);
    ctx.beginPath(); ctx.ellipse(0, sz*0.35, sz*0.22, sz*0.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=lightenColor(z.color, 30);
    ctx.beginPath(); ctx.arc(0, sz*0.72, sz*0.2, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle=lightenColor(z.color, 25);
    ctx.beginPath(); ctx.ellipse(0, -sz*0.55, sz*0.5, sz*0.52, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=darkenColor(z.color, 10);
    ctx.beginPath(); ctx.ellipse(0, -sz*0.6, sz*0.3, sz*0.28, 0, 0, Math.PI*2); ctx.fill();
    // Eyes
    const eyeX=sz*0.18, eyeY=-sz*0.6;
    ctx.fillStyle='#cc1100';
    ctx.beginPath(); ctx.arc(-eyeX, eyeY, sz*0.11, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( eyeX, eyeY, sz*0.11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,30,0,0.35)';
    ctx.beginPath(); ctx.arc(-eyeX, eyeY, sz*0.18, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( eyeX, eyeY, sz*0.18, 0, Math.PI*2); ctx.fill();

    ctx.restore();

    // Boss crown (screen-space, no rotation)
    if (z.boss) {
      ctx.save(); ctx.translate(sx, sy);
      ctx.fillStyle='#f1c40f';
      const cy = -sz - 6;
      ctx.beginPath();
      ctx.moveTo(-16,cy); ctx.lineTo(-16,cy-14); ctx.lineTo(-8,cy-8);
      ctx.lineTo(0,cy-18); ctx.lineTo(8,cy-8); ctx.lineTo(16,cy-14);
      ctx.lineTo(16,cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#e67e22'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#e74c3c'; ctx.beginPath(); ctx.arc(0,cy-14,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#3498db'; ctx.beginPath(); ctx.arc(-10,cy-6,2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#3498db'; ctx.beginPath(); ctx.arc(10,cy-6,2,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // ── L4D special visual indicators (screen-space) ──
    ctx.save(); ctx.translate(sx, sy);
    ctx.font = '13px serif'; ctx.textAlign='center';

    if (z.boomer) {
      // Bloated green glow
      ctx.globalAlpha=0.3+Math.sin(performance.now()*0.004)*0.15;
      ctx.fillStyle='#8a9a2a';
      ctx.beginPath(); ctx.arc(0,0,sz+4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=zombieAlpha;
      ctx.fillText('🤢', 0, -sz-4);
    }
    if (z.hunter) {
      // Dark aura, crouched look
      ctx.globalAlpha=0.25;
      ctx.fillStyle='#2a2a4a';
      ctx.beginPath(); ctx.arc(0,0,sz+3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=zombieAlpha;
      if (z.pouncing) {
        ctx.fillStyle='rgba(42,42,74,0.6)';
        ctx.beginPath(); ctx.arc(0,0,sz*2,0,Math.PI*2); ctx.fill();
      }
      ctx.fillText('🐱', 0, -sz-4);
    }
    if (z.smoker) {
      // Smoke trail
      ctx.globalAlpha=0.2;
      ctx.fillStyle='#4a6a4a';
      ctx.beginPath(); ctx.arc(0,0,sz+5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=zombieAlpha;
      ctx.fillText('💨', 0, -sz-4);
    }
    if (z.charger) {
      ctx.fillText('🐂', 0, -sz-4);
      if (z.charging) {
        ctx.globalAlpha=0.4;
        ctx.fillStyle='#5a3a1a';
        ctx.beginPath(); ctx.arc(0,0,sz*1.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=zombieAlpha;
      }
    }
    if (z.jockey) {
      ctx.fillText('🐒', 0, -sz-4);
    }
    if (z.witch) {
      // Sitting glow — white/pink
      ctx.globalAlpha=0.2+Math.sin(performance.now()*0.003)*0.1;
      ctx.fillStyle='#cc88aa';
      ctx.beginPath(); ctx.arc(0,0,sz+6,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=zombieAlpha;
      ctx.fillText(z.enraged?'😡':'😢', 0, -sz-4);
    }
    if (z.screamer) {
      ctx.fillText('📢', 0, -sz-4);
    }
    if (z.armored) {
      // Metal sheen
      ctx.strokeStyle='rgba(180,180,180,0.5)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(0,0,sz+2,0,Math.PI*2); ctx.stroke();
    }

    ctx.restore();

    // HP bar — only show if visible enough
    if (zombieAlpha > 0.3) {
      const hpPct=z.hp/z.maxHp;
      const bw=z.size*2.8;
      ctx.globalAlpha = zombieAlpha;
      ctx.fillStyle='rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(sx-bw/2, sy-sz-16, bw, 6, 3); ctx.fill();
      ctx.fillStyle=hpPct>0.5?'#2ecc71':hpPct>0.25?'#f39c12':'#e74c3c';
      ctx.beginPath(); ctx.roundRect(sx-bw/2, sy-sz-16, bw*hpPct, 6, 3); ctx.fill();
    }

    ctx.globalAlpha = 1; // reset
  });
}

function darkenColor(hex, amount) {
  if (!hex||hex.length<7) return '#333';
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  if (isNaN(r)||isNaN(g)||isNaN(b)) return '#333';
  return `rgb(${Math.max(0,r-amount)},${Math.max(0,g-amount)},${Math.max(0,b-amount)})`;
}

function lightenColor(hex, amount) {
  if (!hex||hex.length<7) return '#aaa';
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  if (isNaN(r)||isNaN(g)||isNaN(b)) return '#aaa';
  return `rgb(${Math.min(255,r+amount)},${Math.min(255,g+amount)},${Math.min(255,b+amount)})`;
}

function drawBullets() {
  // Set shadow once for all non-flame bullets, reset once at end
  ctx.shadowBlur = 6;
  G.bullets.forEach(b => {
    const sx=b.x-G.cam.x, sy=b.y-G.cam.y;
    // Cull off-screen
    if (sx<-20||sx>canvas.width+20||sy<-20||sy>canvas.height+20) return;
    if (b.flame) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha=0.65;
      const fg=ctx.createRadialGradient(sx,sy,0,sx,sy,b.size/2);
      fg.addColorStop(0,'#fff'); fg.addColorStop(0.4,'#ff6b35'); fg.addColorStop(1,'rgba(255,100,0,0)');
      ctx.fillStyle=fg;
      ctx.beginPath(); ctx.arc(sx,sy,b.size/2,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.shadowBlur = 6;
    } else {
      ctx.shadowColor=b.color;
      ctx.fillStyle=b.color;
      ctx.beginPath(); ctx.arc(sx,sy,b.size/2,0,Math.PI*2); ctx.fill();
      // Trail
      ctx.globalAlpha=0.3;
      ctx.beginPath(); ctx.arc(sx-b.vx*1.5,sy-b.vy*1.5,b.size/3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
  });
  ctx.shadowBlur=0;
}

function drawProjectiles() {
  const now = performance.now();
  G.projectiles.forEach(p => {
    const sx=p.x-G.cam.x, sy=p.y-G.cam.y;
    if (p.type==='grenade') {
      ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#f39c12'; ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx+4,sy-4,2,0,Math.PI*2); ctx.fill();
    } else if (p.type==='molotov') {
      ctx.fillStyle='#8B4513'; ctx.beginPath(); ctx.arc(sx,sy,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff6b35'; ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
    } else if (p.type==='fire') {
      const age = (now-p.born)/p.life;
      const alpha = Math.max(0, 0.7*(1-age));
      ctx.globalAlpha=alpha;
      const flicker = 0.8+Math.sin(now*0.02+p.x)*0.2;
      const fg=ctx.createRadialGradient(sx,sy,0,sx,sy,18*flicker);
      fg.addColorStop(0,'rgba(255,255,100,0.9)');
      fg.addColorStop(0.4,'rgba(255,100,0,0.7)');
      fg.addColorStop(1,'rgba(255,50,0,0)');
      ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(sx,sy,18*flicker,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    } else if (p.type==='spit') {
      ctx.globalAlpha=0.8;
      const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,6);
      sg.addColorStop(0,'#d35400'); sg.addColorStop(1,'rgba(142,68,173,0)');
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
  });
}

function drawMines() {
  const now = performance.now();
  G.mines.forEach(m => {
    const sx=m.x-G.cam.x, sy=m.y-G.cam.y;
    if (m.armed) {
      // Pulsing danger glow
      const pulse = 0.4 + Math.sin(now*0.008)*0.3;
      ctx.fillStyle=`rgba(231,76,60,${pulse*0.3})`;
      ctx.beginPath(); ctx.arc(sx,sy,18,0,Math.PI*2); ctx.fill();
    }
    // Body
    ctx.fillStyle=m.armed?'#c0392b':'#7f8c8d';
    ctx.beginPath(); ctx.arc(sx,sy,9,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=m.armed?'#e74c3c':'#95a5a6'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(sx,sy,9,0,Math.PI*2); ctx.stroke();
    // Prongs
    ctx.strokeStyle=m.armed?'#e74c3c':'#7f8c8d'; ctx.lineWidth=2;
    for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(sx+Math.cos(a)*9,sy+Math.sin(a)*9);ctx.lineTo(sx+Math.cos(a)*13,sy+Math.sin(a)*13);ctx.stroke();}
    // Blink LED
    if (m.armed) {
      const blink = Math.floor(now/300)%2===0;
      if (blink) {
        ctx.shadowColor='#e74c3c'; ctx.shadowBlur=8;
        ctx.fillStyle='#ff4444'; ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      }
    }
  });
}

function drawTurrets() {
  const now = performance.now();
  G.turrets.forEach(t => {
    const sx=t.x-G.cam.x, sy=t.y-G.cam.y;
    // Outer glow ring
    const pulse = 0.3 + Math.sin(now*0.004)*0.15;
    ctx.fillStyle=`rgba(0,255,255,${pulse*0.2})`;
    ctx.beginPath(); ctx.arc(sx,sy,20,0,Math.PI*2); ctx.fill();
    // Base
    ctx.fillStyle='#1a2a3a';
    ctx.beginPath(); ctx.arc(sx,sy,14,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(0,255,255,0.7)'; ctx.lineWidth=2;
    ctx.shadowColor='#00ffff'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(sx,sy,14,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    // Barrel
    ctx.save(); ctx.translate(sx,sy); ctx.rotate(t.angle||0);
    ctx.fillStyle='#4a6a7a'; ctx.fillRect(4,-3,18,6);
    ctx.fillStyle='#7fb3c8'; ctx.fillRect(20,-2,4,4);
    // Muzzle flash when recently fired
    if (t._lastFired && now - t._lastFired < 80) {
      ctx.shadowColor='#00ffff'; ctx.shadowBlur=12;
      ctx.fillStyle='rgba(0,255,255,0.9)';
      ctx.beginPath(); ctx.arc(24,0,4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
    ctx.restore();
    // Center dot
    ctx.shadowColor='#00ffff'; ctx.shadowBlur=6;
    ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(sx,sy,4,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });
}

function drawBarricades() {
  G.barricades.forEach(b => {
    const sx=b.x-G.cam.x, sy=b.y-G.cam.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(b.angle || 0);
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(-16,-6,32,14);
    // Planks
    ctx.fillStyle='#8B4513';
    ctx.fillRect(-15,-7,30,14);
    // Wood grain
    ctx.strokeStyle='#5D2E0C'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-15,-3); ctx.lineTo(15,-3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15,3); ctx.lineTo(15,3); ctx.stroke();
    // Nails
    ctx.fillStyle='#aaa';
    ctx.fillRect(-12,-1,3,3); ctx.fillRect(9,-1,3,3);
    ctx.restore();
    // HP bar (always upright)
    const hpPct=b.hp/b.maxHp;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(sx-15,sy-14,30,4);
    ctx.fillStyle='#f39c12'; ctx.fillRect(sx-15,sy-14,30*hpPct,4);
  });
}

function drawParticles() {
  // Batch particles by type to minimize state changes
  let hasShadow = false;
  G.particles.forEach(p => {
    const sx=p.x-G.cam.x, sy=p.y-G.cam.y;
    // Cull off-screen
    if (sx<-20||sx>canvas.width+20||sy<-20||sy>canvas.height+20) return;

    ctx.globalAlpha = p.life * 0.9;

    // Trail for sparks/embers
    if (p.trail && p.px!==undefined) {
      const psx=p.px-G.cam.x, psy=p.py-G.cam.y;
      ctx.strokeStyle=p.color;
      ctx.lineWidth=p.size*0.6;
      ctx.globalAlpha=p.life*0.4;
      ctx.beginPath(); ctx.moveTo(psx,psy); ctx.lineTo(sx,sy); ctx.stroke();
      ctx.globalAlpha=p.life*0.9;
    }

    // Glow only for sparks/embers — skip for plain particles (expensive)
    if (p.type==='spark'||p.type==='ember') {
      ctx.shadowColor=p.color;
      ctx.shadowBlur=p.size*2;
      hasShadow = true;
    } else if (hasShadow) {
      ctx.shadowBlur=0;
      hasShadow = false;
    }

    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(sx,sy,Math.max(0.5, p.size*p.life*0.5+p.size*0.5),0,Math.PI*2); ctx.fill();
  });
  if (hasShadow) ctx.shadowBlur=0;
  ctx.globalAlpha=1;
  ctx.lineWidth=1;
}

function drawFloatingTexts() {
  ctx.font='bold 14px Rajdhani,sans-serif';
  ctx.textAlign='center';
  ctx.shadowBlur=4; // reduced from 6
  G.floatingTexts.forEach(t => {
    ctx.globalAlpha=t.life;
    ctx.fillStyle=t.color;
    ctx.shadowColor=t.color;
    ctx.fillText(t.text,t.x,t.y);
  });
  ctx.shadowBlur=0;
  ctx.globalAlpha=1;
}

function drawCampfireCompass() {
  if (!G.player || !G.base) return;
  const baseCX = G.base.x + G.base.w/2;
  const baseCY = G.base.y + G.base.h/2;
  const dist = Math.hypot(G.player.x - baseCX, G.player.y - baseCY);
  const SHOW_DIST = 600; // show compass when this far from base
  if (dist < SHOW_DIST) return;

  const angle = Math.atan2(baseCY - G.player.y, baseCX - G.player.x);
  const margin = 60;
  const cx = canvas.width/2 + Math.cos(angle)*Math.min(dist*0.3, canvas.width/2 - margin);
  const cy = canvas.height/2 + Math.sin(angle)*Math.min(dist*0.3, canvas.height/2 - margin);
  // Clamp to screen edge
  const edgeX = Math.max(margin, Math.min(canvas.width-margin, canvas.width/2 + Math.cos(angle)*(canvas.width)));
  const edgeY = Math.max(margin, Math.min(canvas.height-margin, canvas.height/2 + Math.sin(angle)*(canvas.height)));

  const now = performance.now();
  const pulse = 0.7 + Math.sin(now*0.004)*0.3;

  ctx.save();
  ctx.translate(edgeX, edgeY);

  // Outer glow ring
  ctx.globalAlpha = pulse * 0.5;
  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.stroke();

  // Background circle
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();

  // Arrow pointing toward base
  ctx.rotate(angle);
  ctx.fillStyle = '#ff6b35';
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, -6);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.rotate(-angle);

  // Campfire icon
  ctx.globalAlpha = 1;
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔥', 0, 4);

  // Distance label
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 9px Orbitron,sans-serif';
  ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 4;
  ctx.fillText(Math.round(dist/TILE)+'m', 0, 32);
  ctx.shadowBlur = 0;

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawRain() {
  if (!G.weather.rain) return;
  const isBlizzard = G.weather.name === 'Blizzard';
  const isNight = G.phase === 'night';

  if (isBlizzard) {
    // Snow — white dots drifting sideways
    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    G.rainDrops.forEach(r => {
      const sx=r.x-G.cam.x, sy=r.y-G.cam.y;
      ctx.globalAlpha = r.alpha * 0.8;
      const sz = 1.5 + (r.len/14)*2; // vary size
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI*2); ctx.fill();
      r.y += r.speed * 0.4; // fall slowly
      r.x += G.weather.wind * 3 + Math.sin(r.y*0.05)*0.5; // drift
      if (r.y > G.cam.y+canvas.height+20 || r.x > G.cam.x+canvas.width+40) {
        r.y = G.cam.y - 10; r.x = G.cam.x + Math.random()*canvas.width;
      }
    });
    ctx.globalAlpha = 1;
    // Frost vignette
    const frost = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.3, canvas.width/2,canvas.height/2,canvas.height*0.8);
    frost.addColorStop(0, 'rgba(180,210,255,0)');
    frost.addColorStop(1, 'rgba(180,210,255,0.18)');
    ctx.fillStyle = frost; ctx.fillRect(0,0,canvas.width,canvas.height);
    // Slight white overlay for whiteout feel
    ctx.fillStyle = 'rgba(220,235,255,0.07)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  } else {
    // Rain
    ctx.strokeStyle = isNight ? 'rgba(80,100,140,0.5)' : 'rgba(150,200,255,0.35)';
    ctx.lineWidth = 1;
    G.rainDrops.forEach(r => {
      const sx=r.x-G.cam.x, sy=r.y-G.cam.y;
      ctx.globalAlpha = isNight ? r.alpha*0.6 : r.alpha;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+G.weather.wind*2,sy+r.len); ctx.stroke();
      r.y+=r.speed; r.x+=G.weather.wind;
      if (r.y>G.cam.y+canvas.height+20) { r.y=G.cam.y-10; r.x=G.cam.x+Math.random()*canvas.width; }
    });
    ctx.globalAlpha=1;
  }
}

function drawNightOverlay() {
  if (G.skyBrightness >= 0.99) return;
  const px=G.player.x-G.cam.x, py=G.player.y-G.cam.y;
  const darkAlpha = 0.94 * (1 - G.skyBrightness); // fades out during day transition

  // Create/reuse offscreen darkness canvas
  if (!G._darkCanvas || G._darkCanvas.width!==canvas.width || G._darkCanvas.height!==canvas.height) {
    G._darkCanvas = document.createElement('canvas');
    G._darkCanvas.width = canvas.width;
    G._darkCanvas.height = canvas.height;
    G._darkCtx = G._darkCanvas.getContext('2d');
  }
  const dc = G._darkCtx;
  const dw = canvas.width, dh = canvas.height;

  // Fill with darkness
  dc.globalCompositeOperation = 'source-over';
  dc.clearRect(0,0,dw,dh);
  dc.fillStyle = `rgba(0,0,18,${darkAlpha})`;
  dc.fillRect(0,0,dw,dh);

  // Switch to destination-out — everything drawn now punches holes
  dc.globalCompositeOperation = 'destination-out';

  // ── Campfire/fort light ──
  const tier = FORT_TIERS[G.fortLevel||0];
  const fcx = G.base.x+G.base.w/2 - G.cam.x;
  const fcy = G.base.y+G.base.h/2 - G.cam.y;
  const flicker = 0.9 + Math.sin(performance.now()*0.007)*0.1;
  const lightR = tier.lightRadius * flicker;
  const fireLight = dc.createRadialGradient(fcx,fcy,0, fcx,fcy,lightR);
  fireLight.addColorStop(0,   'rgba(0,0,0,0.9)');
  fireLight.addColorStop(0.5, 'rgba(0,0,0,0.65)');
  fireLight.addColorStop(0.8, 'rgba(0,0,0,0.25)');
  fireLight.addColorStop(1,   'rgba(0,0,0,0)');
  dc.fillStyle = fireLight;
  dc.beginPath(); dc.arc(fcx,fcy,lightR,0,Math.PI*2); dc.fill();

  // ── Ambient circle around player ──
  const ambGrad = dc.createRadialGradient(px,py,0, px,py,55);
  ambGrad.addColorStop(0,   'rgba(0,0,0,1)');
  ambGrad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
  ambGrad.addColorStop(1,   'rgba(0,0,0,0)');
  dc.fillStyle = ambGrad;
  dc.beginPath(); dc.arc(px,py,55,0,Math.PI*2); dc.fill();

  // ── Flashlight cone ──
  if (G.flashlightOn && G.flashlightBattery > 0) {
    const angle = G.player.facing;
    const fl = (340 + (G.player.flashRangeBonus||0)) * (G.flashlightBattery < 20 ? 0.6+Math.random()*0.4 : 1.0);
    const coneHalf = 0.36 + (G.player.flashWidthBonus||0);
    const fx = px + Math.cos(angle)*14;
    const fy = py + Math.sin(angle)*14;
    const coneGrad = dc.createRadialGradient(fx,fy,0, fx,fy,fl);
    coneGrad.addColorStop(0,    'rgba(0,0,0,1)');
    coneGrad.addColorStop(0.5,  'rgba(0,0,0,0.9)');
    coneGrad.addColorStop(0.85, 'rgba(0,0,0,0.4)');
    coneGrad.addColorStop(1,    'rgba(0,0,0,0)');
    dc.fillStyle = coneGrad;
    dc.beginPath();
    dc.moveTo(fx,fy);
    dc.arc(fx,fy,fl,angle-coneHalf,angle+coneHalf);
    dc.closePath();
    dc.fill();
  }

  // ── Night vision circle ──
  if (G.nightVisionActive) {
    const visR = 300;
    const nvGrad = dc.createRadialGradient(px,py,0, px,py,visR);
    nvGrad.addColorStop(0,    'rgba(0,0,0,1)');
    nvGrad.addColorStop(0.55, 'rgba(0,0,0,1)');
    nvGrad.addColorStop(0.85, 'rgba(0,0,0,0.5)');
    nvGrad.addColorStop(1,    'rgba(0,0,0,0)');
    dc.fillStyle = nvGrad;
    dc.beginPath(); dc.arc(px,py,visR,0,Math.PI*2); dc.fill();
  }

  // Done punching holes — reset and composite onto main canvas
  dc.globalCompositeOperation = 'source-over';
  ctx.drawImage(G._darkCanvas, 0, 0);

  // ── NV Zombie Detection — draw glowing outlines AFTER darkness so they show through ──
  if (G.nightVisionActive && G.player.nvDetection) {
    const now_nv = performance.now();
    G.zombies.forEach(z => {
      const dist = Math.hypot(z.x-G.player.x, z.y-G.player.y);
      if (dist > 900) return;
      const sx = z.x-G.cam.x, sy = z.y-G.cam.y;
      if (sx<-60||sx>canvas.width+60||sy<-60||sy>canvas.height+60) return;
      const pulse = 0.7 + Math.sin(now_nv*0.006 + z.x*0.01)*0.3;
      // Filled glow circle so zombie is visible through darkness
      const gGrad = ctx.createRadialGradient(sx,sy,0, sx,sy,z.size+10);
      gGrad.addColorStop(0, `rgba(0,255,100,${0.45*pulse})`);
      gGrad.addColorStop(0.5, `rgba(0,200,80,${0.25*pulse})`);
      gGrad.addColorStop(1, 'rgba(0,255,80,0)');
      ctx.fillStyle = gGrad;
      ctx.beginPath(); ctx.arc(sx,sy,z.size+10,0,Math.PI*2); ctx.fill();
      // Bright outline
      ctx.strokeStyle = `rgba(0,255,100,${0.9*pulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff64'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(sx,sy,z.size+3,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Distance label
      ctx.fillStyle = `rgba(0,255,100,${0.8*pulse})`;
      ctx.font = 'bold 9px Orbitron,sans-serif'; ctx.textAlign='center';
      ctx.fillText(Math.round(dist)+'m', sx, sy-z.size-8);
    });
    ctx.lineWidth = 1;
  }

  // ── Post-composite overlays (tints drawn on top of the revealed world) ──

  // Warm flashlight tint
  if (G.flashlightOn && G.flashlightBattery > 0) {
    const angle = G.player.facing;
    const fl = (340 + (G.player.flashRangeBonus||0)) * (G.flashlightBattery < 20 ? 0.6+Math.random()*0.4 : 1.0);
    const coneHalf = 0.36 + (G.player.flashWidthBonus||0);
    const fx = px + Math.cos(angle)*14, fy = py + Math.sin(angle)*14;
    const warmGrad = ctx.createRadialGradient(fx,fy,0, fx,fy,fl);
    warmGrad.addColorStop(0,   'rgba(255,240,180,0.14)');
    warmGrad.addColorStop(0.5, 'rgba(255,220,140,0.07)');
    warmGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = warmGrad;
    ctx.beginPath();
    ctx.moveTo(fx,fy);
    ctx.arc(fx,fy,fl,angle-coneHalf,angle+coneHalf);
    ctx.closePath();
    ctx.fill();
  }

  // Warm orange tint over campfire area
  const warmFire = ctx.createRadialGradient(fcx,fcy,0, fcx,fcy,lightR*0.7);
  warmFire.addColorStop(0,   'rgba(255,140,30,0.18)');
  warmFire.addColorStop(0.5, 'rgba(255,100,20,0.08)');
  warmFire.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = warmFire;
  ctx.beginPath(); ctx.arc(fcx,fcy,lightR*0.7,0,Math.PI*2); ctx.fill();

  // Muzzle flash area light (very brief, punches through darkness)
  if (G._muzzleFlash) {
    const mAge = performance.now() - G._muzzleFlash.born;
    const mDur = 80;
    if (mAge < mDur) {
      const mt = 1 - mAge/mDur;
      const mx2 = G._muzzleFlash.x - G.cam.x;
      const my2 = G._muzzleFlash.y - G.cam.y;
      const mAngle = G.player.facing;
      const mRadius = 160 * mt;
      // Radial punch at tip
      const mGrad = dc.createRadialGradient(mx2,my2,0, mx2,my2,mRadius);
      mGrad.addColorStop(0, `rgba(255,230,100,${0.95*mt})`);
      mGrad.addColorStop(0.3, `rgba(255,200,80,${0.6*mt})`);
      mGrad.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = mGrad;
      dc.beginPath(); dc.arc(mx2,my2,mRadius,0,Math.PI*2); dc.fill();
      // Forward cone of light
      const coneLen = 220 * mt;
      const coneHalf = 0.45;
      const cGrad = dc.createRadialGradient(mx2,my2,0, mx2,my2,coneLen);
      cGrad.addColorStop(0, `rgba(255,240,160,${0.7*mt})`);
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = cGrad;
      dc.beginPath();
      dc.moveTo(mx2,my2);
      dc.arc(mx2,my2,coneLen,mAngle-coneHalf,mAngle+coneHalf);
      dc.closePath();
      dc.fill();
    } else {
      G._muzzleFlash = null;
    }
  }

  // NV green tint + scanlines
  if (G.nightVisionActive) {
    ctx.fillStyle='rgba(0,255,0,0.05)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(0,0,0,0.07)';
    for (let sy=0;sy<canvas.height;sy+=4) ctx.fillRect(0,sy,canvas.width,2);
  }

  // Weather fog
  if (G.weather.fog>0) {
    ctx.fillStyle=`rgba(160,180,160,${G.weather.fog*0.2})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
}

function drawDayAtmosphere() {
  const sb = G.skyBrightness || 0;
  // Early night orange — runs even at full night (sb=0)
  const earlyNight = sb < 0.35 ? (0.35 - sb) / 0.35 : 0;
  if (earlyNight > 0.02) {
    ctx.fillStyle = `rgba(200,80,10,${earlyNight * 0.14})`; ctx.fillRect(0,0,canvas.width,canvas.height);
    const enGrad = ctx.createLinearGradient(0, canvas.height*0.6, 0, canvas.height);
    enGrad.addColorStop(0, `rgba(255,100,20,${earlyNight*0.18})`);
    enGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = enGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (sb <= 0.01) return; // rest only applies during day/transition
  // Subtle sky tint
  ctx.fillStyle=`rgba(135,206,235,${0.06*sb})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  if (G.weather.fog>0) {
    ctx.fillStyle=`rgba(220,220,230,${G.weather.fog*0.45*sb})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  // Sunrise/sunset glow during sky transition (peaks at sb=0.5)
  const transitionStrength = Math.max(0, 1 - Math.abs(sb - 0.5) * 2.2);
  if (transitionStrength > 0.02) {
    ctx.fillStyle = `rgba(255,110,20,${transitionStrength*0.22})`; ctx.fillRect(0,0,canvas.width,canvas.height);
    const grad = ctx.createLinearGradient(0, canvas.height*0.4, 0, canvas.height);
    grad.addColorStop(0, `rgba(255,80,0,${transitionStrength*0.32})`);
    grad.addColorStop(0.6, `rgba(200,50,0,${transitionStrength*0.12})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Sunset orange tint when day timer < 20s
  const ss = G._sunsetStrength || 0;
  if (ss > 0) {
    ctx.fillStyle = `rgba(255,100,20,${ss * 0.22})`; ctx.fillRect(0,0,canvas.width,canvas.height);
    const hGrad = ctx.createLinearGradient(0, canvas.height*0.5, 0, canvas.height);
    hGrad.addColorStop(0, `rgba(255,80,0,${ss*0.28})`);
    hGrad.addColorStop(1, `rgba(180,40,0,0)`);
    ctx.fillStyle = hGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(20,0,0,${ss * 0.12})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
}

function drawLightning() {
  if (G.lightningFlash>0) {
    ctx.fillStyle=`rgba(255,255,255,${Math.min(0.12,G.lightningFlash/80)})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
}

function drawZombieCount() {
  if (G.phase!=='night') return;
  const el=document.getElementById('zombie-count-badge');
  if (!el) return;
  el.style.display='block';
  el.textContent=`🧟 ${G.zombies.length} remaining`;
}

function drawDamageFlash() {
  if (!G._damageFlash) return;
  const age = performance.now() - G._damageFlash;
  const dur = 220;
  if (age > dur) { G._damageFlash = null; return; }
  const t = age / dur;
  // Red vignette that fades out
  const alpha = (1 - t) * 0.45;
  const grad = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.2, canvas.width/2,canvas.height/2,canvas.width*0.8);
  grad.addColorStop(0, `rgba(180,0,0,0)`);
  grad.addColorStop(1, `rgba(220,0,0,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function drawDownedOverlay() {
  if (!G.player || !G.player.downed) return;
  // Red vignette
  const grad = ctx.createRadialGradient(canvas.width/2,canvas.height/2,0, canvas.width/2,canvas.height/2,canvas.width*0.7);
  grad.addColorStop(0,'rgba(0,0,0,0)');
  grad.addColorStop(1,'rgba(180,0,0,0.7)');
  ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height);
  // Text
  const t = Math.ceil(Math.max(0,G.player.downedTimer));
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(canvas.width/2-120,canvas.height/2-36,240,60,8); ctx.fill();
  ctx.fillStyle='#e74c3c'; ctx.font='bold 22px Orbitron,sans-serif';
  ctx.textAlign='center';
  ctx.fillText('DOWNED', canvas.width/2, canvas.height/2-10);
  ctx.fillStyle='#fff'; ctx.font='14px Rajdhani,sans-serif';
  ctx.fillText('Reviving in '+t+'s...', canvas.width/2, canvas.height/2+16);
}

function drawInfectionWarning() {
  if (!G.player || G.player.infection < 100) return;
  if (!G.player.infectionDeathTimer || G.player.infectionDeathTimer <= 0) return;
  const t = Math.ceil(G.player.infectionDeathTimer);
  const pulse = 0.6+Math.sin(performance.now()*0.006)*0.4;
  ctx.fillStyle=`rgba(180,0,255,${pulse*0.25})`;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(canvas.width/2-150,canvas.height/2-100,300,56,8); ctx.fill();
  ctx.fillStyle=`rgba(180,50,255,${pulse})`;
  ctx.font='bold 16px Orbitron,sans-serif'; ctx.textAlign='center';
  ctx.fillText('☣ FULLY INFECTED', canvas.width/2, canvas.height/2-76);
  ctx.fillStyle='#fff'; ctx.font='13px Rajdhani,sans-serif';
  ctx.fillText('Get the CURE from the shop! '+t+'s', canvas.width/2, canvas.height/2-56);
}

function drawQuickUseHUD() {
  if (!G.player || !G.running) return;
  const inv = G.player.inventory;
  const items = [
    { key:'G', icon:'💥', count:inv.grenade||0,  label:'Grenade' },
    { key:'H', icon:'💣', count:inv.mine||0,     label:'Mine'    },
    { key:'T', icon:'🍾', count:inv.molotov||0,  label:'Molotov' },
    { key:'Y', icon:'✈',  count:inv.airstrike||0,label:'Strike'  },
    { key:'B', icon:'🧱', count:inv.barricade||0, label:'Barricade'},
    { key:'U', icon:'🗼', count:inv.turret||0,   label:'Turret'  },
    { key:'V', icon:'⚔',  count:-1,              label:'Melee'   },
  ];
  const slotW = 44, slotH = 44, gap = 4;
  const total = items.length;
  const startX = canvas.width - (slotW+gap)*total - 10;
  const startY = canvas.height - 160;

  items.forEach((item, i) => {
    const x = startX + i*(slotW+gap);
    const y = startY;
    const hasItem = item.count !== 0;

    ctx.globalAlpha = hasItem ? 0.92 : 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(x,y,slotW,slotH,6); ctx.fill();
    ctx.strokeStyle = hasItem ? 'rgba(241,196,15,0.5)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x,y,slotW,slotH,6); ctx.stroke();

    // Icon
    ctx.font = '18px serif'; ctx.textAlign = 'center';
    ctx.fillText(item.icon, x+slotW/2, y+22);

    // Count badge
    if (item.count > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 10px Orbitron,sans-serif';
      ctx.fillText(item.count, x+slotW-8, y+12);
    }

    // Key label
    ctx.fillStyle = hasItem ? '#f1c40f' : '#555';
    ctx.font = 'bold 9px Orbitron,sans-serif';
    ctx.fillText('['+item.key+']', x+slotW/2, y+slotH-4);
  });
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════
//  HUD UPDATE
// ═══════════════════════════════════════════════════════════════
function updateHUD() {
  const p=G.player;
  document.getElementById('health-fill').style.width=(p.hp/p.maxHp*100)+'%';
  document.getElementById('health-text').textContent=Math.ceil(p.hp)+'/'+p.maxHp;
  document.getElementById('infection-fill').style.width=p.infection+'%';
  document.getElementById('infection-text').textContent=Math.floor(p.infection)+'%';
  const stam = document.getElementById('stamina-fill');
  if (stam) {
    const s = G.player.stamina||100;
    stam.style.width=s+'%';
    stam.style.background=G.player.sprinting?'linear-gradient(90deg,#e74c3c,#f39c12)':'linear-gradient(90deg,#e67e22,#f39c12)';
    const st = document.getElementById('stamina-text');
    if (st) st.textContent = G.player.sprinting ? 'SPRINT' : Math.floor(s)+'%';
  }
  document.getElementById('base-fill').style.width=(G.base.hp/G.base.maxHp*100)+'%';
  document.getElementById('base-text').textContent=Math.ceil(G.base.hp);
  document.getElementById('money-text').textContent=G.money;
  document.getElementById('kills-text').textContent=G.totalKills;
  // Medkit count
  const mkEl = document.getElementById('medkit-count');
  if (mkEl) mkEl.textContent = G.player.inventory.medkit||0;

  // Battery bar
  const bat = G.flashlightBattery||0;
  const batFill = document.getElementById('battery-bar-fill');
  if (batFill) {
    batFill.style.width = bat+'%';
    batFill.style.background = bat>50 ? 'linear-gradient(90deg,#2ecc71,#f1c40f)'
      : bat>20 ? '#f39c12' : '#e74c3c';
  }

  const slot=G.player.slots[G.player.selectedSlot];
  if (slot) {
    const wDef=WEAPONS[slot.weapon];
    document.getElementById('ammo-cur').textContent=slot.reloading?'...':slot.ammo;
    document.getElementById('ammo-max').textContent=wDef.maxAmmo;
    document.getElementById('ammo-sep').textContent='/';
    document.getElementById('ammo-reserve').textContent=(slot.reserve||0);
    document.getElementById('gun-name-hud').textContent=slot.reloading?'RELOADING':wDef.name;
  } else {
    document.getElementById('ammo-cur').textContent='-';
    document.getElementById('ammo-max').textContent='-';
    document.getElementById('ammo-sep').textContent='/';
    document.getElementById('ammo-reserve').textContent='';
    document.getElementById('gun-name-hud').textContent='No weapon';
  }

  // ── Inventory bar ──
  const invItems = ['grenade','mine','barricade','sentry','turret','medkit','molotov','c4'];
  invItems.forEach(key => {
    const cnt = G.player.inventory[key]||0;
    const countEl = document.getElementById('inv-count-'+key);
    const slotEl  = document.getElementById('inv-'+key);
    if (countEl) { countEl.textContent=cnt; countEl.className='inv-count'+(cnt===0?' zero':''); }
    if (slotEl)  { slotEl.classList.toggle('has-items', cnt>0); }
  });
}

function updateToolbar() {
  const now = performance.now();
  G.player.slots.forEach((slot,i) => {
    const el=document.getElementById('slot-'+i);
    const gc=document.getElementById('gc-'+i);
    if (!el||!gc) return;
    const gctx=gc.getContext('2d');
    gctx.clearRect(0,0,48,28);

    // Remove old reload bar
    let rb = el.querySelector('.slot-reload-bar');

    if (slot) {
      const wDef=WEAPONS[slot.weapon];
      wDef.draw(gctx,48,28);
      el.querySelector('.slot-name').textContent=wDef.name;

      // Reload progress bar
      if (slot.reloading) {
        const pct = Math.min(1, (now - slot.reloadStart) / (wDef.reloadTime * (G.player.reloadMult||1)));
        if (!rb) { rb=document.createElement('div'); rb.className='slot-reload-bar'; el.appendChild(rb); }
        rb.style.width = (pct*100)+'%';
      } else {
        if (rb) rb.remove();
      }
    } else {
      el.querySelector('.slot-name').textContent='Empty';
      gctx.strokeStyle='rgba(255,255,255,0.15)'; gctx.lineWidth=1;
      gctx.strokeRect(4,4,40,20);
      if (rb) rb.remove();
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  GAME OVER
// ═══════════════════════════════════════════════════════════════
function triggerGameOver(reason) {
  if (G.gameOver) return;
  G.gameOver=true; G.running=false;
  // Stop all ambient loops
  ['day_amb','night_amb','campfire','rain_loop','flame_loop','zombie_loop'].forEach(k=>stopLoop(k,0));

  // Award perk coins based on wave reached
  const coinsEarned = Math.floor(G.wave * 2 + G.totalKills * 0.1);
  SAVE.perkCoins = (SAVE.perkCoins||0) + coinsEarned;
  writeSave(SAVE);
  clearGameState(); // remove autosave on death
  document.getElementById('mm-coins').textContent=SAVE.perkCoins;
  document.getElementById('mm-continue').style.display = 'none'; // no save to continue
  document.getElementById('perks-coins').textContent=SAVE.perkCoins;

  const titles={player:'YOU DIED',base:'BASE DESTROYED',infection:'INFECTED'};
  const subs={player:'The horde overwhelmed you.',base:'Your base was destroyed.',infection:'The infection consumed you.'};
  document.getElementById('go-title').textContent=titles[reason]||'GAME OVER';
  document.getElementById('go-sub').textContent=subs[reason]||'';
  document.getElementById('go-stats').innerHTML=`
    Waves Survived: <b>${G.wave-1}</b><br>
    Zombies Killed: <b>${G.totalKills}</b><br>
    Money Earned: <b>$${G.earnedMoney}</b>
  `;
  document.getElementById('go-perk-coins').textContent=coinsEarned;
  document.getElementById('game-over').classList.remove('hidden');

  const zb=document.getElementById('zombie-count-badge');
  if (zb) zb.style.display='none';
}

// ═══════════════════════════════════════════════════════════════
//  PERKS SCREEN
// ═══════════════════════════════════════════════════════════════
//  SKILL TREE RENDERER
// ═══════════════════════════════════════════════════════════════
//  SKILL TREE RENDERER  (big, draggable, canvas-based)
// ═══════════════════════════════════════════════════════════════
const ST = {
  NW: 100,   // node width
  NH: 80,    // node height
  COL: 130,  // column spacing
  ROW: 125,  // row spacing
  PAD: 60,   // outer padding
  HEADER: 48,// space above row 0 for branch labels
};

let stTooltip = null;
let stDrag = { active:false, startX:0, startY:0, scrollX:0, scrollY:0 };
let _stBaseCanvas = null; // cached static background
let _stBaseDirty = true;  // needs redraw
let _stRafPending = false; // throttle with rAF

function renderSkillTree() {
  if (_stRafPending) return;
  _stRafPending = true;
  requestAnimationFrame(_doRenderSkillTree);
}

function _doRenderSkillTree() {
  _stRafPending = false;
  const stc = document.getElementById('skill-tree-canvas');
  if (!stc) return;
  const sc = stc.getContext('2d');

  const maxX = Math.max(...SKILL_TREE.map(n=>n.x));
  const maxY = Math.max(...SKILL_TREE.map(n=>n.y));
  const W = (maxX+1)*ST.COL + ST.PAD*2 + ST.NW;
  const H = (maxY+1)*ST.ROW + ST.PAD*2 + ST.NH + ST.HEADER;

  // Rebuild base canvas if dirty or size changed
  if (_stBaseDirty || !_stBaseCanvas || _stBaseCanvas.width!==W || _stBaseCanvas.height!==H) {
    _stBaseCanvas = document.createElement('canvas');
    _stBaseCanvas.width = W; _stBaseCanvas.height = H;
    _drawSkillTreeBase(_stBaseCanvas.getContext('2d'), W, H);
    _stBaseDirty = false;
  }

  stc.width = W; stc.height = H;
  // Blit cached base
  sc.drawImage(_stBaseCanvas, 0, 0);

  // Draw tooltip on top (cheap)
  if (stTooltip) _drawSkillTreeTooltip(sc, W, H);
}

function _drawSkillTreeBase(sc, W, H) {

  // Subtle grid
  sc.strokeStyle = 'rgba(255,255,255,0.025)';
  sc.lineWidth = 1;
  for(let gx=0;gx<W;gx+=60){sc.beginPath();sc.moveTo(gx,0);sc.lineTo(gx,H);sc.stroke();}
  for(let gy=0;gy<H;gy+=60){sc.beginPath();sc.moveTo(0,gy);sc.lineTo(W,gy);sc.stroke();}

  // ── Branch column backgrounds ──
  const branches = [
    { name:'⚔  COMBAT',   cols:[0,1,2],   color:'#e74c3c' },
    { name:'💚 SURVIVAL',  cols:[2,3,4],   color:'#2ecc71' },
    { name:'🔧 TECH',      cols:[5,6,7],   color:'#3498db' },
    { name:'💜 SHADOW',    cols:[7,8],     color:'#9b59b6' },
  ];
  branches.forEach(b => {
    const x1 = ST.PAD + Math.min(...b.cols)*ST.COL - 10;
    const x2 = ST.PAD + Math.max(...b.cols)*ST.COL + ST.NW + 10;
    sc.fillStyle = b.color+'0d';
    sc.fillRect(x1, 0, x2-x1, H);
    // Header bar
    sc.fillStyle = b.color+'22';
    sc.fillRect(x1, 0, x2-x1, ST.HEADER);
    sc.strokeStyle = b.color+'44';
    sc.lineWidth = 1;
    sc.strokeRect(x1+0.5, 0.5, x2-x1-1, ST.HEADER-1);
    // Label
    sc.fillStyle = b.color;
    sc.font = 'bold 16px Orbitron,sans-serif';
    sc.textAlign = 'center';
    sc.fillText(b.name, (x1+x2)/2, ST.HEADER/2+6);
  });

  // ── Connections ──
  SKILL_TREE.forEach(node => {
    if (!node.requires) return;
    const parent = SKILL_MAP[node.requires];
    if (!parent) return;
    const px2 = ST.PAD + parent.x*ST.COL + ST.NW/2;
    const py2 = ST.HEADER + ST.PAD + parent.y*ST.ROW + ST.NH/2;
    const nx2 = ST.PAD + node.x*ST.COL + ST.NW/2;
    const ny2 = ST.HEADER + ST.PAD + node.y*ST.ROW + ST.NH/2;
    const parentLvl = getPerkLevel(parent.id);
    const col = node.color||'#555';
    const midY = (py2+ny2)/2;

    // Glow line for unlocked connections
    if (parentLvl > 0) {
      sc.strokeStyle = col+'44';
      sc.lineWidth = 6;
      sc.setLineDash([]);
      sc.shadowColor = col;
      sc.shadowBlur = 8;
      sc.beginPath();
      sc.moveTo(px2, py2);
      sc.bezierCurveTo(px2, midY, nx2, midY, nx2, ny2);
      sc.stroke();
      sc.shadowBlur = 0;
    }

    sc.strokeStyle = parentLvl > 0 ? col+'cc' : '#1e2030';
    sc.lineWidth = parentLvl > 0 ? 2.5 : 1.5;
    sc.setLineDash(parentLvl > 0 ? [] : [5,5]);
    sc.beginPath();
    sc.moveTo(px2, py2);
    sc.bezierCurveTo(px2, midY, nx2, midY, nx2, ny2);
    sc.stroke();
    sc.setLineDash([]);

    // Arrow at end
    if (parentLvl > 0) {
      const angle = Math.atan2(ny2-midY, nx2-px2);
      sc.fillStyle = col+'dd';
      sc.shadowColor = col; sc.shadowBlur = 6;
      sc.beginPath();
      sc.moveTo(nx2, ny2);
      sc.lineTo(nx2-10*Math.cos(angle-0.4), ny2-10*Math.sin(angle-0.4));
      sc.lineTo(nx2-10*Math.cos(angle+0.4), ny2-10*Math.sin(angle+0.4));
      sc.closePath(); sc.fill();
      sc.shadowBlur = 0;
    }
  });

  // ── Nodes ──
  SKILL_TREE.forEach(node => {
    const nx2 = ST.PAD + node.x*ST.COL;
    const ny2 = ST.HEADER + ST.PAD + node.y*ST.ROW;
    const lvl = getPerkLevel(node.id);
    const maxed = lvl >= node.maxLevel;
    const unlocked = isPerkUnlocked(node);
    const cost = getPerkCost(node);
    const canAfford = SAVE.perkCoins >= cost;
    const col = node.color || '#555';
    const isHovered = stTooltip === node;

    sc.globalAlpha = unlocked ? 1 : 0.35;

    // Outer glow for maxed/hovered nodes
    if (maxed || isHovered) {
      sc.shadowColor = col;
      sc.shadowBlur = maxed ? 28 : 18;
      sc.shadowOffsetY = 0;
    } else {
      sc.shadowColor = 'rgba(0,0,0,0.6)';
      sc.shadowBlur = 10;
      sc.shadowOffsetY = 4;
    }

    // Node body — richer gradient
    const grad = sc.createLinearGradient(nx2, ny2, nx2, ny2+ST.NH);
    if (maxed) {
      grad.addColorStop(0, col+'66'); grad.addColorStop(0.5, col+'33'); grad.addColorStop(1, col+'18');
    } else if (unlocked) {
      grad.addColorStop(0, '#1a2040'); grad.addColorStop(1, '#0e1428');
    } else {
      grad.addColorStop(0, '#0c0e16'); grad.addColorStop(1, '#080a10');
    }
    sc.fillStyle = grad;
    sc.strokeStyle = maxed ? col : unlocked ? (canAfford ? col+'cc' : col+'44') : '#1a1e2a';
    sc.lineWidth = maxed ? 2.5 : isHovered ? 2 : 1.5;
    sc.beginPath(); sc.roundRect(nx2, ny2, ST.NW, ST.NH, 14); sc.fill(); sc.stroke();
    sc.shadowBlur = 0; sc.shadowOffsetY = 0;

    // Top color bar — thicker and glowing for maxed
    if (maxed) {
      sc.shadowColor = col; sc.shadowBlur = 12;
    }
    sc.fillStyle = maxed ? col : unlocked ? col+'77' : '#1a1e2a';
    sc.beginPath(); sc.roundRect(nx2, ny2, ST.NW, maxed ? 8 : 5, [14,14,0,0]); sc.fill();
    sc.shadowBlur = 0;

    // Inner highlight stripe
    sc.fillStyle = 'rgba(255,255,255,0.04)';
    sc.beginPath(); sc.roundRect(nx2+4, ny2+8, ST.NW-8, 18, 4); sc.fill();

    // Icon
    sc.font = '32px serif';
    sc.textAlign = 'center';
    sc.fillText(node.icon, nx2+ST.NW/2, ny2+48);

    // Name
    sc.font = 'bold 11px Rajdhani,sans-serif';
    sc.fillStyle = maxed ? col : unlocked ? '#dde' : '#444';
    sc.fillText(node.name, nx2+ST.NW/2, ny2+65);

    // Level dots — glowing when filled
    const dotR = 4.5, dotGap = 12;
    const totalDots = node.maxLevel;
    const dotsStartX = nx2 + ST.NW/2 - (totalDots-1)*dotGap/2;
    for (let d=0; d<totalDots; d++) {
      if (d < lvl) { sc.shadowColor = col; sc.shadowBlur = 8; }
      sc.fillStyle = d < lvl ? col : '#141824';
      sc.strokeStyle = d < lvl ? col+'aa' : '#252535';
      sc.lineWidth = 1;
      sc.beginPath(); sc.arc(dotsStartX+d*dotGap, ny2+79, dotR, 0, Math.PI*2);
      sc.fill(); sc.stroke();
      sc.shadowBlur = 0;
    }

    // Cost / MAX badge
    if (!maxed && unlocked) {
      sc.fillStyle = canAfford ? 'rgba(241,196,15,0.12)' : 'rgba(80,80,80,0.1)';
      sc.beginPath(); sc.roundRect(nx2+6, ny2+ST.NH-22, ST.NW-12, 16, 5); sc.fill();
      sc.font = 'bold 10px Orbitron,sans-serif';
      sc.fillStyle = canAfford ? '#f1c40f' : '#444';
      if (canAfford) { sc.shadowColor='#f1c40f'; sc.shadowBlur=6; }
      sc.fillText('🪙 '+cost, nx2+ST.NW/2, ny2+ST.NH-10);
      sc.shadowBlur = 0;
    } else if (maxed) {
      sc.fillStyle = col+'44';
      sc.beginPath(); sc.roundRect(nx2+6, ny2+ST.NH-22, ST.NW-12, 16, 5); sc.fill();
      sc.font = 'bold 10px Orbitron,sans-serif';
      sc.fillStyle = col;
      sc.shadowColor = col; sc.shadowBlur = 8;
      sc.fillText('✓ MAXED', nx2+ST.NW/2, ny2+ST.NH-10);
      sc.shadowBlur = 0;
    } else {
      sc.font = '12px serif';
      sc.fillStyle = '#333';
      sc.fillText('🔒', nx2+ST.NW/2, ny2+ST.NH-10);
    }

    sc.globalAlpha = 1;
  });
} // end _drawSkillTreeBase

function _drawSkillTreeTooltip(sc, W, H) {
  const node = stTooltip;
  if (!node) return;
  const lvl = getPerkLevel(node.id);
  const nx2 = ST.PAD + node.x*ST.COL;
  const ny2 = ST.HEADER + ST.PAD + node.y*ST.ROW;
  const ttW = 220, ttH = 110;
  let ttX = nx2 + ST.NW + 12;
  let ttY = ny2;
  if (ttX + ttW > W - 10) ttX = nx2 - ttW - 12;
  if (ttY + ttH > H - 10) ttY = H - ttH - 10;

  sc.fillStyle = 'rgba(7,9,15,0.97)';
  sc.strokeStyle = node.color||'#555';
  sc.lineWidth = 2;
  sc.shadowColor = node.color||'#555'; sc.shadowBlur = 12;
  sc.beginPath(); sc.roundRect(ttX, ttY, ttW, ttH, 10); sc.fill(); sc.stroke();
  sc.shadowBlur = 0;

  sc.fillStyle = node.color||'#fff';
  sc.font = 'bold 14px Rajdhani,sans-serif'; sc.textAlign = 'left';
  sc.fillText(node.icon+' '+node.name, ttX+12, ttY+22);

  sc.fillStyle = '#aaa'; sc.font = '11px Rajdhani,sans-serif';
  const words = node.desc.split(' '); let line='', ly=ttY+40;
  words.forEach(w => {
    const test = line+w+' ';
    if (sc.measureText(test).width > ttW-24) { sc.fillText(line.trim(), ttX+12, ly); line=w+' '; ly+=16; }
    else line=test;
  });
  sc.fillText(line.trim(), ttX+12, ly);

  sc.fillStyle='#555'; sc.font='10px Orbitron,sans-serif';
  const unlocked = isPerkUnlocked(node);
  const status = lvl>=node.maxLevel ? 'MAXED' : !unlocked ? 'LOCKED — buy parent first' : `Lv ${lvl}/${node.maxLevel} · 🪙${getPerkCost(node)}`;
  sc.fillText(status, ttX+12, ttY+ttH-10);
}

function showPerks() {
  document.getElementById('perks-coins').textContent = SAVE.perkCoins;
  document.getElementById('perks-screen').classList.remove('hidden');
  _stBaseDirty = true; // force full redraw when opening
  const container = document.getElementById('perks-tree-container');
  const maxX = Math.max(...SKILL_TREE.map(n=>n.x));
  const rootNode = SKILL_TREE.find(n=>n.id==='root');
  if (rootNode) {
    const rootPx = ST.PAD + rootNode.x * ST.COL + ST.NW/2;
    container.scrollLeft = rootPx - container.clientWidth/2;
    container.scrollTop = 0;
  }
  renderSkillTree();
}

// ── Drag to pan ──
(function() {
  const stc = document.getElementById('skill-tree-canvas');
  const container = document.getElementById('perks-tree-container');
  let dragging=false, startX=0, startY=0, scrollX=0, scrollY=0;

  stc.addEventListener('mousedown', e => {
    dragging=true; startX=e.clientX; startY=e.clientY;
    scrollX=container.scrollLeft; scrollY=container.scrollTop;
    stc.style.cursor='grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    container.scrollLeft = scrollX - (e.clientX-startX);
    container.scrollTop  = scrollY - (e.clientY-startY);
  });
  window.addEventListener('mouseup', e => {
    if (!dragging) return;
    const dx=Math.abs(e.clientX-startX), dy=Math.abs(e.clientY-startY);
    dragging=false; stc.style.cursor='grab';
    // Only fire click if barely moved (not a drag)
    if (dx<5 && dy<5) {
      const rect = stc.getBoundingClientRect();
      const mx = e.clientX-rect.left, my = e.clientY-rect.top;
      SKILL_TREE.forEach(node => {
        const nx2=ST.PAD+node.x*ST.COL, ny2=ST.HEADER+ST.PAD+node.y*ST.ROW;
        if (mx>=nx2&&mx<=nx2+ST.NW&&my>=ny2&&my<=ny2+ST.NH) {
          const lvl=getPerkLevel(node.id), cost=getPerkCost(node);
          if (lvl>=node.maxLevel||!isPerkUnlocked(node)||SAVE.perkCoins<cost) {
            stTooltip=node; renderSkillTree(); return;
          }
          SAVE.perkCoins-=cost;
          SAVE.perks[node.id]=(SAVE.perks[node.id]||0)+1;
          writeSave(SAVE);
          document.getElementById('perks-coins').textContent=SAVE.perkCoins;
          document.getElementById('mm-coins').textContent=SAVE.perkCoins;
          _stBaseDirty = true; // node state changed — force full redraw
          stTooltip=node; renderSkillTree();
        }
      });
    }
  });
  stc.addEventListener('mousemove', e => {
    if (dragging) return;
    const rect=stc.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    let found=null;
    SKILL_TREE.forEach(node=>{
      const nx2=ST.PAD+node.x*ST.COL, ny2=ST.HEADER+ST.PAD+node.y*ST.ROW;
      if(mx>=nx2&&mx<=nx2+ST.NW&&my>=ny2&&my<=ny2+ST.NH) found=node;
    });
    if(found!==stTooltip){stTooltip=found; renderSkillTree();}
  });
  stc.style.cursor='grab';
})();

// ═══════════════════════════════════════════════════════════════
//  PAUSE
// ═══════════════════════════════════════════════════════════════
function togglePause() {
  G.paused = !G.paused;
  if (G.paused) {
    playSound('pause_in');
    document.getElementById('pause-menu').classList.remove('hidden');
    document.getElementById('pause-wave-num').textContent = G.wave;
    document.getElementById('pause-phase-label').textContent = G.phase === 'day' ? 'Day Phase' : 'Night Phase';
    document.getElementById('pause-shop').style.display = G.phase === 'day' ? '' : 'none';
  } else {
    playSound('pause_out');
    document.getElementById('pause-menu').classList.add('hidden');
    G.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

document.getElementById('pause-resume').addEventListener('click', () => togglePause());
document.getElementById('pause-shop').addEventListener('click', () => {
  togglePause();
  if (G.phase === 'day') openShop();
});
document.getElementById('pause-perks-btn2').addEventListener('click', () => {
  showPerks();
});
document.getElementById('pause-main-menu').addEventListener('click', () => {
  G.paused = false;
  G.running = false;
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('game-over').classList.add('hidden');
  document.getElementById('shop-overlay').classList.add('hidden');
  document.getElementById('zombie-count-badge').style.display = 'none';
  // Stop all audio
  ['day_amb','night_amb','campfire','rain_loop','flame_loop','zombie_loop'].forEach(k=>stopLoop(k,0));
  // Hide gameplay UI
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('toolbar').classList.add('hidden');
  document.getElementById('inv-bar').classList.add('hidden');
  document.getElementById('side-btns').classList.add('hidden');
  document.getElementById('crosshair').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');
  document.getElementById('mm-coins').textContent = SAVE.perkCoins;
  startLoop('mm_music', 0.35); // restart menu music
});

// ═══════════════════════════════════════════════════════════════
//  MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════════
function gameLoop(ts) {
  if (!G.running || G.paused) return;
  const dt=Math.min(ts-G.lastTime,50);
  G.lastTime=ts;

  try {

  // Update
  if (G.phase==='day') updateDayTimer(dt);
  if (G.phase==='night') updateNightTimer(dt);
  updateFlashlightBattery(dt); // always update (handles NV recharge during day too)
  if (G.player.downed) {
    updateDownedTimer(dt);
    updateCamera();
    // World keeps running while downed — zombies attack fort
    if (G.phase==='night') {
      moveZombies(dt);
      updateMines(dt);
      updateTurrets(dt);
      updateNPCs(dt);
    }
    updateBullets();
    updateProjectiles();
    updateParticles(dt);
    updateFloatingTexts();
    updateWeather(dt);
  } else {
  movePlayer(dt);
  updateCamera();

  if (G.phase==='night') {
    // Auto-fire
    const slot=G.player.slots[G.player.selectedSlot];
    if (slot&&WEAPONS[slot.weapon].auto&&G.mouse.down) shoot();
    else if (slot&&WEAPONS[slot.weapon].flame&&!G.mouse.down) stopLoop('flame_loop', 200);
    moveZombies(dt);
    updateMines(dt);
    updateTurrets(dt);
    updateNPCs(dt);
    updateInfection(dt);
  } else {
    if (G.mouse.down) {
      const slot=G.player.slots[G.player.selectedSlot];
      if (slot&&WEAPONS[slot.weapon].auto) shoot();
    }
  }

  updateBullets();
  updateProjectiles();
  updateParticles(dt);
  updateFloatingTexts();
  updateReload();
  updateWeather(dt);
  // Throttle toolbar update — only every 100ms (it touches DOM every frame otherwise)
  if (!G._toolbarTick) G._toolbarTick = 0;
  G._toolbarTick += dt;
  if (G._toolbarTick >= 100) { G._toolbarTick = 0; updateToolbar(); }
  } // end downed else
  if (!G._ambTick) G._ambTick=0;
  G._ambTick+=dt;
  if (G._ambTick>1000) { G._ambTick=0; updateAmbience(); }
  if (G.player.sprinting !== G._lastSprint) { G._lastSprint=G.player.sprinting; updateHUD(); }
  // Update sky brightness transition (day/night fade over ~2s)
  const skyTarget = G.phase === 'day' ? 1.0 : 0.0;
  if (Math.abs(G.skyBrightness - skyTarget) > 0.005) {
    G.skyBrightness += (skyTarget - G.skyBrightness) * (dt * 0.0015);
  } else {
    G.skyBrightness = skyTarget;
  }
  const _sf = document.getElementById('stamina-fill');
  const _st = document.getElementById('stamina-text');
  if (_sf) {
    const _s = G.player.stamina || 0;
    _sf.style.width = _s + '%';
    _sf.style.background = G.player.sprinting ? 'linear-gradient(90deg,#e74c3c,#f39c12)' : (G.player.sprintExhausted ? '#e74c3c' : 'linear-gradient(90deg,#e67e22,#f39c12)');
    if (_st) _st.textContent = G.player.sprinting ? 'SPRINT' : (G.player.sprintExhausted ? 'TIRED' : Math.floor(_s) + '%');
  }
  const _bf = document.getElementById('battery-bar-fill');
  if (_bf) {
    const _b = G.flashlightBattery || 0;
    _bf.style.width = _b + '%';
    _bf.style.background = _b > 50 ? 'linear-gradient(90deg,#2ecc71,#f1c40f)' : _b > 20 ? '#f39c12' : '#e74c3c';
  }
  // NV battery bar
  const _nvf = document.getElementById('nv-battery-fill');
  const _nvt = document.getElementById('nv-battery-text');
  const _nvd = document.getElementById('nv-battery-display');
  if (_nvf && G.player) {
    if (G.player.hasNightVision) {
      if (_nvd) _nvd.style.display='';
      const nvMax = [100,200,350][Math.min(2,(G.player.nvBatteryLevel||1)-1)];
      const nvPct = Math.max(0, Math.min(100, (G.nvBatteryCurrent/nvMax)*100));
      _nvf.style.width = nvPct+'%';
      _nvf.style.background = nvPct>50?'#00ff88':nvPct>20?'#f39c12':'#e74c3c';
      if (_nvt) _nvt.textContent = G.nightVisionActive ? `👁 ${Math.ceil(G.nvBatteryCurrent)}s` : `⚡ ${Math.ceil(G.nvBatteryCurrent)}s`;
    } else {
      if (_nvd) _nvd.style.display='none';
    }
  }

  // ── Draw ──
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Sky background — lerps through sunset orange into night
  const sb = G.skyBrightness || 0;
  // Day: rgb(26,42,10) → Sunset: rgb(40,18,8) → Night: rgb(5,8,15)
  let skyR, skyG, skyB;
  if (sb > 0.5) {
    // Day → Sunset (sb 1.0 to 0.5)
    const t = (sb - 0.5) * 2; // 1=day, 0=sunset
    skyR = Math.round(40 + (26-40)*t);
    skyG = Math.round(18 + (42-18)*t);
    skyB = Math.round(8  + (10-8)*t);
  } else {
    // Sunset → Night (sb 0.5 to 0.0)
    const t = sb * 2; // 1=sunset, 0=night
    skyR = Math.round(5  + (40-5)*t);
    skyG = Math.round(8  + (18-8)*t);
    skyB = Math.round(15 + (8-15)*t);
  }
  ctx.fillStyle = `rgb(${skyR},${skyG},${skyB})`;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawMap();
  drawStructureLabels();
  drawLootables();
  drawBase();
  drawBarricades();
  drawMines();
  drawTurrets();
  drawNPCs();
  drawZombies();
  drawBullets();
  drawProjectiles();
  drawPlayer();
  drawParticles();
  drawDayAtmosphere(); // always — handles early-night orange too
  // Draw night overlay whenever sky isn't fully bright (handles transition)
  if (G.skyBrightness < 0.99) drawNightOverlay();
  drawRain(); // draw rain AFTER night overlay so it shows as dark streaks at night
  drawLightning();
  drawFloatingTexts();
  drawZombieCount();
  drawDownedOverlay();
  drawDamageFlash();
  drawCampfireCompass();
  drawInfectionWarning();
  drawQuickUseHUD();

  } catch(e) {
    console.error('gameLoop error:', e);
    // Show error on screen so we can debug
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,40);
    ctx.fillStyle='#e74c3c'; ctx.font='12px monospace'; ctx.textAlign='left';
    ctx.fillText('ERR: '+e.message, 8, 26);
  }

  requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
// Add zombie count badge to DOM
const zcb=document.createElement('div');
zcb.id='zombie-count-badge'; document.getElementById('game-container').appendChild(zcb);

// Init save display
document.getElementById('mm-coins').textContent=SAVE.perkCoins;
document.getElementById('perks-coins').textContent=SAVE.perkCoins;
// Show Continue button if a saved game exists
if (hasSavedGame()) document.getElementById('mm-continue').style.display = '';

// Init game state (but don't start loop yet)
initGame();

// ═══════════════════════════════════════════════════════════════
//  MAIN MENU ANIMATED BACKGROUND
// ═══════════════════════════════════════════════════════════════
(function() {
  const mc = document.getElementById('mm-bg-canvas');
  if (!mc) return;
  const mx = mc.getContext('2d');

  function resizeMM() {
    mc.width  = window.innerWidth;
    mc.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeMM);
  resizeMM();

  // Stars
  const stars = Array.from({length:200}, ()=>({
    x: Math.random(), y: Math.random(),
    r: 0.4 + Math.random()*1.4,
    twinkle: Math.random()*Math.PI*2,
    speed: 0.5 + Math.random()*1.5,
  }));

  // Zombie silhouettes walking across
  const zombieSils = Array.from({length:7}, (_, i)=>({
    x: Math.random(),
    y: 0.72 + Math.random()*0.18,
    speed: 0.00008 + Math.random()*0.00012,
    scale: 0.6 + Math.random()*0.7,
    phase: Math.random()*Math.PI*2,
  }));

  // Floating embers
  const embers = Array.from({length:40}, ()=>({
    x: Math.random(), y: 0.5 + Math.random()*0.5,
    vx: (Math.random()-0.5)*0.0003,
    vy: -0.0002 - Math.random()*0.0004,
    life: Math.random(), decay: 0.002+Math.random()*0.003,
    r: 1+Math.random()*2,
  }));

  let mmTime = 0;

  function drawZombieSil(x, y, scale, walk) {
    mx.save();
    mx.translate(x, y);
    mx.scale(scale, scale);
    const bob = Math.sin(walk)*2;
    // Body
    mx.fillStyle = 'rgba(0,0,0,0.7)';
    mx.fillRect(-6, -28+bob, 12, 18);
    // Head
    mx.beginPath(); mx.arc(0, -32+bob, 7, 0, Math.PI*2); mx.fill();
    // Left arm
    mx.save(); mx.translate(-6, -24+bob); mx.rotate(-0.4+Math.sin(walk)*0.5);
    mx.fillRect(-2, 0, 4, 14); mx.restore();
    // Right arm
    mx.save(); mx.translate(6, -24+bob); mx.rotate(0.4-Math.sin(walk)*0.5);
    mx.fillRect(-2, 0, 4, 14); mx.restore();
    // Legs
    mx.save(); mx.translate(-4, -10+bob); mx.rotate(Math.sin(walk)*0.4);
    mx.fillRect(-2, 0, 4, 16); mx.restore();
    mx.save(); mx.translate(4, -10+bob); mx.rotate(-Math.sin(walk)*0.4);
    mx.fillRect(-2, 0, 4, 16); mx.restore();
    mx.restore();
  }

  function mmLoop(ts) {
    if (document.getElementById('main-menu').classList.contains('hidden')) return;
    mmTime = ts * 0.001;
    const W = mc.width, H = mc.height;

    // Sky gradient
    const sky = mx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,   '#020408');
    sky.addColorStop(0.5, '#050d18');
    sky.addColorStop(0.75,'#0a1520');
    sky.addColorStop(1,   '#1a0a05');
    mx.fillStyle = sky; mx.fillRect(0,0,W,H);

    // Moon
    const moonX = W*0.75, moonY = H*0.18;
    const moonGlow = mx.createRadialGradient(moonX,moonY,0, moonX,moonY,120);
    moonGlow.addColorStop(0,   'rgba(200,220,255,0.12)');
    moonGlow.addColorStop(0.4, 'rgba(150,180,255,0.06)');
    moonGlow.addColorStop(1,   'rgba(100,140,255,0)');
    mx.fillStyle = moonGlow; mx.fillRect(0,0,W,H);
    mx.fillStyle = '#d0deff';
    mx.beginPath(); mx.arc(moonX, moonY, 38, 0, Math.PI*2); mx.fill();
    // Moon craters
    mx.fillStyle = 'rgba(0,0,0,0.08)';
    mx.beginPath(); mx.arc(moonX-10, moonY-8, 8, 0, Math.PI*2); mx.fill();
    mx.beginPath(); mx.arc(moonX+14, moonY+10, 5, 0, Math.PI*2); mx.fill();
    mx.beginPath(); mx.arc(moonX+4, moonY-16, 4, 0, Math.PI*2); mx.fill();

    // Stars
    stars.forEach(s => {
      s.twinkle += 0.02 * s.speed;
      const alpha = 0.4 + Math.sin(s.twinkle)*0.5;
      mx.fillStyle = `rgba(200,220,255,${alpha.toFixed(2)})`;
      mx.beginPath(); mx.arc(s.x*W, s.y*H*0.7, s.r, 0, Math.PI*2); mx.fill();
    });

    // Distant city silhouette
    mx.fillStyle = 'rgba(5,10,20,0.9)';
    const bldgs = [
      [0.05,0.62,0.06,0.15],[0.12,0.58,0.04,0.19],[0.18,0.65,0.05,0.12],
      [0.25,0.55,0.07,0.22],[0.33,0.60,0.04,0.17],[0.38,0.52,0.06,0.25],
      [0.46,0.63,0.05,0.14],[0.53,0.57,0.08,0.20],[0.62,0.60,0.04,0.17],
      [0.68,0.54,0.06,0.23],[0.76,0.62,0.05,0.15],[0.83,0.58,0.07,0.19],
      [0.91,0.64,0.05,0.13],[0.96,0.60,0.04,0.17],
    ];
    bldgs.forEach(([bx,by,bw,bh])=>{
      mx.fillRect(bx*W, by*H, bw*W, bh*H);
    });
    // Windows (some lit orange/yellow)
    bldgs.forEach(([bx,by,bw,bh])=>{
      for(let wy=0;wy<4;wy++) for(let wx2=0;wx2<3;wx2++) {
        if(Math.sin(bx*100+wy*7+wx2*13+mmTime*0.3)>0.2) {
          mx.fillStyle = Math.random()>0.5 ? 'rgba(255,180,60,0.6)' : 'rgba(255,220,100,0.4)';
          mx.fillRect((bx+0.005+wx2*bw*0.3)*W, (by+0.02+wy*bh*0.22)*H, bw*W*0.18, bh*H*0.12);
        }
      }
    });

    // Ground / road
    const ground = mx.createLinearGradient(0,H*0.75,0,H);
    ground.addColorStop(0,'#0d1a0a');
    ground.addColorStop(1,'#050a04');
    mx.fillStyle=ground; mx.fillRect(0,H*0.75,W,H*0.25);

    // Road
    mx.fillStyle='rgba(20,20,20,0.8)';
    mx.fillRect(0,H*0.82,W,H*0.1);
    mx.fillStyle='rgba(60,60,60,0.4)';
    mx.fillRect(0,H*0.82,W,2);
    mx.fillRect(0,H*0.92,W,2);
    // Dashes
    mx.fillStyle='rgba(255,200,0,0.25)';
    for(let d=0;d<W;d+=80) {
      const dashX = (d - (mmTime*60)%80);
      mx.fillRect(dashX, H*0.87-1, 40, 3);
    }

    // Embers
    embers.forEach(e => {
      e.x += e.vx; e.y += e.vy;
      e.life -= e.decay;
      if (e.life<=0||e.y<0) {
        e.x=Math.random(); e.y=0.7+Math.random()*0.3;
        e.life=0.6+Math.random()*0.4;
      }
      mx.globalAlpha = e.life*0.8;
      mx.fillStyle = `hsl(${20+Math.random()*30},100%,${50+Math.random()*30}%)`;
      mx.beginPath(); mx.arc(e.x*W, e.y*H, e.r, 0, Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1;

    // Zombie silhouettes
    zombieSils.forEach(z => {
      z.x += z.speed;
      if (z.x > 1.1) z.x = -0.1;
      const walk = mmTime * 3 + z.phase;
      drawZombieSil(z.x*W, z.y*H, z.scale, walk);
    });

    // Fog at ground level
    const fog = mx.createLinearGradient(0,H*0.78,0,H*0.88);
    fog.addColorStop(0,'rgba(20,30,15,0)');
    fog.addColorStop(0.5,'rgba(20,30,15,0.35)');
    fog.addColorStop(1,'rgba(20,30,15,0)');
    mx.fillStyle=fog; mx.fillRect(0,H*0.78,W,H*0.1);

    requestAnimationFrame(mmLoop);
  }

  requestAnimationFrame(mmLoop);
  // Start main menu music only while main menu is visible
  function tryStartMMMusic() {
    if (!document.getElementById('main-menu').classList.contains('hidden')) {
      startLoop('mm_music', 0.35);
    }
  }
  document.addEventListener('click', tryStartMMMusic, { once:true });
  document.addEventListener('keydown', tryStartMMMusic, { once:true });
})();
