import axios from 'axios';
import { OPENAI_CONFIG, SYSTEM_PROMPT } from '../config/openai';
import { FirestoreService } from './firestoreService';

export class OpenAIService {
  // Helper method to detect if user is asking about a specific prospect
  static extractProspectName(userMessage, prospects) {
    const message = userMessage.toLowerCase();
    const prospectNames = prospects.map(p => p.name.toLowerCase());
    
    // Look for prospect names in the message
    for (const prospectName of prospectNames) {
      if (message.includes(prospectName)) {
        return prospectName;
      }
    }
    
    // Look for common patterns like "with [name]", "about [name]", etc.
    const patterns = [
      /with\s+(\w+)/,
      /about\s+(\w+)/,
      /regarding\s+(\w+)/,
      /for\s+(\w+)/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const potentialName = match[1];
        const foundProspect = prospectNames.find(name => 
          name.includes(potentialName) || potentialName.includes(name)
        );
        if (foundProspect) {
          return foundProspect;
        }
      }
    }
    
    return null;
  }

  static async generateDatingContext(userId, specificProspectName = null) {
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
      
      // Load dates for RAG context
      const datesResult = await FirestoreService.getDates(userId);
      const allDates = datesResult.success ? datesResult.data : [];

      // Context size management
      const MAX_PROSPECTS_FOR_GENERAL_QUERY = 8; // Limit for general queries
      const MAX_DATES_PER_PROSPECT = 5; // Reduce from 10 for context management
      const MAX_NOTES_PER_PROSPECT = 3; // Reduce from 5 for context management

      // Build context string with profile and latest notes per prospect
      let context = '';
      if (profile) {
        context += '=== USER DATING PROFILE ===\n';
        context += 'Use this information to provide personalized dating advice:\n\n';
        
        // Personal Information
        if (profile.firstName || profile.lastName) {
          context += `NAME: ${profile.firstName || ''} ${profile.lastName || ''}\n`;
        }
        if (profile.age) {
          context += `AGE: ${profile.age} years old\n`;
        }
        if (profile.birthday) {
          context += `BIRTHDAY: ${profile.birthday}\n`;
        }
        if (profile.city || profile.state) {
          const location = [profile.city, profile.state].filter(Boolean).join(', ');
          context += `LOCATION: ${location}\n`;
        }
        if (profile.occupation) {
          context += `OCCUPATION: ${profile.occupation}\n`;
        }
        if (profile.interests) {
          context += `INTERESTS & HOBBIES: ${profile.interests}\n`;
        }
        context += '\n';
        
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

      // Filter prospects if specific prospect requested
      let prospectsToInclude = activeProspects;
      if (specificProspectName) {
        prospectsToInclude = activeProspects.filter(p => 
          p.name.toLowerCase().includes(specificProspectName.toLowerCase())
        );
      } else {
        // For general queries, limit the number of prospects to prevent context overflow
        prospectsToInclude = activeProspects.slice(0, MAX_PROSPECTS_FOR_GENERAL_QUERY);
        if (activeProspects.length > MAX_PROSPECTS_FOR_GENERAL_QUERY) {
          // Sort by most recent activity (prospects with recent dates or notes)
          prospectsToInclude.sort((a, b) => {
            const aDates = allDates.filter(d => d.prospectName === a.name).length;
            const bDates = allDates.filter(d => d.prospectName === b.name).length;
            return bDates - aDates;
          });
        }
      }

      context += "Current Dating Prospects:\n\n";

      for (const prospect of prospectsToInclude) {
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
            .slice(0, MAX_NOTES_PER_PROSPECT) // Limit notes per prospect
            .forEach(note => {
              const date = new Date(note.createdAt).toLocaleDateString();
              context += `  * ${date}: ${note.content}\n`;
            });
        }

        // RAG: Add pre and post-date notes for this prospect
        const prospectDates = allDates.filter(date => 
          date.prospectName && date.prospectName.toLowerCase() === prospect.name.toLowerCase()
        );
        
        if (prospectDates.length > 0) {
          context += `- Date History:\n`;
          prospectDates
            .sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date))
            .slice(0, MAX_DATES_PER_PROSPECT) // Limit dates per prospect
            .forEach(date => {
              const dateStr = new Date(date.dateTime || date.date).toLocaleDateString();
              const timeStr = new Date(date.dateTime || date.date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });
              
              context += `  * ${dateStr} at ${timeStr}`;
              if (date.location) context += ` (${date.location})`;
              context += `\n`;
              
              if (date.preDateNotes) {
                context += `    Pre-date thoughts: ${date.preDateNotes}\n`;
              }
              if (date.postDateNotes) {
                context += `    Post-date reflection: ${date.postDateNotes}\n`;
              }
            });
        }
        context += "\n";
      }

      // Add context size warning if needed
      if (!specificProspectName && activeProspects.length > MAX_PROSPECTS_FOR_GENERAL_QUERY) {
        context += `\nNote: Showing data for your ${MAX_PROSPECTS_FOR_GENERAL_QUERY} most active prospects. You have ${activeProspects.length} total prospects. For specific advice about other prospects, mention their name in your question.\n`;
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
      // Get prospects for intelligent RAG
      const prospectsResult = await FirestoreService.getProspects(userId);
      const prospects = prospectsResult.success ? prospectsResult.data : [];
      const activeProspects = prospects.filter(p => !p.inGraveyard);
      
      // Detect if user is asking about a specific prospect
      const specificProspectName = this.extractProspectName(userMessage, activeProspects);
      
      // Generate current dating context with RAG
      const datingContext = await this.generateDatingContext(userId, specificProspectName);

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
          max_tokens: 1000,
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

  static async sendMessageStream(userMessage, conversationHistory = [], userId, onChunk) {
    if (!OPENAI_CONFIG.apiKey || OPENAI_CONFIG.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
      throw new Error('Please configure your OpenAI API key in src/config/openai.js');
    }

    // Get prospects for intelligent RAG
    const prospectsResult = await FirestoreService.getProspects(userId);
    const prospects = prospectsResult.success ? prospectsResult.data : [];
    const activeProspects = prospects.filter(p => !p.inGraveyard);
    
    // Detect if user is asking about a specific prospect
    const specificProspectName = this.extractProspectName(userMessage, activeProspects);
    
    // Generate current dating context with RAG
    const datingContext = await this.generateDatingContext(userId, specificProspectName);

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

    try {
      // React Native can't stream, so we'll get the full response and simulate streaming
      const response = await fetch(OPENAI_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.model,
          messages: messages,
          max_tokens: 1000,
          stream: false, // Get full response instead of streaming
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', errorData);
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const fullResponse = data.choices?.[0]?.message?.content || '';

      // Fake streaming: send chunked words
      const words = fullResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        onChunk(i > 0 ? ' ' + words[i] : words[i]);
        await new Promise(r => setTimeout(r, 30));
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error('Failed to get response from AI. Please try again.');
      }
    }
  }
} 