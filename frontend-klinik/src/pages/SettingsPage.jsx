import { useState, useEffect, useRef } from 'react';
import useSettings from '../hooks/useSettings';

const SettingsPage = ({ onBack }) => {
  const { settings, loading, error, updateSettings, fetchSettings } = useSettings();
  const [formData, setFormData] = useState({
    clinic_name: '',
    clinic_address: '',
    browser_title: '',
    logo_url: '',
    favicon_url: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  
  useEffect(() => {
    if (settings) {
      setFormData({
        clinic_name: settings.clinic_name || '',
        clinic_address: settings.clinic_address || '',
        browser_title: settings.browser_title || '',
        logo_url: settings.logo_url || '',
        favicon_url: settings.favicon_url || ''
      });
      if (settings.logo_url) setLogoPreview(settings.logo_url);
      if (settings.favicon_url) setFaviconPreview(settings.favicon_url);
    }
  }, [settings]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFaviconPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const submitData = new FormData();
    submitData.append('clinic_name', formData.clinic_name);
    submitData.append('clinic_address', formData.clinic_address);
    submitData.append('browser_title', formData.browser_title);
    
    if (logoFile) {
      submitData.append('logo', logoFile);
    } else if (formData.logo_url) {
      submitData.append('existing_logo', formData.logo_url);
    }
    
    if (faviconFile) {
      submitData.append('favicon', faviconFile);
    } else if (formData.favicon_url) {
      submitData.append('existing_favicon', formData.favicon_url);
    }

    const result = await updateSettings(submitData, true);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
      setLogoFile(null);
      setFaviconFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    } else {
      setMessage({ type: 'error', text: result.message || 'Gagal menyimpan pengaturan' });
    }
    
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold transition"
        >
          ← Kembali
        </button>
        <h1 className="text-3xl font-bold text-slate-800">Custom Website</h1>
        <p className="text-slate-600 mt-1">Atur tampilan website klinik Anda</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Informasi Klinik */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">🏥</span>
            Informasi Klinik
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Klinik *
              </label>
              <input
                type="text"
                name="clinic_name"
                value={formData.clinic_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Contoh: Klinik Sehat Keluarga"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Alamat Klinik
              </label>
              <textarea
                name="clinic_address"
                value={formData.clinic_address}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Masukkan alamat lengkap klinik"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Browser Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">🌐</span>
            Pengaturan Browser
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Judul Tab Browser *
              </label>
              <input
                type="text"
                name="browser_title"
                value={formData.browser_title}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Contoh: Sistem Informasi Klinik Sehat"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Judul yang akan muncul di tab browser</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Upload Logo Klinik
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition cursor-pointer">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="cursor-pointer">
                  {logoPreview ? (
                    <div className="flex flex-col items-center">
                      <img src={logoPreview} alt="Logo preview" className="h-20 object-contain mb-2" />
                      <p className="text-sm text-blue-600">Klik untuk ganti logo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-2">📷</span>
                      <p className="text-sm text-slate-600">Klik untuk upload logo</p>
                      <p className="text-xs text-slate-500 mt-1">Format: JPG, PNG, GIF, WEBP (Max 5MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Upload Favicon
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition cursor-pointer">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*,.ico"
                  onChange={handleFaviconChange}
                  className="hidden"
                  id="favicon-upload"
                />
                <label htmlFor="favicon-upload" className="cursor-pointer">
                  {faviconPreview ? (
                    <div className="flex flex-col items-center">
                      <img src={faviconPreview} alt="Favicon preview" className="h-8 object-contain mb-2" />
                      <p className="text-sm text-blue-600">Klik untuk ganti favicon</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-2">🖼️</span>
                      <p className="text-sm text-slate-600">Klik untuk upload favicon</p>
                      <p className="text-xs text-slate-500 mt-1">Format: ICO, PNG (32x32 atau 64x64 px)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {saving ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setFormData({
                clinic_name: 'Klinik Sehat',
                clinic_address: '',
                browser_title: 'Sistem Informasi Klinik',
                logo_url: '',
                favicon_url: ''
              });
              setLogoPreview(null);
              setFaviconPreview(null);
              setLogoFile(null);
              setFaviconFile(null);
              if (logoInputRef.current) logoInputRef.current.value = '';
              if (faviconInputRef.current) faviconInputRef.current.value = '';
            }}
            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
          >
            🔄 Reset Default
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span>💡</span> Tips
        </h3>
        <ul className="text-sm text-slate-700 space-y-2">
          <li>• Upload logo dan favicon langsung dari komputer Anda</li>
          <li>• Favicon disarankan format .ico atau .png dengan ukuran 32x32 atau 64x64 pixel</li>
          <li>• Perubahan judul browser akan langsung terlihat setelah disimpan</li>
          <li>• Untuk favicon, mungkin perlu refresh browser (Ctrl+F5) agar terlihat perubahan</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
