// app/devMode.tsx
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthContext, User } from './context/AuthContext';

export default function DevModeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { signIn } = useContext(AuthContext);

  const handleDevLogin = async (userType: 'admin' | 'user') => {
    setLoading(true);
    
    try {
      // Identifiants de test selon le type
      const credentials = userType === 'admin' 
        ? { identity: 'admin-cdpi@atelier.ovh', password: 'AdminCDPI123' }
        : { identity: 'moreira.s@laplateforme.io', password: 'adminCDPI123' };

      const response = await fetch('https://ticketing.development.atelier.ovh/api/mobile/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (data.access_token && response.ok) {
        const userInfo: User = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          company: data.user.company,
          admin: data.user.admin,
          admin_level: data.user.admin_level,
        };
        
        await signIn(data.access_token, userInfo);
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Erreur Dev', `Impossible de se connecter en tant que ${userType}`);
      }
    } catch (error) {
      Alert.alert('Erreur Dev', 'Connexion au serveur impossible');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Mode Développeur</Text>
      <Text style={styles.subtitle}>Connexion rapide pour les tests</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.adminButton]} 
        onPress={() => handleDevLogin('admin')}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Text style={styles.buttonTitle}>👑 Admin</Text>
            <Text style={styles.buttonSubtitle}>Accès complet</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.userButton]} 
        onPress={() => handleDevLogin('user')}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Text style={styles.buttonTitle}>👤 Utilisateur</Text>
            <Text style={styles.buttonSubtitle}>Accès limité</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Retour au login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 50,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  adminButton: {
    backgroundColor: '#ff6b6b',
  },
  userButton: {
    backgroundColor: '#4ecdc4',
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  backButton: {
    marginTop: 30,
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
