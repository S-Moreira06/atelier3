import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

type TicketImagesProps = {
  ticketId: string;
  filesJson: string | null;
};

export default function TicketImages({ ticketId, filesJson }: TicketImagesProps) {
  if (!filesJson) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucune image disponible</Text>
      </View>
    );
  }

  let files: string[] = [];
  try {
    files = JSON.parse(filesJson);
  } catch {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Erreur lors du chargement des images</Text>
      </View>
    );
  }

  if (!files.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucune image disponible</Text>
      </View>
    );
  }

  const baseURL = 'https://ticketing.development.atelier.ovh/api/files/tickets/';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollContainer}
    >
      {files.map((filename) => (
        <Image
          key={filename}
          source={{ uri: `${baseURL}${ticketId}/${filename}` }}
          style={styles.image}
          resizeMode="cover"
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    marginVertical: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 10,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});
