// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAZQOd4EQHqMSaheCmmw8f7V5U4Il0biE0",
  authDomain: "acueducto-561a1.firebaseapp.com",
  databaseURL: "https://acueducto-561a1-default-rtdb.firebaseio.com",
  projectId: "acueducto-561a1",
  storageBucket: "acueducto-561a1.firebasestorage.app",
  messagingSenderId: "582426682908",
  appId: "1:582426682908:web:0e652d1412fa12f7dee1d9",
  measurementId: "G-BL4CSJ2ET1"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta la base de datos para usarla en el dashboard
export const db = getDatabase(app);
