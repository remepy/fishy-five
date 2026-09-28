import type { FishTranslationKey } from '@/localization/LocaleContext';

export const FISH_LIST: Array<{
  id: FishTranslationKey;
  /** Legacy display name; localized UI should use translations.fish[id]. */
  name: string;
  image: number;
}> = [
  { id: 'Garganel', name: 'גרגנל', image: require('../assets/images/fish/Garganel.webp') },
  { id: 'Bigeyes', name: 'עיניים גדולות', image: require('../assets/images/fish/Bigeyes.webp') },
  { id: 'BlueFish', name: 'כחולון', image: require('../assets/images/fish/BlueFish.webp') },
  { id: 'Blurb', name: 'בלורב', image: require('../assets/images/fish/Blurb.webp') },
  { id: 'Chick', name: 'ציפי', image: require('../assets/images/fish/Chick.webp') },
  { id: 'Chip', name: 'צ\'יפ', image: require('../assets/images/fish/Chip.webp') },
  { id: 'Classy', name: 'אלגנטי', image: require('../assets/images/fish/Classy.webp') },
  { id: 'Crimson', name: 'ארגמון', image: require('../assets/images/fish/Crimson.webp') },
  { id: 'Dude', name: 'בחור', image: require('../assets/images/fish/Dude.webp') },
  { id: 'Finesse', name: 'פינסה', image: require('../assets/images/fish/Finesse.webp') },
  { id: 'Frog', name: 'צפרדע', image: require('../assets/images/fish/Frog.webp') },
  { id: 'GingerFish', name: 'ג\'ינג\'י', image: require('../assets/images/fish/GingerFish.webp') },
  { id: 'Golden', name: 'זהוב', image: require('../assets/images/fish/Golden.webp') },
  { id: 'Goldie', name: 'גולדי', image: require('../assets/images/fish/Goldie.webp') },
  { id: 'Grumpion', name: 'מרגני', image: require('../assets/images/fish/Grumpion.webp') },
  { id: 'Lasty', name: 'לאסטי', image: require('../assets/images/fish/Lasty.webp') },
  { id: 'Lighter', name: 'לייטר', image: require('../assets/images/fish/Lighter.webp') },
  { id: 'Multi', name: 'צבעוני', image: require('../assets/images/fish/Multi.webp') },
  { id: 'OrangeFish', name: 'כתמתם', image: require('../assets/images/fish/OrangeFish.webp') },
  { id: 'Pineapple', name: 'אננס', image: require('../assets/images/fish/Pineapple.webp') },
  { id: 'Pinkus', name: 'ורוד', image: require('../assets/images/fish/Pinkus.webp') },
  { id: 'Purple', name: 'סגלגל', image: require('../assets/images/fish/Purple.webp') },
  { id: 'Redeye', name: 'עין אדומה', image: require('../assets/images/fish/Redeye.webp') },
  { id: 'Scar', name: 'צלקת', image: require('../assets/images/fish/Scar.webp') },
  { id: 'Smudge', name: 'כתמי', image: require('../assets/images/fish/Smudge.webp') },
  { id: 'Spike', name: 'קוצי', image: require('../assets/images/fish/Spike.webp') },
  { id: 'SpikyFish', name: 'קוצן', image: require('../assets/images/fish/SpikyFish.webp') },
  { id: 'Stain', name: 'כתם', image: require('../assets/images/fish/Stain.webp') },
  { id: 'Stripes', name: 'פסים', image: require('../assets/images/fish/Stripes.webp') },
  { id: 'Sunny', name: 'שמשוני', image: require('../assets/images/fish/Sunny.webp') },
  { id: 'Tada', name: 'טדה', image: require('../assets/images/fish/Tada.webp') },
  { id: 'Thug', name: 'קשוח', image: require('../assets/images/fish/Thug.webp') },
  { id: 'Tiger', name: 'נמרי', image: require('../assets/images/fish/Tiger.webp') },
  { id: 'TurquoiseFish', name: 'טורקיז', image: require('../assets/images/fish/TurquoiseFish.webp') },
  { id: 'WildFin', name: 'פרוע', image: require('../assets/images/fish/WildFin.webp') },
  { id: 'YellowFin', name: 'זנב צהוב', image: require('../assets/images/fish/YellowFin.webp') },
  { id: 'Youngling', name: 'גורון', image: require('../assets/images/fish/Youngling.webp') },
  { id: 'Zebra', name: 'זברה', image: require('../assets/images/fish/Zebra.webp') },
];

// Decor artwork lives in assets/images/decor/ but is not rendered yet. It is
// deliberately not required from here: a static require ships the files in
// every export whether or not anything draws them.

export const BG_IMAGES = [
  require('../assets/images/BG01.webp'),
  require('../assets/images/BG02.webp'),
  require('../assets/images/BG03.webp'),
  require('../assets/images/BG04.webp'),
  require('../assets/images/BG05.webp'),
  require('../assets/images/BG06.webp'),
];
