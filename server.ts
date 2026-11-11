import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './src/server/db';
import {
  loginOwner,
  verifyMfaLogin,
  initiateMfaEnrollment,
  confirmMfaEnrollment,
  revokeMfa,
  changeOwnerPassword,
  getAuthenticatedOwner,
  revokeSession,
  revokeAllOtherSessions,
  AdminAccount,
} from './src/server/auth';
import {
  isAllowedFilename,
  resolveFileExtension,
  sanitizeFilename,
  validateExternalUrl,
  hashIp,
} from './src/utils/security';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize SQLite tables and seed data
initDatabase();

// Basic middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static directories
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/assets', express.static(path.resolve(process.cwd(), 'public/assets')));

// Multer storage engine for file and image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    let ext = resolveFileExtension(file.originalname, file.mimetype);
    if (!ext) {
      ext = path.extname(file.originalname).toLowerCase();
    }
    const rawBase = path.basename(file.originalname, path.extname(file.originalname)) || 'file';
    const cleanBase = sanitizeFilename(rawBase);
    const randomHex = crypto.randomBytes(6).toString('hex');
    cb(null, `${cleanBase}_${Date.now()}_${randomHex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFilename(file.originalname, file.mimetype)) {
      return cb(
        new Error(
          `صيغة الملف "${file.originalname}" غير مدعومة. الصيغ المسموحة: .mcpack, .mcaddon, .mcworld, .zip, .png, .jpg, .webp`
        )
      );
    }
    cb(null, true);
  },
});

// Helper: Extract Client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Helper: Extract Token from Header or Cookie
function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/zork_admin_session=([^;]+)/);
    if (match) return match[1];
  }
  return undefined;
}

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  owner?: AdminAccount;
}

function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const owner = getAuthenticatedOwner(token);
  if (!owner) {
    return res.status(401).json({
      success: false,
      error: 'غير مصرح بالوصول. لوحة التحكم مخصصة لمالك الموقع فقط.',
    });
  }
  req.owner = owner;
  next();
}

/* ==========================================================================
   AUTHENTICATION ENDPOINTS
   ========================================================================== */

// 1. Owner Secure Password Login (Step 1)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const result = loginOwner(email, password, ip, userAgent);
  return res.json(result);
});

// Backward compatibility alias for step1
app.post('/api/auth/login-step1', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const result = loginOwner(email, password, ip, userAgent);
  return res.json(result);
});

// 2. Owner MFA Verification (Step 2 - TOTP or Recovery Code)
app.post('/api/auth/mfa/verify', (req: Request, res: Response) => {
  const { mfaSessionToken, code } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const result = verifyMfaLogin(mfaSessionToken, code, ip, userAgent);
  return res.json(result);
});

// 3. Initiate MFA Setup (Owner Protected)
app.post('/api/auth/mfa/setup', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await initiateMfaEnrollment(req.owner!.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'تعذر إنشاء رمز التحقق الثنائي.' });
  }
});

// 4. Confirm MFA Setup with initial OTP (Owner Protected)
app.post('/api/auth/mfa/confirm', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body;
  const ip = getClientIp(req);
  const result = confirmMfaEnrollment(req.owner!.id, code, ip);
  return res.json(result);
});

// 5. Revoke / Deactivate MFA (Owner Protected, Password Confirmed)
app.post('/api/auth/mfa/revoke', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword } = req.body;
  const ip = getClientIp(req);
  const result = revokeMfa(req.owner!.id, currentPassword, ip);
  return res.json(result);
});

// 6. Change Password (Mandatory initial rotation or security update)
app.post('/api/auth/change-password', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const ip = getClientIp(req);
  const result = changeOwnerPassword(req.owner!.id, currentPassword, newPassword, ip);
  return res.json(result);
});

// 7. Check Current Auth Status
app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = extractToken(req);
  const owner = getAuthenticatedOwner(token);
  if (!owner) {
    return res.json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    role: owner.role,
    isTemporary: owner.is_temporary === 1,
    emailVerified: owner.email_verified === 1,
    mfaEnabled: owner.mfa_enabled === 1,
    createdAt: owner.created_at,
  });
});

// 8. Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    revokeSession(token);
  }
  return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
});

// 9. Revoke Other Sessions
app.post('/api/auth/revoke-other-sessions', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const token = extractToken(req);
  if (token) {
    revokeAllOtherSessions(req.owner!.id, token);
  }
  return res.json({ success: true, message: 'تم إنهاء جميع الجلسات الأخرى بنجاح.' });
});

/* ==========================================================================
   PUBLIC CATEGORIES AND WEBSITE SETTINGS
   ========================================================================== */

app.get('/api/categories', (_req: Request, res: Response) => {
  const categories = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM resources r WHERE r.category_id = c.id AND r.is_published = 1) as resource_count
    FROM categories c
    ORDER BY c.order_index ASC
  `).all();
  return res.json({ success: true, categories });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  const settingsRows = db.prepare('SELECT * FROM website_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const s of settingsRows) {
    settings[s.key] = s.value;
  }
  return res.json({ success: true, settings });
});

