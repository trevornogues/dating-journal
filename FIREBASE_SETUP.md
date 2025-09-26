# Firebase Setup Guide for Dating Journal App

This guide will walk you through setting up Firebase for your dating journal app.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `dating-journal` (or your preferred name)
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

## Step 2: Add Your App to Firebase

1. In your Firebase project dashboard, click "Add app"
2. Select the web app icon (</>) 
3. Enter app nickname: `Dating Journal`
4. **Don't check** "Set up Firebase Hosting" (we don't need it)
5. Click "Register app"

## Step 3: Get Your Firebase Configuration

After registering your app, you'll see a configuration object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 4: Update Your Firebase Configuration

1. Open `/Users/owner/Desktop/dating-journal/src/config/firebase.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 5: Enable Authentication

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## Step 6: Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (we'll set up security rules later)
4. Select a location (choose one close to your users)
5. Click "Done"

## Step 7: Set Up Security Rules

1. In Firestore Database, go to "Rules" tab
2. Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Prospects subcollection
      match /prospects/{prospectId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Notes subcollection
        match /notes/{noteId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
      
      // Dates collection
      match /dates/{dateId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Settings subcollection for user profile
      match /settings/{settingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click "Publish"

## Step 8: Test Your Setup

1. Run your app: `npm start`
2. Try creating a new account
3. Add a prospect
4. Check Firebase Console to see if data appears in Firestore

## Step 9: Optional - Set Up Firebase Analytics

1. In Firebase Console, go to "Analytics" > "Events"
2. This will help you track user engagement

## Data Structure

Your Firestore database will have this structure:

```
users/
  {userId}/
    prospects/
      {prospectId}/
        name: string
        age: number
        occupation: string
        interests: string
        notes: string
        whereWeMet: string
        inGraveyard: boolean
        createdAt: timestamp
        updatedAt: timestamp
        notes/
          {noteId}/
            content: string
            createdAt: timestamp
            updatedAt: timestamp
    dates/
      {dateId}/
        prospectId: string
        date: timestamp
        location: string
        notes: string
        createdAt: timestamp
        updatedAt: timestamp
```

## Troubleshooting

### Common Issues:

1. **"Firebase not initialized"** - Check your config values
2. **"Permission denied"** - Check your security rules
3. **"Network error"** - Check your internet connection
4. **"Invalid API key"** - Double-check your config values

### Testing Authentication:

1. Try signing up with a test email
2. Check Firebase Console > Authentication to see the user
3. Try logging out and back in

### Testing Firestore:

1. Add a prospect in your app
2. Check Firebase Console > Firestore Database
3. You should see data under `users/{userId}/prospects/`

## Next Steps

Once everything is working:

1. **Set up proper security rules** (the ones above are basic)
2. **Add data validation** in your Firestore service
3. **Set up backup strategies**
4. **Consider adding Firebase Storage** for profile pictures
5. **Add Firebase Functions** for advanced features

## Support

If you run into issues:
- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Look at the [React Native Firebase Guide](https://rnfirebase.io/)
- Check the browser console for error messages

Your app is now ready to use Firebase! 🎉
