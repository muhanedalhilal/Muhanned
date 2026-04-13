import os
import google.generativeai as genai
import json

def generate_kcs_from_text(text: str) -> list[dict]:
    """
    Takes extracted text from a document and uses Gemini to generate Knowledge Components.
    Returns a list of dictionaries with 'topic' and 'content'.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found in .env. Cannot generate KCs.")
        return []

    genai.configure(api_key=api_key)
    
    # We use gemini-1.5-flash as it is fast and suitable for this task
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""
    You are an expert educational AI. 
    Read the following text extracted from an educational document.
    Extract the core "Knowledge Components" (KCs) - these are the fundamental concepts, definitions, or facts.
    Return the result strictly as a JSON array of objects. 
    Each object must have exactly two keys: "topic" and "content".
    Do not wrap the JSON in markdown blocks, just return raw JSON so it can be parsed.

    Text:
    {text[:100000]} # Limit to 100K chars for safety, though Gemini supports much more.
    """

    try:
        response = model.generate_content(prompt)
        # Attempt to parse json
        response_text = response.text.strip()
        
        # Sometimes Gemini wraps in ```json ... ```
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        kcs = json.loads(response_text)
        return kcs
    except Exception as e:
        print(f"Error generating KCs: {e}")
        return []