app.put('/api/settings', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'بيانات غير صالحة.' });
  }

  const upsert = db.prepare(`
    INSERT INTO website_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [key, value] of Object.entries(settings)) {
    upsert.run(key, String(value));
  }

  return res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح.' });
});

/* ==========================================================================
   PUBLIC & OWNER RESOURCE ENDPOINTS
   ========================================================================== */

export const DEFAULT_DISPLAY_SETTINGS = {
  show_creator_name: true,
  show_source_url: true,
  show_file_size: true,
  show_mc_version: true,
  show_supported_devices: true,
  show_requirements: true,
  show_install_instructions: true,
  show_changelog: true,
  show_license: true,
  show_gallery: true,
  show_related: true,
};

// 1. Get Resources List
app.get('/api/resources', (req: Request, res: Response) => {
  const { category, search, sort = 'latest', featured, includeDrafts } = req.query;
  const token = extractToken(req);
  const isOwner = !!getAuthenticatedOwner(token);

  let query = `
    SELECT r.*,
      c.title_ar as category_title,
      c.color as category_color,
      (SELECT COUNT(*) FROM download_events de WHERE de.resource_id = r.id) as real_download_count,
      (SELECT COUNT(*) FROM resource_images ri WHERE ri.resource_id = r.id) as image_count,
      (SELECT COUNT(*) FROM resource_files rf WHERE rf.resource_id = r.id) as file_count
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // If not owner or drafts not explicitly requested by owner, only return published
  if (!isOwner || includeDrafts !== 'true') {
    query += ' AND r.is_published = 1';
  }

  if (category && typeof category === 'string' && category !== 'all') {
    query += ' AND r.category_slug = ?';
    params.push(category);
  }

  if (featured === 'true' || featured === '1') {
    query += ' AND r.is_featured = 1';
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    query += ' AND (r.title LIKE ? OR r.short_description LIKE ? OR r.creator_name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  // Sorting
  if (sort === 'downloads') {
    query += ' ORDER BY real_download_count DESC, r.created_at DESC';
  } else if (sort === 'title') {
    query += ' ORDER BY r.title ASC';
  } else {
    // Default latest
    query += ' ORDER BY r.created_at DESC';
  }

  const rawResources = db.prepare(query).all(...params) as any[];
  const resources = rawResources.map((r) => {
    let display_settings = { ...DEFAULT_DISPLAY_SETTINGS };
    try {
      if (r.display_settings) {
        display_settings = { ...DEFAULT_DISPLAY_SETTINGS, ...JSON.parse(r.display_settings) };
      }
    } catch {}
    return { ...r, display_settings };
  });
  return res.json({ success: true, resources });
});

// 2. Get Single Resource Details
app.get('/api/resources/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const token = extractToken(req);
  const isOwner = !!getAuthenticatedOwner(token);

  const resource = db.prepare(`
    SELECT r.*,
      c.title_ar as category_title,
      c.color as category_color,
      (SELECT COUNT(*) FROM download_events de WHERE de.resource_id = r.id) as real_download_count
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    WHERE r.id = ?
  `).get(id) as any;

  if (!resource) {
    return res.status(404).json({ success: false, message: 'المورد غير موجود.' });
  }

  if (resource.is_published === 0 && !isOwner) {
    return res.status(404).json({ success: false, message: 'هذا المورد غير متاح حاليًا.' });
  }

  const images = db.prepare('SELECT * FROM resource_images WHERE resource_id = ? ORDER BY order_index ASC').all(id);
  const files = db.prepare('SELECT * FROM resource_files WHERE resource_id = ? ORDER BY created_at ASC').all(id);

  let display_settings = { ...DEFAULT_DISPLAY_SETTINGS };
  try {
    if (resource.display_settings) {
      display_settings = { ...DEFAULT_DISPLAY_SETTINGS, ...JSON.parse(resource.display_settings) };
    }
  } catch {}

  return res.json({
    success: true,
    resource: {
      ...resource,
      display_settings,
      images,
      files,
    },
  });
});

