import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, {
  useCallback,
  useState
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TicketItem from '../components/TicketItem';
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
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Token manquant');
      const fetchStats = async (token: string) => {
        const resStats = await fetch(
          'https://ticketing.development.atelier.ovh/api/mobile/dashboard/stats',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resStats.ok) throw new Error(`Erreur ${resStats.status}`);
        const statsJson = await resStats.json();
        setStats(statsJson);
      };
      const fetchDashboardAdmin = async (token: string) => {
        const resTickets = await fetch(
          'https://ticketing.development.atelier.ovh/api/mobile/dashboard',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resTickets.ok) throw new Error(`Erreur ${resTickets.status}`);
        const ticketsJson = await resTickets.json();
        // Calcul de la date il y a 7 jours (7 jours = 7*24*60*60*1000 ms)
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        // Extraction et récupération batch des noms d’auteurs, car le hook useUserName ne s'exacute pas a chaque ticket???? a verifier
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
        await Promise.all([fetchStats(token), fetchDashboardAdmin(token)]);
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
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      fetchData().finally(() => setLoading(false));
    }, [fetchData])
  );
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#E74A34';
      case 'medium': return '#ffc107';
      case 'low': return '#00988f';
      case 'urgent': return '#E74A34';
      default: return '#80791eff';
    }
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'opened':      return '#00988f';
      case 'in progress': return '#0062FF';
      case 'closed':      return '#6c757d';
      default:            return '#ffc107';
    }
  };

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
      ListHeaderComponent={() => (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>LaPlateforme - Ticketing</Text>
            <Text style={styles.subTitle}>Dashboard</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>{`Bienvenue ${user?.username || 'Invité'}`}</Text>
          </View>
          {/* ---Statistiques globales--- */}
          {stats && (
            <View style={styles.statsRow}>
              {/* ---Tickets totaux--- */}
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
              {/* ---Tickets ouverts--- */}
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
          <TouchableOpacity
            style={styles.greenButton}
            onPress={() => router.push('/(tabs)/(ticket)/createTicket')}
          >
            <Text style={styles.greenButtonText}>+ Créer un ticket</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Tickets ouverts de la semaine</Text>
        </>
      )}
      renderItem={({ item }) => (
        <TicketItem
                        ticket={item}
                        getPriorityColor={getPriorityColor}
                        getStatusColor={getStatusColor}
                    />
      )}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  container: { padding: 16 },
  header: { 
    alignItems: 'center', 
    marginBottom: 10, 
    marginHorizontal: -16, 
    marginTop: -16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#302c2cff',
    
    backgroundColor: '#0062ff'},
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffffff', },
  subTitle: { fontSize: 18, marginTop: 4, color: '#ffffffff',},

  greenButton: {
    backgroundColor: '#00988f',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  greenButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
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
