<img width="225" height="225" alt="image" src="https://github.com/user-attachments/assets/debcbba8-fdd4-4928-af69-24bdc5422463" />


A Node.js/Express backend for managing bookstore inventory through CSV uploads and generating PDF reports.

## Features

- **CSV Inventory Upload**: Parse and ingest inventory data from CSV files with automatic entity creation/update
- **PDF Report Generation**: Generate store reports with top 5 priciest books and top 5 prolific authors
- **PostgreSQL Database**: Robust data storage with Sequelize ORM
- **Docker Support**: Full containerization with Docker and Docker Compose

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Sequelize 6
- **PDF Generation**: PDFKit
- **CSV Parsing**: csv-parser
- **Worker Threads**: For parallel CSV processing
- **API Documentation**: Swagger/OpenAPI 3.0
- **Containerization**: Docker & Docker Compose

## API Documentation (Swagger)

Interactive API documentation is available via Swagger UI.

### Accessing Swagger

Once the server is running, visit:

- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI JSON**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

### Swagger Features

- 📖 **Interactive Documentation**: Browse all endpoints with descriptions
- 🧪 **Try It Out**: Test API endpoints directly from the browser
- 📋 **Request/Response Schemas**: View detailed data models
- 📝 **Example Values**: See sample requests and responses

### Available Endpoints in Swagger

| Tag       | Endpoint                              | Description               |
| --------- | ------------------------------------- | ------------------------- |
| Health    | `GET /api/health`                     | API health check          |
| Inventory | `POST /api/inventory/upload`          | Upload CSV inventory file |
| Store     | `GET /api/store`                      | List all stores           |
| Store     | `GET /api/store/{id}`                 | Get store details         |
| Store     | `GET /api/store/{id}/download-report` | Download PDF report       |

## CSV Processing Architecture (Piscina Thread Pool)

The application uses **Piscina Thread Pool** for efficient CSV processing, managing a pool of worker threads for parallel processing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Main Thread                                     │
│                                                                              │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────────────────┐   │
│  │   Express   │───►│   Inventory     │───►│   Database Operations      │   │
│  │   Router    │    │   Service       │    │   (Sequelize + Postgres)   │   │
│  └─────────────┘    └────────┬────────┘    └────────────────────────────┘   │
│                              │                                               │
│                              │ Submit Task to Pool                           │
│                              ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Piscina Thread Pool                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │   Pool Config: minThreads=2, maxThreads=4, idleTimeout=30s      │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │  Worker #1   │  │  Worker #2   │  │  Worker #3   │  │ Worker #4  │ │  │
│  │  │  (Active)    │  │  (Active)    │  │  (Idle)      │  │ (Idle)     │ │  │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │              │  │            │ │  │
│  │  │  │ Parse  │  │  │  │ Parse  │  │  │   Waiting    │  │  Waiting   │ │  │
│  │  │  │  CSV   │  │  │  │  CSV   │  │  │   for task   │  │  for task  │ │  │
│  │  │  └────────┘  │  │  └────────┘  │  │              │  │            │ │  │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │              │  │            │ │  │
│  │  │  │Validate│  │  │  │Validate│  │  │              │  │            │ │  │
│  │  │  │  Rows  │  │  │  │  Rows  │  │  │              │  │            │ │  │
│  │  │  └────────┘  │  │  └────────┘  │  │              │  │            │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
│                              │ Return Validated Rows                         │
│                              ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  Process Valid Rows (Main Thread)                      │  │
│  │  • Create/Update Stores, Authors, Books                                │  │
│  │  • Manage Inventory (StoreBooks) with transactions                     │  │
│  │  • Aggregate results and error handling                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Piscina Thread Pool Benefits

| Benefit                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| **Thread Reuse**       | Workers are reused instead of spawning new ones  |
| **Auto-scaling**       | Pool scales between minThreads and maxThreads    |
| **Queue Management**   | Built-in task queue for concurrent requests      |
| **Non-blocking**       | Main thread stays responsive during CSV parsing  |
| **Better Performance** | Large files (1000+ rows) process faster          |
| **Pool Statistics**    | Monitor completed tasks, wait time, and run time |

### Processing Flow

1. **Upload Request** → Express receives CSV file
2. **Submit to Pool** → Task submitted to Piscina thread pool
3. **Worker Assignment** → Available worker picks up the task
4. **Parse CSV** → Worker parses CSV using streaming
5. **Validate Rows** → Worker validates required fields & data types
6. **Return Results** → Worker returns validated rows to main thread
7. **Database Operations** → Main thread processes DB transactions
8. **Response** → Return success/error counts to client

## Database Schema

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   stores    │     │    books    │     │   authors   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ name        │     │ name        │     │ name        │
│ address     │     │ pages       │     │ created_at  │
│ logo        │     │ author_id   │──┬──│ updated_at  │
│ created_at  │     │ created_at  │  │  └─────────────┘
│ updated_at  │     │ updated_at  │  │
└──────┬──────┘     └──────┬──────┘  │
       │                   │         │
       │  ┌────────────────┘         │
       │  │                          │
       ▼  ▼                          │
┌─────────────────────┐              │
│    store_books      │              │
├─────────────────────┤              │
│ store_id (PK, FK)   │              │
│ book_id (PK, FK)    │──────────────┘
│ price               │
│ copies              │
│ sold_out            │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

## Getting Started

### Quick Start with Docker (Recommended)

The fastest way to get the application running is with Docker Compose. This will start both the API server and PostgreSQL database in containers.

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

#### Step-by-Step Instructions

```bash
# 1. Clone the repository
git clone <repository-url>
cd ovarc-assessment

# 2. Start all containers (API + PostgreSQL)
docker-compose up -d

# 3. Verify containers are running
docker-compose ps

# 4. View application logs
docker-compose logs -f api

# 5. Test the API
curl http://localhost:3000/api/health
```

