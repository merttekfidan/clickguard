# ClickGuard - Click Fraud Detection System

A real-time click fraud detection and automated IP blocking system for Google Ads campaigns, built as a monorepo with separate backend and frontend applications.

## 🏗️ Project Structure

```
ClickGuard/
├── apps/
│   ├── backend/          # Node.js/Express API server
│   │   ├── src/
│   │   │   ├── api/      # API routes and controllers
│   │   │   ├── config/   # Configuration files
│   │   │   ├── models/   # Data models (in-memory)
│   │   │   ├── services/ # Business logic services
│   │   │   └── workers/  # Background job workers
│   │   ├── server.js     # Main server file
│   │   └── package.json  # Backend dependencies
│   └── frontend/         # React/Vite UI application
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── pages/      # Page components
│       │   └── lib/        # Utility functions
│       ├── index.html
│       └── package.json    # Frontend dependencies
├── packages/              # Shared packages (future use)
├── docs/                  # Documentation
├── scripts/               # Build/deployment scripts
├── .github/               # GitHub workflows
├── .gitignore            # Root gitignore
├── package.json          # Root package.json (workspace)
├── docker-compose.yml    # Local development setup
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized development)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/clickguard.git
cd ClickGuard
```

2. **Install all dependencies:**
```bash
npm run install:all
```

3. **Set up environment variables:**
```bash
# Backend
cd apps/backend
cp env.example .env
# Edit .env with your configuration

# Frontend (if needed)
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development servers:**
```bash
# From root directory
npm run dev
```

This will start:
- Backend server on `http://localhost:3000`
- Frontend development server on `http://localhost:5173`

## 🛠️ Available Scripts

### Root Directory (Monorepo)
```bash
npm run dev              # Start both backend and frontend
npm run dev:backend      # Start only backend
npm run dev:frontend     # Start only frontend
npm run build            # Build both applications
npm run test             # Run tests for both applications
npm run lint             # Run linting for both applications
npm run install:all      # Install dependencies for all packages
npm run clean            # Clean build artifacts
```

### Backend (apps/backend/)
```bash
npm run dev              # Start with nodemon
npm start                # Start in production mode
npm test                 # Run tests
npm run lint             # Run ESLint
```

### Frontend (apps/frontend/)
```bash
npm run dev              # Start Vite development server
npm run build            # Build for production
npm run preview          # Preview production build
npm test                 # Run tests
npm run lint             # Run ESLint
```

## 🐳 Docker Development

### Using Docker Compose
```bash
# Build and start all services
npm run docker:build
npm run docker:up

# Stop all services
npm run docker:down
```

### Services included:
- **Backend**: Node.js API server
- **Frontend**: React development server
- **Redis**: Caching and session storage
- **RabbitMQ**: Message queue
- **PostgreSQL**: Database (for future use)

## 🔧 Configuration

### Backend Environment Variables
Create `apps/backend/.env`:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Encryption Key
ENCRYPTION_KEY=your-32-character-encryption-key

# Google Ads API Configuration
GOOGLE_ADS_CLIENT_ID=your-google-ads-client-id
GOOGLE_ADS_CLIENT_SECRET=your-google-ads-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-google-ads-developer-token
```

### Frontend Environment Variables
Create `apps/frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=ClickGuard
```

## 🔍 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `GET /api/v1/auth/google` - Google OAuth login
- `GET /api/v1/auth/google/callback` - Google OAuth callback
- `POST /api/v1/auth/logout` - Logout

### Tracking
- `POST /api/v1/track/click` - Track a click event
- `GET /api/v1/track/stats` - Get tracking statistics

### Dashboard
- `GET /api/v1/dashboard/overview` - Dashboard overview
- `GET /api/v1/dashboard/accounts` - Connected accounts
- `GET /api/v1/dashboard/blocked-ips` - Blocked IP addresses

## 💾 Data Storage

This version uses **in-memory storage** instead of a database. All data is stored in memory and will be lost when the server restarts. Perfect for:

- Development and testing
- Prototyping
- Demonstrations
- Quick setup without database configuration

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Encrypted storage of sensitive data (tokens)

## 🚀 Deployment

### Production Deployment
1. Set up a proper database (PostgreSQL recommended)
2. Configure environment variables for production
3. Set up proper SSL certificates
4. Configure Google OAuth and Google Ads API credentials
5. Set up monitoring and logging

### Deployment Options
- **Vercel**: Frontend deployment
- **Railway/Render**: Backend deployment
- **Docker**: Containerized deployment
- **Kubernetes**: Scalable deployment

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests with coverage
npm run test:coverage
```

## 📝 Development Guidelines

### Code Style
- Use ESLint and Prettier for code formatting
- Follow TypeScript best practices
- Write meaningful commit messages
- Use conventional commits

### Git Workflow
1. Create feature branch from `develop`
2. Make changes and test
3. Create pull request
4. Code review
5. Merge to `develop`
6. Deploy to staging
7. Merge to `main` for production

### Monorepo Best Practices
- Keep shared code in `packages/`
- Use workspace dependencies
- Maintain consistent versioning
- Use changesets for releases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Email**: support@clickguard.com

## 🔗 Links

- [Live Demo](https://demo.clickguard.com)
- [API Documentation](https://docs.clickguard.com)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md) 