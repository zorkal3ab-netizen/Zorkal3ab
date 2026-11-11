import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DB_PATH = path.resolve(process.cwd(), 'zorkcraft.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high performance and concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Dedicated Owner Backend Identity & Immutable User ID
export const NEW_OWNER_AUTH_EMAIL = (
  process.env.NEW_OWNER_AUTH_EMAIL || 'zork.l3b.craftwebsite95@gmail.com'
).trim().toLowerCase();
export const DEDICATED_OWNER_ID = 'usr_zork_owner_95_master';

export function initDatabase() {
  // Ensure uploads directory exists
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 1. Admin Account Table (Strict Owner Profile)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_account (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_temporary INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER NOT NULL DEFAULT 1,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      mfa_backup_codes TEXT,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure all columns exist for existing databases
  try {
    db.exec(`ALTER TABLE admin_account ADD COLUMN id TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_account ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_account ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_account ADD COLUMN mfa_secret TEXT DEFAULT NULL`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_account ADD COLUMN mfa_backup_codes TEXT DEFAULT NULL`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_account ADD COLUMN role TEXT NOT NULL DEFAULT 'owner'`);
  } catch {}

  // 2. Pending MFA Sessions Table (5-minute expiration during two-factor step)
  db.exec(`
    CREATE TABLE IF NOT EXISTS mfa_pending_sessions (
      token TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      ip_hash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mfa_pending_expires ON mfa_pending_sessions(expires_at);
  `);

  // 3. Admin Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT 'usr_zork_owner_95_master',
      email TEXT NOT NULL,
      mfa_verified INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT,
      ip_hash TEXT
    );
  `);
  try {
    db.exec(`ALTER TABLE admin_sessions ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'usr_zork_owner_95_master'`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admin_sessions ADD COLUMN mfa_verified INTEGER NOT NULL DEFAULT 1`);
  } catch {}

  // 4. Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title_ar TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 5. Resources Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_slug TEXT NOT NULL,
      mc_version TEXT NOT NULL,
      supported_devices TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      source_url TEXT,
      license_info TEXT,
      cover_image TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      install_instructions TEXT,
      changelog TEXT,
      display_settings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS idx_resources_published ON resources(is_published);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_slug);
    CREATE INDEX IF NOT EXISTS idx_resources_featured ON resources(is_featured);
  `);

  // 6. Resource Images
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_images (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
  `);

  // 7. Resource Download Files
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_files (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      file_type TEXT NOT NULL,
      version_tag TEXT NOT NULL,
      is_external INTEGER NOT NULL DEFAULT 0,
      external_provider TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
  `);

  // 8. Download Events
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'direct_download',
      ip_hash TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      user_agent TEXT,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_download_resource ON download_events(resource_id);
    CREATE INDEX IF NOT EXISTS idx_download_event_ip ON download_events(resource_id, ip_hash, downloaded_at);
  `);

  // 9. Security Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      details TEXT NOT NULL,
      severity TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 10. Website Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // =========================================================================
  // SAFE OWNER MIGRATION & PROVISIONING (Per Section 11 of Requirements)
  // =========================================================================
  const now = new Date().toISOString();

  // Inspect existing accounts
  const existingOwner = db.prepare('SELECT * FROM admin_account WHERE email = ?').get(NEW_OWNER_AUTH_EMAIL) as any;

  if (!existingOwner) {
    // Check if an older administrator account exists that needs to be safely migrated
    const oldOwner = db.prepare('SELECT * FROM admin_account WHERE email = ?').get('zorkal3ab@gmail.com') as any;

    // Initial starting password configured securely for dedicated owner provisioning
    // The owner must rotate this to their permanent >= 20 char password on first login
    const initialHash = oldOwner?.password_hash || bcrypt.hashSync('ZORKC26x0o0', 10);
    const initialIsTemp = 1; // Enforce mandatory password rotation per Section 2 & 11

    // Provision the dedicated owner account
    db.prepare(`
      INSERT OR REPLACE INTO admin_account (
        id, email, password_hash, is_temporary, email_verified, mfa_enabled, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 0, 'owner', ?, ?)
    `).run(DEDICATED_OWNER_ID, NEW_OWNER_AUTH_EMAIL, initialHash, initialIsTemp, now, now);

    // Revoke previous owner authorization if present to ensure exactly one owner
    if (oldOwner) {
      db.prepare('DELETE FROM admin_account WHERE email = ?').run('zorkal3ab@gmail.com');
      db.prepare('DELETE FROM admin_sessions WHERE email = ?').run('zorkal3ab@gmail.com');
      db.prepare(`
        INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'OWNER_MIGRATION_COMPLETED',
        'Successfully migrated authorized administration rights to dedicated owner identity. Previous authorizations revoked.',
        'HIGH',
        'SYSTEM_MIGRATION',
        now
      );
    } else {
      db.prepare(`
        INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'OWNER_PROVISIONED',
        'Dedicated owner identity provisioned with immutable ID and verified status.',
        'INFO',
        'SYSTEM_INIT',
        now
      );
    }
  } else {
    // Ensure immutable ID is set on existing record
    if (!existingOwner.id) {
      db.prepare('UPDATE admin_account SET id = ? WHERE email = ?').run(DEDICATED_OWNER_ID, NEW_OWNER_AUTH_EMAIL);
    }
    // Clean up any stray accounts to guarantee exactly one permanent owner
    db.prepare('DELETE FROM admin_account WHERE email != ?').run(NEW_OWNER_AUTH_EMAIL);
    db.prepare('DELETE FROM admin_sessions WHERE email != ?').run(NEW_OWNER_AUTH_EMAIL);
  }

  // Seed Categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const categoriesSeed = [
      {
        id: 'cat_mods',
        title_ar: 'مودات وإضافات',
        slug: 'mods',
        color: '#FF791F',
        icon_name: 'Puzzle',
        description_ar: 'إضافات ومودات Bedrock حصرية لتوسيع أسلوب اللعب وأنظمة المعارك.',
        order_index: 1,
      },
      {
        id: 'cat_shaders',
        title_ar: 'شيدرات وريـسورس باك',
        slug: 'shaders',
        color: '#8ADFFF',
        icon_name: 'Sparkles',
        description_ar: 'حزم شيدرات وإضاءة واقعية وقوام بدقة عالية لأجهزة البيدروك.',
        order_index: 2,
      },
      {
        id: 'cat_skins',
        title_ar: 'سكنات',
        slug: 'skins',
        color: '#9D72FF',
        icon_name: 'User',
        description_ar: 'سكنات شخصيات وتصاميم أسطورية منتقاة لمجتمع ZORK.',
        order_index: 3,
      },
      {
        id: 'cat_maps',
        title_ar: 'خرائط وعوالم',
        slug: 'maps',
        color: '#35D16F',
        icon_name: 'Map',
        description_ar: 'عوالم مغامرة، باركور، وخرائط سرفايفل وبناء متكاملة.',
        order_index: 4,
      },
      {
        id: 'cat_versions',
        title_ar: 'إصدارات ماينكرافت',
        slug: 'versions',
        color: '#C5CBD5',
        icon_name: 'Layers',
        description_ar: 'تحديثات وتفاصيل إصدارات Minecraft Bedrock الرسمية والتوافق.',
        order_index: 5,
      },
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (id, title_ar, slug, color, icon_name, description_ar, order_index)
      VALUES (@id, @title_ar, @slug, @color, @icon_name, @description_ar, @order_index)
    `);

    for (const cat of categoriesSeed) {
      insertCat.run(cat);
    }
  }

  // Seed default website settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM website_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: 'site_title', value: 'ZORK CRAFT' },
      { key: 'site_description', value: 'منصتك لاكتشاف إضافات ومحتوى Minecraft Bedrock.' },
      { key: 'youtube_url', value: 'https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr' },
      { key: 'sound_enabled_default', value: '0' },
      { key: 'ads_enabled', value: '0' },
      { key: 'max_gallery_images', value: '15' },
    ];
    const insertSetting = db.prepare('INSERT INTO website_settings (key, value) VALUES (?, ?)');
    for (const s of defaultSettings) {
      insertSetting.run(s.key, s.value);
    }
  }

  // Seed City Expansion Add-On matching screenshot if resources table is empty
  const resCount = db.prepare('SELECT COUNT(*) as count FROM resources').get() as { count: number };
  if (resCount.count === 0) {
    const resId = 'res_city_expansion_v26';
    const createdAt = '2026-10-19T14:00:00.000Z';
    db.prepare(`
      INSERT INTO resources (
        id, title, short_description, full_description, category_id, category_slug,
        mc_version, supported_devices, creator_name, source_url, license_info,
        cover_image, is_published, is_featured, install_instructions, changelog,
        display_settings, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, 1, 1, ?, ?,
        ?, ?, ?
      )
    `).run(
      resId,
      'المدينه الحديثة',
      'توسعة المدينة الحديثة City Expansion لماين كرافت بدروك يضيف أكثر من 1500+ بلوك وأثاث وسيارات وقطارات مترو واقعية.',
      'توسعة المدينة الحديثة (City Expansion Add-On) لماين كرافت بدروك (Minecraft Bedrock).\n\nالمميزات الرئيسية:\n• أكثر من 1500+ بلوك جديد للبناء والتصميم الحضري.\n• أثاث متكامل للمنازل، والمكاتب، والمتاجر والمطاعم.\n• سيارات ومركبات قابلة للقيادة ودراجات نارية.\n• شبكة مترو أنفاق وقطارات حديثة قابلة للركوب.\n• شوارع تفاعلية مع إشارات مرور ومحطات وقود ومقاهي.\n\nطريقة التثبيت:\nحمل ملف mcaddon وافتحه مباشرة عبر ماين كرافت لتثبيت حزمة السلوك (Behavior) والموارد (Resource) تلقائيًا.',
      'cat_mods',
      'mods',
      '26.60',
      'Android / iOS / Windows 10/11',
      'ZORK Community',
      'https://zorkcraft.net',
      'Community License',
      '/uploads/1017055164_1794181925516_61b98c0e640e.jpg',
      'افتح ملف mcaddon مباشرة باستخدام تطبيق ماين كرافت لتثبيته بنقرة واحدة.',
      'تحديث 26.60: دعم كامل لأحدث إصدارات Minecraft Bedrock وإضافة مركبات ومترو أنفاق ومباني جديدة.',
      JSON.stringify({ file_size_mb: '14 MB', version_badge: '1.0' }),
      createdAt,
      createdAt
    );

    // Gallery images
    const galleryImages = [
      '/uploads/1017055164_1794181925516_61b98c0e640e.jpg',
      '/uploads/1017055167_1794181943543_2b07528f12f5.jpg',
      '/uploads/1017055166_1794181943534_a5057948e63c.jpg',
      '/uploads/1017055165_1794181943518_2edd71f04e01.jpg',
    ];

    const insertImg = db.prepare(`
      INSERT INTO resource_images (id, resource_id, image_url, order_index, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    galleryImages.forEach((imgUrl, idx) => {
      insertImg.run(`img_city_${idx + 1}`, resId, imgUrl, idx, createdAt);
    });

    // File
    db.prepare(`
      INSERT INTO resource_files (
        id, resource_id, file_name, file_url, file_size, file_type, version_tag, is_external, external_provider, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'file_city_expansion_addon',
      resId,
      'City_Expansion_v26.60.mcaddon',
      '/uploads/City_Expansion_v26.60.mcaddon',
      14 * 1024 * 1024,
      'mcaddon',
      '26.60',
      0,
      null,
      createdAt
    );

    // Also add MediaFire mirror link
    db.prepare(`
      INSERT INTO resource_files (
        id, resource_id, file_name, file_url, file_size, file_type, version_tag, is_external, external_provider, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'file_city_expansion_mf',
      resId,
      'City_Expansion_v26.60 [MediaFire].mcaddon',
      'https://www.mediafire.com/file/zork_city_expansion.mcaddon/file',
      14 * 1024 * 1024,
      'mediafire',
      '26.60',
      1,
      'mediafire',
      createdAt
    );

    // Seed 11 download events matching the screenshot (التحميلات: 11)
    const insertDownload = db.prepare(`
      INSERT INTO download_events (resource_id, file_id, event_type, ip_hash, downloaded_at)
      VALUES (?, ?, 'direct_download', ?, ?)
    `);
    for (let i = 0; i < 11; i++) {
      insertDownload.run(resId, 'file_city_expansion_addon', `seed_ip_${i}`, createdAt);
    }
  }
}

