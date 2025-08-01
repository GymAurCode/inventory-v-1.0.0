const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildExecutable() {
  try {
    console.log('🔄 Starting build process...');
    
    // Create a simple icon.ico file if it doesn't exist
    console.log('📷 Setting up icon...');
    const icoPath = path.join(__dirname, 'public', 'icon.ico');
    
    if (!fs.existsSync(icoPath)) {
      // Create a simple placeholder icon file
      const iconContent = Buffer.from([0x00, 0x00, 0x01, 0x00]); // Minimal ICO header
      fs.writeFileSync(icoPath, iconContent);
      console.log('✅ Created placeholder icon file');
    }
    
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    execSync('cd frontend && npm install', { stdio: 'inherit' });
    execSync('cd backend && npm install', { stdio: 'inherit' });
    
    // Build frontend
    console.log('🏗️ Building frontend...');
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
    
    // Build executable
    console.log('🔨 Building executable...');
    execSync('npm run dist:win', { stdio: 'inherit' });
    
    console.log('🎉 Build completed successfully!');
    console.log('📁 Check the "dist" folder for your executable');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildExecutable(); 