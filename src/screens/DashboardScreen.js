import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { FirestoreService } from '../services/firestoreService';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingPopup from '../components/OnboardingPopup';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [upcomingDates, setUpcomingDates] = useState([]);
  const [recentDates, setRecentDates] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notesCount, setNotesCount] = useState({});
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
  
  // Quick-add date modal states
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddProspectName, setQuickAddProspectName] = useState('');
  const [quickAddLocation, setQuickAddLocation] = useState('');
  const [quickAddPreDateNotes, setQuickAddPreDateNotes] = useState('');
  const [quickAddDateTime, setQuickAddDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [quickAddStep, setQuickAddStep] = useState('prospect_choice'); // 'prospect_choice', 'existing_prospect', 'new_prospect', 'date_details'
  const [selectedProspectForQuickAdd, setSelectedProspectForQuickAdd] = useState(null);
  const [newProspectAge, setNewProspectAge] = useState('');
  const [newProspectOccupation, setNewProspectOccupation] = useState('');

  const loadData = async () => {
    if (!user) return;

    try {
      const [prospectsResult, datesResult, profileResult] = await Promise.all([
        FirestoreService.getProspects(user.id),
        FirestoreService.getDates(user.id),
        FirestoreService.getUserProfile(user.id),
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
        .slice(0, 3);
      setUpcomingDates(upcoming);

      // Recent dates
      const recent = loadedDates
        .filter(date => new Date(date.dateTime || date.date) <= now)
        .sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date))
        .slice(0, 3);
      setRecentDates(recent);

      // Check if user is new (no profile data and no prospects)
      const hasProfileData = profileResult.success && profileResult.data && 
        (profileResult.data.values?.length > 0 || 
         profileResult.data.lookingFor?.length > 0 || 
         profileResult.data.boundaries?.length > 0 || 
         profileResult.data.dealBreakers?.length > 0);
      
      const isNewUser = !hasProfileData && activeProspects.length === 0;
      
      if (isNewUser) {
        setShowOnboardingPopup(true);
      }
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

  const handleNavigateToGoals = () => {
    setShowOnboardingPopup(false);
    navigation.navigate('UserProfile');
  };

  const handleDismissOnboarding = () => {
    setShowOnboardingPopup(false);
  };

  const openQuickAddModal = () => {
    setQuickAddProspectName('');
    setQuickAddLocation('');
    setQuickAddPreDateNotes('');
    setQuickAddDateTime(new Date());
    setQuickAddStep('prospect_choice');
    setSelectedProspectForQuickAdd(null);
    setNewProspectAge('');
    setNewProspectOccupation('');
    setShowQuickAddModal(true);
  };

  const closeQuickAddModal = () => {
    setShowQuickAddModal(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setQuickAddStep('prospect_choice');
    setSelectedProspectForQuickAdd(null);
  };

  const handleSaveNewProspectForQuickAdd = async () => {
    if (!quickAddProspectName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to save a prospect');
      return;
    }

    const newProspect = {
      name: quickAddProspectName.trim(),
      age: newProspectAge.trim() ? parseInt(newProspectAge) : null,
      occupation: newProspectOccupation.trim(),
      interests: '',
      notes: '',
      whereWeMet: '',
      inGraveyard: false,
    };

    try {
      const result = await FirestoreService.saveProspect(user.id, newProspect);
      if (result.success) {
        // Set the newly created prospect as selected
        setSelectedProspectForQuickAdd(result.data);
        // Clear the form fields
        setNewProspectAge('');
        setNewProspectOccupation('');
        // Move to date details step
        setQuickAddStep('date_details');
        // Reload prospects list
        await loadData();
      } else {
        if (result.error === 'NAME_EXISTS') {
          Alert.alert(
            'Name Already Exists',
            `You already have a prospect named "${quickAddProspectName.trim()}". Please choose a different name.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to save prospect');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save prospect');
    }
  };

  const saveQuickDate = async () => {
    if (!quickAddProspectName.trim()) {
      Alert.alert('Error', 'Please select a prospect');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to save a date');
      return;
    }

    const dateObj = {
      prospectName: quickAddProspectName.trim(),
      location: quickAddLocation.trim(),
      preDateNotes: quickAddPreDateNotes.trim(),
      postDateNotes: '',
      dateTime: quickAddDateTime.toISOString(),
    };

    try {
      const result = await FirestoreService.saveDate(user.id, dateObj);
      
      if (result.success) {
        Alert.alert('Success', 'Date added successfully!');
        closeQuickAddModal();
        loadData(); // Reload data to show the new date
      } else {
        Alert.alert('Error', result.error || 'Failed to save date');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save date');
    }
  };

  const renderQuickAddContent = () => {
    switch (quickAddStep) {
      case 'prospect_choice':
        return renderQuickAddProspectChoiceStep();
      case 'existing_prospect':
        return renderQuickAddExistingProspectStep();
      case 'new_prospect':
        return renderQuickAddNewProspectStep();
      case 'date_details':
        return renderQuickAddDateDetailsStep();
      default:
        return renderQuickAddProspectChoiceStep();
    }
  };

  const renderQuickAddProspectChoiceStep = () => (
    <>
      <Text style={styles.modalTitle}>Quick Add Date</Text>
      <Text style={styles.stepDescription}>
        Who are you going on a date with?
      </Text>
      
      <View style={styles.choiceButtons}>
        <TouchableOpacity
          style={[styles.choiceButton, styles.existingProspectButton]}
          onPress={() => setQuickAddStep('existing_prospect')}
        >
          <Text style={styles.choiceButtonText}>Existing Prospect</Text>
          <Text style={styles.choiceButtonSubtext}>Choose from your list</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.choiceButton, styles.newProspectButton]}
          onPress={() => setQuickAddStep('new_prospect')}
        >
          <Text style={styles.choiceButtonText}>New Prospect</Text>
          <Text style={styles.choiceButtonSubtext}>Add someone new</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.cancelButton, styles.singleButton]}
        onPress={closeQuickAddModal}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </>
  );

  const renderQuickAddExistingProspectStep = () => (
    <>
      <Text style={styles.modalTitle}>Select Prospect</Text>
      <Text style={styles.stepDescription}>
        Choose from your existing prospects
      </Text>
      
      <ScrollView style={styles.prospectListContainer}>
        {prospects.map((prospect) => (
          <TouchableOpacity
            key={prospect.id}
            style={styles.prospectListItem}
            onPress={() => {
              setSelectedProspectForQuickAdd(prospect);
              setQuickAddProspectName(prospect.name);
              setQuickAddStep('date_details');
            }}
          >
            <View style={styles.prospectListItemHeader}>
              <View style={styles.prospectListItemAvatar}>
                {prospect.photoUri ? (
                  <Image source={{ uri: prospect.photoUri }} style={styles.prospectListItemPhoto} />
                ) : (
                  <Text style={styles.prospectListItemInitial}>
                    {prospect.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.prospectListItemInfo}>
                <Text style={styles.prospectListItemName}>{prospect.name}</Text>
                <Text style={styles.prospectListItemDetails}>
                  {prospect.age ? `${prospect.age} years` : 'Age not set'} • {prospect.occupation || 'No occupation'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.backButton]}
          onPress={() => setQuickAddStep('prospect_choice')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={closeQuickAddModal}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderQuickAddNewProspectStep = () => (
    <>
      <Text style={styles.modalTitle}>Add New Prospect</Text>
      <Text style={styles.stepDescription}>
        Tell us about this new person
      </Text>
      
      <ScrollView style={styles.newProspectForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            value={quickAddProspectName}
            onChangeText={setQuickAddProspectName}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter age"
            value={newProspectAge}
            onChangeText={setNewProspectAge}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Occupation</Text>
          <TextInput
            style={styles.input}
            placeholder="What do they do?"
            value={newProspectOccupation}
            onChangeText={setNewProspectOccupation}
          />
        </View>
      </ScrollView>
      
      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.backButton]}
          onPress={() => setQuickAddStep('prospect_choice')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={handleSaveNewProspectForQuickAdd}
        >
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderQuickAddDateDetailsStep = () => (
    <>
      <Text style={styles.dateWithHeader}>
        Date with {selectedProspectForQuickAdd?.name || quickAddProspectName}
      </Text>
      <Text style={styles.stepDescription}>
        Fill in the details for your date
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date & Time</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>
              {quickAddDateTime.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>
              {quickAddDateTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={quickAddDateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              setShowDatePicker(Platform.OS !== 'ios');
              if (selected) {
                const newDateTime = new Date(quickAddDateTime);
                newDateTime.setFullYear(selected.getFullYear());
                newDateTime.setMonth(selected.getMonth());
                newDateTime.setDate(selected.getDate());
                setQuickAddDateTime(newDateTime);
              }
            }}
            style={styles.timePicker}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.timePickerDoneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.timePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showTimePicker && (
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={quickAddDateTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              setShowTimePicker(Platform.OS !== 'ios');
              if (selected) {
                const newDateTime = new Date(quickAddDateTime);
                newDateTime.setHours(selected.getHours());
                newDateTime.setMinutes(selected.getMinutes());
                setQuickAddDateTime(newDateTime);
              }
            }}
            style={styles.timePicker}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.timePickerDoneButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.timePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Where are you going?"
          value={quickAddLocation}
          onChangeText={setQuickAddLocation}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pre-Date Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How are you feeling? What are your goals for this date? Any nervousness or excitement you want to remember? What are your intentions with this person?"
          value={quickAddPreDateNotes}
          onChangeText={setQuickAddPreDateNotes}
          multiline
          numberOfLines={3}
        />
      </View>
      
      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.backButton]}
          onPress={() => setQuickAddStep('existing_prospect')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={saveQuickDate}
        >
          <Text style={styles.saveButtonText}>Add Date</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}!</Text>
            <Text style={styles.subtitle}>Here's your dating overview</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings" size={20} color="white" />
          </TouchableOpacity>
        </View>
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
            style={styles.addButtonText}
          >
            <Text style={styles.addButtonTextLabel}>Add Prospect</Text>
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
                  {prospect.photoUri ? (
                    <Image source={{ uri: prospect.photoUri }} style={styles.prospectPhoto} />
                  ) : (
                    <Text style={styles.prospectInitial}>
                      {prospect.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.prospectName} numberOfLines={1}>
                  {prospect.name}
                </Text>
                <Text style={styles.prospectInfo} numberOfLines={1}>
                  {prospect.age ? `${prospect.age} years` : ''}
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
            onPress={openQuickAddModal}
            style={styles.addButtonText}
          >
            <Text style={styles.addButtonTextLabel}>Add Date</Text>
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
                {date.preDateNotes && (
                  <Text style={styles.dateNotes} numberOfLines={2}>
                    <Text style={styles.notesLabel}>Pre-date: </Text>{date.preDateNotes}
                  </Text>
                )}
                {!date.preDateNotes && (
                  <TouchableOpacity
                    style={styles.reflectionButton}
                    onPress={() => navigation.navigate('Calendar')}
                  >
                    <Text style={styles.reflectionButtonText}>Add Pre-Date Notes</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        
        {upcomingDates.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Calendar')}
            style={styles.viewAllButtonBottom}
          >
            <Text style={styles.viewAllText}>View All Dates</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Dates Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Dates</Text>
        </View>

        {recentDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent dates</Text>
          </View>
        ) : (
          recentDates.map((date) => (
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
                {date.postDateNotes && (
                  <Text style={styles.dateNotes} numberOfLines={2}>
                    <Text style={styles.notesLabel}>Post-date: </Text>{date.postDateNotes}
                  </Text>
                )}
                {!date.postDateNotes && (
                  <TouchableOpacity
                    style={styles.reflectionButton}
                    onPress={() => navigation.navigate('Calendar')}
                  >
                    <Text style={styles.reflectionButtonText}>Add Reflection</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        
        {recentDates.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Calendar')}
            style={styles.viewAllButtonBottom}
          >
            <Text style={styles.viewAllText}>View All Dates</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Prospects')}
        >
          <Text style={styles.statNumber}>{prospects.length}</Text>
          <Text style={styles.statLabel}>Active Prospects</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Calendar')}
        >
          <Text style={styles.statNumber}>{upcomingDates.length}</Text>
          <Text style={styles.statLabel}>Upcoming Dates</Text>
        </TouchableOpacity>
      </View>

      {/* Onboarding Popup */}
      <OnboardingPopup
        visible={showOnboardingPopup}
        onNavigateToGoals={handleNavigateToGoals}
        onDismiss={handleDismissOnboarding}
      />

      {/* Quick Add Date Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQuickAddModal}
        onRequestClose={closeQuickAddModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {renderQuickAddContent()}
          </View>
        </View>
      </Modal>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
  prospectPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  dateNotes: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
    fontStyle: 'italic',
  },
  notesLabel: {
    fontWeight: '600',
    color: '#FF6B6B',
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
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
  reflectionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  reflectionButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonText: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addButtonTextLabel: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    marginHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 25,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#2C3E50',
  },
  textArea: {
    paddingTop: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  choiceButtons: {
    marginBottom: 30,
  },
  choiceButton: {
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  existingProspectButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  newProspectButton: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  choiceButtonText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2C3E50',
  },
  choiceButtonSubtext: {
    fontSize: 15,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  prospectListContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  prospectListItem: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E8F4FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  prospectListItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  prospectListItemDetails: {
    fontSize: 15,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  prospectListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prospectListItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  prospectListItemPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  prospectListItemInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  prospectListItemInfo: {
    flex: 1,
  },
  newProspectForm: {
    maxHeight: 300,
    marginBottom: 20,
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#F8F9FA',
    flex: 0.48,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  backButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontWeight: '700',
  },
  dateWithHeader: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 38,
  },
  timePickerContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  timePicker: {
    alignSelf: 'center',
  },
  timePickerDoneButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  timePickerDoneText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 