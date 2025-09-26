import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FirestoreService } from '../services/firestoreService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../utils/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProspectDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { prospect: initialProspect } = route.params;
  const [prospect, setProspect] = useState(initialProspect);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProspect, setEditedProspect] = useState(initialProspect);
  const [notesCount, setNotesCount] = useState(0);


  useEffect(() => {
    loadNotesCount();
  }, []);

  const loadNotesCount = async () => {
    if (!user) return;
    
    const result = await FirestoreService.getNotesForProspect(user.id, prospect.id);
    if (result.success) {
      setNotesCount(result.data.length);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const result = await FirestoreService.updateProspect(user.id, prospect.id, editedProspect);
      if (result.success) {
        setProspect(editedProspect);
        setIsEditing(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to save changes');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleMoveToGraveyard = () => {
    if (!user) return;
    
    Alert.alert(
      'Move to Graveyard',
      'Are you sure you want to move this prospect to the graveyard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirestoreService.updateProspect(user.id, prospect.id, { inGraveyard: true });
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', result.error || 'Failed to move to graveyard');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to move to graveyard');
            }
          },
        },
      ]
    );
  };

  const handleMoveToActive = () => {
    if (!user) return;
    
    Alert.alert(
      'Move to Active',
      'Are you sure you want to move this prospect back to active?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          style: 'default',
          onPress: async () => {
            try {
              const result = await FirestoreService.updateProspect(user.id, prospect.id, { inGraveyard: false });
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', result.error || 'Failed to move to active');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to move to active');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!user) return;
    
    Alert.alert(
      'Delete Prospect',
      'Are you sure you want to permanently delete this prospect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirestoreService.deleteProspect(user.id, prospect.id, prospect);
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete prospect');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete prospect');
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    if (!user) return;

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload photos!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      try {
        // Show loading state
        Alert.alert('Uploading...', 'Please wait while we upload your photo to the cloud.');
        
        // Try Firebase Storage first
        const uploadResult = await StorageService.uploadProspectPhoto(user.id, prospect.id, imageUri);
        
        if (uploadResult.success) {
          // Update the prospect with the Firebase Storage URL
          const updatedProspect = { ...editedProspect, photoUri: uploadResult.downloadURL };
          setEditedProspect(updatedProspect);
          
          // Save to Firestore
          const saveResult = await FirestoreService.updateProspect(user.id, prospect.id, updatedProspect);
          if (saveResult.success) {
            setProspect(updatedProspect);
            Alert.alert('Success', 'Photo uploaded and saved successfully!');
          } else {
            Alert.alert('Error', saveResult.error || 'Failed to save photo to database');
          }
        } else {
          // Fallback: Save local URI for now (temporary solution)
          console.warn('Firebase Storage failed, using local URI as fallback:', uploadResult.error);
          const updatedProspect = { ...editedProspect, photoUri: imageUri };
          setEditedProspect(updatedProspect);
          
          const saveResult = await FirestoreService.updateProspect(user.id, prospect.id, updatedProspect);
          if (saveResult.success) {
            setProspect(updatedProspect);
            Alert.alert('Success', 'Photo saved locally (cloud upload failed - check Firebase Storage setup)');
          } else {
            Alert.alert('Error', saveResult.error || 'Failed to save photo');
          }
        }
      } catch (error) {
        console.error('Photo upload error:', error);
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatar} onPress={pickImage}>
          {prospect.photoUri ? (
            <Image source={{ uri: prospect.photoUri }} style={styles.avatarPhoto} />
          ) : (
            <Text style={styles.avatarText}>
              {prospect.name.charAt(0).toUpperCase()}
            </Text>
          )}
          <View style={styles.photoOverlay}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={editedProspect.name}
            onChangeText={(text) =>
              setEditedProspect({ ...editedProspect, name: text })
            }
          />
        ) : (
          <Text style={styles.name}>{prospect.name}</Text>
        )}
      </View>

      {/* Notes Button */}
      <TouchableOpacity
        style={styles.notesButton}
        onPress={() => navigation.navigate('ProspectNotes', { prospect })}
      >
        <Ionicons name="document-text-outline" size={24} color="#FF6B6B" />
        <View style={styles.notesButtonContent}>
          <Text style={styles.notesButtonText}>View Timeline Notes</Text>
          <Text style={styles.notesCountText}>
            {notesCount} {notesCount === 1 ? 'note' : 'notes'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age</Text>
          {isEditing ? (
            <TextInput
              style={styles.infoInput}
              value={editedProspect.age?.toString() || ''}
              onChangeText={(text) =>
                setEditedProspect({
                  ...editedProspect,
                  age: text ? parseInt(text) : null,
                })
              }
              keyboardType="numeric"
            />
          ) : (
            <Text style={styles.infoValue}>
              {prospect.age ? `${prospect.age} years` : 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Occupation</Text>
          {isEditing ? (
            <TextInput
              style={styles.infoInput}
              value={editedProspect.occupation || ''}
              onChangeText={(text) =>
                setEditedProspect({ ...editedProspect, occupation: text })
              }
            />
          ) : (
            <Text style={styles.infoValue}>
              {prospect.occupation || 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Where We Met</Text>
          {isEditing ? (
            <TextInput
              style={styles.infoInput}
              value={editedProspect.whereWeMet || ''}
              onChangeText={(text) =>
                setEditedProspect({ ...editedProspect, whereWeMet: text })
              }
            />
          ) : (
            <Text style={styles.infoValue}>
              {prospect.whereWeMet || 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Added On</Text>
          <Text style={styles.infoValue}>{formatDate(prospect.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        {isEditing ? (
          <TextInput
            style={styles.textArea}
            value={editedProspect.interests || ''}
            onChangeText={(text) =>
              setEditedProspect({ ...editedProspect, interests: text })
            }
            multiline
            numberOfLines={3}
            placeholder="Add interests..."
          />
        ) : (
          <Text style={styles.sectionContent}>
            {prospect.interests || 'No interests added yet'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        {isEditing ? (
          <TextInput
            style={styles.textArea}
            value={editedProspect.notes || ''}
            onChangeText={(text) =>
              setEditedProspect({ ...editedProspect, notes: text })
            }
            multiline
            numberOfLines={5}
            placeholder="Add notes..."
          />
        ) : (
          <Text style={styles.sectionContent}>
            {prospect.notes || 'No notes added yet'}
          </Text>
        )}
      </View>

      {/* Edit Button - Fallback if header button doesn't work */}
      {!isEditing && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(true)}
        >
          <Text style={styles.editButtonText}>✏️ Edit Prospect</Text>
        </TouchableOpacity>
      )}

      {isEditing ? (
        <>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              setIsEditing(false);
              setEditedProspect(prospect); // Reset to original values
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {prospect.inGraveyard ? (
            <TouchableOpacity
              style={styles.activeButton}
              onPress={handleMoveToActive}
            >
              <Text style={styles.activeButtonText}>Move to Active</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.graveyardButton}
              onPress={handleMoveToGraveyard}
            >
              <Text style={styles.graveyardButtonText}>Move to Graveyard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Prospect</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  nameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontWeight: '700',
  },
  notesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 10,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  notesButtonContent: {
    flex: 1,
    marginLeft: 15,
  },
  notesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  notesCountText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoSection: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 150,
    textAlign: 'right',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  textArea: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  graveyardButton: {
    backgroundColor: '#FFA500',
    margin: 20,
    marginBottom: 10,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  graveyardButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
    margin: 20,
    marginBottom: 10,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 