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
import DebugAuth from '../components/DebugAuth';
import useAuth from '../hooks/useAuth';


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
interface DashboardUserResponse  {
  recentTickets: Ticket[];
  projects: any[];
};
interface DashboardAdminResponse {
  projects: any[];
  recentTickets: Ticket[];
}
interface DashboardStatsResponse {
  byPriority: { [key: string]: number };
  byStatus: { opened: number; closed: number };
  total: number;
}


export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  
  // Fonction pour récupérer les données
  const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    // Récupération unique du token
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) throw new Error('Token manquant');

    // Sous-fonction pour les stats admin
    const fetchStats = async (token: string) => {
      const resStats = await fetch(
        'https://ticketing.development.atelier.ovh/api/mobile/dashboard/stats',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resStats.ok) throw new Error(`Erreur ${resStats.status}`);
      const statsJson = await resStats.json();
      setStats(statsJson);
    };

    // Sous-fonction pour le dashboard admin
    const fetchDashboard = async (token: string) => {
      const resTickets = await fetch(
        'https://ticketing.development.atelier.ovh/api/mobile/dashboard',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resTickets.ok) throw new Error(`Erreur ${resTickets.status}`);
      const ticketsJson = await resTickets.json();

      // Calcul de la date il y a 7 jours (7 jours = 7*24*60*60*1000 ms)
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Extraction et récupération batch des noms d’auteurs
      const authorIds: string[] = Array.from(
        new Set(
          (ticketsJson.recentTickets as any[])
            .map((t: any) => String(t.author))
            .filter((id: string) => id.trim())
        )
      );


      const userNamesMap: Record<string, string> = {};
      await Promise.all(
        authorIds.map(async (userId: string) => {
          try {
            const resUser = await fetch(
              `https://ticketing.development.atelier.ovh/api/mobile/users/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!resUser.ok) throw new Error();
            const { user } = await resUser.json();
            userNamesMap[userId] = user.username || userId;
          } catch {
            userNamesMap[userId] = userId;
          }
        })
      );

      // Ajout de authorName et filtrage
      const ticketsWithNames = ticketsJson.recentTickets.map((t: any) => ({
        ...t,
        authorName: userNamesMap[t.author] || t.author,
      }));
      const ticketsFiltered = ticketsWithNames.filter(
        (t: any) =>
          t.status === 'opened' &&
          new Date(t.created).getTime() >= oneWeekAgo
      );

      setRecentTickets(ticketsFiltered);
    };

    // Sous-fonction pour les utilisateurs non-admin
    const fetchDashboardUser = async (token: string) => {
      const res = await fetch(
        'https://ticketing.development.atelier.ovh/api/mobile/dashboard',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = (await res.json()) as DashboardUserResponse;
      const userTickets = data.recentTickets.filter(
        (t: any) => t.author === user?.id
      );
      const total = userTickets.length;
      const opened = userTickets.filter((t) => t.status === 'opened').length;
      const closed = userTickets.filter((t) => t.status === 'closed').length;

      const recalculatedStats: Stats = {
        projects: data.projects.length,
        tickets: {
          byPriority: {}, // à reconstruire si besoin
          byStatus: { opened, closed },
          total,
        },
      };

      return { recentTickets: userTickets, stats: recalculatedStats };
    };

    // Exécution selon le rôle
    if (user?.admin) {
      await Promise.all([fetchStats(token), fetchDashboard(token)]);
    } else {
      const { recentTickets: userTickets, stats: userStats } =
        await fetchDashboardUser(token);
      setRecentTickets(userTickets);
      setStats(userStats);
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [user]);

  // Utiliser useFocusEffect au lieu de useEffect
  useFocusEffect(
  useCallback(() => {
    setLoading(true);
    setError(null);
    fetchData().finally(() => setLoading(false));
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
            <Text style={styles.title}>{`Bienvenue ${user?.username || 'Invité'}`}</Text>
            <Text style={styles.subTitle}>LaPlateforme</Text>
          </View>
          <DebugAuth/>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/(ticket)/createTicket')}
          >
            <Text style={styles.createButtonText}>+ Créer un ticket</Text>
          </TouchableOpacity>
                {/* Bouton “Stats avancées” : réservé aux admins */}
      {user?.admin && (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: '#6c757d' }]}
          onPress={() => router.push('/(tabs)/adminStats')}
        >
          <Text style={styles.createButtonText}>Stats Admin</Text>
        </TouchableOpacity>
      )}
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
