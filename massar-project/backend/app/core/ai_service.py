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


def generate_course_image(course_name: str, description: str = "") -> bytes | None:
    """
    Generates an AI cover image for a course using Google Imagen.
    Returns raw image bytes (JPEG) on success, None on failure.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY not found. Cannot generate course image.")
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # Build a rich prompt for the course cover
        desc_hint = f" The course focuses on: {description}." if description else ""
        prompt = (
            f"Create a beautiful, modern, professional educational cover illustration for a course titled '{course_name}'.{desc_hint} "
            f"The image must NOT contain any people, humans, faces, hands, or characters. "
            f"Instead, use abstract icons, symbols, tools, objects, and visual elements that represent the subject. "
            f"Use a modern flat design style with soft gradients, no text or letters in the image. "
            f"Suitable as a course thumbnail or banner. High quality, 16:9 aspect ratio."
        )

        response = client.models.generate_images(
            model="imagen-4.0-fast-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                output_mime_type="image/jpeg",
            ),
        )

        if response.generated_images and len(response.generated_images) > 0:
            image_bytes = response.generated_images[0].image.image_bytes
            print(f"Successfully generated image for course: {course_name}")
            return image_bytes
        else:
            print(f"No image generated for course: {course_name}")
            return None

    except Exception as e:
        print(f"Error generating course image: {e}")
        return None

