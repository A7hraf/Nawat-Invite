"use client";
import { useEffect, useRef, useState } from "react";
import { InvitationMusic, type MusicSource } from "./invitation/music";

/** Small play/stop button for trying a track in the studio. */
export function MusicPreview({ source, label }: { source: MusicSource; label: string }) {
  const ref = useRef<InvitationMusic | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => ref.current?.dispose(), []);
  return (
    <button type="button" className="btn btn-ghost btn-sm" aria-pressed={on} aria-label={`${on ? "Stop" : "Play"} ${label}`}
      onClick={() => {
        if (!ref.current) { ref.current = new InvitationMusic(source); ref.current.start(); setOn(true); return; }
        setOn(ref.current.toggle());
      }}>
      {on ? "Stop" : "Play"}
    </button>
  );
}
