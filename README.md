# FaceHealth AI

Contactless rPPG **wellness** toolkit: estimate heart rate from a ~30-second face scan.

> **Not a medical device.** Not for diagnosis, screening, or treatment decisions.

**Live:** https://face-health-ai.vercel.app  
**Repo:** https://github.com/Monike123/face-health-ai

## Web preview (v0.2)

```powershell
cd web
npm install
npm run dev
```

Open http://127.0.0.1:3000 → Start a scan. No account required. Optional Clerk: set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

Desktop HUD: `python -m facehealth --live`.

### Feedback infra (Neon + Resend)

```powershell
cd web
vercel integration add neon --name facehealth-db -e production -e preview
vc i resend
vercel env pull .env.local
npm run db:migrate
```

Env: `DATABASE_URL`, `RESEND_API_KEY`, optional `RESEND_FROM`.

## Deploy

- **Web:** Vercel project, Root Directory `web`
- **Python API (optional):** `vercel --cwd backend --prod` → project `facehealth-api`

## Desktop / Python

```powershell
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
pytest -q
python -m facehealth --live
```

## License / datasets

See [`docs/soup_register.md`](docs/soup_register.md), [`docs/datasets/GUIDE.md`](docs/datasets/GUIDE.md).
