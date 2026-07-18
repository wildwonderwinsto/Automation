import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { script } = await req.json();
    
    if (script === "This is a test script to check the video pipeline. It bypasses the AI completely to save time and API quota. Let's see if the final video renders correctly!") {
      return NextResponse.json({ scenes: [
        { scene_id: 1, script_text: "This is a test script to check the video pipeline.", simple_description: "person look at screen" },
        { scene_id: 2, script_text: "It bypasses the AI completely to save time and API quota.", simple_description: "brain with red x" },
        { scene_id: 3, script_text: "Let's see if the final video renders correctly!", simple_description: "clapperboard snap shut" }
      ]});
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY in .env.local" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          description: "A scene-by-scene breakdown of the script",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              scene_id: { type: SchemaType.NUMBER, description: "Sequential ID of the scene starting from 1" },
              script_text: { type: SchemaType.STRING, description: "Exact, verbatim substring of the script for this scene" },
              simple_description: { type: SchemaType.STRING, description: "Cave man speak visual description. Absolute minimum words possible. No descriptive words like adjectives or adverbs. Nouns, verbs, and basic prepositions only (e.g. 'look at')." },
              note: { type: SchemaType.STRING, description: "Optional note if something is ambiguous" }
            },
            required: ["scene_id", "script_text", "simple_description"]
          }
        }
      }
    });

    const instructionsPath = path.join(process.cwd(), '../Guidelines/instructions/02_script_to_scene.md');
    let systemPrompt = "";
    try {
      systemPrompt = fs.readFileSync(instructionsPath, 'utf-8');
    } catch (e) {
      systemPrompt = "Split this script into scenes. Return a JSON array of objects with scene_id, script_text, and simple_description.";
    }

    const prompt = `${systemPrompt}\n\nHere is the script to split:\n\n${script}\n\nIMPORTANT: Return ONLY a raw JSON array. DO NOT wrap it in a markdown block.`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    if (text.startsWith("```json")) {
       text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (text.startsWith("```")) {
       text = text.replace(/^```\n/, "").replace(/\n```$/, "");
    }
    
    let parsed;
    try {
       parsed = JSON.parse(text);
    } catch (e) {
       // if it's an object with a scenes array, extract it
       parsed = JSON.parse(text);
    }
    
    // Ensure it's an array
    if (!Array.isArray(parsed) && parsed.scenes && Array.isArray(parsed.scenes)) {
        parsed = parsed.scenes;
    }

    return NextResponse.json({ scenes: parsed });
  } catch (error: any) {
    console.error("Scene splitting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
