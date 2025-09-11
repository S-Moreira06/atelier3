import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import React, { useEffect } from 'react';
import { Button } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleLogin() {
  const redirectUri = makeRedirectUri({
    scheme: 'com.laplateforme.ticketing',
    path: 'oauth2redirect/google',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: 'VotreAndroidClientID.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Token reçu:', response.params.id_token);
      // Traitez token, appel backend, etc.
    }
  }, [response]);

  return (
    <Button disabled={!request} title="Se connecter avec Google" onPress={() => promptAsync()} />
  );
}
