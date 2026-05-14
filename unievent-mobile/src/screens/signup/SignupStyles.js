import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start', padding: 8 },
  title: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#a1a1aa', textAlign: 'center', marginBottom: 32 },

  // Role cards
  rowCards: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  roleCard: { padding: 24, borderRadius: 20, marginBottom: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
  halfCard: { flex: 1, marginBottom: 16, padding: 16 },
  iconContainer: { padding: 16, borderRadius: 20, marginBottom: 16 },
  roleTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  roleDesc: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },

  // Form
  formContainer: { marginTop: 24 },
  input: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16, marginBottom: 16 },
  inputVerified: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, color: '#ffffff', fontSize: 16 },
  eyeIcon: { padding: 16 },

  // OTP row
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpInput: { flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 16 },
  otpButton: { paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12, minWidth: 80 },
  otpButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },

  // Buttons
  submitButton: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '800' },

  // Picker
  pickerContainer: { flexDirection: 'row', gap: 10 },
  pickerWrapper: { flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, justifyContent: 'center', marginBottom: 16 },
  addUniButton: { width: 56, backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Messages
  messageSuccess: { color: '#22c55e', textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 16 },
  messageError: { color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 16 },

  // Instagram DM box
  dmBox: { backgroundColor: 'rgba(39,39,42,0.5)', borderWidth: 1, borderColor: 'rgba(63,63,70,0.5)', borderRadius: 16, padding: 20, marginBottom: 16 },
  dmTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff', marginBottom: 12 },
  dmButton: { backgroundColor: '#E1306C', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  dmButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#71717a', borderRadius: 6, marginTop: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#d4d4d8', fontWeight: '500', lineHeight: 20 },

  // Payment
  paymentCard: { alignItems: 'center', paddingVertical: 20 },
  paymentTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  paymentDesc: { color: '#a1a1aa', fontSize: 16, textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  paymentPrice: { color: '#ffffff', fontWeight: '900' },
  paymentUni: { color: '#ffffff', fontWeight: '800' },
  payButton: { width: '100%', padding: 18, backgroundColor: '#f4f4f5', borderRadius: 12, alignItems: 'center' },
  payButtonText: { color: '#18181b', fontWeight: '800', fontSize: 16 },

  // Link text
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
  linkBold: { fontWeight: '800' },

  // Verified icon
  verifiedIcon: { paddingHorizontal: 12, justifyContent: 'center' },
});
