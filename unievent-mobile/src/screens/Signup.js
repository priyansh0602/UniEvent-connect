// Signup.js - Role selection screen (Student & Admin only, no Organizer)
// Organizers are invited by Admin via link only
// UI matches Login portal layout exactly
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Settings } from 'lucide-react-native';

export default function Signup({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#a1a1aa" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Join UniEvent Connect</Text>
        <Text style={styles.subtitle}>Select your role to create an account and get started.</Text>

        <TouchableOpacity style={[styles.roleCard, styles.adminCard]} onPress={() => navigation.navigate('AdminSignup')}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
            <Settings color="#ef4444" size={32} />
          </View>
          <Text style={[styles.roleTitle, { color: '#ffffff' }]}>Admin Signup</Text>
          <Text style={styles.roleDesc}>Manage university events and analytics.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roleCard, styles.studentCard]} onPress={() => navigation.navigate('StudentSignup')}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Users color="#fbbf24" size={32} />
          </View>
          <Text style={styles.roleTitle}>Student Signup</Text>
          <Text style={styles.roleDesc}>Register for events and track participation.</Text>
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold} onPress={() => navigation.navigate('Login')}>Log in here</Text></Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start', padding: 8 },
  title: { fontSize: 36, fontWeight: '900', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#a1a1aa', textAlign: 'center', marginBottom: 32 },

  rowCards: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  roleCard: { padding: 24, borderRadius: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1 },
  halfCard: { flex: 1, marginBottom: 16, padding: 16 },
  studentCard: { backgroundColor: '#18181b', borderColor: '#27272a' },
  adminCard: { backgroundColor: '#18181b', borderColor: '#27272a' },
  iconContainer: { padding: 16, borderRadius: 20, marginBottom: 16 },
  roleTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  roleDesc: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },

  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#a1a1aa', fontSize: 16, fontWeight: '500' },
  linkBold: { color: '#ffffff', fontWeight: '800' },
});
