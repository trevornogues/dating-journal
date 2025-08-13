import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OpenAIService } from '../services/openaiService';
import { OPENAI_CONFIG } from '../config/openai';

export default function LoveAIChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm LoveAI, your personal dating advisor. I can see your current prospects and notes. Feel free to ask me anything about your dating life - whether you need advice on a specific person, help planning dates, or just want to talk through your feelings. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Check if API key is configured
    if (!OPENAI_CONFIG.apiKey || OPENAI_CONFIG.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
      Alert.alert(
        'Configuration Required',
        'Please add your OpenAI API key in src/config/openai.js to use LoveAI.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Convert messages to OpenAI format (excluding the initial greeting)
      const conversationHistory = messages
        .slice(1)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await OpenAIService.sendMessage(
        userMessage.content,
        conversationHistory
      );

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="heart" size={20} color="white" />
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userContent : styles.assistantContent,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userText]}>
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerAvatar}>
            <Ionicons name="heart" size={24} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>LoveAI</Text>
            <Text style={styles.headerSubtitle}>Your Dating Advisor</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B6B" />
          <Text style={styles.loadingText}>LoveAI is thinking...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything about your dating life..."
          placeholderTextColor="#999"
          multiline
          maxHeight={100}
          onSubmitEditing={sendMessage}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={24}
            color={inputText.trim() && !isLoading ? 'white' : '#ccc'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  messagesList: {
    padding: 20,
    paddingBottom: 10,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContent: {
    maxWidth: '75%',
    borderRadius: 20,
    padding: 15,
  },
  userContent: {
    backgroundColor: '#FF6B6B',
  },
  assistantContent: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  userText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    minHeight: 45,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
}); 