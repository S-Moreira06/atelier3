import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity
} from 'react-native';

export default function CreateTicket() {
  const navigation = useNavigation();
  const [projects, setProjects] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [priority, setPriority] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch('https://ticketing.development.atelier.ovh/api/mobile/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setProjects(json.projects);
    })();
  }, []);

  const pickFiles = async () => {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true });
  // Dans les nouvelles versions, vérifie la propriété 'canceled'
  if (!result.canceled && result.assets) {
    setFiles(prev => [...prev, ...result.assets]);
  }
};


  const handleSubmit = async () => {
    if (!title || !description || !selectedProject || !priority) {
      Alert.alert('Tous les champs marqués * sont obligatoires');
      return;
    }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('project', selectedProject);
      form.append('priority', priority);
      files.forEach(file => {
        form.append('files[]', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
      });

      const res = await fetch('https://ticketing.development.atelier.ovh/api/mobile/tickets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      Alert.alert('Succès', 'Ticket créé avec succès');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Créer un nouveau ticket</Text>
      <TextInput
        style={styles.input}
        placeholder="Titre*"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description*"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Picker
        selectedValue={selectedProject}
        onValueChange={setSelectedProject}
        style={styles.picker}
      >
        <Picker.Item label="Choisissez un projet*" value="" />
        {projects.map(p => (
          <Picker.Item key={p.id} label={p.name} value={p.id} />
        ))}
      </Picker>
      <Picker
        selectedValue={priority}
        onValueChange={setPriority}
        style={styles.picker}
      >
        <Picker.Item label="Choisissez une priorité*" value="" />
        <Picker.Item label="Low" value="low" />
        <Picker.Item label="Medium" value="medium" />
        <Picker.Item label="High" value="high" />
      </Picker>
      <TouchableOpacity onPress={pickFiles} style={styles.fileButton}>
        <Text style={styles.fileButtonText}>Sélect. fichiers (optionnel)</Text>
      </TouchableOpacity>
      {files.map(f => (
        <Text key={f.uri} style={styles.fileName}>{f.name}</Text>
      ))}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Ajouter un ticket</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f9f9f9' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign:'center' },
  input: {
    backgroundColor: '#fff', padding: 12, borderRadius: 8,
    marginBottom: 12, borderWidth:1, borderColor:'#ddd'
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  picker: {
    backgroundColor: '#fff', marginBottom: 12, borderRadius: 8
  },
  fileButton: {
    backgroundColor: '#e1e1e1', padding: 10, borderRadius: 8, marginBottom: 8,
  },
  fileButtonText: { color: '#333' },
  fileName: { fontSize: 12, marginBottom: 4 },
  submitButton: {
    backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems:'center'
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '600' },
});
