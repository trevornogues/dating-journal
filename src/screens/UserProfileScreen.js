import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../utils/AuthContext';
import { FirestoreService } from '../services/firestoreService';

const SAMPLE_BANK = {
  values: [
    'Honesty & transparency',
    'Loyalty & faithfulness',
    'Mutual respect',
    'Open communication',
    'Growth mindset (personal and relational)',
    'Accountability & responsibility',
    'Kindness & empathy',
    'Emotional vulnerability',
    'Family-oriented',
    'Independence & self-sufficiency',
    'Spirituality or faith alignment',
    'Equality & fairness',
    'Playfulness & humor',
    'Community involvement',
    'Health & wellness lifestyle',
    'Ambition & drive',
    'Integrity & ethics',
    'Generosity',
    'Balance of independence and togetherness'
  ],
  lookingFor: [
    'Long-term partnership',
    'Marriage and family',
    'Casual dating / fun connections',
    'Friends-to-lovers type relationship',
    'Shared hobbies & interests',
    'Emotional intimacy',
    'Strong physical/sexual connection',
    'Stability & security',
    'Adventure & spontaneity',
    'Someone supportive of my career/ambitions',
    'A partner who values personal growth',
    'Equal partnership in responsibilities',
    'Humor and laughter together',
    'Deep conversations',
    'Consistency and reliability',
    'Someone who shares my faith/beliefs',
    'Travel buddy / shared love of experiences',
    'Someone affectionate and expressive',
    'Co-parenting partner (now or in the future)'
  ],
  boundaries: [
    'Need for personal space/time alone',
    'Clear and respectful communication during conflicts',
    'No pressure to move faster than I\'m ready',
    'Separate time with friends and family',
    'Respect for my work schedule and commitments',
    'Consent and comfort around physical intimacy',
    'No sharing of private conversations/photos without permission',
    'Respect for religious or cultural practices',
    'No guilt-tripping or emotional manipulation',
    'Ability to maintain independence (finances, hobbies, friendships)',
    'Limited phone/social media use during quality time',
    'Discussing big decisions together before acting',
    'No raising voices or yelling in arguments',
    'Respect for differences in political/social beliefs',
    'Taking breaks in heated arguments if needed'
  ],
  dealBreakers: [
    'Dishonesty or lying',
    'Cheating / infidelity',
    'Disrespect or belittling behavior',
    'Poor communication / stonewalling',
    'Controlling or manipulative behavior',
    'Addiction issues (if untreated)',
    'Disinterest in commitment (if I want commitment)',
    'Unwillingness to compromise',
    'Lack of ambition or motivation',
    'Opposing religious/political values',
    'Different desires about marriage/kids',
    'Irresponsible with money',
    'Disregard for health or hygiene',
    'Rudeness to service workers/others',
    'Anger issues or violent behavior',
    'Excessive partying or substance use',
    'Lack of emotional availability',
    'Disrespect for boundaries',
    'Constant negativity or pessimism'
  ]
};

