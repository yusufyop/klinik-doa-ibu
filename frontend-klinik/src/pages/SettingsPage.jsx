import { useState, useEffect } from 'react';
import useSettings from '../hooks/useSettings';

const SettingsPage = ({ onBack }) => {
  const { settings, loading, error, updateSettings } = useSettings();
  const [formData, setFormData] = useState({
    clinic_name: '',
    clinic_address: '',
    browser_title: '',
    logo_url: '',
    favicon_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        clinic_name: settings.clinic_name || '',
        clinic_address: settings.clinic_address || '',
        browser_title: settings.browser_title || '',
        logo_url: settings.logo_url || '',
        favicon_url: settings.favicon_url || ''
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateSettings(formData);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
    } else {
      setMessage({ type: 'error', text: result.message || 'Gagal menyimpan pengaturan' });
    }
    
    setSaving(false);
    
    // Hide message after 3 seconds
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
                URL Logo Klinik
              </label>
              <input
                type="url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-slate-500 mt-1">URL logo untuk ditampilkan di aplikasi</p>
              
              {formData.logo_url && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">Preview:</p>
                  <img src={formData.logo_url} alt="Logo preview" className="h-16 object-contain" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                URL Favicon
              </label>
              <input
                type="url"
                name="favicon_url"
                value={formData.favicon_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-slate-500 mt-1">Icon kecil yang muncul di tab browser (.ico atau .png)</p>
              
              {formData.favicon_url && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">Preview:</p>
                  <img src={formData.favicon_url} alt="Favicon preview" className="h-8 object-contain" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
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
            onClick={() => setFormData({
              clinic_name: 'Klinik Sehat',
              clinic_address: '',
              browser_title: 'Sistem Informasi Klinik',
              logo_url: '',
              favicon_url: ''
            })}
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
          <li>• Logo dan favicon bisa menggunakan URL dari gambar yang sudah diupload di internet</li>
          <li>• Favicon disarankan format .ico atau .png dengan ukuran 32x32 atau 64x64 pixel</li>
          <li>• Perubahan judul browser akan langsung terlihat setelah disimpan</li>
          <li>• Untuk favicon, mungkin perlu refresh browser (Ctrl+F5) agar terlihat perubahan</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
