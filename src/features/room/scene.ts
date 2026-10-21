import * as Phaser from 'phaser';
import { Navigator } from './navigation';
import { roomMap } from './map';
import { activities, type Resident, type AnimationState } from './domain';
import { composeAtlas } from './sprites';
export type SceneCallbacks = {
  onVisual: (state: AnimationState, x: number, y: number) => void;
  onArrive: (resident: Resident) => void;
  onError: (message: string) => void;
};
export class RoomScene extends Phaser.Scene {
  private navigator!: Navigator;
  private actor!: Phaser.GameObjects.Sprite;
  private prop!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Ellipse;
  private asleep!: Phaser.GameObjects.Text;
  private version = -1;
  private reported = -1;
  private textureId = 0;
  private textureKey = '';
  private appearanceKey = '';
  private resident: Resident;
  private callbacks: SceneCallbacks;
  private ready = false;
  private visual: AnimationState = 'idle';
  private lastTile = '';
  constructor(
    resident: Resident,
    private atlas: HTMLCanvasElement,
    callbacks: SceneCallbacks,
  ) {
    super('aurora');
    this.resident = resident;
    this.callbacks = callbacks;
  }
  create() {
    this.drawRoom();
    this.navigator = new Navigator(roomMap.grid, this.resident.position);
    this.shadow = this.add.ellipse(0, 0, 23, 8, 0x564839, 0.16);
    this.actor = this.add.sprite(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.prop = this.add.graphics();
    this.asleep = this.add
      .text(0, 0, 'z', { fontFamily: 'Georgia', fontSize: '10px', color: '#625575' })
      .setVisible(false);
    this.installTexture(this.atlas);
    this.appearanceKey = JSON.stringify(this.resident.appearance);
    this.ready = true;
    this.sync(this.resident);
    this.events.once('shutdown', () => {
      this.ready = false;
    });
  }
  private installTexture(atlas: HTMLCanvasElement) {
    this.actor.anims.stop();
    const old = this.textureKey;
    this.textureKey = `resident-${++this.textureId}`;
    const texture = this.textures.addCanvas(this.textureKey, atlas)!;
    for (let i = 0; i < 108; i++) texture.add(i, 0, (i % 9) * 64, Math.floor(i / 9) * 64, 64, 64);
    this.actor.setTexture(this.textureKey, 54);
    for (let d = 0; d < 4; d++)
      this.anims.create({
        key: `${this.textureKey}-walk-${d}`,
        frames: Array.from({ length: 9 }, (_, i) => ({ key: this.textureKey, frame: d * 9 + i })),
        frameRate: 8,
        repeat: -1,
      });
    if (old) {
      for (let d = 0; d < 4; d++) this.anims.remove(`${old}-walk-${d}`);
      this.textures.remove(old);
    }
  }
  sync(resident: Resident) {
    this.resident = resident;
    if (!this.ready) return;
    const appearance = JSON.stringify(resident.appearance);
    if (appearance !== this.appearanceKey) {
      this.appearanceKey = appearance;
      composeAtlas(resident.appearance)
        .then((atlas) => {
          if (this.ready && this.appearanceKey === appearance) this.installTexture(atlas);
        })
        .catch((e) => this.callbacks.onError(e.message));
    }
    if (this.version !== resident.activity_revision) {
      this.version = resident.activity_revision;
      if (resident.current_activity && resident.animation_state === 'walking') {
        if (!this.navigator.plan(activities[resident.current_activity].destination))
          this.callbacks.onError('Não há caminho livre até esse objeto.');
      } else if (resident.current_activity && this.navigator.path.length === 0)
        this.navigator.position = { ...resident.position };
    }
  }
  update(_time: number, delta: number) {
    if (!this.ready) return;
    const before = { ...this.navigator.position };
    const arrived = this.navigator.advance(delta / 1000);
    const position = this.navigator.position;
    const moving = !arrived;
    const activity = this.resident.current_activity
      ? activities[this.resident.current_activity]
      : null;
    const direction = moving
      ? Math.abs(position.x - before.x) > Math.abs(position.y - before.y)
        ? position.x > before.x
          ? 3
          : 1
        : position.y > before.y
          ? 2
          : 0
      : (activity?.facing ?? 2);
    const x = position.x * 24 + 12,
      y = position.y * 24 + 12;
    this.actor.setPosition(x, y);
    this.shadow.setPosition(x, y - 2);
    this.prop.clear();
    this.asleep.setVisible(false);
    const state: AnimationState = moving ? 'walking' : (activity?.state ?? 'idle');
    if (moving) {
      const key = `${this.textureKey}-walk-${direction}`;
      if (this.actor.anims.currentAnim?.key !== key || !this.actor.anims.isPlaying)
        this.actor.play(key);
    } else {
      this.actor.anims.stop();
      this.actor.setFrame((activity ? 8 : 4) * 9 + direction * 9);
      if (activity?.id === 'read') {
        this.prop.fillStyle(0x735787).fillRect(x - 9, y - 25, 18, 9);
        this.prop.fillStyle(0xf7e9cb).fillRect(x - 7, y - 24, 14, 6);
        this.prop.lineStyle(1, 0xc4ae8a).lineBetween(x, y - 24, x, y - 18);
      }
      if (activity?.id === 'sleep') {
        this.prop.fillStyle(0xb8aac9).fillRect(x - 9, y - 14, 18, 8);
        this.asleep.setPosition(x + 10, y - 48).setVisible(true);
      }
    }
    if (arrived && activity && this.reported !== this.version) {
      this.reported = this.version;
      this.callbacks.onArrive({
        ...this.resident,
        position: { x: Math.round(position.x), y: Math.round(position.y) },
        animation_state: activity.state,
      });
    }
    const tile = `${Math.round(position.x)},${Math.round(position.y)}`;
    if (state !== this.visual || tile !== this.lastTile) {
      this.visual = state;
      this.lastTile = tile;
      this.callbacks.onVisual(state, position.x, position.y);
    }
  }
  private drawRoom() {
    const g = this.add.graphics();
    g.fillStyle(0xe8dccb).fillRect(0, 0, 384, 288);
    g.fillStyle(0xc8b7ab).fillRect(0, 0, 384, 48);
    g.fillStyle(0x9c7e69).fillRect(0, 44, 384, 5);
    g.fillStyle(0xceb397).fillRect(0, 48, 384, 240);
    g.lineStyle(1, 0xb99b81, 0.5);
    for (let y = 48; y < 288; y += 24) {
      g.lineBetween(0, y, 384, y);
      for (let x = y % 48 === 0 ? 0 : 48; x < 384; x += 96) g.lineBetween(x, y, x, y + 24);
    }
    g.fillStyle(0xa88e79)
      .fillRect(0, 0, 24, 288)
      .fillRect(360, 0, 24, 288)
      .fillRect(0, 264, 384, 24);
    g.fillStyle(0x826b59).fillRect(170, 5, 53, 39);
    g.fillStyle(0xb5cdd3).fillRect(174, 8, 45, 33);
    g.fillStyle(0xeee3ce).fillRect(194, 8, 4, 33).fillRect(174, 23, 45, 3);
    g.fillStyle(0xdccba9).fillRect(165, 42, 63, 5);
    g.fillStyle(0xbc9b7d).fillRect(144, 164, 91, 70);
    g.lineStyle(2, 0xe4cfad).strokeRect(148, 168, 83, 62);
    g.fillStyle(0x745742).fillRect(72, 57, 96, 48);
    g.fillStyle(0xb18a62).fillRect(72, 53, 96, 12);
    g.fillStyle(0x8d6b50).fillRect(76, 104, 7, 17).fillRect(157, 104, 7, 17);
    g.fillStyle(0xf0e2bd).fillRect(95, 51, 22, 9);
    g.fillStyle(0x75627e).fillRect(126, 47, 15, 14);
    g.fillStyle(0x997453).fillRect(96, 113, 24, 9);
    g.fillStyle(0x644b3e).fillRect(98, 122, 4, 12).fillRect(114, 122, 4, 12);
    g.fillStyle(0x7a5e48).fillRect(240, 48, 96, 48);
    g.fillStyle(0xc09a72)
      .fillRect(244, 50, 88, 4)
      .fillRect(244, 71, 88, 4)
      .fillRect(244, 91, 88, 5);
    const colors = [0x8a799a, 0xb68076, 0x9ba580, 0xc4b48b];
    for (let i = 0; i < 13; i++) {
      g.fillStyle(colors[i % 4]).fillRect(247 + i * 6, 56, 4, 14);
      g.fillStyle(colors[(i + 1) % 4]).fillRect(247 + i * 6, 77, 4, 12);
    }
    g.fillStyle(0x80664d).fillRect(264, 164, 72, 80);
    g.fillStyle(0xece3cf).fillRect(269, 169, 62, 65);
    g.fillStyle(0xb2a0c2).fillRect(269, 187, 62, 47);
    g.fillStyle(0xf8f0da).fillRect(275, 172, 49, 13);
    g.fillStyle(0x99846c).fillRect(242, 203, 20, 5);
    g.fillStyle(0x80664d).fillRect(243, 208, 4, 8).fillRect(257, 208, 4, 8);
    this.add.text(30, 272, 'VILA AURORA · QUARTO 01', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#493b32',
    });
  }
}
