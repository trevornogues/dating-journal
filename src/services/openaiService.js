import axios from 'axios';
import { OPENAI_CONFIG, SYSTEM_PROMPT } from '../config/openai';
import { StorageService } from '../utils/storage';

export class OpenAIService {
  static async generateDatingContext() {
    try {
      // Get all prospects and notes
      const [prospects, allNotes] = await Promise.all([
        StorageService.getProspects(),
        StorageService.getNotes(),
      ]);

      // Filter active prospects only
      const activeProspects = prospects.filter(p => !p.inGraveyard);

      if (activeProspects.length === 0) {
        return "The user currently has no active dating prospects.";
      }

      // Build context string
      let context = "Current Dating Prospects:\n\n";

      for (const prospect of activeProspects) {
        context += `**${prospect.name}**\n`;
        if (prospect.age) context += `- Age: ${prospect.age}\n`;
        if (prospect.occupation) context += `- Occupation: ${prospect.occupation}\n`;
        if (prospect.whereWeMet) context += `- Where we met: ${prospect.whereWeMet}\n`;
        if (prospect.interests) context += `- Interests: ${prospect.interests}\n`;
        if (prospect.notes) context += `- General notes: ${prospect.notes}\n`;

        // Add timeline notes for this prospect
        const prospectNotes = allNotes.filter(note => note.prospectId === prospect.id);
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

  static async sendMessage(userMessage, conversationHistory = []) {
    if (!OPENAI_CONFIG.apiKey || OPENAI_CONFIG.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
      throw new Error('Please configure your OpenAI API key in src/config/openai.js');
    }

    try {
      // Generate current dating context
      const datingContext = await this.generateDatingContext();

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