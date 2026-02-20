# Gamblers Luck

Een lichtgewicht website voor wekelijkse trekkingen binnen je game‑alliantie.

## Pagina's
- **Publiek:** `index.html` — toont de laatste of gekozen week (`?week=YYYY-Www`)
- **Admin:** `admin.html` — voer namen in (max. 100) en draai het rad

## Opslag
- **Standaard:** `localStorage` (alleen op admin-apparaat)
- **Optioneel:** Firebase Firestore (deelbare, publieke uitslagen). Zet `USE_FIREBASE=true` in `firebase-config.js` en vul je config in.

### Firestore Security Rules (voorbeeld)
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gamblersLuck/{weekId} {
      allow read: if true;                // publiek lezen
      allow create, update: if request.auth != null;  // alleen admin schrijft
    }
    match /gamblersLuckMeta/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## GitHub Pages deploy
1. Nieuwe repo → upload bestanden → commit
2. Settings → **Pages** → Source: `Deploy from a branch` → Branch: `main` / `root`
3. Publieke URL: `https://<user>.github.io/<repo>/`

**Admin:** `https://<user>.github.io/<repo>/admin.html`

## Aanpassen
- Vervang `assets/train-bg.jpg` door je eigen achtergrond (bijv. jouw trein‑foto)
- Pas in `firebase-config.js` je admin‑wachtwoord en (optioneel) Firebase config aan
