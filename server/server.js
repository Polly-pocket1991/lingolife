const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Helper function to validate UUID format
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Check if Supabase is configured
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUPABASE_CONFIGURED = SUPABASE_URL && SUPABASE_ANON_KEY;

let supabase = null;
let mockWords = [];

if (SUPABASE_CONFIGURED) {
  console.log('Attempting to connect to Supabase...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Successfully connected to Supabase!');
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
    console.log('Falling back to mock data mode.');
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('LingoLife Backend API is running!');
});

// Helper function to get words from either Supabase or mock data
const getWordsFromSource = async (userId = 'default_user') => {
  if (supabase && SUPABASE_CONFIGURED) {
    try {
      // Convert string userId to UUID format if needed
      let formattedUserId = userId;
      if (typeof userId === 'string' && !isUUID(userId)) {
        // If it's not a UUID, we might be using a placeholder
        // For compatibility, we'll try to handle both cases
        formattedUserId = userId === 'default_user' ? '12345678-1234-1234-1234-123456789012' : userId;
      }

      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', formattedUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching words from Supabase:', error);
        return [];
      }
      return data;
    } catch (error) {
      console.error('Unexpected error fetching words from Supabase:', error);
      return [];
    }
  } else {
    // Return mock data if Supabase isn't configured
    return mockWords.filter(word => word.user_id === userId);
  }
};

