// Admin Signup Screen - mirrors web app exactly
// Includes Add University flow with OTP, Instagram DM, Razorpay payment
import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, CheckCircle, Settings, Plus } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../supabaseClient';
import { friendlyError } from '../../utils/friendlyError';
import { styles } from './SignupStyles';

export default function AdminSignup({ navigation }) {
  // Which screen: 'admin' | 'addUni' | 'payment'
  const [screen, setScreen] = useState('admin');

  // Admin form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [lockedEmail, setLockedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Add University form
  const [uniEmail, setUniEmail] = useState('');
  const [uniName, setUniName] = useState('');
  const [uniDomain, setUniDomain] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [instaDmVerified, setInstaDmVerified] = useState(false);
  const [uniMessage, setUniMessage] = useState('');
  const [uniMessageType, setUniMessageType] = useState('');

  // OTP state for Add University
  const [uniOtpSent, setUniOtpSent] = useState(false);
  const [uniOtpVerified, setUniOtpVerified] = useState(false);
  const [uniOtp, setUniOtp] = useState('');
  const [uniOtpLoading, setUniOtpLoading] = useState(false);
  const [uniVerifyLoading, setUniVerifyLoading] = useState(false);
  const [uniCooldown, setUniCooldown] = useState(0);

  // Payment
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => { fetchUniversities(); }, []);
  useEffect(() => {
    if (uniCooldown > 0) { const t = setTimeout(() => setUniCooldown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [uniCooldown]);

  const fetchUniversities = async () => {
    const { data, error } = await supabase.from('universities').select('*').eq('is_verified', true);
    if (error) console.error('Fetch Uni Error:', error);
    if (data) {
      console.log('Admin Universities fetched:', data);
      setUniversities(data);
    }
  };

  // --- Add University OTP ---
  const handleSendUniOtp = async () => {
    if (!uniEmail.trim()) { setUniMessage('Enter your email.'); setUniMessageType('error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uniEmail)) { setUniMessage('Enter a valid email.'); setUniMessageType('error'); return; }
    setUniOtpLoading(true); setUniMessage('Sending OTP...'); setUniMessageType('');
    try {
      const tempPw = 'TempPass_' + Date.now() + '!';
      const { data, error } = await supabase.auth.signUp({ email: uniEmail, password: tempPw });
      if (error) {
        setUniMessage(error.message.includes('already registered') ? 'Email already used.' : friendlyError(error.message));
        setUniMessageType('error');
      } else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setUniMessage('Email already used.'); setUniMessageType('error');
      } else {
        setUniOtpSent(true); setUniCooldown(60);
        setUniMessage(`OTP sent to ${uniEmail}!`); setUniMessageType('success');
      }
    } catch { setUniMessage('Network error.'); setUniMessageType('error'); }
    setUniOtpLoading(false);
  };

  const handleVerifyUniOtp = async () => {
    if (!uniOtp.trim() || uniOtp.length < 6) { setUniMessage('Enter the 6-digit OTP.'); setUniMessageType('error'); return; }
    setUniVerifyLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: uniEmail, token: uniOtp, type: 'signup' });
      if (error) {
        const { error: e2 } = await supabase.auth.verifyOtp({ email: uniEmail, token: uniOtp, type: 'email' });
        if (e2) { setUniMessage(friendlyError(e2.message)); setUniMessageType('error'); }
        else { setUniOtpVerified(true); setUniMessage('Email verified!'); setUniMessageType('success'); }
      } else { setUniOtpVerified(true); setUniMessage('Email verified!'); setUniMessageType('success'); }
    } catch { setUniMessage('Network error.'); setUniMessageType('error'); }
    setUniVerifyLoading(false);
  };

  // --- Add University Submit ---
  const handleAddUni = () => {
    if (!uniOtpVerified) { setUniMessage('Verify your email first.'); setUniMessageType('error'); return; }
    if (!uniName.trim()) { setUniMessage('Enter university name.'); setUniMessageType('error'); return; }
    if (!uniDomain.trim() || !uniDomain.startsWith('@')) { setUniMessage('Domain must start with @ (e.g. @poornima.edu.in).'); setUniMessageType('error'); return; }
    if (!/^\d{6}$/.test(adminKey.trim())) { setUniMessage('Student Key must be exactly 6 digits.'); setUniMessageType('error'); return; }
    if (!instaDmVerified) { setUniMessage('Confirm Instagram DM first.'); setUniMessageType('error'); return; }
    const exists = universities.some(u => u.name.toLowerCase() === uniName.toLowerCase());
    if (exists) { setUniMessage('University already registered.'); setUniMessageType('error'); return; }
    setScreen('payment'); setPaymentDone(false); setUniMessage('');
  };

  // --- Payment ---
  const handlePayment = async () => {
    setPaymentProcessing(true); setUniMessage('');
    try {
      const { data: subData, error: subError } = await supabase.functions.invoke('create-razorpay-subscription');
      if (subError) throw subError;
      // On mobile we open Razorpay URL in browser (no native SDK needed for MVP)
      Alert.alert(
        'Activate License',
        `Complete payment of ₹99 for ${uniName}.\n\nFor now, payment will open in your browser. After payment, return here and tap "I have paid".`,
        [
          { text: 'Open Payment', onPress: () => { Linking.openURL(`https://rzp.io/l/${subData.short_url || subData.id}`).catch(() => {}); } },
          { text: 'I have paid', style: 'default', onPress: () => handlePaymentContinue() },
          { text: 'Cancel', style: 'cancel', onPress: () => setPaymentProcessing(false) }
        ]
      );
    } catch (err) {
      Alert.alert('Payment Gateway Error', 'Could not connect to Razorpay. Please verify your connection and try again.');
      setPaymentProcessing(false);
    }
  };

  const handlePaymentContinue = async () => {
    const { data: insertedUni, error: insertError } = await supabase
      .from('universities')
      .insert([{ name: uniName, email_domain: uniDomain, six_digit_key: adminKey, admin_email: uniEmail, is_verified: true }])
      .select().single();

    if (insertError) {
      const msg = insertError.message.includes('duplicate') ? 'University already registered.' : 'Failed to add university.';
      Alert.alert('Error', msg);
      setScreen('addUni'); setPaymentProcessing(false); return;
    }

    await fetchUniversities();
    setLockedEmail(uniEmail);
    setEmail(uniEmail);
    setUniversity(uniName);
    setScreen('admin');
    setPaymentProcessing(false);
    setMessage(`${uniName} added! Complete your admin signup below.`);
    setMessageType('success');
    // Reset uni OTP state
    setUniOtpSent(false); setUniOtpVerified(false); setUniOtp(''); setUniMessage('');
  };

  // --- Admin Signup ---
  const handleAdminSignup = async () => {
    if (!email.trim()) { setMessage('Enter your email.'); setMessageType('error'); return; }
    if (lockedEmail && email.toLowerCase() !== lockedEmail.toLowerCase()) {
      setMessage(`Sign up with ${lockedEmail}.`); setMessageType('error'); return;
    }
    if (!university) { setMessage('Select a university. Add one using + if needed.'); setMessageType('error'); return; }
    if (!password || password.length < 6) { setMessage('Password must be at least 6 characters.'); setMessageType('error'); return; }

    setMessage('Creating Admin account...'); setMessageType('');
    try {
      const selectedUni = universities.find(u => u.name === university);
      if (selectedUni) {
        const { data: existingAdmin } = await supabase.from('profiles').select('id').eq('university_id', selectedUni.id).eq('role', 'admin').limit(1).maybeSingle();
        if (existingAdmin) { setMessage('This university already has an admin.'); setMessageType('error'); return; }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== email) {
        setMessage('Add your university first to verify email.'); setMessageType('error'); return;
      }

      await supabase.auth.updateUser({ password });

      const { data: realUni } = await supabase.from('universities').select('id').eq('name', university).single();
      if (!realUni) { setMessage('University not found. Add it first.'); setMessageType('error'); return; }

      const { error: profileError } = await supabase.from('profiles').insert([{
        id: session.user.id, email, role: 'admin',
        university_id: realUni.id, university_name: university, status: 'verified'
      }]);

      if (profileError) {
        setMessage(profileError.message.includes('duplicate') ? 'Email already used.' : friendlyError(profileError.message));
        setMessageType('error'); return;
      }
      setMessage('Admin account created! Redirecting...');
      setMessageType('success');
      setTimeout(() => navigation.replace('AdminDashboard'), 2000);
    } catch { setMessage('Network error.'); setMessageType('error'); }
  };

  // --- RENDER: Add University Screen ---
  const renderAddUni = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => setScreen('admin')} style={styles.backButton}>
        <ArrowLeft color="#a1a1aa" size={24} />
      </TouchableOpacity>
      <Text style={styles.title}>Add <Text style={{ color: '#ef4444' }}>University</Text></Text>

      <View style={styles.formContainer}>
        {/* Email + OTP */}
        <View style={styles.otpRow}>
          <TextInput style={[styles.otpInput, uniOtpVerified && styles.inputVerified]} placeholder="Your Institutional Email" placeholderTextColor="#71717a" value={uniEmail} onChangeText={setUniEmail} keyboardType="email-address" autoCapitalize="none" editable={!uniOtpVerified} />
          {!uniOtpVerified ? (
            <TouchableOpacity style={[styles.otpButton, { backgroundColor: '#ef4444' }]} onPress={handleSendUniOtp} disabled={uniCooldown > 0 || uniOtpLoading}>
              <Text style={styles.otpButtonText}>{uniOtpLoading ? '...' : uniCooldown > 0 ? `${uniCooldown}s` : uniOtpSent ? 'Resend' : 'Send'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.verifiedIcon}><CheckCircle color="#22c55e" size={24} /></View>
          )}
        </View>

        {uniOtpSent && !uniOtpVerified && (
          <View style={styles.otpRow}>
            <TextInput style={styles.otpInput} placeholder="Enter 6-digit OTP" placeholderTextColor="#71717a" value={uniOtp} onChangeText={setUniOtp} maxLength={6} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.otpButton, { backgroundColor: '#22c55e' }]} onPress={handleVerifyUniOtp} disabled={uniVerifyLoading}>
              <Text style={styles.otpButtonText}>{uniVerifyLoading ? '...' : 'Verify'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput style={styles.input} placeholder="University Name" placeholderTextColor="#71717a" value={uniName} onChangeText={setUniName} />
        <TextInput style={styles.input} placeholder="Domain (e.g. @poornima.edu.in)" placeholderTextColor="#71717a" value={uniDomain} onChangeText={setUniDomain} />
        <TextInput style={styles.input} placeholder="Set 6-Digit Student Key" placeholderTextColor="#71717a" value={adminKey} onChangeText={setAdminKey} maxLength={6} keyboardType="number-pad" />

        {/* Instagram DM Box */}
        <View style={styles.dmBox}>
          <Text style={styles.dmTitle}>Request access for {uniName || 'your university'}</Text>
          <TouchableOpacity style={styles.dmButton} onPress={() => Linking.openURL('https://ig.me/m/unieventconnect')}>
            <Text style={styles.dmButtonText}>Verify via Instagram DM ↗</Text>
          </TouchableOpacity>
          <View style={styles.checkboxRow}>
            <TouchableOpacity style={[styles.checkbox, instaDmVerified && styles.checkboxChecked]} onPress={() => setInstaDmVerified(!instaDmVerified)}>
              {instaDmVerified && <CheckCircle color="#ffffff" size={14} />}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>I have sent a DM with official university insta id saying "Requesting access for [University Name]" to verify identity.</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#ef4444' }]} onPress={handleAddUni}>
          <Text style={[styles.submitButtonText, { color: '#ffffff' }]}>Proceed to Setup</Text>
        </TouchableOpacity>

        {uniMessage ? <Text style={uniMessageType === 'success' ? styles.messageSuccess : styles.messageError}>{uniMessage}</Text> : null}
      </View>
    </ScrollView>
  );

  // --- RENDER: Payment Screen ---
  const renderPayment = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.paymentCard}>
        <Text style={styles.paymentTitle}>Activate License</Text>
        <Text style={styles.paymentDesc}>
          Complete payment of <Text style={styles.paymentPrice}>₹99</Text> to activate your university portal for <Text style={styles.paymentUni}>{uniName}</Text>.
        </Text>
        <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={paymentProcessing}>
          <Text style={styles.payButtonText}>{paymentProcessing ? 'Processing...' : 'Confirm ₹99 Payment'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // --- RENDER: Admin Signup Screen ---
  const renderAdmin = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ArrowLeft color="#a1a1aa" size={24} />
      </TouchableOpacity>
      <Text style={styles.title}>Admin <Text style={{ color: '#ef4444' }}>Signup</Text></Text>

      <View style={styles.formContainer}>
        <TextInput
          style={[styles.input, lockedEmail ? { backgroundColor: '#27272a', color: '#71717a' } : {}]}
          placeholder="Institutional Email" placeholderTextColor="#71717a"
          value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none"
          editable={!lockedEmail}
        />
        {lockedEmail ? <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800', marginTop: -12, marginBottom: 12, marginLeft: 4 }}>✦ Sign up with the email used to register your university.</Text> : null}

        <View style={styles.pickerContainer}>
          <View style={[styles.pickerWrapper, { flex: 1 }]}>
            <Picker selectedValue={university} onValueChange={setUniversity} style={{ color: university ? '#ffffff' : '#71717a' }} dropdownIconColor="#71717a">
              <Picker.Item label="Select University" value="" />
              {universities.map((u, i) => <Picker.Item key={i} label={u.name} value={u.name} />)}
            </Picker>
          </View>
          <TouchableOpacity style={styles.addUniButton} onPress={() => { setScreen('addUni'); setUniMessage(''); }}>
            <Plus color="#ef4444" size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput style={styles.passwordInput} placeholder="Create Password" placeholderTextColor="#71717a" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            {showPassword ? <EyeOff color="#71717a" size={20} /> : <Eye color="#71717a" size={20} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#ef4444' }]} onPress={handleAdminSignup}>
          <Text style={[styles.submitButtonText, { color: '#ffffff' }]}>Create Console</Text>
        </TouchableOpacity>

        {message ? <Text style={messageType === 'success' ? styles.messageSuccess : styles.messageError}>{message}</Text> : null}

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already an Admin? <Text style={[styles.linkBold, { color: '#ef4444' }]} onPress={() => navigation.navigate('Login')}>Log in here</Text></Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'addUni' ? renderAddUni() : screen === 'payment' ? renderPayment() : renderAdmin()}
    </SafeAreaView>
  );
}
