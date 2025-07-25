# Dating Journal

A React Native iOS app for managing your dating life, built with Expo.

## Features

- **User Authentication**: Login and signup functionality
- **Personal Dashboard**: Overview of active prospects and upcoming dates
- **Prospects Management**: 
  - Add new prospects with detailed profiles
  - Edit prospect information
  - Move prospects to "graveyard" when no longer dating
  - View all prospects with active/graveyard tabs
- **Timeline Notes**: 
  - Add timestamped notes to track thoughts about each prospect over time
  - View chronological history of notes for each person
  - See note counts on dashboard and prospect cards
  - Delete individual notes as needed
- **Calendar Integration**: 
  - Schedule dates with prospects
  - View upcoming and past dates
  - Add notes and locations to dates
- **LoveAI Chat Assistant** (NEW!): 
  - Personal AI dating advisor powered by GPT-4o
  - Contextual advice based on your prospects and notes
  - Available 24/7 for dating questions and guidance
  - Accessible via tab bar or dashboard card

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Expo Go app on your iPhone
- OpenAI API key (for LoveAI feature)

### Installation

1. Navigate to the project directory:
```bash
cd dating-journal
```

2. Install dependencies (already done):
```bash
npm install
```

### Configuring LoveAI

To use the LoveAI chat feature, you need to add your OpenAI API key:

1. Open `src/config/openai.js`
2. Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key:
```javascript
export const OPENAI_CONFIG = {
  apiKey: 'sk-your-actual-api-key-here',
  model: 'gpt-4o',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
};
```

3. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys) if you don't have one

**⚠️ Important**: Never commit your API key to version control. This is only for local development.

### Running the App

1. Start the development server:
```bash
npm start
```
or
```bash
expo start
```

2. Run on iOS:
   - Press `i` in the terminal to open iOS Simulator
   - Or scan the QR code with Expo Go app on your iPhone

## Project Structure

```
dating-journal/
├── App.js                    # Main app entry point
├── src/
│   ├── screens/             # All app screens
│   │   ├── LoginScreen.js
│   │   ├── SignupScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ProspectsScreen.js
│   │   ├── AddProspectScreen.js
│   │   ├── ProspectDetailScreen.js
│   │   ├── ProspectNotesScreen.js
│   │   ├── CalendarScreen.js
│   │   └── LoveAIChatScreen.js
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.js
│   ├── utils/               # Utilities and contexts
│   │   ├── storage.js       # AsyncStorage service
│   │   └── AuthContext.js   # Authentication context
│   ├── services/            # External services
│   │   └── openaiService.js # OpenAI API integration
│   ├── config/              # Configuration files
│   │   └── openai.js        # OpenAI settings
│   └── components/          # Reusable components (future)
```

## Usage Guide

### First Time Setup
1. Launch the app
2. Create an account using the signup screen
3. You'll be automatically logged in
4. Add your OpenAI API key in `src/config/openai.js` to enable LoveAI

### Managing Prospects
1. From the dashboard, tap "Add" or the "+" button
2. Fill in prospect details (name is required)
3. View all prospects in the Prospects tab
4. Tap on a prospect to view/edit details
5. Move to graveyard when no longer dating

### Timeline Notes
1. From a prospect's detail page, tap "View Timeline Notes"
2. Add notes using the "+" button
3. Notes are timestamped and shown in chronological order
4. Swipe or tap the trash icon to delete individual notes
5. Note counts appear on prospect cards for quick reference

### Scheduling Dates
1. Go to the Calendar tab
2. Select a date on the calendar
3. Tap "Add Date" to schedule
4. Enter prospect name, time, location, and notes
5. View upcoming dates on your dashboard

### Using LoveAI
1. Access via the LoveAI tab or dashboard card
2. Ask any dating-related questions
3. LoveAI has context about all your prospects and notes
4. Get personalized advice based on your situation
5. Examples of questions:
   - "How should I plan my second date with Sarah?"
   - "I'm feeling confused about John and Mike, can you help?"
   - "What are some red flags I should watch for?"
   - "How do I know if I'm ready for a serious relationship?"

## Data Storage

The app uses AsyncStorage for local data persistence. All data is stored on your device and persists between app sessions.

## Customization

- **Colors**: The main theme color (#FF6B6B) can be changed throughout the styles
- **Features**: Additional fields can be added to prospect profiles
- **Calendar**: Date scheduling can be enhanced with notifications
- **LoveAI**: Customize the system prompt in `src/config/openai.js`

## Troubleshooting

If you encounter issues:

1. Clear the Metro cache:
```bash
npx expo start -c
```

2. Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

3. Reset the iOS Simulator:
   - Device → Erase All Content and Settings

4. For LoveAI issues:
   - Verify your API key is correctly set
   - Check your OpenAI account has credits
   - Ensure you have internet connectivity

## Future Enhancements

- Push notifications for upcoming dates
- Photo upload for prospects
- Export/import data functionality
- Cloud sync with user accounts
- Date activity suggestions
- Relationship timeline visualization
- Tags/categories for notes
- Search functionality across notes
- Voice messages in LoveAI chat
- Integration with calendar apps

## Development Notes

- Built with React Native + Expo
- Uses React Navigation for routing
- AsyncStorage for data persistence
- React Context for state management
- OpenAI GPT-4o for AI chat functionality
- No backend required (all data stored locally)

## Security Notes

- Never share your OpenAI API key
- In production, API keys should be stored securely on a backend server
- All data is stored locally on your device 