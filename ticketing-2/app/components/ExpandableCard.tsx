import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ExpandableCardProps = {
  title: string;
  initialExpanded?: boolean;
  children: React.ReactNode;
};

export default function ExpandableCard({ title, initialExpanded = true, children }: ExpandableCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7} style={styles.titleContainer}>
        <Text style={styles.icon}>{expanded ? '▲' : '▼'}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.cardContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5
  },
  icon: {
    fontSize: 16,
    color: '#666',
  },
  cardContent: {
    marginTop: 12,
  },
});