#### Container Management

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up -d --build

# View all container logs
docker-compose logs -f

# Restart a specific service
docker-compose restart api
```

#### Services Started

| Service    | Container Name | Port | Description            |
| ---------- | -------------- | ---- | ---------------------- |
| API Server | bookstore-api  | 3000 | Express.js application |
| Database   | bookstore-db   | 5432 | PostgreSQL 15          |

Once running, access:

- **API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health

---

### Local Development (Without Docker)

If you prefer to run without Docker or need to develop locally.

#### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

#### Setup

1. **Clone and install dependencies**:

   ```bash
   git clone <repository-url>
   cd ovarc-assessment
   npm install
   ```

2. **Configure environment**:

   ```bash
   # Copy example environment file
   cp .env.example .env

   # Edit .env with your database credentials
   # Or use a cloud database like Neon:
   # DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
   ```

3. **Create PostgreSQL database**:

   ```sql
   CREATE DATABASE bookstore;
   ```

4. **Start the server**:

   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Health Check

```
GET /api/health
```

### Upload Inventory (CSV)

```
POST /api/inventory/upload
Content-Type: multipart/form-data

Body: file (CSV file)
```

**CSV Format**:

```csv
store_name,store_address,book_name,pages,author_name,price,logo
BookWorld,123 Main St,The Great Gatsby,180,F. Scott Fitzgerald,15.99,
```

**Required Fields**: `store_name`, `book_name`, `author_name`, `price`

**Optional Fields**: `store_address`, `pages`, `logo`

**Response**:

```json
{
  "success": true,
  "message": "CSV processed successfully.",
  "results": {
    "processed": 5,
    "created": {
      "stores": 1,
      "authors": 3,
      "books": 5,
      "inventory": 5
    },
    "updated": {
      "inventory": 0
    },
    "errors": []
  }
}
```

### Download Store Report (PDF)

```
GET /api/store/:id/download-report
```

Downloads a PDF report named `[Store-Name]-Report-YYYY-MM-DD.pdf` containing:

- Store logo and name
- Top 5 Priciest Books
- Top 5 Prolific Authors (by book count in inventory)

### Get Store Details

```
GET /api/store/:id
```

### List All Stores

```
GET /api/store
```

## Testing the API

### Using cURL

1. **Upload inventory**:

   ```bash
   curl -X POST http://localhost:3000/api/inventory/upload \
     -F "file=@sample-inventory.csv"
   ```

2. **Get all stores**:

   ```bash
   curl http://localhost:3000/api/store
   ```

3. **Download store report**:
   ```bash
   curl -o report.pdf http://localhost:3000/api/store/1/download-report
   ```

### Using Postman

1. Import the endpoints
2. For CSV upload:
   - Method: POST
   - URL: `http://localhost:3000/api/inventory/upload`
   - Body: form-data
   - Key: `file` (type: File)
   - Value: Select your CSV file

## Project Structure

```
ovarc-assessment/
├── src/
│   ├── config/
│   │   ├── database.js         # Database configuration
│   │   └── swagger.js          # Swagger/OpenAPI configuration
│   ├── middleware/
│   │   └── errorHandler.js     # Global error handling
│   ├── models/
│   │   ├── index.js            # Sequelize initialization & associations
│   │   ├── Store.js            # Store model
│   │   ├── Author.js           # Author model
│   │   ├── Book.js             # Book model
│   │   └── StoreBook.js        # Store-Book junction table
│   ├── routes/
│   │   ├── index.js            # Route aggregator
│   │   ├── inventory.js        # Inventory routes (with Swagger docs)
│   │   └── store.js            # Store routes (with Swagger docs)
│   ├── services/
│   │   ├── inventoryService.js # CSV processing with Worker Threads
│   │   └── reportService.js    # PDF generation logic
│   ├── workers/
│   │   └── csvParserWorker.js  # Worker thread for CSV parsing
│   ├── scripts/
│   │   └── syncDb.js           # Database sync script
│   └── index.js                # Application entry point
├── .env.example                # Environment variables template
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── sample-inventory.csv        # Sample data for testing (1000 rows)
└── README.md
```

## Business Logic

### CSV Processing

- **Store**: Created if not exists (matched by name), logo/address updated if different
- **Author**: Created if not exists (matched by name)
- **Book**: Created if not exists (matched by name + author)
- **Inventory**:
  - If store already has the book: increment copies, update price
  - If new: create with 1 copy

### Report Generation

- **Top 5 Priciest Books**: Sorted by price DESC, excludes sold-out books
- **Top 5 Prolific Authors**: Sorted by unique book count, then by total copies

## Error Handling

The API provides detailed error responses:

- `400` - Bad Request (invalid input, missing file, validation errors)
- `404` - Not Found (store doesn't exist)
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection issues)

## Environment Variables

| Variable      | Description       | Default       |
| ------------- | ----------------- | ------------- |
| `PORT`        | Server port       | `3000`        |
| `NODE_ENV`    | Environment       | `development` |
| `DB_HOST`     | Database host     | `localhost`   |
| `DB_PORT`     | Database port     | `5432`        |
| `DB_NAME`     | Database name     | `bookstore`   |
| `DB_USER`     | Database user     | `postgres`    |
| `DB_PASSWORD` | Database password | `postgres`    |

## Development Notes

- Database tables are auto-synced on startup in development mode
- Transactions are used for CSV processing to ensure data integrity
- File uploads are limited to 10MB
- Only CSV files are accepted for upload

## Time Spent

Approximately 1.5 hours

## License

Ali Nour @alin00r
