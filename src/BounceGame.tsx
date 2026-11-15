import { type FC, useEffect, useRef, useState, useCallback } from 'react';
import {
  Trophy,
  Users,
  User,
  Flame,
  HelpCircle,
  RotateCcw,
  Award,
  X,
  Trash2,
  Medal,
  Volume2,
  VolumeX,
  Pause,
  Play,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';

/* =========================================================================
   1. TYPES & INTERFACES
   ========================================================================= */

export type GameMode = '1P' | '2P';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'victory';
export type PlatformType = 'normal' | 'crumbling' | 'bouncy' | 'moving' | 'hazard';

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  color?: string;
  steppedOn?: boolean;
  decayTime?: number;
  maxDecayTime?: number;
  broken?: boolean;
  shakeOffset?: number;
  vx?: number;
  minX?: number;
  maxX?: number;
  springCompress?: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'gem' | 'boost';
  collected: boolean;
  value: number;
  floatOffset?: number;
}

export interface HazardObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'drone';
  vx?: number;
  minX?: number;
  maxX?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape?: 'circle' | 'square';
}

export interface Player {
  id: 'p1' | 'p2';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  isAlive: boolean;
  facing: 'left' | 'right';
  jumpHold: boolean;
  color: string;
  accentColor: string;
  highestY: number;
  score: number;
  bounces: number;
  squashX: number;
  squashY: number;
  jumpCount: number;
  canDoubleJump: boolean;
  lives: number;
  maxLives: number;
  invulnerableTime: number;
  deathReason?: string;
}

export interface KeyState {
  p1Left: boolean;
  p1Right: boolean;
  p1Up: boolean;
  p1Down: boolean;
  p2Left: boolean;
  p2Right: boolean;
  p2Up: boolean;
  p2Down: boolean;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  player2Name?: string;
  mode: GameMode;
  heightMeters: number;
  score: number;
  date: string;
  isWin: boolean;
}

export interface AltitudeZone {
  minMeter: number;
  maxMeter: number;
  name: string;
  bgColorTop: string;
  bgColorBottom: string;
  gridColor: string;
  hazardSpeed: number;
  crumbRatio: number;
  bouncePadRatio: number;
  movingRatio: number;
}

/* =========================================================================
   2. CONSTANTS & THEMES
   ========================================================================= */

const VIRTUAL_WIDTH = 640;
const VIRTUAL_HEIGHT = 900;

const COLORS = {
  bgBase: '#0B0D10',
  cardBg: '#151921',
  cardBorder: '#232936',
  textMuted: '#8E9AA8',
  primaryAmber: '#FFB800',
  p1Mint: '#00F5A0',
  p1MintDark: '#00A86B',
  p2Coral: '#FF4D6D',
  p2CoralDark: '#C9184A',
  platformNormal: '#3B82F6',
  platformCrumble: '#F59E0B',
  platformCrumbleCritical: '#EF4444',
  platformBouncy: '#10B981',
  platformMoving: '#8B5CF6',
  platformHazard: '#EC4899',
  hazardLava: '#FF3366',
  hazardGlow: '#FF9900',
  gemColor: '#FBBF24',
  boostColor: '#38BDF8',
};

const PHYSICS = {
  gravity: 0.52,
  moveSpeed: 4.8,
  airFriction: 0.88,
  groundFriction: 0.78,
  jumpForce: -13.0,
  doubleJumpForce: -11.0,
  bouncePadForce: -19.5,
  headBounceForce: -15.0,
  headBouncedVictimSquash: 8,
  maxFallSpeed: 16.0,
  platformWidthMin: 90,
  platformWidthMax: 140,
  platformHeight: 16,
  crumbleDelay: 0.9,
  cameraFollowThresholdY: 420,
  pixelsPerMeter: 30,
  summitHeightMeters: 300,
};

const ALTITUDE_ZONES: AltitudeZone[] = [
  {
    minMeter: 0,
    maxMeter: 50,
    name: 'Zone 1: Ground Courtyard',
    bgColorTop: '#101726',
    bgColorBottom: '#0B0D10',
    gridColor: 'rgba(59, 130, 246, 0.08)',
    hazardSpeed: 0.85,
    crumbRatio: 0.20,
    bouncePadRatio: 0.25,
    movingRatio: 0.15,
  },
  {
    minMeter: 50,
    maxMeter: 120,
    name: 'Zone 2: Industrial Rooftops',
    bgColorTop: '#1B1429',
    bgColorBottom: '#101726',
    gridColor: 'rgba(139, 92, 246, 0.08)',
    hazardSpeed: 1.15,
    crumbRatio: 0.35,
    bouncePadRatio: 0.20,
    movingRatio: 0.30,
  },
  {
    minMeter: 120,
    maxMeter: 200,
    name: 'Zone 3: Thunder Storm',
    bgColorTop: '#0D2030',
    bgColorBottom: '#1B1429',
    gridColor: 'rgba(56, 189, 248, 0.08)',
    hazardSpeed: 1.45,
    crumbRatio: 0.50,
    bouncePadRatio: 0.20,
    movingRatio: 0.40,
  },
  {
    minMeter: 200,
    maxMeter: 300,
    name: 'Zone 4: Stratosphere Apex',
    bgColorTop: '#060B19',
    bgColorBottom: '#0D2030',
    gridColor: 'rgba(255, 184, 0, 0.1)',
    hazardSpeed: 1.75,
    crumbRatio: 0.65,
    bouncePadRatio: 0.25,
    movingRatio: 0.50,
  },
  {
    minMeter: 300,
    maxMeter: 9999,
    name: 'Zone 5: Deep Space Summit',
    bgColorTop: '#030308',
    bgColorBottom: '#060B19',
    gridColor: 'rgba(236, 72, 153, 0.12)',
    hazardSpeed: 2.10,
    crumbRatio: 0.75,
    bouncePadRatio: 0.30,
    movingRatio: 0.55,
  },
];

