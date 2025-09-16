import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TicketItem from '../components/TicketItem';
import useAuth from '../hooks/useAuth';

type Ticket = {
  id: string;
  title: string;
  created: string;
  status: string;
  priority: string;
  author: string;
  authorName?: string;
  company_name?: string;
  project_name?: string;
};

type SortOption = 'created' | 'priority';
type SortOrder = 'ASC' | 'DESC';

export default function Tickets() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
status?: string;}>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // États pour les filtres et tri
  const [searchText, setSearchText] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]); // ✅ NOUVEAU : Array des priorités sélectionnées
  const { status: initialStatus} = useLocalSearchParams<{ status?: string}>();
  const [statusFilter, setStatusFilter] = useState(initialStatus || '');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  // États pour les dropdowns
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availablePriorities, setAvailablePriorities] = useState<string[]>([]); // ✅ NOUVEAU
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false); // ✅ NOUVEAU

useFocusEffect(
  useCallback(() => {
    // Synchroniser les états avec les query params
    setStatusFilter(params.status ?? '');

    // Lancer le fetch avec les nouveaux filtres
    fetchTickets(1, true);
  }, [params.status])
);
// ✅ NOUVELLE FONCTION : Charger toutes les priorités disponibles (une seule fois)
const loadAllAvailableData = useCallback(async () => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) throw new Error('Token manquant');

    // Récupérer TOUTES les données sans filtrage pour avoir les options complètes
    const params = new URLSearchParams({
      page: '1',
      limit: '100', // Plus grande limite pour récupérer plus de données
      sortBy: 'created',
      sortOrder: 'DESC',
    });

    const response = await fetch(
      `https://ticketing.development.atelier.ovh/api/mobile/tickets?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    const data = await response.json();
    
    const allTickets = data.tickets || data || [];
    
    // Extraire toutes les priorités et entreprises disponibles
    extractUniqueCompanies(allTickets);
    extractUniquePriorities(allTickets);
    
    console.log('✅ Toutes les options chargées');
  } catch (err) {
    console.log('Erreur lors du chargement des options:', err);
  }
}, []);

  // Fonction pour extraire les entreprises uniques
  const extractUniqueCompanies = (ticketData: Ticket[]) => {
    const companies = ticketData
      .map(ticket => ticket.company_name)
      .filter(Boolean)
      .filter((company, index, array) => array.indexOf(company) === index)
      .sort();
    
    setAvailableCompanies(companies as any);
  };

// ✅ FONCTION MODIFIÉE - ne plus initialiser les filtres
const extractUniquePriorities = (ticketData: Ticket[]) => {
  const priorities = ticketData
    .map(ticket => ticket.priority)
    .filter(Boolean)
    .filter((priority, index, array) => array.indexOf(priority) === index)
    .sort();
  
  setAvailablePriorities(priorities);
  
  // ✅ NOUVEAU : Initialiser SEULEMENT si aucun filtre n'est défini
  if (priorityFilters.length === 0) {
    setPriorityFilters(priorities);
  }
  
  console.log('✅ Priorités extraites:', priorities);
};

// ✅ FONCTIONS SIMPLIFIÉES
const togglePriority = (priority: string) => {
  setPriorityFilters(prev => 
    prev.includes(priority)
      ? prev.filter(p => p !== priority)
      : [...prev, priority]
  );
};

const toggleAllPriorities = () => {
  const isAllSelected = priorityFilters.length === availablePriorities.length;
  
  if (isAllSelected) {
    setPriorityFilters([]); // Tout décocher
  } else {
    setPriorityFilters([...availablePriorities]); // Tout cocher
  }
};


  // Fonction pour récupérer les tickets avec filtres
  const fetchTickets = useCallback(async (pageNumber = 1, reset = true) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Token manquant');

      // Construction de l'URL avec les paramètres
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      });

      if (searchText.trim()) params.append('search', searchText.trim());
      // Filtrage automatique par entreprise pour les users
      if (!user?.admin && user?.company) {
        params.append('company', user.company);
      } else if (user?.admin && companyFilter.trim()) {
        params.append('company', companyFilter.trim());
      }

      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(
        `https://ticketing.development.atelier.ovh/api/mobile/tickets?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      const data = await response.json();

      let newTickets = data.tickets || data || [];
      // ✅ NOUVEAU : Filtrage côté client par priorité
    if (priorityFilters.length > 0 && priorityFilters.length < availablePriorities.length) {
      newTickets = newTickets.filter((ticket: Ticket) => priorityFilters.includes(ticket.priority));
      console.log('🔍 Filtrage client:', newTickets.length, 'tickets après filtrage priorité');
    } 
    if (reset) {
        setTickets(newTickets);
      } else {
        setTickets(prev => [...prev, ...newTickets]);
      }

      setHasMore(newTickets.length === 10);
      setPage(pageNumber);
    } catch (err: any) {
      setError(err.message);
    }
  }, [searchText, companyFilter, priorityFilters, statusFilter, sortBy, sortOrder, user]); // ✅ Ajouté priorityFilters

  // Recharger quand les filtres changent
  const applyFilters = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTickets(1, true).finally(() => setLoading(false));
  }, [fetchTickets]);

  // Charger les données au focus
 // Charger les données au focus
