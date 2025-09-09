import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EditTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  // États pour les données du formulaire
  const [projects, setProjects] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  
  // États pour les chargements
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Charger les données initiales (ticket + projets)
  useEffect(() => {
    const fetchData = async () => {
      setInitialLoading(true);
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) throw new Error('Token manquant');

        // Récupérer les projets et le ticket en parallèle
        const [dashboardRes, ticketRes] = await Promise.all([
          fetch('https://ticketing.development.atelier.ovh/api/mobile/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!dashboardRes.ok || !ticketRes.ok) {
          throw new Error('Erreur lors du chargement des données');
        }

        const dashboardJson = await dashboardRes.json();
        const ticketJson = await ticketRes.json();

        // Définir les projets
        setProjects(dashboardJson.projects);

        // Pré-remplir les champs avec les données du ticket
        const ticket = ticketJson.ticket;
        setTitle(ticket.title || '');
        setDescription(ticket.description || '');
        setSelectedProject(ticket.project || '');
        setPriority(ticket.priority || '');
        setStatus(ticket.status || '');

      } catch (err: any) {
        Alert.alert('Erreur', err.message);
        router.back(); // Retour si erreur
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (!result.canceled && result.assets) {
      setFiles(prev => [...prev, ...result.assets]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
        Alert.alert('Le titre est obligatoire');
        return;
    }

    setLoading(true);
    try {
        const token = await SecureStore.getItemAsync('userToken');
        
        // TOUJOURS FormData - plus simple !
        const form = new FormData();
        
        if (title.trim()) form.append('title', title.trim());
        if (description.trim()) form.append('description', description.trim());
        if (priority) form.append('priority', priority);
        if (status) form.append('status', status);
        
        // Ajouter les fichiers s'il y en a
        files.forEach(file => {
        const fileUri = file.uri.startsWith('file://') ? file.uri : 'file://' + file.uri;
        form.append('files', {
            uri: fileUri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
        } as any);
        });

        const res = await fetch(`https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            // Pas de Content-Type, React Native gère automatiquement
        },
        body: form,
        });

        if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Erreur ${res.status}`);
        }

        Alert.alert('Succès', 'Ticket modifié avec succès');
        router.replace(`/ticket/${id}`);
    } catch (err: any) {
        Alert.alert('Erreur', err.message);
    } finally {
        setLoading(false);
    }
    };


  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Modifier le ticket</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Titre*"
        value={title}
        onChangeText={setTitle}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      
      <Picker
        selectedValue={selectedProject}
        onValueChange={setSelectedProject}
        style={styles.picker}
      >
        <Picker.Item label="Choisissez un projet" value="" />
        {projects.map(p => (
          <Picker.Item key={p.id} label={p.name} value={p.id} />
        ))}
      </Picker>
      
      <Picker
        selectedValue={priority}
        onValueChange={setPriority}
        style={styles.picker}
      >
        <Picker.Item label="Choisissez une priorité" value="" />
        <Picker.Item label="Low" value="low" />
        <Picker.Item label="Medium" value="medium" />
        <Picker.Item label="High" value="high" />
      </Picker>
      
      <Picker
        selectedValue={status}
        onValueChange={setStatus}
        style={styles.picker}
      >
        <Picker.Item label="Choisissez un statut" value="" />
        <Picker.Item label="Opened" value="opened" />
        <Picker.Item label="In Progress" value="in progress" />
        <Picker.Item label="Closed" value="closed" />
      </Picker>
      
      <TouchableOpacity onPress={pickFiles} style={styles.fileButton}>
        <Text style={styles.fileButtonText}>Ajouter des fichiers (optionnel)</Text>
      </TouchableOpacity>
      
      {files.map(f => (
        <Text key={f.uri} style={styles.fileName}>{f.name}</Text>
      ))}
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Modifier le ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f9f9f9' },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f9f9f9' 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: '#666' 
  },
  header: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  picker: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8
  },
  fileButton: {
    backgroundColor: '#e1e1e1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileButtonText: { color: '#333' },
  fileName: { fontSize: 12, marginBottom: 4 },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '600' },
});
