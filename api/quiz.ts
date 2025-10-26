import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ⚠️ Remplace ci-dessous par le vrai lien de ton quiz hébergé (Systeme.io ou ton domaine)
  const ALLOWED_ORIGIN = "https://ton-lien-de-quiz.com";

  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { firstName, email, phone, profile, answers } = (req.body as any) || {};
    if (!firstName || !email || !profile) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const tagMap: Record<string,string> = {
      A:"femme-architecte", B:"femme-phare", C:"femme-alchimiste", D:"femme-cameleon", E:"femme-diamant"
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

    const sysRes = await fetch(process.env.SYSTEMEIO_API_URL as string, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SYSTEMEIO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(systemePayload),
    });

    const makeRes = await fetch(process.env.MAKE_WEBHOOK_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email, phone, profile, answers, source: "quiz-entrepreneures" }),
    });

    if (!sysRes.ok && !makeRes.ok) {
      return res.status(502).json({ error: "Erreur Systeme.io et Make" });
    }

    return res.status(200).json({ success: true });
  } catch (e:any) {
    console.error("Erreur serveur :", e?.message || e);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