useFocusEffect(
  useCallback(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      // ✅ NOUVEAU : Charger les options d'abord (si pas déjà fait)
      if (availablePriorities.length === 0) {
        await loadAllAvailableData();
      }
      
      // Puis charger les tickets
      await fetchTickets(1, true);
      setLoading(false);
    };
    
    loadData();
  }, [fetchTickets, loadAllAvailableData, availablePriorities.length])
);


  // Charger plus de tickets (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTickets(page + 1, false);
    }
  }, [loading, hasMore, page, fetchTickets]);

  // Fonctions pour changer le tri
  const handleSortChange = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortOrder('DESC');
    }
  };

// Reset des filtres
const resetFilters = () => {
  setSearchText('');
  setCompanyFilter('');
  setStatusFilter('');
  setPriorityFilters([...availablePriorities]); // Reset avec toutes les priorités
  setSortBy('created');
  setSortOrder('DESC');
};

  // Fonctions pour obtenir les couleurs
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#E74A34';
      case 'medium': return '#ffc107';
      case 'low': return '#00988f';
      case 'urgent': return '#E74A34';
      default: return '#80791eff';
    }
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'opened':      return '#00988f';
      case 'in progress': return '#0062FF';
      case 'closed':      return '#6c757d';
      default:            return '#ffc107';
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0062ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erreur : {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={applyFilters}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Modal pour le dropdown des entreprises */}
      <Modal
        visible={showCompanyDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompanyDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCompanyDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Choisir une entreprise</Text>
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setCompanyFilter('');
                setShowCompanyDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, companyFilter === '' && styles.selectedDropdownText]}>
                Toutes les entreprises
              </Text>
            </TouchableOpacity>

            <ScrollView style={styles.dropdownScroll}>
              {availableCompanies.map((company) => (
                <TouchableOpacity
                  key={company}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCompanyFilter(company);
                    setShowCompanyDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    companyFilter === company && styles.selectedDropdownText
                  ]}>
                    {company}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCompanyDropdown(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ✅ MODAL AVEC CALCUL DYNAMIQUE */}
      <Modal
        visible={showPriorityDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriorityDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPriorityDropdown(false)}
        >
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>Choisir les priorités</Text>
          <ScrollView style={styles.dropdownScroll}>
            {/* ✅ CASE "Tout sélectionné" avec calcul dynamique */}
            <TouchableOpacity
              style={[styles.checkboxItem, styles.selectAllItem]}
              onPress={toggleAllPriorities}
            >
              <View style={styles.checkboxRow}>
                <View style={[
                  styles.checkbox,
                  (priorityFilters.length === availablePriorities.length) && styles.checkedCheckbox
                ]}>
                  {(priorityFilters.length === availablePriorities.length) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.dropdownText,
                  styles.selectAllText,
                  (priorityFilters.length === availablePriorities.length) && styles.selectedDropdownText
                ]}>
                  Tout sélectionné
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.separator} />
        {availablePriorities.map((priority) => (
          <TouchableOpacity
            key={priority}
            style={styles.checkboxItem}
            onPress={() => togglePriority(priority)}
          >
            <View style={styles.checkboxRow}>
              <View style={[
                styles.checkbox,
                priorityFilters.includes(priority) && styles.checkedCheckbox
              ]}>
                {priorityFilters.includes(priority) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={[
                styles.dropdownText,
                priorityFilters.includes(priority) && styles.selectedDropdownText
              ]}>
                {priority}
              </Text>
              <View style={[
                styles.priorityColorBadge,
                { backgroundColor: getPriorityColor(priority) }
              ]} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.modalButtons}>
        
        
        <TouchableOpacity
  style={styles.closeButton}
  onPress={() => {
    setShowPriorityDropdown(false);
    applyFilters(); // ✅ Réappliquer les filtres après changement
  }}
>
  <Text style={styles.closeButtonText}>Fermer</Text>
</TouchableOpacity>

      </View>
    </View>
  </TouchableOpacity>
      </Modal>

      <FlatList
        data={tickets}
        keyExtractor={item => item.id}
        ListHeaderComponent={() => (
          <View>
            {/* Header */}
            <View style={styles.header}>
                        <Text style={styles.title}>LaPlateforme - Ticketing</Text>
                        <Text style={styles.subTitle}>Liste des Tickets</Text>
                      </View>
            {/* Filtres de recherche */}
            <View style={styles.filtersContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher par titre..."
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={applyFilters}
              />
              
              {/* Dropdown pour les entreprises - ADMINS UNIQUEMENT */}
              {user?.admin && (
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowCompanyDropdown(true)}
                >
                  <Text style={[styles.dropdownButtonText, !companyFilter && styles.placeholderText]}>
                    {companyFilter || 'Choisir une entreprise...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              )}

              {/* Dropdown pour les priorités - ADMINS UNIQUEMENT */}
              {user?.admin && (
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowPriorityDropdown(true)}
                >
                  <Text style={[styles.dropdownButtonText, priorityFilters.length === 0 && styles.placeholderText]}>
                    {priorityFilters.length === 0
                      ? 'Choisir les priorités...'
                      : `${priorityFilters.length} priorité(s) sélectionnée(s)`
                    }
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              )}
              {/* Filtrage par statut */}
              <View style={styles.statusFilterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['', 'opened', 'closed'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusFilterButton,
                        statusFilter === status && styles.activeFilterButton
                      ]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        statusFilter === status && styles.activeFilterText
                      ]}>
                        {status === '' ? 'Tous' : status === 'opened' ? 'Ouverts' : 'Fermés'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.actionButtons}>
                
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Boutons de tri */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Trier par:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { key: 'created', label: 'Date' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.sortButton,
                      sortBy === key && styles.activeSortButton
                    ]}
                    onPress={() => handleSortChange(key as SortOption)}
                  >
                    <Text style={[
                      styles.sortButtonText,
                      sortBy === key && styles.activeSortText
                    ]}>
                      {label} {sortBy === key ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        // {/* Affichage des tickets */}
        renderItem={({ item }) => (
            <TicketItem
                ticket={item}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
            />
            )}
        contentContainerStyle={styles.container}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => 
          loading && tickets.length > 0 ? (
            <ActivityIndicator style={styles.loadingMore} color="#007AFF" />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  container: { padding: 16 },
  header: { 
    alignItems: 'center', 
    marginBottom: 10, 
    marginHorizontal: -16, 
    marginTop: -16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#302c2cff',
    backgroundColor: '#0062ff'
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subTitle: { fontSize: 18, color: '#ffffff', marginTop: 4 },
  retryButton: {
    backgroundColor: '#0062ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Styles pour les filtres
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },

  // Styles pour les dropdowns
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 500,
    width: '85%',
    elevation: 5,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDropdownText: {
    color: '#0062ff',
    fontWeight: '600',
  },

  // ✅ NOUVEAUX STYLES POUR LES CHECKBOX
  checkboxItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#0062ff',
    borderColor: '#0062ff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priorityColorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#0062ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Boutons d'actions
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Styles pour le tri
  sortContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: '#0062ff',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeSortText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Styles pour les tickets
  ticketCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  ticketBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  ticketMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingMore: {
    marginVertical: 20,
  },
  selectAllItem: {
  backgroundColor: '#f8f9fa',
  borderBottomWidth: 2,
  borderBottomColor: '#dee2e6',
},
selectAllText: {
  fontWeight: '600',
  fontSize: 16,
},
separator: {
  height: 1,
  backgroundColor: '#dee2e6',
  marginVertical: 4,
},
 // Conteneur du filtre de statut
  statusFilterContainer: {
    marginBottom: 12,
  },
  // Bouton de filtre de statut
  statusFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  // Bouton actif de filtre de statut
  activeFilterButton: {
    backgroundColor: '#0062ff',
  },
  // Texte des boutons de filtre
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  // Texte des boutons de filtre actifs
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
});
