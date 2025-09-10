import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identity || !password) {
      Alert.alert('Tous les champs sont obligatoires');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://ticketing.development.atelier.ovh/api/mobile/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password }),
      });
      const data = await response.json();
      console.log("DATA:",data);
      console.log("reponse:",response.ok);
      
      if (data.access_token != null && response.ok) {
        await SecureStore.setItemAsync('userToken', data.access_token);
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Erreur de connexion', data.message || 'Vérifiez vos identifiants');
      }
    } catch (error) {
      Alert.alert('Erreur réseau', 'Impossible de joindre le serveur');
      console.error(error)
    } finally {
      setLoading(false);
    }
  };

  return (
    
    
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Email ou identité"
        value={identity}
        onChangeText={setIdentity}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Se connecter</Text>
        }
      </TouchableOpacity>
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    justifyContent: 'center',
    padding:        20,
    backgroundColor:'#f9f9f9',
  },
  title: {
    fontSize:     28,
    fontWeight:   'bold',
    marginBottom: 30,
    alignSelf:    'center',
  },
  input: {
    height:             50,
    borderColor:        '#ccc',
    borderWidth:        1,
    borderRadius:       8,
    paddingHorizontal:  15,
    marginBottom:       15,
    backgroundColor:    '#fff',
  },
  button: {
    height:          50,
    backgroundColor: '#007AFF',
    borderRadius:    8,
    justifyContent:  'center',
    alignItems:      'center',
    marginTop:       10,
  },
  buttonText: {
    color:      '#fff',
    fontSize:   16,
    fontWeight: '600',
  },
});
