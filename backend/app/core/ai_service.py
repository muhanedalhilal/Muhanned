import os
import google.generativeai as genai
import json
import re
import time


def _parse_kc_response(response_text: str) -> list[dict]:
    cleaned = response_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1 or end <= start:
            return []
        try:
            parsed = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            return []

    if not isinstance(parsed, list):
        return []

    kcs = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        topic = str(item.get("topic") or "").strip()
        content = str(item.get("content") or "").strip()
        if topic and content:
            kcs.append({"topic": topic, "content": content})
        if len(kcs) >= 7:
            break
    return kcs

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
    Builds a file-only fallback when a PDF/PPT has no readable content.
    The course_name argument is kept for backwards compatibility but is
    intentionally not used. Uploaded-resource KCs must never be invented from
    the course title.
    """
    resource_label = " ".join((filename or "the uploaded resource").split())

    return [
        {
            "topic": f"{resource_label} Needs Readable Content",
            "content": f"Massar could not extract readable text from {resource_label}, so it did not create components from the course name. Upload a text-based PDF/PPTX or a file with selectable text so components can be generated from the file content."
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

    # Using gemini-2.5-pro which is the correct current model in the API
    model = genai.GenerativeModel("gemini-2.5-pro")

    prompt = f"""
    You are an expert educational AI.
    Read the following text extracted from an educational document.
    Use ONLY this document text. Do not infer topics from the course name, file name, or any outside assumptions.
    Extract the core "Knowledge Components" (KCs) - these are the fundamental concepts, definitions, or facts.
    IMPORTANT: Extract ONLY the top 5 to 7 most critical and important concepts from the text. Do not return more than 7 components.
    Return the result strictly as a JSON array of objects.
    Each object must have exactly two keys: "topic" and "content".
    Language instruction: the topic and content must use the same language as the provided text.
    Do not wrap the JSON in markdown blocks, just return raw JSON so it can be parsed.

    Text:
    {text[:100000]} # Limit to 100K chars for safety, though Gemini supports much more.
    """

    try:
        response = model.generate_content(prompt)
        kcs = _parse_kc_response(response.text)
        return kcs or fallback_kcs_from_text(text)
    except Exception as e:
        print(f"Error generating KCs: {e}")
        return fallback_kcs_from_text(text)


def generate_kcs_from_file(file_path: str, mime_type: str | None = None, filename: str | None = None) -> list[dict]:
    """
    Uses Gemini's file input as a second path when local text extraction is empty.
    This keeps uploaded-resource generation tied to the actual file, not the course name.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found in .env. Cannot generate KCs from uploaded file.")
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-pro")
    uploaded_file = None

    prompt = """
    You are an expert educational AI.
    Analyze the uploaded educational resource itself.
    Use ONLY the content visible or readable inside the uploaded file. Ignore the course name, file name, and outside assumptions.
    Extract the core "Knowledge Components" (KCs) - these are the fundamental concepts, definitions, or facts.
    IMPORTANT: Extract ONLY the top 5 to 7 most critical and important concepts from the file. Do not return more than 7 components.
    Return the result strictly as a JSON array of objects.
    Each object must have exactly two keys: "topic" and "content".
    Language instruction: the topic and content must use the same language as the uploaded file.
    Do not wrap the JSON in markdown blocks, just return raw JSON so it can be parsed.
    """

    try:
        uploaded_file = genai.upload_file(
            file_path,
            mime_type=mime_type,
            display_name=filename or os.path.basename(file_path)
        )

        for _ in range(12):
            state = getattr(getattr(uploaded_file, "state", None), "name", None)
            if state != "PROCESSING":
                break
            time.sleep(1)
            uploaded_file = genai.get_file(uploaded_file.name)

        state = getattr(getattr(uploaded_file, "state", None), "name", None)
        if state == "FAILED":
            print(f"Gemini file processing failed for {filename or file_path}.")
            return []

        response = model.generate_content([uploaded_file, prompt])
        return _parse_kc_response(response.text)
    except Exception as e:
        print(f"Error generating KCs from uploaded file: {e}")
        return []
    finally:
        if uploaded_file is not None:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass

def generate_quiz_from_kcs(kcs: list[dict]) -> list[dict]:
    """
    Takes a list of Knowledge Components and generates 5 Multiple Choice Questions.
    Each question must be explicitly linked to one of the provided kc_ids.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-pro")

    # Format KCs for the prompt
    kcs_text = "\n\n".join([f"ID: {kc['id']}\nTopic: {kc['topic']}\nContent: {kc['content']}\nMastery Probability: {kc['mastery_prob']}" for kc in kcs])

    prompt = f"""
    Ø£Ù†Øª ØµØ§Ù†Ø¹ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø®Ø¨ÙŠØ± ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ.
    Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙÙŠØ© Ø§Ù„ØªØ§Ù„ÙŠØ© Ø¨Ø¯Ù‚Ø©ØŒ Ù‚Ù… Ø¨Ø¥Ù†Ø´Ø§Ø¡ 5 Ø£Ø³Ø¦Ù„Ø© Ù…ØªØ¹Ø¯Ø¯Ø© Ø§Ù„Ø®ÙŠØ§Ø±Ø§Øª.
    Ù‡Ø§Ù…: ÙŠØ´ÙŠØ± 'Ø§Ø­ØªÙ…Ø§Ù„ Ø§Ù„Ø¥ØªÙ‚Ø§Ù†' (Mastery Probability) (Ù…Ù† 0.0 Ø¥Ù„Ù‰ 1.0) Ø¥Ù„Ù‰ Ù…Ø¯Ù‰ ÙÙ‡Ù… Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù„Ù…ÙˆØ¶ÙˆØ¹.
    - Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ø­ØªÙ…Ø§Ù„ Ø§Ù„Ø¥ØªÙ‚Ø§Ù† Ù…Ù†Ø®ÙØ¶Ù‹Ø§ (Ù…Ø«Ù„ < 0.4)ØŒ ÙÙ‚Ù… Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ø£Ø³Ø¦Ù„Ø© ØªØ®ØªØ¨Ø± Ø§Ù„Ù…ÙØ§Ù‡ÙŠÙ… Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ÙˆØ§Ù„Ø³Ù‡Ù„Ø©.
    - Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ø­ØªÙ…Ø§Ù„ Ø§Ù„Ø¥ØªÙ‚Ø§Ù† Ù…ØªÙˆØ³Ø·Ù‹Ø§ (Ù…Ø«Ù„ 0.4 Ø¥Ù„Ù‰ 0.7)ØŒ ÙÙ‚Ù… Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ø£Ø³Ø¦Ù„Ø© Ù…ØªÙˆØ³Ø·Ø© Ø§Ù„ØµØ¹ÙˆØ¨Ø©.
    - Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ø­ØªÙ…Ø§Ù„ Ø§Ù„Ø¥ØªÙ‚Ø§Ù† Ø¹Ø§Ù„ÙŠÙ‹Ø§ (Ù…Ø«Ù„ > 0.7)ØŒ ÙÙ‚Ù… Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ø£Ø³Ø¦Ù„Ø© ØµØ¹Ø¨Ø© ÙˆÙ…ØªÙ‚Ø¯Ù…Ø© ØªØªØ·Ù„Ø¨ ØªÙÙƒÙŠØ±Ù‹Ø§ Ù†Ù‚Ø¯ÙŠÙ‹Ø§ Ø¹Ù…ÙŠÙ‚Ù‹Ø§.

    Ù‚Ù… Ø¨Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø¨ØªÙ†Ø³ÙŠÙ‚ Ù…ØµÙÙˆÙØ© JSON ÙÙ‚Ø·.
    ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ù„ØºØ©: ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø§Ù„Ø£Ø³Ø¦Ù„Ø© ÙˆØ§Ù„Ø®ÙŠØ§Ø±Ø§Øª Ø¨Ù†ÙØ³ Ù„ØºØ© Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙÙŠØ© Ø§Ù„Ù…Ø±ÙÙ‚Ø© (Ø¹Ø±Ø¨ÙŠ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø£Ùˆ Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©).
    ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙˆÙŠ ÙƒÙ„ ÙƒØ§Ø¦Ù† Ø¹Ù„Ù‰:
    - "question": Ù†Øµ Ø§Ù„Ø³Ø¤Ø§Ù„
    - "options": Ù…ØµÙÙˆÙØ© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ 4 Ø®ÙŠØ§Ø±Ø§Øª Ù†ØµÙŠØ© Ø¨Ø§Ù„Ø¶Ø¨Ø·
    - "answer": ÙÙ‡Ø±Ø³ (0-3) Ø§Ù„Ø®ÙŠØ§Ø± Ø§Ù„ØµØ­ÙŠØ­
    - "kc_id": Ø§Ù„Ù…Ø¹Ø±Ù Ø§Ù„Ø±Ù‚Ù…ÙŠ Ù„Ù„Ù…ÙƒÙˆÙ† Ø§Ù„Ù…Ø¹Ø±ÙÙŠ Ø§Ù„Ø°ÙŠ ÙŠØ®ØªØ¨Ø±Ù‡ Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¤Ø§Ù„

    Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙÙŠØ©:
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

