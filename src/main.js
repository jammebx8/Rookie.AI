const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI("AIzaSyCWL90RyHaQesEDihjXeuV_V3BGtNa6NZs");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,       // More creative response
    topK: 50,
    topP: 0.9,
    maxOutputTokens: 150 ,   // Limit length
  },
});

const prompt = "explain photosynthesis like I'm 5 years old";

const generate = async () => {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    console.log(response);
  } catch(err) {
    console.log("Error generating content:", err);
  }
}

generate();
