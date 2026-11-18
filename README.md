# EduMind AI

**Learn Smarter. Grow Faster. Achieve More.**

EduMind AI is an AI-powered learning and tutoring platform. Students browse and enroll in courses, track real progress, take auto-graded quizzes and get step-by-step help from an AI tutor. Tutors build and publish their own courses.

## Overview
Self-learners often have plenty of content but nobody to ask when they get stuck, and little sense of whether they're actually progressing. EduMind AI combines structured courses with a personal AI tutor that explains topics at the learner's level, offers hints before answers (or, in Socratic mode, guides them to the answer), and shows progress that comes from real activity rather than placeholder numbers.

## Live Demo
Not deployed yet. Deployment targets: frontend on **Vercel**, API and PostgreSQL on **Render** (see [Deployment](#deployment)).

## Screenshots
The course manager is built from this design reference:

![Course manager design reference](docs/design-reference.png)

> Screenshots of the running app will be added after the first deployment.

## Features

**Built (Phase 1 MVP)**
- Email/password registration and login with JWT (access + rotating refresh tokens, logout blacklists the token)
- Roles: student, tutor and admin, enforced on the backend
- Course manager / catalog: search, category, author and status filters, grid/list view, pagination with page size
- Create courses (with cover image upload), import a course from JSON, manage categories, publish/unpublish, delete
- Course details with modules and lessons, enrollment, and "mark lesson complete"
- Student progress dashboard: enrolled courses, completed lessons, study minutes, day streak, quiz average, weekly activity chart, all from real records
- AI tutor chat: streaming replies, Markdown, maths (KaTeX) and code formatting, conversation history, new/delete conversation, suggested follow-up questions, Socratic mode
- Quizzes with deterministic grading (multiple choice, true/false, short answer) and a gradebook of past attempts
- AI usage logging (tokens and estimated cost per request), AI rate limiting
- Dark and light mode, responsive layout, loading/empty/error states

**Planned** (pages exist in the navigation and say so)
- Phase 2: AI course generator, adaptive learning, AI-generated quizzes, analytics page
- Phase 3: document upload + RAG with pgvector, flashcards with spaced repetition, voice tutor, study planner
- Phase 4: tutor and admin dashboards, notifications
- Email verification and password reset emails

## Technology Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Lucide icons, Recharts, Axios, react-markdown + KaTeX
- **Backend:** Python, Django 5, Django REST Framework, SimpleJWT, drf-spectacular
- **AI:** OpenAI API (server-side only), streamed over Server-Sent Events
- **Database:** PostgreSQL in production, SQLite for lightweight local development
- **Testing:** Django test runner (APITestCase), Vitest + React Testing Library
- **Deployment:** Vercel (frontend), Render (API + managed PostgreSQL), GitHub Actions CI

## Architecture

```
React (Vite)  ──HTTPS/JSON + JWT──▶  Django REST API  ──▶  PostgreSQL
     ▲                                   │
     └──── Server-Sent Events ◀──────────┴──▶  OpenAI API (key never leaves the server)
```

- The React app talks to the API through one Axios client (`frontend/src/lib/api.ts`) that attaches the JWT and silently refreshes it on a 401.
- The AI tutor endpoint streams the reply as Server-Sent Events; the browser reads it with `fetch` (`frontend/src/lib/sse.ts`).
- The backend is split into apps: `accounts` (users, roles, profiles), `courses` (catalog, enrollment, progress, dashboard), `quizzes` (quizzes, grading, attempts) and `tutor` (conversations, AI services, usage logs).
- AI code lives in `backend/tutor/services/`: `ai_client.py` handles the provider (timeouts, retries, usage/cost logging) and `tutor.py` builds prompts and parses follow-up questions. Only message text is sent to the provider, never names or emails.

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (optional for local development; SQLite is used if `DATABASE_URL` is empty)

### Backend Setup
Windows PowerShell commands:

1. Clone the repository.
   ```powershell
   git clone https://github.com/hillaryessien18-droid/EduMind-AI.git
   cd EduMind-AI\backend
   ```
2. Create a virtual environment.
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies.
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables (then edit `.env` and add your `OPENAI_API_KEY`).
   ```powershell
   Copy-Item .env.example .env
   ```
5. Run database migrations. The first time, generate them and commit them to Git:
   ```powershell
   python manage.py makemigrations accounts courses quizzes tutor
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py seed_demo   # optional: demo tutors and courses
   ```
6. Start the backend server.
   ```powershell
   python manage.py runserver
   ```
   The API runs at http://localhost:8000/api/.

### Frontend Setup
1. Install dependencies.
   ```powershell
   cd ..\frontend
   npm install
   ```
2. Configure API URL.
   ```powershell
   Copy-Item .env.example .env
   ```
   `VITE_API_URL` defaults to `http://localhost:8000/api`.
3. Start development server.
   ```powershell
   npm run dev
   ```
   Open http://localhost:5173.

`seed_demo` creates tutors such as `tony.stark@demo.edumind.ai` and a student `student@demo.edumind.ai`, all with the password `EduMind-demo-2026` (change it with `--password`). To try importing, use **Import Course** with `docs/sample-course.json`.

## API Documentation
- Swagger UI: `http://localhost:8000/api/docs/`
- OpenAPI schema: `http://localhost:8000/api/schema/`

Main endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register/`, `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/logout/` | Authentication |
| GET/PATCH/DELETE | `/api/auth/me/` | Current user, profile update, account deletion |
| GET/POST | `/api/courses/` | List (filters: `search`, `category`, `author`, `status`, `mine`, `enrolled`, `page_size`) / create |
| POST | `/api/courses/{id}/enroll/`, `/api/courses/{id}/publish/` | Enroll / toggle publish |
| CRUD | `/api/categories/`, `/api/modules/`, `/api/lessons/` | Course structure |
| POST | `/api/lessons/{id}/complete/` | Record lesson completion and study time |
| GET | `/api/dashboard/` | Progress stats for the current user |
| CRUD | `/api/quizzes/`, POST `/api/quizzes/{id}/submit/` | Quizzes and grading |
| GET | `/api/quiz-attempts/` | Your own attempts |
| CRUD | `/api/tutor/conversations/` | AI conversations |
| POST | `/api/tutor/conversations/{id}/messages/` | Send a message; reply streams as SSE |

## Database Design
- **User** (custom, email login, `role`) → one **StudentProfile** or **TutorProfile**
- **Category** 1─* **Course** (instructor → User, status, price) 1─* **Module** 1─* **Lesson**
- **Enrollment** (User × Course, unique) and **LessonProgress** (User × Lesson, unique, completion time and study seconds)
- **Quiz** (→ Course, optional Lesson) 1─* **Question** 1─* **Answer**; **QuizAttempt** stores score, max score and per-question results
- **AIConversation** (→ User) 1─* **AIMessage**; **AIUsageLog** records tokens and estimated cost per AI call

Foreign keys, unique constraints, a non-negative price check and indexes on the common filters (course status/date, user conversations, attempts) are defined in the models.

## Testing
Backend (external AI calls are mocked):
```powershell
cd backend
python manage.py test
```
Frontend:
```powershell
cd frontend
npm test
```
The tests cover registration/login, role permissions (students can't create courses, tutors can't edit others' courses), private data isolation (conversations and quiz attempts), quiz scoring, dashboard numbers, AI streaming, provider failures and the missing-API-key case. GitHub Actions runs both suites on every push.

## Security
- **Authentication:** JWT access tokens (30 min) with rotating refresh tokens (7 days); logout blacklists the refresh token. Passwords use Django's hashing and validators.
- **Authorization:** role checks run in the API, not just the UI. Tutors can only change their own courses; users only ever see their own conversations, progress and quiz attempts (other users' records return 404).
- **Validation:** DRF serializers validate all input; uploads are limited to JPEG/PNG/WebP up to 5 MB; quiz answers never expose the correct option before submission.
- **AI safety:** the OpenAI key stays on the server; requests have timeouts, retries and a per-user rate limit; prompts tell the model to ignore instructions inside quoted material; AI-generated code is never executed.
- **Production:** HTTPS redirect, HSTS, secure cookies, CORS limited to the frontend origin, secrets only from environment variables.

## Deployment
- **Backend (Render):** create a Blueprint from `render.yaml`. Set `OPENAI_API_KEY`, `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` (your Vercel URL). Commit your migrations first, because `build.sh` runs `migrate`.
- **Frontend (Vercel):** import the repo, set the root directory to `frontend`, and set `VITE_API_URL` to `https://<your-render-app>.onrender.com/api`.

## Future Improvements
- AI course generator with validated structured output
- Adaptive learning engine (mastery per topic, recommended revision)
- AI quiz generation and labelled AI feedback for subjective answers
- Document upload with RAG (pgvector) and source citations
- Flashcards with spaced repetition, study planner, voice tutor
- Tutor and admin dashboards, notifications, email verification and password reset
- Private object storage for uploads (S3-compatible) in production

## Author
Ubong Essien Eyo · [github.com/hillaryessien18-droid](https://github.com/hillaryessien18-droid)
