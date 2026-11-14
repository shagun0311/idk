
require('dotenv').config();

const express = require('express');

const app = express();
app.use(express.json({ limit: '100kb' }));

const SYSTEM_PROMPT = `
You are MISSION AI, the intelligent lunar mission assistant
inside IDK (Initial Kinetic Design).

Help users understand and plan lunar missions, including:
- Landing site selection
- Lunar geology, elevation, slope and hazards
- Solar illumination and power planning
- Earth visibility and radio communications
- Relay satellite concepts
- Spacecraft, landers and rovers
- Mission phases, timelines and operations
- Navigation, instruments and scientific payloads
- Resource planning and engineering calculations
- Mission risks and contingency planning
- Mission reports and checklists

RULES:
1. Be accurate, clear and technically grounded.
2. Never invent NASA data, spacecraft specifications,
   mission results, relay coverage or live telemetry.
3. Clearly label estimates, assumptions and unknowns.
4. Explain calculations and show units.
5. Ask for missing information when necessary.
6. Distinguish conceptual suggestions from verified engineering.
7. Never claim to access IDK modules unless their actual
   results were provided in the conversation.
8. Explain the reasoning behind recommendations.
9. Organise longer answers with useful headings and steps.
10. Remember the conversation context supplied in chat history.

You are a mission-planning assistant, not a substitute
for professional mission engineering or flight certification.
`;

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history
          .filter(
            (item) =>
              ['user', 'model'].includes(item.role) &&
              typeof item.text === 'string'
          )
          .slice(-12)
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.text.slice(0, 5000) }],
          }))
      : [];

    if (!history.length) {
      return res.status(400).json({
        error: 'Please enter a message.',
      });
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
        encodeURIComponent(process.env.GEMINI_API_KEY),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: history,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1800,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', data);
      return res.status(502).json({
        error: 'The AI service could not complete your request.',
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: 'The AI returned an empty response. Please try again.',
      });
    }

    res.json({ answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Unable to connect to Mission AI.',
    });
  }
});

app.listen(3001, () => {
  console.log('MISSION AI backend running on port 3001');
});