def suggest_components_for_course(course_name: str, existing_topics: list[str], existing_kc_data: list[dict] | None = None) -> list[dict]:
    """
    Suggests 3 new Knowledge Component topics.
    If existing_kc_data (with topic+content from uploaded resources) is provided,
    suggestions are grounded in the actual document content rather than just the course name.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-pro")

    existing_str = ", ".join(existing_topics) if existing_topics else "None yet"

    # Build a content summary from the actual uploaded resource KCs
    if existing_kc_data:
        content_lines = []
        for kc in existing_kc_data[:15]:  # cap to avoid huge prompts
            content_lines.append(f"- {kc['topic']}: {kc['content'][:300]}")
        resource_context = (
            "ØªØ­ØªÙˆÙŠ Ø§Ù„Ø¯ÙˆØ±Ø© Ø¨Ø§Ù„ÙØ¹Ù„ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„ØªØ§Ù„ÙŠØ© Ø§Ù„Ù…Ø³ØªØ®Ø±Ø¬Ø© Ù…Ù† Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø©:\n"
            + "\n".join(content_lines)
        )
        grounding_instruction = (
            "Ø§Ø¨Ù†Ù Ø§Ù‚ØªØ±Ø§Ø­Ø§ØªÙƒ Ø¨Ø´ÙƒÙ„ ØµØ§Ø±Ù… Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø£Ø¹Ù„Ø§Ù‡ Ù…Ù† Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø©. "
            "Ù„Ø§ ØªØ®ØªØ±Ø¹ Ù…ÙˆØ§Ø¶ÙŠØ¹ Ù…Ù† Ø§Ø³Ù… Ø§Ù„Ø¯ÙˆØ±Ø© Ø£Ùˆ Ø§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„Ø¹Ø§Ù…Ø©. "
            "Ø§Ù‚ØªØ±Ø­ Ù…ÙˆØ§Ø¶ÙŠØ¹ ØªÙˆØ³Ø¹ Ø£Ùˆ ØªÙƒÙ…Ù„ Ù…Ù†Ø·Ù‚ÙŠÙ‹Ø§ Ù…Ø§ Ù‡Ùˆ Ù…ÙˆØ¬ÙˆØ¯ Ø¨Ø§Ù„ÙØ¹Ù„ ÙÙŠ Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø©."
        )
    else:
        resource_context = ""
        grounding_instruction = (
            "Ù†Ø¸Ø±Ù‹Ø§ Ù„Ø¹Ø¯Ù… Ø±ÙØ¹ Ø£ÙŠ Ù…ÙˆØ§Ø±Ø¯ Ø¨Ø¹Ø¯ØŒ Ø§Ù‚ØªØ±Ø­ Ù…ÙˆØ§Ø¶ÙŠØ¹ Ø°Ø§Øª ØµÙ„Ø© Ø¹Ø§Ù…Ø© Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙˆØ±Ø©."
        )

    prompt = f"""
    Ø£Ù†Øª Ø®Ø¨ÙŠØ± ÙÙŠ ØªØµÙ…ÙŠÙ… Ø§Ù„Ù…Ù†Ø§Ù‡Ø¬.
    ÙŠØ¯Ø±Ø³ Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¯ÙˆØ±Ø© ØªØ³Ù…Ù‰: "{course_name}".
    Ù„Ø¯ÙŠÙ‡Ù… Ø¨Ø§Ù„ÙØ¹Ù„ Ù…ÙˆØ§Ø¶ÙŠØ¹ Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙÙŠØ© Ø§Ù„ØªØ§Ù„ÙŠØ©: {existing_str}.

    {resource_context}

    {grounding_instruction}

    Ø§Ù‚ØªØ±Ø­ Ø¨Ø§Ù„Ø¶Ø¨Ø· 3 Ù…ÙˆØ§Ø¶ÙŠØ¹ Ø¬Ø¯ÙŠØ¯Ø© ÙˆÙ…ØªÙ…ÙŠØ²Ø© Ù„Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙÙŠØ© Ù„ÙŠØ³Øª Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„ ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø£Ø¹Ù„Ø§Ù‡.
    ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ù„ØºØ©: ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø§Ù„Ù…ÙˆØ§Ø¶ÙŠØ¹ ÙˆØ§Ù„Ù…Ø¨Ø±Ø±Ø§Øª Ø¨Ù†ÙØ³ Ù„ØºØ© Ø§Ø³Ù… Ø§Ù„Ø¯ÙˆØ±Ø© ÙˆØ§Ù„Ù…ÙˆØ§Ø¶ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© (Ø¹Ø±Ø¨ÙŠ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø£Ùˆ Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©).
    Ù‚Ù… Ø¨Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø¨ØªÙ†Ø³ÙŠÙ‚ Ù…ØµÙÙˆÙØ© JSON ÙÙ‚Ø· Ù…Ù† ÙƒØ§Ø¦Ù†Ø§Øª ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ù…ÙØªØ§Ø­ÙŠÙ† Ø¨Ø§Ù„Ø¶Ø¨Ø·:
    - "topic": Ø§Ø³Ù… Ù…ÙˆØ¶ÙˆØ¹ Ù‚ØµÙŠØ± ÙˆÙˆØ§Ø¶Ø­ (Ø¨Ø­Ø¯ Ø£Ù‚ØµÙ‰ 8 ÙƒÙ„Ù…Ø§Øª)
    - "rationale": Ø¬Ù…Ù„Ø© ÙˆØ§Ø­Ø¯Ø© ØªØ´Ø±Ø­ Ø³Ø¨Ø¨ Ø£Ù‡Ù…ÙŠØªÙ‡
    Ù„Ø§ ØªÙ‚Ù… Ø¨ØªØºÙ„ÙŠÙ JSON Ø¨ÙƒØªÙ„ Ù…Ø§Ø±ÙƒØ¯Ø§ÙˆÙ†ØŒ ÙÙ‚Ø· Ø£Ø±Ø¬Ø¹ JSON Ø§Ù„Ø®Ø§Ù….
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


