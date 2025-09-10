import { Stack } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaView style={{flex:1, backgroundColor: '#000'}}>
      <KeyboardAvoidingView // permet au contenu de s'adapter si ouverture du clavier
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Stack
          screenOptions={{
          headerShown: false, // On masque le header par défaut
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)"  />
          

        </Stack>
      </KeyboardAvoidingView>
    </SafeAreaView>);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor:'#f9f9f9',
  },
})