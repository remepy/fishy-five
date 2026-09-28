/**
 * Transport layer for the Cyan Game Bridge (protocol v1).
 *
 * Game → app: `CyanGameBridge.postMessage(JSON.stringify({ type, data }))`
 * App → game: `window.cyanBridge.receive({ type, data })`
 *
 * When the host object is absent (QA opening the page in a desktop browser)
 * the game runs standalone and posts nothing.
 */

export const GAME_ID = 'fishy-five';
export const PROTOCOL_VERSION = 1;
/** How long the game waits for `session_start` after posting `game_ready`. */
export const SESSION_START_TIMEOUT_MS = 5000;

export type ExpectedLocale = 'he-IL' | 'en-US';

export interface SessionStart {
  protocolVersion: number;
  sessionId: string;
  expectedLocale: ExpectedLocale;
  levelIds: string[];
  reducedMotion: boolean;
  tutorialSeen: boolean;
}

export type AppMessage =
  | { type: 'session_start'; data: SessionStart }
  | { type: 'pause'; data?: undefined }
  | { type: 'resume'; data?: undefined }
  | { type: 'abort'; data: { reason: string } };

export type RoundStats = {
  totalTaps: number;
  wrongTaps: number;
  hintsUsed: number;
};

export type SessionStats = RoundStats & { rounds: number };

export type GameMessage =
  | { type: 'game_ready'; data: { gameId: string; protocolVersion: number; locale: string } }
  | { type: 'level_completed'; data: { levelId: string; outcome: 'won' | 'lost'; stats: RoundStats } }
  | { type: 'game_finished'; data: { lastCompletedLevelId: string; stats: SessionStats } }
  | { type: 'game_exit_requested'; data?: undefined }
  | { type: 'game_error'; data: { code: string; message: string } };

declare global {
  interface Window {
    CyanGameBridge?: { postMessage: (message: string) => void };
    cyanBridge?: { receive: (message: unknown) => void };
  }
}

/** True when the Flutter host injected its channel into this page. */
export function hasBridge(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.CyanGameBridge?.postMessage === 'function'
  );
}

let sealed = false;

/**
 * After `abort`, `game_error`, `game_exit_requested` or `game_finished` the
 * activity is over on the app side; nothing further may be posted.
 */
export function sealBridge(): void {
  sealed = true;
}

export function postToApp(message: GameMessage): void {
  if (sealed || !hasBridge()) return;
  const payload = message.data === undefined
    ? { type: message.type }
    : { type: message.type, data: message.data };
  try {
    window.CyanGameBridge!.postMessage(JSON.stringify(payload));
  } catch {
    // The channel disappeared mid-session; there is nobody left to tell.
  }
}

function isAppMessage(value: unknown): value is AppMessage {
  if (!value || typeof value !== 'object') return false;
  const { type } = value as { type?: unknown };
  return type === 'session_start' || type === 'pause' || type === 'resume' || type === 'abort';
}

/**
 * Defines `window.cyanBridge.receive`. Must run before `game_ready` is posted
 * so the app's reply always has somewhere to land. Returns an uninstaller.
 */
export function installReceiver(onMessage: (message: AppMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const receiver = {
    receive(raw: unknown) {
      let message = raw;
      if (typeof raw === 'string') {
        try {
          message = JSON.parse(raw);
        } catch {
          return;
        }
      }
      if (isAppMessage(message)) onMessage(message);
    },
  };
  window.cyanBridge = receiver;
  return () => {
    if (window.cyanBridge === receiver) delete window.cyanBridge;
  };
}

export function isValidSessionStart(data: unknown): data is SessionStart {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<SessionStart>;
  return (
    typeof d.protocolVersion === 'number' &&
    typeof d.sessionId === 'string' &&
    (d.expectedLocale === 'he-IL' || d.expectedLocale === 'en-US') &&
    Array.isArray(d.levelIds) &&
    d.levelIds.length > 0 &&
    d.levelIds.every(id => typeof id === 'string' && id.length > 0) &&
    typeof d.reducedMotion === 'boolean' &&
    typeof d.tutorialSeen === 'boolean'
  );
}