export default function UserProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [values, setValues] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [boundaries, setBoundaries] = useState([]);
  const [dealBreakers, setDealBreakers] = useState([]);
  const [originalData, setOriginalData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [currentSection, setCurrentSection] = useState('');
  const [newItem, setNewItem] = useState('');
  const [selectedSamples, setSelectedSamples] = useState([]);
  
  // Autosave functionality
  const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const autosaveTimeoutRef = useRef(null);
  const lastSaveTimeRef = useRef(null);
  const isAutosavingRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      const res = await FirestoreService.getUserProfile(user.id);
      if (res.success && res.data) {
        const data = {
          values: res.data.values || [],
          lookingFor: res.data.lookingFor || [],
          boundaries: res.data.boundaries || [],
          dealBreakers: res.data.dealBreakers || []
        };
        setValues(data.values);
        setLookingFor(data.lookingFor);
        setBoundaries(data.boundaries);
        setDealBreakers(data.dealBreakers);
        setOriginalData(data);
      } else {
        const emptyData = { values: [], lookingFor: [], boundaries: [], dealBreakers: [] };
        setOriginalData(emptyData);
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  // Handle navigation away with unsaved changes
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!hasUnsavedChanges()) {
          return;
        }

        // Prevent default behavior of leaving the screen
        e.preventDefault();

        // Show confirmation dialog
        Alert.alert(
          'Unsaved Changes',
          'You have unsaved changes. What would you like to do?',
          [
            {
              text: 'Discard Changes',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action)
            },
            {
              text: 'Save & Exit',
              onPress: async () => {
                await onSave();
                navigation.dispatch(e.data.action);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      });

      return unsubscribe;
    }, [navigation, hasUnsavedChanges, onSave])
  );

  const hasUnsavedChanges = () => {
    if (!originalData) return false;
    
    const currentData = { values, lookingFor, boundaries, dealBreakers };
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  };

  const onSave = async (isAutosave = false) => {
    if (!user) return;
    
    if (isAutosave) {
      isAutosavingRef.current = true;
      setAutosaveStatus('saving');
    } else {
      setIsSaving(true);
    }
    
    const res = await FirestoreService.upsertUserProfile(user.id, {
      values,
      lookingFor,
      boundaries,
      dealBreakers
    });
    
    if (isAutosave) {
      setAutosaveStatus(res.success ? 'saved' : 'error');
      isAutosavingRef.current = false;
    } else {
      setIsSaving(false);
    }
    
    if (!res.success) {
      if (!isAutosave) {
        Alert.alert('Error', res.error || 'Failed to save profile.');
      }
      return;
    }
    
    // Update original data after successful save
    setOriginalData({ values, lookingFor, boundaries, dealBreakers });
    lastSaveTimeRef.current = new Date();
    
    if (!isAutosave) {
      Alert.alert('Saved', 'Your dating values have been updated.');
    }
  };

  // Autosave function with debouncing
  const triggerAutosave = useCallback(() => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Capture current values at the time of triggering
    const currentValues = { values, lookingFor, boundaries, dealBreakers };
    
    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      
      setAutosaveStatus('saving');
      isAutosavingRef.current = true;
      
      const res = await FirestoreService.upsertUserProfile(user.id, currentValues);
      
      setAutosaveStatus(res.success ? 'saved' : 'error');
      isAutosavingRef.current = false;
      
      if (res.success) {
        setOriginalData(currentValues);
        lastSaveTimeRef.current = new Date();
      }
    }, 2000); // 2 second delay
  }, [values, lookingFor, boundaries, dealBreakers, user]);

  // Effect to trigger autosave when data changes
  useEffect(() => {
    if (originalData && hasUnsavedChanges()) {
      triggerAutosave();
    }
  }, [values, lookingFor, boundaries, dealBreakers, originalData, triggerAutosave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  const addItem = (section, item) => {
    if (!item.trim()) return;
    
    const newItem = item.trim();
    
    // Check for duplicates
    const getCurrentItems = () => {
      switch (section) {
        case 'values': return values;
        case 'lookingFor': return lookingFor;
        case 'boundaries': return boundaries;
        case 'dealBreakers': return dealBreakers;
        default: return [];
      }
    };
    
    const currentItems = getCurrentItems();
    if (currentItems.includes(newItem)) {
      Alert.alert('Duplicate Item', 'This item already exists in your list.');
      return;
    }
    
    switch (section) {
      case 'values':
        if (values.length >= 10) {
          Alert.alert('Limit Reached', 'You can add up to 10 items in this section.');
          return;
        }
        setValues([...values, newItem]);
        break;
      case 'lookingFor':
        if (lookingFor.length >= 10) {
          Alert.alert('Limit Reached', 'You can add up to 10 items in this section.');
          return;
        }
        setLookingFor([...lookingFor, newItem]);
        break;
      case 'boundaries':
        if (boundaries.length >= 10) {
          Alert.alert('Limit Reached', 'You can add up to 10 items in this section.');
          return;
        }
        setBoundaries([...boundaries, newItem]);
        break;
      case 'dealBreakers':
        if (dealBreakers.length >= 10) {
          Alert.alert('Limit Reached', 'You can add up to 10 items in this section.');
          return;
        }
        setDealBreakers([...dealBreakers, newItem]);
        break;
    }
    setNewItem('');
    setShowAddModal(false);
  };

  const removeItem = (section, index) => {
    switch (section) {
      case 'values':
        setValues(values.filter((_, i) => i !== index));
        break;
      case 'lookingFor':
        setLookingFor(lookingFor.filter((_, i) => i !== index));
        break;
      case 'boundaries':
        setBoundaries(boundaries.filter((_, i) => i !== index));
        break;
      case 'dealBreakers':
        setDealBreakers(dealBreakers.filter((_, i) => i !== index));
        break;
    }
  };

  const openAddModal = (section) => {
    setCurrentSection(section);
    setShowAddModal(true);
  };

  const openSampleModal = (section) => {
    setCurrentSection(section);
    setSelectedSamples([]);
    setShowSampleModal(true);
  };

  const toggleSampleSelection = (sample) => {
    setSelectedSamples(prev => 
      prev.includes(sample) 
        ? prev.filter(item => item !== sample)
        : [...prev, sample]
    );
  };

  const addSelectedSamples = () => {
    if (selectedSamples.length === 0) return;
    
    const currentItems = getCurrentItems();
    const availableSlots = 10 - currentItems.length;
    
    // Filter out duplicates and items that would exceed the limit
    const itemsToAdd = selectedSamples
      .filter(item => !currentItems.includes(item))
      .slice(0, availableSlots);
    
    const duplicatesFound = selectedSamples.filter(item => currentItems.includes(item));
    const skippedDueToLimit = selectedSamples.length - itemsToAdd.length - duplicatesFound.length;
    
    // Show feedback about what happened
    let message = '';
    if (duplicatesFound.length > 0 && skippedDueToLimit > 0) {
      message = `${duplicatesFound.length} items were already in your list and ${skippedDueToLimit} items were skipped due to the 10-item limit.`;
    } else if (duplicatesFound.length > 0) {
      message = `${duplicatesFound.length} items were already in your list.`;
    } else if (skippedDueToLimit > 0) {
      message = `${skippedDueToLimit} items were skipped due to the 10-item limit.`;
    }
    
    if (message) {
      Alert.alert('Some Items Skipped', message);
    }
    
    if (itemsToAdd.length === 0) {
      setShowSampleModal(false);
      setSelectedSamples([]);
      return;
    }
    
    switch (currentSection) {
      case 'values':
        setValues([...values, ...itemsToAdd]);
        break;
      case 'lookingFor':
        setLookingFor([...lookingFor, ...itemsToAdd]);
        break;
      case 'boundaries':
        setBoundaries([...boundaries, ...itemsToAdd]);
        break;
      case 'dealBreakers':
        setDealBreakers([...dealBreakers, ...itemsToAdd]);
        break;
    }
    setShowSampleModal(false);
    setSelectedSamples([]);
  };

  const getCurrentItems = () => {
    switch (currentSection) {
      case 'values': return values;
      case 'lookingFor': return lookingFor;
      case 'boundaries': return boundaries;
      case 'dealBreakers': return dealBreakers;
      default: return [];
    }
  };

  const renderBubbles = (items, section) => (
    <View>
      <View style={styles.bubblesContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.bubble}>
            <Text style={styles.bubbleText}>{item}</Text>
            <TouchableOpacity 
              onPress={() => removeItem(section, index)}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))}
        {items.length < 10 && (
          <>
            <TouchableOpacity 
              style={styles.addBubble}
              onPress={() => openAddModal(section)}
            >
              <Ionicons name="add" size={20} color="#FF6B6B" />
              <Text style={styles.addBubbleText}>Add custom</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.sampleBubble}
              onPress={() => openSampleModal(section)}
            >
              <Ionicons name="library" size={20} color="#4CAF50" />
              <Text style={styles.sampleBubbleText}>Choose from samples</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.section}>
        <Text style={styles.label}>Core values</Text>
        <Text style={styles.description}>What matters most to you in life and relationships?</Text>
        {renderBubbles(values, 'values')}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>What you're looking for</Text>
        <Text style={styles.description}>Qualities, lifestyle, goals you want in a partner</Text>
        {renderBubbles(lookingFor, 'lookingFor')}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Boundaries</Text>
        <Text style={styles.description}>Your non-negotiable boundaries and expectations</Text>
        {renderBubbles(boundaries, 'boundaries')}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Deal breakers</Text>
        <Text style={styles.description}>Behaviors or situations you will not accept</Text>
        {renderBubbles(dealBreakers, 'dealBreakers')}
      </View>

      <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={() => onSave(false)} disabled={isSaving}>
        <View style={styles.saveButtonContent}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          {autosaveStatus === 'saved' && lastSaveTimeRef.current && (
            <Text style={styles.autosaveText}>
              Auto-saved {lastSaveTimeRef.current.toLocaleTimeString()}
            </Text>
          )}
          {autosaveStatus === 'saving' && (
            <Text style={styles.autosaveText}>Auto-saving...</Text>
          )}
          {autosaveStatus === 'error' && (
            <Text style={styles.autosaveErrorText}>Auto-save failed - tap Save</Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Item</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type your item here..."
              value={newItem}
              onChangeText={setNewItem}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewItem('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => addItem(currentSection, newItem)}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSampleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSampleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sampleModalContent}>
            <Text style={styles.modalTitle}>Choose Sample Items</Text>
            <Text style={styles.sampleSubtitle}>Select one or more items to add:</Text>
            <ScrollView style={styles.sampleList} showsVerticalScrollIndicator={false}>
              {SAMPLE_BANK[currentSection]?.filter(sample => !getCurrentItems().includes(sample)).map((sample, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sampleItem,
                    selectedSamples.includes(sample) && styles.selectedSampleItem
                  ]}
                  onPress={() => toggleSampleSelection(sample)}
                >
                  <Text style={[
                    styles.sampleItemText,
                    selectedSamples.includes(sample) && styles.selectedSampleText
                  ]}>
                    {sample}
                  </Text>
                  {selectedSamples.includes(sample) && (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
              {SAMPLE_BANK[currentSection]?.filter(sample => !getCurrentItems().includes(sample)).length === 0 && (
                <View style={styles.emptySampleMessage}>
                  <Text style={styles.emptySampleText}>
                    All available sample items have already been added to your list.
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowSampleModal(false);
                  setSelectedSamples([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButton, selectedSamples.length === 0 && styles.disabledButton]}
                onPress={addSelectedSamples}
                disabled={selectedSamples.length === 0}
              >
                <Text style={styles.addButtonText}>
                  Add {selectedSamples.length} item{selectedSamples.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic'
  },
  bubblesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  bubble: {
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFB3B3',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  bubbleText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
    lineHeight: 18
  },
  removeButton: {
    padding: 2
  },
  addBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed'
  },
  addBubbleText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  },
  sampleBubble: {
    backgroundColor: '#f0f8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed'
  },
  sampleBubbleText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  },
  saveButton: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center'
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonContent: {
    alignItems: 'center'
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16
  },
  autosaveText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic'
  },
  autosaveErrorText: {
    color: '#FFE0E0',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600'
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center'
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  sampleModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%'
  },
  sampleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center'
  },
  sampleList: {
    maxHeight: 300,
    marginBottom: 20
  },
  sampleItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  selectedSampleItem: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50'
  },
  sampleItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8
  },
  selectedSampleText: {
    color: '#2E7D32',
    fontWeight: '500'
  },
  disabledButton: {
    opacity: 0.5
  },
  emptySampleMessage: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginTop: 10
  },
  emptySampleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});