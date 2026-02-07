import OpenAI from 'openai';
import { hybridSearch, getLatestFileId, getFileMetadata } from './hybridSearch';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function queryDpowAi(
  question: string,
  context?: { source?: string; from?: string; sessionId?: string }
): Promise<string> {
  try {
    const fileId = await getLatestFileId();

    if (!fileId) {
      return "I don't have access to any Excel files yet. Please upload your project data file to get started.";
    }

    const fileMetadata = await getFileMetadata(fileId);

    const searchResults = await hybridSearch(fileId, question, {
      limit: 10,
      minSimilarity: 0.3,
      useKeywordFallback: true,
    });

    if (searchResults.length === 0) {
      return `I searched your Excel file (${fileMetadata?.filename || 'project data'}) but couldn't find relevant information to answer your question. Try rephrasing or asking about specific columns, categories, or status values in your data.`;
    }

    const contextRows = searchResults.slice(0, 5).map((result, index) => {
      const rowDataStr = Object.entries(result.rowData)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n');
      return `Row ${result.rowIndex} (relevance: ${(result.similarity * 100).toFixed(1)}%):\n${rowDataStr}`;
    }).join('\n\n');

    const columnHeaders = fileMetadata?.column_headers || [];
    const systemPrompt = `You are dpow.chat, an AI assistant for project directors analyzing Excel project data.

Your Excel file contains ${fileMetadata?.total_rows || 0} rows with columns: ${columnHeaders.join(', ')}.

Guidelines:
1. Answer questions based ONLY on the provided Excel data rows
2. Cite specific row numbers when referencing data
3. Provide quantitative insights when possible (counts, percentages, trends)
4. Identify patterns, risks, or notable items in the data
5. Be concise but thorough (150-250 words)
6. If data is ambiguous, state your assumptions
7. Format responses professionally for executive audiences

The rows below are the most relevant to the user's question.`;

    const userPrompt = `Question: ${question}

Relevant data from Excel file "${fileMetadata?.filename}":

${contextRows}

Analyze this data and provide a clear, actionable answer to the question.`;

    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = completion.choices?.[0]?.message?.content ||
      'I processed your question but encountered an issue generating a response. Please try again.';

    return answer;
  } catch (error) {
    console.error('Error in queryDpowAi:', error);
    return 'I encountered an error processing your question. Please ensure your Excel file is uploaded and try again.';
  }
}

export async function generateSummary(
  data: any[],
  summaryType: 'executive' | 'technical' | 'status' = 'executive'
): Promise<string> {
  try {
    const client = getOpenAIClient();

    let systemPrompt = '';

    if (summaryType === 'executive') {
      systemPrompt = 'You are a Programme Director creating an executive summary for board-level stakeholders. Focus on high-level status, key metrics, risks, and strategic recommendations.';
    } else if (summaryType === 'technical') {
      systemPrompt = 'You are a Technical Lead creating a technical summary. Focus on architecture, implementation details, performance metrics, and technical challenges.';
    } else {
      systemPrompt = 'You are a Project Manager creating a status report. Focus on progress metrics, completion rates, blockers, and upcoming milestones.';
    }

    const dataStr = data.slice(0, 50).map((row, index) => {
      return `Row ${index + 1}: ${JSON.stringify(row)}`;
    }).join('\n');

    const userPrompt = `Generate a ${summaryType} summary based on this project data:

${dataStr}

Provide a concise, professional summary (150-200 words).`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return completion.choices?.[0]?.message?.content || 'Error generating summary. Please try again.';
  } catch (error) {
    console.error('Error in generateSummary:', error);
    return 'Error generating summary. Please try again.';
  }
}
