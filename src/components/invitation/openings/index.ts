import type { OpeningKind } from "@/themes/catalog";
import type { OpeningCallbacks, OpeningHandle, OpeningOptions } from "./common";

export type { OpeningCallbacks, OpeningHandle, OpeningOptions };

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

/** Loads the 3D scene for a theme lazily, so the invitation's first paint stays light. */
export async function mountOpening(kind: OpeningKind, canvas: HTMLCanvasElement, o: OpeningOptions, cb: OpeningCallbacks): Promise<OpeningHandle> {
  const { loadFonts } = await import("./common");
  await loadFonts(o.theme);
  switch (kind) {
    case "doors": return (await import("./doors")).mountDoors(canvas, o, cb);
    case "curtain": return (await import("./curtain")).mountCurtain(canvas, o, cb);
    case "box": return (await import("./box")).mountBox(canvas, o, cb);
    default: return (await import("./envelope")).mountEnvelope(canvas, o, cb);
  }
}
