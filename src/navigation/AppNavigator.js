import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

// Main screens
import DashboardScreen from '../screens/DashboardScreen';
import ProspectsScreen from '../screens/ProspectsScreen';
import AddProspectScreen from '../screens/AddProspectScreen';
import ProspectDetailScreen from '../screens/ProspectDetailScreen';
import ProspectNotesScreen from '../screens/ProspectNotesScreen';
import CalendarScreen from '../screens/CalendarScreen';
import LoveAIChatScreen from '../screens/LoveAIChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#FF6B6B',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Signup"
      component={SignupScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ProspectsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#FF6B6B',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen name="ProspectsList" component={ProspectsScreen} options={{ title: 'Prospects' }} />
    <Stack.Screen name="AddProspect" component={AddProspectScreen} options={{ title: 'Add Prospect' }} />
    <Stack.Screen name="ProspectDetail" component={ProspectDetailScreen} options={{ title: 'Prospect Details' }} />
    <Stack.Screen name="ProspectNotes" component={ProspectNotesScreen} options={{ title: 'Timeline Notes' }} />
  </Stack.Navigator>
);

const MainTab = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Prospects') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Calendar') {
          iconName = focused ? 'calendar' : 'calendar-outline';
        } else if (route.name === 'LoveAI') {
          iconName = focused ? 'heart' : 'heart-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#FF6B6B',
      tabBarInactiveTintColor: 'gray',
      headerStyle: {
        backgroundColor: '#FF6B6B',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen 
      name="Prospects" 
      component={ProspectsStack}
      options={{ headerShown: false }}
    />
    <Tab.Screen name="Calendar" component={CalendarScreen} />
    <Tab.Screen 
      name="LoveAI" 
      component={LoveAIChatScreen}
      options={{ 
        title: 'LoveAI',
        headerShown: true,
      }}
    />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#FF6B6B',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="MainTab" 
      component={MainTab} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="AddProspect" 
      component={AddProspectScreen} 
      options={{ title: 'Add Prospect' }}
    />
    <Stack.Screen 
      name="ProspectDetail" 
      component={ProspectDetailScreen} 
      options={{ title: 'Prospect Details' }}
    />
    <Stack.Screen 
      name="ProspectNotes" 
      component={ProspectNotesScreen} 
      options={{ title: 'Timeline Notes' }}
    />
  </Stack.Navigator>
);

export default function AppNavigator({ isAuthenticated }) {
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
} 