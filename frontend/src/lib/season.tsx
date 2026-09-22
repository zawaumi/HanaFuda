import type { ReactNode } from "react";

export type Season = {
  id: string;
  name: string;
  color: string;
};

const seasons: Season[] = [
  { id: "pine", name: "松", color: "#3f6b52" },
  { id: "plum", name: "梅", color: "#b0524f" },
  { id: "cherry", name: "桜", color: "#bd6f79" },
  { id: "wisteria", name: "藤", color: "#7a72a6" },
  { id: "iris", name: "菖蒲", color: "#5b6ba3" },
  { id: "peony", name: "牡丹", color: "#a8517a" },
  { id: "clover", name: "萩", color: "#955f86" },
  { id: "pampas", name: "芒", color: "#6b7a82" },
  { id: "chrysanthemum", name: "菊", color: "#b5853c" },
  { id: "maple", name: "紅葉", color: "#a6503a" },
  { id: "willow", name: "柳", color: "#5f7f58" },
  { id: "paulownia", name: "桐", color: "#8a7b3f" },
];

const shapes: Record<string, ReactNode> = {
  pine: <><path d="M12 21v-8.5" /><path d="m6 12.5 6-4.5 6 4.5" /><path d="m7.5 8.5 4.5-4 4.5 4" /></>,
  plum: <><circle cx="12" cy="6.6" r="2.5" /><circle cx="17.1" cy="10.3" r="2.5" /><circle cx="15.2" cy="16.4" r="2.5" /><circle cx="8.8" cy="16.4" r="2.5" /><circle cx="6.9" cy="10.3" r="2.5" /></>,
  cherry: <g fill="currentColor" stroke="none"><ellipse cx="12" cy="7.4" rx="2.1" ry="3.3" /><ellipse cx="12" cy="7.4" rx="2.1" ry="3.3" transform="rotate(72 12 12)" /><ellipse cx="12" cy="7.4" rx="2.1" ry="3.3" transform="rotate(144 12 12)" /><ellipse cx="12" cy="7.4" rx="2.1" ry="3.3" transform="rotate(216 12 12)" /><ellipse cx="12" cy="7.4" rx="2.1" ry="3.3" transform="rotate(288 12 12)" /></g>,
  wisteria: <><path d="M12 3v3.4" /><circle cx="12" cy="8.6" r="2.2" /><circle cx="12" cy="13.3" r="1.7" /><circle cx="12" cy="17.2" r="1.3" /><circle cx="12" cy="20.3" r="0.9" /></>,
  iris: <><path d="M8.6 21c-1-6.3.2-11.2 3.4-14.6" /><path d="M15.6 21c.9-5.2.3-9.1-1.4-11.8" /><path d="m12 3.4-2.3 4.2h4.6z" /></>,
  peony: <><circle cx="12" cy="12" r="2.2" /><path d="M12 12a5 5 0 0 1 5-5 5 5 0 0 1-5 5Zm0 0a5 5 0 0 0-5-5 5 5 0 0 0 5 5Zm0 0a5 5 0 0 1 5 5 5 5 0 0 1-5-5Zm0 0a5 5 0 0 0-5 5 5 5 0 0 0 5-5Z" /></>,
  clover: <><path d="M12 21v-5.4" /><ellipse cx="12" cy="6.4" rx="2.5" ry="3.3" /><ellipse cx="7.3" cy="12.2" rx="2.5" ry="3.3" transform="rotate(-52 7.3 12.2)" /><ellipse cx="16.7" cy="12.2" rx="2.5" ry="3.3" transform="rotate(52 16.7 12.2)" /></>,
  pampas: <><circle cx="17.2" cy="6.4" r="3.1" /><path d="M3.6 21c.9-6.3 3.1-9.8 6.6-12" /><path d="M9.2 21c.2-5.2 1.4-8.2 3.6-10.3" /></>,
  chrysanthemum: <><circle cx="12" cy="12" r="2.2" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21M5.6 5.6l2.4 2.4M16 16l2.4 2.4M18.4 5.6 16 8M8 16l-2.4 2.4" /></>,
  maple: <><path d="M12 21v-3.6" /><path d="m12 17.4-5.2-3.7 1.5-1-3.8-2.9 2-.6-1.1-3.1 3.4 1.1L8.3 4l2.8 2.1L12 3.2l.9 2.9L15.7 4l-.5 3.2 3.4-1.1-1.1 3.1 2 .6-3.8 2.9 1.5 1z" /></>,
  willow: <><path d="M12 3.2V21" /><path d="M12 6.4c-3.1 2-4.7 6.1-4.7 12.1" /><path d="M12 6.4c3.1 2 4.7 6.1 4.7 12.1" /></>,
  paulownia: <><path d="M12 21v-4.6" /><path d="M12 16.4c-.9-3.4-.9-6.4 0-9.4.9 3 .9 6 0 9.4Z" /><path d="M7.9 16.6c-.8-3.2-.5-5.8.4-7.9 1 2.5 1.2 5 .4 7.9Z" /><path d="M16.1 16.6c.8-3.2.5-5.8-.4-7.9-1 2.5-1.2 5-.4 7.9Z" /></>,
};

export function seasonForIndex(index: number): Season {
  return seasons[index % seasons.length];
}

export function SeasonMark({ season, className }: { season: Season; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      role="img"
      aria-label={season.name}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[season.id]}
    </svg>
  );
}
