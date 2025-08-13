import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator } from 'react-native';
import { OPENAI_API_KEY } from '@env';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator isAuthenticated={!!user} />
    </>
  );
}

export default function App() {
  console.log("Loaded key:", OPENAI_API_KEY); // should print your key in Metro logs
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
} 