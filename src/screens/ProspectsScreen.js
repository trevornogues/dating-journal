import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { FirestoreService } from '../services/firestoreService';
import { useAuth } from '../utils/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function ProspectsScreen({ navigation }) {
  const { user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'graveyard'
  const [refreshing, setRefreshing] = useState(false);

  const loadProspects = async () => {
    if (!user) return;
    
    try {
      const result = await FirestoreService.getProspects(user.id);
      if (result.success) {
        setProspects(result.data);
      }
    } catch (error) {
      console.error('Error loading prospects:', error);
    }
  };

  // Set up real-time listener for prospects
  useEffect(() => {
    if (!user) return;

    const unsubscribe = FirestoreService.subscribeToProspects(user.id, (prospectsData) => {
      setProspects(prospectsData);
    });

    return () => unsubscribe();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProspects();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProspects();
    setRefreshing(false);
  };

  const getFilteredProspects = () => {
    if (activeTab === 'active') {
      return prospects.filter(p => !p.inGraveyard);
    } else {
      return prospects.filter(p => p.inGraveyard);
    }
  };

  const renderProspect = ({ item }) => (
    <TouchableOpacity
      style={styles.prospectCard}
      onPress={() => navigation.navigate('ProspectDetail', { prospect: item })}
    >
      <View style={styles.prospectAvatar}>
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.prospectPhoto} />
        ) : (
          <Text style={styles.prospectInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.prospectInfo}>
        <Text style={styles.prospectName}>{item.name}</Text>
        <Text style={styles.prospectDetails}>
          {item.age ? `${item.age} years` : 'Age not set'} • {item.occupation || 'No occupation'}
        </Text>
        {item.whereWeMet && (
          <Text style={styles.prospectMeta}>Met at: {item.whereWeMet}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const filteredProspects = getFilteredProspects();

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'active' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}
          >
            💕 Active ({prospects.filter(p => !p.inGraveyard).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'graveyard' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('graveyard')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'graveyard' && styles.activeTabText,
            ]}
          >
            🪦 Graveyard ({prospects.filter(p => p.inGraveyard).length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredProspects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {activeTab === 'active'
              ? 'No active prospects yet'
              : '🪦 No prospects in graveyard'}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProspect')}
            >
              <Text style={styles.addButtonText}>Add Your First Prospect</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProspects}
          renderItem={renderProspect}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {activeTab === 'active' && filteredProspects.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate('AddProspect')}
        >
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  listContent: {
    paddingVertical: 10,
  },
  prospectCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  prospectAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  prospectInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  prospectPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  prospectInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  prospectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  prospectDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  prospectMeta: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 30,
    color: 'white',
    fontWeight: '300',
  },
}); 