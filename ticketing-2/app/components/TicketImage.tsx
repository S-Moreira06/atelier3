import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TicketImagesProps = {
  ticketId: string;
  filesJson: string | null;
  isComment?: boolean;
};

export default function TicketImages({
  ticketId,
  filesJson,
  isComment = false,
}: TicketImagesProps) {
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

  const baseURL = isComment
    ? 'https://ticketing.development.atelier.ovh/api/files/comments/'
    : 'https://ticketing.development.atelier.ovh/api/files/tickets/';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollContainer}
    >
      {files.map((filename) => {
        const uri = `${baseURL}${ticketId}/${filename}`;
        const ext = filename.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
          return (
            <TouchableOpacity
              key={filename}
              style={styles.pdfContainer}
              onPress={() => Linking.openURL(uri)}
            >
              <Text style={styles.pdfIcon}>📄</Text>
              <Text style={styles.pdfText} numberOfLines={1}>
                {filename}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <Image
            key={filename}
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
          />
        );
      })}
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
  pdfContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  pdfIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  pdfText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#007AFF',
  },
});
