# Backend API Documentation

## Overview

This is a complete full-stack Electron desktop application backend built with Node.js, Express, and SQLite. The application provides comprehensive financial management, inventory tracking, and partner profit sharing capabilities.

## Architecture

### Controllers
- **AuthController** - User authentication and management
- **ProductController** - Product/inventory management with automatic financial tracking
- **ExpenseController** - Expense tracking with filtering and statistics
- **FinanceController** - Financial overview, income management, and reporting
- **PartnerController** - Partner management and profit sharing calculations

### Models
- **User** - User management with password hashing and validation
- **Product** - Product management with automatic expense/income tracking
- **Expense** - Expense tracking with categorization and filtering
- **Income** - Income tracking with product association
- **Partner** - Partner management with profit sharing calculations

## Database Schema

### Tables
1. **users** - User authentication and roles
2. **products** - Inventory management
3. **expenses** - Financial expense tracking
4. **income** - Revenue tracking
5. **partners** - Partner profit sharing

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - Register new user (Owner only)
- `GET /me` - Get current user info
- `GET /users` - Get all users (Owner only)
- `DELETE /users/:id` - Delete user (Owner only)
- `PUT /password` - Update password

### Products (`/api/products`)
- `GET /` - Get all products
- `GET /:id` - Get single product
- `POST /` - Create product (with auto expense/income)
- `PUT /:id` - Update product
- `DELETE /:id` - Delete product
- `GET /stats` - Get product statistics
- `GET /search` - Search products

### Expenses (`/api/expenses`)
- `GET /` - Get all expenses (with filtering)
- `GET /:id` - Get single expense
- `POST /` - Create expense
- `PUT /:id` - Update expense
- `DELETE /:id` - Delete expense
- `GET /stats/summary` - Get expense statistics
- `GET /categories` - Get expense categories
- `GET /export` - Export expenses to CSV

### Finance (`/api/finance`)
- `GET /overview` - Get financial overview
- `GET /income` - Get income details
- `POST /income` - Create manual income entry
- `GET /stats` - Get financial statistics
- `GET /profit-loss` - Get profit and loss statement
- `GET /cash-flow` - Get cash flow analysis
- `GET /export` - Export financial report

### Partners (`/api/partners`)
- `GET /` - Get all partners
- `GET /profit-sharing` - Get partner profit sharing
- `POST /` - Create partner
- `PUT /:id` - Update partner
- `DELETE /:id` - Delete partner
- `GET /stats` - Get partner statistics
- `GET /profit-history` - Get partner profit history
- `GET /export` - Export partner report

## Features

### Financial Management
- **Automatic Tracking**: Product creation/updates automatically generate expense and income entries
- **Profit Calculations**: Automatic net profit, donation (2%), and partner profit calculations
- **Comprehensive Reporting**: Profit & loss statements, cash flow analysis, and financial exports
- **Filtering & Statistics**: Date range filtering, category analysis, and trend reporting

### Inventory Management
- **Product Tracking**: Cost price, selling price, quantity, and automatic calculations
- **Low Stock Alerts**: Automatic detection of products with low inventory
- **Revenue Analysis**: Top products by revenue and profit margin calculations
- **Search Functionality**: Product search and filtering capabilities

### Partner Management
- **Profit Sharing**: Automatic calculation of partner shares based on percentages
- **Share Validation**: Ensures total share percentages don't exceed 100%
- **Historical Analysis**: Partner profit history and trend analysis
- **Export Capabilities**: CSV export for partner reports

### User Management
- **Role-Based Access**: Owner and staff roles with different permissions
- **Secure Authentication**: JWT-based authentication with password hashing
- **User Limits**: Maximum 2 owner accounts enforced
- **Password Management**: Secure password updates and validation

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Role-Based Authorization**: Different access levels for owners and staff
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection Prevention**: Parameterized queries throughout

## Error Handling

- **Comprehensive Validation**: Input validation with detailed error messages
- **Database Error Handling**: Proper error handling for database operations
- **HTTP Status Codes**: Appropriate status codes for different scenarios
- **Error Logging**: Detailed error logging for debugging

## Usage Examples

### Creating a Product
```javascript
// Automatically creates expense and income entries
const product = await Product.create({
  name: "Sample Product",
  cost_price: 50.00,
  selling_price: 100.00,
  quantity: 10
});
```

### Getting Financial Overview
```javascript
const overview = await FinanceController.getFinancialOverview({
  startDate: "2024-01-01",
  endDate: "2024-12-31"
});
```

### Partner Profit Sharing
```javascript
const profitSharing = await PartnerController.getPartnerProfitSharing({
  startDate: "2024-01-01",
  endDate: "2024-12-31"
});
```

## Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
npm install
```

### Running the Server
```bash
npm start
```

### Environment Variables
- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - JWT secret key
- `NODE_ENV` - Environment (development/production)

## Database

The application uses SQLite with better-sqlite3 for:
- **Performance**: Fast read/write operations
- **Simplicity**: No separate database server required
- **Reliability**: ACID compliance and data integrity
- **Portability**: Single file database

## Contributing

1. Follow the existing code structure
2. Add comprehensive validation
3. Include error handling
4. Write clear documentation
5. Test thoroughly before submitting

## License

This project is proprietary software. 