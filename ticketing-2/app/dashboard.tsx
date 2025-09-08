import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Ticket = {
  id: string;
  title: string;
  created: string;
  status: string;
  priority: string;
};

type Stats = {
  projects: number;
  tickets: {
    byPriority: { [key: string]: number };
    byStatus: { opened: number; closed: number };
    total: number;
  };
};


export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Token manquant');

      const resStats = await fetch(
        'https://ticketing.development.atelier.ovh/api/mobile/dashboard/stats',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resStats.ok) throw new Error(`Erreur ${resStats.status}`);
      const statsJson = await resStats.json();
      console.log('stats:', statsJson)
      setStats(statsJson);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchDashboard = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Token manquant');

      const resTickets = await fetch(
        'https://ticketing.development.atelier.ovh/api/mobile/dashboard',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resTickets.ok) throw new Error(`Erreur ${resTickets.status}`);
      const ticketsJson = await resTickets.json();

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const tickets = ticketsJson.recentTickets.filter(
        (t: any) =>
          t.status === 'opened' && new Date(t.created).getTime() >= oneWeekAgo
      );
      setRecentTickets(tickets);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchDashboard()]);
    setLoading(false);
  };

  fetchAll();
}, []);


  if (loading) {
    return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );
  }
  if (error) {
    return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Erreur : {error}</Text>
        </View>
    );
  }

  return (
      <FlatList
        data={recentTickets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.ticketRow}
        ListHeaderComponent={() => (
          <>
            {/* En-tête */}
            <View style={styles.header}>
              <Text style={styles.title}>Bienvenue adminatelier</Text>
              <Text style={styles.subTitle}>LaPlateforme</Text>
            </View>
            {/* Bouton création ticket */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/ticket/createTicket')}
            >
              <Text style={styles.createButtonText}>+ Créer un ticket</Text>
            </TouchableOpacity>
            {/* Statistiques */}
            {stats && (
  <View style={styles.statsRow}>
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>Tickets totaux</Text>
      <Text style={styles.statValue}>{stats.tickets.total}</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>Tickets ouverts</Text>
      <Text style={styles.statValue}>{stats.tickets.byStatus.opened}</Text>
    </View>
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>Tickets fermés</Text>
      <Text style={styles.statValue}>{stats.tickets.byStatus.closed}</Text>
    </View>
  </View>
)}

            <Text style={styles.sectionTitle}>Tickets ouverts de la semaine</Text>
          </>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.ticketCard}
            onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: item.id } })}
          >
            <Text style={styles.ticketTitle}>{item.title}</Text>
            <Text style={styles.ticketMeta}>Ticket #{item.id}</Text>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.container}
      />

  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
  container: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subTitle: { fontSize: 16, color: '#555', marginTop: 4 },
  createButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  statLabel: { fontSize: 14, color: '#555' },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  ticketRow: { justifyContent: 'space-between', marginBottom: 12 },
  ticketCard: {
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
  },
  ticketTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  ticketMeta: { fontSize: 12, color: '#777' },
  priorityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  priorityText: { fontSize: 12, fontWeight: '500', color: '#333' },
});
