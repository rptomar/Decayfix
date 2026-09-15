import * as dotenv from 'dotenv';
dotenv.config();

import { generateContentSuggestion } from '../ai';

async function testGemini() {
  console.log('--- Testing Gemini AI Suggestion ---');
  console.log('GEMINI_API_KEY present:', Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('dummy_')));

  const mockPage = {
    url: 'https://godamwala.com/blog/warehouse-and-logistics-guide',
    title: 'Warehouse & Logistics Guide 2024',
    baselineClicks: 350,
    recentClicks: 90,
    dropPercentClicks: 74.3,
    dropPercentImpressions: 65.0,
  };

  const suggestion = await generateContentSuggestion(mockPage);
  console.log('\nGenerated AI Suggestion:\n', suggestion);
  console.log('\n✓ Test completed successfully!');
}

testGemini();