def validate_and_generate_component(course_name: str, topic: str, existing_kc_data: list[dict] | None = None, is_suggestion: bool = False, has_documents: bool = False) -> dict:
    """
    Validates a manually entered topic against the actual uploaded document content.
    Step 1: Python keyword check â€” is the topic word present in any document content?
    Step 2: AI semantic check â€” is it genuinely about the same subject?
    Rejects anything not clearly in the uploaded material.
    If is_suggestion=True, skips validation and just extracts the content.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"valid": False, "reason": "AI service not configured."}

    # If no documents uploaded at all, cannot validate or generate content
    if not has_documents and not existing_kc_data and not is_suggestion:
        return {
            "valid": False,
            "reason": "No course resources uploaded yet. Please upload a document first so topics can be validated against real content."
        }

    # Build document corpus
    content_lines = []
    if existing_kc_data:
        for kc in existing_kc_data[:15]:
            content_lines.append(f"TOPIC: {kc['topic']}\nCONTENT: {kc['content'][:400]}")
    document_corpus = "\n\n".join(content_lines) if content_lines else "No readable text could be extracted from the uploaded resources."

    # --- Step 1: Python keyword pre-check (Skip if AI suggestion or if we have no readable text) ---
    if not is_suggestion and existing_kc_data:
        corpus_text = " ".join(
            f"{kc.get('topic','')} {kc.get('content','')}" for kc in existing_kc_data
        ).lower()

        print(f"[validate] corpus length={len(corpus_text)} chars, topic='{topic}'")

        # Check if any meaningful word from the topic appears in the corpus
        topic_words = [w.strip(".,;:!?()[]") for w in topic.lower().split() if len(w) >= 3]

        # If topic has no words >= 3 chars (e.g. "AI", "UX", short Arabic words),
        # skip the keyword pre-check and let the AI decide.
        if not topic_words:
            keyword_found = True
        else:
            keyword_found = any(word in corpus_text for word in topic_words)

        if not keyword_found:
            return {
                "valid": False,
                "reason": f"The topic \"{topic}\" does not appear in your uploaded course materials. Only add topics that are directly covered in your uploaded files."
            }

    # --- Step 2: AI Generation / Semantic validation ---
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-pro")

    if is_suggestion:
        prompt = f"""Ø£Ù†Øª Ø°ÙƒØ§Ø¡ Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ØªØ¹Ù„ÙŠÙ…ÙŠ. ÙŠØ¶ÙŠÙ Ø·Ø§Ù„Ø¨ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ù…Ù‚ØªØ±Ø­ ÙˆØ§Ù„Ù…Ø¹ØªÙ…Ø¯ Ù…Ø³Ø¨Ù‚Ù‹Ø§: "{topic}" Ø¥Ù„Ù‰ Ø¯ÙˆØ±ØªÙ‡: "{course_name}".

--- Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø© ---
{document_corpus}
--- Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ù…ÙˆØ§Ø¯ ---

Ù„Ø®Øµ Ø¨Ø§Ù„Ø¶Ø¨Ø· Ù…Ø§ ØªÙ‚ÙˆÙ„Ù‡ Ø§Ù„Ù…Ø§Ø¯Ø© Ø¹Ù† "{topic}" ÙÙŠ Ø¬Ù…Ù„ØªÙŠÙ† Ø¥Ù„Ù‰ 3 Ø¬Ù…Ù„. Ù„Ø§ ØªØ¶Ù Ù…Ø¹Ø±ÙØ© Ø®Ø§Ø±Ø¬ÙŠØ©.
Ø¥Ø°Ø§ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ù‚ÙŠÙ‚ØŒ ÙÙ„Ø®Øµ Ø£Ù‚Ø±Ø¨ Ù…ÙÙ‡ÙˆÙ… Ø°ÙŠ ØµÙ„Ø© Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø©.

Ø§Ø³ØªØ¬Ø¨ ÙÙ‚Ø· ÙƒÙƒØ§Ø¦Ù† JSON Ø®Ø§Ù…:
{{"valid": true, "topic": "{topic}", "content": "<Ø§Ù„Ù…Ù„Ø®Øµ Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© ÙÙ‚Ø·ØŒ ÙˆÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø¨Ù†ÙØ³ Ù„ØºØ© Ø§Ù„Ù…Ø§Ø¯Ø©>"}}"""
    else:
        prompt = f"""Ø£Ù†Øª Ù…Ø¯Ù‚Ù‚ Ù…Ø­ØªÙˆÙ‰ ØªØ¹Ù„ÙŠÙ…ÙŠ ÙˆÙ…Ù‡Ù…ØªÙƒ Ø§Ù„ÙˆØ­ÙŠØ¯Ø©: ØªØ­Ø¯ÙŠØ¯ Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ ÙŠØºØ·ÙŠÙ‡ Ø¨Ø§Ù„ÙØ¹Ù„ Ø£Ùˆ ÙŠØ±ØªØ¨Ø· Ø§Ø±ØªØ¨Ø§Ø·Ù‹Ø§ ÙˆØ«ÙŠÙ‚Ù‹Ø§ Ø¨Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø© Ø£Ø¯Ù†Ø§Ù‡.

