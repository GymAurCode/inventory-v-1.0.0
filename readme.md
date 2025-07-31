# Eyercall Technology - Desktop Application

A fully functional, standalone desktop application for Eyercall Technology's Water Purification & Beverage Distribution business.

## 🚀 Features

### 🔐 Authentication
- **Owner Accounts**: Only 2 owners can register (enforced via code)
- **Staff Accounts**: Unlimited staff accounts allowed
- **Role-based Access**:
  - Owner: Full access to all features
  - Staff: Can only view/add Products & Expenses
- **JWT-based Authentication** with token in localStorage
- **Auto-login support** on app restart
- **Password hashing** via bcryptjs

### 📦 Product Management
- **Add/Edit/Delete Products** with full CRUD operations
- **Auto Calculations**:
  - Total Cost = Cost Price × Quantity
  - Total Revenue = Selling Price × Quantity
- **Auto Entry**: Automatic expense and income entries when products are added/updated
- **Real-time Inventory Table** with edit/delete functionality
- **Inventory updates** reflected across all modules

### 💸 Expense Tracking
- **Manual or Auto entries**:
  - Manual: rent, fuel, bills, etc.
  - Auto: product-related costs
- **Data filtering** by type or date
- **All entries reflected** in Finance Module
- **Tabular format** with comprehensive details

### 📊 Financial Overview
- **Summary Dashboard**:
  - Total Income
  - Total Expenses
  - Net Profit = Income - Expenses
- **Automatic Calculations**:
  - 2% Donation auto deducted
  - 50/50 Partner Profit Split
- **Filtering**: Monthly, Quarterly, Yearly views
- **Export functionality**: PDF and Excel reports

### 🤝 Partner Management
- **Owner-only access**
- **Partner profit sharing** calculations
- **Share percentage management**
- **Export capabilities**

### 💻 Desktop Features
- **Electron.js** desktop application
- **Fully offline** operation
- **Auto database setup** on first launch
- **Safe database storage** in APPDATA folder
- **Professional UI/UX** with TailwindCSS
- **Dark/Light mode** toggle
- **Toast notifications** for user feedback
- **Smooth page transitions**

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js (Vite) + TailwindCSS |
| Backend | Node.js + Express.js |
| Database | better-sqlite3 (fully embedded) |
| Desktop App | Electron.js |
| Reporting | pdfkit, exceljs |
| Auth Hashing | bcryptjs |
| Packaging | electron-builder (.exe) |
| State Mgmt | React Context + LocalStorage |

## 📁 Project Structure

```
/Project v1
├── /frontend                 
│   ├── /src
│   │   ├── /pages           # Dashboard, Login, Products, Expenses, Finance, Partners, Users
│   │   ├── /components      # Layout, Modals, etc.
│   │   ├── /contexts        # Auth & Theme Context
│   │   └── App.jsx
│   ├── /public
│   └── package.json
├── /backend
│   ├── /routes              # API routes
│   ├── /middleware          # JWT, role guards
│   ├── /db                  # Database initialization
│   └── server.js
├── /electron
│   ├── main.js             # Main process
│   └── preload.js          # Preload script
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd project-v1
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Return to root
cd ..
```

3. **Development Mode**
```bash
# Start all services (frontend, backend, electron)
npm run dev
```

4. **Build for Production**
```bash
# Build the application
npm run build

# Create executable
npm run dist:win
```

## 🔧 Configuration

### Default Accounts
The application creates two default owner accounts on first run:
- **Username**: `owner1`, **Password**: `owner123`
- **Username**: `owner2`, **Password**: `owner123`

### Database Location
The SQLite database is automatically created at:
- **Windows**: `%APPDATA%/EyercallData/inventory.db`
- **Development**: `backend/db/database.db`

## 📊 Business Logic

### Financial Calculations
1. **Net Profit** = Total Income - Total Expenses
2. **Donation** = Net Profit × 2%
3. **Partner Profit** = Net Profit - Donation
4. **Partner A Share** = Partner Profit × 50%
5. **Partner B Share** = Partner Profit × 50%

### Product Management
- When a product is added/updated, automatic expense and income entries are created
- Product costs are tracked as expenses
- Product revenue is tracked as income
- All calculations are real-time and reflected across modules

## 🎨 UI/UX Features

- **Modern, responsive design** with TailwindCSS
- **Dark/Light mode** toggle
- **Toast notifications** for user feedback
- **Smooth page transitions**
- **Professional icons** (Lucide React)
- **Sidebar navigation** with active route highlighting
- **Currency formatting** in Pakistani Rupees (Rs)
- **Mobile-responsive** design

## 📤 Export Features

All major pages include export functionality:
- **PDF Export** using pdfkit
- **Excel Export** using exceljs
- **Proper filenames**: `products_2025_07_31.pdf`, etc.
- **Export buttons** positioned in top-right

## 🔒 Security Features

- **Password hashing** with bcryptjs
- **JWT tokens** stored in localStorage
- **Role-based route protection** on API
- **Database stored** in secure APPDATA location
- **Token expiration** handling
- **Session management**

## 🚀 Packaging

The application is packaged using electron-builder:
- **Output**: `dist/Eyercall Setup.exe`
- **Auto-install** functionality
- **Fully offline** operation
- **No missing DB errors**
- **Works on fresh PC installations**

## 🧪 Development

### Available Scripts
```bash
# Development
npm run dev              # Start all services
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only
npm run dev:electron     # Start electron only

# Building
npm run build            # Build frontend and backend
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Distribution
npm run dist             # Build and package
npm run dist:win         # Build for Windows
npm run pack             # Package without building
```

### Environment Variables
```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
JWT_SECRET=your-secret-key
```

## 🔮 Future Enhancements

- QR Code on water bottles
- Customer orders & delivery module
- Mobile App for Owners (React Native / Flutter)
- D3/Chart.js based analytics dashboard
- Advanced reporting features
- Multi-language support

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please contact the development team.

---

**Eyercall Technology** - Water Purification & Beverage Distribution Management System