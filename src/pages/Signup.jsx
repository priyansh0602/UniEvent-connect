// src/pages/Signup.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Users, Settings, ArrowLeft, Eye, EyeOff, Plus, CheckCircle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { friendlyError } from '../utils/friendlyError';

export default function Signup() {
  const navigate = useNavigate();
  const EMAIL_ALREADY_USED_MESSAGE = 'Email already used.';
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAddUniModal, setShowAddUniModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const [universities, setUniversities] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    university: '',
    password: '',
    campusKey: '',
    uniEmail: '',
    uniName: '',
    uniDomain: '',
    adminKey: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Student OTP state (mirrors Add University OTP pattern)
  const [studentOtpSent, setStudentOtpSent] = useState(false);
  const [studentOtpVerified, setStudentOtpVerified] = useState(false);
  const [studentOtp, setStudentOtp] = useState('');
  const [studentOtpLoading, setStudentOtpLoading] = useState(false);
  const [studentVerifyLoading, setStudentVerifyLoading] = useState(false);

  // Add University OTP state
  const [uniOtpSent, setUniOtpSent] = useState(false);
  const [uniOtpVerified, setUniOtpVerified] = useState(false);
  const [uniOtp, setUniOtp] = useState('');
  const [generatedUniOtp, setGeneratedUniOtp] = useState('');
  const [uniOtpCooldown, setUniOtpCooldown] = useState(0);
  const [uniMessage, setUniMessage] = useState('');
  const [uniMessageType, setUniMessageType] = useState('');
  const [instaDmVerified, setInstaDmVerified] = useState(false);

  // Store the admin email used to create a university (for restriction)
  const [lockedAdminEmail, setLockedAdminEmail] = useState('');

  // Check state from navigation
  const location = useLocation();
  useEffect(() => {
    if (location.state?.role === 'student') {
      setShowStudentModal(true);
      // Clean up state so a refresh doesn't reopen it
      window.history.replaceState({}, document.title);
    } else if (location.state?.role === 'admin') {
      setShowAdminModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch universities on mount
  useEffect(() => {
    fetchUniversities();
    
    // Dynamically load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchUniversities = async () => {
    const { data } = await supabase
      .from('universities')
      .select('*')
      .eq('is_verified', true);

    if (data) setUniversities(data);
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Cooldown timer for university OTP
  useEffect(() => {
    if (uniOtpCooldown > 0) {
      const timer = setTimeout(() => setUniOtpCooldown(uniOtpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [uniOtpCooldown]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- STUDENT SIGNUP & OTP LOGIC (mirrors Add University OTP pattern) ---

  const handleSendStudentOtp = async () => {
    if (!formData.email.trim()) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address (e.g., name@example.com).');
      setMessageType('error');
      return;
    }
    if (!formData.password) {
      setMessage('Please enter a password before sending OTP.');
      setMessageType('error');
      return;
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setMessageType('error');
      return;
    }

    setStudentOtpLoading(true);
    setMessage('Sending OTP to your email...');
    setMessageType('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setMessage(EMAIL_ALREADY_USED_MESSAGE);
          setMessageType('error');
        } else {
          setMessage(friendlyError(error.message));
          setMessageType('error');
        }
      } else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        // Supabase may return a "success" response for existing users when email confirmation is enabled.
        setMessage(EMAIL_ALREADY_USED_MESSAGE);
        setMessageType('error');
      } else {
        setStudentOtpSent(true);
        setResendCooldown(60);
        setMessage(`OTP sent to ${formData.email}! Check your inbox.`);
        setMessageType('success');
      }
    } catch (err) {
      setMessage('Network error. Please check your connection.');
      setMessageType('error');
    }
    setStudentOtpLoading(false);
  };

  const handleVerifyStudentOtp = async () => {
    if (!studentOtp.trim()) {
      setMessage('Please enter the OTP sent to your email.');
      setMessageType('error');
      return;
    }
    if (studentOtp.trim().length < 6) {
      setMessage('OTP must be 6 digits. Please enter the complete code.');
      setMessageType('error');
      return;
    }
    setStudentVerifyLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: studentOtp,
        type: 'signup'
      });

      if (error) {
        // Try 'email' type as fallback (for signInWithOtp path)
        const { error: err2 } = await supabase.auth.verifyOtp({
          email: formData.email,
          token: studentOtp,
          type: 'email'
        });
        if (err2) {
          setMessage(friendlyError(err2.message));
          setMessageType('error');
        } else {
          setStudentOtpVerified(true);
          setMessage('Email verified successfully!');
          setMessageType('success');
        }
      } else {
        setStudentOtpVerified(true);
        setMessage('Email verified successfully!');
        setMessageType('success');
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    }
    setStudentVerifyLoading(false);
  };

  const handleStudentSignup = async (e) => {
    e.preventDefault();

    if (!studentOtpVerified) {
      setMessage('Please verify your email with OTP first.');
      setMessageType('error');
      return;
    }

    if (!formData.university) {
      setMessage('Please select your university.');
      setMessageType('error');
      return;
    }

    if (!formData.campusKey.trim()) {
      setMessage('Please enter the 6-digit University Key.');
      setMessageType('error');
      return;
    }

    if (!/^\d{6}$/.test(formData.campusKey.trim())) {
      setMessage('University Key must be exactly 6 digits.');
      setMessageType('error');
      return;
    }

    const selectedUni = universities.find(u => u.name === formData.university);
    if (!selectedUni) {
      setMessage('Selected university not found. Please choose from the list.');
      setMessageType('error');
      return;
    }

    if (selectedUni.email_domain && !formData.email.toLowerCase().endsWith(selectedUni.email_domain.toLowerCase())) {
      setMessage(`You must verify with a student email ending in ${selectedUni.email_domain} for this university.`);
      setMessageType('error');
      return;
    }

    if (formData.campusKey !== selectedUni.six_digit_key) {
      setMessage('Incorrect University Key. Please check with your university admin.');
      setMessageType('error');
      return;
    }

    setMessage('Creating account...');
    setMessageType('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || session.user.email !== formData.email) {
        setMessage('Session expired. Please verify your email again.');
        setMessageType('error');
        setStudentOtpSent(false);
        setStudentOtpVerified(false);
        setStudentOtp('');
        return;
      }

      const signedUpUser = session.user;

      const { error: profileError } = await supabase.from('profiles').insert([{
        id: signedUpUser.id,
        email: formData.email,
        role: 'student',
        university_id: selectedUni?.id,
        university_name: formData.university,
        status: 'verified'
      }]);

      if (profileError) {
        if (profileError.message.includes('duplicate') || profileError.code === '23505') {
          setMessage(EMAIL_ALREADY_USED_MESSAGE);
        } else {
          setMessage(friendlyError(profileError.message));
        }
        setMessageType('error');
        return;
      }

      setMessage('Account created! Redirecting...');
      setMessageType('success');
      setTimeout(() => navigate('/student-dashboard'), 2000);
    } catch (err) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    }
  };

  // --- ADMIN SIGNUP LOGIC ---
  const handleAdminSignup = async (e) => {
    e.preventDefault();

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

    // Check if admin is using the email they registered the university with
    if (lockedAdminEmail && formData.email.toLowerCase() !== lockedAdminEmail.toLowerCase()) {
      setMessage(`You must sign up with the email you used to register your university (${lockedAdminEmail}).`);
      setMessageType('error');
      return;
    }

    if (!formData.university) {
      setMessage('Please select a university. If yours is not listed, add it first using the + button.');
      setMessageType('error');
      return;
    }

    if (!formData.password) {
      setMessage('Please create a password.');
      setMessageType('error');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setMessageType('error');
      return;
    }

    setMessage('Creating Admin account...');
    setMessageType('');

    try {
      // Check if this university already has an admin
      const selectedUni = universities.find(u => u.name === formData.university);
      if (selectedUni) {
        const { data: existingAdmin } = await supabase
          .from('profiles')
          .select('id')
          .eq('university_id', selectedUni.id)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        if (existingAdmin) {
          setMessage('This university already has an admin. Please contact the existing admin or choose a different university.');
          setMessageType('error');
          return;
        }
      }

      // Admin must have a verified session (from Add University OTP flow)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || session.user.email !== formData.email) {
        setMessage('Please add your university first to verify your email before signing up as admin.');
        setMessageType('error');
        return;
      }

      const signedUpUser = session.user;

      // Update password from temporary one to user's chosen password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (passwordError) {
        setMessage(friendlyError(passwordError.message));
        setMessageType('error');
        return;
      }

      // Re-fetch the real university from Supabase to get the correct ID
      const { data: realUni } = await supabase
        .from('universities')
        .select('id')
        .eq('name', formData.university)
        .single();

      if (!realUni) {
        setMessage('University not found. Please add your university first.');
        setMessageType('error');
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert([{
          id: signedUpUser.id,
          email: formData.email,
          role: 'admin',
          university_id: realUni.id,
          university_name: formData.university,
          status: 'verified'
        }]);

        if (profileError) {
          if (profileError.message.includes('duplicate') || profileError.code === '23505') {
            setMessage(EMAIL_ALREADY_USED_MESSAGE);
          } else {
            setMessage(friendlyError(profileError.message));
          }
          setMessageType('error');
        } else {
          setMessage('Admin account created! Redirecting to dashboard...');
          setMessageType('success');
          setTimeout(() => navigate('/admin-dashboard'), 2000);
        }
    } catch (err) {
      setMessage('Network error. Please check your connection and try again.');
      setMessageType('error');
    }
  };

  // --- SEND OTP FOR UNIVERSITY EMAIL VERIFICATION (real) ---
  const [uniOtpLoading, setUniOtpLoading] = useState(false);

  const handleSendUniOtp = async () => {
    if (!formData.uniEmail.trim()) {
      setUniMessage('Please enter your email address.');
      setUniMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.uniEmail)) {
      setUniMessage('Please enter a valid email address (e.g., name@example.com).');
      setUniMessageType('error');
      return;
    }

    setUniOtpLoading(true);
    setUniMessage('Sending OTP to your email...');
    setUniMessageType('');

    try {
      // Use signUp with a temp password — this sends a real 6-digit OTP to the email
      const tempPassword = 'TempPass_' + Date.now() + '!';
      const { data, error } = await supabase.auth.signUp({
        email: formData.uniEmail,
        password: tempPassword,
      });

      if (error) {
        // If user already exists, try sending OTP via signInWithOtp as fallback
        if (error.message.includes('already registered')) {
          setUniMessage(EMAIL_ALREADY_USED_MESSAGE);
          setUniMessageType('error');
        } else {
          setUniMessage(friendlyError(error.message));
          setUniMessageType('error');
        }
      } else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        // Supabase may return a "success" response for existing users when email confirmation is enabled.
        setUniMessage(EMAIL_ALREADY_USED_MESSAGE);
        setUniMessageType('error');
      } else {
        setUniOtpSent(true);
        setUniOtpCooldown(60);
        setUniMessage(`OTP sent to ${formData.uniEmail}! Check your inbox.`);
        setUniMessageType('success');
      }
    } catch (err) {
      setUniMessage('Network error. Please check your connection.');
      setUniMessageType('error');
    }
    setUniOtpLoading(false);
  };

  // --- VERIFY OTP FOR UNIVERSITY EMAIL (real) ---
  const [uniVerifyLoading, setUniVerifyLoading] = useState(false);

  const handleVerifyUniOtp = async () => {
    if (!uniOtp.trim()) {
      setUniMessage('Please enter the OTP sent to your email.');
      setUniMessageType('error');
      return;
    }
    if (uniOtp.trim().length < 6) {
      setUniMessage('OTP must be 6 digits. Please enter the complete code.');
      setUniMessageType('error');
      return;
    }
    setUniVerifyLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: formData.uniEmail,
        token: uniOtp,
        type: 'signup'
      });

      if (error) {
        // Try 'email' type as fallback (for signInWithOtp path)
        const { error: err2 } = await supabase.auth.verifyOtp({
          email: formData.uniEmail,
          token: uniOtp,
          type: 'email'
        });
        if (err2) {
          setUniMessage(friendlyError(err2.message));
          setUniMessageType('error');
        } else {
          setUniOtpVerified(true);
          setUniMessage('Email verified successfully!');
          setUniMessageType('success');
        }
      } else {
        setUniOtpVerified(true);
        setUniMessage('Email verified successfully!');
        setUniMessageType('success');
      }
    } catch (err) {
      setUniMessage('Network error. Please try again.');
      setUniMessageType('error');
    }
    setUniVerifyLoading(false);
  };

  // --- ADD UNIVERSITY & PAYMENT LOGIC ---
  const handleAddUni = (e) => {
    e.preventDefault();

    if (!uniOtpVerified) {
      setUniMessage('Please verify your email with OTP first.');
      setUniMessageType('error');
      return;
    }

    if (!formData.uniName.trim()) {
      setUniMessage('Please enter the university name.');
      setUniMessageType('error');
      return;
    }

    if (!formData.uniDomain.trim()) {
      setUniMessage('Please enter the university email domain (e.g., @poornima.edu.in).');
      setUniMessageType('error');
      return;
    }

    if (!formData.uniDomain.startsWith('@')) {
      setUniMessage('University domain must start with "@" (e.g., @poornima.edu.in).');
      setUniMessageType('error');
      return;
    }

    if (!formData.adminKey.trim()) {
      setUniMessage('Please set a 6-digit Student Key.');
      setUniMessageType('error');
      return;
    }

    if (!/^\d{6}$/.test(formData.adminKey.trim())) {
      setUniMessage('Student Key must be exactly 6 digits (numbers only).');
      setUniMessageType('error');
      return;
    }

    if (!instaDmVerified) {
      setUniMessage('You must confirm that you sent an Instagram DM before proceeding.');
      setUniMessageType('error');
      return;
    }

    // Instant local check for duplicate university
    const alreadyExists = universities.some(
      u => u.name.toLowerCase() === formData.uniName.toLowerCase()
    );
    if (alreadyExists) {
      setUniMessage('This university is already registered.');
      setUniMessageType('error');
      return;
    }

    setShowAddUniModal(false);
    setShowPaymentModal(true);
    setPaymentDone(false);
    setUniMessage('');
  };

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const handlePayment = async () => {
    setPaymentProcessing(true);
    setUniMessage('');

    try {
      // 1. Generate Order ID from our secure Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: 99 }
      });

      if (orderError) throw orderError;

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use Environment Variable
        amount: orderData.amount, 
        currency: "INR",
        name: "UniEvent Connect",
        description: "University B2B License",
        order_id: orderData.id,
        handler: async function (response) {
          // Payment Success Callback
          setPaymentDone(true);
          // Wait briefly, then proceed to finalize setup ONLY once
          handlePaymentContinue();
        },
        prefill: {
          name: formData.uniName,
          email: formData.uniEmail,
        },
        theme: {
          color: "#f59e0b" // Amber-500
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response){
        setUniMessage(response.error.description);
        setUniMessageType('error');
        setPaymentProcessing(false);
      });

      rzp.open();
    } catch (err) {
      setUniMessage(err.message || 'Payment initiation failed.');
      setUniMessageType('error');
      setPaymentProcessing(false);
    }
  };

  const handlePaymentContinue = async () => {
    // Insert university into Supabase first to get real ID and prevent duplicates
    const { data: insertedUni, error: insertError } = await supabase
      .from('universities')
      .insert([{
        name: formData.uniName,
        email_domain: formData.uniDomain,
        six_digit_key: formData.adminKey,
        admin_email: formData.uniEmail,
        is_verified: true
      }])
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.code === '23505') {
        const errMessage = 'You already registered this university. Please log in or use a different name.';
        setUniMessage(errMessage);
        alert(errMessage);
      } else {
        const errMessage = 'Failed to add university. Please try again.';
        setUniMessage(errMessage);
        alert(errMessage);
      }
      setUniMessageType('error');
      // DO NOT route them to the Add Uni modal with a wiped OTP state. Let them see the error.
      setShowPaymentModal(false);
      setShowAddUniModal(true);
      return;
    }

    // Refresh the full list from Supabase
    await fetchUniversities();

    // Lock the admin email & pre-fill the admin signup form
    setLockedAdminEmail(formData.uniEmail);
    setFormData(prev => ({
      ...prev,
      email: prev.uniEmail,
      university: prev.uniName,
    }));

    // Close payment modal, open admin signup modal
    setShowPaymentModal(false);
    setPaymentDone(false);
    setShowAdminModal(true);
    setMessage(`${formData.uniName} added! Complete your admin signup below.`);
    setMessageType('success');

    // Reset Add-Uni OTP state
    setUniOtpSent(false);
    setUniOtpVerified(false);
    setUniOtp('');
    setGeneratedUniOtp('');
    setUniMessage('');
  };

  const handleResendStudentOtp = async () => {
    if (resendCooldown > 0) return;
    setStudentOtpLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: formData.email });
      if (error) { setMessage(friendlyError(error.message)); setMessageType('error'); }
      else { setMessage('New code sent!'); setMessageType('success'); setResendCooldown(60); }
    } catch (err) {
      setMessage('Network error.'); setMessageType('error');
    }
    setStudentOtpLoading(false);
  };

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
        <h1 className="text-5xl font-black text-white mb-6 relative z-10">Join UniEvent Connect</h1>
        <p className="text-xl text-zinc-400 mb-16 max-w-2xl mx-auto relative z-10">Select your role to create an account and get started.</p>

        <div className="grid md:grid-cols-2 gap-10 relative z-10">
          <div className="card-student flex flex-col items-center text-center p-12 group" onClick={() => { setShowStudentModal(true); setMessage(''); }}>
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Users className="text-zinc-950 w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black mb-4">Sign Up as Student</h3>
            <p className="text-zinc-400 text-lg mb-8">Register for events and track participation.</p>
            <button className="btn-secondary w-full">Join Portal</button>
          </div>

          <div className="card-admin flex flex-col items-center text-center p-12 group" onClick={() => { setShowAdminModal(true); setMessage(''); }}>
             <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform relative z-10">
              <Settings className="text-white w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black mb-4 text-white relative z-10">Sign Up as Admin</h3>
            <p className="text-zinc-400 text-lg mb-8 relative z-10">Manage university events and analytics.</p>
            <button className="btn-admin w-full relative z-10">Create Console</button>
          </div>
        </div>

        <div className="mt-12 text-zinc-400 font-medium relative z-10 text-lg">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:text-amber-400 font-bold hover:underline transition-colors">
            Log in here
          </Link>
        </div>
      </div>

      {/* Student Modal */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Student <span className="text-amber-500">Signup</span></h2>
            <form onSubmit={handleStudentSignup}>
              {/* Email with Send OTP button */}
              <div className="flex gap-2 mb-1">
                <input
                  type="email"
                  name="email"
                  placeholder="University Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-amber-500 rounded-xl transition-all ${studentOtpVerified ? 'border-green-500 bg-green-500/10' : ''}`}
                  required
                  readOnly={studentOtpVerified}
                />
                {!studentOtpVerified && (
                  <button
                    type="button"
                    onClick={studentOtpSent && resendCooldown === 0 ? handleResendStudentOtp : handleSendStudentOtp}
                    disabled={resendCooldown > 0 || studentOtpLoading}
                    className="px-5 py-4 bg-zinc-800 text-white text-sm font-bold rounded-xl hover:bg-zinc-700 transition whitespace-nowrap disabled:bg-zinc-800/50"
                  >
                    {studentOtpLoading ? 'Sending...' : resendCooldown > 0 ? `${resendCooldown}s` : studentOtpSent ? 'Resend' : 'Send'}
                  </button>
                )}
                {studentOtpVerified && (
                  <div className="flex items-center px-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                )}
              </div>

              {/* OTP input */}
              {studentOtpSent && !studentOtpVerified && (
                <div className="flex gap-2 mb-4 mt-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={studentOtp}
                    onChange={(e) => setStudentOtp(e.target.value)}
                    maxLength="6"
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-amber-500 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyStudentOtp}
                    disabled={studentVerifyLoading}
                    className="px-5 py-4 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-500 transition whitespace-nowrap disabled:bg-green-800"
                  >
                    {studentVerifyLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
              {!studentOtpSent && <div className="mb-4"></div>}

              {/* Remaining fields */}
              <div className="relative mb-4">
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create Password" value={formData.password} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-amber-500 rounded-xl transition-all" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-zinc-500 hover:text-amber-500 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <select name="university" value={formData.university} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-zinc-400 font-medium focus:ring-2 focus:ring-amber-500 rounded-xl mb-4 transition-all" required>
                <option value="" className="text-zinc-500">Select University</option>
                {universities.map((uni, idx) => <option key={idx} value={uni.name} className="text-white">{uni.name}</option>)}
              </select>
              <input type="text" name="campusKey" placeholder="6-Digit Student Key" value={formData.campusKey} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-amber-500 rounded-xl mb-6 transition-all" required />

              <button type="submit" disabled={!studentOtpVerified} className="btn-secondary w-full disabled:opacity-50">
                Create Account
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-zinc-400 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-500 hover:text-amber-400 font-bold hover:underline transition-colors">Log in here</Link>
            </div>
            {message && <p className={`mt-5 text-center text-sm font-bold ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}
            <button onClick={() => { setShowStudentModal(false); setStudentOtpSent(false); setStudentOtpVerified(false); setStudentOtp(''); setMessage(''); setFormData(prev => ({ ...prev, email: '', password: '', university: '', campusKey: '' })); setShowPassword(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-700" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Admin <span className="text-red-600">Signup</span></h2>
            <form onSubmit={handleAdminSignup}>
              <input
                type="email"
                name="email"
                placeholder="Institutional Email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl mb-4 transition-all ${lockedAdminEmail ? 'bg-zinc-800 cursor-not-allowed text-zinc-500' : ''}`}
                required
                readOnly={!!lockedAdminEmail}
              />
              {lockedAdminEmail && (
                <p className="text-xs text-red-600 font-bold -mt-3 mb-4 ml-1">
                  ✦ You must sign up with the email you used to register your university.
                </p>
              )}
              <div className="relative mb-4 flex gap-2">
                <select name="university" value={formData.university} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl transition-all" required>
                  <option value="" className="text-zinc-500">Select University</option>
                  {universities.map((uni, idx) => <option key={idx} value={uni.name}>{uni.name}</option>)}
                </select>
                <button type="button" onClick={() => { setShowAddUniModal(true); setUniMessage(''); }} title="Add New University" className="px-4 bg-zinc-800 text-red-500 border border-zinc-700 rounded-xl hover:bg-zinc-700 hover:text-red-400 transition">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="relative mb-6">
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create Password" value={formData.password} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl transition-all" required />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-zinc-500 hover:text-red-500 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" className="btn-admin w-full">Create Console</button>
            </form>
            <div className="mt-6 text-center text-sm text-zinc-400 font-medium">
              Already an Admin?{' '}
              <Link to="/login" className="text-red-500 hover:text-red-400 font-bold hover:underline transition-colors">Log in here</Link>
            </div>
            {message && <p className={`mt-5 text-center text-sm font-bold ${messageType === 'success' ? 'text-red-500' : 'text-red-500'}`}>{message}</p>}
            <button onClick={() => { setShowAdminModal(false); setMessage(''); if (!lockedAdminEmail) { setFormData(prev => ({ ...prev, email: '', password: '', university: '' })); } else { setFormData(prev => ({ ...prev, password: '' })); } setShowPassword(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Add University Modal */}
      {showAddUniModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-700" />
            <h2 className="text-3xl font-black mb-6 text-center text-white">Add <span className="text-red-500">University</span></h2>
            <form onSubmit={handleAddUni}>
              {/* Email with Send OTP button */}
              <div className="flex gap-2 mb-1">
                <input
                  type="email"
                  name="uniEmail"
                  placeholder="Your Institutional Email"
                  value={formData.uniEmail}
                  onChange={handleInputChange}
                  className={`w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl transition-all ${uniOtpVerified ? 'border-green-500 bg-green-500/10' : ''}`}
                  required
                  readOnly={uniOtpVerified}
                />
                {!uniOtpVerified && (
                  <button
                    type="button"
                    onClick={handleSendUniOtp}
                    disabled={uniOtpCooldown > 0 || uniOtpLoading}
                    className="px-5 py-4 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition whitespace-nowrap disabled:bg-red-400"
                  >
                    {uniOtpLoading ? 'Sending...' : uniOtpCooldown > 0 ? `${uniOtpCooldown}s` : uniOtpSent ? 'Resend' : 'Send'}
                  </button>
                )}
                {uniOtpVerified && (
                  <div className="flex items-center px-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                )}
              </div>

              {/* OTP input */}
              {uniOtpSent && !uniOtpVerified && (
                <div className="flex gap-2 mb-4 mt-3">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={uniOtp}
                    onChange={(e) => setUniOtp(e.target.value)}
                    maxLength="6"
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyUniOtp}
                    disabled={uniVerifyLoading}
                    className="px-5 py-4 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition whitespace-nowrap disabled:bg-green-800"
                  >
                    {uniVerifyLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
              {!uniOtpSent && <div className="mb-4"></div>}

              <input type="text" name="uniName" placeholder="University Name" value={formData.uniName} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl mb-4 transition-all" required />
              <input type="text" name="uniDomain" placeholder="Domain (e.g. @poornima.edu.in)" value={formData.uniDomain} onChange={handleInputChange} className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl mb-4 transition-all" required />
              <input type="text" name="adminKey" placeholder="Set 6-Digit Student Key" value={formData.adminKey} onChange={handleInputChange} maxLength="6" className="w-full p-4 bg-zinc-950 border border-zinc-800 text-white font-medium focus:ring-2 focus:ring-red-500 rounded-xl mb-4 transition-all" required />

              <div className="mb-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 text-left">
                <p className="text-sm font-bold text-white mb-3">Request access for {formData.uniName || 'your university'}</p>
                <div className="flex flex-col gap-4">
                  <a href="https://ig.me/m/unieventconnect" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-[#E1306C] text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-[#C13584] transition w-full">
                    Verify via Instagram DM ↗
                  </a>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={instaDmVerified} onChange={(e) => setInstaDmVerified(e.target.checked)} className="mt-1 flex-shrink-0" />
                    <span className="text-sm text-zinc-300 font-medium leading-relaxed">I have sent a DM with official university insta id saying "Requesting access for [University Name]" to verify identity.</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="btn-admin w-full">Proceed to Setup</button>
            </form>
            <div className="mt-6 text-center text-sm text-zinc-400 font-medium">
              Console already active?{' '}
              <Link to="/login" className="text-red-500 hover:text-red-400 font-bold hover:underline transition-colors">Log in here</Link>
            </div>
            {uniMessage && <p className={`mt-5 text-center text-sm font-bold ${uniMessageType === 'success' ? 'text-green-500' : 'text-red-500'}`}>{uniMessage}</p>}
            <button onClick={() => { setShowAddUniModal(false); setUniMessage(''); setUniOtpSent(false); setUniOtpVerified(false); setUniOtp(''); setFormData(prev => ({ ...prev, uniEmail: '', uniName: '', uniDomain: '', adminKey: '' })); setInstaDmVerified(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="bg-zinc-900 p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800 relative text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600" />
            {!paymentDone ? (
              <>
                <h2 className="text-3xl font-black mb-6 text-white">Activate License</h2>
                <p className="mb-8 text-zinc-400 font-medium">Complete payment of <b className="text-white">₹99</b> to activate your university portal for <b className="text-white">{formData.uniName}</b>.</p>
                <button onClick={handlePayment} disabled={paymentProcessing} className="w-full py-4 bg-zinc-100 text-zinc-900 font-bold rounded-xl hover:bg-white transition disabled:bg-zinc-600 shadow-xl shadow-white/5">
                  {paymentProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      Initializing Razorpay...
                    </span>
                  ) : 'Confirm ₹99 Payment'}
                </button>
              </>
            ) : (
              <div className="animate-fade-in-up">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-zinc-800 border border-zinc-700 rounded-[2rem] flex items-center justify-center shadow-inner">
                    <CheckCircle className="w-14 h-14 text-green-500 drop-shadow-sm" />
                  </div>
                </div>
                <h2 className="text-3xl font-black mb-3 text-white">Payment Verified!</h2>
                <p className="text-zinc-400 mb-2 font-medium">Your university <b className="text-white">{formData.uniName}</b> is registered.</p>
                <p className="text-sm text-zinc-500 mb-8">You can now proceed to set up your admin account.</p>
                <button onClick={handlePaymentContinue} disabled={true} className="btn-admin w-full disabled:bg-zinc-700 disabled:cursor-not-allowed">
                  Loading Admin Console...
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="py-8 border-t border-zinc-800 text-center flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <p className="text-zinc-600 text-sm font-medium">
          © 2026 UniEvent Connect B2B Systems. All rights reserved.
        </p>
      </footer>
    </div>
  );
}