/* =========================================================================
   3. WEB AUDIO SYNTHESIZER (ZERO ASSET DEPENDENCIES)
   ========================================================================= */

class SoundController {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  public playJump(pitch = 1.0) {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(560 * pitch, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  public playSuperBounce() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playHeadBounce() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(700, now + 0.08);
      osc.frequency.linearRampToValueAtTime(500, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playCrumble() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  public playShatter() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  public playCollect() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playGameOver() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(293.66, now + 0.15);
      osc.frequency.setValueAtTime(261.63, now + 0.3);
      osc.frequency.linearRampToValueAtTime(164.81, now + 0.6);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } catch {}
  }

  public playVictory() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch {}
  }
}

const sound = new SoundController();

/* =========================================================================
   4. LOCAL STORAGE LEADERBOARD
   ========================================================================= */

const LEADERBOARD_KEY = 'bounce_back_leaderboard_v1';

function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return getDefaultLeaderboard();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultLeaderboard();
  } catch {
    return getDefaultLeaderboard();
  }
}

function saveLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'date'>): LeaderboardEntry[] {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
  const updated = [...current, newEntry]
    .sort((a, b) => b.score - a.score || b.heightMeters - a.heightMeters)
    .slice(0, 15);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

function clearLeaderboard(): void {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch {}
}

function getDefaultLeaderboard(): LeaderboardEntry[] {
  return [
    { id: 'def_1', playerName: 'ApexClimber', player2Name: 'BounceKing', mode: '2P', heightMeters: 300, score: 12500, date: 'Preset', isWin: true },
    { id: 'def_2', playerName: 'SkyWalker', mode: '1P', heightMeters: 245, score: 8900, date: 'Preset', isWin: false },
    { id: 'def_3', playerName: 'CloudHopper', mode: '1P', heightMeters: 178, score: 5400, date: 'Preset', isWin: false },
  ];
}

/* =========================================================================
   5. PHYSICS & GAMEPLAY ENGINE
   ========================================================================= */

export interface GameEngineState {
  status: GameStatus;
  mode: GameMode;
  cameraY: number;
  maxCameraY: number;
  highestAltitudeMeter: number;
  players: Player[];
  platforms: Platform[];
  collectibles: Collectible[];
  hazards: HazardObstacle[];
  particles: Particle[];
  hazardLineY: number;
  hazardSpeed: number;
  score: number;
  comboCount: number;
  timeElapsed: number;
  summitReached: boolean;
  activeZoneIndex: number;
  lastPlatformGeneratedY: number;
}

class GameEngine {
  public state: GameEngineState;
  private keyState: KeyState = {
    p1Left: false, p1Right: false, p1Up: false, p1Down: false,
    p2Left: false, p2Right: false, p2Up: false, p2Down: false,
  };
  private nextPlatformId = 1;
  private nextCollectibleId = 1;

  constructor(mode: GameMode = '1P') {
    this.state = this.getInitialState(mode);
  }

  public getInitialState(mode: GameMode): GameEngineState {
    const players: Player[] = [];
    const startGroundY = VIRTUAL_HEIGHT - 60;

    players.push({
      id: 'p1',
      name: 'Player 1',
      x: mode === '2P' ? VIRTUAL_WIDTH * 0.35 : VIRTUAL_WIDTH * 0.5 - 14,
      y: startGroundY - 36,
      width: 28,
      height: 34,
      vx: 0,
      vy: 0,
      isGrounded: true,
      isAlive: true,
      facing: 'right',
      jumpHold: false,
      color: COLORS.p1Mint,
      accentColor: COLORS.p1MintDark,
      highestY: startGroundY - 36,
      score: 0,
      bounces: 0,
      squashX: 1,
      squashY: 1,
      jumpCount: 0,
      canDoubleJump: true,
      lives: 3,
      maxLives: 3,
      invulnerableTime: 0,
    });

    if (mode === '2P') {
      players.push({
        id: 'p2',
        name: 'Player 2',
        x: VIRTUAL_WIDTH * 0.65,
        y: startGroundY - 36,
        width: 28,
        height: 34,
        vx: 0,
        vy: 0,
        isGrounded: true,
        isAlive: true,
        facing: 'left',
        jumpHold: false,
        color: COLORS.p2Coral,
        accentColor: COLORS.p2CoralDark,
        highestY: startGroundY - 36,
        score: 0,
        bounces: 0,
        squashX: 1,
        squashY: 1,
        jumpCount: 0,
        canDoubleJump: true,
        lives: 3,
        maxLives: 3,
        invulnerableTime: 0,
      });
    }

    return {
      status: 'idle',
      mode,
      cameraY: 0,
      maxCameraY: 0,
      highestAltitudeMeter: 0,
      players,
      platforms: [{ id: 'ground', x: 0, y: startGroundY, width: VIRTUAL_WIDTH, height: 70, type: 'normal', color: '#2A3342' }],
      collectibles: [],
      hazards: [],
      particles: [],
      hazardLineY: startGroundY + 120,
      hazardSpeed: 1.0,
      score: 0,
      comboCount: 0,
      timeElapsed: 0,
      summitReached: false,
      activeZoneIndex: 0,
      lastPlatformGeneratedY: startGroundY,
    };
  }

  public reset(mode: GameMode = this.state.mode) {
    this.state = this.getInitialState(mode);
    this.seedInitialPlatforms();
  }

  public start() {
    this.state.status = 'playing';
  }

  public pause() {
    if (this.state.status === 'playing') this.state.status = 'paused';
    else if (this.state.status === 'paused') this.state.status = 'playing';
  }

  public updateKeys(newKeys: Partial<KeyState>) {
    this.keyState = { ...this.keyState, ...newKeys };
  }

  public seedInitialPlatforms() {
    let currentY = VIRTUAL_HEIGHT - 120;
    const targetY = -VIRTUAL_HEIGHT * 2;
    while (currentY > targetY) {
      this.generatePlatformLayer(currentY);
      currentY -= 65 + Math.random() * 45;
    }
    this.state.lastPlatformGeneratedY = currentY;
  }

  private generatePlatformLayer(worldY: number) {
    const altitudeMeters = Math.max(0, Math.floor((VIRTUAL_HEIGHT - worldY) / PHYSICS.pixelsPerMeter));
    const zone = this.getZoneForAltitude(altitudeMeters);
    const count = Math.random() < 0.28 ? 2 : 1;
    const padding = 30;

    for (let i = 0; i < count; i++) {
      let width = PHYSICS.platformWidthMax - Math.min(40, altitudeMeters / 10);
      width = Math.max(PHYSICS.platformWidthMin, width);

      let x = padding + Math.random() * (VIRTUAL_WIDTH - width - padding * 2);
      if (count === 2) {
        const half = (VIRTUAL_WIDTH - padding * 2) / 2;
        x = padding + i * half + Math.random() * (half - width);
      }

      const roll = Math.random();
      let type: PlatformType = 'normal';
      if (roll < zone.crumbRatio) type = 'crumbling';
      else if (roll < zone.crumbRatio + zone.bouncePadRatio) type = 'bouncy';
      else if (roll < zone.crumbRatio + zone.bouncePadRatio + zone.movingRatio) type = 'moving';
      else if (altitudeMeters > 70 && Math.random() < 0.12) type = 'hazard';

      const platform: Platform = {
        id: `plat_${this.nextPlatformId++}`,
        x,
        y: worldY,
        width,
        height: PHYSICS.platformHeight,
        type,
      };

      if (type === 'crumbling') {
        platform.maxDecayTime = Math.max(0.65, PHYSICS.crumbleDelay - altitudeMeters / 600);
        platform.decayTime = platform.maxDecayTime;
        platform.steppedOn = false;
        platform.broken = false;
        platform.shakeOffset = 0;
      } else if (type === 'moving') {
        platform.vx = (0.9 + Math.random() * 1.5) * (Math.random() < 0.5 ? 1 : -1);
        platform.minX = 15;
        platform.maxX = VIRTUAL_WIDTH - width - 15;
      } else if (type === 'bouncy') {
        platform.springCompress = 0;
      }

      this.state.platforms.push(platform);

      if (Math.random() < 0.35 && type !== 'hazard') {
        const isBoost = Math.random() < 0.15;
        this.state.collectibles.push({
          id: `col_${this.nextCollectibleId++}`,
          x: x + width / 2,
          y: worldY - 26,
          radius: 10,
          type: isBoost ? 'boost' : 'gem',
          collected: false,
          value: isBoost ? 250 : 100,
          floatOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    if (altitudeMeters > 40 && Math.random() < 0.22) {
      this.state.hazards.push({
        id: `haz_${worldY}`,
        x: Math.random() * (VIRTUAL_WIDTH - 50),
        y: worldY - 40,
        width: 32,
        height: 24,
        type: 'drone',
        vx: (1.2 + Math.random() * 1.5) * (Math.random() < 0.5 ? 1 : -1),
        minX: 20,
        maxX: VIRTUAL_WIDTH - 52,
      });
    }
  }

  public getZoneForAltitude(meters: number) {
    for (const zone of ALTITUDE_ZONES) {
      if (meters >= zone.minMeter && meters < zone.maxMeter) return zone;
    }
    return ALTITUDE_ZONES[ALTITUDE_ZONES.length - 1];
  }

  public damagePlayer(player: Player, reason: string): boolean {
    if (player.invulnerableTime > 0) return false;
    player.lives -= 1;

    if (player.lives > 0) {
      const safeY = Math.min(this.state.cameraY + VIRTUAL_HEIGHT * 0.42, this.state.hazardLineY - 240);
      player.y = safeY;
      player.x = Math.max(30, Math.min(VIRTUAL_WIDTH - 60, player.x));
      player.vy = PHYSICS.bouncePadForce * 0.88;
      player.isGrounded = false;
      player.jumpCount = 0;
      player.canDoubleJump = true;
      player.invulnerableTime = 2.5;
      player.squashX = 0.8;
      player.squashY = 1.35;
      sound.playSuperBounce();
      this.spawnDebris(player.x + player.width / 2, player.y + player.height / 2, '#FFB800', 16);
      return true;
    }

    player.isAlive = false;
    player.deathReason = reason;
    sound.playGameOver();
    this.spawnDebris(player.x + player.width / 2, player.y + player.height / 2, player.color, 24);
    return true;
  }

  private spawnPuff(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 3 - 1,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        color,
        size: 3 + Math.random() * 3,
        shape: 'circle',
      });
    }
  }

  private spawnDebris(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 7,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        size: 4 + Math.random() * 4,
        shape: 'square',
      });
    }
  }

  public update(deltaSec: number) {
    if (this.state.status !== 'playing') return;
    this.state.timeElapsed += deltaSec;

    const currentMeters = this.state.highestAltitudeMeter;
    const zoneIndex = ALTITUDE_ZONES.findIndex((z) => currentMeters >= z.minMeter && currentMeters < z.maxMeter);
    this.state.activeZoneIndex = zoneIndex !== -1 ? zoneIndex : ALTITUDE_ZONES.length - 1;
    const currentZone = ALTITUDE_ZONES[this.state.activeZoneIndex];

    const altitudeMultiplier = 1 + this.state.highestAltitudeMeter / 60;
    const timeMultiplier = 1 + this.state.timeElapsed / 150;
    const zoneFactor = currentZone.hazardSpeed / 0.85;
    const rawSurgeMultiplier = zoneFactor * altitudeMultiplier * timeMultiplier;
    this.state.hazardSpeed = Number(Math.min(4.0, Math.max(1.0, rawSurgeMultiplier)).toFixed(2));
    this.state.hazardLineY -= this.state.hazardSpeed * 60 * deltaSec;

    for (const plat of this.state.platforms) {
      if (plat.type === 'moving' && plat.vx !== undefined && plat.minX !== undefined && plat.maxX !== undefined) {
        plat.x += plat.vx * (60 * deltaSec);
        if (plat.x < plat.minX) { plat.x = plat.minX; plat.vx = Math.abs(plat.vx); }
        else if (plat.x > plat.maxX) { plat.x = plat.maxX; plat.vx = -Math.abs(plat.vx); }
      }
      if (plat.type === 'bouncy' && plat.springCompress && plat.springCompress > 0) {
        plat.springCompress = Math.max(0, plat.springCompress - 5 * deltaSec);
      }
      if (plat.type === 'crumbling' && plat.steppedOn && !plat.broken && plat.decayTime !== undefined) {
        plat.decayTime -= deltaSec;
        plat.shakeOffset = (Math.random() - 0.5) * (plat.decayTime < 0.4 ? 6 : 2);
        if (plat.decayTime <= 0) {
          plat.broken = true;
          sound.playShatter();
          this.spawnDebris(plat.x + plat.width / 2, plat.y + plat.height / 2, COLORS.platformCrumbleCritical, 12);
        }
      }
    }

    for (const haz of this.state.hazards) {
      if (haz.vx && haz.minX !== undefined && haz.maxX !== undefined) {
        haz.x += haz.vx * (60 * deltaSec);
        if (haz.x < haz.minX) { haz.x = haz.minX; haz.vx = Math.abs(haz.vx); }
        else if (haz.x > haz.maxX) { haz.x = haz.maxX; haz.vx = -Math.abs(haz.vx); }
      }
    }

    for (const col of this.state.collectibles) {
      if (col.floatOffset !== undefined) col.floatOffset += deltaSec * 3;
    }

    let anyPlayerAlive = false;
    let highestPlayerY = Infinity;

    for (const player of this.state.players) {
      if (!player.isAlive) continue;
      anyPlayerAlive = true;

      if (player.invulnerableTime > 0) {
        player.invulnerableTime = Math.max(0, player.invulnerableTime - deltaSec);
      }

      const isP1 = player.id === 'p1';
      const moveLeft = isP1 ? this.keyState.p1Left : this.keyState.p2Left;
      const moveRight = isP1 ? this.keyState.p1Right : this.keyState.p2Right;
      const jumpKey = isP1 ? this.keyState.p1Up : this.keyState.p2Up;

      if (moveLeft && !moveRight) {
        player.vx = -PHYSICS.moveSpeed;
        player.facing = 'left';
      } else if (moveRight && !moveLeft) {
        player.vx = PHYSICS.moveSpeed;
        player.facing = 'right';
      } else {
        player.vx *= player.isGrounded ? PHYSICS.groundFriction : PHYSICS.airFriction;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
      }

      if (jumpKey && !player.jumpHold) {
        player.jumpHold = true;
        if (player.isGrounded) {
          player.vy = PHYSICS.jumpForce;
          player.isGrounded = false;
          player.squashX = 0.75;
          player.squashY = 1.35;
          player.jumpCount = 1;
          sound.playJump(isP1 ? 1.0 : 1.15);
          this.spawnPuff(player.x + player.width / 2, player.y + player.height, player.color);
        } else if (player.canDoubleJump && player.jumpCount < 2) {
          const existingBoost = player.vy < 0 ? player.vy * 0.35 : 0;
          player.vy = PHYSICS.doubleJumpForce + existingBoost;
          player.jumpCount += 1;
          player.squashX = 0.8;
          player.squashY = 1.3;
          sound.playJump(isP1 ? 1.3 : 1.45);
          this.spawnPuff(player.x + player.width / 2, player.y + player.height, COLORS.primaryAmber);
        }
      } else if (!jumpKey) {
        player.jumpHold = false;
        if (player.vy < -4 && player.vy > -12) player.vy *= 0.82;
      }

      player.vy += PHYSICS.gravity;
      if (player.vy > PHYSICS.maxFallSpeed) player.vy = PHYSICS.maxFallSpeed;

      player.x += player.vx;
      player.y += player.vy;

      if (player.x + player.width < 0) player.x = VIRTUAL_WIDTH - 2;
      else if (player.x > VIRTUAL_WIDTH) player.x = -player.width + 2;

      player.squashX += (1 - player.squashX) * 0.15;
      player.squashY += (1 - player.squashY) * 0.15;
      player.isGrounded = false;

      for (const plat of this.state.platforms) {
        if (plat.broken) continue;
        const prevBottom = player.y + player.height - player.vy;
        const currentBottom = player.y + player.height;
        const isHorizontalOverlap = player.x + player.width > plat.x && player.x < plat.x + plat.width;

        if (isHorizontalOverlap && prevBottom <= plat.y + 8 && currentBottom >= plat.y && player.vy >= 0) {
          if (plat.type === 'hazard') {
            this.damagePlayer(player, 'Landed on hazard spikes');
            break;
          }

          player.y = plat.y - player.height;
          player.isGrounded = true;
          player.jumpCount = 0;
          player.squashX = 1.3;
          player.squashY = 0.7;

          if (plat.type === 'bouncy') {
            plat.springCompress = 1.0;
            const boostBonus = jumpKey ? Math.abs(PHYSICS.jumpForce) * 0.45 : 0;
            player.vy = PHYSICS.bouncePadForce - boostBonus;
            player.isGrounded = false;
            player.jumpCount = 0;
            player.canDoubleJump = true;
            player.bounces += 1;
            player.score += boostBonus > 0 ? 120 : 60;
            sound.playSuperBounce();
            this.spawnPuff(player.x + player.width / 2, plat.y, COLORS.platformBouncy);
          } else {
            player.vy = 0;
          }

          if (plat.type === 'crumbling' && !plat.steppedOn) {
            plat.steppedOn = true;
            sound.playCrumble();
          }

          if (plat.type === 'moving' && plat.vx !== undefined) {
            player.x += plat.vx * (60 * deltaSec);
          }
          break;
        }
      }

      if (this.state.mode === '2P') {
        for (const other of this.state.players) {
          if (other.id !== player.id && other.isAlive) {
            const isOverlapX = player.x + player.width > other.x + 4 && player.x < other.x + other.width - 4;
            const playerBottom = player.y + player.height;
            const otherHead = other.y;

            if (isOverlapX && player.vy > 0 && playerBottom >= otherHead && playerBottom <= otherHead + 16) {
              const boostBonus = jumpKey ? Math.abs(PHYSICS.jumpForce) * 0.45 : 0;
              player.vy = PHYSICS.headBounceForce - boostBonus;
              player.jumpCount = 0;
              player.canDoubleJump = true;
              player.squashX = 0.8;
              player.squashY = 1.4;
              other.squashX = 1.4;
              other.squashY = 0.6;
              other.vy = Math.min(other.vy + PHYSICS.headBouncedVictimSquash, 6);
              player.score += boostBonus > 0 ? 250 : 150;
              other.score += 100;
              this.state.comboCount += 1;
              sound.playHeadBounce();
              this.spawnPuff((player.x + other.x + player.width) / 2, otherHead, COLORS.primaryAmber);
            }
          }
        }
      }

      for (const haz of this.state.hazards) {
        if (
          player.x < haz.x + haz.width && player.x + player.width > haz.x &&
          player.y < haz.y + haz.height && player.y + player.height > haz.y
        ) {
          this.damagePlayer(player, 'Hit by obstacle drone');
          break;
        }
      }

      for (const col of this.state.collectibles) {
        if (col.collected) continue;
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        const dist = Math.hypot(cx - col.x, cy - (col.y + Math.sin(col.floatOffset || 0) * 4));

        if (dist < player.width / 2 + col.radius) {
          col.collected = true;
          player.score += col.value;
          sound.playCollect();
          this.spawnPuff(col.x, col.y, col.type === 'boost' ? COLORS.boostColor : COLORS.gemColor);
          if (col.type === 'boost') {
            const boostBonus = jumpKey ? Math.abs(PHYSICS.jumpForce) * 0.45 : 0;
            player.vy = PHYSICS.bouncePadForce * 0.92 - boostBonus;
            player.isGrounded = false;
            player.jumpCount = 0;
            player.canDoubleJump = true;
            sound.playSuperBounce();
          }
        }
      }

      if (player.y > this.state.hazardLineY || player.y > this.state.cameraY + VIRTUAL_HEIGHT + 120) {
        this.damagePlayer(player, 'Consumed by rising hazard');
      }

      if (player.y < player.highestY) player.highestY = player.y;
      if (player.y < highestPlayerY) highestPlayerY = player.y;
    }

    if (highestPlayerY !== Infinity) {
      const currentHighestAltitude = Math.max(0, Math.floor((VIRTUAL_HEIGHT - 60 - highestPlayerY) / PHYSICS.pixelsPerMeter));
      if (currentHighestAltitude > this.state.highestAltitudeMeter) {
        this.state.score += (currentHighestAltitude - this.state.highestAltitudeMeter) * 10;
        this.state.highestAltitudeMeter = currentHighestAltitude;
      }

      const targetCameraY = highestPlayerY - PHYSICS.cameraFollowThresholdY;
      if (targetCameraY < this.state.cameraY) {
        this.state.cameraY += (targetCameraY - this.state.cameraY) * 0.12;
      }

      while (this.state.lastPlatformGeneratedY > this.state.cameraY - VIRTUAL_HEIGHT) {
        const nextY = this.state.lastPlatformGeneratedY - (60 + Math.random() * 45);
        this.generatePlatformLayer(nextY);
        this.state.lastPlatformGeneratedY = nextY;
      }
    }

    if (this.state.highestAltitudeMeter >= PHYSICS.summitHeightMeters && !this.state.summitReached) {
      this.state.summitReached = true;
      this.state.status = 'victory';
      sound.playVictory();
    }

    if (!anyPlayerAlive && this.state.status === 'playing') {
      this.state.status = 'gameover';
    }

    // Cleanup & Particles
    const cleanupY = Math.max(this.state.hazardLineY + 200, this.state.cameraY + VIRTUAL_HEIGHT + 300);
    this.state.platforms = this.state.platforms.filter((p) => !p.broken && p.y < cleanupY);
    this.state.collectibles = this.state.collectibles.filter((c) => !c.collected && c.y < cleanupY);
    this.state.hazards = this.state.hazards.filter((h) => h.y < cleanupY);

    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const pt = this.state.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.15;
      pt.life -= deltaSec;
      if (pt.life <= 0) this.state.particles.splice(i, 1);
    }
  }
}

