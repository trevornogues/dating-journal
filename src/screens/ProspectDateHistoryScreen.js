import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProspectDateHistoryScreen({ route, navigation }) {
  const { prospect, dates } = route.params;
  const [prospectDates, setProspectDates] = useState(dates || []);

  useEffect(() => {
    // Sort dates by most recent first
    const sortedDates = [...prospectDates].sort((a, b) => {
      const dateA = new Date(a.dateTime || a.date);
      const dateB = new Date(b.dateTime || b.date);
      return dateB - dateA;
    });
    setProspectDates(sortedDates);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isUpcoming = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
  };

  const renderDateCard = (date, index) => {
    const isUpcomingDate = isUpcoming(date.dateTime || date.date);
    
    return (
      <View key={date.id} style={styles.dateCard}>
        <View style={styles.dateCardHeader}>
          <View style={styles.dateCardLeft}>
            <View style={[styles.dateNumber, isUpcomingDate ? styles.upcomingDateNumber : styles.pastDateNumber]}>
              <Text style={[styles.dateNumberText, isUpcomingDate ? styles.upcomingDateNumberText : styles.pastDateNumberText]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateTitle}>
                {isUpcomingDate ? 'Upcoming Date' : 'Past Date'}
              </Text>
              <Text style={styles.dateDateTime}>
                {formatDate(date.dateTime || date.date)} at {formatTime(date.dateTime || date.date)}
              </Text>
              {date.location && (
                <Text style={styles.dateLocation}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  {' '}{date.location}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.dateStatus, isUpcomingDate ? styles.upcomingStatus : styles.pastStatus]}>
            <Ionicons 
              name={isUpcomingDate ? "time-outline" : "checkmark-circle"} 
              size={16} 
              color={isUpcomingDate ? "#FF6B6B" : "#28a745"} 
            />
            <Text style={[styles.dateStatusText, isUpcomingDate ? styles.upcomingStatusText : styles.pastStatusText]}>
              {isUpcomingDate ? 'Upcoming' : 'Completed'}
            </Text>
          </View>
        </View>

        {/* Pre-Date Notes */}
        {date.preDateNotes && (
          <View style={styles.notesSection}>
            <View style={styles.notesHeader}>
              <Ionicons name="create-outline" size={16} color="#FF6B6B" />
              <Text style={styles.notesTitle}>Pre-Date Thoughts</Text>
            </View>
            <Text style={styles.notesContent}>{date.preDateNotes}</Text>
          </View>
        )}

        {/* Post-Date Notes */}
        {date.postDateNotes && (
          <View style={styles.notesSection}>
            <View style={styles.notesHeader}>
              <Ionicons name="heart-outline" size={16} color="#28a745" />
              <Text style={styles.notesTitle}>Post-Date Reflection</Text>
            </View>
            <Text style={styles.notesContent}>{date.postDateNotes}</Text>
          </View>
        )}

        {/* Empty state for notes */}
        {!date.preDateNotes && !date.postDateNotes && (
          <View style={styles.emptyNotes}>
            <Ionicons name="document-outline" size={20} color="#ccc" />
            <Text style={styles.emptyNotesText}>No notes recorded</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FF6B6B" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Date History</Text>
          <Text style={styles.headerSubtitle}>
            {prospect.name} • {prospectDates.length} {prospectDates.length === 1 ? 'date' : 'dates'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {prospectDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Dates Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start planning your first date with {prospect.name}
            </Text>
          </View>
        ) : (
          <View style={styles.datesList}>
            {prospectDates.map((date, index) => renderDateCard(date, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  datesList: {
    gap: 16,
  },
  dateCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  dateNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  upcomingDateNumber: {
    backgroundColor: '#FF6B6B',
  },
  pastDateNumber: {
    backgroundColor: '#28a745',
  },
  dateNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  upcomingDateNumberText: {
    color: 'white',
  },
  pastDateNumberText: {
    color: 'white',
  },
  dateInfo: {
    flex: 1,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dateDateTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateLocation: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingStatus: {
    backgroundColor: '#fff5f5',
  },
  pastStatus: {
    backgroundColor: '#f0f9f0',
  },
  dateStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  upcomingStatusText: {
    color: '#FF6B6B',
  },
  pastStatusText: {
    color: '#28a745',
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  notesContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyNotesText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 6,
  },
});
