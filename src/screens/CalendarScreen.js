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
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StorageService } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

export default function CalendarScreen() {
  const [dates, setDates] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  
  // Form states
  const [prospectName, setProspectName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadData = async () => {
    try {
      const [loadedDates, loadedProspects] = await Promise.all([
        StorageService.getDates(),
        StorageService.getProspects(),
      ]);
      setDates(loadedDates);
      setProspects(loadedProspects.filter(p => !p.inGraveyard));
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
      const dateStr = date.dateTime.split('T')[0];
      marked[dateStr] = {
        marked: true,
        dotColor: '#FF6B6B',
        selectedColor: '#FF6B6B',
      };
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
    setLocation('');
    setNotes('');
    setDateTime(new Date(date + 'T19:00:00'));
    setModalVisible(true);
  };

  const openEditDateModal = (dateItem) => {
    setEditingDate(dateItem);
    setProspectName(dateItem.prospectName);
    setLocation(dateItem.location || '');
    setNotes(dateItem.notes || '');
    setDateTime(new Date(dateItem.dateTime));
    setModalVisible(true);
  };

  const saveDate = async () => {
    if (!prospectName.trim()) {
      Alert.alert('Error', 'Please select a prospect');
      return;
    }

    const dateObj = {
      id: editingDate ? editingDate.id : Date.now().toString(),
      prospectName: prospectName.trim(),
      location: location.trim(),
      notes: notes.trim(),
      dateTime: dateTime.toISOString(),
      createdAt: editingDate ? editingDate.createdAt : new Date().toISOString(),
    };

    try {
      let updatedDates;
      if (editingDate) {
        updatedDates = dates.map(d => d.id === editingDate.id ? dateObj : d);
      } else {
        updatedDates = [...dates, dateObj];
      }
      await StorageService.saveDates(updatedDates);
      setDates(updatedDates);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save date');
    }
  };

  const deleteDate = (dateId) => {
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
              const updatedDates = dates.filter(d => d.id !== dateId);
              await StorageService.saveDates(updatedDates);
              setDates(updatedDates);
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
    return dates.filter(date => date.dateTime.startsWith(selectedDate));
  };

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
          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateText}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
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
              <Text style={styles.dateTime}>{formatDateTime(date.dateTime)}</Text>
              {date.location && (
                <Text style={styles.dateLocation}>📍 {date.location}</Text>
              )}
              {date.notes && (
                <Text style={styles.dateNotes} numberOfLines={2}>
                  {date.notes}
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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingDate ? 'Edit Date' : 'Add New Date'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>With whom?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter prospect name"
                value={prospectName}
                onChangeText={setProspectName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  {dateTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={dateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  setShowTimePicker(Platform.OS !== 'ios');
                  if (selected) {
                    const newDateTime = new Date(selectedDate);
                    newDateTime.setHours(selected.getHours());
                    newDateTime.setMinutes(selected.getMinutes());
                    setDateTime(newDateTime);
                  }
                }}
              />
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
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional notes..."
                value={notes}
                onChangeText={setNotes}
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
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addDateButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addDateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  dateCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
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
    marginBottom: 3,
  },
  dateLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  dateNotes: {
    fontSize: 13,
    color: '#999',
    marginTop: 5,
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
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  textArea: {
    paddingTop: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 