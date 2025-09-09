import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ExpandableCard from '../components/ExpandableCard';
import TicketImages from '../components/TicketImage';
import useUserName from '../hooks/useUserName';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  

  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) throw new Error('Token manquant');
        const res = await fetch(
          `https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const json = await res.json();
        setAdmins(json.admins || []);
        setTicket(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTicket();
  }, [id]);
          console.log('Reponse API Ticket:', JSON.stringify(ticket, null, 2))


  const handleAssign = async () => {
    if (!selectedAdmin) {
      Alert.alert('Veuillez choisir un administrateur à assigner.');
      return;
    }
    setAssigning(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(
        `https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}/assign`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: selectedAdmin }),
        }
      );
      if (!res.ok) throw new Error(`Erreur assignation: ${res.status}`);

      const updated = await res.json();
      if (updated.ticket) {
        setTicket({ ticket: updated.ticket });
      }
      Alert.alert('Assignation réalisée avec succès');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setAssigning(false);
    }
  };

  // Status Colors
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'opened': return { backgroundColor: '#28a745', color: '#fff' };
      case 'closed': return { backgroundColor: '#6c757d', color: '#fff' };
      case 'in progress': return { backgroundColor: '#007bff', color: '#fff' };
      default: return { backgroundColor: '#ffc107', color: '#000' };
    }
  };

  // Priority COlors
  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'haute':
      case 'high':
      case 'urgent': return { backgroundColor: '#dc3545', color: '#fff' };
      case 'medium':
      case 'normale': return { backgroundColor: '#ffc107', color: '#000' };
      case 'basse':
      case 'low': return { backgroundColor: '#28a745', color: '#fff' };
      default: return { backgroundColor: '#6c757d', color: '#fff' };
    }
  };
  //UserName
const authorId = ticket?.ticket?.author || null;
const assignedId = ticket?.ticket?.assigned_to || null;


const authorName = useUserName(authorId);
const assignedName = useUserName(assignedId);


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
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.noTicket}>Aucun ticket trouvé.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{ticket.ticket.title}</Text>
        <Text style={styles.ticketId}>Ticket #{ticket.ticket.id}</Text>
      </View>

      {/* Informations générales */}
      <ExpandableCard title="Informations générales">
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Créé par</Text>
            <Text style={styles.value}>{authorName || 'Non renseigné'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Date de création</Text>
            <Text style={styles.value}>
              {new Date(ticket.ticket.created).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Statut</Text>
            <View style={[styles.badge, getStatusStyle(ticket.ticket.status)]}>
              <Text style={[styles.badgeText, { color: getStatusStyle(ticket.ticket.status).color }]}>
                {ticket.ticket.status}
              </Text>
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Priorité</Text>
            <View style={[styles.badge, getPriorityStyle(ticket.ticket.priority)]}>
              <Text style={[styles.badgeText, { color: getPriorityStyle(ticket.ticket.priority).color }]}>
                {ticket.ticket.priority}
              </Text>
            </View>
          </View>
        </View>
      </ExpandableCard>

      {/* Description */}
      <ExpandableCard title="Description">
        <Text style={styles.description}>
          {ticket.ticket.description || 'Aucune description fournie'}
        </Text>
      </ExpandableCard>

      {/* Projet */}
      <ExpandableCard title="Projet">
        <Text style={styles.value}>{ticket.ticket.project || 'Non renseigné'}</Text>
      </ExpandableCard>

      {/* Assignation */}
      <ExpandableCard title="Assignation" initialExpanded={false}>
        <View style={styles.assignmentSection}>
          <Text style={styles.label}>Assigné à</Text>
          <Text style={styles.assignedValue}>
            {assignedName || 'Aucun utilisateur assigné'}
          </Text>
        </View>

        <View style={styles.assignmentControls}>
          <Text style={styles.label}>Assigner un administrateur</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedAdmin}
              onValueChange={setSelectedAdmin}
              style={styles.picker}
            >
              <Picker.Item label="Choisir un administrateur" value={null} />
              {admins.map((admin) => (
                <Picker.Item key={admin.id} label={admin.username} value={admin.id} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity
            style={[
              styles.assignButton,
              (assigning || !selectedAdmin) && styles.assignButtonDisabled,
            ]}
            disabled={assigning || !selectedAdmin}
            onPress={handleAssign}
          >
            <Text style={styles.assignButtonText}>
              {assigning ? 'Assignation...' : "Gérer l'assignation"}
            </Text>
          </TouchableOpacity>
        </View>
      </ExpandableCard>

      {/* Ressources */}
      <ExpandableCard title="Ressources" initialExpanded={false}>
        <TicketImages
          ticketId={ticket.ticket.id}
          filesJson={ticket.ticket.files}
        />
      </ExpandableCard>

      {/* Commentaires */}
      <ExpandableCard title="Commentaires">
        <Text style={styles.emptyState}>Aucun commentaire pour le moment</Text>
      </ExpandableCard>
    </ScrollView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 0,
    marginBottom: 8,
    padding: 10,
    //borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    alignSelf: 'center',
  },
  ticketId: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lastCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  assignedValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  assignmentSection: {
    marginBottom: 1,
  },
  assignmentControls: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 1,
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 8,
  },
  picker: {
    height: 50,
  },
  assignButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    opacity: 0.6,
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  noTicket: {
    fontSize: 18,
    color: '#666',
  },
  error: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
  },
});
