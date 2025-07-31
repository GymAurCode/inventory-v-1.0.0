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

// Import SQLite database initialization (currently unused by controllers)
const dbInitializer = require('./config/initDb');

// Import JSON database initialization used by controllers (Auth, etc.)
const jsonDb = require('./db/init');

const app = express();
const PORT = process.env.PORT || 4000;

// Set development environment if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'file://',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
// Initialize SQLite DB (not yet used by controllers)
dbInitializer.initializeDatabase();

// Initialize JSON DB used by AuthController and others (creates default owner accounts)
jsonDb.initializeDatabase(path.join(__dirname, 'db', 'database.json'));

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
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Database path: ${dbInitializer.getDatabasePath()}`);
});

module.exports = app; 