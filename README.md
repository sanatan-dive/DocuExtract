# DocuExtract - Intelligent PDF Data Extractor

> **Production-ready AI-powered document extraction pipeline** that handles messy real-world PDFs with smart cost optimization.

![Dashboard Preview](./docs/dashboard-preview.png)

---

## 🎯 Project Overview

DocuExtract is a comprehensive document processing system that:

- **Uploads** PDFs via drag-and-drop (supports 1000+ files)
- **Preprocesses** them (300 DPI, Deskew, Denoise)
- **Classifies** document types (Handwritten vs Typed)
- **Extracts** structured data using Gemini AI
- **Displays** clean, confidence-scored results
- **Exports** to CSV, JSON, or Excel

### The Core Differentiator: Smart Cost Optimization

The system intelligently routes documents to minimize costs while maintaining accuracy:

- **Handwritten/Complex** → Gemini 2.5 Pro
- **Typed/Clean** → Gemini 2.5 Flash (faster, cheaper)
- **Bulk (>100 docs)** → Batch API (50% cost reduction)

---

## 🛠️ Tech Stack

| Layer          | Technology                           |
| -------------- | ------------------------------------ |
| **Frontend**   | Next.js 16, React 19, TanStack Table |
| **Styling**    | Tailwind CSS, Custom Design System   |
| **Backend**    | Next.js API Routes (App Router)      |
| **Database**   | PostgreSQL + Prisma ORM              |
| **AI**         | Google Gemini 2.5 (Pro + Flash)      |
| **Processing** | Sharp (image), pdfjs-dist (PDF)      |

---

## 📂 Project Structure

```
ecom/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── documents/     # CRUD + PATCH for review
│   │   │   ├── extract/       # AI extraction (POST/PUT bulk)
│   │   │   ├── metrics/       # Cost analytics
│   │   │   └── upload/        # File upload handler
│   │   ├── page.tsx           # Main dashboard
│   │   └── globals.css        # Design tokens
│   ├── components/
│   │   ├── dashboard/         # DataTable, Metrics, Modal
│   │   └── upload/            # DropZone, Queue, Manager
│   ├── lib/
│   │   ├── classification/    # Document type classifier
│   │   ├── extraction/        # Gemini client, prompts
│   │   ├── optimization/      # Rate limiter, cost tracker
│   │   └── preprocessing/     # PDF→Image, Image enhancer
│   └── types/                 # TypeScript definitions
└── samples/                   # Test PDFs
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Neon DB)
- Gemini API Key

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ecom

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values:
#   DATABASE_URL=postgresql://...
#   GEMINI_API_KEY=your-key-here

# Generate Prisma client + migrate
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## ✅ Features Implemented

### Core Requirements

| Requirement                  | Status | Implementation                          |
| ---------------------------- | ------ | --------------------------------------- |
| Drag-and-drop upload         | ✅     | `DropZone.tsx` with react-dropzone      |
| Bulk upload (1000+)          | ✅     | Queue-based with status tracking        |
| PDF preprocessing (300 DPI)  | ✅     | `pdfToImages.ts` + Sharp                |
| Deskew/Denoise/Enhance       | ✅     | `imageEnhancer.ts`                      |
| Document classification      | ✅     | Gemini Flash for routing                |
| Smart model routing          | ✅     | Pro for handwritten, Flash for typed    |
| Batch API (>100 docs)        | ✅     | Auto-detection with 50% savings         |
| Rate limit handling          | ✅     | Exponential backoff in `rateLimiter.ts` |
| Cost tracking                | ✅     | Per-doc, per-model, with savings        |
| Confidence scores            | ✅     | Per-field with color indicators         |
| Data export (CSV/JSON/Excel) | ✅     | `ExportControls.tsx`                    |
| Manual review UI             | ✅     | `DocumentDetailModal.tsx`               |
| Paginated data table         | ✅     | TanStack Table with sorting/filtering   |

### Bonus Features (Level 1)

| Feature              | Status                      |
| -------------------- | --------------------------- |
| PDF preview in modal | ✅ iframe via `/api/file`   |
| Manual correction UI | ✅ Side-by-side editor      |
| Re-run extraction    | ✅ Force Flash/Pro dropdown |

### Advanced Features (Level 2 & 3)

| Feature                   | Status | Implementation                                         |
| ------------------------- | ------ | ------------------------------------------------------ |
| **Authentication**        | ✅     | JWT-based with login/register                          |
| **Template System**       | ✅     | 4 doc types (Registration, Invoice, Contract, Generic) |
| **Parallel Queue**        | ✅     | 5 concurrent workers with retry logic                  |
| **Webhook Notifications** | ✅     | HTTP callbacks for document events                     |
| **Public API**            | ✅     | RESTful endpoints with JSON responses                  |

---

## 🔐 Authentication

### Demo Credentials

```
Email:    demo@docuextract.com
Password: demo123
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@docuextract.com", "password": "demo123"}'
```

### Use Token

```bash
curl http://localhost:3000/api/documents \
  -H "Authorization: Bearer <your-token>"
