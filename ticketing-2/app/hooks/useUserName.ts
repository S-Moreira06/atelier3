import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

export default function useUserName(userId: string | undefined | null) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setName(null);
      return;
    }
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const res = await fetch(
          `https://ticketing.development.atelier.ovh/api/mobile/users/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Erreur récupération utilisateur');
        const resJson = await res.json();
        const user = resJson.user;
        if (user && user.username) {
          setName(user.username);
        } else {
          setName(null);
        }
      } catch (e) {
        // Gestion silencieuse de l'erreur: pas de setName pour ne pas forcer le nom
        console.log('Erreur fetching user:', e);
        setName(null);
      }
    })();
  }, [userId]);

  return name;
}
