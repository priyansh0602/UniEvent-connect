// src/components/SettingsModal.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, Mail, Lock, CheckCircle, AlertTriangle, KeyRound, Camera } from 'lucide-react';

export default function SettingsModal({ onClose, onProfileUpdated, accentColor = 'blue', role = 'student', initialWarning = null }) {
  const [userEmail, setUserEmail] = useState('');

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [degree, setDegree] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password reset flow: 'idle' → 'otp-sent' → 'verified'
  const [resetStep, setResetStep] = useState('idle');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialWarning || '');
  const [messageType, setMessageType] = useState(initialWarning ? 'warning' : ''); // 'success' | 'error' | 'warning'
  const [cooldown, setCooldown] = useState(0);

  const otpRefs = useRef([]);

  // Color configs per dashboard
  const colors = {
    amber: {
      header: 'bg-zinc-900 border-b border-zinc-800',
      btn: 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20',
      tabActive: 'border-amber-500',
    },
    red: {
      header: 'bg-zinc-900 border-b border-zinc-800',
      btn: 'bg-gradient-to-r from-red-600 to-red-700 text-white font-bold hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/20',
      tabActive: 'border-red-500',
    },
  };
  const c = colors[accentColor] || colors.amber;

  // Fetch current user email and profile (role-aware)
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        // Fetch only the fields relevant to this role
        const selectFields = role === 'student'
          ? 'display_name, full_name, phone, degree, avatar_url'
          : 'full_name, phone';
        const { data: profile } = await supabase
          .from('profiles')
          .select(selectFields)
          .eq('id', session.user.id)
          .single();
        if (profile) {
          if (role === 'student') {
            if (profile.display_name) setDisplayName(profile.display_name);
            if (profile.degree) setDegree(profile.degree);
            if (profile.avatar_url) {
              setAvatarUrl(profile.avatar_url);
              setAvatarPreview(profile.avatar_url);
            }
          }
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.phone) setPhone(profile.phone);
        }
      }
    };
    fetchUser();
  }, [role]);

  const handleSaveProfile = async () => {
    // Only require display_name for students
    if (role === 'student' && !displayName.trim()) {
      setMessage('Display name cannot be empty.');
      setMessageType('error');
      return;
    }
    if (role === 'student' && displayName.trim().length > 20) {
      setMessage('Display name must be under 20 characters.');
      setMessageType('error');
      return;
    }
    
    if (role === 'organizer' && (!fullName || !fullName.trim())) {
      setMessage('Full name is required for organizers.');
      setMessageType('error');
      return;
    }
    
    setSavingProfile(true);
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let finalAvatarUrl = avatarUrl;
      // Handle Image Upload First (students only)
      if (role === 'student' && avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalAvatarUrl = urlData.publicUrl;
        setAvatarUrl(finalAvatarUrl);
      }

      // Build role-specific payload so admin and student don't overwrite each other
      let payload;
      if (role === 'admin' || role === 'organizer') {
        payload = {
          full_name: fullName.trim() || null,
          phone: role === 'organizer' ? null : (phone.trim() || null),
        };
      } else {
        payload = {
          display_name: displayName.trim(),
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          degree: degree.trim() || null,
          avatar_url: finalAvatarUrl || null
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      // Notify parent component immediately for instant UI update
      if (onProfileUpdated) {
        onProfileUpdated(payload);
      }
      
      setMessage('Changes saved!');
      setMessageType('success');
      // Auto-close after success
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setMessage('Failed to update profile.');
      setMessageType('error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Clear message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Step 1: Send OTP to email
  const handleSendOtp = async () => {
    if (!userEmail) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
      if (error) throw error;
      setResetStep('otp-sent');
      setCooldown(60);
      setMessage('OTP sent to your email!');
      setMessageType('success');
    } catch (err) {
      setMessage(err.message || 'Failed to send OTP.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Move back on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const token = otp.join('');
    if (token.length !== 6) {
      setMessage('Please enter the full 6-digit code.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: token,
        type: 'recovery',
      });
      if (error) throw error;
      setResetStep('verified');
      setMessage('OTP verified! Set your new password.');
      setMessageType('success');
    } catch (err) {
      setMessage(err.message || 'Invalid OTP. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update password
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage('Please fill in both fields.');
      setMessageType('error');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setMessageType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage('Password updated successfully!');
      setMessageType('success');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setMessage(err.message || 'Failed to update password.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${c.header} p-4 flex items-center justify-between`}>
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-white opacity-80 hover:opacity-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => { setActiveTab('profile'); if (messageType !== 'warning') setMessage(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${activeTab === 'profile' ? `text-white border-b-2 ${c.tabActive || 'border-red-500'} bg-zinc-800/50` : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Profile
          </button>
          <button
            onClick={() => { setActiveTab('security'); if (messageType !== 'warning') setMessage(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${activeTab === 'security' ? `text-white border-b-2 ${c.tabActive || 'border-red-500'} bg-zinc-800/50` : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Security
          </button>
        </div>

        {/* Content */}
        <div className="p-5">

        {activeTab === 'profile' && (
          <div>
            {role === 'student' ? (
              /* ═══ STUDENT PROFILE ═══ */
              <>
                <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                  Community Identity
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Set a pseudo-name to interact in event communities.
                </p>

                {/* Avatar and Display Name Row */}
                <div className="flex items-center gap-6 mb-4 border-b border-zinc-800 pb-4">
                  <div 
                    className="relative group cursor-pointer rounded-full shrink-0" 
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <div className={`w-16 h-16 rounded-full border-3 ${avatarPreview ? 'border-amber-500/30' : 'border-zinc-800'} bg-zinc-900 overflow-hidden shadow-lg flex items-center justify-center transition duration-300 group-hover:border-amber-500`}>
                      {avatarPreview ? (
                         <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                         <Camera className="w-6 h-6 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                       <Camera className="w-4 h-4 text-white mb-0.5" />
                       <span className="text-[9px] font-bold text-white uppercase tracking-wider">Upload</span>
                    </div>
                    <input 
                      id="avatar-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }} 
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Display Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. CodeNinja99"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength="20"
                      className="w-full p-2 text-sm border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1 text-right">{displayName.length}/20</p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white mb-0.5">Personal Details</h4>
                <p className="text-[10px] text-zinc-500 mb-3 tracking-wide">ONLY VISIBLE TO EVENT ADMINS.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full p-2 text-sm border border-zinc-700 bg-zinc-900/50 text-zinc-500 rounded-lg cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-2 text-sm border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98XXX XXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2 text-sm border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Degree</label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech CS"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full p-2 text-sm border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* ═══ ADMIN / ORGANIZER PROFILE ═══ */
              <>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  {role === 'organizer' ? 'Organizer Profile' : 'Admin Profile'}
                </h3>
                <p className="text-sm text-zinc-400 mb-5">
                  Manage your {role === 'organizer' ? 'organizer' : 'administrator'} account details.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full p-2 text-sm border border-zinc-700 bg-zinc-900/50 text-zinc-500 rounded-lg cursor-not-allowed"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder={role === 'organizer' ? 'e.g. John Doe' : 'e.g. Dr. John Doe'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full p-2 text-sm border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-red-500 focus:border-red-500 transition"
                      />
                    </div>
                    {role !== 'organizer' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+91 98XXX XXXXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full p-2 text-sm border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-red-500 focus:border-red-500 transition"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className={`w-full py-3 rounded-xl transition-all text-sm ${
                savingProfile ? 'bg-zinc-800 cursor-wait text-zinc-500 border border-zinc-700 font-medium' : c.btn
              }`}
            >
              {savingProfile ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : '💾 Save Profile'}  
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Reset Password
          </h3>

          {/* ═══ Step 1: Send OTP ═══ */}
          {resetStep === 'idle' && (
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                We'll send a 6-digit OTP to your registered email for verification.
              </p>
              <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-lg mb-4 border border-zinc-800">
                <Mail className="w-5 h-5 text-zinc-500" />
                <span className="text-sm font-medium text-white truncate">
                  {userEmail || 'Loading...'}
                </span>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className={`w-full py-2.5 text-white font-semibold rounded-lg transition shadow-sm ${
                  loading ? 'bg-zinc-800 cursor-wait text-zinc-500' : c.btn
                }`}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          )}

          {/* ═══ Step 2: Enter & Verify OTP ═══ */}
          {resetStep === 'otp-sent' && (
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                Enter the 6-digit code sent to <span className="font-medium text-white">{userEmail}</span>
              </p>

              {/* OTP Input Boxes */}
              <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-zinc-700 bg-zinc-950 text-white rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-900/50 outline-none transition"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length !== 6}
                className={`w-full py-2.5 text-white font-semibold rounded-lg transition shadow-sm ${
                  loading || otp.join('').length !== 6 ? 'bg-zinc-800 cursor-not-allowed text-zinc-500 border border-zinc-700' : c.btn
                }`}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              {/* Resend OTP with cooldown */}
              <button
                onClick={handleSendOtp}
                disabled={cooldown > 0 || loading}
                className={`w-full mt-2 py-2 text-sm font-medium transition ${
                  cooldown > 0 ? 'text-zinc-500 cursor-not-allowed' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>

              <button
                onClick={() => { setResetStep('idle'); setOtp(['', '', '', '', '', '']); setMessage(''); setCooldown(0); }}
                className="w-full mt-1 py-2 text-sm text-zinc-500 hover:text-white transition"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ═══ Step 3: Set New Password ═══ */}
          {resetStep === 'verified' && (
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                OTP verified! Enter your new password below.
              </p>

              <div className="space-y-3 mb-5">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 p-3 border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 p-3 border border-zinc-700 bg-zinc-950 text-white rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdatePassword}
                disabled={loading}
                className={`w-full py-2.5 text-white font-semibold rounded-lg transition shadow-sm ${
                  loading ? 'bg-zinc-800 cursor-wait text-zinc-500 border border-zinc-700' : c.btn
                }`}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
          </div>
        )}

          {/* Status message */}
          {message && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
              messageType === 'success' ? 'text-green-600 bg-green-500/10 border border-green-500/30' :
              messageType === 'warning' ? 'text-amber-600 bg-amber-500/10 border border-amber-500/30' :
              'text-red-500 bg-red-500/10 border border-red-500/30'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
