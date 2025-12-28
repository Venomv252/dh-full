# Emergency Incident Reporting Platform

A comprehensive full-stack emergency incident reporting system that connects citizens with first responders through real-time incident reporting, geolocation services, and multi-role authentication.

## 🚨 Features

- **Multi-Role Authentication**: Support for Citizens, Police, Hospital staff, and Administrators
- **Real-time Incident Reporting**: Fast emergency reporting with media uploads
- **Geolocation Services**: GPS tracking and proximity detection
- **Dark Theme UI**: Modern, professional interface optimized for emergency situations
- **Secure Data Handling**: End-to-end encryption and role-based access control
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## 🏗️ Architecture

### Frontend
- **React 19** with Vite build tool
- **Tailwind CSS v4** for modern styling
- **React Router** for client-side navigation
- **Axios** for API communication
- **Cloudinary** for media management
- **Google Maps** integration for location services

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** authentication system
- **Cloudinary** for media storage
- **Comprehensive security** with Helmet, CORS, rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js (LTS version)
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Venomv252/dh-full.git
   cd dh-full
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the development servers**
   
   **Backend:**
   ```bash
   npm run dev
   ```
   
   **Frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

## 🎯 Current Implementation Status

### ✅ Completed Features

#### Backend Infrastructure
- [x] **Project Setup**: Complete Node.js/Express backend with MongoDB
- [x] **Database Models**: User, Guest, Incident, and AuditLog models with encryption
- [x] **Authentication System**: JWT-based authentication with role management
- [x] **Security Middleware**: Rate limiting, validation, and access control
- [x] **External Integrations**: Cloudinary and Google Maps services
- [x] **Property-Based Testing**: Comprehensive test suite with fast-check

#### Frontend Application
- [x] **Landing Page**: Professional dark theme with role-based login options
- [x] **React Setup**: Modern React 19 with Vite and Tailwind CSS v4
- [x] **Responsive Design**: Mobile-first responsive layout
- [x] **Component Architecture**: Organized component structure with routing

### 🚧 In Development
- [ ] Authentication forms and user registration
- [ ] Incident reporting interface with media upload
- [ ] Interactive maps with location selection
- [ ] Role-specific dashboards (Police, Hospital, Admin)
- [ ] Real-time notifications and updates

## 📁 Project Structure

```
dh-full/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Route-based page components
│   │   ├── services/       # API service functions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React Context providers
│   │   └── utils/          # Utility functions
│   └── package.json
├── src/                     # Backend source code
│   ├── controllers/        # Business logic handlers
│   ├── models/            # Database models and schemas
│   ├── routes/            # API route definitions
│   ├── middleware/        # Custom middleware functions
│   ├── services/          # External service integrations
│   ├── config/            # Configuration files
│   └── utils/             # Utility functions
├── tests/                  # Test suites
│   ├── property/          # Property-based tests
│   ├── unit/              # Unit tests
│   └── utils/             # Test utilities
├── .kiro/                 # Kiro AI specifications
│   └── specs/             # Feature specifications and tasks
└── docs/                  # Documentation
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/emergency-platform
MONGODB_TEST_URI=mongodb://localhost:27017/emergency-platform-test

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Encryption
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# Server
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

The project includes comprehensive testing with both unit tests and property-based tests:

```bash
# Run all tests
npm test

# Run property-based tests
npm run test:property

# Run unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage
```

## 📋 Development Workflow

This project follows a specification-driven development approach using Kiro AI:

1. **Requirements**: Detailed user stories and acceptance criteria
2. **Design**: Comprehensive system architecture and component design
3. **Tasks**: Actionable implementation tasks with property-based testing
4. **Implementation**: Incremental development with continuous testing

View the complete specifications in `.kiro/specs/emergency-incident-platform/`

## 🚀 Deployment

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
npm run build  # If build script exists
```

### Docker Support
Docker configuration files will be added in future updates.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Emergency Notice

**This is a development project. For actual emergencies, always call your local emergency services immediately.**

## 📞 Support

For questions and support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for emergency response and community safety**