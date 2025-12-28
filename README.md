# Emergency Incident Reporting Platform

A comprehensive Node.js backend system for emergency incident reporting and management with geolocation support, role-based access control, and robust security measures.

## 🚨 Features

- **User Management**: Complete user registration with medical profiles and emergency contacts
- **Guest Access**: Anonymous reporting with action limits
- **Incident Reporting**: Geolocation-based emergency incident reporting
- **Role-Based Access**: Multi-level permissions (guest, user, admin, hospital)
- **Geospatial Queries**: Location-based incident searching and filtering
- **Security**: Rate limiting, input validation, data encryption
- **Real-time Updates**: Incident status tracking and upvoting system

## 🛠 Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: Joi
- **Encryption**: bcrypt, crypto
- **Testing**: Jest, Supertest, fast-check

## 📋 Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd emergency-incident-platform
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start MongoDB

```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Run the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 5. Verify Installation

Visit `http://localhost:3000/health` to confirm the API is running.

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints (To be implemented)

- `POST /api/guest/create` - Create guest user
- `POST /api/user/register` - Register new user
- `POST /api/incidents` - Report new incident
- `GET /api/incidents` - List incidents with filtering
- `GET /api/incidents/:id` - Get incident details
- `POST /api/incidents/:id/upvote` - Upvote incident
- `GET /api/admin/incidents` - Admin incident management

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏗 Project Structure

```
src/
├── controllers/     # Business logic handlers
├── models/         # Mongoose schemas and models
├── routes/         # API route definitions
├── middleware/     # Custom middleware functions
├── config/         # Configuration files
├── utils/          # Utility functions
└── app.js          # Main application file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/emergency-incident-platform` |
| `JWT_SECRET` | JWT signing secret | Required |
| `ENCRYPTION_KEY` | Data encryption key | Required |

### Security Configuration

- **Rate Limiting**: Different limits for guest/user/admin roles
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers enabled
- **Input Validation**: Joi schema validation
- **Data Encryption**: Sensitive field encryption

## 🔒 Security Features

- JWT-based authentication (prepared)
- Role-based access control
- Rate limiting by user type
- Input sanitization and validation
- Sensitive data encryption
- Security headers (Helmet.js)
- CORS protection

## 📊 Database Schema

### User Model
- Personal information with encryption
- Medical details and emergency contacts
- Vehicle and insurance information
- Role-based permissions

### Guest Model
- Auto-generated guest IDs
- Action count tracking
- Session management

### Incident Model
- GeoJSON location data
- Media attachments
- Status tracking and upvoting
- Reporter attribution

## 🚀 Deployment

### Production Checklist

- [ ] Set strong JWT_SECRET and ENCRYPTION_KEY
- [ ] Configure production MongoDB URI
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 Development Status

This project is currently in active development. Core infrastructure is complete, and features are being implemented incrementally following the MVC architecture pattern.

### Completed
- ✅ Project setup and configuration
- ✅ Database connection and security setup
- ✅ Basic Express server with middleware
- ✅ Environment configuration

### In Progress
- 🔄 Database models and schemas
- 🔄 Authentication and authorization middleware
- 🔄 API endpoints implementation
- 🔄 Testing framework setup

### Planned
- 📋 Complete API implementation
- 📋 Comprehensive testing suite
- 📋 Documentation and examples
- 📋 Performance optimization