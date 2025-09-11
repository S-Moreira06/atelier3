import React, { useEffect } from 'react';
import { Button, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();
const redirectUri = makeRedirectUri({ scheme: 'com.laplateforme.ticketing' });
console.log('Redirect URI:', redirectUri);

export default function GoogleLogin() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // iosClientId: '08799164526-4csr8jprodtpvcnth2seth1cp5klregn.apps.googleusercontent.com',
    androidClientId: '308799164526-fcev8t7oopjn22evu0rqt0s9umcd9303.apps.googleusercontent.com',
    // webClientId: '308799164526-5f3e12b2nqrllupbp9lkitnnm65hvcc3.apps.googleusercontent.com',
    redirectUri,
  });

//   useEffect(() => {
//     console.log('Réponse OAuth:', response);
//     if (response?.type === 'success') {
//       console.log('OAuth Success, tokens:', response.params);
//       const { id_token } = response.params;
//       // Appeler ton backend avec id_token pour authentification
//       Alert.alert('Connexion réussie', `Token: ${id_token?.substring(0, 10)}...`);
//     } else if (response?.type === 'error') {
//       console.error('OAuth Error:', response.error || response.params);
//       Alert.alert('Erreur Auth', 'Échec de la connexion Google');
//     }
//   }, [response]);
  useEffect(() => {
  // Log la totalité de la réponse OAuth
  console.log('Réponse OAuth brute:', response);

  if (response?.type === 'success') {
    const { id_token, ...otherParams } = response.params;

    // Log le token et tous les autres paramètres reçus
    console.log('id_token reçu:', id_token);
    console.log('Autres paramètres OAuth:', otherParams);

    // Envoie le token au backend
    console.log('Envoi du token au backend...');
    fetch('https://ton-backend/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token }),
    })
    .then(r => {
      console.log('Statut HTTP backend:', r.status);
      return r.json();
    })
    .then(data => {
      console.log('Réponse du backend:', data);
    })
    .catch(error => {
      console.error('Erreur lors de la requête backend:', error);
    });
  } else if (response?.type === 'error') {
    // Log les erreurs d'auth OAuth
    console.error('Erreur de connexion OAuth:', response?.error || response?.params || response);
  } else {
    // Log tout autre retour inattendu
    console.log('Réponse OAuth inattendue:', response);
  }
}, [response]);


  return (
    <Button
      disabled={!request}
      title="Se connecter avec Google"
      onPress={() => {
        promptAsync(); 
      }}
    />
  );
}