```

---

## 💡 Cost Optimization Strategy

### Routing Logic

```
Document → Classification (Flash) → Route Decision
                                   ├─> Handwritten → Pro
                                   ├─> Typed → Flash
                                   └─> Mixed/Scanned → Pro
```

### Batch Savings

| Volume    | API Mode | Cost Impact      |
| --------- | -------- | ---------------- |
| ≤100 docs | Standard | Full price       |
| >100 docs | Batch    | **50% discount** |

### Pricing Reference (per 1M tokens)

| Model            | Input | Output |
| ---------------- | ----- | ------ |
| Gemini 2.5 Pro   | $1.25 | $10.00 |
| Gemini 2.5 Flash | $0.30 | $2.50  |

---

## 📊 API Reference

### `POST /api/upload`

Upload a PDF file.

```json
// Request: FormData with 'file' field
// Response:
{ "success": true, "documentId": "uuid", "fileName": "..." }
```

### `POST /api/extract`

Extract data from a single document.

```json
// Request:
{ "documentId": "uuid", "forceModel": "gemini-3-pro-preview" }
// Response:
{ "success": true, "data": { "name": "...", "confidence_scores": {...} } }
```

### `PUT /api/extract`

Bulk extraction (auto-batches >100 docs).

```json
// Request:
{ "documentIds": ["uuid1", "uuid2", ...] }
// Response:
{ "success": true, "results": [...], "message": "Processed X documents" }
```

### `GET /api/documents`

Fetch documents with pagination.

```
?page=1&limit=50&status=COMPLETED&needsReview=true&search=query
```

### `PATCH /api/documents?id=uuid`

Update extracted data (manual review).

```json
{ "name": "Corrected Name", "city": "New City" }
```

### `GET /api/templates`

List available extraction templates.

```json
// Response:
{
  "success": true,
  "data": [{ "id": "registration_form", "name": "...", "fieldCount": 10 }]
}
```

### `POST /api/webhooks`

Register a webhook for document events.

```json
// Request:
{ "url": "https://your-server.com/webhook", "secret": "optional-secret", "events": ["document.completed"] }
// Response:
{ "success": true, "data": { "id": "uuid", "url": "..." } }
```

### `GET /api/queue`

Get processing queue status.

```json
// Response:
{
  "success": true,
  "data": { "stats": { "pending": 5, "processing": 2, "completed": 100 } }
}
```

---

## 🎨 Screenshots

### Dashboard Overview

_Clean light-mode design with stat cards and quick access._

### Manual Review Modal

_Side-by-side PDF preview and editable form with confidence highlighting._

### Data Export

_One-click export to CSV, JSON, or Excel._

---

## 📝 Technical Write-up

### What was the hardest part?

Integrating the preprocessing pipeline correctly. The PDF-to-image conversion with `pdfjs-dist` in a Node.js environment required careful handling of workers and canvas rendering. Sharp's image enhancement needed tuning to not over-process already clean documents.

### How did you improve extraction accuracy?

1. **Preprocessing**: 300 DPI normalization and denoising significantly improved OCR-like results.
2. **Classification-first routing**: Using a lightweight pass to identify handwritten content before routing to Pro.
3. **Prompt engineering**: Structured prompts that explicitly request confidence scores and handle missing fields gracefully.

### How much cost did batching save?

In simulated tests with 200 documents:

- Without batching: ~$0.12
- With batching: ~$0.06
- **Savings: 50%**

### What did you learn?

- Gemini's multimodal capabilities are powerful but require image preprocessing for best results.
- Cost optimization at scale is as important as accuracy.
- TypeScript's strict typing catches many issues early but requires careful interface design.

### How did you use AI while building this?

- **Code generation**: Initial boilerplate for API routes and components.
- **Debugging**: Analyzing error messages and suggesting fixes.
- **Documentation**: Generating this README and inline JSDoc comments.

---

## 🔧 Environment Variables

| Variable           | Description                  | Required                    |
| ------------------ | ---------------------------- | --------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string | Yes                         |
| `GEMINI_API_KEY`   | Google AI API key            | Yes                         |
| `JWT_SECRET`       | Secret key for JWT tokens    | No (has default)            |
| `UPLOAD_DIR`       | Upload file storage path     | No (default: `./uploads`)   |
| `PROCESSED_DIR`    | Processed images path        | No (default: `./processed`) |
| `MAX_FILE_SIZE_MB` | Max upload size              | No (default: `50`)          |

---

## 🔮 Future Roadmap

### Completed ✅

- [x] Template system per document type
- [x] Worker queues for parallel processing
- [x] Authentication (JWT)
- [x] Webhook notifications
- [x] Public REST API

### Remaining

- [ ] Evaluation framework with ground truth comparison
- [ ] A/B testing for prompts
- [ ] Multi-tenancy
- [ ] Cloud storage integration (GDrive/Dropbox)

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

## 👤 Author

**Sanatan**

Built with ❤️ and a lot of AI assistance.
