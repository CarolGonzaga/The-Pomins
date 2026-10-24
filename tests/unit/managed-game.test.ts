import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { createManagedGame } from '@/features/room/managed-game';

afterEach(() => vi.unstubAllGlobals());
function environment(fail = false) {
  const document = new EventTarget();
  const window = { onblur: null as (() => void) | null, onfocus: null as (() => void) | null };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', window);
  let calls = 0;
  class Game {
    events = new EventEmitter();
    constructor() {
      this.start();
    }
    start() {
      document.addEventListener('visibilitychange', () => {
        calls++;
      });
      window.onblur = () => {};
      window.onfocus = () => {};
      if (fail) throw Error('Boot failed');
    }
  }
  const Phaser = {
    Game,
    Core: { Events: { DESTROY: 'destroy' } },
  } as unknown as typeof import('phaser');
  return {
    document,
    window,
    Phaser,
    emit: () => document.dispatchEvent(new Event('visibilitychange')),
    calls: () => calls,
  };
}
it('removes the owned visibility listener while retaining unrelated handlers', () => {
  const e = environment(),
    foreign = vi.fn(),
    original = e.document.addEventListener;
  e.document.addEventListener('visibilitychange', foreign);
  const game = createManagedGame(e.Phaser, {});
  expect(e.document.addEventListener).toBe(original);
  e.emit();
  expect(e.calls()).toBe(1);
  game.events.emit('destroy');
  e.emit();
  expect(e.calls()).toBe(1);
  expect(foreign).toHaveBeenCalledTimes(2);
  expect(e.window.onblur).toBeNull();
  expect(e.window.onfocus).toBeNull();
});
it('does not remove the newer game handlers or restore a retired game', () => {
  const e = environment(),
    first = createManagedGame(e.Phaser, {});
  const second = createManagedGame(e.Phaser, {}),
    newest = e.window.onblur;
  first.events.emit('destroy');
  expect(e.window.onblur).toBe(newest);
  e.emit();
  expect(e.calls()).toBe(1);
  second.events.emit('destroy');
  e.emit();
  expect(e.calls()).toBe(1);
  expect(e.window.onblur).toBeNull();
});
it('restores document methods and preexisting handlers when boot fails', () => {
  const e = environment(true),
    original = e.document.addEventListener,
    host = vi.fn();
  e.window.onblur = host;
  expect(() => createManagedGame(e.Phaser, {})).toThrow('Boot failed');
  expect(e.document.addEventListener).toBe(original);
  e.emit();
  expect(e.calls()).toBe(0);
  expect(e.window.onblur).toBe(host);
});
