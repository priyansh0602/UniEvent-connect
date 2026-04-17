// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Settings, ArrowLeft, Eye, EyeOff, CheckCircle, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { friendlyError } from '../utils/friendlyError';

export default function Login() {
  const navigate = useNavigate();
  const EMAIL_ALREADY_USED_MESSAGE = 'Email already used.';
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    campusKey: '',
    newPassword: ''
  });

  // Forgot Password OTP state (mirrors Add University OTP pattern)
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpLoading, setForgotOtpLoading] = useState(false);
  const [forgotVerifyLoading, setForgotVerifyLoading] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotMessageType, setForgotMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (message && messageType === 'error') setMessage('');
  };

  // --- STUDENT LOGIN LOGIC ---
  const [studentLoginLoading, setStudentLoginLoading] = useState(false);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = formData.email.trim().toLowerCase();

    // --- Client-side validations ---
    if (!formData.email.trim()) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }
    if (!formData.campusKey.trim()) {
      setMessage('Please enter your 6-digit University Key.');
      setMessageType('error');
      return;
    }
    if (formData.campusKey.trim().length !== 6) {
      setMessage('University Key must be exactly 6 characters.');
      setMessageType('error');
      return;
    }
    if (!formData.password) {
      setMessage('Please enter your password.');
      setMessageType('error');
      return;
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setMessageType('error');
      return;
    }

    setStudentLoginLoading(true);
    setMessage('Authenticating...');
    setMessageType('');

    try {
      // Do not disclose account role across dashboard-specific login forms.
      const { data: emailProfile, error: emailProfileError } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!emailProfileError && emailProfile && emailProfile.role !== 'student') {
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      // 1. Sign in with Email and Password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setMessage('Incorrect email or password. Please try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          setMessage('Your email is not verified. Please check your inbox for the verification link.');
        } else {
          setMessage(friendlyError(authError.message));
        }
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      // 2. Fetch Student Profile and University Key (Optimized: 1 Query)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          status,
          role,
          university_id,
          universities (
            six_digit_key,
            is_verified
          )
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      if (profile.role !== 'student') {
        await supabase.auth.signOut();
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      // 3. Kick if Rejected
      if (profile.status === 'rejected') {
        await supabase.auth.signOut();
        setMessage('Access Denied: Your account has been rejected by the administrator.');
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      if (profile.status === 'pending') {
        await supabase.auth.signOut();
        setMessage('Your account is pending approval. Please wait for admin verification.');
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      // 4. Verify the University Key
      // Check embedded university data directly
      const uniData = profile.universities;

      if (!uniData?.is_verified) {
        await supabase.auth.signOut();
        setMessage('Your university has been suspended. Contact support for assistance.');
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      if (uniData?.six_digit_key !== formData.campusKey) {
        await supabase.auth.signOut();
        setMessage('Incorrect University Key. Please check with your university admin.');
        setMessageType('error');
        setStudentLoginLoading(false);
        return;
      }

      setMessage('Login successful! Redirecting to your dashboard...');
      setMessageType('success');
      setTimeout(() => navigate('/student-dashboard'), 2000);
    } catch (err) {
      setMessage('Network error. Please check your internet connection and try again.');
      setMessageType('error');
    }
    setStudentLoginLoading(false);
  };

  // --- ORGANIZER LOGIN LOGIC ---
  const [organizerLoginLoading, setOrganizerLoginLoading] = useState(false);

  const handleOrganizerLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!formData.email.trim()) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }
    if (!formData.password) {
      setMessage('Please enter your password.');
      setMessageType('error');
      return;
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setMessageType('error');
      return;
    }

    setOrganizerLoginLoading(true);
    setMessage('Authenticating...');
    setMessageType('');

    try {
      const { data: emailProfile, error: emailProfileError } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!emailProfileError && emailProfile && emailProfile.role !== 'organizer') {
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setOrganizerLoginLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setMessage('Incorrect email or password. Please try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          setMessage('Your email is not verified. Please check your inbox.');
        } else {
          setMessage(friendlyError(authError.message));
        }
        setMessageType('error');
        setOrganizerLoginLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`status, role, university_id, universities(is_verified)`)
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setOrganizerLoginLoading(false);
        return;
      }

      if (profile.role !== 'organizer') {
        await supabase.auth.signOut();
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setOrganizerLoginLoading(false);
        return;
      }

      if (profile.status === 'rejected') {
        await supabase.auth.signOut();
        setMessage('Your organizer account has been deactivated. Contact your admin.');
        setMessageType('error');
        setOrganizerLoginLoading(false);
        return;
      }

      const uniCheck = profile.universities;
      if (uniCheck && !uniCheck.is_verified) {
        await supabase.auth.signOut();
        setMessage('Your university has been suspended. Contact support.');
        setMessageType('error');
        setOrganizerLoginLoading(false);
        return;
      }

      setMessage('Login successful! Redirecting...');
      setMessageType('success');
      setTimeout(() => navigate('/organizer-dashboard'), 2000);
    } catch (err) {
      setMessage('Network error. Please check your connection.');
      setMessageType('error');
    }
    setOrganizerLoginLoading(false);
  };

  // --- ADMIN LOGIN LOGIC ---
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = formData.email.trim().toLowerCase();

    // --- Client-side validations ---
    if (!formData.email.trim()) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }
    if (!formData.password) {
      setMessage('Please enter your password.');
      setMessageType('error');
      return;
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setMessageType('error');
      return;
    }

    setAdminLoginLoading(true);
    setMessage('Authenticating Admin...');
    setMessageType('');

    try {
      // Do not disclose account role across dashboard-specific login forms.
      const { data: emailProfile, error: emailProfileError } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (!emailProfileError && emailProfile && emailProfile.role !== 'admin') {
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setAdminLoginLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setMessage('Incorrect email or password. Please try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          setMessage('Your email is not verified. Please check your inbox for the verification link.');
        } else {
          setMessage(friendlyError(authError.message));
        }
        setMessageType('error');
        setAdminLoginLoading(false);
        return;
      }

      // Check Admin status (Optimized: Single Query)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          status,
          role,
          university_id,
          universities(is_verified)
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setAdminLoginLoading(false);
        return;
      }

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
        setAdminLoginLoading(false);
        return;
      }

      if (profile.status === 'rejected') {
        await supabase.auth.signOut();
        setMessage('Your account has been suspended. Contact support for assistance.');
        setMessageType('error');
        setAdminLoginLoading(false);
        return;
      }

      // Check if the admin's university is still verified
      const uniCheck = profile.universities;

      if (uniCheck && !uniCheck.is_verified) {
          await supabase.auth.signOut();
          setMessage('Your university has been suspended. Contact support for assistance.');
          setMessageType('error');
          setAdminLoginLoading(false);
          return;
      }

      setMessage('Login successful! Redirecting to admin dashboard...');
      setMessageType('success');
      setTimeout(() => navigate('/admin-dashboard'), 2000);
    } catch (err) {
      setMessage('Network error. Please check your internet connection and try again.');
      setMessageType('error');
    }
    setAdminLoginLoading(false);
  };

  // --- FORGOT PASSWORD LOGIC (mirrors Add University OTP pattern) ---

  // Cooldown timer for forgot password OTP
  useEffect(() => {
    if (forgotCooldown > 0) {
      const timer = setTimeout(() => setForgotCooldown(forgotCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCooldown]);

  const handleSendForgotOtp = async () => {
    if (!formData.email.trim()) {
      setForgotMessage('Please enter your email address.');
      setForgotMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setForgotMessage('Please enter a valid email address.');
      setForgotMessageType('error');
      return;
    }

    setForgotOtpLoading(true);
    setForgotMessage('Sending OTP to your email...');
    setForgotMessageType('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
      if (error) {
        setForgotMessage(friendlyError(error.message));
        setForgotMessageType('error');
      } else {
        setForgotOtpSent(true);
        setForgotCooldown(60);
        setForgotMessage(`OTP sent to ${formData.email}! Check your inbox.`);
        setForgotMessageType('success');
      }
    } catch (err) {
      setForgotMessage('Network error. Please check your connection.');
      setForgotMessageType('error');
    }
    setForgotOtpLoading(false);
  };

  const handleVerifyForgotOtp = async () => {
    if (!forgotOtp.trim()) {
      setForgotMessage('Please enter the OTP sent to your email.');
      setForgotMessageType('error');
      return;
    }
    if (forgotOtp.trim().length < 6) {
      setForgotMessage('OTP must be 6 digits. Please enter the complete code.');
      setForgotMessageType('error');
      return;
    }
    setForgotVerifyLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: forgotOtp,
        type: 'recovery'
      });

      if (error) {
        setForgotMessage('Invalid or expired OTP. Please check and try again.');
        setForgotMessageType('error');
      } else {
        setForgotOtpVerified(true);
        setForgotMessage('Email verified! You can now set your new password.');
        setForgotMessageType('success');
      }
    } catch (err) {
      setForgotMessage('Network error. Please check your connection and try again.');
      setForgotMessageType('error');
    }
    setForgotVerifyLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!forgotOtpVerified) {
      setForgotMessage('Please verify your email with OTP first.');
      setForgotMessageType('error');
      return;
    }

    if (!formData.newPassword) {
      setForgotMessage('Please enter a new password.');
      setForgotMessageType('error');
      return;
    }

    if (formData.newPassword.length < 6) {
      setForgotMessage('Password must be at least 6 characters long.');
      setForgotMessageType('error');
      return;
    }

    setForgotMessage('Updating password...');
    setForgotMessageType('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) {
        setForgotMessage(friendlyError(error.message));
        setForgotMessageType('error');
      } else {
        setForgotMessage('Password updated successfully!');
        setForgotMessageType('success');
        setTimeout(() => {
          setShowForgotModal(false);
          resetForgotState();
        }, 2000);
      }
    } catch (err) {
      setForgotMessage('Network error. Please try again.');
      setForgotMessageType('error');
    }
  };

  const resetForgotState = () => {
    setForgotOtpSent(false);
    setForgotOtpVerified(false);
    setForgotOtp('');
    setForgotMessage('');
    setForgotMessageType('');
    setForgotCooldown(0);
    setFormData(prev => ({ ...prev, newPassword: '' }));
  };

  useEffect(() => {
    if (messageType === 'success' && message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white">
      <header className="flex items-center justify-between px-6 md:px-12 py-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <GraduationCap className="text-zinc-950 w-5 h-5" />
          </div>
          <span className="text-lg font-black tracking-tight">UniEvent Connect</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-24 text-center relative">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-zinc-800/30 rounded-full blur-[100px] pointer-events-none" />
        <h1 className="text-5xl font-black text-white mb-6 relative z-10">Welcome Back</h1>
        <p className="text-xl text-zinc-400 mb-16 max-w-2xl mx-auto relative z-10">Select your role to log in and access your dashboard.</p>

        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          <div
            className="card-student flex flex-col items-center text-center p-10 group"
            onClick={() => setShowStudentModal(true)}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Users className="text-zinc-950 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black mb-3">Student Login</h3>
            <p className="text-zinc-400 text-base mb-8">Access events, register, and track your participation.</p>
            <button className="btn-secondary w-full">Access Portal</button>
          </div>

          <div
            className="card-admin flex flex-col items-center text-center p-10 group relative overflow-hidden"
            onClick={() => setShowOrganizerModal(true)}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform relative z-10">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-white relative z-10">Organizer Login</h3>
            <p className="text-zinc-400 text-base mb-8 relative z-10">Create events and manage community as an organizer.</p>
            <button className="btn-admin w-full relative z-10">Enter Console</button>
          </div>

          <div
            className="card-admin flex flex-col items-center text-center p-10 group relative overflow-hidden"
            onClick={() => setShowAdminModal(true)}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform relative z-10">
              <Settings className="text-white w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-white relative z-10">Admin Login</h3>
            <p className="text-zinc-400 text-base mb-8 relative z-10">Manage events, analytics, and campus activities.</p>
            <button className="btn-admin w-full relative z-10">Enter Console</button>
          </div>
        </div>
      </div>

      {/* Student Login Modal */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Student <span className="text-amber-500">Login</span></h2>
            <form onSubmit={handleStudentLogin}>
              <input
                type="email"
                name="email"
                placeholder="University Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl mb-4 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
                required
              />
              <input
                type="text"
                name="campusKey"
                placeholder="6-Digit Student Key"
                value={formData.campusKey}
                onChange={handleInputChange}
                maxLength="6"
                className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl mb-4 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
                required
              />
              <div className="relative mb-4">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-zinc-500 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-amber-500 hover:text-amber-400 text-sm font-bold mb-6 block transition-colors"
              >
                Forgot Password?
              </button>
              <button
                type="submit"
                disabled={studentLoginLoading}
                className="btn-secondary w-full"
              >
                {studentLoginLoading ? 'Authenticating...' : 'Enter Portal'}
              </button>
            </form>
            {message && (
              <p className={`mt-5 text-center text-sm font-bold ${messageType === 'success' ? 'text-amber-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
            <p className="text-center mt-6 text-zinc-400 font-medium text-sm">
              Don't have an account? <Link to="/signup" state={{ role: 'student' }} className="text-amber-500 hover:text-amber-400 font-bold transition-colors">Create one</Link>
            </p>
            <button onClick={() => { setShowStudentModal(false); setMessage(''); setFormData({ email: '', password: '', campusKey: '', newPassword: '' }); setShowPassword(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-700" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Admin <span className="text-red-600">Login</span></h2>
            <form onSubmit={handleAdminLogin}>
              <input
                type="email"
                name="email"
                placeholder="Institutional Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                required
              />
              <div className="relative mb-4">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-zinc-500 hover:text-red-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-red-600 hover:text-red-700 text-sm font-bold mb-6 block transition-colors"
              >
                Forgot Password?
              </button>
              <button
                type="submit"
                disabled={adminLoginLoading}
                className="btn-admin w-full"
              >
                {adminLoginLoading ? 'Authenticating...' : 'Enter Console'}
              </button>
            </form>
            {message && (
              <p className={`mt-5 text-center text-sm font-bold ${messageType === 'success' ? 'text-red-600' : 'text-red-500'}`}>
                {message}
              </p>
            )}
            <p className="text-center mt-6 text-zinc-400 font-medium text-sm">
              Don't have an account? <Link to="/signup" state={{ role: 'admin' }} className="text-red-600 hover:text-red-700 font-bold transition-colors">Create one</Link>
            </p>
            <button onClick={() => { setShowAdminModal(false); setMessage(''); setFormData({ email: '', password: '', campusKey: '', newPassword: '' }); setShowPassword(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Organizer Login Modal */}
      {showOrganizerModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Organizer <span className="text-red-500">Login</span></h2>
            <form onSubmit={handleOrganizerLogin}>
              <input
                type="email"
                name="email"
                placeholder="Organizer Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                required
              />
              <div className="relative mb-4">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-red-500 hover:text-red-400 text-sm font-bold mb-6 block transition-colors"
              >
                Forgot Password?
              </button>
              <button
                type="submit"
                disabled={organizerLoginLoading}
                className="btn-admin w-full"
              >
                {organizerLoginLoading ? 'Authenticating...' : 'Enter Console'}
              </button>
            </form>
            {message && (
              <p className={`mt-5 text-center text-sm font-bold ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
            <p className="text-center mt-6 text-zinc-400 font-medium text-sm">
              Invited by your admin? Check your email for the invite link.
            </p>
            <button onClick={() => { setShowOrganizerModal(false); setMessage(''); setFormData({ email: '', password: '', campusKey: '', newPassword: '' }); setShowPassword(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-700 to-zinc-500" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Reset Password</h2>
            <form onSubmit={handleResetPassword}>
              <div className="flex gap-2 mb-1">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:ring-2 focus:ring-zinc-600 font-medium transition-all ${forgotOtpVerified ? 'border-green-500 bg-green-500/10' : ''}`}
                  required
                  readOnly={forgotOtpVerified}
                />
                {!forgotOtpVerified && (
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={forgotCooldown > 0 || forgotOtpLoading}
                    className="px-5 py-4 bg-zinc-800 text-white text-sm font-bold rounded-xl hover:bg-zinc-700 transition-all whitespace-nowrap disabled:bg-zinc-800/50"
                  >
                    {forgotOtpLoading ? 'Sending...' : forgotCooldown > 0 ? `${forgotCooldown}s` : forgotOtpSent ? 'Resend' : 'Send'}
                  </button>
                )}
                {forgotOtpVerified && (
                  <div className="flex items-center px-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                )}
              </div>

              {forgotOtpSent && !forgotOtpVerified && (
                <div className="flex gap-2 mb-4 mt-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    maxLength="6"
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium rounded-xl focus:ring-2 focus:ring-zinc-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyForgotOtp}
                    disabled={forgotVerifyLoading}
                    className="px-5 py-4 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-500 transition-all whitespace-nowrap disabled:bg-green-800"
                  >
                    {forgotVerifyLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
              {!forgotOtpSent && <div className="mb-4"></div>}

              <input
                type="password"
                name="newPassword"
                placeholder="Enter New Password"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium rounded-xl mb-6 focus:ring-2 focus:ring-zinc-600 transition-all"
                required
              />

              <button
                type="submit"
                disabled={!forgotOtpVerified}
                className="w-full py-4 bg-white text-zinc-950 font-black rounded-xl hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50"
              >
                Update Password
              </button>
            </form>
            {forgotMessage && (
              <p className={`mt-5 text-center text-sm font-bold ${forgotMessageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {forgotMessage}
              </p>
            )}
            <button onClick={() => { setShowForgotModal(false); resetForgotState(); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <footer className="py-8 border-t border-zinc-800 text-center flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <p className="text-zinc-600 text-sm font-medium">
          © 2026 UniEvent Connect B2B Systems. All rights reserved.
        </p>
      </footer>
    </div >
  );
}