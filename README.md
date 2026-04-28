# 🇳🇬 NaijaOpportunities

> **The #1 platform for Nigerian students and job seekers** — fresh jobs and scholarships, updated daily, all in one place.

🔗 **Live Site:** [naija-opportunities.vercel.app](https://naija-opportunities.vercel.app)

---

## ✨ What it does

NaijaOpportunities automatically scrapes the web every 6 hours to bring you:

- 💼 **Latest Nigerian jobs** — from Jobberman, MyJobMag, and more
- 🎓 **Scholarships for Nigerians** — local and international opportunities
- 🤖 **PathSync AI integration** — AI-powered scholarship matching for students

Every listing gets its own shareable page — perfect for WhatsApp and social media sharing.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Scraper | Python + BeautifulSoup |
| Hosting | Vercel |
| Auto-update | GitHub Actions (every 6hrs) |

---

## 🚀 Features

- ⚡ Server-side rendered pages (great for SEO)
- 🔄 Auto-scraping from multiple sources daily
- 📱 Mobile responsive
- 🔗 Shareable individual pages for each job/scholarship
- 🤖 PathSync AI banner on every page
- 🛡️ Row-level security on Supabase

---

## 📁 Project Structure

```
naija-opportunities/
├── app/
│   ├── page.tsx                  # Homepage
│   ├── jobs/
│   │   ├── page.tsx              # Jobs listing
│   │   └── [slug]/page.tsx       # Individual job page
│   ├── scholarships/
│   │   ├── page.tsx              # Scholarships listing
│   │   └── [slug]/page.tsx       # Individual scholarship page
│   └── lib/
│       └── supabase.ts           # Supabase client
├── scraper/
│   └── scraper.py                # Python web scraper
└── .github/
    └── workflows/
        └── scraper.yml           # Auto-scraping workflow
```

---

## 🔧 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/GoodnessOni/naija-opportunities.git
cd naija-opportunities
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the dev server
```bash
npm run dev
```

### 5. Run the scraper
```bash
cd scraper
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python scraper.py
```

---

## 🤖 PathSync AI

This project is proudly integrated with **[PathSync AI](https://pathsyncai.com)** — an AI-powered platform that matches Nigerian students to the perfect scholarships based on their profile.

---

## 📈 Roadmap

- [x] Jobs scraper (Jobberman)
- [x] Scholarships scraper (Google News)
- [x] Individual shareable pages
- [ ] Full job/scholarship descriptions
- [ ] Email newsletter alerts
- [ ] Search and filter
- [ ] More scraper sources
- [ ] Google AdSense integration

---

## 👨‍💻 Built by

**GoodnessOni** — Nigerian student developer building real things.

> *"Start before you're ready."*

---

⭐ Star this repo if you find it useful!
