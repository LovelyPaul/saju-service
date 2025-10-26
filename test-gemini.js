// Simple Gemini API test script
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGemini() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_GEMINI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...');
  console.log('');

  const genAI = new GoogleGenerativeAI(apiKey);

  // List available models
  console.log('📋 사용 가능한 모델 목록:');
  try {
    const models = await genAI.listModels();
    for await (const model of models) {
      console.log(`  - ${model.name} (${model.displayName})`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ 모델 목록 가져오기 실패:', error.message);
  }

  // Test gemini-2.5-flash
  console.log('📝 Testing gemini-2.5-flash...');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('안녕하세요! 간단한 사주 분석 테스트입니다. 짧게 답변해주세요.');
    const text = result.response.text();
    console.log('✅ gemini-2.5-flash 성공!');
    console.log('응답:', text);
    console.log('');
  } catch (error) {
    console.error('❌ gemini-2.5-flash 실패:', error.message);
    console.log('');
  }

  // Test gemini-2.5-pro
  console.log('📝 Testing gemini-2.5-pro...');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent('안녕하세요! 간단한 사주 분석 테스트입니다. 짧게 답변해주세요.');
    const text = result.response.text();
    console.log('✅ gemini-2.5-pro 성공!');
    console.log('응답:', text);
  } catch (error) {
    console.error('❌ gemini-2.5-pro 실패:', error.message);
  }
}

testGemini().catch(console.error);
