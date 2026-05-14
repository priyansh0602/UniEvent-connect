import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, ArrowRight } from 'lucide-react-native';

export default function Landing({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Glow effect */}
      <View style={styles.glow} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <GraduationCap color="#fbbf24" size={32} />
          </View>
          <Text style={styles.logoText}>
            UniEvent <Text style={styles.logoSubText}>Connect</Text>
          </Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>THE NEW STANDARD</Text>
          </View>

          <Text style={styles.title}>
            The OS for{"\n"}
            <Text style={styles.highlight}>University Culture</Text>
          </Text>

          <Text style={styles.subtitle}>
            Unify campus events and skyrocket student engagement with a platform built for modern universities.
          </Text>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.buttonText}>Get Started</Text>
            <ArrowRight color="#09090b" size={20} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryButtonText}>Login to Portal</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 UniEvent Connect</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b', // zinc-950
  },
  glow: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 600,
    height: 400,
    backgroundColor: 'rgba(245, 158, 11, 0.05)', // amber-500 with low opacity
    borderRadius: 200,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    padding: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoSubText: {
    color: '#71717a', // zinc-500
    fontWeight: '500',
  },
  heroSection: {
    marginTop: 40,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b', // zinc-900
    borderWidth: 1,
    borderColor: '#3f3f46', // zinc-700
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f59e0b',
    letterSpacing: 1,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 52,
    letterSpacing: -1,
    marginBottom: 20,
  },
  highlight: {
    color: '#fbbf24', // amber-400
  },
  subtitle: {
    fontSize: 18,
    color: '#a1a1aa', // zinc-400
    lineHeight: 28,
    marginBottom: 40,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#fbbf24',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#09090b',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 16,
    backgroundColor: '#18181b',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#3f3f46',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
