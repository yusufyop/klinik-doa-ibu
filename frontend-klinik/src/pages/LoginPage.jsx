import { useState } from 'react';
import { useLoading } from '../hooks/useForm';

/**
 * Login Page Component
 */
export default function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    identifier: '', // Bisa email atau username
    password: ''
  });
  const [error, setError] = useState('');
  const { loading, withLoading } = useLoading(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (error) setError('');
  };

  const handleSubmit = withLoading(async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Cek apakah input adalah email atau username
      const isEmail = formData.identifier.includes('@');
      const loginData = isEmail 
        ? { email: formData.identifier, password: formData.password }
        : { username: formData.identifier, password: formData.password };
      
      const result = await onLogin(loginData);
      if (!result.success) {
        setError(result.message || 'Login gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan pada server. Silakan coba lagi.');
      console.error('Login error:', err);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">Klinik Doa Ibu</h1>
          <p className="text-gray-600">Silakan login untuk melanjutkan</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                Email atau Username
              </label>
              <input
                type="text"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="nama@email.com atau username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              <strong>Demo Account:</strong><br/>
              Email: admin@klinik.com atau Username: admin<br/>
              Password: Admin123!
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-sm text-gray-600">
          © {new Date().getFullYear()} Klinik Doa Ibu. All rights reserved.
        </p>
      </div>
    </div>
  );
}
