import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export const StorageService = {
  // Upload a prospect photo to Firebase Storage
  async uploadProspectPhoto(userId, prospectId, imageUri) {
    try {
      console.log('Starting photo upload...', { userId, prospectId, imageUri });
      
      // Check if storage is properly initialized
      if (!storage) {
        throw new Error('Firebase Storage not initialized');
      }
      
      // Create a unique filename for the image
      const timestamp = Date.now();
      const filename = `prospects/${userId}/${prospectId}/photo_${timestamp}.jpg`;
      console.log('Creating storage reference for:', filename);
      
      const storageRef = ref(storage, filename);

      // Convert the local URI to a blob for upload
      console.log('Converting image to blob...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size);

      // Upload the blob to Firebase Storage
      console.log('Uploading to Firebase Storage...');
      const uploadResult = await uploadBytes(storageRef, blob);
      console.log('Upload completed:', uploadResult);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return { success: true, downloadURL };
    } catch (error) {
      console.error('Error uploading prospect photo:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  },

  // Delete a prospect photo from Firebase Storage
  async deleteProspectPhoto(photoUrl) {
    try {
      // Extract the file path from the download URL
      const url = new URL(photoUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      
      if (!pathMatch) {
        throw new Error('Invalid photo URL format');
      }
      
      const filePath = decodeURIComponent(pathMatch[1]);
      const photoRef = ref(storage, filePath);
      
      await deleteObject(photoRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting prospect photo:', error);
      return { success: false, error: error.message };
    }
  }
};
