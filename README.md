# LingoLife - Vocabulary Learning App

A full-stack vocabulary learning application with React frontend and Node.js/Express backend, integrated with Supabase for data persistence.

## Features

- **Add New Words**: Look up definitions using Google GenAI and add to your vocabulary
- **Review System**: Spaced repetition flashcard system to review words
- **Progress Tracking**: Track your learning progress with statistics
- **User Profile**: View your saved words and statistics

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Google GenAI for word definitions
- **State Management**: React hooks

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lingolife
```

2. Install frontend dependencies:
```bash
npm install
```

3. Navigate to the server directory and install backend dependencies:
```bash
cd server
npm install
```

### Configuration

#### Frontend Configuration

Create a `.env` file in the root directory (`/lingolife/.env`) with the following:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GEMINI_API_KEY=your_google_genai_api_key_here
```

#### Backend Configuration

Create a `.env` file in the server directory (`/lingolife/server/.env`) with the following:

```env
# Supabase Configuration (optional for production, required for Supabase integration)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5000
```

> Note: If Supabase credentials are not provided, the application will run with mock data for testing purposes.

### Running the Application

1. **Start the backend server:**
```bash
cd server
npm start
```
The backend server will run on `http://localhost:5000`

2. **Start the frontend development server:**
In a new terminal, navigate to the root directory:
```bash
cd lingolife
npm run dev
```
The frontend will run on `http://localhost:3000`

3. Open your browser and visit `http://localhost:3000`

### API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/words?userId=:userId` - Get all words for a user
- `POST /api/words` - Add a new word to the user's vocabulary
- `PUT /api/words/:wordId` - Update word statistics (known/unknown counts)
- `GET /api/words/review?userId=:userId` - Get words for review

### Database Schema

If using Supabase, the application creates the following table:

```sql
CREATE TABLE words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    term TEXT NOT NULL,
    phonetic TEXT,
    translation TEXT NOT NULL,
    part_of_speech TEXT,
    definition TEXT,
    known_count INTEGER DEFAULT 0,
    unknown_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE
);
```

### Development

For development, both frontend and backend need to be running simultaneously. The frontend expects the backend to be available at the URL specified in `VITE_API_BASE_URL`.

### Deployment

For production deployment:

1. Set up Supabase with the schema provided in `server/schema.sql`
2. Configure proper environment variables
3. Build the frontend with `npm run build` and serve the static files
4. Deploy the backend server with appropriate environment configurations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request