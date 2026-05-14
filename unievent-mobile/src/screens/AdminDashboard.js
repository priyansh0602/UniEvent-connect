import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { Settings, Users, LogOut, ShieldAlert, Calendar, MapPin, Plus, Shield } from 'lucide-react-native';

export default function AdminDashboard({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ events: 0, students: 0, organizers: 0 });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'manage'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

      if (!userProfile || userProfile.status === 'rejected') {
        await supabase.auth.signOut();
        navigation.replace('Login');
        return;
      }

      setProfile(userProfile);

      if (userProfile.university_id) {
        // Fetch stats and events
        const [eventsList, studentsRes, organizersRes] = await Promise.all([
          supabase.from('events').select('*').eq('university_id', userProfile.university_id).order('date', { ascending: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('university_id', userProfile.university_id).eq('role', 'student'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('university_id', userProfile.university_id).eq('role', 'organizer')
        ]);
        
        if (eventsList.data) {
          setEvents(eventsList.data);
        }
        
        setStats({
          events: eventsList.data ? eventsList.data.length : 0,
          students: studentsRes.count || 0,
          organizers: organizersRes.count || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Landing');
  };

  const renderEventCard = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.poster_url || 'https://via.placeholder.com/400x200' }} style={styles.cardImage} />
      {item.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        
        <View style={styles.cardDetailRow}>
          <Calendar color="#ef4444" size={16} />
          <Text style={styles.cardDetailText}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.cardDetailRow}>
          <MapPin color="#ef4444" size={16} />
          <Text style={styles.cardDetailText}>{item.venue}</Text>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('WIP', 'Event Management coming soon.')}>
          <Shield color="#a78bfa" size={16} style={{marginRight: 6}} />
          <Text style={styles.actionButtonText}>Admin Control Center</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Settings color="#ef4444" size={28} />
          <Text style={styles.headerTitle}>Admin Console</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color="#a1a1aa" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Calendar color={activeTab === 'events' ? '#ffffff' : '#a1a1aa'} size={20} />
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}
        >
          <ShieldAlert color={activeTab === 'manage' ? '#ffffff' : '#a1a1aa'} size={20} />
          <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>Manage</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'events' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.createEventContainer}>
            <TouchableOpacity 
              style={styles.createEventBtn} 
              onPress={() => Alert.alert('WIP', 'Create Event flow coming soon.')}
            >
              <Plus color="#ffffff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.createEventText}>Create New Event</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={events}
            keyExtractor={item => item.id.toString()}
            renderItem={renderEventCard}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Calendar color="#ef4444" size={48} style={{marginBottom: 16}} />
                <Text style={styles.emptyTitle}>No Events Yet</Text>
                <Text style={styles.emptySubtitle}>Start by creating your first university event.</Text>
              </View>
            }
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Overview Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Calendar color="#ef4444" size={24} />
              </View>
              <Text style={styles.statValue}>{stats.events}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Users color="#ef4444" size={24} />
              </View>
              <Text style={styles.statValue}>{stats.students}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <ShieldAlert color="#ef4444" size={24} />
              </View>
              <Text style={styles.statValue}>{stats.organizers}</Text>
              <Text style={styles.statLabel}>Organizers</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, {marginTop: 32}]}>Management Tools</Text>
          <View style={styles.toolsContainer}>
             <TouchableOpacity style={styles.toolCard} onPress={() => Alert.alert('WIP', 'Approve/Reject organizers here.')}>
               <Users color="#ffffff" size={24} style={{marginBottom: 12}} />
               <Text style={styles.toolTitle}>Manage Organizers</Text>
               <Text style={styles.toolDesc}>Approve or reject organizer applications.</Text>
             </TouchableOpacity>

             <TouchableOpacity style={styles.toolCard} onPress={() => Alert.alert('WIP', 'Blocked users management here.')}>
               <ShieldAlert color="#ffffff" size={24} style={{marginBottom: 12}} />
               <Text style={styles.toolTitle}>Blocked Users</Text>
               <Text style={styles.toolDesc}>Manage blocked students and organizers.</Text>
             </TouchableOpacity>
             
             <TouchableOpacity style={styles.toolCard} onPress={() => Alert.alert('WIP', 'University settings here.')}>
               <Settings color="#ffffff" size={24} style={{marginBottom: 12}} />
               <Text style={styles.toolTitle}>University Settings</Text>
               <Text style={styles.toolDesc}>Manage campus keys and preferences.</Text>
             </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centerContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#27272a', backgroundColor: '#18181b' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  logoutButton: { padding: 8 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 8 },
  activeTab: { backgroundColor: '#ef4444' },
  tabText: { fontSize: 16, fontWeight: '700', color: '#a1a1aa' },
  activeTabText: { color: '#ffffff' },

  createEventContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  createEventBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12 },
  createEventText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

  listContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  cardImage: { width: '100%', height: 160 },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  categoryText: { color: '#ffffff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 12 },
  cardDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardDetailText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
  actionButton: { marginTop: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  actionButtonText: { color: '#a78bfa', fontWeight: '800', fontSize: 14 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },

  scrollContent: { padding: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 16 },
  
  statsGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '30%', backgroundColor: '#18181b', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
  statIconContainer: { backgroundColor: 'rgba(220, 38, 38, 0.1)', padding: 12, borderRadius: 12, marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#a1a1aa' },

  toolsContainer: { gap: 16 },
  toolCard: { backgroundColor: '#18181b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#27272a' },
  toolTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  toolDesc: { fontSize: 14, color: '#a1a1aa' },
});

