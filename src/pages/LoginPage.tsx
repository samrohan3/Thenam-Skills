import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [intendedRole, setIntendedRole] = useState<'student'|'faculty'>(
    (localStorage.getItem('intendedRole') as 'student'|'faculty') || 'student'
  );

  const { signInWithEmail } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (role: 'student'|'faculty') => {
    setIntendedRole(role);
    localStorage.setItem('intendedRole', role);
    setError('');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = username.includes('@') ? username : `${username}@thenam.edu`;
      await signInWithEmail(email, password);
      console.log('Logged in as educator successfully');
    } catch (err: any) {
      console.error('Email Auth error:', err);
      setError('Invalid educator credentials. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      console.log('Logged in with Google successfully');
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`This domain (${currentDomain}) is not authorized for Google Sign-In. Please add it to the Authorized Domains list in your Firebase Console (Authentication > Settings > Authorized domains).`);
      } else {
        const errorMessage = err.message || 'Google Authentication failed.';
        setError(errorMessage.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full space-y-8">
        
        {/* Branding Logo & Header */}
        <div className="text-center space-y-4">
          <img 
            src="/logo.jpg" 
            alt="Thenam Campus Logo" 
            className="inline-block w-16 h-16 rounded-3xl object-cover shadow-xl shadow-indigo-500/20 mb-2 transform hover:scale-105 transition-transform duration-300"
          />
          
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
              Thenam <span className="text-indigo-600 font-black">Campus</span>
            </h1>
            <p className="text-xs font-bold text-indigo-600/90 uppercase tracking-widest">
              Verified Ecosystem
            </p>
          </div>
        </div>

        {/* Role Toggle Tab */}
        <div className="flex bg-slate-200/50 p-1 rounded-2xl mx-auto max-w-[240px]">
          <button
            onClick={() => handleRoleChange('student')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              intendedRole === 'student' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => handleRoleChange('faculty')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              intendedRole === 'faculty' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Educator
          </button>
        </div>

        {/* Action card */}
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 shadow-xl rounded-3xl space-y-6">
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800 leading-normal">{error}</p>
            </div>
          )}

          {intendedRole === 'faculty' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-hidden"
                  placeholder="Enter educator username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-hidden"
                    placeholder="Enter educator password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-2xl shadow-xs text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all select-none cursor-pointer active:scale-98 mt-2"
              >
                Sign In as Educator
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs text-sm font-extrabold text-slate-700 bg-white hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all select-none cursor-pointer active:scale-98"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5 text-indigo-600" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          <div className="relative flex justify-center text-xs border-t border-slate-100 pt-4">
            <span className="bg-white px-3 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
              {intendedRole === 'faculty' ? 'Authorized Educator Access' : 'Secure authentication powered by Google'}
            </span>
          </div>
        </div>

        {/* Footer notes */}
        <div className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
          © {new Date().getFullYear()} THENAM Academic Board
        </div>
      </div>
    </div>
  );
}
