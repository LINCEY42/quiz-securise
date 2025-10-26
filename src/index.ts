import express from "express";

const app = express();
app.use(express.json());

// ⚠️ Mets ici le lien exact de ta page de quiz Systeme.io
const ALLOWED_ORIGIN = "https://ton-lien-de-quiz.systeme.io";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ✨ Voici ton point d’entrée sécurisé pour ton quiz
app.post("/api/quiz", async (req, res) => {
  try {
    const { firstName, email, phone, profile, answers } = (req.body as any) || {};
    if (!firstName || !email || !profile) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const map: Record<string,string> = {
      A:"femme-architecte",
      B:"femme-phare",
      C:"femme-alchimiste",
      D:"femme-cameleon",
      E:"femme-diamant"
    };

    const systemePayload = {
      firstName,
      email,
      phone: phone || "",
      tags: [map[profile] || "quiz-entrepreneures"],
      fields: {
        profile,
        quizAnswers: Array.isArray(answers) ? answers.join(",") : "",
        source: "quiz-entrepreneures",
        timestamp: new Date().toISOString(),
      },
    };

    // Envoi à Systeme.io
    const sysRes = await fetch(process.env.SYSTEMEIO_API_URL as string, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SYSTEMEIO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(systemePayload),
    });

    // Envoi à Make
    const makeRes = await fetch(process.env.MAKE_WEBHOOK_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email, phone, profile, answers }),
    });

    if (!sysRes.ok && !makeRes.ok) {
      return res.status(502).json({ error: "Erreur Systeme.io et Make" });
    }

    return res.status(200).json({ success: true });
  } catch (e:any) {
    console.error("Erreur serveur :", e?.message || e);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
});

export default app;
