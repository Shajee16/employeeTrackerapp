import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Using Pollinations AI for completely free, unlimited AI generation without an API key
async function callAI(prompt) {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai', // Maps to a high-quality free model like GPT-4o or Llama 3
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Pollinations API error:', errText);
      throw new Error(`API returned ${res.status}`);
    }

    const text = await res.text(); // Pollinations returns plain text directly
    if (!text) throw new Error('AI returned an empty response');
    
    return text.trim();
  } catch (err) {
    console.error('AI fetch error:', err.message);
    throw new Error('Failed to connect to AI service. Please try again.');
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, existingSubject, existingBody, context, leadInfo } = body;

  if (!action) {
    return NextResponse.json({ error: 'Action is required (polish, generate, rewrite)' }, { status: 400 });
  }

  try {
    // ═══════ ACTION: POLISH ═══════
    if (action === 'polish') {
      if (!existingBody?.trim()) {
        return NextResponse.json({ error: 'No email body to polish' }, { status: 400 });
      }

      const prompt = `You are a professional email editor. Polish the following email for grammar, tone, and clarity. 
Keep the meaning exactly the same. Make it sound professional and well-structured. 
Do NOT add a subject line — only return the polished email body text.

Email to polish:
${existingBody}`;

      const polished = await callAI(prompt);
      return NextResponse.json({ body: polished });
    }

    // ═══════ ACTION: GENERATE ═══════
    if (action === 'generate') {
      if (!context?.trim()) {
        return NextResponse.json({ error: 'Please provide context for the email' }, { status: 400 });
      }

      let leadContext = '';
      if (leadInfo) {
        leadContext = `\nRecipient Details:
- Name: ${leadInfo.contactPerson || 'Unknown'}
- Company: ${leadInfo.companyName || 'Unknown'}
- Designation: ${leadInfo.designation || 'N/A'}
- Industry: ${leadInfo.industry || 'N/A'}
- Services Interested: ${leadInfo.servicesInterested?.join(', ') || 'N/A'}
- Current Status: ${leadInfo.status || 'N/A'}
- Notes: ${leadInfo.notes || 'None'}`;
      }

      const prompt = `You are a professional business email writer. Generate a complete, professional email based on the context below.
${leadContext}

Context/Instructions: ${context}

IMPORTANT: 
- First line MUST be the subject line in format: Subject: <the subject>
- Then a blank line
- Then the full email body
- Keep it professional, concise, and action-oriented
- Use proper greeting and sign-off

Format:
Subject: <subject line>
---
<the email body>`;

      const result = await callAI(prompt);

      // Parse subject and body
      let subject = '';
      let emailBody = result;

      // Try to extract subject from response
      const subjectMatch = result.match(/^Subject:\s*(.+)/im);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        // Remove the subject line and separator from body
        emailBody = result
          .replace(/^Subject:\s*.+/im, '')
          .replace(/^---+/m, '')
          .trim();
      }

      return NextResponse.json({ subject, body: emailBody });
    }

    // ═══════ ACTION: REWRITE ═══════
    if (action === 'rewrite') {
      let leadContext = '';
      if (leadInfo) {
        leadContext = `\nRecipient: ${leadInfo.contactPerson || 'Unknown'} at ${leadInfo.companyName || 'Unknown'}
Industry: ${leadInfo.industry || 'N/A'}
Services: ${leadInfo.servicesInterested?.join(', ') || 'N/A'}`;
      }

      const prompt = `You are a professional email writer. Rewrite the following email incorporating the new context/instructions below.
Keep the core intent but improve and merge the new context.
${leadContext}

Existing email:
${existingBody || '(empty)'}

New context/instructions: ${context || 'Improve the email overall'}

IMPORTANT:
- First line MUST be the subject line in format: Subject: <the subject>
- Then a blank line
- Then the full email body
- Keep it professional and well-structured

Format:
Subject: <subject line>
---
<the email body>`;

      const result = await callAI(prompt);

      let subject = existingSubject || '';
      let emailBody = result;

      const subjectMatch = result.match(/^Subject:\s*(.+)/im);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        emailBody = result
          .replace(/^Subject:\s*.+/im, '')
          .replace(/^---+/m, '')
          .trim();
      }

      return NextResponse.json({ subject, body: emailBody });
    }

    return NextResponse.json({ error: 'Invalid action. Use: polish, generate, or rewrite' }, { status: 400 });

  } catch (err) {
    console.error('AI Email Error:', err);
    return NextResponse.json({ error: err.message || 'AI generation failed' }, { status: 500 });
  }
}
