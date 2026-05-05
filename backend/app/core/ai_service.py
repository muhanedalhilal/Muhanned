import os
import google.generativeai as genai
import json
import re

def fallback_kcs_from_text(text: str, max_items: int = 7) -> list[dict]:
    """
    Builds simple Knowledge Components locally when the AI provider is unavailable.
    """
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    chunks = re.split(r"(?<=[.!?])\s+|\n+", cleaned)
    kcs = []
    seen_topics = set()

    for chunk in chunks:
        content = chunk.strip()
        if len(content) < 40:
            continue

        words = content.split()
        topic = " ".join(words[:8]).strip(" ,.;:-")
        if len(words) > 8:
            topic += "..."

        topic_key = topic.lower()
        if topic_key in seen_topics:
            continue

        seen_topics.add(topic_key)
        kcs.append({
            "topic": topic,
            "content": content[:500]
        })

        if len(kcs) >= max_items:
            break

    if kcs:
        return kcs

    return [{
        "topic": "Uploaded Resource Overview",
        "content": cleaned[:500]
    }]

def fallback_kcs_for_resource(course_name: str | None, filename: str | None) -> list[dict]:
    """
    Builds useful starter components when a PDF/PPT has no extractable text.
    This keeps uploaded resources from producing an empty course.
    """
    course_label = " ".join((course_name or "this course").split())
    resource_label = " ".join((filename or "the uploaded resource").split())

    return [
        {
            "topic": f"{course_label} Resource Overview",
            "content": f"Review {resource_label} as part of {course_label}. Identify the main learning objective, the section titles, and the ideas the resource repeats or emphasizes."
        },
        {
            "topic": f"{course_label} Core Vocabulary",
            "content": f"Collect the important terms, symbols, formulas, and definitions introduced in {resource_label}. Make sure each term can be explained in your own words."
        },
        {
            "topic": "Key Procedures and Methods",
            "content": f"Break down the main procedures shown in {resource_label} into clear steps. Focus on when each step is used and what result it should produce."
        },
        {
            "topic": "Worked Examples",
            "content": f"Use examples from {resource_label} to connect the theory to practice. For each example, note the givens, the method used, and the final conclusion."
        },
        {
            "topic": "Practice and Mastery Check",
            "content": f"After studying {resource_label}, practice retrieving the key ideas without looking. Mark any weak points for review before starting a quiz."
        }
    ]

def generate_kcs_from_text(text: str) -> list[dict]:
    """
    Takes extracted text from a document and uses Gemini to generate Knowledge Components.
    Returns a list of dictionaries with 'topic' and 'content'.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found in .env. Cannot generate KCs.")
        return fallback_kcs_from_text(text)

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
        return fallback_kcs_from_text(text)

def generate_quiz_from_kcs(kcs: list[dict]) -> list[dict]:
    """
    Takes a list of Knowledge Components and generates 5 Multiple Choice Questions.
    Each question must be explicitly linked to one of the provided kc_ids.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    # Format KCs for the prompt
    kcs_text = "\n\n".join([f"ID: {kc['id']}\nTopic: {kc['topic']}\nContent: {kc['content']}\nMastery Probability: {kc['mastery_prob']}" for kc in kcs])

    prompt = f"""
    You are an expert AI quiz generator.
    Based strictly on the following knowledge components, create 5 multiple choice questions.
    IMPORTANT: The 'Mastery Probability' (0.0 to 1.0) indicates how well the student understands the topic. 
    - If Mastery Probability is low (e.g., < 0.4), generate questions that test fundamental, easy concepts.
    - If Mastery Probability is medium (e.g., 0.4 to 0.7), generate moderately difficult questions.
    - If Mastery Probability is high (e.g., > 0.7), generate hard, advanced questions requiring deep critical thinking.
    
    Return the result strictly as a JSON array of objects.
    Each object must have:
    - "question": the question text
    - "options": an array of exactly 4 string options
    - "answer": the index (0-3) of the correct option
    - "kc_id": the integer ID of the knowledge component this question tests

    Knowledge Components:
    {kcs_text}
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

def generate_summary_from_kcs(kcs: list[dict]) -> str:
    """
    Takes a list of Knowledge Components and generates a comprehensive summary sheet in Markdown.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI service not configured."

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    kcs_text = "\n\n".join([f"Topic: {kc['topic']}\nContent: {kc['content']}" for kc in kcs])

    prompt = f"""
    You are an expert tutor. Create a comprehensive, easy-to-understand study summary sheet based on the following Knowledge Components.
    Format the output strictly in clean Markdown. Include clear headings, bullet points, and highlight key terms in bold.
    Do not include any JSON. Only return the Markdown text.

    Knowledge Components:
    {kcs_text}
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "An error occurred while generating the summary."

def generate_mind_map_from_kcs(kcs: list[dict]) -> str:
    """
    Takes a list of Knowledge Components and generates a Mermaid JS mind map.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI service not configured."

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    kcs_text = "\n\n".join([f"Topic: {kc['topic']}\nContent: {kc['content']}" for kc in kcs])

    prompt = f"""
    You are an expert educational AI. Generate a Mermaid JS mindmap based on the following Knowledge Components.
    The mindmap should have a central root node (e.g. "Study Guide"), branching out to the main topics, and then sub-branches for key details.
    
    IMPORTANT REQUIREMENTS:
    - Output ONLY valid Mermaid mindmap syntax.
    - Start the output with exactly: mindmap
    - Use proper indentation (spaces) to define the hierarchy.
    - Do NOT wrap the output in markdown code blocks (e.g. do not use ```mermaid ... ```). Just the raw mermaid code.
    - Keep node text relatively short. Use quotes if text has special characters like brackets or parentheses.

    Knowledge Components:
    {kcs_text}
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```mermaid"):
            response_text = response_text[10:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        return response_text.strip()
    except Exception as e:
        print(f"Error generating mind map: {e}")
        return "mindmap\n  Error\n    GenerationFailed"

