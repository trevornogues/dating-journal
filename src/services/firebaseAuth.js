import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const FirebaseAuthService = {
  // Sign up a new user
  async signup(email, password, name) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update the user's display name
      await updateProfile(user, {
        displayName: name
      });
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          createdAt: user.metadata.creationTime
        }
      };
    } catch (error) {
      console.error('Signup error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please try logging in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // Sign in an existing user
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          createdAt: user.metadata.creationTime
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // Sign out the current user
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get the current user
  getCurrentUser() {
    const user = auth.currentUser;
    if (user) {
      return {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        createdAt: user.metadata.creationTime
      };
    }
    return null;
  },

  // Listen to authentication state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          id: user.uid,
          email: user.email,
          name: user.displayName,
          createdAt: user.metadata.creationTime
        });
      } else {
        callback(null);
      }
    });
  }
};
