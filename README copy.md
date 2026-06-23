# Torquehouse — Garage Management System

A full-stack app for running a car garage: customers, vehicles, job orders (repair
tickets), and invoices, with JWT-authenticated login.

- **Backend:** Django + Django REST Framework, JWT auth, SQLite locally / PostgreSQL in production
- **Frontend:** React (Vite), React Router, Axios

```
garage-system/
├── backend/   Django REST API
└── frontend/  React app
```

---

## 1. Run it locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edit if needed — defaults work for local dev

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is now at `http://localhost:8000/api/`. The Django admin is at
`http://localhost:8000/admin/`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env            # defaults already point at localhost:8000
npm run dev
```

Open `http://localhost:5173`, sign in with the superuser you created above.

### How auth works

There's no public signup screen on purpose — this is shop-staff software. Create
logins for your team with `python manage.py createsuperuser` (admin/full access) or
through `/admin/` → Users (create a regular `User`, which is enough to call the API,
since every endpoint just requires *some* authenticated user). The frontend stores
the JWT access/refresh pair in `localStorage` and refreshes automatically.

---

## 2. What's included

| Area | Where | Notes |
|---|---|---|
| Customers | `/api/customers/` | search by name/phone/email |
| Vehicles | `/api/vehicles/` | linked to a customer, search by make/model/plate |
| Job orders | `/api/jobs/` | auto-numbered `JOB-2026-0001`, status + priority, filter by status |
| Invoices | `/api/invoices/` | auto-numbered `INV-2026-0001`, tax calc, partial payments via `POST /api/invoices/{id}/record_payment/` |
| Dashboard | `/api/dashboard/` | aggregate counts + recent jobs, used by the React dashboard page |

All endpoints require a valid JWT (`Authorization: Bearer <token>`) except
`/api/auth/login/` and `/api/auth/refresh/`.

---

## 3. Deploying — Render (API) + Vercel (frontend)

This deploys the Django API on **Render** with a managed PostgreSQL database, and
the React app on **Vercel**. Both have usable free tiers.

### Step 1 — Push your code to GitHub

Render and Vercel both deploy by connecting to a Git repo.

```bash
cd garage-system
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on GitHub, then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

### Step 2 — Create the database on Render

1. Go to [render.com](https://render.com) and sign in (GitHub login is easiest).
2. **New → PostgreSQL**.
3. Give it a name (e.g. `garage-db`), pick the free plan, and create it.
4. Once it's provisioned, open it and copy the **Internal Database URL** — you won't
   need to paste this manually; Render injects it automatically in the next step if
   you attach the database to your web service.

### Step 3 — Deploy the Django API

1. **New → Web Service** → connect your GitHub repo.
2. Configure:
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start command:** `python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
     (this is already saved as the `Procfile`, so Render may detect it automatically)
3. Under **Environment**, add these variables:
   | Key | Value |
   |---|---|
   | `SECRET_KEY` | generate one — see below |
   | `DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `<your-service>.onrender.com` |
   | `CORS_ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://garage.vercel.app` (you'll get this in step 5 — come back and fill it in, or add it now and update later) |
4. Under **Environment → Add from Database**, attach the `garage-db` Postgres
   instance you created — this automatically sets `DATABASE_URL`, which
   `dj-database-url` in `settings.py` already knows how to read.
5. Click **Create Web Service**. Render will build and deploy; watch the logs.
6. Once it's live, visit `https://<your-service>.onrender.com/admin/` to confirm
   it's up, then create your first real user:
   - Open the **Shell** tab for your service in the Render dashboard, and run:
     ```bash
     python manage.py createsuperuser
     ```

**Generating a SECRET_KEY:** run this once locally and paste the output into Render:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Step 4 — Point the frontend at the live API

In `frontend/.env` (or directly in Vercel's environment settings — see Step 5),
set:

```
VITE_API_URL=https://<your-service>.onrender.com/api
```

### Step 5 — Deploy the React app on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New → Project** → import the same repo.
3. Configure:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite (Vercel detects this automatically)
   - **Build command:** `npm run build` (default)
   - **Output directory:** `dist` (default)
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-service>.onrender.com/api` |
5. Click **Deploy**. Vercel gives you a URL like `https://garage.vercel.app`.

### Step 6 — Close the loop on CORS

Now that you have the real Vercel URL, go back to Render → your web service →
**Environment**, and set `CORS_ALLOWED_ORIGINS` to that exact URL (no trailing
slash), e.g.:

```
CORS_ALLOWED_ORIGINS=https://garage.vercel.app
```

Save — Render will redeploy automatically with the new setting.

### Done

Visit your Vercel URL, sign in with the superuser you created in Step 3, and you're
running live. Every push to `main` will auto-redeploy both services.

---

## 4. Notes on the free tiers

- **Render free web services spin down after inactivity** and take ~30–60 seconds to
  wake up on the next request. For a real garage in daily use, upgrade to a paid
  instance type so it stays warm.
- **Render's free PostgreSQL databases expire after 30 days** unless upgraded —
  fine for testing, not for production data you care about.
- Vercel's free tier has no such sleep behavior and is fine for the frontend
  long-term.

## 5. Project structure reference

```
backend/
├── config/          Django project settings, urls, wsgi
├── garage/          The app: models, serializers, views, urls, admin
├── manage.py
├── requirements.txt
└── Procfile         Used by Render to start the app

frontend/
├── src/
│   ├── api/         Axios client + per-resource API functions
│   ├── components/  Shared UI (nav shell, modal, ticket card, badges)
│   ├── context/     Auth context (JWT state)
│   └── pages/       Dashboard, Customers, Vehicles, Jobs, Invoices, Login
└── vite.config.js
```
