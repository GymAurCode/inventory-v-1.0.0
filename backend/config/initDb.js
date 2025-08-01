const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class DatabaseInitializer {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  /**
   * Initialize database with proper path handling for different systems
   */
  initializeDatabase() {
    try {
      // Determine database path based on environment
      this.dbPath = this.getDatabasePath();
      
      console.log('Initializing database at:', this.dbPath);
      
      // Ensure directory exists
      this.ensureDirectoryExists();
      
      // Create/connect to database
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables
      this.createTables();
      
      // Initialize with default data
      this.initializeDefaultData();
      
      console.log(`✅ Database initialized successfully at: ${this.dbPath}`);
      return this.db;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }



  /**
   * Get application data path for different operating systems
   */
  getAppDataPath() {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
      case 'darwin':
        return path.join(process.env.HOME, 'Library', 'Application Support');
      case 'linux':
        return process.env.XDG_DATA_HOME || path.join(process.env.HOME, '.local', 'share');
      default:
        return process.env.HOME || process.cwd();
    }
  }

  /**
   * Ensure the database directory exists
   */
  ensureDirectoryExists() {
    const dbDir = path.dirname(this.dbPath);
    
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`📁 Created database directory: ${dbDir}`);
      } catch (error) {
        console.error('❌ Failed to create database directory:', error);
        throw error;
      }
    }
  }

  /**
   * Create all required tables
   */
  createTables() {
    try {
      // Users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('owner', 'staff')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          cost_price DECIMAL(10,2) NOT NULL,
          selling_price DECIMAL(10,2) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          total_cost DECIMAL(10,2) GENERATED ALWAYS AS (cost_price * quantity) STORED,
          total_revenue DECIMAL(10,2) GENERATED ALWAYS AS (selling_price * quantity) STORED,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Expenses table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('manual', 'auto')),
          category TEXT,
          product_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
      `);

      // Income table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS income (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('manual', 'auto')),
          product_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
      `);

      // Partners table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS partners (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          share_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
        CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
        CREATE INDEX IF NOT EXISTS idx_expenses_product_id ON expenses(product_id);
        CREATE INDEX IF NOT EXISTS idx_income_type ON income(type);
        CREATE INDEX IF NOT EXISTS idx_income_created_at ON income(created_at);
        CREATE INDEX IF NOT EXISTS idx_income_product_id ON income(product_id);
        CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);
        CREATE INDEX IF NOT EXISTS idx_partners_created_at ON partners(created_at);
      `);

      console.log('✅ All tables created successfully');
    } catch (error) {
      console.error('❌ Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Initialize default data
   */
  initializeDefaultData() {
    try {
      // Check if default owner accounts exist
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
      
      if (userCount.count === 0) {
        // Create default owner accounts (only 2 allowed)
        const defaultOwners = [
          {
            username: 'owner1',
            password: 'owner123',
            role: 'owner'
          },
          {
            username: 'owner2', 
            password: 'owner123',
            role: 'owner'
          }
        ];

        const insertUser = this.db.prepare(`
          INSERT INTO users (username, password, role) 
          VALUES (?, ?, ?)
        `);

        for (const owner of defaultOwners) {
          const hashedPassword = bcrypt.hashSync(owner.password, 10);
          insertUser.run(owner.username, hashedPassword, owner.role);
        }

        console.log('✅ Default owner accounts created');
        console.log('📝 Default credentials:');
        console.log('   Username: owner1, Password: owner123');
        console.log('   Username: owner2, Password: owner123');
      }

      // Check if default partners exist
      const partnerCount = this.db.prepare('SELECT COUNT(*) as count FROM partners').get();
      
      if (partnerCount.count === 0) {
        // Create default partners
        const defaultPartners = [
          {
            name: 'Partner A',
            share_percentage: 50.00
          },
          {
            name: 'Partner B',
            share_percentage: 50.00
          }
        ];

        const insertPartner = this.db.prepare(`
          INSERT INTO partners (name, share_percentage) 
          VALUES (?, ?)
        `);

        for (const partner of defaultPartners) {
          insertPartner.run(partner.name, partner.share_percentage);
        }

        console.log('✅ Default partners created');
      }

    } catch (error) {
      console.error('❌ Failed to initialize default data:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Get database path
   */
  getDatabasePath() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Development: Use local path
      return path.join(__dirname, '..', 'db', 'database.sqlite');
    } else {
      // Production: Use environment variable or fallback to userData
      if (process.env.DB_PATH) {
        return process.env.DB_PATH;
      } else {
        // Fallback: Use app's user data directory
        const appDataPath = this.getAppDataPath();
        const appFolder = path.join(appDataPath, 'EyercallData');
        return path.join(appFolder, 'database.sqlite');
      }
    }
  }

  /**
   * Close database connection
   */
  closeDatabase() {
    if (this.db) {
      this.db.close();
      console.log('🔒 Database connection closed');
    }
  }

  /**
   * Check database health
   */
  checkDatabaseHealth() {
    try {
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      const expectedTables = ['users', 'products', 'expenses', 'income', 'partners'];
      const existingTables = tables.map(t => t.name);
      
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        console.warn('⚠️ Missing tables:', missingTables);
        return false;
      }

      console.log('✅ Database health check passed');
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  /**
   * Backup database
   */
  backupDatabase(backupPath) {
    try {
      const backupDb = new Database(backupPath);
      this.db.backup(backupDb);
      backupDb.close();
      console.log(`💾 Database backed up to: ${backupPath}`);
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dbInitializer = new DatabaseInitializer();

module.exports = dbInitializer; 