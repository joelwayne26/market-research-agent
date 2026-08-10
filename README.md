# Market Research Agent

AI-powered market research automation platform with web scraping, competitive analysis, trend detection, and intelligent reporting.

## Features

- **Competitive Analysis**: Automated competitor monitoring and profiling
- **Trend Detection**: AI-powered market trend identification
- **Data Collection**: Web scraping from multiple sources (websites, APIs, social media)
- **Intelligence Engine**: Generate actionable insights from collected data
- **Real-time Dashboard**: Monitor research progress and results
- **Report Generation**: Export comprehensive reports in multiple formats

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Database**: PostgreSQL 16 with pgvector extension
- **Styling**: Tailwind CSS + shadcn/ui components
- **Caching**: Redis (optional)
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development without Docker)
- Git

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/joelwayne26/market-research-agent.git
cd market-research-agent

# Copy environment file
cp .env.example .env
# Edit .env with your configuration if needed

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

The application will be available at: **http://localhost:3000**

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/joelwayne26/market-research-agent.git
cd market-research-agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Ensure PostgreSQL is running with pgvector extension
# Update .env with your PostgreSQL connection string

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Project Structure

```
market-research-agent/
├── docker-compose.yml          # Docker orchestration
├── docker/
│   └── Dockerfile              # Multi-stage build for production
├── database/
│   └── 01-init.sql             # PostgreSQL schema with seed data
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard page
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   └── ui/                 # shadcn/ui components
│   └── lib/                    # Utilities
│       ├── db.ts               # Database connection
│       └── utils.ts            # Helper functions
├── public/                     # Static assets
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.example                # Environment template
```

## Database Schema

The application uses PostgreSQL with pgvector for vector similarity search:

### Core Tables

| Table | Purpose |
|-------|---------|
| `research_projects` | Main project tracking |
| `data_sources` | Websites/APIs being scraped |
| `raw_data` | Collected raw data |
| `analyzed_data` | AI-processed data with embeddings |
| `market_intelligence` | Aggregated insights |
| `competitor_profiles` | Competitor information |
| `research_reports` | Generated reports |
| `audit_log` | Complete action trail |

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio

# Docker
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run docker:logs    # View logs
npm run docker:build   # Rebuild and start
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - |
| `REDIS_URL` | Redis connection URL | optional |
| `APP_PORT` | Application port | 3000 |

## API Endpoints

When running locally:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/[id]` | GET | Get project details |
| `/api/intelligence` | GET | Get market insights |
| `/api/reports` | GET | List reports |
| `/health` | GET | Health check |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| **App** | 3000 | Next.js frontend & API |
| **PostgreSQL** | 5433 | Database with pgvector |
| **Redis** | 6380 | Optional caching layer |

## Development Tips

1. **VS Code Setup**: Install recommended extensions:
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - TypeScript Importer
   - PostgreSQL extension

2. **Database Access**:
   ```bash
   # Connect to local PostgreSQL
   psql -h localhost -p 5433 -U postgres -d market_research_db
   
   # Or use Docker exec
   docker exec -it market-research-postgres psql -U postgres -d market_research_db
   ```

3. **Hot Reload**: The development server supports hot module replacement for instant updates.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please use GitHub Issues.
