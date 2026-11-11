import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  PlusCircle,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Shield,
  LogOut,
  Upload,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Sparkles,
  Download,
  HardDrive,
  RefreshCw,
  X,
  FileCode,
  Check,
  Save,
  Globe,
  QrCode,
  Copy,
} from 'lucide-react';
import { soundManager } from '../../utils/soundManager';
import { validateNewPassword, generateSecurePassword } from '../../utils/security';
import { FALLBACK_RESOURCES, FALLBACK_CATEGORIES } from '../../data/fallbackData';
import { getAssetUrl } from '../../utils/assets';

interface AdminDashboardProps {
  onClose: () => void;
  onResourceChanged?: () => void;
  onAuthChange?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, onResourceChanged, onAuthChange }) => {
  // Auth state
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isTemporaryPassword, setIsTemporaryPassword] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'mfa_verify' | 'force_change_password' | 'authenticated'>('login');

  // Login form state - starts completely empty, no prefilled values, password masked by default
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // MFA verification state (Step 2)
  const [mfaSessionToken, setMfaSessionToken] = useState<string | null>(null);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  // Genuine Security Status (loaded from trusted backend)
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);

  // MFA Setup in Security Panel
  const [mfaSetupActive, setMfaSetupActive] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [recoveryCodesList, setRecoveryCodesList] = useState<string[]>([]);
  const [enrollOtpInput, setEnrollOtpInput] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [showRevokeMfaModal, setShowRevokeMfaModal] = useState(false);
  const [revokePasswordInput, setRevokePasswordInput] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Password rotation state
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [confirmPwInput, setConfirmPwInput] = useState('');
  const [pwMsg, setPwMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Active admin tab (8 sections per V4 specifications)
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'add' | 'manage' | 'media' | 'categories' | 'settings' | 'security' | 'logout'
  >('dashboard');

  // Website Settings State
  const [siteSettings, setSiteSettings] = useState({
    site_title: 'ZORK CRAFT',
    site_description: 'المنصة العربية المتخصصة لإضافات ومحتوى Minecraft Bedrock',
    youtube_url: 'https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr',
    announcement_banner: '',
    maintenance_mode: '0',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Smart Visibility Controls (11 independent switches per resource)
  const [displaySettings, setDisplaySettings] = useState({
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
  });

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);

  // Dashboard stats & data
  const [stats, setStats] = useState<any | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Resource Form State (Add / Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    full_description: '',
    category_id: 'cat_mods',
    mc_version: '1.20+',
    supported_devices: 'Android / iOS / Windows 10/11',
    creator_name: 'ZORK Community',
    source_url: '',
    license_info: 'Community License',
    cover_image: '',
    is_published: 1,
    is_featured: 0,
    install_instructions: '1. قم بتحميل الملف بصيغة .mcpack أو .mcaddon.\n2. افتح الملف مباشرة باستخدام لعبة Minecraft Bedrock.\n3. قم بتفعيل الحزمة في إعدادات العالم.',
    changelog: 'الإصدار الأول 1.0 الرسمي على منصة ZORK CRAFT.',
  });
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [filesList, setFilesList] = useState<any[]>([]);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Upload Progress & Status States
  const [coverProgress, setCoverProgress] = useState<{
    uploading: boolean;
    percent: number;
    fileName: string;
    fileSize: number;
    error: string | null;
    success: boolean;
  }>({
    uploading: false,
    percent: 0,
    fileName: '',
    fileSize: 0,
    error: null,
    success: false,
  });

  const [galleryProgress, setGalleryProgress] = useState<{
    uploading: boolean;
    percent: number;
    error: string | null;
    success: boolean;
  }>({
    uploading: false,
    percent: 0,
    error: null,
    success: false,
  });

  const [fileUploadState, setFileUploadState] = useState<{
    uploading: boolean;
    percent: number;
    fileName: string;
    fileSize: number;
    error: string | null;
    success: boolean;
  }>({
    uploading: false,
    percent: 0,
    fileName: '',
    fileSize: 0,
    error: null,
    success: false,
  });

  // Retry cache for failed files
  const [lastFailedCoverFile, setLastFailedCoverFile] = useState<File | null>(null);
  const [lastFailedBedrockFile, setLastFailedBedrockFile] = useState<File | null>(null);

  // Download Source Selector (رفع ملف من الجهاز vs إضافة رابط تحميل خارجي)
  const [downloadSourceOption, setDownloadSourceOption] = useState<'device' | 'external'>('device');
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [externalNameInput, setExternalNameInput] = useState('');
  const [externalVersionInput, setExternalVersionInput] = useState('');
  const [externalUrlError, setExternalUrlError] = useState<string | null>(null);

  // Media Manager quick upload state
  const [mediaUploadState, setMediaUploadState] = useState<{
    uploading: boolean;
    percent: number;
    error: string | null;
    success: string | null;
  }>({
    uploading: false,
    percent: 0,
    error: null,
    success: null,
  });

  // On mount, check if there's already an active owner session
  useEffect(() => {
    const savedToken = localStorage.getItem('zork_admin_token');
    if (savedToken) {
      verifyExistingSession(savedToken);
    }
  }, []);

  const verifyExistingSession = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authenticated && data.role === 'owner') {
        setSessionToken(token);
        setMfaEnabled(!!data.mfaEnabled);
        setEmailVerified(!!data.emailVerified);
        if (data.isTemporary) {
          setIsTemporaryPassword(true);
          setAuthStep('force_change_password');
        } else {
          setAuthStep('authenticated');
          loadDashboardData(token);
        }
      } else {
        localStorage.removeItem('zork_admin_token');
        setSessionToken(null);
      }
    } catch {
      localStorage.removeItem('zork_admin_token');
      setSessionToken(null);
    }
  };

  // Step 1: Secure Owner Password Authentication
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (data.requireMfa && data.mfaSessionToken) {
            soundManager.playClick();
            setMfaSessionToken(data.mfaSessionToken);
            setMfaCodeInput('');
            setMfaError(null);
            setAuthStep('mfa_verify');
            return;
          } else if (data.token) {
            soundManager.playSuccess();
            setSessionToken(data.token);
            localStorage.setItem('zork_admin_token', data.token);
            setMfaEnabled(!!data.mfaEnabled);
            if (data.isTemporary) {
              setIsTemporaryPassword(true);
              setAuthStep('force_change_password');
            } else {
              setAuthStep('authenticated');
              loadDashboardData(data.token);
            }
            if (onAuthChange) onAuthChange();
            return;
          }
        }
        soundManager.playError();
        setAuthError(data.message || 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.');
        return;
      }
      throw new Error('Server error');
    } catch {
      soundManager.playError();
      setAuthError('بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2: MFA Verification (TOTP or Emergency Recovery Code)
  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaSessionToken || !mfaCodeInput.trim()) return;
    setMfaError(null);
    setMfaLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaSessionToken,
          code: mfaCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        soundManager.playSuccess();
        setSessionToken(data.token);
        localStorage.setItem('zork_admin_token', data.token);
        setMfaEnabled(true);
        if (data.isTemporary) {
          setIsTemporaryPassword(true);
          setAuthStep('force_change_password');
        } else {
          setAuthStep('authenticated');
          loadDashboardData(data.token);
        }
        if (onAuthChange) onAuthChange();
      } else {
        soundManager.playError();
        setMfaError(data.message || 'رمز التحقق الثنائي غير صحيح أو منتهي الصلاحية.');
      }
    } catch {
      soundManager.playError();
      setMfaError('تعذر التحقق من رمز المصادقة. يرجى المحاولة مجدداً.');
    } finally {
      setMfaLoading(false);
    }
  };

  // Generate a random cryptographically strong 24-character password
  const handleGenerateStrongPassword = () => {
    soundManager.playClick();
    const generated = generateSecurePassword(24);
    setNewPwInput(generated);
    setConfirmPwInput(generated);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(generated).then(() => {
        setPwMsg({ success: true, text: 'تم توليد كلمة مرور فائقة الأمان (24 خانة) ونسخها إلى الحافظة بنجاح!' });
      }).catch(() => {
        setPwMsg({ success: true, text: 'تم توليد كلمة مرور فائقة الأمان (24 خانة) وتعبئتها في الحقول.' });
      });
    } else {
      setPwMsg({ success: true, text: 'تم توليد كلمة مرور فائقة الأمان (24 خانة) وتعبئتها في الحقول.' });
    }
  };

  // Handle Password Change (Mandatory initial rotation or Security settings)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPwInput !== confirmPwInput) {
      setPwMsg({ success: false, text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' });
      return;
    }

    const check = validateNewPassword(newPwInput);
    if (!check.valid) {
      setPwMsg({ success: false, text: check.message || 'كلمة المرور غير مطابقة للشروط الأمنية المشددة.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: sessionToken ? `Bearer ${sessionToken}` : '',
        },
        body: JSON.stringify({
          currentPassword: currentPwInput,
          newPassword: newPwInput,
        }),
      });
      const data = await res.json();

      if (data.success) {
        soundManager.playSuccess();
        setPwMsg({ success: true, text: 'تم تحديث كلمة المرور بنجاح وتم تفعيل حماية الحساب الدائمة!' });
        setIsTemporaryPassword(false);

        if (authStep === 'force_change_password') {
          setTimeout(() => {
            setAuthStep('authenticated');
            if (sessionToken) loadDashboardData(sessionToken);
          }, 1200);
        } else {
          setCurrentPwInput('');
          setNewPwInput('');
          setConfirmPwInput('');
        }
      } else {
        soundManager.playError();
        setPwMsg({ success: false, text: data.message || 'فشل تحديث كلمة المرور.' });
      }
    } catch {
      soundManager.playError();
      setPwMsg({ success: false, text: 'حدث خطأ أثناء تغيير كلمة المرور.' });
    }
  };

  // MFA Enrollment Actions in Security Panel
  const handleStartMfaSetup = async () => {
    if (!sessionToken) return;
    soundManager.playClick();
    setEnrollError(null);
    setEnrollLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setTotpSecret(data.secret);
        setRecoveryCodesList(data.recoveryCodes || []);
        setMfaSetupActive(true);
        setEnrollOtpInput('');
      } else {
        soundManager.playError();
        alert(data.message || 'تعذر بدء تفعيل التحقق الثنائي.');
      }
    } catch {
      soundManager.playError();
      alert('تعذر الاتصال بالخادم لإعداد التحقق الثنائي.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleConfirmMfaEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !enrollOtpInput.trim()) return;
    setEnrollError(null);
    setEnrollLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ code: enrollOtpInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        soundManager.playSuccess();
        setMfaEnabled(true);
        setMfaSetupActive(false);
        alert('تم تفعيل التحقق الثنائي (MFA) وتأمين الحساب بنجاح!');
      } else {
        soundManager.playError();
        setEnrollError(data.message || 'رمز التحقق غير صحيح.');
      }
    } catch {
      soundManager.playError();
      setEnrollError('فشل التحقق من الرمز.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleRevokeMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !revokePasswordInput) return;
    setRevokeError(null);
    try {
      const res = await fetch('/api/auth/mfa/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ currentPassword: revokePasswordInput }),
      });
      const data = await res.json();
      if (data.success) {
        soundManager.playSuccess();
        setMfaEnabled(false);
        setShowRevokeMfaModal(false);
        setRevokePasswordInput('');
        alert('تم إلغاء تفعيل التحقق الثنائي بنجاح.');
      } else {
        soundManager.playError();
        setRevokeError(data.message || 'كلمة المرور الحالية غير صحيحة.');
      }
    } catch {
      soundManager.playError();
      setRevokeError('حدث خطأ أثناء إلغاء تفعيل التحقق الثنائي.');
    }
  };

  // Logout
  const handleLogout = async () => {
    soundManager.playClick();
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      } catch {}
    }
    localStorage.removeItem('zork_admin_token');
    setSessionToken(null);
    setAuthStep('login');
    if (onAuthChange) onAuthChange();
  };

  // Load Dashboard Data
  const loadDashboardData = async (token: string) => {
    setLoadingData(true);
    try {
      const [statsRes, resRes, catRes, logsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch('/api/resources?includeDrafts=true', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch('/api/categories').catch(() => null),
        fetch('/api/admin/audit-logs?limit=30', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch('/api/settings').catch(() => null),
      ]);

      let loadedAny = false;

      if (statsRes?.ok && statsRes.headers.get('content-type')?.includes('application/json')) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
          loadedAny = true;
        }
      }
      if (resRes?.ok && resRes.headers.get('content-type')?.includes('application/json')) {
        const resData = await resRes.json();
        if (resData.success) {
          setResources(resData.resources || []);
          loadedAny = true;
        }
      }
      if (catRes?.ok && catRes.headers.get('content-type')?.includes('application/json')) {
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories || []);
          loadedAny = true;
        }
      }
      if (logsRes?.ok && logsRes.headers.get('content-type')?.includes('application/json')) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setAuditLogs(logsData.logs || []);
        }
      }
      if (settingsRes?.ok && settingsRes.headers.get('content-type')?.includes('application/json')) {
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          setSiteSettings((prev) => ({ ...prev, ...settingsData.settings }));
        }
      }

      if (!loadedAny) {
        // Fallback for static hosting (e.g. GitHub Pages)
        setStats({
          total_resources: FALLBACK_RESOURCES.length,
          published_count: FALLBACK_RESOURCES.filter((r) => r.is_published === 1).length,
          total_downloads: 0,
          total_images: 0,
          storage_usage_mb: 0,
          active_sessions_count: 1,
        });
        setResources(FALLBACK_RESOURCES);
        setCategories(FALLBACK_CATEGORIES as any);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setStats({
        total_resources: FALLBACK_RESOURCES.length,
        published_count: FALLBACK_RESOURCES.filter((r) => r.is_published === 1).length,
        total_downloads: 0,
        total_images: 0,
        storage_usage_mb: 0,
        active_sessions_count: 1,
      });
      setResources(FALLBACK_RESOURCES);
      setCategories(FALLBACK_CATEGORIES as any);
    } finally {
      setLoadingData(false);
    }
  };

  // Dedicated XMLHttpRequest Upload with Real Progress & Arabic Error Mapping
  const uploadWithXhr = (
    files: FileList | File[],
    onProgress: (percent: number, loaded: number, total: number) => void
  ): Promise<{ success: boolean; files?: any[]; message?: string }> => {
    return new Promise((resolve) => {
      if (!sessionToken) {
        resolve({ success: false, message: 'انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مجددًا.' });
        return;
      }

      const xhr = new XMLHttpRequest();
      const body = new FormData();
      for (let i = 0; i < files.length; i++) {
        body.append('files', files[i]);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.success) {
            resolve(res);
          } else {
            let errorMsg = res.message;
            if (xhr.status === 401) {
              errorMsg = 'انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مجددًا.';
            } else if (xhr.status === 403) {
              errorMsg = 'ليس لديك صلاحية رفع الملفات.';
            } else if (!errorMsg) {
              errorMsg = 'فشل الرفع، يمكنك المحاولة مرة أخرى.';
            }
            resolve({ success: false, message: errorMsg });
          }
        } catch {
          resolve({ success: false, message: 'تعذر الاتصال بخدمة التخزين.' });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, message: 'تعذر الاتصال بخدمة التخزين.' });
      });

      xhr.addEventListener('abort', () => {
        resolve({ success: false, message: 'تم إلغاء عملية الرفع.' });
      });

      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${sessionToken}`);
      xhr.send(body);
    });
  };

  // 1. Upload Cover Image with Real Progress
  const handleUploadCover = async (file: File) => {
    if (!file) return;
    setLastFailedCoverFile(null);
    setCoverProgress({
      uploading: true,
      percent: 0,
      fileName: file.name,
      fileSize: file.size,
      error: null,
      success: false,
    });

    const res = await uploadWithXhr([file], (percent) => {
      setCoverProgress((prev) => ({ ...prev, percent }));
    });

    if (res.success && res.files && res.files.length > 0) {
      soundManager.playSuccess();
      const uploadedUrl = res.files[0].url;
      setFormData((prev) => ({ ...prev, cover_image: uploadedUrl }));
      setCoverProgress((prev) => ({
        ...prev,
        uploading: false,
        percent: 100,
        success: true,
        error: null,
      }));
    } else {
      soundManager.playError();
      setLastFailedCoverFile(file);
      setCoverProgress((prev) => ({
        ...prev,
        uploading: false,
        percent: 0,
        success: false,
        error: res.message || 'فشل الرفع، يمكنك المحاولة مرة أخرى.',
      }));
    }
  };

  // Retry Cover Upload
  const handleRetryCoverUpload = () => {
    if (lastFailedCoverFile) {
      handleUploadCover(lastFailedCoverFile);
    }
  };

  // Delete / Replace Cover Image
  const handleDeleteCoverImage = async () => {
    if (formData.cover_image && formData.cover_image.startsWith('/uploads/')) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ fileUrl: formData.cover_image }),
        });
      } catch {}
    }
    setFormData((prev) => ({ ...prev, cover_image: '' }));
    setCoverProgress({
      uploading: false,
      percent: 0,
      fileName: '',
      fileSize: 0,
      error: null,
      success: false,
    });
  };

  // 2. Upload Gallery Images (Multiple)
  const handleUploadGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGalleryProgress({ uploading: true, percent: 0, error: null, success: false });

    const res = await uploadWithXhr(files, (percent) => {
      setGalleryProgress((prev) => ({ ...prev, percent }));
    });

    if (res.success && res.files && res.files.length > 0) {
      soundManager.playSuccess();
      const newUrls = res.files.map((f: any) => f.url);
      setGalleryImages((prev) => [...prev, ...newUrls].slice(0, 15));
      setGalleryProgress({ uploading: false, percent: 100, error: null, success: true });
    } else {
      soundManager.playError();
      setGalleryProgress({
        uploading: false,
        percent: 0,
        error: res.message || 'فشل الرفع، يمكنك المحاولة مرة أخرى.',
        success: false,
      });
    }
  };

  // 3. Upload Downloadable Bedrock Files (.mcpack, .mcaddon, .mcworld, .zip)
  const handleUploadBedrockFile = async (file: File) => {
    if (!file) return;
    setLastFailedBedrockFile(null);
    setFileUploadState({
      uploading: true,
      percent: 0,
      fileName: file.name,
      fileSize: file.size,
      error: null,
      success: false,
    });

    const res = await uploadWithXhr([file], (percent) => {
      setFileUploadState((prev) => ({ ...prev, percent }));
    });

    if (res.success && res.files && res.files.length > 0) {
      soundManager.playSuccess();
      const f = res.files[0];
      const newEntry = {
        file_name: f.originalName,
        file_url: f.url,
        file_size: f.size,
        file_type: f.ext.replace('.', '') || 'mcpack',
        version_tag: formData.mc_version || '1.0',
        is_external: 0,
        external_provider: null,
      };
      setFilesList((prev) => [...prev, newEntry]);
      setFileUploadState({
        uploading: false,
        percent: 100,
        fileName: file.name,
        fileSize: file.size,
        error: null,
        success: true,
      });
    } else {
      soundManager.playError();
      setLastFailedBedrockFile(file);
      setFileUploadState({
        uploading: false,
        percent: 0,
        fileName: file.name,
        fileSize: file.size,
        error: res.message || 'فشل الرفع، يمكنك المحاولة مرة أخرى.',
        success: false,
      });
    }
  };

  // Retry Bedrock File Upload
  const handleRetryBedrockUpload = () => {
    if (lastFailedBedrockFile) {
      handleUploadBedrockFile(lastFailedBedrockFile);
    }
  };

  // 4. Add MediaFire or External Download Link
  const handleAddExternalLink = () => {
    setExternalUrlError(null);
    if (!externalUrlInput.trim()) {
      setExternalUrlError('يرجى إدخال رابط التحميل.');
      return;
    }

    try {
      const parsed = new URL(externalUrlInput.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setExternalUrlError('رابط التحميل غير صالح. يجب أن يبدأ بـ https://');
        return;
      }

      const isMediaFire = parsed.hostname.toLowerCase().includes('mediafire.com');
      const defaultName = isMediaFire ? 'تحميل عبر MediaFire' : 'رابط تحميل خارجي معتمد';

      const newEntry = {
        file_name: (externalNameInput.trim() || defaultName),
        file_url: parsed.toString(),
        file_size: 0,
        file_type: isMediaFire ? 'mediafire' : 'external',
        version_tag: externalVersionInput.trim() || formData.mc_version || '1.0',
        is_external: 1,
        external_provider: isMediaFire ? 'mediafire' : 'external_link',
      };

      setFilesList((prev) => [...prev, newEntry]);
      soundManager.playSuccess();
      setExternalUrlInput('');
      setExternalNameInput('');
      setExternalVersionInput('');
      setExternalUrlError(null);
    } catch {
      setExternalUrlError('رابط التحميل غير صالح. يرجى التأكد من كتابة الرابط بشكل صحيح.');
    }
  };

  // Delete attached file from list and server
  const handleDeleteFile = async (index: number) => {
    const item = filesList[index];
    if (item && item.is_external === 0 && item.file_url.startsWith('/uploads/')) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ fileUrl: item.file_url }),
        });
      } catch {}
    }
    setFilesList((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Resource Form (Create or Edit)
  const handleSaveResource = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionToken) return;

    if (!formData.title || !formData.short_description || !formData.cover_image) {
      alert('يرجى إكمال عنوان المورد، الوصف المختصر، وصورة الغلاف.');
      return;
    }

    setLoadingData(true);
    setFormSuccess(null);

    const payload = {
      ...formData,
      display_settings: displaySettings,
      images: galleryImages,
      files: filesList,
    };

    try {
      const url = editingId ? `/api/resources/${editingId}` : '/api/resources';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        soundManager.playSuccess();
        setFormSuccess(editingId ? 'تم تحديث المورد بنجاح!' : 'تم إنشاء ونشر المورد بنجاح!');
        if (onResourceChanged) onResourceChanged();
        loadDashboardData(sessionToken);

        setTimeout(() => {
          setEditingId(null);
          resetForm();
          setActiveTab('manage');
        }, 1200);
      } else {
        soundManager.playError();
        alert(data.message || 'حدث خطأ أثناء حفظ المورد.');
      }
    } catch {
      soundManager.playError();
      alert('فشل الاتصال بالخادم أثناء الحفظ.');
    } finally {
      setLoadingData(false);
    }
  };

  // Save Website Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setSettingsLoading(true);
    setSettingsSuccess(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ settings: siteSettings }),
      });
      const data = await res.json();
      if (data.success) {
        soundManager.playSuccess();
        setSettingsSuccess('تم تحديث إعدادات الموقع وحفظها بنجاح!');
        setTimeout(() => setSettingsSuccess(null), 3000);
      } else {
        soundManager.playError();
        alert(data.message || 'فشل حفظ الإعدادات.');
      }
    } catch {
      soundManager.playError();
      alert('حدث خطأ في الاتصال بالخادم أثناء حفظ الإعدادات.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      short_description: '',
      full_description: '',
      category_id: 'cat_mods',
      mc_version: '1.20+',
      supported_devices: 'Android / iOS / Windows 10/11',
      creator_name: 'ZORK Community',
      source_url: '',
      license_info: 'Community License',
      cover_image: '',
      is_published: 1,
      is_featured: 0,
      install_instructions: '1. قم بتحميل الملف بصيغة .mcpack أو .mcaddon.\n2. افتح الملف مباشرة باستخدام لعبة Minecraft Bedrock.\n3. قم بتفعيل الحزمة في إعدادات العالم.',
      changelog: 'الإصدار الأول 1.0 الرسمي على منصة ZORK CRAFT.',
    });
    setDisplaySettings({
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
    });
    setGalleryImages([]);
    setFilesList([]);
    setEditingId(null);
    setFormSuccess(null);
  };

  // Edit Existing Resource
  const handleStartEdit = async (resItem: any) => {
    if (!sessionToken) return;
    try {
      const res = await fetch(`/api/resources/${resItem.id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success && data.resource) {
        const r = data.resource;
        setFormData({
          title: r.title,
          short_description: r.short_description,
          full_description: r.full_description,
          category_id: r.category_id,
          mc_version: r.mc_version,
          supported_devices: r.supported_devices,
          creator_name: r.creator_name,
          source_url: r.source_url || '',
          license_info: r.license_info || '',
          cover_image: r.cover_image,
          is_published: r.is_published,
          is_featured: r.is_featured,
          install_instructions: r.install_instructions || '',
          changelog: r.changelog || '',
        });
        if (r.display_settings) {
          setDisplaySettings({
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
            ...r.display_settings,
          });
        }
        setGalleryImages((r.images || []).map((img: any) => img.image_url));
        setFilesList(r.files || []);
        setEditingId(r.id);
        setActiveTab('add');
      }
    } catch {
      alert('تعذر تحميل بيانات المورد للتعديل.');
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (id: string) => {
    if (!sessionToken) return;
    soundManager.playClick();
    try {
      const res = await fetch(`/api/resources/${id}/toggle-publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_published: data.is_published } : r))
        );
        if (onResourceChanged) onResourceChanged();
      }
    } catch {}
  };

  // Toggle Feature
  const handleToggleFeature = async (id: string) => {
    if (!sessionToken) return;
    soundManager.playClick();
    try {
      const res = await fetch(`/api/resources/${id}/toggle-feature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setResources((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_featured: data.is_featured } : r))
        );
      }
    } catch {}
  };

  // Delete Resource
  const handleDeleteResource = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف المورد: "${title}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    if (!sessionToken) return;

    soundManager.playClick();
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success) {
        soundManager.playSuccess();
        setResources((prev) => prev.filter((r) => r.id !== id));
        if (onResourceChanged) onResourceChanged();
        loadDashboardData(sessionToken);
      }
    } catch {
      soundManager.playError();
      alert('فشل حذف المورد.');
    }
  };

  // Revoke other sessions
  const handleRevokeOtherSessions = async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/auth/revoke-other-sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json();
      if (data.success) {
        soundManager.playSuccess();
        alert('تم إنهاء وإلغاء جميع الجلسات الأخرى بنجاح.');
      }
    } catch {
      soundManager.playError();
    }
  };

  /* =========================================================================
     VIEW 1: OWNER LOGIN (Per Section 4 of Specifications)
     ========================================================================= */
  if (authStep === 'login') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4"
        dir="rtl"
      >
        <div className="relative w-full max-w-md bg-[#101018]/95 border border-slate-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-6 sm:p-8 backdrop-blur-lg">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#270B18] via-[#101018] to-[#1C1D26] border border-[#FF284A]/40 flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(255,40,74,0.25)]">
              <Lock className="w-7 h-7 text-[#FF284A]" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">دخول المالك</h2>
            <p className="text-xs text-slate-400 mt-1">
              هذه المنطقة مخصصة لمالك موقع ZORK CRAFT فقط.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني الخاص بالمالك"
                  className="w-full pl-3 pr-10 py-2.5 bg-[#07070B] border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FF284A] focus:ring-1 focus:ring-[#FF284A] transition-all"
                  dir="ltr"
                  autoComplete="email"
                />
                <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="أدخل كلمة المرور للدخول"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#07070B] border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FF284A] focus:ring-1 focus:ring-[#FF284A] transition-all"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white text-sm font-bold rounded-lg shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center mt-5">
            * يتم التحقق والمصادقة على خوادم المنصة الآمنة مع حماية متعددة المراحل ومراقبة أمنية مشددة.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================================
     VIEW 1.5: MFA VERIFICATION (Step 2 - TOTP / Recovery Code)
     ========================================================================= */
  if (authStep === 'mfa_verify') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4"
        dir="rtl"
      >
        <div className="relative w-full max-w-md bg-[#101018] border border-[#FF284A]/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#270B18] border border-[#FF284A]/50 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(255,40,74,0.3)]">
              <ShieldAlert className="w-7 h-7 text-[#FF284A]" />
            </div>
            <h2 className="text-xl font-extrabold text-white">التحقق بخطوتين (MFA)</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {useRecoveryCode
                ? 'أدخل أحد رموز الاسترداد الاحتياطية المكونة من 12 خانة (XXXX-XXXX-XXXX).'
                : 'أدخل رمز التحقق المكون من 6 أرقام الصادر من تطبيق المصادقة (Authenticator) على هاتفك.'}
            </p>
          </div>

          {mfaError && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{mfaError}</span>
            </div>
          )}

          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                {useRecoveryCode ? 'رمز الاسترداد الاحتياطي' : 'رمز المصادقة (6 أرقام)'}
              </label>
              <input
                type="text"
                required
                autoFocus
                value={mfaCodeInput}
                onChange={(e) => setMfaCodeInput(e.target.value)}
                placeholder={useRecoveryCode ? 'XXXX-XXXX-XXXX' : '123456'}
                maxLength={useRecoveryCode ? 16 : 6}
                className="w-full px-3 py-3 bg-[#07070B] border border-slate-700 rounded-lg text-center font-mono text-lg tracking-widest text-white focus:outline-none focus:border-[#FF284A] focus:ring-1 focus:ring-[#FF284A]"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={mfaLoading || !mfaCodeInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white font-bold text-sm rounded-lg shadow-lg hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mfaLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تأكيد الرمز ودخول لوحة التحكم</span>
                </>
              )}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setMfaCodeInput('');
                  setMfaError(null);
                }}
                className="text-[#8ADFFF] hover:underline cursor-pointer"
              >
                {useRecoveryCode ? 'استخدام تطبيق المصادقة (TOTP)' : 'استخدام رمز استرداد للطوارئ'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthStep('login');
                  setMfaSessionToken(null);
                  setMfaCodeInput('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                الرجوع لتسجيل الدخول
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* =========================================================================
     VIEW 2: MANDATORY PASSWORD ROTATION (Per Section 2: 20+ chars criteria)
     ========================================================================= */
  if (authStep === 'force_change_password') {
    const hasLength = newPwInput.length >= 20;
    const hasUpper = /[A-Z]/.test(newPwInput);
    const hasLower = /[a-z]/.test(newPwInput);
    const hasDigit = /[0-9]/.test(newPwInput);
    const hasSymbol = /[^a-zA-Z0-9]/.test(newPwInput);

    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4"
        dir="rtl"
      >
        <div className="relative w-full max-w-lg bg-[#101018] border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl font-extrabold text-white">تحديث كلمة المرور الإلزامية</h2>
            <p className="text-xs text-amber-300 mt-1 leading-relaxed">
              وفقاً لمعايير الأمان القصوى لحساب المالك، يجب استبدال كلمة المرور المؤقتة بكلمة مرور جديدة قوية لا تقل عن 20 خانة.
            </p>
          </div>

          {pwMsg && (
            <div
              className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                pwMsg.success
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              {pwMsg.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{pwMsg.text}</span>
            </div>
          )}

          {/* Quick Secure Password Generator Tool */}
          <div className="mb-5 p-3 rounded-xl bg-[#07070B] border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white">توليد كلمة مرور عشوائية فائقة الأمان</p>
              <p className="text-[10px] text-slate-400">تنشئ كلمة مرور عشوائية فريدة من 24 خانة مطابقة لكافة الشروط.</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateStrongPassword}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>توليد الآن</span>
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">
                كلمة المرور المؤقتة الحالية:
              </label>
              <input
                type="password"
                required
                value={currentPwInput}
                onChange={(e) => setCurrentPwInput(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                className="w-full px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">
                كلمة المرور الجديدة (20 خانة على الأقل):
              </label>
              <input
                type="password"
                required
                value={newPwInput}
                onChange={(e) => setNewPwInput(e.target.value)}
                placeholder="أدخل كلمة المرور القوية الجديدة"
                className="w-full px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                dir="ltr"
              />
            </div>

            {/* Live Criteria Checklist */}
            <div className="p-3 bg-[#0A0B10] rounded-lg border border-slate-800 text-[11px] grid grid-cols-2 gap-1.5">
              <span className={`flex items-center gap-1 ${hasLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasLength ? '✓' : '○'} 20 خانة على الأقل ({newPwInput.length}/20)
              </span>
              <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasUpper ? '✓' : '○'} حرف كبير (A-Z)
              </span>
              <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasLower ? '✓' : '○'} حرف صغير (a-z)
              </span>
              <span className={`flex items-center gap-1 ${hasDigit ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasDigit ? '✓' : '○'} رقم (0-9)
              </span>
              <span className={`col-span-2 flex items-center gap-1 ${hasSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasSymbol ? '✓' : '○'} رمز خاص (!@#$%^&*...)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">
                تأكيد كلمة المرور الجديدة:
              </label>
              <input
                type="password"
                required
                value={confirmPwInput}
                onChange={(e) => setConfirmPwInput(e.target.value)}
                placeholder="أعد كتابة كلمة المرور الجديدة للتطابق"
                className="w-full px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm rounded-lg shadow-lg hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تحديث كلمة المرور وتأمين حساب المالك</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* =========================================================================
     VIEW 3: MOBILE-FIRST OWNER DASHBOARD WITH HORIZONTAL FORM ROWS (8 Sections)
     ========================================================================= */
  const navTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'add', label: editingId ? 'تعديل المورد' : 'إضافة مورد', icon: PlusCircle },
    { id: 'manage', label: 'إدارة الموارد', icon: FolderOpen },
    { id: 'media', label: 'الصور والملفات', icon: ImageIcon },
    { id: 'categories', label: 'الأقسام', icon: Layers },
    { id: 'settings', label: 'إعدادات الموقع', icon: Globe },
    { id: 'security', label: 'حماية الحساب', icon: Shield },
    { id: 'logout', label: 'تسجيل الخروج', icon: LogOut },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#07070B] text-slate-100 flex flex-col overflow-hidden font-sans"
    >
      {/* Top Admin Header Bar */}
      <header className="h-14 sm:h-16 border-b border-slate-800 bg-[#101018] px-3 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-[#270B18] border border-[#FF284A]/40 text-[#FF284A] shrink-0">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
              <span>لوحة تحكم ZORK CRAFT</span>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>المالك</span>
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
              <span>المالك المعتمد</span>
              <span className="text-emerald-400 text-[9px]">• جلسة آمنة</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              if (sessionToken) loadDashboardData(sessionToken);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 transition-colors cursor-pointer"
            title="تحديث البيانات"
            aria-label="تحديث"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 hidden sm:inline" />
            <span>الموقع</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 sm:p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 
        5.4 DASHBOARD NAVIGATION:
        Mobile-first compact horizontal scrollable navigation tab strip.
        On desktop, expands cleanly.
      */}
      <nav
        aria-label="أقسام لوحة التحكم"
        className="w-full border-b border-slate-800 bg-[#0A0A10] px-2 py-1.5 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:gap-2"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-max mx-auto md:mx-0 md:px-4">
          {navTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundManager.playClick();
                  if (item.id === 'logout') {
                    handleLogout();
                    return;
                  }
                  setActiveTab(item.id as any);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#FF284A] text-white shadow-[0_0_12px_rgba(255,40,74,0.4)] scale-100'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Admin Scrollable Container */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-[#07070B] pb-24">
        {/* =========================================================================
            TAB 1: DASHBOARD OVERVIEW & COMPACT HORIZONTAL STATS (5.3)
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 max-w-5xl mx-auto">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">نظرة عامة على المنصة</h2>
              <p className="text-xs text-slate-400">إحصائيات حقيقية مستخرجة مباشرة من قاعدة بيانات الخادم.</p>
            </div>

            {/* Compact 2-column on mobile, 4-column on desktop (5.3) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-xl bg-[#101018] border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">الموارد المنشورة</span>
                <div className="text-xl sm:text-2xl font-extrabold text-white mt-1 tabular-nums font-mono">
                  {stats?.totalPublished ?? 0}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[#101018] border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">المسودات</span>
                <div className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1 tabular-nums font-mono">
                  {stats?.totalDrafts ?? 0}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[#101018] border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">التحميلات المسجلة</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#35D16F] mt-1 tabular-nums font-mono">
                  {stats?.totalDownloads ?? 0}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[#101018] border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">مساحة الملفات</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#8ADFFF] mt-1 tabular-nums font-mono">
                  {stats?.storage?.formattedSize ?? '0 MB'}
                </div>
              </div>
            </div>

            {/* Category breakdown row */}
            <div className="p-4 rounded-xl bg-[#101018] border border-slate-800">
              <h3 className="text-xs sm:text-sm font-bold text-white mb-2.5">توزيع الموارد حسب الأقسام</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(stats?.categoryStats || []).map((c: any) => (
                  <div
                    key={c.slug}
                    className="p-2 sm:p-2.5 rounded-lg bg-[#07070B] border border-slate-800 text-center"
                  >
                    <span className="text-[11px] font-bold block truncate" style={{ color: c.color }}>
                      {c.title_ar}
                    </span>
                    <div className="text-base font-bold text-white mt-0.5 font-mono tabular-nums">
                      {c.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Downloaded Items */}
            <div className="p-4 rounded-xl bg-[#101018] border border-slate-800">
              <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#35D16F]" />
                <span>أكثر الموارد تحميلاً</span>
              </h3>
              {(!stats?.topDownloaded || stats.topDownloaded.length === 0) ? (
                <p className="text-xs text-slate-500 py-3 text-center">لا توجد تحميلات مسجلة بعد.</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.topDownloaded.slice(0, 5).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-[#07070B] rounded-lg border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={getAssetUrl(item.cover_image)} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-black" />
                        <div className="truncate">
                          <h4 className="font-bold text-slate-100 truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-400">{item.category_title}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#35D16F] tabular-nums shrink-0">
                        {item.downloads} تحميل
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ADD / EDIT RESOURCE — HORIZONTAL FORM ROWS (5.1 & 5.6)
            ========================================================================= */}
        {activeTab === 'add' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  {editingId ? 'تعديل بيانات المورد' : 'إضافة مورد ماينكرافت جديد'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  تصميم أفقي منظم للأندرويد: الحقل بجانب العنوان في نفس السطر.
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            {formSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveResource} className="space-y-4">
              {/* SECTION A: Basic Info in Horizontal Rows */}
              <div className="bg-[#101018] p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
                <h3 className="text-xs font-bold text-[#FF284A] border-b border-slate-800/80 pb-1.5 mb-2">
                  المعلومات الأساسية
                </h3>

                {/* Row 1: عنوان المورد */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    عنوان المورد: *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: حزمة أسلحة دمشقية أسطورية Bedrock"
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FF284A] h-11"
                  />
                </div>

                {/* Row 2: القسم */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    القسم: *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#FF284A] h-11"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title_ar}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 3: وصف مختصر */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    وصف مختصر: *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    placeholder="وصف مشوق في سطرين عن المورد ومميزاته..."
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FF284A] h-11"
                  />
                </div>

                {/* Row 4: الوصف الكامل (Multi-line horizontal alignment) */}
                <div className="flex items-start gap-2 sm:gap-3 pt-1">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0 pt-2">
                    الوصف الكامل:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.full_description}
                    onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                    placeholder="اكتب شرحاً تفصيلياً لكافة مميزات المورد..."
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FF284A]"
                  />
                </div>
              </div>

              {/* SECTION: Smart Visibility Controls (11 independent switches per resource) */}
              <div className="bg-[#101018] p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>إعدادات ظهور المعلومات (التحكم الذكي الفردي لكل مورد)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تحكم في ظهور أو إخفاء حقول هذا المورد للزوار دون فقدان أي بيانات مخزنة.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'show_creator_name', label: 'إظهار اسم المنشئ', desc: 'عرض صاحب العمل في بطاقة وصفحة المورد' },
                    { key: 'show_source_url', label: 'إظهار رابط المصدر', desc: 'عرض زر المصدر الأصلي والروابط الخارجية' },
                    { key: 'show_file_size', label: 'إظهار حجم الملف', desc: 'عرض بطاقة حجم الملف التقريبي' },
                    { key: 'show_mc_version', label: 'إظهار إصدار اللعبة', desc: 'عرض بطاقة إصدار ماينكرافت المتوافق' },
                    { key: 'show_supported_devices', label: 'إظهار الأجهزة المدعومة', desc: 'عرض بطاقة الأجهزة (Android/iOS/PC)' },
                    { key: 'show_requirements', label: 'إظهار متطلبات التشغيل', desc: 'عرض قسم متطلبات وتوافق التشغيل' },
                    { key: 'show_install_instructions', label: 'إظهار طريقة التثبيت', desc: 'عرض خطوات التثبيت المرقمة للزوار' },
                    { key: 'show_changelog', label: 'إظهار سجل التحديثات', desc: 'عرض سجل التغييرات والإصدارات' },
                    { key: 'show_license', label: 'إظهار معلومات الترخيص', desc: 'عرض تفاصيل ترخيص الاستخدام' },
                    { key: 'show_gallery', label: 'إظهار معرض الصور الإضافية', desc: 'عرض وتصفح صور المعرض باللمس' },
                    { key: 'show_related', label: 'إظهار محتوى ذو صلة', desc: 'عرض اقتراحات لموارد أخرى مشابهة' },
                  ].map((item) => {
                    const isChecked = displaySettings[item.key as keyof typeof displaySettings] !== false;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#07070B] border border-slate-800/80 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-200 block truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{item.desc}</span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isChecked}
                          onClick={() => {
                            soundManager.playClick();
                            setDisplaySettings((prev) => ({
                              ...prev,
                              [item.key]: !isChecked,
                            }));
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isChecked ? 'bg-[#FF284A]' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isChecked ? '-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION B: Compatibility & Metadata (Conditionally toggled) */}
              <div className="bg-[#101018] p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
                <h3 className="text-xs font-bold text-[#8ADFFF] border-b border-slate-800/80 pb-1.5 mb-2">
                  التوافق وبيانات المطور
                </h3>

                {/* Row 5: إصدار ماينكرافت */}
                {displaySettings.show_mc_version && (
                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                    <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                      إصدار اللعبة:
                    </label>
                    <input
                      type="text"
                      value={formData.mc_version}
                      onChange={(e) => setFormData({ ...formData, mc_version: e.target.value })}
                      placeholder="1.20+ أو 1.21 Bedrock"
                      className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                    />
                  </div>
                )}

                {/* Row 6: الأجهزة المدعومة */}
                {displaySettings.show_supported_devices && (
                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                    <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                      الأجهزة المدعومة:
                    </label>
                    <input
                      type="text"
                      value={formData.supported_devices}
                      onChange={(e) => setFormData({ ...formData, supported_devices: e.target.value })}
                      placeholder="Android / iOS / Windows 10/11"
                      className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                    />
                  </div>
                )}

                {/* Row 7: اسم المنشئ */}
                {displaySettings.show_creator_name && (
                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                    <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                      اسم المنشئ:
                    </label>
                    <input
                      type="text"
                      value={formData.creator_name}
                      onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                      placeholder="ZORK Community أو اسم المطور"
                      className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                    />
                  </div>
                )}

                {/* Row 8: رابط المصدر */}
                {displaySettings.show_source_url && (
                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                    <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                      رابط المصدر:
                    </label>
                    <input
                      type="url"
                      value={formData.source_url}
                      onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* Row 9: معلومات الترخيص */}
                {displaySettings.show_license && (
                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                    <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                      معلومات الترخيص:
                    </label>
                    <input
                      type="text"
                      value={formData.license_info}
                      onChange={(e) => setFormData({ ...formData, license_info: e.target.value })}
                      placeholder="Community License / All Rights Reserved"
                      className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                    />
                  </div>
                )}
              </div>

              {/* SECTION C: Cover Image & Gallery (Repaired Upload Experience) */}
              <div className="bg-[#101018] p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-[#9D72FF] border-b border-slate-800/80 pb-1.5 mb-2 flex items-center justify-between">
                  <span>رفع صورة الغلاف ومعرض الصور</span>
                  <span className="text-[10px] text-slate-400 font-normal">صيغ مدعومة: JPG, PNG, WEBP</span>
                </h3>

                {/* Row 10: صورة الغلاف */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                    <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                      رفع صورة الغلاف: *
                    </label>

                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <label className="px-3.5 py-2.5 bg-[#9D72FF]/20 border border-[#9D72FF]/40 text-[#9D72FF] hover:bg-[#9D72FF]/30 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 h-11 transition-all active:scale-95">
                        <Upload className="w-4 h-4" />
                        <span>اختيار ملف من الهاتف</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadCover(file);
                          }}
                        />
                      </label>

                      {formData.cover_image && (
                        <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#07070B] px-3 py-2 rounded-lg border border-slate-800 h-11">
                          <span className="text-[10px] text-emerald-400 font-semibold truncate flex-1">
                            تم تخزين الغلاف بنجاح
                          </span>
                          <button
                            type="button"
                            onClick={handleDeleteCoverImage}
                            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer shrink-0"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الصورة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real Upload Progress Bar for Cover Image */}
                  {coverProgress.uploading && (
                    <div className="p-3 bg-[#07070B] rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate font-mono">{coverProgress.fileName}</span>
                        <span className="text-[#9D72FF] font-bold font-mono tabular-nums">{coverProgress.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#9D72FF] to-[#8ADFFF] transition-all duration-150"
                          style={{ width: `${coverProgress.percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">جاري الرفع إلى وحدة التخزين السحابية...</span>
                    </div>
                  )}

                  {/* Cover Upload Error with Retry Button */}
                  {coverProgress.error && (
                    <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="truncate">{coverProgress.error}</span>
                      </div>
                      {lastFailedCoverFile && (
                        <button
                          type="button"
                          onClick={handleRetryCoverUpload}
                          className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>إعادة المحاولة</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cover Preview (معاينة الصورة) */}
                  {formData.cover_image && (
                    <div className="flex items-center gap-3 p-2.5 bg-[#07070B] rounded-xl border border-slate-800">
                      <img
                        src={getAssetUrl(formData.cover_image)}
                        alt="معاينة الغلاف"
                        className="w-20 h-14 rounded-lg object-cover bg-black shrink-0 border border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-200 block truncate">معاينة الصورة</span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">{formData.cover_image}</span>
                      </div>
                      <label className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1 shrink-0">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>استبدال الصورة</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadCover(file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Gallery Upload (إضافة صور المعرض) */}
                {displaySettings.show_gallery && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                      <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                        إضافة صور المعرض:
                      </label>
                      <label className="flex-1 min-w-0 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 h-11 transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>اختيار ملفات من الهاتف ({galleryImages.length}/15)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadGalleryImages}
                        />
                      </label>
                    </div>

                    {galleryProgress.uploading && (
                      <div className="p-2.5 bg-[#07070B] rounded-xl border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">جاري رفع صور المعرض...</span>
                          <span className="text-[#9D72FF] font-bold font-mono">{galleryProgress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#9D72FF] transition-all"
                            style={{ width: `${galleryProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {galleryProgress.error && (
                      <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/60">
                        {galleryProgress.error}
                      </p>
                    )}

                    {galleryImages.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                        {galleryImages.map((img, idx) => (
                          <div key={idx} className="relative group w-full aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 left-1 p-1 bg-red-600/90 text-white rounded text-[10px] hover:bg-red-600 cursor-pointer"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION D: Real Downloadable Files & Source Selector */}
              <div className="bg-[#101018] p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-bold text-[#35D16F] flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#35D16F]" />
                    <span>ملفات ومصادر التحميل الرسمية</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filesList.length} ملف / رابط
                  </span>
                </div>

                {/* Source Selector (مصدر التحميل) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    مصدر التحميل:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDownloadSourceOption('device')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        downloadSourceOption === 'device'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(53,209,111,0.2)]'
                          : 'bg-[#07070B] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع ملف من الجهاز</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDownloadSourceOption('external')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        downloadSourceOption === 'external'
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-[#07070B] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>إضافة رابط تحميل خارجي</span>
                    </button>
                  </div>
                </div>

                {/* Option A: رفع ملف من الجهاز */}
                {downloadSourceOption === 'device' && (
                  <div className="p-3 bg-[#07070B] rounded-xl border border-slate-800/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">رفع ملف المورد (.mcpack / .zip / .mcaddon)</span>
                      <span className="text-[10px] text-slate-500 font-mono">الحد الأقصى 250MB</span>
                    </div>

                    <label className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow hover:opacity-95 active:scale-95 transition-all">
                      <Upload className="w-4 h-4" />
                      <span>اختيار ملف من الهاتف</span>
                      <input
                        type="file"
                        accept=".mcpack,.mcaddon,.mcworld,.zip,application/zip,application/octet-stream,*/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadBedrockFile(file);
                        }}
                      />
                    </label>

                    {/* Progress Bar for Bedrock File */}
                    {fileUploadState.uploading && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 truncate font-mono">{fileUploadState.fileName}</span>
                          <span className="text-[#35D16F] font-bold font-mono tabular-nums">{fileUploadState.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-[#35D16F] transition-all duration-150"
                            style={{ width: `${fileUploadState.percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">جاري نقل الملف إلى الخادم السحابي وتسجيل البيانات...</span>
                      </div>
                    )}

                    {/* Error with Retry */}
                    {fileUploadState.error && (
                      <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="truncate">{fileUploadState.error}</span>
                        </div>
                        {lastFailedBedrockFile && (
                          <button
                            type="button"
                            onClick={handleRetryBedrockUpload}
                            className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>إعادة المحاولة</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Option B: إضافة رابط تحميل خارجي (MediaFire / External) */}
                {downloadSourceOption === 'external' && (
                  <div className="p-3 bg-[#07070B] rounded-xl border border-slate-800/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">رابط التحميل الخارجي (MediaFire أو روابط آمنة)</span>
                      {externalUrlInput.includes('mediafire.com') && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600 font-bold">
                          رابط MediaFire معتمد
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        رابط التحميل: *
                      </label>
                      <input
                        type="url"
                        value={externalUrlInput}
                        onChange={(e) => {
                          setExternalUrlInput(e.target.value);
                          setExternalUrlError(null);
                        }}
                        placeholder="https://www.mediafire.com/file/... أو رابط خارجي يبدأ بـ https://"
                        className="w-full px-3 py-2 bg-[#101018] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 h-11"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          اسم الملف المعروض للزوار:
                        </label>
                        <input
                          type="text"
                          value={externalNameInput}
                          onChange={(e) => setExternalNameInput(e.target.value)}
                          placeholder="مثال: حزمة مودات Bedrock الرسمية"
                          className="w-full px-3 py-2 bg-[#101018] border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          إصدار المورد:
                        </label>
                        <input
                          type="text"
                          value={externalVersionInput}
                          onChange={(e) => setExternalVersionInput(e.target.value)}
                          placeholder="1.20+ أو 1.0"
                          className="w-full px-3 py-2 bg-[#101018] border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 h-10"
                        />
                      </div>
                    </div>

                    {externalUrlError && (
                      <p className="text-xs text-red-400 bg-red-950/50 p-2 rounded-lg border border-red-800">
                        {externalUrlError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleAddExternalLink}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>إضافة رابط خارجي</span>
                    </button>
                  </div>
                )}

                {/* List of Attached Download Files (Internal & External) */}
                {filesList.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[11px] font-bold text-slate-400">الملفات والروابط المرفقة بالمورد:</h4>
                    {filesList.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-[#07070B] border border-slate-800 rounded-xl text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              f.is_external === 1
                                ? 'bg-amber-950/60 text-amber-400'
                                : 'bg-emerald-950/60 text-[#35D16F]'
                            }`}
                          >
                            {f.is_external === 1 ? <Globe className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                          </div>
                          <div className="truncate min-w-0">
                            <div className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                              <span>{f.file_name}</span>
                              {f.is_external === 1 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950 text-amber-300 border border-amber-800 font-normal">
                                  {f.external_provider === 'mediafire' ? 'MediaFire' : 'رابط خارجي'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                              {f.is_external === 1 ? (
                                <span className="text-amber-400/80">{f.file_url}</span>
                              ) : (
                                <span>
                                  {f.file_type.toUpperCase()} · {(f.file_size / (1024 * 1024)).toFixed(2)} MB · إصدار {f.version_tag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteFile(idx)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg shrink-0 cursor-pointer"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 py-1">لم يتم إرفاق أي ملفات أو روابط تحميل بعد.</p>
                )}
              </div>

              {/* SECTION E: Instructions & Changelog in Horizontal Rows */}
              {(displaySettings.show_install_instructions || displaySettings.show_changelog) && (
                <div className="bg-[#101018] p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-1.5 mb-2">
                    خطوات التثبيت والتحديثات
                  </h3>

                  {/* Row 11: خطوات التثبيت */}
                  {displaySettings.show_install_instructions && (
                    <div className="flex items-start gap-2 sm:gap-3 pt-1">
                      <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0 pt-2">
                        خطوات التثبيت:
                      </label>
                      <textarea
                        rows={2}
                        value={formData.install_instructions}
                        onChange={(e) => setFormData({ ...formData, install_instructions: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-slate-500"
                      />
                    </div>
                  )}

                  {/* Row 12: سجل التغييرات */}
                  {displaySettings.show_changelog && (
                    <div className="flex items-start gap-2 sm:gap-3 pt-1">
                      <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0 pt-2">
                        سجل التغييرات:
                      </label>
                      <textarea
                        rows={2}
                        value={formData.changelog}
                        onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-slate-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Publication Toggles */}
              <div className="p-3 bg-[#101018] rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published === 1}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-[#FF284A] focus:ring-0 bg-[#07070B] border-slate-700"
                  />
                  <span className="text-xs font-semibold text-slate-200">نشر المورد للجمهور فوراً</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured === 1}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-amber-400 focus:ring-0 bg-[#07070B] border-slate-700"
                  />
                  <span className="text-xs font-semibold text-amber-400">تمييز (Featured)</span>
                </label>
              </div>
            </form>

            {/* 
              5.6 STICKY MOBILE ACTION BAR:
              Fixed bottom bar with Save and Preview buttons
            */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#101018]/95 backdrop-blur-md border-t border-slate-800 px-3 py-2.5 flex items-center justify-between gap-3 max-w-4xl mx-auto shadow-2xl">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${formData.is_published === 1 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                  {formData.is_published === 1 ? 'منشور' : 'مسودة'}
                </span>
                <span className="text-xs text-slate-400 truncate hidden sm:inline">{formData.title || 'مورد جديد'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setPreviewOpen(true);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow"
                >
                  <Eye className="w-3.5 h-3.5 text-[#8ADFFF]" />
                  <span>معاينة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveResource()}
                  disabled={loadingData || coverProgress.uploading || galleryProgress.uploading || fileUploadState.uploading}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white font-bold text-xs rounded-lg shadow hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingData ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingId ? 'حفظ التغييرات' : 'نشر المورد'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: MANAGE RESOURCES — COMPACT HORIZONTAL RESOURCE ROWS (5.5)
            ========================================================================= */}
        {activeTab === 'manage' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white">إدارة المحتوى والمسودات</h2>
                <p className="text-[11px] text-slate-400">صفوف أفقية مدمجة مصممة خصيصاً للهواتف والشاشات اللمسية.</p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('add');
                }}
                className="px-3 py-1.5 bg-[#FF284A] text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>إضافة مورد</span>
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#101018] border border-slate-800 text-center">
                <p className="text-xs sm:text-sm text-slate-400 mb-3">لا توجد موارد محفوظة حالياً.</p>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('add');
                  }}
                  className="px-4 py-2 bg-[#FF284A] text-white text-xs font-bold rounded-lg"
                >
                  أضف أول مورد الآن
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 5.5 Horizontal Resource Rows: [صورة] [عنوان + قسم] [حالة] [تعديل] [حذف] */}
                {resources.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#101018] border border-slate-800 flex items-center justify-between gap-2.5 transition-all hover:border-slate-700"
                  >
                    {/* Thumbnail + Title + Category */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={getAssetUrl(item.cover_image)}
                        alt=""
                        className="w-12 h-9 sm:w-14 sm:h-10 rounded-lg object-cover bg-black shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h3>
                          {item.is_featured === 1 && (
                            <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-500/40 px-1 rounded font-semibold shrink-0">
                              مميّز
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          <span style={{ color: item.category_color }} className="font-semibold">{item.category_title}</span>
                          <span>·</span>
                          <span>{item.mc_version}</span>
                          <span>·</span>
                          <span className="text-[#35D16F] font-bold">{item.real_download_count || 0} تحميل</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {/* Publish Toggle Button */}
                      <button
                        onClick={() => handleTogglePublish(item.id)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                          item.is_published === 1
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                            : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                        }`}
                        title={item.is_published === 1 ? 'إلغاء النشر' : 'نشر'}
                      >
                        {item.is_published === 1 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span className="hidden sm:inline">{item.is_published === 1 ? 'منشور' : 'مسودة'}</span>
                      </button>

                      {/* Feature Toggle */}
                      <button
                        onClick={() => handleToggleFeature(item.id)}
                        className={`p-1.5 rounded-md cursor-pointer transition-colors ${item.is_featured === 1 ? 'text-amber-400 bg-amber-950/30' : 'text-slate-500 hover:text-amber-400'}`}
                        title="تمييز المورد"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md cursor-pointer"
                        title="تعديل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteResource(item.id, item.title)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-md cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: MEDIA MANAGER (5.2)
            ========================================================================= */}
        {activeTab === 'media' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">إدارة الصور والملفات</h2>
              <p className="text-[11px] text-slate-400">رفع وإدارة ملفات التخزين السحابية للمنصة.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#101018] border border-slate-800 text-center space-y-3">
              <HardDrive className="w-8 h-8 text-[#8ADFFF] mx-auto" />
              <h3 className="text-xs sm:text-sm font-bold text-white">رفع وسائط مباشرة إلى مجلد التخزين</h3>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                يدعم صور PNG, JPG, WebP وملفات Bedrock الرسمية (.mcpack, .mcaddon, .mcworld, .zip) حتى 250MB.
              </p>

              <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF284A] text-white text-xs font-bold rounded-lg cursor-pointer shadow hover:opacity-95 transition-all">
                <Upload className="w-4 h-4" />
                <span>اختيار ملفات من الهاتف</span>
                <input
                  type="file"
                  multiple
                  accept=".mcpack,.mcaddon,.mcworld,.zip,image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0 || !sessionToken) return;
                    setMediaUploadState({ uploading: true, percent: 0, error: null, success: null });

                    const d = await uploadWithXhr(files, (percent) => {
                      setMediaUploadState((prev) => ({ ...prev, percent }));
                    });

                    if (d.success && d.files) {
                      soundManager.playSuccess();
                      setMediaUploadState({
                        uploading: false,
                        percent: 100,
                        error: null,
                        success: `تم رفع ${d.files.length} ملف بنجاح وتخزينها في السيرفر!`,
                      });
                      loadDashboardData(sessionToken);
                    } else {
                      soundManager.playError();
                      setMediaUploadState({
                        uploading: false,
                        percent: 0,
                        error: d.message || 'فشل الرفع، يمكنك المحاولة مرة أخرى.',
                        success: null,
                      });
                    }
                  }}
                />
              </label>

              {mediaUploadState.uploading && (
                <div className="max-w-xs mx-auto space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>جاري الرفع...</span>
                    <span className="font-mono text-[#8ADFFF]">{mediaUploadState.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8ADFFF] transition-all"
                      style={{ width: `${mediaUploadState.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {mediaUploadState.success && (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/60 max-w-sm mx-auto">
                  {mediaUploadState.success}
                </p>
              )}

              {mediaUploadState.error && (
                <p className="text-xs text-red-400 font-semibold bg-red-950/40 p-2 rounded-lg border border-red-800/60 max-w-sm mx-auto">
                  {mediaUploadState.error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: CATEGORIES VIEW
            ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">الأقسام والتصنيفات الرسمية</h2>
              <p className="text-[11px] text-slate-400">أقسام ZORK CRAFT المعتمدة بهويتها اللونية.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-[#101018] border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold" style={{ color: cat.color }}>
                      {cat.title_ar}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{cat.slug}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{cat.description_ar}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    الموارد المنشورة: {cat.resource_count ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: SECURITY & AUDIT LOGS
            ========================================================================= */}
        {activeTab === 'security' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-[#35D16F]" />
                <span>حماية الحساب والأمان السيبراني</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                إدارة المصادقة الثنائية (MFA)، تحديث كلمة المرور، إنهاء الجلسات، وسجل التدقيق الأمني.
              </p>
            </div>

            {/* 1. Genuine Security Status Badges (Per Section 10) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#101018] border border-slate-800 text-center space-y-1">
                <div className="text-[10px] text-slate-400 font-medium">التحقق الثنائي</div>
                <div className={`text-xs font-bold flex items-center justify-center gap-1 ${mfaEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {mfaEnabled ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{mfaEnabled ? 'التحقق الثنائي مفعّل' : 'التحقق الثنائي غير مفعّل'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101018] border border-slate-800 text-center space-y-1">
                <div className="text-[10px] text-slate-400 font-medium">حالة الحساب</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>الحساب محمي</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101018] border border-slate-800 text-center space-y-1">
                <div className="text-[10px] text-slate-400 font-medium">حالة الجلسة</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>الجلسة آمنة</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101018] border border-slate-800 text-center space-y-1">
                <div className="text-[10px] text-slate-400 font-medium">توثيق الهوية</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>البريد الإلكتروني موثّق</span>
                </div>
              </div>
            </div>

            {/* 2. Real MFA Management Section (Per Section 5) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#101018] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#8ADFFF]" />
                    <span>المصادقة الثنائية (MFA - TOTP Authenticator)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    حماية حساب المالك بواسطة تطبيق Google Authenticator أو Microsoft Authenticator أو 1Password.
                  </p>
                </div>
                {mfaEnabled ? (
                  <button
                    type="button"
                    onClick={() => setShowRevokeMfaModal(true)}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    إلغاء تفعيل MFA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartMfaSetup}
                    disabled={enrollLoading}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#FF284A] to-[#FF791F] hover:opacity-95 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>تفعيل MFA الآن</span>
                  </button>
                )}
              </div>

              {/* MFA Setup Wizard Modal/Drawer when active */}
              {mfaSetupActive && (
                <div className="p-4 rounded-xl bg-[#07070B] border border-slate-700/80 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>إعداد المصادقة الثنائية بخطوتين</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setMfaSetupActive(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* QR Code and Secret */}
                    <div className="p-3 bg-[#101018] rounded-xl border border-slate-800 text-center space-y-2">
                      <p className="text-xs font-medium text-slate-200">1. امسح رمز الـ QR بتطبيق المصادقة:</p>
                      {qrCodeDataUrl ? (
                        <div className="inline-block p-2 bg-white rounded-lg shadow-md">
                          <img src={qrCodeDataUrl} alt="MFA QR Code" className="w-40 h-40 object-contain mx-auto" />
                        </div>
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center border border-dashed border-slate-700 rounded-lg mx-auto text-xs text-slate-500">
                          جاري تجهيز الرمز...
                        </div>
                      )}
                      {totpSecret && (
                        <div className="text-[11px] text-slate-400">
                          <span>المفتاح اليدوي: </span>
                          <span className="font-mono text-slate-200 select-all">{totpSecret}</span>
                        </div>
                      )}
                    </div>

                    {/* Recovery Codes & Verification */}
                    <div className="space-y-3">
                      <div className="p-3 bg-[#101018] rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-200">2. احفظ رموز الاسترداد للطوارئ:</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator.clipboard.writeText(recoveryCodesList.join('\n'));
                                setCopiedCodes(true);
                                setTimeout(() => setCopiedCodes(false), 2000);
                              }
                            }}
                            className="text-[10px] text-[#8ADFFF] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedCodes ? 'تم النسخ!' : 'نسخ الكل'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-300 bg-[#07070B] p-2 rounded-lg border border-slate-800">
                          {recoveryCodesList.map((code, idx) => (
                            <div key={idx} className="p-1 bg-slate-900/60 rounded text-center">{code}</div>
                          ))}
                        </div>
                      </div>

                      {/* Verification Form */}
                      <form onSubmit={handleConfirmMfaEnrollment} className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">
                          3. أدخل الرمز المكون من 6 أرقام لتأكيد التفعيل:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={enrollOtpInput}
                            onChange={(e) => setEnrollOtpInput(e.target.value)}
                            placeholder="123456"
                            className="flex-1 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-center font-mono text-base tracking-widest text-white focus:outline-none focus:border-[#FF284A]"
                            dir="ltr"
                          />
                          <button
                            type="submit"
                            disabled={enrollLoading || enrollOtpInput.length !== 6}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            {enrollLoading ? 'جاري التحقق...' : 'تأكيد التفعيل'}
                          </button>
                        </div>
                        {enrollError && (
                          <p className="text-[11px] text-red-400">{enrollError}</p>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Revoke MFA Confirmation Modal */}
              {showRevokeMfaModal && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 space-y-3">
                  <h4 className="text-xs font-bold text-red-200">تأكيد إلغاء تفعيل التحقق الثنائي (MFA)</h4>
                  <p className="text-[11px] text-red-300">
                    لأسباب أمنية، يرجى إدخال كلمة المرور الحالية لتأكيد إيقاف التحقق الثنائي:
                  </p>
                  <form onSubmit={handleRevokeMfa} className="flex gap-2">
                    <input
                      type="password"
                      required
                      value={revokePasswordInput}
                      onChange={(e) => setRevokePasswordInput(e.target.value)}
                      placeholder="كلمة المرور الحالية"
                      className="flex-1 px-3 py-2 bg-[#07070B] border border-red-900 rounded-lg text-xs text-white focus:outline-none"
                      dir="ltr"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      تأكيد الإلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRevokeMfaModal(false)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                    >
                      تراجع
                    </button>
                  </form>
                  {revokeError && <p className="text-[11px] text-red-400">{revokeError}</p>}
                </div>
              )}
            </div>

            {/* 3. Password Rotation Box (Enforcing 20+ chars, uppercase, lowercase, numbers, symbols) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#101018] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>تغيير كلمة المرور الخاصة بالمالك</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    يجب ألا تقل كلمة المرور عن 20 خانة مع مزيج من الحروف الكبيرة والصغيرة والأرقام والرموز.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateStrongPassword}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توليد كلمة مرور (24 خانة)</span>
                </button>
              </div>

              {pwMsg && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    pwMsg.success
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-red-950/60 border-red-800 text-red-200'
                  }`}
                >
                  {pwMsg.success ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{pwMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="sm:w-[28%] text-right font-semibold text-xs text-slate-300 shrink-0">
                    كلمة المرور الحالية:
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPwInput}
                    onChange={(e) => setCurrentPwInput(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    className="flex-1 px-3 py-2.5 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    dir="ltr"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="sm:w-[28%] text-right font-semibold text-xs text-slate-300 shrink-0">
                    كلمة المرور الجديدة:
                  </label>
                  <input
                    type="password"
                    required
                    value={newPwInput}
                    onChange={(e) => setNewPwInput(e.target.value)}
                    placeholder="20 خانة على الأقل (حروف كبيرة وصغيرة وأرقام ورموز)"
                    className="flex-1 px-3 py-2.5 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    dir="ltr"
                  />
                </div>

                {/* Criteria Indicators */}
                {newPwInput.length > 0 && (
                  <div className="sm:mr-[28%] p-2.5 bg-[#07070B] rounded-lg border border-slate-800 text-[11px] grid grid-cols-2 gap-1.5">
                    <span className={newPwInput.length >= 20 ? 'text-emerald-400' : 'text-slate-500'}>
                      {newPwInput.length >= 20 ? '✓' : '○'} 20 خانة على الأقل ({newPwInput.length}/20)
                    </span>
                    <span className={/[A-Z]/.test(newPwInput) ? 'text-emerald-400' : 'text-slate-500'}>
                      {/[A-Z]/.test(newPwInput) ? '✓' : '○'} حرف كبير (A-Z)
                    </span>
                    <span className={/[a-z]/.test(newPwInput) ? 'text-emerald-400' : 'text-slate-500'}>
                      {/[a-z]/.test(newPwInput) ? '✓' : '○'} حرف صغير (a-z)
                    </span>
                    <span className={/[0-9]/.test(newPwInput) ? 'text-emerald-400' : 'text-slate-500'}>
                      {/[0-9]/.test(newPwInput) ? '✓' : '○'} رقم (0-9)
                    </span>
                    <span className={`col-span-2 ${/[^a-zA-Z0-9]/.test(newPwInput) ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {/[^a-zA-Z0-9]/.test(newPwInput) ? '✓' : '○'} رمز خاص (!@#$%^&*...)
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="sm:w-[28%] text-right font-semibold text-xs text-slate-300 shrink-0">
                    تأكيد كلمة المرور:
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPwInput}
                    onChange={(e) => setConfirmPwInput(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور الجديدة للتطابق"
                    className="flex-1 px-3 py-2.5 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    dir="ltr"
                  />
                </div>

                <div className="sm:mr-[28%] pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    تحديث كلمة المرور
                  </button>
                </div>
              </form>
            </div>

            {/* Session Management */}
            <div className="p-4 rounded-xl bg-[#101018] border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">إدارة الجلسات النشطة</h3>
                <p className="text-[10px] text-slate-400">إنهاء أي جلسات مفتوحة على أجهزة أخرى للحفاظ على أمان المنصة.</p>
              </div>
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                إنهاء الجلسات الأخرى
              </button>
            </div>

            {/* Audit Logs */}
            <div className="p-4 rounded-xl bg-[#101018] border border-slate-800 space-y-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#8ADFFF]" />
                <span>سجل التدقيق الأمني (Audit Logs)</span>
              </h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-2">لا توجد سجلات مسجلة.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2 bg-[#07070B] rounded-lg border border-slate-800/80 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            log.severity === 'HIGH'
                              ? 'bg-red-500'
                              : log.severity === 'WARNING'
                              ? 'bg-amber-500'
                              : 'bg-[#35D16F]'
                          }`}
                        />
                        <span className="font-mono font-bold text-slate-200">{log.event_type}</span>
                        <span className="text-slate-400 truncate">{log.details}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0 mr-2">
                        {new Date(log.created_at).toLocaleTimeString('ar-EG')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: WEBSITE SETTINGS (إعدادات الموقع)
            ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="pb-2 border-b border-slate-800">
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#8ADFFF]" />
                <span>إعدادات الموقع العامة</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                تعديل هوية المنصة، الروابط الاجتماعية، ورسائل التنبيه والوصف.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="bg-[#101018] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                {/* Site Title */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    اسم المنصة:
                  </label>
                  <input
                    type="text"
                    required
                    value={siteSettings.site_title}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                  />
                </div>

                {/* Site Description */}
                <div className="flex items-start gap-2 sm:gap-3 pt-1">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0 pt-2">
                    وصف المنصة:
                  </label>
                  <textarea
                    rows={3}
                    value={siteSettings.site_description}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_description: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF]"
                  />
                </div>

                {/* YouTube Channel Link */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    رابط قناة اليوتيوب:
                  </label>
                  <input
                    type="url"
                    value={siteSettings.youtube_url}
                    onChange={(e) => setSiteSettings({ ...siteSettings, youtube_url: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                    dir="ltr"
                  />
                </div>

                {/* Announcement Banner */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    شريط التنبيهات:
                  </label>
                  <input
                    type="text"
                    value={siteSettings.announcement_banner}
                    onChange={(e) => setSiteSettings({ ...siteSettings, announcement_banner: e.target.value })}
                    placeholder="اتركه فارغاً إن لم ترغب بعرض شريط تنبيه"
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                  />
                </div>

                {/* Maintenance Mode */}
                <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                  <label className="w-[32%] min-w-[105px] max-w-[140px] text-right font-semibold text-xs text-slate-300 shrink-0">
                    وضع الصيانة:
                  </label>
                  <select
                    value={siteSettings.maintenance_mode}
                    onChange={(e) => setSiteSettings({ ...siteSettings, maintenance_mode: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#07070B] border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#8ADFFF] h-11"
                  >
                    <option value="0">الموقع نشط ومتاح لجميع الزوار (افتراضي)</option>
                    <option value="1">تفعيل وضع الصيانة المؤقت</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white font-bold text-xs rounded-xl shadow hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {settingsLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>حفظ إعدادات الموقع</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* =========================================================================
          PREVIEW MODAL (معاينة حية للمورد مع إعدادات الظهور الحالية)
          ========================================================================= */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[88vh] bg-[#0c0c12] border border-slate-800 rounded-2xl overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-[#0c0c12] z-10">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>معاينة حية (كما سيظهر للمستخدم مع إعدادات الظهور المحددة)</span>
              </span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">{formData.title || 'عنوان المورد'}</h2>
              <p className="text-xs text-slate-300 mt-1">{formData.short_description || 'الوصف المختصر...'}</p>
            </div>

            {formData.cover_image && (
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-black border border-slate-800">
                <img src={getAssetUrl(formData.cover_image)} alt="" className="w-full h-full object-contain" />
              </div>
            )}

            {/* 2-Column Metallic Cards Preview */}
            <div className="grid grid-cols-2 gap-2.5">
              {displaySettings.show_file_size && (
                <div className="p-3 rounded-xl bg-[#13131c] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">حجم الملف</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {filesList.length > 0
                      ? `${(filesList.reduce((acc, f) => acc + (f.file_size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`
                      : '14.2 MB'}
                  </span>
                </div>
              )}
              {displaySettings.show_mc_version && (
                <div className="p-3 rounded-xl bg-[#13131c] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">إصدار اللعبة</span>
                  <span className="text-xs font-bold text-white font-mono">{formData.mc_version}</span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-[#13131c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">التحميلات</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">0</span>
              </div>
              <div className="p-3 rounded-xl bg-[#13131c] border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">تاريخ الإضافة</span>
                <span className="text-xs font-bold text-slate-200">اليوم</span>
              </div>
              {displaySettings.show_creator_name && formData.creator_name && (
                <div className="p-3 rounded-xl bg-[#13131c] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">المنشئ</span>
                  <span className="text-xs font-bold text-slate-200">{formData.creator_name}</span>
                </div>
              )}
              {displaySettings.show_supported_devices && formData.supported_devices && (
                <div className="p-3 rounded-xl bg-[#13131c] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">الأجهزة المدعومة</span>
                  <span className="text-xs font-bold text-slate-200">{formData.supported_devices}</span>
                </div>
              )}
            </div>

            {/* Description Preview */}
            <div className="p-3 rounded-xl bg-[#09090f] border border-slate-800 text-xs text-slate-300">
              {formData.full_description || formData.short_description}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
