import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { StorageService } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function ProspectDetailScreen({ route, navigation }) {
  const { prospect: initialProspect } = route.params;
  const [prospect, setProspect] = useState(initialProspect);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProspect, setEditedProspect] = useState(initialProspect);
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [isEditing, navigation]);

  useEffect(() => {
    loadNotesCount();
  }, []);

  const loadNotesCount = async () => {
    const notes = await StorageService.getNotesForProspect(prospect.id);
    setNotesCount(notes.length);
  };

  const handleSave = async () => {
    try {
      const prospects = await StorageService.getProspects();
      const index = prospects.findIndex(p => p.id === prospect.id);
      if (index !== -1) {
        prospects[index] = { ...editedProspect };
        await StorageService.saveProspects(prospects);
        setProspect(editedProspect);
        setIsEditing(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleMoveToGraveyard = () => {
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
              const prospects = await StorageService.getProspects();
              const index = prospects.findIndex(p => p.id === prospect.id);
              if (index !== -1) {
                prospects[index].inGraveyard = true;
                await StorageService.saveProspects(prospects);
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to move to graveyard');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
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
              const prospects = await StorageService.getProspects();
              const filteredProspects = prospects.filter(p => p.id !== prospect.id);
              await StorageService.saveProspects(filteredProspects);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete prospect');
            }
          },
        },
      ]
    );
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {prospect.name.charAt(0).toUpperCase()}
          </Text>
        </View>
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

      {isEditing ? (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={styles.graveyardButton}
            onPress={handleMoveToGraveyard}
          >
            <Text style={styles.graveyardButtonText}>Move to Graveyard</Text>
          </TouchableOpacity>

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
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
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
  headerButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  headerButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
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