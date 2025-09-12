import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import useAuth from '../hooks/useAuth';

export default function TabLayout() {
  const router = useRouter();
  const { token, loading, signOut } = useAuth();

  // Redirection si non authentifié
  useEffect(() => {
    if (!loading && !token) {
      router.replace('/');
    }
  }, [loading, token]);

  // Affiche un loader tant que l’état de chargement est en cours
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ✅ NOUVELLE FONCTION : Gérer la déconnexion
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
                    onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]
    );
  };

  // 1. Définir un objet JS pour les screenOptions, typé
  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarStyle: styles.tabBarStyle,
    tabBarActiveTintColor: '#007AFF',
    tabBarInactiveTintColor: '#8E8E93',
    tabBarActiveBackgroundColor: '#E6F0FF',
    tabBarInactiveBackgroundColor: '#fff',
    tabBarLabelStyle: { marginBottom: 2 },
    tabBarIconStyle: { marginBottom: 0 },
    // NB: tabBarPressOpacity n’est pas supporté dans ces options
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconNav, { color }]}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="ticketsList"
        options={{
          title: 'TicketList',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconNav, { color }]}>🎫</Text>
          ),
        }}
      />
       {/* ✅ NOUVEL ONGLET : Déconnexion */}
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Déconnexion',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconNav, { color }]}>🚪</Text>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Empêcher la navigation par défaut
            e.preventDefault();
            // Déclencher la déconnexion
            handleLogout();
          },
        }}
      />
      {/* Masquer les routes ticket */}
      <Tabs.Screen name="(ticket)/createTicket" options={{ href: null }} />
      <Tabs.Screen name="(ticket)/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="(ticket)/[id]/index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 5,
    paddingTop: 8,
    height: 60,
  },
  iconNav: {
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
});