// 3. Create Resource (Owner Only)
app.post('/api/resources', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    short_description,
    full_description,
    category_id,
    mc_version,
    supported_devices,
    creator_name,
    source_url,
    license_info,
    cover_image,
    is_published,
    is_featured,
    install_instructions,
    changelog,
    display_settings,
    images = [],
    files = [],
  } = req.body;

  if (!title || !short_description || !category_id || !cover_image) {
    return res.status(400).json({
      success: false,
      message: 'الرجاء ملء الحقول الأساسية: العنوان، الوصف المختصر، القسم، وصورة الغلاف.',
    });
  }

  // Verify cover image exists if uploaded
  if (cover_image && typeof cover_image === 'string' && cover_image.startsWith('/uploads/')) {
    const diskPath = path.resolve(uploadsDir, path.basename(cover_image));
    if (!fs.existsSync(diskPath)) {
      return res.status(400).json({
        success: false,
        message: 'صورة الغلاف المحددة غير موجودة على وحدة التخزين. يرجى إعادة رفع الصورة.',
      });
    }
  }

  // Validate files and their storage or external URLs
  const validatedFiles: any[] = [];
  if (Array.isArray(files) && files.length > 0) {
    for (const f of files) {
      if (!f || !f.file_url) continue;

      if (f.is_external === 1 || f.file_type === 'external' || f.file_type === 'mediafire') {
        const urlValidation = validateExternalUrl(f.file_url);
        if (!urlValidation.valid) {
          return res.status(400).json({
            success: false,
            message: `رابط التحميل الخارجي للملف "${f.file_name}" غير صالح: ${urlValidation.message}`,
          });
        }
        validatedFiles.push({
          file_name: (f.file_name || 'Bedrock Resource').trim(),
          file_url: urlValidation.cleanUrl,
          file_size: f.file_size || 0,
          file_type: urlValidation.isMediaFire ? 'mediafire' : 'external',
          version_tag: f.version_tag || mc_version || '1.0',
          is_external: 1,
          external_provider: urlValidation.isMediaFire ? 'mediafire' : 'external_link',
        });
      } else {
        // Local uploaded file: verify it physically exists on disk
        if (f.file_url.startsWith('/uploads/')) {
          const diskPath = path.resolve(uploadsDir, path.basename(f.file_url));
          if (!fs.existsSync(diskPath)) {
            return res.status(400).json({
              success: false,
              message: `الملف "${f.file_name}" غير موجود على خادم التخزين. يرجى إعادة رفعه.`,
            });
          }
          let realSize = f.file_size;
          try {
            realSize = fs.statSync(diskPath).size;
          } catch {}

          validatedFiles.push({
            file_name: (f.file_name || 'Bedrock Resource').trim(),
            file_url: f.file_url,
            file_size: realSize,
            file_type: f.file_type || path.extname(f.file_name || '').replace('.', '') || 'mcpack',
            version_tag: f.version_tag || mc_version || '1.0',
            is_external: 0,
            external_provider: null,
          });
        }
      }
    }
  }

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id) as any;
  if (!category) {
    return res.status(400).json({ success: false, message: 'القسم المحدد غير موجود.' });
  }

  const resourceId = 'res_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  const savedDisplaySettings = JSON.stringify({ ...DEFAULT_DISPLAY_SETTINGS, ...(display_settings || {}) });

  const insertResource = db.prepare(`
    INSERT INTO resources (
      id, title, short_description, full_description, category_id, category_slug,
      mc_version, supported_devices, creator_name, source_url, license_info,
      cover_image, is_published, is_featured, install_instructions, changelog,
      display_settings, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  insertResource.run(
    resourceId,
    title.trim(),
    short_description.trim(),
    (full_description || short_description).trim(),
    category_id,
    category.slug,
    mc_version || '1.20+',
    supported_devices || 'Android / iOS / Windows 10/11',
    creator_name || 'ZORK Community',
    source_url || '',
    license_info || 'Community License',
    cover_image,
    is_published ? 1 : 0,
    is_featured ? 1 : 0,
    install_instructions || '',
    changelog || '',
    savedDisplaySettings,
    now,
    now
  );

  // Insert Gallery Images
  if (Array.isArray(images) && images.length > 0) {
    const insertImage = db.prepare(`
      INSERT INTO resource_images (id, resource_id, image_url, order_index, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    images.forEach((imgUrl: string, idx: number) => {
      insertImage.run('img_' + crypto.randomBytes(6).toString('hex'), resourceId, imgUrl, idx, now);
    });
  }

  // Insert Download Files
  if (validatedFiles.length > 0) {
    const insertFile = db.prepare(`
      INSERT INTO resource_files (
        id, resource_id, file_name, file_url, file_size, file_type, version_tag, is_external, external_provider, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    validatedFiles.forEach((f: any) => {
      insertFile.run(
        'file_' + crypto.randomBytes(6).toString('hex'),
        resourceId,
        f.file_name,
        f.file_url,
        f.file_size,
        f.file_type,
        f.version_tag,
        f.is_external,
        f.external_provider,
        now
      );
    });
  }

  // Audit Log
  const ip = hashIp(getClientIp(req));
  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('RESOURCE_CREATED', `Owner created resource: ${title} (${resourceId})`, 'INFO', ip, now);

  return res.json({ success: true, resourceId, message: 'تم إنشاء المورد بنجاح.' });
});

// 4. Update Resource (Owner Only)
app.put('/api/resources/:id', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    short_description,
    full_description,
    category_id,
    mc_version,
    supported_devices,
    creator_name,
    source_url,
    license_info,
    cover_image,
    is_published,
    is_featured,
    install_instructions,
    changelog,
    display_settings,
    images,
    files,
  } = req.body;

  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ success: false, message: 'المورد غير موجود.' });
  }

  const category = category_id ? db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id) as any : null;
  const now = new Date().toISOString();
  const serializedDisplaySettings = display_settings !== undefined ? JSON.stringify(display_settings) : null;

  db.prepare(`
    UPDATE resources SET
      title = COALESCE(?, title),
      short_description = COALESCE(?, short_description),
      full_description = COALESCE(?, full_description),
      category_id = COALESCE(?, category_id),
      category_slug = COALESCE(?, category_slug),
      mc_version = COALESCE(?, mc_version),
      supported_devices = COALESCE(?, supported_devices),
      creator_name = COALESCE(?, creator_name),
      source_url = COALESCE(?, source_url),
      license_info = COALESCE(?, license_info),
      cover_image = COALESCE(?, cover_image),
      is_published = COALESCE(?, is_published),
      is_featured = COALESCE(?, is_featured),
      install_instructions = COALESCE(?, install_instructions),
      changelog = COALESCE(?, changelog),
      display_settings = COALESCE(?, display_settings),
      updated_at = ?
    WHERE id = ?
  `).run(
    title,
    short_description,
    full_description,
    category_id,
    category ? category.slug : null,
    mc_version,
    supported_devices,
    creator_name,
    source_url,
    license_info,
    cover_image,
    is_published !== undefined ? (is_published ? 1 : 0) : null,
    is_featured !== undefined ? (is_featured ? 1 : 0) : null,
    install_instructions,
    changelog,
    serializedDisplaySettings,
    now,
    id
  );

  // Re-sync images if provided
  if (Array.isArray(images)) {
    db.prepare('DELETE FROM resource_images WHERE resource_id = ?').run(id);
    const insertImage = db.prepare(`
      INSERT INTO resource_images (id, resource_id, image_url, order_index, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    images.forEach((imgUrl: string, idx: number) => {
      insertImage.run('img_' + crypto.randomBytes(6).toString('hex'), id, imgUrl, idx, now);
    });
  }

  // Re-sync files if provided
  if (Array.isArray(files)) {
    const validatedFiles: any[] = [];
    for (const f of files) {
      if (!f || !f.file_url) continue;

      if (f.is_external === 1 || f.file_type === 'external' || f.file_type === 'mediafire') {
        const urlValidation = validateExternalUrl(f.file_url);
        if (!urlValidation.valid) {
          return res.status(400).json({
            success: false,
            message: `رابط التحميل الخارجي للملف "${f.file_name}" غير صالح: ${urlValidation.message}`,
          });
        }
        validatedFiles.push({
          file_name: (f.file_name || 'Bedrock Resource').trim(),
          file_url: urlValidation.cleanUrl,
          file_size: f.file_size || 0,
          file_type: urlValidation.isMediaFire ? 'mediafire' : 'external',
          version_tag: f.version_tag || mc_version || '1.0',
          is_external: 1,
          external_provider: urlValidation.isMediaFire ? 'mediafire' : 'external_link',
        });
      } else {
        if (f.file_url.startsWith('/uploads/')) {
          const diskPath = path.resolve(uploadsDir, path.basename(f.file_url));
          if (!fs.existsSync(diskPath)) {
            return res.status(400).json({
              success: false,
              message: `الملف "${f.file_name}" غير موجود على خادم التخزين.`,
            });
          }
          let realSize = f.file_size;
          try {
            realSize = fs.statSync(diskPath).size;
          } catch {}

          validatedFiles.push({
            file_name: (f.file_name || 'Bedrock Resource').trim(),
            file_url: f.file_url,
            file_size: realSize,
            file_type: f.file_type || path.extname(f.file_name || '').replace('.', '') || 'mcpack',
            version_tag: f.version_tag || mc_version || '1.0',
            is_external: 0,
            external_provider: null,
          });
        }
      }
    }

    db.prepare('DELETE FROM resource_files WHERE resource_id = ?').run(id);
    const insertFile = db.prepare(`
      INSERT INTO resource_files (
        id, resource_id, file_name, file_url, file_size, file_type, version_tag, is_external, external_provider, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    validatedFiles.forEach((f: any) => {
      insertFile.run(
        'file_' + crypto.randomBytes(6).toString('hex'),
        id,
        f.file_name,
        f.file_url,
        f.file_size,
        f.file_type,
        f.version_tag,
        f.is_external,
        f.external_provider,
        now
      );
    });
  }

  // Audit Log
  const ip = hashIp(getClientIp(req));
  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('RESOURCE_UPDATED', `Owner updated resource: ${id}`, 'INFO', ip, now);

  return res.json({ success: true, message: 'تم تحديث المورد بنجاح.' });
});

// 5. Delete Resource (Owner Only)
app.delete('/api/resources/:id', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT title FROM resources WHERE id = ?').get(id) as { title: string } | undefined;
  if (!existing) {
    return res.status(404).json({ success: false, message: 'المورد غير موجود.' });
  }

  db.prepare('DELETE FROM resources WHERE id = ?').run(id);

  const ip = hashIp(getClientIp(req));
  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('RESOURCE_DELETED', `Owner deleted resource: ${existing.title} (${id})`, 'WARNING', ip, new Date().toISOString());

  return res.json({ success: true, message: 'تم حذف المورد وكافة متعلقاته بنجاح.' });
});

// 6. Toggle Publish / Feature
app.post('/api/resources/:id/toggle-publish', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const resObj = db.prepare('SELECT is_published FROM resources WHERE id = ?').get(id) as { is_published: number } | undefined;
  if (!resObj) return res.status(404).json({ success: false, message: 'المورد غير موجود.' });

  const newState = resObj.is_published === 1 ? 0 : 1;
  db.prepare('UPDATE resources SET is_published = ?, updated_at = ? WHERE id = ?').run(newState, new Date().toISOString(), id);
  return res.json({ success: true, is_published: newState });
});

app.post('/api/resources/:id/toggle-feature', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const resObj = db.prepare('SELECT is_featured FROM resources WHERE id = ?').get(id) as { is_featured: number } | undefined;
  if (!resObj) return res.status(404).json({ success: false, message: 'المورد غير موجود.' });

  const newState = resObj.is_featured === 1 ? 0 : 1;
  db.prepare('UPDATE resources SET is_featured = ?, updated_at = ? WHERE id = ?').run(newState, new Date().toISOString(), id);
  return res.json({ success: true, is_featured: newState });
});

/* ==========================================================================
   FILE & IMAGE UPLOAD ENGINE
   ========================================================================== */

app.post('/api/upload', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'حجم الملف يتجاوز الحد الأقصى المسموح به (250 ميجابايت).',
        });
      }
      return res.status(400).json({
        success: false,
        message: `خطأ في رفع الملفات: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'فشل رفع الملفات، يرجى التأكد من الصيغة والمحاولة مجدداً.',
      });
    }

    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'لم يتم استلام أي ملفات للرفع.' });
    }

    // Verify all files were saved and exist on disk
    const uploadedFiles: any[] = [];
    for (const file of files) {
      const diskPath = path.resolve(uploadsDir, file.filename);
      if (!fs.existsSync(diskPath)) {
        return res.status(500).json({
          success: false,
          message: `تعذر حفظ الملف "${file.originalname}" في وحدة التخزين السحابية.`,
        });
      }
      uploadedFiles.push({
        originalName: file.originalname,
        fileName: file.filename,
        url: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        ext: path.extname(file.filename).toLowerCase(),
      });
    }

    const ip = hashIp(getClientIp(req));
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('FILES_UPLOADED', `Owner uploaded ${uploadedFiles.length} file(s)`, 'INFO', ip, new Date().toISOString());

    return res.json({
      success: true,
      files: uploadedFiles,
      url: uploadedFiles[0]?.url, // convenience for single uploads
    });
  });
});

