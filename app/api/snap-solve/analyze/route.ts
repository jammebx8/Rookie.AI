import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: GROQ_API_KEY });

const VISION_MODEL = 'qwen/qwen3.8-27b';
const REASONING_MODEL = 'openai/gpt-oss-120b';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image_base64 } = body;

    if (!image_base64) {
      return NextResponse.json({ error: 'image_base64 is required' }, { status: 400 });
    }

    const dataUri = image_base64.startsWith('data:')
      ? image_base64
      : `data:image/jpeg;base64,${image_base64}`;

    // Step 1: Vision inspection & extraction with qwen/qwen3.8-27b
    const visionPrompt = `You are an expert AI academic scanner and vision analyzer for students.
Carefully examine this cropped image.

TASK 1: VALIDATION
Determine if this image contains academic schoolwork, homework, a textbook/notebook page,
a physics/chemistry/math/biology problem, an equation, or an exam question.
If it is NOT schoolwork (e.g. selfie, clothes, room, food, pet, furniture, car, or random non-academic object),
you MUST mark 'is_schoolwork': false.

TASK 2: EXTRACTION (Only if it IS schoolwork)
- Transcribe the exact question text completely.
- Use standard LaTeX notation enclosed in $...$ for inline equations and $$...$$ for display equations. Never use raw unicode for math symbols.
- Identify the subject (Physics, Chemistry, Mathematics, Biology, etc.).
- Identify the topic / chapter title.
- Identify options A, B, C, D if present.
- Provide a brief diagram description if a diagram is included.

Return strictly valid JSON with no markdown fences:
{
  "is_schoolwork": true,
  "confidence": 0.95,
  "rejection_reason": null,
  "subject": "Physics",
  "topic": "Thermodynamics",
  "title": "Cyclic process P-V max temperature",
  "question_text": "...",
  "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "diagram_description": null
}`;

    const visionCompletion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const rawVision = visionCompletion.choices[0]?.message?.content || '';
    let parsedVision: any = { is_schoolwork: true, question_text: rawVision };

    const jsonMatch = rawVision.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedVision = JSON.parse(jsonMatch[0]);
      } catch {
        parsedVision = { is_schoolwork: true, question_text: rawVision };
      }
    }

    if (!parsedVision.is_schoolwork) {
      return NextResponse.json({
        is_schoolwork: false,
        error: "This doesn't look like schoolwork. Snap a question from your book or notebook.",
        reason: parsedVision.rejection_reason || 'Image does not contain recognizable schoolwork.',
      });
    }

    const question_text = (parsedVision.question_text || '').trim();
    if (!question_text) {
      return NextResponse.json({
        is_schoolwork: false,
        error: "This doesn't look like schoolwork. Snap a question from your book or notebook.",
      });
    }

    const subject = parsedVision.subject || 'Science';
    const topic = parsedVision.topic || 'Doubt Solution';
    const title = parsedVision.title || `${subject} — ${topic}`;
    const options = parsedVision.options || {};
    const diagramDesc = parsedVision.diagram_description || '';

    // Step 2: Solve with openai/gpt-oss-120b
    let optionsFormatted = '';
    if (options && typeof options === 'object') {
      optionsFormatted = Object.entries(options)
        .filter(([, v]) => !!v)
        .map(([k, v]) => `${k}) ${v}`)
        .join('\n');
    }

    const reasoningPrompt = `You are a master academic educator and tutor solving a student's question.
Provide a crystal-clear, pedagogically sound, and beautifully formatted solution.

Subject: ${subject}
Topic: ${topic}
Question:
${question_text}

${optionsFormatted ? `Options:\n${optionsFormatted}` : ''}
${diagramDesc ? `Diagram Context: ${diagramDesc}` : ''}

STRICT FORMATTING REQUIREMENTS:
1. Use Markdown for structure:
   - Provide a clear bold topic header at the start (e.g. **${subject} — ${topic}**).
   - Include a concise subtitle if relevant.
   - Include an **Important points:** section with bullet points highlighting key formulas and laws.
   - Walk through the step-by-step solution clearly without skipping essential intermediate steps.
   - End with a clearly boxed or highlighted final answer.
2. LATEX DELIMITERS:
   - Every single mathematical formula, expression, symbol, or equation MUST be formatted in LaTeX.
   - Use $...$ for inline math (e.g. $T = \\frac{PV}{nR}$, $\\Delta U = 0$, $P_1 V_1 = P_2 V_2$).
   - Use $$...$$ on its own line with a blank line before and after for standalone/display equations.
   - NEVER use unicode mathematical characters (no ∂, ∫, ∑, θ, π, α, β bare in text) — write $\\partial$, $\\int$, $\\sum$, $\\theta$, $\\pi$, $\\alpha$, $\\beta$.
   - NEVER use \\[...\\] or \\(...\\) delimiters.
3. Keep the tone encouraging, clear, and easy for students to follow.`;

    const reasoningCompletion = await groq.chat.completions.create({
      model: REASONING_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an elite STEM tutor who explains concepts with pristine mathematical clarity and perfect LaTeX notation.',
        },
        { role: 'user', content: reasoningPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2500,
    });

    const solution = reasoningCompletion.choices[0]?.message?.content || '';

    return NextResponse.json({
      is_schoolwork: true,
      subject,
      topic,
      title,
      question_text,
      options,
      solution,
    });
  } catch (err: any) {
    console.error('Snap analyze error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
