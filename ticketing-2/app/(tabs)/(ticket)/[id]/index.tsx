import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ExpandableCard from '../../../components/ExpandableCard';
import TicketImages from '../../../components/TicketImage';
import useUserName from '../../../hooks/useUserName';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  
  // États pour la suppression
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [addCommentModalVisible, setAddCommentModalVisible] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attachedFile, setAttachedFile] = useState<any>(null);



  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) throw new Error('Token manquant');
        const res = await fetch(
          `https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const json = await res.json();
        setAdmins(json.admins || []);
        setComments(json.comments || []);
        setTicket(json);
        setIsAdmin(json.isAdmin);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTicket();
  }, [id]);

  console.log('Reponse API Ticket:', JSON.stringify(ticket,null,2))

  // Fonction pour supprimer le ticket
  const deleteTicket = async () => {
    setDeleting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(
        `https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }
      
      Alert.alert('Succès', 'Ticket supprimé avec succès', [
        {
          text: 'OK',
          onPress: () => router.push('/dashboard'), // Retour au dashboard
        },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };
  // Fonction pour ajouter un commentaire
  const addComment = async () => {
    if (!commentContent.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un commentaire.');
      return;
    }

    setAddingComment(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      const formData = new FormData();
      formData.append('ticket_id', id);
      formData.append('content', commentContent);
      // Ajout du fichier si il existe
      if (attachedFile) {
        const fileUri = attachedFile.uri.startsWith('file://') 
          ? attachedFile.uri 
          : 'file://' + attachedFile.uri;
        
        formData.append('files', {
          uri: fileUri,
          name: attachedFile.name,
          type: attachedFile.mimeType || 'application/octet-stream',
        } as any);
      }
      const res = await fetch(
        'https://ticketing.development.atelier.ovh/api/mobile/comments',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      Alert.alert('Succès', 'Commentaire ajouté avec succès');
      setCommentContent('');
      setAddCommentModalVisible(false);
      
      // Recharger les données du ticket
      const ticketRes = await fetch(
        `https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (ticketRes.ok) {
        const updatedTicket = await ticketRes.json();
        setTicket(updatedTicket);
        setComments(updatedTicket.comments || []);
        setIsAdmin(updatedTicket.isAdmin);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setAddingComment(false);
      setAttachedFile(null);
    }
  };
  // Fonction pour supprimer un commentaire
  const deleteComment = async (commentId: string) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(
        `https://ticketing.development.atelier.ovh/api/mobile/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }
      // Mettre à jour la liste locale sans recharger tout
      setComments(comments.filter((c) => c.id !== commentId));
      Alert.alert('Succès', 'Commentaire supprimé');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleAssign = async () => {
    if (!selectedAdmin) {
      Alert.alert('Veuillez choisir un administrateur à assigner.');
      return;
    }
    setAssigning(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(
        `https://ticketing.development.atelier.ovh/api/mobile/tickets/${id}/assign`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: selectedAdmin }),
        }
      );
      if (!res.ok) throw new Error(`Erreur assignation: ${res.status}`);

      const updated = await res.json();
      if (updated.ticket) {
        setTicket({ ticket: updated.ticket });
      }
      Alert.alert('Assignation réalisée avec succès');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setAssigning(false);
    }
  };

  // Status Colors
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'opened': return { backgroundColor: '#28a745', color: '#fff' };
      case 'closed': return { backgroundColor: '#6c757d', color: '#fff' };
      case 'in progress': return { backgroundColor: '#007bff', color: '#fff' };
      default: return { backgroundColor: '#ffc107', color: '#000' };
    }
  };

  // Priority COlors
  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'haute':
      case 'high':
      case 'urgent': return { backgroundColor: '#dc3545', color: '#fff' };
      case 'medium':
      case 'normale': return { backgroundColor: '#ffc107', color: '#000' };
      case 'basse':
      case 'low': return { backgroundColor: '#28a745', color: '#fff' };
      default: return { backgroundColor: '#6c757d', color: '#fff' };
    }
  };

  //UserName
  const authorId = ticket?.ticket?.author || null;
  const assignedId = ticket?.ticket?.assigned_to || null;

  const authorName = useUserName(authorId);
  const assignedName = useUserName(assignedId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text style={styles.noTicket}>Aucun ticket trouvé.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* En-tête avec boutons d'action */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{ticket.ticket.title}</Text>
              <Text style={styles.ticketId}>Ticket #{ticket.ticket.id}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={() => router.push(`/(ticket)/${id}/edit`)}
              >
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteIconButton}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {/* Informations générales */}
        <ExpandableCard title="Informations générales">
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Créé par</Text>
              <Text style={styles.value}>{authorName || 'Non renseigné'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Date de création</Text>
              <Text style={styles.value}>
                {new Date(ticket.ticket.created).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Statut</Text>
              <View style={[styles.badge, getStatusStyle(ticket.ticket.status)]}>
                <Text style={[styles.badgeText, { color: getStatusStyle(ticket.ticket.status).color }]}>
                  {ticket.ticket.status}
                </Text>
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Priorité</Text>
              <View style={[styles.badge, getPriorityStyle(ticket.ticket.priority)]}>
                <Text style={[styles.badgeText, { color: getPriorityStyle(ticket.ticket.priority).color }]}>
                  {ticket.ticket.priority}
                </Text>
              </View>
            </View>
          </View>
        </ExpandableCard>

        {/* Description */}
        <ExpandableCard title="Description">
          <Text style={styles.description}>
            {ticket.ticket.description || 'Aucune description fournie'}
          </Text>
        </ExpandableCard>

        {/* Projet */}
        <ExpandableCard title="Projet">
          <Text style={styles.value}>{ticket.ticket.project || 'Non renseigné'}</Text>
        </ExpandableCard>

        {/* Assignation */}
        <ExpandableCard title="Assignation" initialExpanded={false}>
          <View style={styles.assignmentSection}>
            <Text style={styles.label}>Assigné à</Text>
            <Text style={styles.assignedValue}>
              {assignedName || 'Aucun utilisateur assigné'}
            </Text>
          </View>

          <View style={styles.assignmentControls}>
            <Text style={styles.label}>Assigner un administrateur</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedAdmin}
                onValueChange={setSelectedAdmin}
                style={styles.picker}
              >
                <Picker.Item label="Choisir un administrateur" value={null} />
                {admins.map((admin) => (
                  <Picker.Item key={admin.id} label={admin.username} value={admin.id} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity
              style={[
                styles.assignButton,
                (assigning || !selectedAdmin) && styles.assignButtonDisabled,
              ]}
              disabled={assigning || !selectedAdmin}
              onPress={handleAssign}
            >
              <Text style={styles.assignButtonText}>
                {assigning ? 'Assignation...' : "Gérer l'assignation"}
              </Text>
            </TouchableOpacity>
          </View>
        </ExpandableCard>

        {/* Ressources */}
        <ExpandableCard title="Ressources" initialExpanded={false}>
          <TicketImages
            ticketId={ticket.ticket.id}
            filesJson={ticket.ticket.files}
          />
        </ExpandableCard>

        {/* Commentaires */}
        <View style={styles.card}>
          <View style={styles.commentsHeader}>
            <Text style={styles.cardTitle}>Commentaires</Text>
            <TouchableOpacity
              style={styles.addCommentIconButton}
              onPress={() => setAddCommentModalVisible(true)}
            >
              <Text style={styles.addCommentIcon}>+</Text>
            </TouchableOpacity>
          </View>
          {comments.length === 0 ? (
  <Text style={styles.emptyState}>Aucun commentaire pour le moment</Text>
) : (
  comments.map((comment) => (
    <View key={comment.id} style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{comment.username}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.commentDate}>
            {`${new Date(comment.created).toLocaleDateString('fr-FR')} à ${new Date(comment.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
          {(isAdmin || comment.author === authorId) && (
            <TouchableOpacity
              style={styles.deleteCommentButton}
              onPress={() =>
                Alert.alert(
                  'Supprimer le commentaire',
                  'Confirmer la suppression ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', onPress: () => deleteComment(comment.id) },
                  ]
                )
              }
            >
              <Text style={styles.deleteCommentText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
      {comment.files && comment.files !== "" && (
        <TicketImages
          ticketId={comment.id}
          filesJson={comment.files}
          isComment={true}
          // style={{ marginTop: 4 }}
        />
      )}
    </View>
  ))
)}

          <TouchableOpacity
            style={styles.addCommentButton}
            onPress={() => setAddCommentModalVisible(true)}
          >
            <Text style={styles.addCommentButtonText}>Ajouter un commentaire</Text>
          </TouchableOpacity>
        </View>


        {/* Boutons d'action en bas */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/(ticket)/${id}/edit`)}
          >
            <Text style={styles.editButtonText}>✏️ Modifier le ticket</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Supprimer le ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de confirmation */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmer la suppression</Text>
            <Text style={styles.modalText}>
              Êtes-vous sûr de vouloir supprimer le ticket "{ticket?.ticket?.title}" ?
              {'\n\n'}Cette action est irréversible.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmDeleteButton, deleting && styles.confirmDeleteButtonDisabled]}
                onPress={deleteTicket}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal d'ajout de commentaire */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addCommentModalVisible}
        onRequestClose={() => setAddCommentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un commentaire</Text>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Saisissez votre commentaire..."
              value={commentContent}
              onChangeText={setCommentContent}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.attachFileButton}
              onPress={async () => {
                const result = await DocumentPicker.getDocumentAsync({});
                if (!result.canceled && result.assets) {
                  setAttachedFile(result.assets[0]); // Prendre le premier fichier
                }
              }}
            >

              <Text style={styles.attachFileButtonText}>
                {attachedFile ? `Fichier sélectionné : ${attachedFile.name}` : 'Joindre un fichier'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setAddCommentModalVisible(false);
                  setCommentContent('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmAddButton, addingComment && styles.confirmAddButtonDisabled]}
                onPress={addComment}
                disabled={addingComment}
              >
                {addingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmAddText}>Ajouter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 0,
    marginBottom: 8,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
  },
  editIcon: {
    fontSize: 18,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 16,
    color: '#666',
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ffebee',
  },
  deleteIcon: {
    fontSize: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lastCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  assignedValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  assignmentSection: {
    marginBottom: 1,
  },
  assignmentControls: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 1,
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 8,
  },
  picker: {
    height: 50,
  },
  assignButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    opacity: 0.6,
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  noTicket: {
    fontSize: 18,
    color: '#666',
  },
  error: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Styles pour les actions de suppression
  
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomActions: {
    padding: 16,
    gap: 12, // Espacement entre les boutons
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },

  
  // Styles pour la modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmDeleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  confirmDeleteButtonDisabled: {
    opacity: 0.6,
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
    // Nouveaux styles pour les commentaires
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCommentIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    minWidth: 36,
    alignItems: 'center',
  },
  addCommentIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addCommentButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addCommentButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Styles pour la modale d'ajout de commentaire
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    width: '100%',
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  confirmAddButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  confirmAddButtonDisabled: {
    opacity: 0.6,
  },
  confirmAddText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  commentItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  commentDate: {
    color: '#666',
    fontSize: 12,
  },
  commentContent: {
    color: '#333',
    fontSize: 16,
    lineHeight: 20,
  },
    deleteCommentButton: {
    marginLeft: 8,
    padding: 4,
  },
  deleteCommentText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  attachFileButton: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  attachFileButtonText: {
    color: '#555',
    fontWeight: '600',
  },



});
