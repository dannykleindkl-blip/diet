# מאזן – יומן תזונה ופעילות גופנית

PWA (Progressive Web App) ליומן תזונה יומי, תמיכה ב-Apple Watch, מותאם לירידה במשקל.

## 🚀 פרסום ב-GitHub Pages

### שלב 1 — צור repository ב-GitHub
1. היכנס ל-[github.com](https://github.com)
2. לחץ **New repository**
3. שם: `mazan` (או כל שם שתרצה)
4. בחר **Public**
5. **אל תסמן** "Add README" — הקובץ כבר כאן
6. לחץ **Create repository**

### שלב 2 — העלה את הקבצים
```bash
# Clone the empty repo
git clone https://github.com/YOUR_USERNAME/mazan.git
cd mazan

# Copy all files from this folder into it
# Then:
git add .
git commit -m "Initial commit – מאזן PWA"
git push origin main
```

**או ידנית:** לחץ "uploading an existing file" ב-GitHub והעלה את כל הקבצים.

### שלב 3 — הפעל GitHub Pages
1. ב-repository שלך → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. זה הכל! הדפלוי יתחיל אוטומטית

### שלב 4 — הכתובת שלך
```
https://YOUR_USERNAME.github.io/mazan/
```

---

## 📱 התקנה על iPhone
1. פתח את הכתובת ב-**Safari**
2. לחץ **↑ שיתוף** → **הוסף למסך הבית**
3. מאזן מותקן כאפליקציה!

## 💻 שימוש על מחשב
פשוט פתח את הכתובת בדפדפן — ממשק מלא עם עמודות.

## ⌚ Apple Watch
השעון מסנכרן ל-Apple Health אוטומטית. כל ערב:
- פתח **בריאות** → **פעילות**
- ראה **צעדים** + **קלוריות פעילות**
- הזן ב-מאזן (לוקח 30 שניות)

---

## קבצים
```
mazan/
├── index.html          # דף ראשי
├── style.css           # עיצוב (responsive)
├── app.js              # לוגיקה
├── sw.js               # Service Worker (offline)
├── manifest.json       # PWA manifest
├── icons/
│   ├── icon-32.png
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions auto-deploy
```
