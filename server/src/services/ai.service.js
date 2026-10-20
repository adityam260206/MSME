const AppError = require('../utils/AppError');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_ID = 'openai/gpt-oss-120b';
const SYSTEM_PROMPT = "You are AI HelpBot for SpendSense. Answer every user query strictly in exactly 3 bullet points. Under no circumstances should you output more or fewer than 3 bullet points, and do not include any intro or outro conversational text.";

/**
 * Connect to Groq's API to generate a chat response
 * @param {Array} messages - Array of message objects { role, content }
 * @returns {Promise<Object>} - The AI's message response { role, content }
 */
async function generateChatResponse(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw AppError.internal('GROQ_API_KEY is not configured on the server.');
  }

  // Ensure our strict system prompt is at the top, and filter out any sneaky system prompts from the client
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.filter(m => m.role !== 'system')
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: formattedMessages,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Groq API Error]', errorData);
      throw AppError.internal('Failed to generate AI response from Groq.');
    }

    const data = await response.json();
    return data.choices[0].message;
  } catch (error) {
    console.error('[Groq Fetch Error]', error);
    if (error instanceof AppError) throw error;
    throw AppError.internal('An error occurred while connecting to AI HelpBot.');
  }
}

module.exports = {
  generateChatResponse
};
