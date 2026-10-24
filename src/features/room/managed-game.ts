// Phaser 3.90 registers an anonymous document visibility listener in Game.start,
// but Game.destroy does not remove it. Capture only registrations made during
// that synchronous call; restore the DOM method before returning to the browser.
// No changes to the scene, renderer, clock or Phaser dependency are required.
const phaserHandlers = new WeakSet<NonNullable<Window['onblur']>>();
export function createManagedGame(
  Phaser: typeof import('phaser'),
  config: import('phaser').Types.Core.GameConfig,
) {
  class ManagedGame extends Phaser.Game {
    override start() {
      const add = document.addEventListener;
      const listeners: {
        type: string;
        listener: EventListenerOrEventListenerObject;
        capture: boolean;
      }[] = [];
      const previousBlur =
        window.onblur && !phaserHandlers.has(window.onblur) ? window.onblur : null;
      const previousFocus =
        window.onfocus && !phaserHandlers.has(window.onfocus) ? window.onfocus : null;
      let ownedBlur: Window['onblur'], ownedFocus: Window['onfocus'];
      const cleanup = () => {
        for (const { type, listener, capture } of listeners)
          document.removeEventListener(type, listener, capture);
        if (window.onblur === ownedBlur) window.onblur = previousBlur;
        if (window.onfocus === ownedFocus) window.onfocus = previousFocus;
      };
      document.addEventListener = function (
        this: Document,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (listener && /^(?:webkit|moz|ms)?visibilitychange$/.test(type))
          listeners.push({
            type,
            listener,
            capture: typeof options === 'boolean' ? options : !!options?.capture,
          });
        if (listener) add.call(this, type, listener, options);
      } as typeof document.addEventListener;
      try {
        super.start();
      } catch (error) {
        ownedBlur = window.onblur;
        ownedFocus = window.onfocus;
        cleanup();
        throw error;
      } finally {
        document.addEventListener = add;
      }
      ownedBlur = window.onblur;
      ownedFocus = window.onfocus;
      if (ownedBlur) phaserHandlers.add(ownedBlur);
      if (ownedFocus) phaserHandlers.add(ownedFocus);
      // A newer game or another component may already own the window properties.
      this.events.once(Phaser.Core.Events.DESTROY, cleanup);
    }
  }
  return new ManagedGame(config);
}
