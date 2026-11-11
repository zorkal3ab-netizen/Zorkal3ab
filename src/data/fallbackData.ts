import { ResourceItem, CategoryItem, SiteSettings } from '../types';

export const FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', slug: 'mods', name: 'المودات', icon: 'Sword', description: 'مودات وإضافات ماين كرافت بدروك والكمبيوتر', sort_order: 1, item_count: 0 },
  { id: 'cat-2', slug: 'maps', name: 'المابات', icon: 'Compass', description: 'مابات مغامرات وباركور وتحديات', sort_order: 2, item_count: 0 },
  { id: 'cat-3', slug: 'shaders', name: 'الشيدرات', icon: 'Sparkles', description: 'شيدرات واقعية وتحسين إضاءة الجوال والكمبيوتر', sort_order: 3, item_count: 0 },
  { id: 'cat-4', slug: 'textures', name: 'التكستشر', icon: 'Layers', description: 'حزم رسوميات وتكستشر باك عالية الدقة', sort_order: 4, item_count: 0 },
  { id: 'cat-5', slug: 'skins', name: 'السكنات', icon: 'User', description: 'سكنات شخصيات ماين كرافت نادرة ومميزة', sort_order: 5, item_count: 0 },
  { id: 'cat-6', slug: 'addons', name: 'الإضافات', icon: 'Boxes', description: 'إضافات ومساعدات تقنية للعبة', sort_order: 6, item_count: 0 },
];

export const FALLBACK_RESOURCES: ResourceItem[] = [
  {
    id: 'res_city_expansion_v26',
    title: 'المدينه الحديثة',
    short_description: 'توسعة المدينة الحديثة City Expansion لماين كرافت بدروك يضيف أكثر من 1500+ بلوك وأثاث وسيارات وقطارات مترو واقعية.',
    full_description: 'توسعة المدينة الحديثة (City Expansion Add-On) لماين كرافت بدروك (Minecraft Bedrock).\n\nالمميزات الرئيسية:\n• أكثر من 1500+ بلوك جديد للبناء والتصميم الحضري.\n• أثاث متكامل للمنازل، والمكاتب، والمتاجر والمطاعم.\n• سيارات ومركبات قابلة للقيادة ودراجات نارية.\n• شبكة مترو أنفاق وقطارات حديثة قابلة للركوب.\n• شوارع تفاعلية مع إشارات مرور ومحطات وقود ومقاهي.\n\nطريقة التثبيت:\nحمل ملف mcaddon وافتحه مباشرة عبر ماين كرافت لتثبيت حزمة السلوك (Behavior) والموارد (Resource) تلقائيًا.',
    category_id: 'cat-1',
    category_slug: 'mods',
    mc_version: '26.60',
    supported_devices: 'Android / iOS / Windows 10/11',
    creator_name: 'ZORK Community',
    source_url: 'https://zorkcraft.net',
    license_info: 'Community License',
    cover_image: '/uploads/1017055164_1794181925516_61b98c0e640e.jpg',
    is_published: 1,
    is_featured: 1,
    install_instructions: 'افتح ملف mcaddon مباشرة باستخدام تطبيق ماين كرافت لتثبيته بنقرة واحدة.',
    changelog: 'تحديث 26.60: دعم كامل لأحدث إصدارات Minecraft Bedrock وإضافة مركبات ومترو أنفاق ومباني جديدة.',
    display_settings: {
      show_creator_name: true,
      show_file_size: true,
      show_mc_version: true,
      file_size_mb: '14 MB',
      version_badge: '1.0',
    },
    download_count: 11,
    real_download_count: 11,
    created_at: '2026-10-19T14:00:00.000Z',
    updated_at: '2026-10-19T14:00:00.000Z',
    images: [
      { id: 'img_1', image_url: '/uploads/1017055164_1794181925516_61b98c0e640e.jpg' },
      { id: 'img_2', image_url: '/uploads/1017055167_1794181943543_2b07528f12f5.jpg' },
      { id: 'img_3', image_url: '/uploads/1017055166_1794181943534_a5057948e63c.jpg' },
      { id: 'img_4', image_url: '/uploads/1017055165_1794181943518_2edd71f04e01.jpg' },
    ],
    files: [
      {
        id: 'file_city_expansion_addon',
        resource_id: 'res_city_expansion_v26',
        file_name: 'City_Expansion_v26.60.mcaddon',
        file_url: '/uploads/City_Expansion_v26.60.mcaddon',
        file_size: 14680064,
        file_type: 'mcaddon',
        version_tag: '26.60',
        is_external: 0,
        download_count: 11,
      },
      {
        id: 'file_city_expansion_mf',
        resource_id: 'res_city_expansion_v26',
        file_name: 'City_Expansion_v26.60 [MediaFire].mcaddon',
        file_url: 'https://www.mediafire.com/file/zork_city_expansion.mcaddon/file',
        file_size: 14680064,
        file_type: 'mediafire',
        version_tag: '26.60',
        is_external: 1,
        external_url: 'https://www.mediafire.com/file/zork_city_expansion.mcaddon/file',
      },
    ],
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: 'ZORK CRAFT — منصة مودات ماين كرافت',
  site_description: 'الموقع الرسمي لتحميل أفضل مودات ومابات وسكنات ماين كرافت بدروك للجوال والكمبيوتر بروابط مباشرة وآمنة.',
  announcement_text: 'مرحبًا بكم في منصة ZORK CRAFT! جميع الروابط مباشرة ومحدثة لآخر إصدارات ماين كرافت بدروك.',
  youtube_url: 'https://youtube.com/@zorkcraft',
  discord_url: 'https://discord.gg/zorkcraft',
  telegram_url: 'https://t.me/zorkcraft',
  theme_mode: 'dark',
};
