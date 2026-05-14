// Student Signup Screen - mirrors web app's Student Signup modal exactly
import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, CheckCircle, Users } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../supabaseClient';
import { friendlyError } from '../../utils/friendlyError';
import { styles } from './SignupStyles';

export default function StudentSignup({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [campusKey, setCampusKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [universities, setUniversities] = useState([]);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { fetchUniversities(); }, []);
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const fetchUniversities = async () => {
    const { data, error } = await supabase.from('universities').select('*').eq('is_verified', true);
    if (error) console.error('Fetch Uni Error:', error);
    if (data) {
      console.log('Universities fetched:', data);
      setUniversities(data);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) { setMessage('Please enter your email.'); setMessageType('error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage('Please enter a valid email.'); setMessageType('error'); return; }
    if (!password || password.length < 6) { setMessage('Password must be at least 6 characters.'); setMessageType('error'); return; }

    setOtpLoading(true);
    setMessage('Sending OTP...');
    setMessageType('');
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message.includes('already registered') ? 'Email already used.' : friendlyError(error.message));
        setMessageType('error');
      } else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setMessage('Email already used.');
        setMessageType('error');
      } else {
        setOtpSent(true);
        setCooldown(60);
        setMessage(`OTP sent to ${email}!`);
        setMessageType('success');
      }
    } catch { setMessage('Network error.'); setMessageType('error'); }
    setOtpLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 6) { setMessage('Enter the 6-digit OTP.'); setMessageType('error'); return; }
    setVerifyLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (error) {
        const { error: err2 } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
        if (err2) { setMessage(friendlyError(err2.message)); setMessageType('error'); }
        else { setOtpVerified(true); setMessage('Email verified!'); setMessageType('success'); }
      } else { setOtpVerified(true); setMessage('Email verified!'); setMessageType('success'); }
    } catch { setMessage('Network error.'); setMessageType('error'); }
    setVerifyLoading(false);
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) { setMessage(friendlyError(error.message)); setMessageType('error'); }
      else { setMessage('New code sent!'); setMessageType('success'); setCooldown(60); }
    } catch { setMessage('Network error.'); setMessageType('error'); }
    setOtpLoading(false);
  };

  const handleStudentSignup = async () => {
    if (!otpVerified) { setMessage('Verify your email first.'); setMessageType('error'); return; }
    if (!university) { setMessage('Select your university.'); setMessageType('error'); return; }
    if (!campusKey.trim() || !/^\d{6}$/.test(campusKey.trim())) { setMessage('Enter a valid 6-digit Student Key.'); setMessageType('error'); return; }

    const selectedUni = universities.find(u => u.name === university);
    if (!selectedUni) { setMessage('University not found.'); setMessageType('error'); return; }
    if (selectedUni.email_domain && !email.toLowerCase().endsWith(selectedUni.email_domain.toLowerCase())) {
      setMessage(`Use a student email ending in ${selectedUni.email_domain}.`); setMessageType('error'); return;
    }
    if (campusKey !== selectedUni.six_digit_key) { setMessage('Incorrect University Key.'); setMessageType('error'); return; }

    setMessage('Creating account...'); setMessageType('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== email) {
        setMessage('Session expired. Verify email again.'); setMessageType('error');
        setOtpSent(false); setOtpVerified(false); setOtp(''); return;
      }
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: session.user.id, email, role: 'student',
        university_id: selectedUni.id, university_name: university, status: 'verified'
      }]);
      if (profileError) {
        setMessage(profileError.message.includes('duplicate') ? 'Email already used.' : friendlyError(profileError.message));
        setMessageType('error'); return;
      }
      setMessage('Account created! Redirecting...');
      setMessageType('success');
      setTimeout(() => navigation.replace('StudentDashboard'), 2000);
    } catch { setMessage('Network error.'); setMessageType('error'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#a1a1aa" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Student <Text style={{ color: '#fbbf24' }}>Signup</Text></Text>

        <View style={styles.formContainer}>
          {/* Email + Send OTP */}
          <View style={styles.otpRow}>
            <TextInput
              style={[styles.otpInput, otpVerified && styles.inputVerified]}
              placeholder="University Email"
              placeholderTextColor="#71717a"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!otpVerified}
            />
            {!otpVerified ? (
              <TouchableOpacity
                style={[styles.otpButton, { backgroundColor: '#fbbf24' }]}
                onPress={otpSent && cooldown === 0 ? handleResendOtp : handleSendOtp}
                disabled={cooldown > 0 || otpLoading}
              >
                <Text style={[styles.otpButtonText, { color: '#09090b' }]}>
                  {otpLoading ? '...' : cooldown > 0 ? `${cooldown}s` : otpSent ? 'Resend' : 'Send'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.verifiedIcon}><CheckCircle color="#22c55e" size={24} /></View>
            )}
          </View>

          {/* OTP Input */}
          {otpSent && !otpVerified && (
            <View style={styles.otpRow}>
              <TextInput style={styles.otpInput} placeholder="Enter 6-digit OTP" placeholderTextColor="#71717a" value={otp} onChangeText={setOtp} maxLength={6} keyboardType="number-pad" />
              <TouchableOpacity style={[styles.otpButton, { backgroundColor: '#22c55e' }]} onPress={handleVerifyOtp} disabled={verifyLoading}>
                <Text style={styles.otpButtonText}>{verifyLoading ? '...' : 'Verify'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Password */}
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Create Password" placeholderTextColor="#71717a" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <EyeOff color="#71717a" size={20} /> : <Eye color="#71717a" size={20} />}
            </TouchableOpacity>
          </View>

          {/* University Picker */}
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={university} onValueChange={setUniversity} style={{ color: university ? '#ffffff' : '#71717a' }} dropdownIconColor="#71717a">
              <Picker.Item label="Select University" value="" />
              {universities.map((uni, i) => <Picker.Item key={i} label={uni.name} value={uni.name} />)}
            </Picker>
          </View>

          {/* Campus Key */}
          <TextInput style={styles.input} placeholder="6-Digit Student Key" placeholderTextColor="#71717a" value={campusKey} onChangeText={setCampusKey} maxLength={6} keyboardType="number-pad" />

          {/* Submit */}
          <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#fbbf24', opacity: otpVerified ? 1 : 0.5 }]} onPress={handleStudentSignup} disabled={!otpVerified}>
            <Text style={[styles.submitButtonText, { color: '#09090b' }]}>Create Account</Text>
          </TouchableOpacity>

          {message ? <Text style={messageType === 'success' ? styles.messageSuccess : styles.messageError}>{message}</Text> : null}

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? <Text style={[styles.linkBold, { color: '#fbbf24' }]} onPress={() => navigation.navigate('Login')}>Log in here</Text></Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
