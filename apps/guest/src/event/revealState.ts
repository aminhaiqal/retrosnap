import type { EventConfig } from "@/event/eventConfig";

export type RevealState = {
  isRevealed: boolean;
  revealAt: string;
};

export function getRevealState(eventConfig: EventConfig, now = new Date()): RevealState {
  const revealDate = new Date(eventConfig.revealAt);

  return {
    isRevealed: now >= revealDate,
    revealAt: eventConfig.revealAt,
  };
}