// Delete uploaded media file from cloud storage (Owner Only)
app.delete('/api/upload', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { fileUrl } = req.body;
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
    return res.status(400).json({ success: false, message: 'مسار الملف غير صالح.' });
  }

  const filename = path.basename(fileUrl);
  const diskPath = path.resolve(uploadsDir, filename);

  // Security check: ensure path is strictly inside uploadsDir to prevent traversal
  if (!diskPath.startsWith(uploadsDir)) {
    return res.status(403).json({ success: false, message: 'محاولة غير مصرح بها للوصول إلى مسار غير مسموح.' });
  }

  if (fs.existsSync(diskPath)) {
    try {
      fs.unlinkSync(diskPath);
    } catch {
      return res.status(500).json({ success: false, message: 'تعذر حذف الملف من خادم التخزين.' });
    }
  }

  const ip = hashIp(getClientIp(req));
  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('FILE_DELETED', `Owner deleted file: ${filename}`, 'INFO', ip, new Date().toISOString());

  return res.json({ success: true, message: 'تم حذف الملف بنجاح من وحدة التخزين.' });
});

/* ==========================================================================
   REAL SECURE DOWNLOAD DELIVERY ENGINE
   ========================================================================== */

const handleDownloadRequest = (req: Request, res: Response) => {
  const resourceId = req.params.resourceId;
  let fileId = req.params.fileId;
  const token = extractToken(req);
  const isOwner = !!getAuthenticatedOwner(token);

  // 1. Verify resource exists
  const resource = db.prepare('SELECT is_published, title FROM resources WHERE id = ?').get(resourceId) as any;
  if (!resource) {
    return res.status(404).json({ success: false, message: 'المورد غير موجود.' });
  }

  // 2. Verify publication status
  if (resource.is_published === 0 && !isOwner) {
    return res.status(403).json({ success: false, message: 'المورد غير منشور حاليًا.' });
  }

  // If fileId not specified, take first file of the resource
  if (!fileId) {
    const firstFile = db.prepare('SELECT id FROM resource_files WHERE resource_id = ? ORDER BY id ASC LIMIT 1').get(resourceId) as any;
    if (firstFile) {
      fileId = firstFile.id;
    }
  }

  // 3. Verify file exists
  const file = db.prepare('SELECT * FROM resource_files WHERE id = ? AND resource_id = ?').get(fileId, resourceId) as any;
  if (!file) {
    return res.status(404).json({ success: false, message: 'الملف المطلوب غير موجود.' });
  }

  const clientIp = getClientIp(req);
  const ipHash = hashIp(clientIp);
  const now = new Date().toISOString();

  // 4. Rate-limit and duplicate protection: check if same IP requested within last 10 minutes
  const recentDownload = db.prepare(`
    SELECT id FROM download_events 
    WHERE resource_id = ? AND file_id = ? AND ip_hash = ? AND datetime(downloaded_at) > datetime('now', '-10 minutes')
  `).get(resourceId, fileId, ipHash);

  // 5. Deliver or redirect based on file type
  if (file.is_external === 1) {
    // Validate protocol and URL
    const urlValidation = validateExternalUrl(file.file_url);
    if (!urlValidation.valid) {
      return res.status(400).json({ success: false, message: 'رابط التحميل الخارجي غير آمن أو غير صالح.' });
    }

    // Record separate external download handoff event
    if (!recentDownload) {
      db.prepare(`
        INSERT INTO download_events (resource_id, file_id, event_type, ip_hash, downloaded_at, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(resourceId, fileId, 'external_handoff', ipHash, now, req.headers['user-agent'] || '');
    }

    // If client requested JSON (e.g. for smooth front-end redirect without iframe blocks)
    if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        redirectUrl: urlValidation.cleanUrl,
        isExternal: true,
        provider: file.external_provider || (urlValidation.isMediaFire ? 'mediafire' : 'external'),
      });
    }

    return res.redirect(urlValidation.cleanUrl!);
  }

  // Local file delivery: verify on disk first
  const diskPath = path.resolve(process.cwd(), file.file_url.replace(/^\//, ''));
  if (!fs.existsSync(diskPath)) {
    return res.status(404).json({ success: false, message: 'الملف غير موجود على خادم التخزين السحابي.' });
  }

  // Record genuine direct download event
  if (!recentDownload) {
    db.prepare(`
      INSERT INTO download_events (resource_id, file_id, event_type, ip_hash, downloaded_at, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(resourceId, fileId, 'direct_download', ipHash, now, req.headers['user-agent'] || '');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
  return res.sendFile(diskPath);
};

app.get('/api/download/:resourceId/:fileId', handleDownloadRequest);
app.get('/api/resources/:resourceId/download/:fileId', handleDownloadRequest);
app.get('/api/resources/:resourceId/download', handleDownloadRequest);


/* ==========================================================================
   OWNER DASHBOARD STATS & AUDIT LOGS
   ========================================================================== */

app.get('/api/admin/stats', requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const totalPublished = db.prepare('SELECT COUNT(*) as count FROM resources WHERE is_published = 1').get() as { count: number };
  const totalDrafts = db.prepare('SELECT COUNT(*) as count FROM resources WHERE is_published = 0').get() as { count: number };
  
  const categoryStats = db.prepare(`
    SELECT c.slug, c.title_ar, c.color, COUNT(r.id) as count
    FROM categories c
    LEFT JOIN resources r ON r.category_id = c.id AND r.is_published = 1
    GROUP BY c.id
  `).all();

  const totalDownloads = db.prepare('SELECT COUNT(*) as count FROM download_events').get() as { count: number };

  const topDownloaded = db.prepare(`
    SELECT r.id, r.title, r.cover_image, c.title_ar as category_title, COUNT(de.id) as downloads
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    LEFT JOIN download_events de ON de.resource_id = r.id
    WHERE r.is_published = 1
    GROUP BY r.id
    ORDER BY downloads DESC, r.created_at DESC
    LIMIT 5
  `).all();

  const latestResources = db.prepare(`
    SELECT r.id, r.title, r.is_published, r.is_featured, r.created_at, c.title_ar as category_title
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 6
  `).all();

  // Storage stats (file count and total size in uploads dir)
  let uploadsSize = 0;
  let fileCount = 0;
  if (fs.existsSync(uploadsDir)) {
    const fileList = fs.readdirSync(uploadsDir);
    fileCount = fileList.length;
    fileList.forEach((f) => {
      try {
        const stats = fs.statSync(path.join(uploadsDir, f));
        uploadsSize += stats.size;
      } catch {}
    });
  }

  return res.json({
    success: true,
    stats: {
      totalPublished: totalPublished.count,
      totalDrafts: totalDrafts.count,
      totalDownloads: totalDownloads.count,
      categoryStats,
      topDownloaded,
      latestResources,
      storage: {
        fileCount,
        totalBytes: uploadsSize,
        formattedSize: (uploadsSize / (1024 * 1024)).toFixed(2) + ' MB',
      },
    },
  });
});

app.get('/api/admin/audit-logs', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const logs = db.prepare(`
    SELECT * FROM security_audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  return res.json({ success: true, logs });
});

/* ==========================================================================
   VITE DEV MIDDLEWARE / STATIC ASSETS
   ========================================================================== */

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`⚔️ ZORK CRAFT Bedrock Server running on port ${PORT}`);
    console.log(`🛡️ Dedicated Owner Authentication Enforced (Immutable ID)`);
    console.log(`🗄️ SQLite Database: zorkcraft.db`);
    console.log(`📁 Uploads Directory: ${uploadsDir}`);
    console.log(`======================================================\n`);
  });
}

startServer();