Ø§Ù„Ø¯ÙˆØ±Ø©: "{course_name}"
Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ù…Ù† Ø§Ù„Ø·Ø§Ù„Ø¨: "{topic}"

--- Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ© Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø© ---
{document_corpus}
--- Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ù…ÙˆØ§Ø¯ ---

Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ù‚Ø±Ø§Ø± â€” Ø§ØªØ¨Ø¹Ù‡Ø§ Ø¨Ø¯Ù‚Ø©:
1. Ø¥Ø°Ø§ ØªÙ…Øª Ù…Ù†Ø§Ù‚Ø´Ø© "{topic}" ØµØ±Ø§Ø­Ø©ØŒ Ø£Ùˆ ØªØ¹Ø±ÙŠÙÙ‡ØŒ Ø£Ùˆ Ø´Ø±Ø­Ù‡ ÙÙŠ Ø§Ù„Ù…Ø§Ø¯Ø© â†’ valid=true
2. Ø¥Ø°Ø§ ÙƒØ§Ù† "{topic}" Ù…ÙÙ‡ÙˆÙ…Ø§ ØªØ¹Ù„ÙŠÙ…ÙŠØ§ Ù…Ø¹ØªØ±ÙØ§ Ø¨Ù‡ ÙŠØ±ØªØ¨Ø· Ø§Ø±ØªØ¨Ø§Ø·Ø§ Ù…Ø¨Ø§Ø´Ø±Ø§ Ø¨Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø´Ø§Ù…Ù„ Ù„Ù„Ù…Ø§Ø¯Ø© â†’ valid=true
3. Ø¥Ø°Ø§ Ø¸Ù‡Ø± "{topic}" ÙÙ‚Ø· ÙƒÙƒÙ„Ù…Ø© Ø¹Ø§Ø¨Ø±Ø© ØºÙŠØ± Ø°Ø§Øª ØµÙ„Ø© (Ù…Ø«Ù„Ø§ØŒ ÙÙŠ Ù…Ø«Ø§Ù„ Ù…Ø«Ù„ "Ø¹Ø¯ Ø§Ù„ÙƒÙ„Ø§Ø¨") â†’ valid=false
4. Ø¥Ø°Ø§ ÙƒØ§Ù† "{topic}" Ù…Ù† Ù…Ø¬Ø§Ù„ Ù…Ø®ØªÙ„Ù ØªÙ…Ø§Ù…Ø§ Ø¹Ù† Ø§Ù„Ù…Ø§Ø¯Ø© â†’ valid=false

Ø£Ù…Ø«Ù„Ø© Ù„Ù…Ø§ ÙŠØ¬Ø¨ Ø±ÙØ¶Ù‡:
- Ø§Ù„Ù…Ø§Ø¯Ø© ØªØªØ­Ø¯Ø« Ø¹Ù† Ø§Ù„Ø±ÙŠØ§Ø¶ÙŠØ§ØªØŒ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ù‡Ùˆ "Ø§Ù„ÙƒÙ„Ø§Ø¨" â†’ Ø±ÙØ¶
- Ø§Ù„Ù…Ø§Ø¯Ø© ØªØªØ­Ø¯Ø« Ø¹Ù† Ø¹Ù„Ù… Ø§Ù„Ø£Ø­ÙŠØ§Ø¡ØŒ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ù‡Ùˆ "Ø¨Ø±Ù…Ø¬Ø© Ø¨Ø§ÙŠØ«ÙˆÙ†" â†’ Ø±ÙØ¶
- Ø§Ù„Ù…Ø§Ø¯Ø© ØªØªØ­Ø¯Ø« Ø¹Ù† Ø§Ù„ÙÙŠØ²ÙŠØ§Ø¡ØŒ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ù‡Ùˆ "Ø§Ù„Ø·Ø¨Ø®" â†’ Ø±ÙØ¶

