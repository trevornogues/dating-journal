import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { FirestoreService } from '../services/firestoreService';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [upcomingDates, setUpcomingDates] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notesCount, setNotesCount] = useState({});

  const loadData = async () => {
    if (!user) return;

    try {
      const [prospectsResult, datesResult] = await Promise.all([
        FirestoreService.getProspects(user.id),
        FirestoreService.getDates(user.id),
      ]);

      // Prospects
      const loadedProspects = prospectsResult.success ? prospectsResult.data : [];
      const activeProspects = loadedProspects.filter(p => !p.inGraveyard);
      setProspects(activeProspects);

      // Notes count per prospect (simple approach)
      const notesCounts = {};
      for (const p of activeProspects) {
        const notesRes = await FirestoreService.getNotesForProspect(user.id, p.id);
        notesCounts[p.id] = notesRes.success ? notesRes.data.length : 0;
      }
      setNotesCount(notesCounts);

      // Upcoming dates
      const loadedDates = datesResult.success ? datesResult.data : [];
      const now = new Date();
      const upcoming = loadedDates
        .filter(date => new Date(date.dateTime || date.date) > now)
        .sort((a, b) => new Date(a.dateTime || a.date) - new Date(b.dateTime || b.date))
        .slice(0, 5);
      setUpcomingDates(upcoming);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name || 'there'}!</Text>
        <Text style={styles.subtitle}>Here's your dating overview</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfile')}
          style={styles.profileButton}
        >
          <Ionicons name="person" size={16} color="#FF6B6B" />
          <Text style={styles.profileButtonText}>My Dating Goals</Text>
        </TouchableOpacity>
      </View>

      {/* LoveAI Card */}
      <TouchableOpacity
        style={styles.loveAICard}
        onPress={() => navigation.navigate('LoveAI')}
      >
        <View style={styles.loveAIIcon}>
          <Ionicons name="heart" size={30} color="white" />
        </View>
        <View style={styles.loveAIContent}>
          <Text style={styles.loveAITitle}>Need Dating Advice?</Text>
          <Text style={styles.loveAISubtitle}>
            Chat with LoveAI - your personal dating advisor who knows your prospects
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#FF6B6B" />
      </TouchableOpacity>

      {/* Current Prospects Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Prospects</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddProspect')}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {prospects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active prospects yet</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddProspect')}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonText}>Add Your First Prospect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {prospects.map((prospect) => (
              <TouchableOpacity
                key={prospect.id}
                style={styles.prospectCard}
                onPress={() => navigation.navigate('ProspectDetail', { prospect })}
              >
                <View style={styles.prospectAvatar}>
                  <Text style={styles.prospectInitial}>
                    {prospect.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.prospectName} numberOfLines={1}>
                  {prospect.name}
                </Text>
                <Text style={styles.prospectInfo} numberOfLines={1}>
                  {prospect.age ? `${prospect.age} years` : 'Age not set'}
                </Text>
                {notesCount[prospect.id] > 0 && (
                  <View style={styles.notesIndicator}>
                    <Ionicons name="document-text" size={12} color="#FF6B6B" />
                    <Text style={styles.notesIndicatorText}>
                      {notesCount[prospect.id]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Upcoming Dates Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Dates</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Calendar')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {upcomingDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming dates scheduled</Text>
          </View>
        ) : (
          upcomingDates.map((date) => (
            <TouchableOpacity
              key={date.id}
              style={styles.dateCard}
              onPress={() => navigation.navigate('Calendar')}
            >
              <View style={styles.dateInfo}>
                <Text style={styles.datePerson}>{date.prospectName}</Text>
                <Text style={styles.dateTime}>{formatDate(date.dateTime)}</Text>
                {date.location && (
                  <Text style={styles.dateLocation}>{date.location}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{prospects.length}</Text>
          <Text style={styles.statLabel}>Active Prospects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingDates.length}</Text>
          <Text style={styles.statLabel}>Upcoming Dates</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    backgroundColor: '#FF6B6B',
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  profileButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileButtonText: {
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 6,
  },
  loveAICard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  loveAIIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  loveAIContent: {
    flex: 1,
  },
  loveAITitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  loveAISubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  viewAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewAllText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 15,
  },
  ctaButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  ctaButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  prospectCard: {
    backgroundColor: 'white',
    padding: 20,
    marginLeft: 20,
    marginRight: 10,
    borderRadius: 15,
    alignItems: 'center',
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prospectAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  prospectInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  prospectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  prospectInfo: {
    fontSize: 14,
    color: '#666',
  },
  notesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notesIndicatorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '600',
  },
  dateCard: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateInfo: {
    flex: 1,
  },
  datePerson: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
  },
  dateLocation: {
    fontSize: 14,
    color: '#999',
    marginTop: 3,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 30,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
}); 