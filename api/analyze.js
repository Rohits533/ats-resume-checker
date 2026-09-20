export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resume, jobDescription, score, missing } = req.body;

  if (!resume || !jobDescription) {
    return res.status(400).json({ error: 'Missing resume or job description' });
  }

  const missingList = (missing || []).slice(0, 25).join(', ');

  const prompt = `You are an ATS resume advisor helping a candidate improve their resume for a specific job.

Resume text (truncated):
${resume.slice(0, 3000)}

Job description (truncated):
${jobDescription.slice(0, 3000)}

Keyword match score: ${score}%
Missing keywords: ${missingList}

Give concise, actionable advice in exactly three sections:

**Strengths**
2-3 bullet points on what the resume already does well for this role.

**Critical gaps**
2-3 bullet points on the most important missing skills or keywords.

**One concrete fix**
1-2 sentences describing the single most impactful change the candidate should make.

Be specific and direct. No filler. Do not mention ATS systems or scoring.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', errText);
      return res.status(500).json({ error: 'AI service unavailable. Check API key.' });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from model.';
    return res.status(200).json({ advice: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reach AI service.' });
  }
}