Ø¥Ø°Ø§ ÙƒØ§Ù† valid=true: Ù„Ø®Øµ Ø¨Ø§Ù„Ø¶Ø¨Ø· Ù…Ø§ ØªÙ‚ÙˆÙ„Ù‡ Ø§Ù„Ù…Ø§Ø¯Ø© Ø¹Ù† "{topic}" (Ø£Ùˆ ÙƒÙŠÙ ÙŠØ±ØªØ¨Ø· Ø¨Ù‡Ø§) ÙÙŠ Ø¬Ù…Ù„ØªÙŠÙ† Ø¥Ù„Ù‰ 3 Ø¬Ù…Ù„ØŒ ÙˆØ§ÙƒØªØ¨ Ø§Ù„Ù…Ù„Ø®Øµ Ø¨Ù†ÙØ³ Ù„ØºØ© Ø§Ù„Ù…Ø§Ø¯Ø©.
Ø¥Ø°Ø§ ÙƒØ§Ù† valid=false: Ø§Ø´Ø±Ø­ ÙÙŠ Ø¬Ù…Ù„Ø© ÙˆØ§Ø­Ø¯Ø© Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶ØŒ ÙˆØ§ÙƒØªØ¨ Ø§Ù„Ø´Ø±Ø­ Ø¨Ù†ÙØ³ Ù„ØºØ© Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨.

Ø§Ø³ØªØ¬Ø¨ ÙÙ‚Ø· ÙƒÙƒØ§Ø¦Ù† JSON Ø®Ø§Ù… (Ø¨Ø¯ÙˆÙ† Ù…Ø§Ø±ÙƒØ¯Ø§ÙˆÙ†ØŒ ÙˆØ¨Ø¯ÙˆÙ† Ø´Ø±Ø­ Ø®Ø§Ø±Ø¬ JSON):
{{"valid": true, "topic": "<Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø¯Ù‚ÙŠÙ‚>", "content": "<Ø§Ù„Ù…Ù„Ø®Øµ Ù…Ù† Ø§Ù„Ù…Ø§Ø¯Ø© ÙÙ‚Ø·>"}}
Ø£Ùˆ
{{"valid": false, "reason": "<Ø´Ø±Ø­ Ù…Ù† Ø¬Ù…Ù„Ø© ÙˆØ§Ø­Ø¯Ø©>"}}"""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        result = json.loads(response_text.strip())
        print(f"[validate] topic='{topic}' â†’ valid={result.get('valid')}")
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
    model = genai.GenerativeModel("gemini-2.5-pro")

    kcs_text = "\n\n".join([f"Topic: {kc['topic']}\nContent: {kc['content']}" for kc in kcs])

    prompt = f"""
    You are an expert tutor. Create a comprehensive, easy-to-understand study summary sheet based on the following Knowledge Components.
    Language instruction: write the summary in the same language as the Knowledge Components.
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
    model = genai.GenerativeModel("gemini-2.5-pro")

    kcs_text = "\n\n".join([f"Topic: {kc['topic']}\nContent: {kc['content']}" for kc in kcs])

    prompt = f"""
    You are an expert educational AI. Generate a Mermaid JS mindmap based on the following Knowledge Components.
    Language instruction: use the same language as the Knowledge Components for node text.
    The mindmap should have a central root node (e.g. "Study Guide"), branching out to the main topics, and then sub-branches for key details.

    IMPORTANT REQUIREMENTS:
    - Output ONLY valid Mermaid mindmap syntax.
    - Start the output with exactly: mindmap
    - Use proper indentation (spaces) to define the hierarchy.
    - Do NOT wrap the output in markdown code blocks (e.g. do not use ```mermaid ... ```). Just the raw mermaid code.
    - Keep node text short, ideally 3 to 5 words.
    - Avoid special characters in node text, including colons, brackets, braces, asterisks, and quotes.

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

        # Sanitize common syntax errors
        response_text = response_text.replace("**", "").replace("*", "")
        response_text = response_text.replace(":", " -").replace(";", ",")
        response_text = response_text.replace("(", "").replace(")", "")
        response_text = response_text.replace("[", "").replace("]", "")

        return response_text.strip()
    except Exception as e:
        print(f"Error generating mind map: {e}")
        return "mindmap\n  Error\n    GenerationFailed"
