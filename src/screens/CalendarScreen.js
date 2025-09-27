import AddProspectScreen from '../screens/AddProspectScreen';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
// import RNPickerSelect from 'react-native-picker-select';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FirestoreService } from '../services/firestoreService';
import { useAuth } from '../utils/AuthContext';
import { useFocusEffect } from '@react-navigation/native';


export default function CalendarScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [dates, setDates] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  
  // Form states
  const [prospectName, setProspectName] = useState('');
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [location, setLocation] = useState('');
  const [preDateNotes, setPreDateNotes] = useState('');
  const [postDateNotes, setPostDateNotes] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProspectPicker, setShowProspectPicker] = useState(false);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [addDateStep, setAddDateStep] = useState('prospect_choice'); // 'prospect_choice', 'existing_prospect', 'new_prospect', 'date_details'
  const [selectedProspectForDate, setSelectedProspectForDate] = useState(null);
  const [newProspectAge, setNewProspectAge] = useState('');
  const [newProspectOccupation, setNewProspectOccupation] = useState('');

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [datesResult, prospectsResult] = await Promise.all([
        FirestoreService.getDates(user.id),
        FirestoreService.getProspects(user.id),
      ]);
      
      if (datesResult.success) {
        setDates(datesResult.data);
      }
      
       if (prospectsResult.success) {
         setProspects(prospectsResult.data.filter(p => !p.inGraveyard));
       }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getMarkedDates = () => {
    const marked = {};
    dates.forEach(date => {
      // Handle both dateTime and date fields
      const dateField = date.dateTime || date.date;
      if (dateField) {
        // Use the same date processing logic as getDatesForSelectedDay
        const dateObj = new Date(dateField);
        const dateStr = dateObj.getFullYear() + '-' + 
                       String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(dateObj.getDate()).padStart(2, '0');
        
        marked[dateStr] = {
          marked: true,
          dotColor: '#FF6B6B',
          selectedColor: '#FF6B6B',
        };
      }
    });
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#FF6B6B',
      };
    }
    return marked;
  };

  const openAddDateModal = (date) => {
    setSelectedDate(date);
    setEditingDate(null);
    setProspectName('');
    setSelectedProspect(null);
    setSelectedProspectForDate(null);
    setLocation('');
    setPreDateNotes('');
    setPostDateNotes('');
    setDateTime(new Date(date + 'T19:00:00'));
    setShowDatePicker(false);
    setShowTimePicker(false);
    setAddDateStep('prospect_choice');
    setModalVisible(true);
  };

  const openEditDateModal = (dateItem) => {
    setEditingDate(dateItem);
    setProspectName(dateItem.prospectName);
    setSelectedProspect(dateItem.prospectName);
    setLocation(dateItem.location || '');
    setPreDateNotes(dateItem.preDateNotes || '');
    setPostDateNotes(dateItem.postDateNotes || '');
    setDateTime(new Date(dateItem.dateTime));
    setShowDatePicker(false);
    setShowTimePicker(false);
    setModalVisible(true);
  };

  const saveDate = async () => {
    if (!prospectName.trim()) {
      Alert.alert('Error', 'Please select a prospect');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to save a date');
      return;
    }

    const dateObj = {
      prospectName: prospectName.trim(),
      location: location.trim(),
      preDateNotes: preDateNotes.trim(),
      postDateNotes: postDateNotes.trim(),
      dateTime: dateTime.toISOString(),
    };

    try {
      let result;
      if (editingDate) {
        result = await FirestoreService.updateDate(user.id, editingDate.id, dateObj);
      } else {
        result = await FirestoreService.saveDate(user.id, dateObj);
      }
      
      if (result.success) {
        setModalVisible(false);
        setShowDatePicker(false);
        setShowTimePicker(false);
        loadData(); // Reload data to get updated list
      } else {
        Alert.alert('Error', result.error || 'Failed to save date');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save date');
    }
  };

  const deleteDate = (dateId) => {
    if (!user) return;
    
    Alert.alert(
      'Delete Date',
      'Are you sure you want to delete this date?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirestoreService.deleteDate(user.id, dateId);
              if (result.success) {
                loadData(); // Reload data to get updated list
              } else {
                Alert.alert('Error', result.error || 'Failed to delete date');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete date');
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDatesForSelectedDay = () => {
    if (!selectedDate) return [];
    
    // Filter dates for the selected day and sort chronologically by time
    const dayDates = dates.filter(date => {
      // Handle both dateTime and date fields
      const dateField = date.dateTime || date.date;
      if (!dateField) return false;
      
      // Create date objects in local timezone to avoid timezone conversion issues
      const dateObj = new Date(dateField);
      const dateStr = dateObj.getFullYear() + '-' + 
                     String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(dateObj.getDate()).padStart(2, '0');
      
      return dateStr === selectedDate;
    });
    
    // Sort by time (chronological order)
    return dayDates.sort((a, b) => {
      const dateFieldA = a.dateTime || a.date;
      const dateFieldB = b.dateTime || b.date;
      const timeA = new Date(dateFieldA).getTime();
      const timeB = new Date(dateFieldB).getTime();
      return timeA - timeB;
    });
  };

  const handleSaveNewProspect = async () => {
    if (!prospectName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to save a prospect');
      return;
    }

    const newProspect = {
      name: prospectName.trim(),
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
        setSelectedProspectForDate(result.data);
        // Clear the form fields
        setNewProspectAge('');
        setNewProspectOccupation('');
        // Move to date details step
        setAddDateStep('date_details');
        // Reload prospects list
        await loadData();
      } else {
        if (result.error === 'NAME_EXISTS') {
          Alert.alert(
            'Name Already Exists',
            `You already have a prospect named "${prospectName.trim()}". Please choose a different name.`,
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

  const renderAddDateContent = () => {
    if (editingDate) {
      return renderEditDateForm();
    }

    switch (addDateStep) {
      case 'prospect_choice':
        return renderProspectChoiceStep();
      case 'existing_prospect':
        return renderExistingProspectStep();
      case 'new_prospect':
        return renderNewProspectStep();
      case 'date_details':
        return renderDateDetailsStep();
      default:
        return renderProspectChoiceStep();
    }
  };

  const renderProspectChoiceStep = () => (
    <>
      <Text style={styles.modalTitle}>Add New Date</Text>
      <Text style={styles.stepDescription}>
        Who are you going on a date with?
      </Text>
      
      <View style={styles.choiceButtons}>
        <TouchableOpacity
          style={[styles.choiceButton, styles.existingProspectButton]}
          onPress={() => setAddDateStep('existing_prospect')}
        >
          <Text style={styles.choiceButtonText}>Existing Prospect</Text>
          <Text style={styles.choiceButtonSubtext}>Choose from your list</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.choiceButton, styles.newProspectButton]}
          onPress={() => setAddDateStep('new_prospect')}
        >
          <Text style={styles.choiceButtonText}>New Prospect</Text>
          <Text style={styles.choiceButtonSubtext}>Add someone new</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.cancelButton, styles.singleButton]}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </>
  );

  const renderExistingProspectStep = () => (
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
              setSelectedProspectForDate(prospect);
              setProspectName(prospect.name);
              setAddDateStep('date_details');
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
          onPress={() => setAddDateStep('prospect_choice')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderNewProspectStep = () => (
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
            value={prospectName}
            onChangeText={setProspectName}
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
          onPress={() => setAddDateStep('prospect_choice')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={handleSaveNewProspect}
        >
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDateDetailsStep = () => (
    <>
      <Text style={styles.dateWithHeader}>
        Date with {selectedProspectForDate?.name || prospectName}
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
              {dateTime.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>
              {dateTime.toLocaleTimeString('en-US', {
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
            value={dateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              setShowDatePicker(Platform.OS !== 'ios');
              if (selected) {
                const newDateTime = new Date(dateTime);
                newDateTime.setFullYear(selected.getFullYear());
                newDateTime.setMonth(selected.getMonth());
                newDateTime.setDate(selected.getDate());
                setDateTime(newDateTime);
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
            value={dateTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              setShowTimePicker(Platform.OS !== 'ios');
              if (selected) {
                const newDateTime = new Date(dateTime);
                newDateTime.setHours(selected.getHours());
                newDateTime.setMinutes(selected.getMinutes());
                setDateTime(newDateTime);
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
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pre-Date Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How are you feeling? What are your goals for this date? Any nervousness or excitement you want to remember? What are your intentions with this person?"
          value={preDateNotes}
          onChangeText={setPreDateNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Post-Date Reflection</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How did the date go? What did you learn? Any insights or feelings you want to remember?"
          value={postDateNotes}
          onChangeText={setPostDateNotes}
          multiline
          numberOfLines={3}
        />
      </View>
      
      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.backButton]}
          onPress={() => setAddDateStep('existing_prospect')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={saveDate}
        >
          <Text style={styles.saveButtonText}>Save Date</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEditDateForm = () => (
    <>
      <Text style={styles.modalTitle}>Edit Date</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>With whom?</Text>
        <TextInput
          style={styles.input}
          value={prospectName}
          onChangeText={setProspectName}
          placeholder="Prospect name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date & Time</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>
              {dateTime.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>
              {dateTime.toLocaleTimeString('en-US', {
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
            value={dateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              setShowDatePicker(Platform.OS !== 'ios');
              if (selected) {
                const newDateTime = new Date(dateTime);
                newDateTime.setFullYear(selected.getFullYear());
                newDateTime.setMonth(selected.getMonth());
                newDateTime.setDate(selected.getDate());
                setDateTime(newDateTime);
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
            value={dateTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              setShowTimePicker(Platform.OS !== 'ios');
              if (selected) {
                const newDateTime = new Date(dateTime);
                newDateTime.setHours(selected.getHours());
                newDateTime.setMinutes(selected.getMinutes());
                setDateTime(newDateTime);
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
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pre-Date Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How are you feeling? What are your goals for this date? Any nervousness or excitement you want to remember? What are your intentions with this person?"
          value={preDateNotes}
          onChangeText={setPreDateNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Post-Date Reflection</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How did the date go? What did you learn? Any insights or feelings you want to remember?"
          value={postDateNotes}
          onChangeText={setPostDateNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.saveButton]}
          onPress={saveDate}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={getMarkedDates()}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{
          selectedDayBackgroundColor: '#FF6B6B',
          todayTextColor: '#FF6B6B',
          arrowColor: '#FF6B6B',
          monthTextColor: '#FF6B6B',
        }}
      />

      <ScrollView style={styles.datesList}>
        {selectedDate && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateText}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              style={styles.addDateButton}
              onPress={() => openAddDateModal(selectedDate)}
            >
              <Text style={styles.addDateButtonText}>+ Add Date</Text>
            </TouchableOpacity>
          </View>
        )}

        {getDatesForSelectedDay().map((date) => (
          <TouchableOpacity
            key={date.id}
            style={styles.dateCard}
            onPress={() => openEditDateModal(date)}
          >
            <View style={styles.dateInfo}>
              <Text style={styles.datePerson}>{date.prospectName}</Text>
              <Text style={styles.dateTime}>{formatDateTime(date.dateTime || date.date)}</Text>
              {date.location && (
                <Text style={styles.dateLocation}>📍 {date.location}</Text>
              )}
              {date.preDateNotes && (
                <Text style={styles.dateNotes} numberOfLines={2}>
                  <Text style={styles.notesLabel}>Pre-date: </Text>{date.preDateNotes}
                </Text>
              )}
              {date.postDateNotes && (
                <Text style={styles.dateNotes} numberOfLines={2}>
                  <Text style={styles.notesLabel}>Post-date: </Text>{date.postDateNotes}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteDate(date.id)}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {selectedDate && getDatesForSelectedDay().length === 0 && (
          <Text style={styles.noDateText}>No dates scheduled for this day</Text>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderAddDateContent()}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Prospect Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProspectPicker}
        onRequestClose={() => setShowProspectPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={prospectPickerStyles.prospectPickerContent}>
            <Text style={prospectPickerStyles.prospectPickerTitle}>
              Select a Prospect ({prospects.length} available)
            </Text>
            
            <ScrollView style={prospectPickerStyles.prospectList}>
              {loadingProspects ? (
                <Text style={prospectPickerStyles.prospectItemText}>Loading prospects...</Text>
              ) : prospects.length === 0 ? (
                <Text style={prospectPickerStyles.prospectItemText}>No prospects found</Text>
              ) : (
                prospects.map((prospect) => (
                  <TouchableOpacity
                    key={prospect.id}
                    style={prospectPickerStyles.prospectItem}
                    onPress={() => {
                      setSelectedProspect(prospect.id);
                      setProspectName(prospect.name);
                      setShowProspectPicker(false);
                    }}
                  >
                    <Text style={prospectPickerStyles.prospectItemText}>{prospect.name}</Text>
                  </TouchableOpacity>
                ))
              )}
              
              <TouchableOpacity
                style={[prospectPickerStyles.prospectItem, prospectPickerStyles.addNewProspectItem]}
                onPress={() => {
                  setShowProspectPicker(false);
                  navigation.navigate('AddProspect');
                }}
              >
                <Text style={prospectPickerStyles.addNewProspectText}>+ Add new prospect</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <TouchableOpacity
              style={prospectPickerStyles.cancelProspectButton}
              onPress={() => setShowProspectPicker(false)}
            >
              <Text style={prospectPickerStyles.cancelProspectButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  datesList: {
    flex: 1,
    padding: 15,
  },
  selectedDateSection: {
    marginBottom: 20,
  },
  selectedDateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  addDateButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  addDateButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  dateCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dateInfo: {
    flex: 1,
  },
  datePerson: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 15,
    color: '#7F8C8D',
    marginBottom: 5,
    fontWeight: '500',
  },
  dateLocation: {
    fontSize: 15,
    color: '#7F8C8D',
    marginBottom: 5,
    fontWeight: '500',
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
  deleteButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#FF6B6B',
  },
  noDateText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
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
    maxHeight: '90%',
  },
  modalScrollView: {
    flexGrow: 1,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateWithHeader: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 38,
  },
  inputGroup: {
    marginBottom: 20,
  },
  pickerButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
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
  timeButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  singleButton: {
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
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
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
  },
  inputAndroid: {
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
  },
  placeholder: {
    color: '#999',
    fontSize: 16,
  },
  iconContainer: {
    top: 15,
    right: 15,
  },
});

const prospectPickerStyles = StyleSheet.create({
  prospectPickerContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 25,
    maxHeight: '80%',
  },
  prospectPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  prospectList: {
    maxHeight: 400,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
  },
  prospectItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 2,
    borderRadius: 8,
    minHeight: 50,
  },
  prospectItemText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  addNewProspectItem: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 0,
    borderRadius: 10,
    marginTop: 10,
  },
  addNewProspectText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelProspectButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelProspectButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});