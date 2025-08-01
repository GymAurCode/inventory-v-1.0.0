const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const expenseRoutes = require('./routes/expenses');
const financeRoutes = require('./routes/finance');
const partnerRoutes = require('./routes/partners');

// Import SQLite database initialization
const dbInitializer = require('./config/initDb');

// Import JSON database initialization used by controllers
const jsonDb = require('./db/init');

const app = express();
const PORT = process.env.PORT || 4000;

// Set development environment if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('Server starting with environment:', process.env.NODE_ENV);
console.log('Database path from env:', process.env.DB_PATH);
console.log('App path from env:', process.env.APP_PATH);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'file://',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database with proper path handling
try {
  // Initialize SQLite DB with environment-specific path
  dbInitializer.initializeDatabase();
  
  // Initialize JSON DB used by AuthController and others
  const jsonDbPath = process.env.DB_PATH || path.join(__dirname, 'db', 'database.json');
  jsonDb.initializeDatabase(jsonDbPath);
  
  console.log('✅ Database initialization completed');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

// Make database available to routes
app.locals.db = dbInitializer.getDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/partners', partnerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbInitializer.getDatabasePath()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Database path: ${dbInitializer.getDatabasePath()}`);
  
  // Send ready message to parent process if running in Electron
  if (process.send) {
    process.send({ type: 'ready' });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  dbInitializer.closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  dbInitializer.closeDatabase();
  process.exit(0);
});

module.exports = app; 