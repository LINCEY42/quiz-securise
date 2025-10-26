// src/index.js

import express from "express";

// Node 18+ (environnement Vercel) fournit déjà fetch globalement.
// Pas besoin d'installer "node-fetch".

const app = express();
app.use(express.json());

// ⚠️ Pendant les tests, on autorise tout. Quand tout fonctionne,
// remplace "*" par l’URL EXACTE de ta page de quiz (ex. https://ton-sous-domaine.systeme.io)
const ALLOWED_ORIGIN = "*";

// Middleware CORS (appliqué à toutes les routes)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// Petit mapping profil -> tag Systeme.io
function profileToTag(p) {
  const map = {
    A: "femme-architecte",
    B: "femme-phare",
    C: "femme-alchimiste",
    D: "femme-cameleon",
    E: "femme-diamant",
  };
  return map[p] || "quiz-entrepreneures";
}

// ✅ Route GET de test (utile pour vérifier depuis le navigateur)
app.get("/api/quiz", (_req, res) => {
  res.json({ ok: true, message: "Ton API sécurisée fonctionne 🎉 (utilise POST /api/quiz depuis le quiz)" });
});

// ✅ Route POST (appelée par ton quiz)
app.post("/api/quiz", async (req, res) => {
  try {
    const { firstName, email, phone, profile, answers } = req.body || {};

    // Validation minimum
    if (!firstName || !email || !profile) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Payload pour Systeme.io
    const systemePayload = {
      firstName,
      email,
      phone: phone || "",
      tags: [profileToTag(profile)],
      fields: {
        profile,
        quizAnswers: Array.isArray(answers) ? answers.join(",") : "",
        source: "quiz-entrepreneures",
        timestamp: new Date().toISOString(),
      },
    };

    // 1) Envoi à Systeme.io (clé cachée en variable d'environnement)
    const sysRes = await fetch(process.env.SYSTEMEIO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SYSTEMEIO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(systemePayload),
    });

    // 2) Envoi à Make (webhook)
    const makeRes = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email, phone, profile, answers, source: "quiz-entrepreneures" }),
    });

    // Si les deux échouent, on renvoie une erreur
    if (!sysRes.ok && !makeRes.ok) {
      const sysTxt = await sysRes.text().catch(() => "");
      const makeTxt = await makeRes.text().catch(() => "");
      return res.status(502).json({
        error: "Erreur Systeme.io et Make",
        details: { systeme: sysRes.status, systemeBody: sysTxt, make: makeRes.status, makeBody: makeTxt },
      });
    }

    // Succès
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur serveur :", error);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
});

// (Optionnel) page racine
app.get("/", (_req, res) => res.send("Bienvenue sur l'API sécurisée du quiz ✨"));

export default app;
