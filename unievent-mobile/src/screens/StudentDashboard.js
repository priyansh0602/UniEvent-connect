import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { Calendar, MapPin, Search, Crown, LogOut, Ticket, CheckCircle } from 'lucide-react-native';

export default function StudentDashboard({ navigation }) {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' or 'tickets'

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  const fetchProfileAndData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigation.replace('Login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, university_id, full_name, status')
        .eq('id', session.user.id)
        .single();

      if (!userProfile || userProfile.status !== 'approved') {
        await supabase.auth.signOut();
        navigation.replace('Login');
        return;
      }

      setProfile(userProfile);

      if (userProfile.university_id) {
        await Promise.all([
          loadEvents(userProfile.university_id),
          loadRegistrations(session.user.id)
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (uniId) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('university_id', uniId)
      .order('date', { ascending: true });

    if (!error && data) {
      const today = new Date().toISOString().split('T')[0];
      const activeEvents = data.filter(e => {
        const eventEnd = e.end_date || e.date;
        return eventEnd >= today;
      });
      setEvents(activeEvents);
    }
  };

  const loadRegistrations = async (userId) => {
    const { data, error } = await supabase
      .from('registrations')
      .select('event_id, ticket_id')
      .eq('student_id', userId);
    if (!error && data) {
      setRegistrations(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Landing');
  };

  const isRegistered = (eventId) => registrations.some(r => r.event_id === eventId);

  const renderEventCard = ({ item }) => {
    const registered = isRegistered(item.id);

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.poster_url || 'https://via.placeholder.com/400x200' }} style={styles.cardImage} />
        {item.category && (
          <View style={[styles.categoryBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.cardDetailRow}>
            <Calendar color="#f59e0b" size={16} />
            <Text style={styles.cardDetailText}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <MapPin color="#f59e0b" size={16} />
            <Text style={styles.cardDetailText}>{item.venue}</Text>
          </View>

          {registered ? (
            <View style={styles.registeredBadge}>
              <CheckCircle color="#fbbf24" size={16} style={{marginRight: 6}} />
              <Text style={styles.registeredText}>Registered</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => Alert.alert('WIP', 'Registration flow coming soon.')}>
              <Ticket color="#09090b" size={16} style={{marginRight: 6}} />
              <Text style={styles.actionButtonTextPrimary}>Get Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  const displayData = activeTab === 'discover' ? events : events.filter(e => isRegistered(e.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Crown color="#fbbf24" size={28} />
          <Text style={styles.headerTitle}>Student Portal</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color="#a1a1aa" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Search color={activeTab === 'discover' ? '#09090b' : '#a1a1aa'} size={20} />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
          onPress={() => setActiveTab('tickets')}
        >
          <Ticket color={activeTab === 'tickets' ? '#09090b' : '#a1a1aa'} size={20} />
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>My Tickets</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayData}
        keyExtractor={item => item.id.toString()}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar color="#f59e0b" size={48} style={{marginBottom: 16}} />
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'discover' ? 'Check back later for new events.' : 'You haven\'t registered for any events yet.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centerContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#18181b' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  logoutButton: { padding: 8 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  activeTab: { backgroundColor: '#fbbf24' },
  tabText: { fontSize: 16, fontWeight: '700', color: '#a1a1aa' },
  activeTabText: { color: '#09090b' },

  listContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  cardImage: { width: '100%', height: 160 },
  categoryBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  categoryText: { color: '#09090b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 12 },
  cardDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardDetailText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
  
  actionButtonPrimary: { marginTop: 16, backgroundColor: '#fbbf24', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  actionButtonTextPrimary: { color: '#09090b', fontWeight: '800', fontSize: 14 },
  
  registeredBadge: { marginTop: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: '#fbbf24', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  registeredText: { color: '#fbbf24', fontWeight: '800', fontSize: 14 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },
});
