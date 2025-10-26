import express from "express";

const app = express();
app.use(express.json());

// ⚠️ Pendant le test, on autorise tout
const ALLOWED_ORIGIN = "*";

// CORS global
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ✅ Route GET de test (pour vérifier depuis ton navigateur)
app.get("/api/quiz", (_req, res) => {
  res.json({ ok: true, message: "Ton API sécurisée fonctionne 🎉" });
});

// ✅ Route POST (celle que ton quiz va utiliser)
app.post("/api/quiz", async (req, res) => {
  try {
    const { firstName, email, phone, profile, answers } = req.body || {};

    if (!firstName || !email || !profile) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const tagMap = {
      A: "femme-architecte",
      B: "femme-phare",
      C: "femme-alchimiste",
      D: "femme-cameleon",
      E: "femme-diamant",
    };

    const systemePayload = {
      firstName,
      email,
      phone: phone || "",
      tags: [tagMap[profile] || "quiz-entrepreneures"],
      fields: {
        profile,
        quizAnswers: Array.isArray(answers) ? answers.join(",") : "",
        source: "quiz-entrepreneures",
        timestamp: new Date().toISOString(),
      },
    };

    // Envoi à Systeme.io
    const sysRes = await fetch(process.env.SYSTEMEIO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SYSTEMEIO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(systemePayload),
    });

    // Envoi à Make
    const makeRes = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email, phone, profile, answers }),
    });

    if (!sysRes.ok && !makeRes.ok) {
      return res.status(502).json({ error: "Erreur Systeme.io et Make" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default app;
