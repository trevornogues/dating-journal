import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const FirestoreService = {
  // User profile
  async getUserProfile(userId) {
    try {
      const profileRef = doc(db, 'users', userId, 'settings', 'profile');
      const snapshot = await getDoc(profileRef);
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }
      const data = snapshot.data();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message, data: null };
    }
  },

  async upsertUserProfile(userId, profileData) {
    try {
      const profileRef = doc(db, 'users', userId, 'settings', 'profile');
      await setDoc(
        profileRef,
        {
          ...profileData,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true };
    } catch (error) {
      console.error('Error saving user profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Prospects management
  async saveProspect(userId, prospectData) {
    try {
      const prospectsRef = collection(db, 'users', userId, 'prospects');
      const docRef = await addDoc(prospectsRef, {
        ...prospectData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving prospect:', error);
      return { success: false, error: error.message };
    }
  },

  async updateProspect(userId, prospectId, prospectData) {
    try {
      const prospectRef = doc(db, 'users', userId, 'prospects', prospectId);
      await updateDoc(prospectRef, {
        ...prospectData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating prospect:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteProspect(userId, prospectId) {
    try {
      const prospectRef = doc(db, 'users', userId, 'prospects', prospectId);
      await deleteDoc(prospectRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting prospect:', error);
      return { success: false, error: error.message };
    }
  },

  async getProspects(userId) {
    try {
      const prospectsRef = collection(db, 'users', userId, 'prospects');
      const q = query(prospectsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const prospects = [];
      querySnapshot.forEach((doc) => {
        prospects.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      return { success: true, data: prospects };
    } catch (error) {
      console.error('Error getting prospects:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Real-time prospects listener
  subscribeToProspects(userId, callback) {
    const prospectsRef = collection(db, 'users', userId, 'prospects');
    const q = query(prospectsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const prospects = [];
      querySnapshot.forEach((doc) => {
        prospects.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      callback(prospects);
    });
  },

  // Notes management
  async addNote(userId, prospectId, content) {
    try {
      const notesRef = collection(db, 'users', userId, 'prospects', prospectId, 'notes');
      const docRef = await addDoc(notesRef, {
        content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding note:', error);
      return { success: false, error: error.message };
    }
  },

  async updateNote(userId, prospectId, noteId, content) {
    try {
      const noteRef = doc(db, 'users', userId, 'prospects', prospectId, 'notes', noteId);
      await updateDoc(noteRef, {
        content,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating note:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteNote(userId, prospectId, noteId) {
    try {
      const noteRef = doc(db, 'users', userId, 'prospects', prospectId, 'notes', noteId);
      await deleteDoc(noteRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }
  },

  async getNotesForProspect(userId, prospectId) {
    try {
      const notesRef = collection(db, 'users', userId, 'prospects', prospectId, 'notes');
      const q = query(notesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const notes = [];
      querySnapshot.forEach((doc) => {
        notes.push({
          id: doc.id,
          prospectId,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      return { success: true, data: notes };
    } catch (error) {
      console.error('Error getting notes:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Real-time notes listener
  subscribeToNotes(userId, prospectId, callback) {
    const notesRef = collection(db, 'users', userId, 'prospects', prospectId, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const notes = [];
      querySnapshot.forEach((doc) => {
        notes.push({
          id: doc.id,
          prospectId,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      callback(notes);
    });
  },

  // Dates management
  async saveDate(userId, dateData) {
    try {
      const datesRef = collection(db, 'users', userId, 'dates');
      const docRef = await addDoc(datesRef, {
        ...dateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving date:', error);
      return { success: false, error: error.message };
    }
  },

  async updateDate(userId, dateId, dateData) {
    try {
      const dateRef = doc(db, 'users', userId, 'dates', dateId);
      await updateDoc(dateRef, {
        ...dateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating date:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteDate(userId, dateId) {
    try {
      const dateRef = doc(db, 'users', userId, 'dates', dateId);
      await deleteDoc(dateRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting date:', error);
      return { success: false, error: error.message };
    }
  },

  async getDates(userId) {
    try {
      const datesRef = collection(db, 'users', userId, 'dates');
      const q = query(datesRef, orderBy('dateTime', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const dates = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        dates.push({
          id: doc.id,
          ...data,
          // Handle both dateTime and date fields for backward compatibility
          dateTime: data.dateTime || data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
          date: data.date?.toDate?.()?.toISOString() || data.dateTime || new Date().toISOString(),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      return { success: true, data: dates };
    } catch (error) {
      console.error('Error getting dates:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Real-time dates listener
  subscribeToDates(userId, callback) {
    const datesRef = collection(db, 'users', userId, 'dates');
    const q = query(datesRef, orderBy('dateTime', 'asc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const dates = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        dates.push({
          id: doc.id,
          ...data,
          // Handle both dateTime and date fields for backward compatibility
          dateTime: data.dateTime || data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
          date: data.date?.toDate?.()?.toISOString() || data.dateTime || new Date().toISOString(),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      callback(dates);
    });
  }
};
