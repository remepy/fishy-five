/**
 * Typed view over the flat key/value map delivered by `./translations.json`.
 *
 * Copy is never compiled into the bundle: it is fetched at runtime from the
 * language directory the page was served from (see `loadTranslations.ts`).
 * This module only knows which keys the UI needs and how to shape them into
 * the object components consume. A missing key is a hard failure, never a
 * fallback string and never a raw key on screen.
 */

export type TextDirection = 'rtl' | 'ltr';

export const FISH_IDS = [
  'Garganel', 'Bigeyes', 'BlueFish', 'Blurb', 'Chick', 'Chip', 'Classy',
  'Crimson', 'Dude', 'Finesse', 'Frog', 'GingerFish', 'Golden', 'Goldie',
  'Grumpion', 'Lasty', 'Lighter', 'Multi', 'OrangeFish', 'Pineapple', 'Pinkus',
  'Purple', 'Redeye', 'Scar', 'Smudge', 'Spike', 'SpikyFish', 'Stain',
  'Stripes', 'Sunny', 'Tada', 'Thug', 'Tiger', 'TurquoiseFish', 'WildFin',
  'YellowFin', 'Youngling', 'Zebra',
] as const;

export type FishTranslationKey = (typeof FISH_IDS)[number];

export interface Translations {
  app: { title: string };
  common: { back: string; tryAgain: string };
  goals: {
    title: string;
    fishAccessibility: (name: string, found: boolean) => string;
  };
  levelStart: { title: string; subtitle: string; start: string };
  completion: {
    title: string;
    subtitle: string;
    nextRound: string;
    playAgain: string;
    exit: string;
  };
  quit: {
    label: string;
    confirmTitle: string;
    confirmBody: string;
    confirmYes: string;
    confirmNo: string;
  };
  pause: { title: string };
  tutorial: {
    findFish: string;
    understood: string;
    navigation: string;
    tapFish: string;
    start: string;
    dontShowAgain: string;
  };
  buttons: {
    help: string;
    hint: string;
    musicOn: string;
    musicOff: string;
    moveUp: string;
    moveDown: string;
    moveLeft: string;
    moveRight: string;
    minimap: string;
    minimapCell: (column: number, row: number) => string;
  };
  errors: {
    title: string;
    message: string;
    retry: string;
    details: string;
    viewDetails: string;
    closeDetails: string;
    errorPrefix: string;
    stackTrace: string;
  };
  fish: Record<FishTranslationKey, string>;
}

/** Shape of `translations.json` as served next to each language's page. */
export interface TranslationsFile {
  locale: string;
  dir: TextDirection;
  keys: Record<string, string>;
}

export class TranslationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationsError';
  }
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Validates the parsed file and builds the typed translations object.
 * Throws `TranslationsError` when the document is malformed or any required
 * key is absent, listing every missing key so a bad upload is diagnosable
 * from a single log line.
 */
export function buildTranslations(raw: unknown): {
  locale: string;
  dir: TextDirection;
  translations: Translations;
} {
  if (!raw || typeof raw !== 'object') {
    throw new TranslationsError('translations document is not an object');
  }
  const file = raw as Partial<TranslationsFile>;
  if (typeof file.locale !== 'string' || !file.locale) {
    throw new TranslationsError('translations document has no locale');
  }
  if (file.dir !== 'rtl' && file.dir !== 'ltr') {
    throw new TranslationsError('translations document has no valid dir');
  }
  if (!file.keys || typeof file.keys !== 'object') {
    throw new TranslationsError('translations document has no keys map');
  }

  const keys = file.keys as Record<string, unknown>;
  const missing: string[] = [];
  const k = (key: string): string => {
    const value = keys[key];
    if (typeof value !== 'string') {
      missing.push(key);
      return '';
    }
    return value;
  };

  const fish = Object.fromEntries(
    FISH_IDS.map(id => [id, k(`fish.${id}`)]),
  ) as Record<FishTranslationKey, string>;

  const fishFound = k('goals.fishFound');
  const fishNotFound = k('goals.fishNotFound');
  const minimapCell = k('buttons.minimapCell');

  const translations: Translations = {
    app: { title: k('app.title') },
    common: { back: k('common.back'), tryAgain: k('common.tryAgain') },
    goals: {
      title: k('goals.title'),
      fishAccessibility: (name, found) =>
        fill(found ? fishFound : fishNotFound, { name }),
    },
    levelStart: {
      title: k('levelStart.title'),
      subtitle: k('levelStart.subtitle'),
      start: k('levelStart.start'),
    },
    completion: {
      title: k('completion.title'),
      subtitle: k('completion.subtitle'),
      nextRound: k('completion.nextRound'),
      playAgain: k('completion.playAgain'),
      exit: k('completion.exit'),
    },
    quit: {
      label: k('quit.label'),
      confirmTitle: k('quit.confirmTitle'),
      confirmBody: k('quit.confirmBody'),
      confirmYes: k('quit.confirmYes'),
      confirmNo: k('quit.confirmNo'),
    },
    pause: { title: k('pause.title') },
    tutorial: {
      findFish: k('tutorial.findFish'),
      understood: k('tutorial.understood'),
      navigation: k('tutorial.navigation'),
      tapFish: k('tutorial.tapFish'),
      start: k('tutorial.start'),
      dontShowAgain: k('tutorial.dontShowAgain'),
    },
    buttons: {
      help: k('buttons.help'),
      hint: k('buttons.hint'),
      musicOn: k('buttons.musicOn'),
      musicOff: k('buttons.musicOff'),
      moveUp: k('buttons.moveUp'),
      moveDown: k('buttons.moveDown'),
      moveLeft: k('buttons.moveLeft'),
      moveRight: k('buttons.moveRight'),
      minimap: k('buttons.minimap'),
      minimapCell: (column, row) => fill(minimapCell, { column, row }),
    },
    errors: {
      title: k('errors.title'),
      message: k('errors.message'),
      retry: k('errors.retry'),
      details: k('errors.details'),
      viewDetails: k('errors.viewDetails'),
      closeDetails: k('errors.closeDetails'),
      errorPrefix: k('errors.errorPrefix'),
      stackTrace: k('errors.stackTrace'),
    },
    fish,
  };

  if (missing.length) {
    throw new TranslationsError(`translations missing keys: ${missing.join(', ')}`);
  }

  return { locale: file.locale, dir: file.dir, translations };
}