// Helper function to add word to either Supabase or mock data
const addWordToSource = async (wordData) => {
  if (supabase && SUPABASE_CONFIGURED) {
    try {
      // Ensure user_id is in UUID format
      let formattedWordData = {...wordData};
      if (typeof wordData.user_id === 'string' && !isUUID(wordData.user_id)) {
        formattedWordData.user_id = wordData.user_id === 'default_user' ? '12345678-1234-1234-1234-123456789012' : wordData.user_id;
      }

      const { data, error } = await supabase
        .from('words')
        .insert([formattedWordData])
        .select()
        .single();

      if (error) {
        console.error('Error adding word to Supabase:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Unexpected error adding word to Supabase:', error);
      throw error;
    }
  } else {
    // Add to mock data if Supabase isn't configured
    const newWord = {
      ...wordData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    mockWords.push(newWord);
    return newWord;
  }
};

// Helper function to update word stats
const updateWordStatsInSource = async (wordId, updates, userId) => {
  if (supabase && SUPABASE_CONFIGURED) {
    try {
      // Convert string userId to UUID format if needed
      let formattedUserId = userId;
      if (typeof userId === 'string' && !isUUID(userId)) {
        formattedUserId = userId === 'default_user' ? '12345678-1234-1234-1234-123456789012' : userId;
      }

      const { data, error } = await supabase
        .from('words')
        .update(updates)
        .eq('id', wordId)
        .eq('user_id', formattedUserId)
        .select()
        .single();

      if (error) {
        console.error('Error updating word in Supabase:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Unexpected error updating word in Supabase:', error);
      throw error;
    }
  } else {
    // Update mock data if Supabase isn't configured
    const wordIndex = mockWords.findIndex(w => w.id === wordId && w.user_id === userId);
    if (wordIndex !== -1) {
      mockWords[wordIndex] = { ...mockWords[wordIndex], ...updates };
      return mockWords[wordIndex];
    } else {
      throw new Error('Word not found');
    }
  }
};

// API endpoints
app.get('/api/words', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';
    const words = await getWordsFromSource(userId);
    res.json(words);
  } catch (error) {
    console.error('Error in GET /api/words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

app.post('/api/words', async (req, res) => {
  try {
    const { userId = 'default_user', term, phonetic, translation, partOfSpeech, definition } = req.body;

    if (!term || !translation) {
      return res.status(400).json({ error: 'Term and translation are required' });
    }

    const wordData = {
      user_id: userId,
      term,
      phonetic: phonetic || '',
      translation,
      part_of_speech: partOfSpeech || '',
      definition: definition || '',
      known_count: 0,
      unknown_count: 0
    };

    const newWord = await addWordToSource(wordData);
    res.status(201).json(newWord);
  } catch (error) {
    console.error('Error in POST /api/words:', error);
    res.status(500).json({ error: 'Failed to add word' });
  }
});

app.put('/api/words/:wordId', async (req, res) => {
  try {
    const { wordId } = req.params;
    const { known, userId = 'default_user' } = req.body;

    if (typeof known !== 'boolean') {
      return res.status(400).json({ error: 'Known status is required (true/false)' });
    }

    // Get current word data to update counters
    let currentWord;
    if (supabase && SUPABASE_CONFIGURED) {
      // Convert string userId to UUID format if needed
      let formattedUserId = userId;
      if (typeof userId === 'string' && !isUUID(userId)) {
        formattedUserId = userId === 'default_user' ? '12345678-1234-1234-1234-123456789012' : userId;
      }

      const { data, error } = await supabase
        .from('words')
        .select('known_count, unknown_count')
        .eq('id', wordId)
        .eq('user_id', formattedUserId)
        .single();

      if (error) {
        console.error('Error fetching current word:', error);
        return res.status(500).json({ error: error.message });
      }
      currentWord = data;
    } else {
      const word = mockWords.find(w => w.id === wordId && w.user_id === userId);
      if (!word) {
        return res.status(404).json({ error: 'Word not found' });
      }
      currentWord = word;
    }

    const updatedKnownCount = known ? currentWord.known_count + 1 : currentWord.known_count;
    const updatedUnknownCount = known ? currentWord.unknown_count : currentWord.unknown_count + 1;

    const updates = {
      known_count: updatedKnownCount,
      unknown_count: updatedUnknownCount,
      last_reviewed_at: new Date().toISOString()
    };

    const updatedWord = await updateWordStatsInSource(wordId, updates, userId);
    res.json(updatedWord);
  } catch (error) {
    console.error('Error in PUT /api/words/:wordId:', error);
    res.status(500).json({ error: 'Failed to update word stats' });
  }
});

app.get('/api/words/review', async (req, res) => {
  try {
    const userId = req.query.userId || 'default_user';
    
    // Get words that need review (for now, just return the user's words)
    const words = await getWordsFromSource(userId);
    res.json(words.slice(0, 10)); // Limit to 10 words for review
  } catch (error) {
    console.error('Error in GET /api/words/review:', error);
    res.status(500).json({ error: 'Failed to fetch words for review' });
  }
});

// Youdao Dictionary API proxy endpoint
const crypto = require('crypto');

// Helper function to truncate string for Youdao API
const truncate = (q) => {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
};

app.get('/api/dictionary/youdao', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    // Try to use Youdao Dictionary JSON API first (free, no auth required)
    try {
      const dictUrl = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(q)}&jsonversion=2`;
      console.log('Calling Youdao Dictionary API:', dictUrl);
      
      const dictResponse = await fetch(dictUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (dictResponse.ok) {
        const dictData = await dictResponse.json();
        console.log('Youdao Dictionary API response:', dictData);
        
        // Extract phonetic and other info from dictionary API response
        const ec = dictData.ec;
        if (ec && ec.word && ec.word.length > 0) {
          const wordData = ec.word[0];
          const phonetic = wordData.ukphone || wordData.usphone || wordData.phone || '';
          const ukPhonetic = wordData.ukphone || '';
          const usPhonetic = wordData.usphone || '';
          
          // Extract translations
          let translation = '';
          let definition = '';
          let partOfSpeech = '';
          
          if (wordData.trs && wordData.trs.length > 0) {
            const trs = wordData.trs;
            translation = trs.map((tr) => {
              if (tr.tr && tr.tr.length > 0) {
                return tr.tr.map((t) => t.l && t.l.i ? t.l.i.join('') : '').join('');
              }
              return '';
            }).filter((t) => t).join('; ');
            
            // Get first translation as definition
            definition = translation;
            
            // Try to extract part of speech
            if (trs[0].pos) {
              partOfSpeech = trs[0].pos;
            }
          }
          
          // Extract examples from web_trans
          const examples = [];
          if (dictData.web_trans && dictData.web_trans.web_translation) {
            const webTrans = dictData.web_trans.web_translation;
            webTrans.forEach((item) => {
              if (item.key && item.trans) {
                examples.push({
                  key: item.key,
                  value: item.trans.split('\n').filter((t) => t.trim())
                });
              }
            });
          }
          
          return res.json({
            errorCode: '0',
            query: q,
            translation: translation ? [translation] : [],
            basic: {
              phonetic: phonetic,
              'uk-phonetic': ukPhonetic,
              'us-phonetic': usPhonetic,
              explains: wordData.trs ? wordData.trs.map((tr) => {
                const pos = tr.pos ? `${tr.pos}. ` : '';
                const trans = tr.tr ? tr.tr.map((t) => t.l && t.l.i ? t.l.i.join('') : '').join('') : '';
                return pos + trans;
              }).filter((e) => e) : []
            },
            web: examples.slice(0, 3)
          });
        }
      }
    } catch (dictError) {
      console.log('Dictionary API failed, falling back to translation API:', dictError);
    }
    
    // Fallback to translation API
    const appKey = process.env.YOUDAO_APP_KEY;
    const appSecret = process.env.YOUDAO_APP_SECRET;
    
    if (!appKey || !appSecret) {
      return res.status(500).json({ error: 'Youdao API credentials not configured' });
    }
    
    const from = 'en';
    const to = 'zh-CHS';
    const salt = Date.now().toString();
    const curtime = Math.round(Date.now() / 1000).toString();
    
    // Generate SHA-256 sign
    const str = appKey + truncate(q) + salt + curtime + appSecret;
    const sign = crypto.createHash('sha256').update(str).digest('hex');
    
    // Build request URL
    const params = new URLSearchParams({
      q: q,
      from: from,
      to: to,
      appKey: appKey,
      salt: salt,
      sign: sign,
      signType: 'v3',
      curtime: curtime
    });
    
    const url = `https://openapi.youdao.com/api?${params.toString()}`;
    console.log('Calling Youdao Translation API:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Youdao Translation API response:', data);
    
    res.json(data);
  } catch (error) {
    console.error('Error calling Youdao API:', error);
    res.status(500).json({ error: 'Failed to fetch from Youdao API', details: error.message });
  }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    if (supabase && SUPABASE_CONFIGURED) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${username},email.eq.${email}`)
        .single();

      if (existingUser) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          username,
          email,
          password_hash: passwordHash
        }])
        .select('id, username, email, created_at')
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        user: newUser,
        token
      });
    } else {
      // Mock mode - store in memory
      res.status(201).json({
        message: 'User created successfully (mock mode)',
        user: { id: 'mock_' + Date.now(), username, email },
        token: 'mock_token_' + Date.now()
      });
    }
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (supabase && SUPABASE_CONFIGURED) {
      // Find user by username
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, password_hash')
        .eq('username', username)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      });
    } else {
      // Mock mode
      res.json({
        message: 'Login successful (mock mode)',
        user: { id: 'mock_user', username, email: username + '@example.com' },
        token: 'mock_token_' + Date.now()
      });
    }
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.userId,
        username: req.user.username,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  if (SUPABASE_CONFIGURED) {
    console.log('Connected to Supabase database');
    
    // Try to initialize the database with sample data if the table is empty
    try {
      const { data, error } = await supabase.from('words').select('id').limit(1);
      
      if (error) {
        console.log('Could not check words table existence:', error.message);
        console.log('Make sure you have created the words table in your Supabase project.');
      } else if (data && data.length === 0) {
        // Table exists but is empty, add sample words
        console.log('Words table is empty, adding sample words...');
        const sampleWords = [
          {
            user_id: 'default_user',
            term: 'word',
            phonetic: '/wɜːrd/',
            translation: '词；话语；诺言',
            part_of_speech: 'noun',
            definition: 'A single distinct meaningful element of speech or writing, used with others to form a sentence.',
            known_count: 0,
            unknown_count: 0
          },
          {
            user_id: 'default_user',
            term: 'super',
            phonetic: '/ˈsuːpər/',
            translation: '超级的；极好的',
            part_of_speech: 'adjective',
            definition: 'Better, greater, or larger than average or standard.',
            known_count: 0,
            unknown_count: 0
          }
        ];
        
        for (const word of sampleWords) {
          try {
            await supabase.from('words').insert([word]);
            console.log(`Added sample word: ${word.term}`);
          } catch (insertError) {
            console.error(`Error adding sample word ${word.term}:`, insertError.message);
          }
        }
      } else {
        console.log('Words table already has data, skipping sample data insertion.');
      }
    } catch (initError) {
      console.error('Error initializing database:', initError.message);
    }
  } else {
    console.log('WARNING: Supabase not configured. Using mock data for testing only.');
    console.log('To use Supabase, set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.');
    
    // Initialize mock data with the sample words
    mockWords = [
      {
        id: '1',
        user_id: 'default_user',
        term: 'word',
        phonetic: '/wɜːrd/',
        translation: '词；话语；诺言',
        part_of_speech: 'noun',
        definition: 'A single distinct meaningful element of speech or writing, used with others to form a sentence.',
        known_count: 5,
        unknown_count: 1,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: 'default_user',
        term: 'super',
        phonetic: '/ˈsuːpər/',
        translation: '超级的；极好的',
        part_of_speech: 'adjective',
        definition: 'Better, greater, or larger than average or standard.',
        known_count: 3,
        unknown_count: 0,
        created_at: new Date().toISOString()
      }
    ];
  }
});