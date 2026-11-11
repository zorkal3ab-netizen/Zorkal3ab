export interface ResourceFile {
  id: string;
  resource_id?: string;
  file_name: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  version_tag?: string;
  is_external?: boolean | number;
  external_url?: string;
  external_provider?: string;
  download_count?: number;
  created_at?: string;
}

export interface ResourceImage {
  id: string;
  resource_id?: string;
  image_url: string;
  alt_text?: string;
  sort_order?: number;
}

export interface ResourceItem {
  id: string;
  title: string;
  short_description: string;
  full_description: string;
  category_id?: string;
  category_slug: string;
  mc_version: string;
  supported_devices?: string;
  creator_name?: string;
  source_url?: string;
  license_info?: string;
  cover_image: string;
  is_published: boolean | number;
  is_featured: boolean | number;
  install_instructions?: string;
  changelog?: string;
  display_settings?: Record<string, any> | string;
  download_count?: number;
  real_download_count?: number;
  rating?: number;
  files?: ResourceFile[];
  images?: ResourceImage[];
  created_at?: string;
  updated_at?: string;
}

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  sort_order?: number;
  item_count?: number;
  color?: string;
}

export interface SiteSettings {
  site_title: string;
  site_description: string;
  announcement_text?: string;
  youtube_url?: string;
  discord_url?: string;
  telegram_url?: string;
  theme_mode?: string;
  [key: string]: any;
}
