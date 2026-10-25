import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import type * as THREE from 'three';
import { COIN_MAX_PLAYS, GardenService } from '../../../core/services/garden';
import { GAME_DAILY_CAP, XuService } from '../../../core/services/xu';

type Kind = 'coin' | 'gold' | 'bad';
type Phase = 'ready' | 'playing' | 'over';

interface Item {
  kind: Kind;
  group: THREE.Group;
  vy: number;
  spin: number;
  r: number;
  sparkle?: THREE.Points;
  /** Geometry/material riêng của vật phẩm — giải phóng ngay khi vật phẩm biến mất */
  own: (THREE.BufferGeometry | THREE.Material)[];
}

interface Pop {
  sprite: THREE.Sprite;
  life: number;
}

const ROUND_SECONDS = 30;
const GRAVITY = 7.5; // đơn vị thế giới / giây², cộng dần vào vận tốc theo delta time
const MAX_FALL = 9;
const MASCOT_H = 1.7;

/**
 * Mini game "Hái xu" (Three.js, nạp động khi vào trang). Xu rơi từ tán xoài, kiến hứng bằng chuột/chạm/phím mũi tên.
 * Phần thưởng là MÔ PHỎNG: cộng vào sổ Xu trong localStorage (có trần Xu mỗi ngày), không có máy chủ.
 */
