// Zet USE_FIREBASE = true als je Firestore wilt gebruiken voor publieke, deelbare weeklinks.
// Zet USE_FIREBASE = false voor pure localStorage (alles blijft op jouw apparaat).
const USE_FIREBASE = false;

// Optioneel: simpele admin-wachtwoord (alleen client-side; voor games is dit vaak voldoende).
// Vul hier jouw eigen wachtwoord in; we hashen het in app.js met SHA-256 voor vergelijking.
const ADMIN_PASSWORD_PLAIN = "change-me-strong-pass";

// Firebase config: alleen invullen als USE_FIREBASE = true
// Maak een web-app in Firebase console en kopieer hier je config.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Admin login in Firebase (optioneel): laat leeg als je geen Firebase-auth wilt gebruiken.
// Als je dit invult en USE_FIREBASE=true is, zal admin-login hiermee inloggen.
const FIREBASE_ADMIN = {
  email: "admin@example.com",
  password: "set-strong-password-here"
};
