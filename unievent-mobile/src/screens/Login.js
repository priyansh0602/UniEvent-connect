import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Users, Settings, CheckCircle, X } from 'lucide-react-native';
import { supabase } from '../supabaseClient';
import { friendlyError } from '../utils/friendlyError';

export default function Login({ navigation }) {
  const [role, setRole] = useState(null); // 'student', 'admin', 'organizer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [campusKey, setCampusKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Login message state
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error', 'success', 'info'

  // Forgot Password State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotMessageType, setForgotMessageType] = useState('');

  useEffect(() => {
    if (forgotCooldown > 0) {
      const timer = setTimeout(() => setForgotCooldown(forgotCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCooldown]);

  const clearMessage = () => {
    if (message && messageType === 'error') {
      setMessage('');
      setMessageType('');
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }
    if (role === 'student' && campusKey.trim().length !== 6) {
      setMessage('University Key must be exactly 6 characters.');
      setMessageType('error');
      return;
    }
    if (!password) {
      setMessage('Please enter your password.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Authenticating...');
    setMessageType('info');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
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
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`status, role, university_id, universities(six_digit_key, is_verified)`)
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage('Email already used or profile not found.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (profile.role !== role) {
        await supabase.auth.signOut();
        setMessage(`This account is not a ${role} account.`);
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (profile.status === 'rejected') {
        await supabase.auth.signOut();
        setMessage('Your account has been suspended or rejected.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const uniData = profile.universities;
      if (uniData && !uniData.is_verified) {
        await supabase.auth.signOut();
        setMessage('Your university has been suspended. Contact support.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (role === 'student' && uniData?.six_digit_key !== campusKey) {
        await supabase.auth.signOut();
        setMessage('Incorrect University Key. Please check with your admin.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      setMessage('Login successful! Redirecting...');
      setMessageType('success');
      
      setTimeout(() => {
        if (role === 'student') navigation.replace('StudentDashboard');
        else if (role === 'admin') navigation.replace('AdminDashboard');
        else if (role === 'organizer') navigation.replace('OrganizerDashboard');
      }, 1500);

    } catch (err) {
      setMessage('Network error. Please check your connection.');
      setMessageType('error');
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD LOGIC ---
  const handleSendForgotOtp = async () => {
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotMessage('Please enter a valid email.'); setForgotMessageType('error'); return;
    }
    setForgotLoading(true); setForgotMessage('Sending OTP...'); setForgotMessageType('info');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (error) { setForgotMessage(friendlyError(error.message)); setForgotMessageType('error'); }
      else { setForgotOtpSent(true); setForgotCooldown(60); setForgotMessage(`OTP sent to ${forgotEmail}!`); setForgotMessageType('success'); }
    } catch { setForgotMessage('Network error.'); setForgotMessageType('error'); }
    setForgotLoading(false);
  };

  const handleVerifyForgotOtp = async () => {
    if (!forgotOtp.trim() || forgotOtp.length < 6) { setForgotMessage('Enter 6-digit OTP.'); setForgotMessageType('error'); return; }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: forgotEmail, token: forgotOtp, type: 'recovery' });
      if (error) { setForgotMessage('Invalid or expired OTP.'); setForgotMessageType('error'); }
      else { setForgotOtpVerified(true); setForgotMessage('Email verified! Set new password.'); setForgotMessageType('success'); }
    } catch { setForgotMessage('Network error.'); setForgotMessageType('error'); }
    setForgotLoading(false);
  };

  const handleResetPassword = async () => {
    if (!forgotOtpVerified) { setForgotMessage('Verify email first.'); setForgotMessageType('error'); return; }
    if (!newPassword || newPassword.length < 6) { setForgotMessage('Password must be at least 6 characters.'); setForgotMessageType('error'); return; }
    setForgotLoading(true); setForgotMessage('Updating...'); setForgotMessageType('info');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setForgotMessage(friendlyError(error.message)); setForgotMessageType('error'); }
      else {
        setForgotMessage('Password updated successfully!'); setForgotMessageType('success');
        setTimeout(() => resetForgotState(), 2000);
      }
    } catch { setForgotMessage('Network error.'); setForgotMessageType('error'); }
    setForgotLoading(false);
  };

  const resetForgotState = () => {
    setForgotModalVisible(false);
    setForgotOtpSent(false);
    setForgotOtpVerified(false);
    setForgotOtp('');
    setForgotEmail('');
    setNewPassword('');
    setForgotMessage('');
    setForgotCooldown(0);
  };

  const renderRoleSelection = () => (
    <View style={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ArrowLeft color="#a1a1aa" size={24} />
      </TouchableOpacity>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Select your role to log in and access your dashboard.</Text>

      <View style={styles.rowCards}>
        <TouchableOpacity style={[styles.roleCard, styles.adminCard, styles.halfCard]} onPress={() => { setRole('admin'); setMessage(''); }}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
            <Settings color="#ef4444" size={28} />
          </View>
          <Text style={[styles.roleTitle, { color: '#ffffff', fontSize: 16 }]}>Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roleCard, styles.adminCard, styles.halfCard]} onPress={() => { setRole('organizer'); setMessage(''); }}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
            <ShieldCheck color="#ef4444" size={28} />
          </View>
          <Text style={[styles.roleTitle, { color: '#ffffff', fontSize: 16 }]}>Organizer</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.roleCard, styles.studentCard]} onPress={() => { setRole('student'); setMessage(''); }}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
          <Users color="#fbbf24" size={32} />
        </View>
        <Text style={styles.roleTitle}>Student Login</Text>
        <Text style={styles.roleDesc}>Access events, register, and track your participation.</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoginForm = () => {
    const isStudent = role === 'student';
    const primaryColor = isStudent ? '#fbbf24' : '#ef4444';
    
    return (
      <View style={styles.content}>
        <TouchableOpacity onPress={() => { setRole(null); setMessage(''); setPassword(''); setCampusKey(''); }} style={styles.backButton}>
          <ArrowLeft color="#a1a1aa" size={24} />
        </TouchableOpacity>
        
        <Text style={styles.title}>{role.charAt(0).toUpperCase() + role.slice(1)} <Text style={{ color: primaryColor }}>Login</Text></Text>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder={isStudent ? "University Email" : role === 'admin' ? "Institutional Email" : "Organizer Email"}
            placeholderTextColor="#71717a"
            value={email}
            onChangeText={(text) => { setEmail(text); clearMessage(); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          {isStudent && (
            <TextInput
              style={styles.input}
              placeholder="6-Digit Student Key"
              placeholderTextColor="#71717a"
              value={campusKey}
              onChangeText={(text) => { setCampusKey(text); clearMessage(); }}
              maxLength={6}
              keyboardType="number-pad"
            />
          )}

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#71717a"
              value={password}
              onChangeText={(text) => { setPassword(text); clearMessage(); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <EyeOff color="#71717a" size={20} /> : <Eye color="#71717a" size={20} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => { setForgotEmail(email); setForgotModalVisible(true); }} style={{ alignItems: 'flex-start', marginBottom: 24 }}>
            <Text style={{ color: primaryColor, fontWeight: '800', fontSize: 14 }}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: primaryColor }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={isStudent ? '#09090b' : '#ffffff'} /> : (
              <Text style={[styles.submitButtonText, { color: isStudent ? '#09090b' : '#ffffff' }]}>
                {isStudent ? 'Enter Portal' : 'Enter Console'}
              </Text>
            )}
          </TouchableOpacity>
          
          {message ? (
            <Text style={[styles.formMessage, { color: messageType === 'success' ? '#22c55e' : messageType === 'info' ? '#3b82f6' : '#ef4444' }]}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {role ? renderLoginForm() : renderRoleSelection()}

      {/* Forgot Password Modal */}
      <Modal visible={forgotModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: role === 'student' ? '#fbbf24' : '#ef4444' }]} />
            <TouchableOpacity style={styles.closeModalButton} onPress={resetForgotState}>
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Reset Password</Text>
            
            {/* Email / OTP Send */}
            <View style={styles.otpRow}>
              <TextInput style={[styles.otpInput, forgotOtpVerified && { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)' }]} placeholder="Email Address" placeholderTextColor="#71717a" value={forgotEmail} onChangeText={(t) => { setForgotEmail(t); setForgotMessage(''); }} keyboardType="email-address" autoCapitalize="none" editable={!forgotOtpVerified} />
              {!forgotOtpVerified ? (
                <TouchableOpacity style={[styles.otpButton, { backgroundColor: role === 'student' ? '#fbbf24' : '#ef4444' }]} onPress={handleSendForgotOtp} disabled={forgotCooldown > 0 || forgotLoading}>
                  <Text style={[styles.otpButtonText, { color: role === 'student' ? '#09090b' : '#ffffff' }]}>{forgotLoading ? '...' : forgotCooldown > 0 ? `${forgotCooldown}s` : forgotOtpSent ? 'Resend' : 'Send'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ paddingHorizontal: 12, justifyContent: 'center' }}><CheckCircle color="#22c55e" size={24} /></View>
              )}
            </View>

            {/* OTP Verify */}
            {forgotOtpSent && !forgotOtpVerified && (
              <View style={styles.otpRow}>
                <TextInput style={styles.otpInput} placeholder="Enter 6-digit OTP" placeholderTextColor="#71717a" value={forgotOtp} onChangeText={(t) => { setForgotOtp(t); setForgotMessage(''); }} maxLength={6} keyboardType="number-pad" />
                <TouchableOpacity style={[styles.otpButton, { backgroundColor: '#22c55e' }]} onPress={handleVerifyForgotOtp} disabled={forgotLoading}>
                  <Text style={styles.otpButtonText}>{forgotLoading ? '...' : 'Verify'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* New Password */}
            {forgotOtpVerified && (
              <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#71717a" value={newPassword} onChangeText={(t) => { setNewPassword(t); setForgotMessage(''); }} secureTextEntry />
            )}

            {/* Submit New Password */}
            {forgotOtpVerified && (
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: role === 'student' ? '#fbbf24' : '#ef4444', width: '100%', marginTop: 8 }]} onPress={handleResetPassword} disabled={forgotLoading}>
                <Text style={[styles.submitButtonText, { color: role === 'student' ? '#09090b' : '#ffffff' }]}>Update Password</Text>
              </TouchableOpacity>
            )}

            {forgotMessage ? <Text style={[styles.messageText, { color: forgotMessageType === 'success' ? '#22c55e' : forgotMessageType === 'info' ? '#3b82f6' : '#ef4444' }]}>{forgotMessage}</Text> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start', padding: 8 },
  title: { fontSize: 36, fontWeight: '900', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#a1a1aa', textAlign: 'center', marginBottom: 32 },
  
  roleCard: { padding: 24, borderRadius: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1 },
  rowCards: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  halfCard: { flex: 1, marginBottom: 16, padding: 16 },
  studentCard: { backgroundColor: '#18181b', borderColor: '#27272a' },
  adminCard: { backgroundColor: '#18181b', borderColor: '#27272a' },
  iconContainer: { padding: 16, borderRadius: 20, marginBottom: 16 },
  roleTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  roleDesc: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },

  formContainer: { marginTop: 32 },
  input: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 16, color: '#ffffff', fontSize: 16 },
  eyeIcon: { padding: 16 },
  submitButton: { padding: 18, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '800' },
  formMessage: { textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#18181b', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  modalHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  closeModalButton: { position: 'absolute', top: 16, right: 16, padding: 8, backgroundColor: '#27272a', borderRadius: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 24, textAlign: 'center', marginTop: 10 },
  
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpInput: { flex: 1, backgroundColor: '#09090b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16 },
  otpButton: { paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12, minWidth: 80, alignItems: 'center' },
  otpButtonText: { fontWeight: '800', fontSize: 14 },
  messageText: { textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 16 },
});
