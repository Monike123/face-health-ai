# FaceHealth AI

Contactless rPPG **wellness** toolkit: estimate heart rate from a 30-second face scan.

> **Not a medical device.** Not for diagnosis, screening, or treatment decisions.

**Repo:** https://github.com/Monike123/face-health-ai

## Web Beta (local)
```powershell
# web/.env.local must contain: NEXT_PUBLIC_DEV_AUTH=1
cd web
npm install
npm run dev
```
Open http://127.0.0.1:3000 → Start a scan. Desktop HUD still works: `python -m facehealth --live`.

## Deploy to Vercel (one-time)
1. Open: https://vercel.com/new/import?s=https://github.com/Monike123/face-health-ai
2. Set **Root Directory** to `web`
3. Add env var: `NEXT_PUBLIC_DEV_AUTH` = `1` (Beta without Clerk; turn off later and add Clerk keys)
4. Deploy

## Desktop / Python
```powershell
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
pytest -q
python -m facehealth --live
```

## License / datasets
See [`docs/soup_register.md`](docs/soup_register.md), [`docs/datasets/GUIDE.md`](docs/datasets/GUIDE.md).
