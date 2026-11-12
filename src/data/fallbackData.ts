import { ResourceItem, CategoryItem, SiteSettings } from '../types';

export const FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', slug: 'mods', name: 'المودات', icon: 'Sword', description: 'مودات ماين كرافت بدروك والكمبيوتر', sort_order: 1, item_count: 0 },
  { id: 'cat-2', slug: 'maps', name: 'المابات', icon: 'Compass', description: 'مابات مغامرات وباركور وتحديات', sort_order: 2, item_count: 0 },
  { id: 'cat-3', slug: 'shaders', name: 'الشيدرات', icon: 'Sparkles', description: 'شيدرات واقعية وتحسين إضاءة الجوال والكمبيوتر', sort_order: 3, item_count: 0 },
  { id: 'cat-4', slug: 'skins', name: 'السكنات', icon: 'User', description: 'سكنات شخصيات ماين كرافت نادرة ومميزة', sort_order: 4, item_count: 0 },
];

export const FALLBACK_RESOURCES: ResourceItem[] = [];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: 'ZORK CRAFT — منصة مودات ماين كرافت',
  site_description: 'الموقع الرسمي لتحميل أفضل مودات ومابات وسكنات ماين كرافت بدروك للجوال والكمبيوتر بروابط مباشرة وآمنة.',
  announcement_text: 'مرحبًا بكم في منصة ZORK CRAFT! جميع الروابط مباشرة ومحدثة لآخر إصدارات ماين كرافت بدروك.',
  youtube_url: 'https://youtube.com/@zorkcraft',
  discord_url: 'https://discord.gg/zorkcraft',
  telegram_url: 'https://t.me/zorkcraft',
  theme_mode: 'dark',
};
