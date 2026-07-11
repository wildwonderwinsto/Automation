import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { topic, details } = await req.json();

    if (topic.trim().toLowerCase() === 'test') {
      const testScript = "This is a test script to check the video pipeline. It bypasses the AI completely to save time and API quota. Let's see if the final video renders correctly!";
      return NextResponse.json({ script: testScript });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY in .env.local" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Read the instruction file
    const instructionsPath = path.join(process.cwd(), '../Guidelines/instructions/01_script_writer.md');
    let systemPrompt = "";
    try {
      systemPrompt = fs.readFileSync(instructionsPath, 'utf-8');
    } catch (e) {
      console.warn("Could not read instruction file, proceeding with generic prompt.");
      systemPrompt = "You are a professional YouTube script writer. Write a short, engaging script about the given topic.";
    }

    let prompt = `${systemPrompt}\n\nHere is the topic you must write a script about: "${topic}"`;
    
    if (details && details.trim().length > 0) {
      prompt += `\n\nSPECIFIC DETAILS & RESEARCH TO INCLUDE:\n${details.trim()}\n\nMake sure to incorporate these details naturally into the script following the guidelines.`;
    }

    prompt += `\n\nCRITICAL RULES:\n- Output ONLY the words that should be spoken out loud in the video.\n- Do NOT include any markdown formatting (no #, ---, **, etc).\n- Do NOT include section labels like "Hook:", "Main Script:", "Outro:", "CTA:" etc.\n- Do NOT include any preamble, planning, or meta-commentary about the script.\n- Just write the spoken narration as plain flowing text, paragraph by paragraph.`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return NextResponse.json({ script: text });
  } catch (error: any) {
    console.error("Script generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