@Component({
  selector: 'app-coin-catch',
  standalone: false,
  templateUrl: './coin-catch.html',
  styleUrl: './coin-catch.css',
})
export class CoinCatch implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly garden = inject(GardenService);
  protected readonly xu = inject(XuService);

  @ViewChild('host', { static: true }) private host!: ElementRef<HTMLElement>;

  protected readonly phase = signal<Phase>('ready');
  protected readonly timeLeft = signal(ROUND_SECONDS);
  protected readonly score = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly playsLeft = this.garden.coinPlaysLeft;
  protected readonly maxPlays = COIN_MAX_PLAYS;
  protected readonly cap = GAME_DAILY_CAP;
  protected readonly canPlay = computed(() => this.playsLeft() > 0 && this.xu.gameToday() < GAME_DAILY_CAP);
  protected readonly result = signal<{ score: number; xu: number; unlocked: { badge: string; at: number; code: string | null }[] } | null>(null);

  private T?: typeof THREE;
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private mascot?: THREE.Sprite;
  private ground?: THREE.Mesh;
  private collect: (THREE.BufferGeometry | THREE.Material)[] | null = null;
  private shared: { geo: THREE.BufferGeometry[]; mat: THREE.Material[]; tex: THREE.Texture[] } = { geo: [], mat: [], tex: [] };
  private items: Item[] = [];
  private pops: Pop[] = [];
  private raf = 0;
  private last = 0;
  private ro?: ResizeObserver;
  private halfW = 3;
  private halfH = 4.66;
  private targetX = 0;
  private keys = { left: false, right: false };
  private spawnIn = 0.6;
  private elapsed = 0;
  private squash = 0;

  async ngAfterViewInit(): Promise<void> {
    try {
      this.T = await import('three');
      this.build(this.T);
      this.loading.set(false);
      this.zone.runOutsideAngular(() => this.loop(performance.now()));
    } catch {
      this.loading.set(false);
      this.error.set('Thiết bị hoặc trình duyệt này chưa hỗ trợ đồ họa 3D (WebGL), nên chưa chơi được Hái xu.');
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.clearItems();
    for (const g of this.shared.geo) g.dispose();
    for (const m of this.shared.mat) m.dispose();
    for (const t of this.shared.tex) t.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer?.domElement.remove();
  }

  start(): void {
    if (!this.canPlay() || this.phase() === 'playing') return;
    this.clearItems();
    this.score.set(0);
    this.result.set(null);
    this.timeLeft.set(ROUND_SECONDS);
    this.elapsed = 0;
    this.spawnIn = 0.4;
    this.phase.set('playing');
  }

  protected pointer(e: PointerEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width; // 0..1
    this.targetX = (nx * 2 - 1) * this.halfW;
  }

  @HostListener('window:keydown', ['$event'])
  protected keyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
  }

  @HostListener('window:keyup', ['$event'])
  protected keyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
  }

  // ---------- dựng cảnh ----------
  private build(T: typeof THREE): void {
    const el = this.host.nativeElement;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = 'gl';
    el.prepend(renderer.domElement);
    this.renderer = renderer;

    const scene = new T.Scene();
    this.scene = scene;
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 50);
    this.camera.position.set(0, 0, 10);

    scene.add(new T.AmbientLight(0xffffff, 1.5));
    const sun = new T.DirectionalLight(0xfff1d0, 2.2);
    sun.position.set(3, 6, 8);
    scene.add(sun);

    this.buildTree(T, scene);

    // đất ở đáy cảnh
    const ground = this.mesh(T, new T.PlaneGeometry(40, 1.4), new T.MeshStandardMaterial({ color: 0x86b36b }));
    ground.position.set(0, -4.9, -1);
    scene.add(ground);
    this.ground = ground;

    // mascot: sprite ảnh kiến, đứng sát đáy
    const tex = new T.TextureLoader().load('assets/clean/idle.png');
    tex.colorSpace = T.SRGBColorSpace;
    this.shared.tex.push(tex);
    const mat = new T.SpriteMaterial({ map: tex, transparent: true });
    this.shared.mat.push(mat);
    const mascot = new T.Sprite(mat);
    mascot.scale.set(MASCOT_H * (329 / 599), MASCOT_H, 1);
    scene.add(mascot);
    this.mascot = mascot;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
  }

  private buildTree(T: typeof THREE, scene: THREE.Scene): void {
    const leaf = new T.MeshStandardMaterial({ color: 0x4f9d52, roughness: 0.9 });
    const leaf2 = new T.MeshStandardMaterial({ color: 0x3f8a46, roughness: 0.9 });
    const bark = new T.MeshStandardMaterial({ color: 0x7a5230 });
    const mango = new T.MeshStandardMaterial({ color: 0xf2a33a, roughness: 0.6 });
    this.shared.mat.push(leaf, leaf2, bark, mango);
    const sphere = new T.SphereGeometry(1, 20, 16);
    const mangoGeo = new T.SphereGeometry(0.16, 12, 10);
    const branchGeo = new T.CylinderGeometry(0.12, 0.2, 14, 8);
    this.shared.geo.push(sphere, mangoGeo, branchGeo);

    const tree = new T.Group();
    tree.name = 'tree';
    const branch = new T.Mesh(branchGeo, bark);
    branch.rotation.z = Math.PI / 2;
    branch.position.set(0, 0.2, -0.5);
    tree.add(branch);
    for (let i = -4; i <= 4; i++) {
      const s = new T.Mesh(sphere, i % 2 ? leaf : leaf2);
      const r = 0.9 + ((i * 7) % 3) * 0.12;
      s.scale.setScalar(r);
      s.position.set(i * 0.95, 0.7 + Math.sin(i) * 0.15, -0.4 + (i % 2) * 0.2);
      tree.add(s);
    }
    for (const x of [-3.4, -1.6, 0.4, 2.2, 3.6]) {
      const m = new T.Mesh(mangoGeo, mango);
      m.scale.set(1, 1.25, 1);
      m.position.set(x, -0.25 - Math.abs(Math.sin(x)) * 0.2, 0.5);
      tree.add(m);
    }
    scene.add(tree);
  }

  private mesh(T: typeof THREE, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    if (this.collect) this.collect.push(geo, mat);
    else {
      this.shared.geo.push(geo);
      this.shared.mat.push(mat);
    }
    return new T.Mesh(geo, mat);
  }

  private resize(): void {
    if (!this.renderer || !this.camera || !this.T) return;
    const w = this.host.nativeElement.clientWidth || 1;
    const h = this.host.nativeElement.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // khung nhìn cố định theo chiều cao: dù màn hẹp hay rộng cũng thấy đủ từ tán cây tới đất
    this.halfH = Math.tan((this.camera.fov * Math.PI) / 360) * 10;
    this.halfW = this.halfH * this.camera.aspect;
    this.camera.updateProjectionMatrix();
    const tree = this.scene?.getObjectByName('tree');
    tree?.position.set(0, this.halfH - 0.9, 0);
    this.ground?.position.set(0, -this.halfH - 0.2, -1);
    const x = this.mascot?.position.x ?? 0;
    this.mascot?.position.set(Math.max(-this.halfW + 0.6, Math.min(this.halfW - 0.6, x)), -this.halfH + MASCOT_H / 2 + 0.35, 0);
  }

  // ---------- vòng lặp ----------
  private loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); // giới hạn để tab bị treo không làm xu "dịch chuyển"
    this.last = now;
    this.update(dt);
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    const T = this.T;
    if (!T || !this.mascot) return;

    // di chuyển kiến: phím cộng vào đích, rồi trượt mượt về phía đích
    if (this.keys.left) this.targetX -= 7 * dt;
    if (this.keys.right) this.targetX += 7 * dt;
    const limit = this.halfW - 0.6;
    this.targetX = Math.max(-limit, Math.min(limit, this.targetX));
    this.mascot.position.x += (this.targetX - this.mascot.position.x) * Math.min(1, dt * 14);
    this.squash = Math.max(0, this.squash - dt * 4);
    const k = 1 + Math.sin(this.squash * Math.PI) * 0.12;
    this.mascot.scale.set(MASCOT_H * (329 / 599) * (2 - k), MASCOT_H * k, 1);

    if (this.phase() === 'playing') {
      this.elapsed += dt;
      const left = Math.max(0, ROUND_SECONDS - this.elapsed);
      if (Math.ceil(left) !== this.timeLeft()) this.zone.run(() => this.timeLeft.set(Math.ceil(left)));
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawn(T);
        this.spawnIn = (0.62 - (this.elapsed / ROUND_SECONDS) * 0.25) * (0.7 + Math.random() * 0.6); // càng về cuối càng dồn dập
      }
      if (left <= 0) this.zone.run(() => this.finish());
    }

    const catchY = this.mascot.position.y + MASCOT_H * 0.28;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.vy = Math.max(-MAX_FALL, it.vy - GRAVITY * dt); // gia tốc rơi
      it.group.position.y += it.vy * dt;
      it.group.rotation.y += it.spin * dt;
      if (it.sparkle) it.sparkle.rotation.z += dt * 2.5;
      const caught = this.phase() === 'playing' && Math.abs(it.group.position.x - this.mascot.position.x) < 0.62 && Math.abs(it.group.position.y - catchY) < 0.4;
      if (caught) {
        this.onCatch(T, it);
        this.removeItem(i);
      } else if (it.group.position.y < -this.halfH - 0.6) {
        this.removeItem(i);
      }
    }

    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.life -= dt;
      p.sprite.position.y += dt * 1.6;
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, p.life / 0.8);
      if (p.life <= 0) {
        this.scene?.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).map?.dispose();
        p.sprite.material.dispose();
        this.pops.splice(i, 1);
      }
    }
  }

  private spawn(T: typeof THREE): void {
    const roll = Math.random();
    const kind: Kind = roll < 0.7 ? 'coin' : roll < 0.9 ? 'gold' : 'bad'; // 70% xu thường · 20% xu vàng · 10% vật cản
    const own: (THREE.BufferGeometry | THREE.Material)[] = [];
    this.collect = own;
    const group = new T.Group();
    let r = 0.3;
    let sparkle: THREE.Points | undefined;
    if (kind === 'bad') {
      this.addBad(T, group);
      r = 0.28;
    } else {
      const gold = kind === 'gold';
      const geo = new T.CylinderGeometry(0.3, 0.3, 0.07, 28);
      const mat = new T.MeshStandardMaterial({
        color: gold ? 0xffd23f : 0xf0a830,
        metalness: gold ? 0.7 : 0.35,
        roughness: gold ? 0.25 : 0.5,
        emissive: gold ? 0xb88a00 : 0x000000,
        emissiveIntensity: gold ? 0.55 : 0,
      });
      const coin = this.mesh(T, geo, mat);
      coin.rotation.x = Math.PI / 2; // mặt xu hướng về camera
      group.add(coin);
      const rim = this.mesh(T, new T.TorusGeometry(0.22, 0.025, 8, 24), new T.MeshStandardMaterial({ color: gold ? 0xfff2a6 : 0xffd27a, metalness: 0.4, roughness: 0.4 }));
      rim.position.z = 0.04;
      group.add(rim);
      if (gold) {
        group.scale.setScalar(1.25);
        sparkle = this.sparkles(T);
        group.add(sparkle);
      }
    }
    this.collect = null;
    const span = Math.min(this.halfW - 0.6, 4.2);
    group.position.set((Math.random() * 2 - 1) * span, this.halfH - 1.2, 0.2);
    this.scene?.add(group);
    this.items.push({ kind, group, vy: -0.5, spin: (Math.random() * 2 - 1) * 5, r, sparkle, own });
  }

  private addBad(T: typeof THREE, group: THREE.Group): void {
    if (Math.random() < 0.5) {
      // bọ xít: thân nâu xanh + đầu + hai râu
      const body = this.mesh(T, new T.SphereGeometry(0.28, 16, 12), new T.MeshStandardMaterial({ color: 0x6d6a2f, roughness: 0.7 }));
      body.scale.set(1, 0.8, 0.9);
      const head = this.mesh(T, new T.SphereGeometry(0.14, 12, 10), new T.MeshStandardMaterial({ color: 0x3f3d1a }));
      head.position.set(0.3, 0.05, 0);
      const ant = this.mesh(T, new T.CylinderGeometry(0.012, 0.012, 0.3, 4), new T.MeshStandardMaterial({ color: 0x222222 }));
      ant.position.set(0.45, 0.2, 0);
      ant.rotation.z = -0.9;
      group.add(body, head, ant);
    } else {
      // lá khô: bầu dục dẹt màu nâu
      const leaf = this.mesh(T, new T.SphereGeometry(0.32, 14, 10), new T.MeshStandardMaterial({ color: 0xa8742f, roughness: 1 }));
      leaf.scale.set(1.1, 0.12, 0.65);
      group.add(leaf);
    }
  }

  private sparkles(T: typeof THREE): THREE.Points {
    const n = 8;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * 0.5;
      pos[i * 3 + 1] = Math.sin(a) * 0.5;
      pos[i * 3 + 2] = 0.1;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({ color: 0xfff6b0, size: 0.14, transparent: true, opacity: 0.95 });
    (this.collect ?? this.shared.geo).push(geo);
    (this.collect ?? this.shared.mat).push(mat);
    return new T.Points(geo, mat);
  }

  // ---------- bắt xu / hiệu ứng ----------
  private onCatch(T: typeof THREE, it: Item): void {
    const delta = it.kind === 'coin' ? 1 : it.kind === 'gold' ? 5 : -1;
    const next = Math.max(0, this.score() + delta); // điểm không xuống dưới 0
    this.zone.run(() => this.score.set(next));
    this.squash = 1;
    this.pop(T, (delta > 0 ? '+' : '') + delta, delta > 0 ? (it.kind === 'gold' ? '#ffb800' : '#D85A1C') : '#c0392b', it.group.position.x, it.group.position.y + 0.3);
  }

  private pop(T: typeof THREE, text: string, color: string, x: number, y: number): void {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const g = c.getContext('2d');
    if (!g) return;
    g.font = '700 44px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = '#fff';
    g.strokeText(text, 64, 34);
    g.fillStyle = color;
    g.fillText(text, 64, 34);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(1.1, 0.55, 1);
    sprite.position.set(x, y, 1);
    this.scene?.add(sprite);
    this.pops.push({ sprite, life: 0.8 });
  }

  private removeItem(i: number): void {
    const it = this.items[i];
    this.scene?.remove(it.group);
    for (const d of it.own) d.dispose(); // giải phóng bộ nhớ GPU của vật phẩm ngay
    this.items.splice(i, 1);
  }

  private clearItems(): void {
    for (let i = this.items.length - 1; i >= 0; i--) this.removeItem(i);
  }

  private finish(): void {
    this.phase.set('over');
    this.clearItems();
    const score = this.score();
    const unlocked = this.garden.finishCoinRound(score);
    const day = new Date().toDateString().replace(/\s/g, '');
    const xu = this.xu.earnGame(score, 'Hái xu', `hai-xu:${day}:${Date.now()}`);
    this.result.set({ score, xu, unlocked });
  }
}
