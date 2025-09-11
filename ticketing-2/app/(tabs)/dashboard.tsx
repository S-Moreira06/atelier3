import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
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
  author: string;
  authorName?: string;
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

  // Fonction pour récupérer les données
  const fetchData = useCallback(async () => {
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
        const oneWeekAgo = Date.now() - 800 * 24 * 60 * 60 * 1000;

        // Extraire IDs auteurs uniques
        const authorIds: string[] = Array.from(
          new Set(
            ticketsJson.recentTickets
              .map((t: any) => t.author)
              .filter((id: string) => id && id.trim() !== '')
          )
        );

        // Récupérer les noms d'auteur en batch
        const userNamesMap: Record<string, string> = {};

        await Promise.all(
          authorIds.map(async (userId) => {
            try {
              const resUser = await fetch(
                `https://ticketing.development.atelier.ovh/api/mobile/users/${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (!resUser.ok) throw new Error(`Erreur ${resUser.status}`);
              const jsonUser = await resUser.json();
              userNamesMap[userId as string] = jsonUser.user.username || userId;
            } catch {
              userNamesMap[userId as string] = userId;
            }
          })
        );

        // Ajouter authorName à chaque ticket
        const ticketsWithNames = ticketsJson.recentTickets.map((t: any) => ({
          ...t,
          authorName: userNamesMap[t.author] || t.author,
        }));

        // Filtrer tickets ouverts de la semaine
        const ticketsFiltered = ticketsWithNames.filter(
          (t: any) =>
            t.status === 'opened' && new Date(t.created).getTime() >= oneWeekAgo
        );

        setRecentTickets(ticketsFiltered);
      } catch (err: any) {
        setError(err.message);
      }
    };

    setLoading(true);
    setError(null); // Reset l'erreur à chaque nouveau fetch
    await Promise.all([fetchStats(), fetchDashboard()]);
    setLoading(false);
  }, []);

  // Utiliser useFocusEffect au lieu de useEffect
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );


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
          <View style={styles.header}>
            <Text style={styles.title}>Bienvenue adminatelier</Text>
            <Text style={styles.subTitle}>LaPlateforme</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/(ticket)/createTicket')}
          >
            <Text style={styles.createButtonText}>+ Créer un ticket</Text>
          </TouchableOpacity>
          {/* Statistiques globales */}
          {stats && (
            <View style={styles.statsRow}>
              {/* Tickets totaux */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => {
                  router.replace({
                    pathname: '/ticketsList',
                    params: { status: undefined },
                  });
                }}
              >
                <Text style={styles.statLabel}>Tickets totaux</Text>
                <Text style={styles.statValue}>{stats.tickets.total}</Text>
              </TouchableOpacity>

              {/* Tickets ouverts */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => {
                  router.replace({
                    pathname: '/ticketsList',
                    params: { status: 'opened' },
                  });
                }}
              >
                <Text style={styles.statLabel}>Tickets ouverts</Text>
                <Text style={styles.statValue}>{stats.tickets.byStatus.opened}</Text>
              </TouchableOpacity>

              {/* Tickets fermés */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => {
                  router.replace({
                    pathname: '/ticketsList',
                    params: { status: 'closed' },
                  });
                }}
              >
                <Text style={styles.statLabel}>Tickets fermés</Text>
                <Text style={styles.statValue}>{stats.tickets.byStatus.closed}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Tickets ouverts de la semaine</Text>
        </>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.ticketCard}
          onPress={() => router.push({ pathname: '/(tabs)/(ticket)/[id]', params: { id: item.id } })}
        >
          <Text style={styles.ticketTitle}>{item.title}</Text>
          <Text style={styles.ticketMeta}>By {item.authorName || item.author}</Text>
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
