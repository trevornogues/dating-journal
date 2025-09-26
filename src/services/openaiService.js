import axios from 'axios';
import { OPENAI_CONFIG, SYSTEM_PROMPT } from '../config/openai';
import { FirestoreService } from './firestoreService';

export class OpenAIService {
  static async generateDatingContext(userId) {
    try {
      if (!userId) {
        return "User not authenticated.";
      }
      // Load user profile
      const profileRes = await FirestoreService.getUserProfile(userId);
      const profile = profileRes.success ? profileRes.data : null;
      // Load prospects for this user
      const prospectsResult = await FirestoreService.getProspects(userId);
      const prospects = prospectsResult.success ? prospectsResult.data : [];

      // Filter active prospects only
      const activeProspects = prospects.filter(p => !p.inGraveyard);

      // Build context string with profile and latest notes per prospect
      let context = '';
      if (profile) {
        context += '=== USER DATING PROFILE ===\n';
        context += 'Use this information to provide personalized dating advice:\n\n';
        
        // Handle new array format for dating values
        if (profile.values && Array.isArray(profile.values) && profile.values.length > 0) {
          context += `CORE VALUES (${profile.values.length} items):\n`;
          profile.values.forEach((value, index) => {
            context += `${index + 1}. ${value}\n`;
          });
          context += '\n';
        } else if (profile.values && typeof profile.values === 'string') {
          context += `CORE VALUES: ${profile.values}\n\n`;
        }
        
        if (profile.lookingFor && Array.isArray(profile.lookingFor) && profile.lookingFor.length > 0) {
          context += `WHAT THEY'RE LOOKING FOR (${profile.lookingFor.length} items):\n`;
          profile.lookingFor.forEach((item, index) => {
            context += `${index + 1}. ${item}\n`;
          });
          context += '\n';
        } else if (profile.lookingFor && typeof profile.lookingFor === 'string') {
          context += `WHAT THEY'RE LOOKING FOR: ${profile.lookingFor}\n\n`;
        }
        
        if (profile.boundaries && Array.isArray(profile.boundaries) && profile.boundaries.length > 0) {
          context += `BOUNDARIES (${profile.boundaries.length} items):\n`;
          profile.boundaries.forEach((boundary, index) => {
            context += `${index + 1}. ${boundary}\n`;
          });
          context += '\n';
        } else if (profile.boundaries && typeof profile.boundaries === 'string') {
          context += `BOUNDARIES: ${profile.boundaries}\n\n`;
        }
        
        if (profile.dealBreakers && Array.isArray(profile.dealBreakers) && profile.dealBreakers.length > 0) {
          context += `DEAL BREAKERS (${profile.dealBreakers.length} items):\n`;
          profile.dealBreakers.forEach((dealBreaker, index) => {
            context += `${index + 1}. ${dealBreaker}\n`;
          });
          context += '\n';
        } else if (profile.dealBreakers && typeof profile.dealBreakers === 'string') {
          context += `DEAL BREAKERS: ${profile.dealBreakers}\n\n`;
        }
        
        context += '=== END USER PROFILE ===\n\n';
      } else {
        context += 'User Profile: not set yet. Encourage them to fill out their dating values.\n\n';
      }

      if (activeProspects.length === 0) {
        context += "The user currently has no active dating prospects.";
        return context;
      }

      context += "Current Dating Prospects:\n\n";

      for (const prospect of activeProspects) {
        context += `**${prospect.name}**\n`;
        if (prospect.age) context += `- Age: ${prospect.age}\n`;
        if (prospect.occupation) context += `- Occupation: ${prospect.occupation}\n`;
        if (prospect.whereWeMet) context += `- Where we met: ${prospect.whereWeMet}\n`;
        if (prospect.interests) context += `- Interests: ${prospect.interests}\n`;
        if (prospect.notes) context += `- General notes: ${prospect.notes}\n`;

        // Add timeline notes for this prospect
        const notesRes = await FirestoreService.getNotesForProspect(userId, prospect.id);
        const prospectNotes = notesRes.success ? notesRes.data : [];
        if (prospectNotes.length > 0) {
          context += `- Timeline notes:\n`;
          prospectNotes
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5) // Only include last 5 notes per prospect
            .forEach(note => {
              const date = new Date(note.createdAt).toLocaleDateString();
              context += `  * ${date}: ${note.content}\n`;
            });
        }
        context += "\n";
      }

      return context;
    } catch (error) {
      console.error('Error generating dating context:', error);
      return "Unable to load dating context.";
    }
  }

  static async sendMessage(userMessage, conversationHistory = [], userId) {
    if (!OPENAI_CONFIG.apiKey || OPENAI_CONFIG.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
      throw new Error('Please configure your OpenAI API key in src/config/openai.js');
    }

    try {
      // Generate current dating context
      const datingContext = await this.generateDatingContext(userId);

      // Build messages array
      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'system',
          content: `Here is the user's current dating context:\n\n${datingContext}`,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ];

      // Make API request
      const response = await axios.post(
        OPENAI_CONFIG.apiUrl,
        {
          model: OPENAI_CONFIG.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'OpenAI API error');
      } else {
        throw new Error('Failed to get response from AI. Please try again.');
      }
    }
  }
} 