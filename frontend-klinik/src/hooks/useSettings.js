import { useState, useEffect } from 'react';
import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `http://${hostname}:5000/api`;
};

const API_URL = getApiUrl();

export const useSettings = () => {
  const [settings, setSettings] = useState({
    clinic_name: 'Klinik Sehat',
    clinic_address: '',
    browser_title: 'Sistem Informasi Klinik',
    logo_url: null,
    favicon_url: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/settings`);
      setSettings(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await axios.put(`${API_URL}/settings`, newSettings);
      await fetchSettings();
      return { success: true };
    } catch (err) {
      console.error('Error updating settings:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Gagal memperbarui pengaturan' 
      };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update document title dan favicon
  useEffect(() => {
    if (settings.browser_title) {
      document.title = settings.browser_title;
    }
    
    if (settings.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'icon';
      link.href = `${API_URL.replace('/api', '')}${settings.favicon_url}`;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [settings]);

  return { settings, loading, error, fetchSettings, updateSettings };
};

export default useSettings;
