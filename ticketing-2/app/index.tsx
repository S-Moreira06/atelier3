import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import SVGComponent from './components/SvgLogo';
import { AuthContext, User } from './context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useContext(AuthContext);

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
        // Stockage via le contexte
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
      <SVGComponent style={styles.marginLogo}/>
      <Text style={styles.title}>Service de ticketing</Text>
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
    backgroundColor: '#0062ffc4'
  },
  title: {
    fontSize:     28,
    fontWeight:   'bold',
    marginBottom: 30,
    alignSelf:    'center',
    color: '#fff',
    
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
  logoMain: {
    width:50,
    height: 50,
    alignSelf: 'center'
  },
  marginLogo: {
    marginBottom: 30,
    marginTop: -50,
    alignSelf: 'center'
  }
});
