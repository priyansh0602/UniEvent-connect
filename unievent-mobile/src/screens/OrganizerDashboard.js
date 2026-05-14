import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { Calendar, MapPin, Plus, ShieldCheck, Eye, LogOut, MessageSquare } from 'lucide-react-native';

export default function OrganizerDashboard({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const eventsChannelRef = useRef(null);

  useEffect(() => {
    fetchProfileAndEvents();
    return () => {
      if (eventsChannelRef.current) supabase.removeChannel(eventsChannelRef.current);
    };
  }, []);

  const fetchProfileAndEvents = async () => {
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
        await loadEvents(userProfile.university_id, session.user.id);
        setupRealtime(userProfile.university_id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (uniId, userId) => {
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

  const setupRealtime = (uniId) => {
    const channel = supabase
      .channel(`uni-events-${uniId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `university_id=eq.${uniId}` }, () => {
        loadEvents(uniId);
      })
      .subscribe();
    eventsChannelRef.current = channel;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Landing');
  };

  const renderEventCard = ({ item }) => {
    const isOwner = profile && item.admin_id === profile.id;

    return (
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
            <Text style={styles.cardDetailText}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <MapPin color="#ef4444" size={16} />
            <Text style={styles.cardDetailText}>{item.venue}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionButtonSecondary}>
              <Eye color="#ffffff" size={16} style={{marginRight: 6}} />
              <Text style={styles.actionButtonTextSecondary}>Submissions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButtonPrimary}>
              <MessageSquare color="#09090b" size={16} style={{marginRight: 6}} />
              <Text style={styles.actionButtonTextPrimary}>Community</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

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
          <ShieldCheck color="#ef4444" size={28} />
          <Text style={styles.headerTitle}>Organizer Panel</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color="#a1a1aa" size={20} />
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
            <Text style={styles.emptySubtitle}>Start by creating your first event.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('WIP', 'Create Event Screen coming next.')}>
        <Plus color="#ffffff" size={24} />
      </TouchableOpacity>
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
  listContainer: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  cardImage: { width: '100%', height: 160 },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  categoryText: { color: '#ffffff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 12 },
  cardDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardDetailText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionButtonPrimary: { flex: 1, backgroundColor: '#ef4444', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  actionButtonTextPrimary: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  actionButtonSecondary: { flex: 1, backgroundColor: '#27272a', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  actionButtonTextSecondary: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#a1a1aa' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#ef4444', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
