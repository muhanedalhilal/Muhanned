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
    
    # Using gemini-2.5-flash which is the correct current model in the API
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    prompt = f"""
    You are an expert educational AI. 
    Read the following text extracted from an educational document.
    Extract the core "Knowledge Components" (KCs) - these are the fundamental concepts, definitions, or facts.
    IMPORTANT: Extract ONLY the top 5 to 7 most critical and important concepts from the text. Do not return more than 7 components.
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

def generate_quiz_from_text(text: str) -> list[dict]:
    """
    Takes combined text from selected KCs and generates 5 Multiple Choice Questions.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    prompt = f"""
    You are an expert AI quiz generator.
    Based strictly on the following text, create 5 multiple choice questions.
    Return the result strictly as a JSON array of objects.
    Each object must have:
    - "question": the question text
    - "options": an array of exactly 4 string options
    - "answer": the index (0-3) of the correct option
    Do not wrap the JSON in markdown blocks, just return raw JSON so it can be parsed.

    Text:
    {text}
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        quiz_data = json.loads(response_text)
        return quiz_data
    except Exception as e:
        print(f"Error generating Quiz: {e}")
        return []

def suggest_components_for_course(course_name: str, existing_topics: list[str]) -> list[dict]:
    """
    Given a course name and the list of already-existing component topics,
    suggests 3 new Knowledge Component topics the student should study.
    Returns a list of dicts with 'topic' and 'rationale'.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    existing_str = ", ".join(existing_topics) if existing_topics else "None yet"

    prompt = f"""
    You are an expert curriculum designer.
    A student is studying a course called: "{course_name}".
    They already have these Knowledge Components: {existing_str}.
    Suggest exactly 3 new, distinct Knowledge Component topics that would be important for this course
    and are NOT already in the list above.
    Return the result strictly as a JSON array of objects with exactly two keys:
    - "topic": a short, clear topic name (max 8 words)
    - "rationale": one sentence explaining why it is important
    Do not wrap the JSON in markdown blocks, just return raw JSON.
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        suggestions = json.loads(response_text)
        return suggestions[:3]
    except Exception as e:
        print(f"Error suggesting components: {e}")
        return []


def validate_and_generate_component(course_name: str, topic: str) -> dict:
    """
    Checks whether a user-entered topic is relevant to the course.
    If relevant, returns {'valid': True, 'topic': ..., 'content': ...}.
    If not, returns {'valid': False, 'reason': ...}.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"valid": False, "reason": "AI service not configured."}

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""
    You are an expert educational content validator.
    A student wants to add a Knowledge Component with the topic: "{topic}"
    to their course: "{course_name}".

    First, decide if this topic is clearly and directly related to the course.
    - If it IS related: generate a concise educational explanation (2-4 sentences) about this topic in the context of the course.
    - If it is NOT related: explain briefly why it doesn't fit.

    Respond strictly as a JSON object (no markdown) with exactly this structure:
    If related:    {{"valid": true, "topic": "<cleaned topic name>", "content": "<educational explanation>"}}
    If not related: {{"valid": false, "reason": "<brief explanation why it doesn't fit>"}}
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        result = json.loads(response_text)
        return result
    except Exception as e:
        print(f"Error validating component: {e}")
        return {"valid": False, "reason": "AI validation failed. Please try again."}
