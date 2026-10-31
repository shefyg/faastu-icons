# FaastU Icons 🔖

שפת אייקונים אחת, שמשרתת כמה פרויקטים. **ציור אחד = מזהה אחד, קבוע לנצח.**

באוויר: **https://shefyg.github.io/faastu-icons/**
אפיון: `recommendations-site/specs/04-icon-library.md` (אפיון 04)

## מה יש כאן
```
icons/<id>.svg     המקור — ציור אחד לכל אייקון. קו בלבד, currentColor
icons.json         המניפסט — מקור האמת. עורכים ביד
tools/build.js     הבנייה. בלי תלויות, Node 18+
build/             תוצרים — נוצרים, לא עורכים
  sprite.svg         כל הציורים בקובץ אחד, כ-<symbol>
  icons.json         המניפסט לצרכנים
  sheet.html         דף קונטקט — בדיקת העין
index.html         דף הנחיתה: הכתובות וקטע הקוד לשיבוץ
```

## שורת מניפסט
| שדה | למה |
|---|---|
| `id` | מפתח יציב. **זה מה שה-DB שומר.** לא משתנה, לא ממוחזר |
| `name` | המילה שאדם רואה |
| `meaning` | שורה אחת: מה הציור אומר |
| `family` | שיוך חופשי ("type"). לא רשימה סגורה |
| `aria` | טקסט לקורא מסך |
| `tag_ids` | **רשימה** — אותו ציור יכול לשרת כמה תגיות, גם בפרויקטים שונים |
| `version` | עולה ב-1 כשהציור משתנה |
| `status` | `active` / `deprecated` (+ `replacedBy`) |

## כללים
1. **משמעות חדשה = `id` חדש.** אסור לשנות משמעות תחת מזהה קיים — ה-DB כבר מצביע עליו.
2. **לא מוחקים קובץ.** מוציאים משירות עם `status: "deprecated"` ו-`replacedBy`.
3. **אין `<title>` ואין `id` בתוך הציור.** הנגישות מגיעה מהמניפסט. הבנייה עוצרת אם יש.
4. **קו בלבד** — `stroke-width` 1.6, בלי מילוי, `currentColor`.

## הוספת אייקון
```bash
node tools/build.js --check   # אימות בלבד
node tools/build.js           # בנייה מלאה
git add -A && git commit -m "Add <id> icon" && git push
```
GitHub Pages מתעדכן לבד תוך דקה.

**השער — שלוש בדיקות, ואייקון לא נכנס בלי שלושתן:**
1. שפי מאשר את הציור **בעין** ב-`build/sheet.html`. אייקון שצריך לקרוא כדי להבין — לא עבר.
2. שורת מניפסט מלאה.
3. נוגה בודקת ניגודיות ≥4.5:1, 375px וגווני אפור.

## שיבוץ אצל צרכן
⚠️ `<use href="https://...#icon">` **חוצה-מקור אינו נתמך.** מושכים את ה-sprite ומזריקים אותו לדף:
```js
fetch("https://shefyg.github.io/faastu-icons/build/sprite.svg")
  .then(r => r.text())
  .then(t => document.body.insertAdjacentHTML("afterbegin", t));
```
ואז `<svg class="icon" aria-label="Video" role="img"><use href="#icon-video"></use></svg>`.
מזהה שלא קיים → `#icon-missing`, ריבוע קו ריק.
