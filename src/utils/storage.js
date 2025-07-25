import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: '@dating_journal_user',
  PROSPECTS: '@dating_journal_prospects',
  DATES: '@dating_journal_dates',
  NOTES: '@dating_journal_notes',
};

export const StorageService = {
  // User management
  async saveUser(userData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Prospects management
  async saveProspects(prospects) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROSPECTS, JSON.stringify(prospects));
    } catch (error) {
      console.error('Error saving prospects:', error);
    }
  },

  async getProspects() {
    try {
      const prospects = await AsyncStorage.getItem(STORAGE_KEYS.PROSPECTS);
      return prospects ? JSON.parse(prospects) : [];
    } catch (error) {
      console.error('Error getting prospects:', error);
      return [];
    }
  },

  // Dates management
  async saveDates(dates) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DATES, JSON.stringify(dates));
    } catch (error) {
      console.error('Error saving dates:', error);
    }
  },

  async getDates() {
    try {
      const dates = await AsyncStorage.getItem(STORAGE_KEYS.DATES);
      return dates ? JSON.parse(dates) : [];
    } catch (error) {
      console.error('Error getting dates:', error);
      return [];
    }
  },

  // Notes management
  async saveNotes(notes) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  },

  async getNotes() {
    try {
      const notes = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
      return notes ? JSON.parse(notes) : [];
    } catch (error) {
      console.error('Error getting notes:', error);
      return [];
    }
  },

  async getNotesForProspect(prospectId) {
    try {
      const allNotes = await this.getNotes();
      return allNotes.filter(note => note.prospectId === prospectId);
    } catch (error) {
      console.error('Error getting notes for prospect:', error);
      return [];
    }
  },

  async addNote(prospectId, content) {
    try {
      const notes = await this.getNotes();
      const newNote = {
        id: Date.now().toString(),
        prospectId,
        content,
        createdAt: new Date().toISOString(),
      };
      notes.push(newNote);
      await this.saveNotes(notes);
      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      return null;
    }
  },

  async deleteNote(noteId) {
    try {
      const notes = await this.getNotes();
      const filteredNotes = notes.filter(note => note.id !== noteId);
      await this.saveNotes(filteredNotes);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  },

  // Clear all data
  async clearAllData() {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
}; 