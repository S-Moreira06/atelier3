// app/(tabs)/debugAuth.tsx
import React from 'react';
import { Text, View } from 'react-native';
import useAuth from '../hooks/useAuth';

export default function DebugAuth() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <Text>Chargement du contexte…</Text>;
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontWeight: 'bold' }}>Token stocké :</Text>
      <Text selectable>{token || '— aucun —'}</Text>

      <Text style={{ fontWeight: 'bold', marginTop: 20 }}>Données utilisateur :</Text>
      <Text>{user ? JSON.stringify(user, null, 2) : '— aucune —'}</Text>
    </View>
  );
}
