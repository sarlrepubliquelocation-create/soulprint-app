// netlify/functions/claude-portrait.ts
// ══════════════════════════════════════
// Proxy serverless — appelle Gemini API côté serveur pour éviter CORS.
// Variables d'environnement requises dans Netlify (projet Kaironaute) :
//   GEMINI_API_KEY = AIza...
// Gemini 2.0 Flash : 1 500 requêtes/jour gratuites
// ══════════════════════════════════════

import type { Handler } from '@netlify/functions';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY manquante' }) };
  }

  let body: { system: string; context: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body invalide' }) };
  }

  const { system, context } = body;
  if (!system || !context) {
    return { statusCode: 400, body: JSON.stringify({ error: 'system et context requis' }) };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: context }] }],
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.7,
        },
      }),
    });

    const data = await res.json();

    // Normaliser la réponse Gemini au même format que Claude
    // pour qu'AstroTab.tsx n'ait pas à changer
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const normalized = { content: [{ type: 'text', text }] };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(normalized),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Erreur appel Gemini API', detail: String(err) }),
    };
  }
};