/* =========================================================================
   6. CANVAS RENDERER
   ========================================================================= */

function renderGame(ctx: CanvasRenderingContext2D, state: GameEngineState) {
  const zone = ALTITUDE_ZONES[state.activeZoneIndex] || ALTITUDE_ZONES[0];

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
  bgGrad.addColorStop(0, zone.bgColorTop);
  bgGrad.addColorStop(1, zone.bgColorBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  // Parallax Grid
  ctx.strokeStyle = zone.gridColor;
  ctx.lineWidth = 1;
  const gridSize = 40;
  const offsetY = -(state.cameraY * 0.4) % gridSize;
  for (let x = 0; x <= VIRTUAL_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIRTUAL_HEIGHT);
    ctx.stroke();
  }
  for (let y = offsetY; y <= VIRTUAL_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIRTUAL_WIDTH, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(0, -state.cameraY);

  // Summit Finish Line (300m)
  const summitY = VIRTUAL_HEIGHT - 60 - PHYSICS.summitHeightMeters * PHYSICS.pixelsPerMeter;
  ctx.strokeStyle = COLORS.primaryAmber;
  ctx.setLineDash([12, 8]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, summitY);
  ctx.lineTo(VIRTUAL_WIDTH, summitY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.primaryAmber;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('SUMMIT 300m', 16, summitY - 8);

  // Platforms
  for (const plat of state.platforms) {
    if (plat.broken) continue;
    const shakeX = plat.shakeOffset || 0;
    const px = plat.x + shakeX;
    let py = plat.y;
    let ph = plat.height;

    if (plat.type === 'bouncy' && plat.springCompress) {
      const compress = plat.springCompress * 6;
      py += compress;
      ph -= compress;
    }

    let fill = plat.color || COLORS.platformNormal;
    if (plat.type === 'crumbling') {
      fill = plat.steppedOn && (plat.decayTime || 0) < 0.4 ? COLORS.platformCrumbleCritical : COLORS.platformCrumble;
    } else if (plat.type === 'bouncy') fill = COLORS.platformBouncy;
    else if (plat.type === 'moving') fill = COLORS.platformMoving;
    else if (plat.type === 'hazard') fill = COLORS.platformHazard;

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(px, py, plat.width, ph, 6);
    ctx.fill();

    if (plat.type === 'hazard') {
      ctx.fillStyle = '#FFF';
      for (let sx = px + 8; sx < px + plat.width - 8; sx += 14) {
        ctx.beginPath();
        ctx.moveTo(sx, py);
        ctx.lineTo(sx + 6, py - 8);
        ctx.lineTo(sx + 12, py);
        ctx.fill();
      }
    }
  }

  // Collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    const cy = col.y + Math.sin(col.floatOffset || 0) * 4;
    ctx.fillStyle = col.type === 'boost' ? COLORS.boostColor : COLORS.gemColor;
    ctx.beginPath();
    ctx.arc(col.x, cy, col.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Hazards (Drones)
  for (const haz of state.hazards) {
    ctx.fillStyle = COLORS.hazardLava;
    ctx.beginPath();
    ctx.roundRect(haz.x, haz.y, haz.width, haz.height, 8);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillRect(haz.x + 6, haz.y + 8, 6, 6);
    ctx.fillRect(haz.x + haz.width - 12, haz.y + 8, 6, 6);
  }

  // Players
  for (const p of state.players) {
    if (!p.isAlive) continue;
    if (p.invulnerableTime > 0 && Math.floor(p.invulnerableTime * 12) % 2 === 0) continue;

    ctx.save();
    const cx = p.x + p.width / 2;
    const bottomY = p.y + p.height;
    ctx.translate(cx, bottomY);
    ctx.scale(p.squashX, p.squashY);

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(-p.width / 2, -p.height, p.width, p.height, 8);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0B0D10';
    const eyeOffset = p.facing === 'right' ? 4 : -8;
    ctx.fillRect(eyeOffset, -p.height + 10, 4, 6);
    ctx.fillRect(eyeOffset + 7, -p.height + 10, 4, 6);
    ctx.restore();
  }

  // Particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    if (pt.shape === 'square') {
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    } else {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Rising Hazard Lava
  const lavaHeight = 1000;
  const lavaGrad = ctx.createLinearGradient(0, state.hazardLineY, 0, state.hazardLineY + 180);
  lavaGrad.addColorStop(0, COLORS.hazardGlow);
  lavaGrad.addColorStop(0.2, COLORS.hazardLava);
  lavaGrad.addColorStop(1, '#4A041C');
  ctx.fillStyle = lavaGrad;
  ctx.fillRect(0, state.hazardLineY, VIRTUAL_WIDTH, lavaHeight);

  ctx.restore();
}

/* =========================================================================
   7. MAIN REACT COMPONENT
   ========================================================================= */

export const BounceGame: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine>(new GameEngine('1P'));

  const [mode, setMode] = useState<GameMode>('1P');
  const [status, setStatus] = useState<GameStatus>('idle');
  const [altitude, setAltitude] = useState(0);
  const [score, setScore] = useState(0);
  const [zoneName, setZoneName] = useState(ALTITUDE_ZONES[0].name);
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');
  const [playerLives, setPlayerLives] = useState<number[]>([3]);
  const savedEndRef = useRef(false);

  const startGame = useCallback((selectedMode: GameMode) => {
    savedEndRef.current = false;
    setMode(selectedMode);
    engineRef.current.reset(selectedMode);
    engineRef.current.state.players[0].name = p1Name || 'Player 1';
    if (selectedMode === '2P' && engineRef.current.state.players[1]) {
      engineRef.current.state.players[1].name = p2Name || 'Player 2';
    }
    engineRef.current.start();
    setStatus('playing');
  }, [p1Name, p2Name]);

  useEffect(() => {
    engineRef.current.seedInitialPlatforms();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const k = e.key.toLowerCase();
      if (k === 'a') engineRef.current.updateKeys({ p1Left: true });
      if (k === 'd') engineRef.current.updateKeys({ p1Right: true });
      if (k === 'w' || k === ' ') engineRef.current.updateKeys({ p1Up: true });
      if (e.key === 'ArrowLeft') engineRef.current.updateKeys({ p2Left: true, ...(engineRef.current.state.mode === '1P' ? { p1Left: true } : {}) });
      if (e.key === 'ArrowRight') engineRef.current.updateKeys({ p2Right: true, ...(engineRef.current.state.mode === '1P' ? { p1Right: true } : {}) });
      if (e.key === 'ArrowUp') engineRef.current.updateKeys({ p2Up: true, ...(engineRef.current.state.mode === '1P' ? { p1Up: true } : {}) });
      if (k === 'p' || k === 'escape') {
        engineRef.current.pause();
        setStatus(engineRef.current.state.status);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a') engineRef.current.updateKeys({ p1Left: false });
      if (k === 'd') engineRef.current.updateKeys({ p1Right: false });
      if (k === 'w' || k === ' ') engineRef.current.updateKeys({ p1Up: false });
      if (e.key === 'ArrowLeft') engineRef.current.updateKeys({ p2Left: false, ...(engineRef.current.state.mode === '1P' ? { p1Left: false } : {}) });
      if (e.key === 'ArrowRight') engineRef.current.updateKeys({ p2Right: false, ...(engineRef.current.state.mode === '1P' ? { p1Right: false } : {}) });
      if (e.key === 'ArrowUp') engineRef.current.updateKeys({ p2Up: false, ...(engineRef.current.state.mode === '1P' ? { p1Up: false } : {}) });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaSec = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const engine = engineRef.current;
      engine.update(deltaSec);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderGame(ctx, engine.state);
      }

      const totalScore = engine.state.score + engine.state.players.reduce((acc, p) => acc + p.score, 0);
      setAltitude(engine.state.highestAltitudeMeter);
      setScore(totalScore);
      setZoneName(ALTITUDE_ZONES[engine.state.activeZoneIndex]?.name || ALTITUDE_ZONES[0].name);
      setPlayerLives(engine.state.players.map((p) => p.lives));
      setStatus(engine.state.status);

      if ((engine.state.status === 'gameover' || engine.state.status === 'victory') && !savedEndRef.current) {
        savedEndRef.current = true;
        const updated = saveLeaderboardEntry({
          playerName: engine.state.players[0]?.name || 'Player 1',
          player2Name: engine.state.mode === '2P' ? engine.state.players[1]?.name || 'Player 2' : undefined,
          mode: engine.state.mode,
          heightMeters: engine.state.highestAltitudeMeter,
          score: totalScore,
          isWin: engine.state.status === 'victory',
        });
        setLeaderboard(updated);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0D10] text-white flex flex-col items-center justify-center p-4 select-none font-sans">
      {/* Header Bar */}
      <div className="w-full max-w-[640px] flex items-center justify-between bg-[#151921] border border-[#232936] rounded-t-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#FFB800] font-bold">
            <Flame className="w-5 h-5" />
            <span>{altitude}m / 300m</span>
          </div>
          <span className="text-xs text-[#8E9AA8] hidden sm:inline">{zoneName}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-emerald-400">
            Score: {score.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMuted(!sound.toggleMute())}
              className="p-2 rounded-lg bg-[#232936] hover:bg-[#2F3748] transition"
              title="Toggle Sound"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            {status === 'playing' || status === 'paused' ? (
              <button
                onClick={() => {
                  engineRef.current.pause();
                  setStatus(engineRef.current.state.status);
                }}
                className="p-2 rounded-lg bg-[#232936] hover:bg-[#2F3748] transition"
                title="Pause"
              >
                {status === 'paused' ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4" />}
              </button>
            ) : null}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="p-2 rounded-lg bg-[#232936] hover:bg-[#2F3748] transition"
              title="Leaderboard"
            >
              <Trophy className="w-4 h-4 text-[#FFB800]" />
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-lg bg-[#232936] hover:bg-[#2F3748] transition"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative w-full max-w-[640px] aspect-[640/900] max-h-[78vh] bg-[#0B0D10] border-x border-b border-[#232936] rounded-b-2xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* HUD Lives Overlay */}
        {status === 'playing' && (
          <div className="absolute top-3 left-3 right-3 flex justify-between pointer-events-none">
            <div className="bg-[#151921]/85 border border-[#232936] px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F5A0]" />
              <span className="font-semibold">{p1Name}:</span>
              <span>{'❤️'.repeat(Math.max(0, playerLives[0] ?? 0))}</span>
            </div>
            {mode === '2P' && (
              <div className="bg-[#151921]/85 border border-[#232936] px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D]" />
                <span className="font-semibold">{p2Name}:</span>
                <span>{'❤️'.repeat(Math.max(0, playerLives[1] ?? 0))}</span>
              </div>
            )}
          </div>
        )}

        {/* Start / Idle Overlay */}
        {status === 'idle' && (
          <div className="absolute inset-0 bg-[#0B0D10]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#00F5A0] via-[#FFB800] to-[#FF4D6D] mb-2">
              BOUNCE BACK
            </h1>
            <p className="text-sm text-[#8E9AA8] max-w-md mb-6">
              Outclimb the rising surge to reach the 300m summit. Chain double-jumps, bounce pads, and teammate head-bounces!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm mb-6">
              <input
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Player 1 Name"
                className="bg-[#151921] border border-[#232936] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00F5A0]"
              />
              <input
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Player 2 Name"
                className="bg-[#151921] border border-[#232936] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF4D6D]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <button
                onClick={() => startGame('1P')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#00F5A0] hover:bg-[#00d98d] text-[#0B0D10] font-bold py-3 px-4 rounded-xl transition cursor-pointer"
              >
                <User className="w-5 h-5" />
                1 Player Solo
              </button>
              <button
                onClick={() => startGame('2P')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF4D6D] hover:bg-[#e63e5c] text-white font-bold py-3 px-4 rounded-xl transition cursor-pointer"
              >
                <Users className="w-5 h-5" />
                2 Player Co-Op
              </button>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {status === 'paused' && (
          <div className="absolute inset-0 bg-[#0B0D10]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
            <h2 className="text-3xl font-bold mb-6">Game Paused</h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  engineRef.current.pause();
                  setStatus('playing');
                }}
                className="flex items-center gap-2 bg-[#00F5A0] text-[#0B0D10] font-bold px-6 py-3 rounded-xl"
              >
                <Play className="w-5 h-5" /> Resume
              </button>
              <button
                onClick={() => startGame(mode)}
                className="flex items-center gap-2 bg-[#232936] hover:bg-[#2F3748] font-bold px-6 py-3 rounded-xl"
              >
                <RotateCcw className="w-5 h-5" /> Restart
              </button>
            </div>
          </div>
        )}

        {/* Game Over / Victory Overlay */}
        {(status === 'gameover' || status === 'victory') && (
          <div className="absolute inset-0 bg-[#0B0D10]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Award className={`w-16 h-16 mb-3 ${status === 'victory' ? 'text-[#FFB800]' : 'text-rose-500'}`} />
            <h2 className="text-3xl font-black mb-1">
              {status === 'victory' ? 'SUMMIT CONQUERED!' : 'CONSUMED BY THE SURGE'}
            </h2>
            <p className="text-[#8E9AA8] text-sm mb-6">
              Peak Altitude: <span className="text-white font-bold">{altitude}m</span> • Final Score:{' '}
              <span className="text-[#00F5A0] font-bold">{score.toLocaleString()}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => startGame(mode)}
                className="flex items-center gap-2 bg-[#FFB800] hover:bg-[#e5a600] text-[#0B0D10] font-bold px-6 py-3 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" /> Play Again
              </button>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="flex items-center gap-2 bg-[#232936] hover:bg-[#2F3748] font-bold px-6 py-3 rounded-xl transition cursor-pointer"
              >
                <Trophy className="w-5 h-5 text-[#FFB800]" /> Rankings
              </button>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelp && (
          <div className="absolute inset-0 bg-[#0B0D10]/95 p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Controls & Mechanics</h3>
                <button onClick={() => setShowHelp(false)} className="p-1.5 rounded-lg bg-[#232936]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 text-sm text-[#8E9AA8]">
                <div className="bg-[#151921] p-4 rounded-xl border border-[#232936]">
                  <p className="text-white font-semibold mb-1">Controls</p>
                  <p>• <span className="text-[#00F5A0]">Player 1:</span> A / D to Move, W or Space to Jump & Double-Jump (1P also supports Arrow Keys)</p>
                  <p>• <span className="text-[#FF4D6D]">Player 2:</span> Left / Right Arrows to Move, Up Arrow to Jump & Double-Jump</p>
                  <p>• <span className="text-amber-400">Pause:</span> P or Esc</p>
                </div>
                <div className="bg-[#151921] p-4 rounded-xl border border-[#232936]">
                  <p className="text-white font-semibold mb-1">Platform Types</p>
                  <p>• <span className="text-blue-400">Blue:</span> Standard solid platform</p>
                  <p>• <span className="text-amber-400">Amber:</span> Crumbles shortly after landing</p>
                  <p>• <span className="text-emerald-400">Green:</span> Super bounce pad (hold Jump for extra boost!)</p>
                  <p>• <span className="text-purple-400">Purple:</span> Moving platform</p>
                  <p>• <span className="text-pink-500">Pink Spikes:</span> Deals 1 heart of damage</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full bg-[#00F5A0] text-[#0B0D10] font-bold py-3 rounded-xl mt-4"
            >
              Got It
            </button>
          </div>
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <div className="absolute inset-0 bg-[#0B0D10]/95 p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Medal className="w-6 h-6 text-[#FFB800]" />
                  <h3 className="text-xl font-bold">High Scores</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearLeaderboard();
                      setLeaderboard(getLeaderboard());
                    }}
                    className="p-1.5 rounded-lg bg-[#232936] text-rose-400 hover:bg-[#2F3748]"
                    title="Reset Leaderboard"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowLeaderboard(false)} className="p-1.5 rounded-lg bg-[#232936]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between bg-[#151921] border border-[#232936] px-4 py-3 rounded-xl text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#FFB800] w-5">#{idx + 1}</span>
                      <div>
                        <div className="font-semibold text-white">
                          {entry.playerName}
                          {entry.player2Name ? ` & ${entry.player2Name}` : ''}
                        </div>
                        <div className="text-xs text-[#8E9AA8]">
                          {entry.mode} • {entry.heightMeters}m • {entry.date}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-[#00F5A0]">{entry.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              className="w-full bg-[#232936] hover:bg-[#2F3748] font-bold py-3 rounded-xl mt-4"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Touch / Mobile Controls */}
      {status === 'playing' && (
        <div className="w-full max-w-[640px] flex justify-between items-center mt-3 gap-4 sm:hidden">
          <div className="flex gap-2">
            <button
              onTouchStart={() => engineRef.current.updateKeys({ p1Left: true })}
              onTouchEnd={() => engineRef.current.updateKeys({ p1Left: false })}
              className="p-4 bg-[#151921] border border-[#232936] rounded-xl active:bg-[#232936]"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onTouchStart={() => engineRef.current.updateKeys({ p1Right: true })}
              onTouchEnd={() => engineRef.current.updateKeys({ p1Right: false })}
              className="p-4 bg-[#151921] border border-[#232936] rounded-xl active:bg-[#232936]"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
          <button
            onTouchStart={() => engineRef.current.updateKeys({ p1Up: true })}
            onTouchEnd={() => engineRef.current.updateKeys({ p1Up: false })}
            className="p-4 bg-[#00F5A0] text-[#0B0D10] rounded-xl font-bold active:opacity-80"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BounceGame;
