import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useUserName from '../hooks/useUserName';

type Ticket = {
  id: string;
  title: string;
  created: string;
  priority: string;
  status: string;
  author: string;
  company_name?: string;
  project_name?: string;
};

type Props = {
  ticket: Ticket;
  getPriorityColor: (p: string) => string;
};

export default function TicketItem({ ticket,  getPriorityColor }: Props) {
  const router = useRouter();
  const authorName = useUserName(ticket.author);

  return (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => router.push({ pathname: '/(tabs)/(ticket)/[id]', params: { id: ticket.id } })}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle} numberOfLines={2}>
          {ticket.title}
        </Text>
        <View style={styles.ticketBadges}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
            <Text style={styles.badgeText}>{ticket.priority}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.ticketMeta}>
        Par {authorName || ticket.author}
      </Text>

      {ticket.company_name && (
        <Text style={styles.ticketMeta}>Entreprise : {ticket.company_name}</Text>
      )}
      {ticket.project_name && (
        <Text style={styles.ticketMeta}>Projet : {ticket.project_name}</Text>
      )}
      <Text style={styles.ticketDate}>
        {new Date(ticket.created).toLocaleDateString('fr-FR')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  ticketBadges: {
    flexDirection: 'row',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  ticketMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
