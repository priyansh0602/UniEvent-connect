// src/pages/OrganizerInvite.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { friendlyError } from '../utils/friendlyError';
import { GraduationCap, ArrowLeft, CheckCircle, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';

export default function OrganizerInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [step, setStep] = useState('loading'); // 'loading' | 'invalid' | 'signup' | 'otp' | 'done'
  const [invitation, setInvitation] = useState(null);
  const [universityName, setUniversityName] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isExistingUser, setIsExistingUser] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !emailParam) {
        setStep('invalid');
        return;
      }

      try {
        const { data: invite, error } = await supabase
          .from('organizer_invitations')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (error || !invite) {
          setStep('invalid');
          return;
        }

        // Security check: email in URL must match the invitation record
        if (invite.email.toLowerCase() !== emailParam.toLowerCase()) {
          setStep('invalid');
          setMessage('Email must be the same one to which the link was sent.');
          setMessageType('error');
          return;
        }

        if (invite.status === 'accepted') {
          setStep('invalid');
          setMessage('This invitation has already been used. Please log in instead.');
          setMessageType('error');
          return;
        }

        setInvitation(invite);

        // Fetch university name
        const { data: uni } = await supabase
          .from('universities')
          .select('name')
          .eq('id', invite.university_id)
          .single();

        if (uni) setUniversityName(uni.name);
        setStep('signup');
      } catch (err) {
        setStep('invalid');
      }
    };

    verifyToken();
  }, [token, emailParam]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Clear messages
  useEffect(() => {
    if (message && messageType === 'success') {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!password) {
      setMessage('Please set a password.');
      setMessageType('error');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Creating your account...');
    setMessageType('info');

    try {
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({
        email: emailParam.toLowerCase(),
        password: password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          // If already registered, we send a Magic Link / OTP to verify ownership
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: emailParam.toLowerCase(),
            options: {
              shouldCreateUser: false
            }
          });

          if (otpError) throw otpError;

          setIsExistingUser(true);
          setOtpSent(true);
          setCooldown(60);
          setStep('otp');
          setMessage(`Welcome back! An OTP has been sent to ${emailParam} to verify your identity.`);
          setMessageType('success');
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        // This is another way Supabase indicates the user already exists
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: emailParam.toLowerCase(),
          options: {
            shouldCreateUser: false
          }
        });

        if (otpError) throw otpError;

        setIsExistingUser(true);
        setOtpSent(true);
        setCooldown(60);
        setStep('otp');
        setMessage(`Welcome back! An OTP has been sent to ${emailParam} to verify your identity.`);
        setMessageType('success');
        setLoading(false);
        return;
      }

      setOtpSent(true);
      setCooldown(60);
      setStep('otp');
      setMessage(`OTP sent to ${emailParam}! Check your inbox.`);
      setMessageType('success');
    } catch (err) {
      setMessage(friendlyError(err.message));
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setMessage('Please enter the OTP.');
      setMessageType('error');
      return;
    }
    if (otp.trim().length < 6) {
      setMessage('OTP must be 6 digits.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Verifying OTP...');
    setMessageType('info');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailParam.toLowerCase(),
        token: otp,
        type: isExistingUser ? 'email' : 'signup'
      });

      if (error) {
        setMessage('Invalid or expired OTP. Please try again.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // If they are a returning user, we also update their password to the one they just typed
      if (isExistingUser) {
        const { error: pwdError } = await supabase.auth.updateUser({
          password: password
        });
        if (pwdError) {
          console.error('Failed to update password:', pwdError);
          // We continue anyway since they are verified and logged in now
        }
      }

      // OTP verified, now create profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please try again.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // Create organizer profile
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: session.user.id,
        email: emailParam.toLowerCase(),
        role: 'organizer',
        university_id: invitation.university_id,
        university_name: universityName,
        status: 'verified'
      }]);

      if (profileError) {
        if (profileError.message.includes('duplicate') || profileError.code === '23505') {
          setMessage('This email is already registered. Please log in instead.');
        } else {
          setMessage(friendlyError(profileError.message));
        }
        setMessageType('error');
        setLoading(false);
        return;
      }

      // Mark invitation as accepted
      await supabase
        .from('organizer_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      setStep('done');
      setMessage('Account created successfully! Redirecting...');
      setMessageType('success');
      setTimeout(() => navigate('/organizer-dashboard'), 2000);
    } catch (err) {
      setMessage(friendlyError(err.message));
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      let error;
      if (isExistingUser) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: emailParam.toLowerCase(),
          options: {
            shouldCreateUser: false
          }
        });
        error = otpError;
      } else {
        const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: emailParam.toLowerCase() });
        error = resendError;
      }

      if (error) {
        setMessage(friendlyError(error.message));
        setMessageType('error');
      } else {
        setMessage('New OTP sent!');
        setMessageType('success');
        setCooldown(60);
      }
    } catch (err) {
      setMessage('Network error.');
      setMessageType('error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50 sticky top-0 z-50">
        <Link to="/login" className="flex items-center gap-2 text-zinc-400 hover:text-white font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Login
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-xl shadow-lg shadow-red-500/20">
            <GraduationCap className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-black tracking-tight">UniEvent Connect</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">

          {/* Loading State */}
          {step === 'loading' && (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-400 font-medium">Verifying your invitation...</p>
            </div>
          )}

          {/* Invalid Token */}
          {step === 'invalid' && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Invalid Invitation</h2>
              <p className="text-zinc-400 mb-6">
                {message || 'This invitation link is invalid or has expired. Please contact your university admin for a new invitation.'}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
                style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* Signup Form */}
          {step === 'signup' && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-700" />

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-white">
                  Organizer <span className="text-red-500">Setup</span>
                </h2>
                {universityName && (
                  <p className="text-zinc-400 text-sm mt-2">
                    You've been invited to <span className="text-white font-semibold">{universityName}</span>
                  </p>
                )}
              </div>

              <form onSubmit={handleSignup}>
                {/* Email (read-only) */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={emailParam || ''}
                    disabled
                    className="w-full p-4 bg-zinc-950 border border-zinc-700 text-zinc-400 rounded-xl cursor-not-allowed font-medium"
                  />
                </div>

                {/* Password */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Set Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-white font-black rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
                >
                  {loading ? 'Creating Account...' : 'Continue →'}
                </button>
              </form>

              {message && (
                <p className={`mt-5 text-center text-sm font-bold ${
                  messageType === 'success' ? 'text-green-400' :
                  messageType === 'info' ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {message}
                </p>
              )}
            </div>
          )}

          {/* OTP Verification */}
          {step === 'otp' && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-700" />

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-3xl font-black text-white">
                  Verify <span className="text-red-500">Email</span>
                </h2>
                <p className="text-zinc-400 text-sm mt-2">
                  Enter the 6-digit OTP sent to <span className="text-white font-semibold">{emailParam}</span>
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength="6"
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-center text-xl tracking-[0.5em]"
                />

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full py-4 text-white font-black rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
                >
                  {loading ? 'Verifying...' : 'Verify & Complete Setup'}
                </button>

                <button
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className={`w-full py-3 text-sm font-medium transition ${
                    cooldown > 0 ? 'text-zinc-500 cursor-not-allowed' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>

              {message && (
                <p className={`mt-5 text-center text-sm font-bold ${
                  messageType === 'success' ? 'text-green-400' :
                  messageType === 'info' ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {message}
                </p>
              )}
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Welcome Aboard! 🎉</h2>
              <p className="text-zinc-400 mb-4">Your organizer account has been created successfully.</p>
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-500 text-sm mt-3">Redirecting to your dashboard...</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-800 text-center bg-zinc-950">
        <p className="text-zinc-600 text-sm font-medium">
          © 2026 UniEvent Connect B2B Systems. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
