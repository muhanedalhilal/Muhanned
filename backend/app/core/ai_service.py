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
    أنت خبير تعليمي يعتمد على الذكاء الاصطناعي.
    اقرأ النص التالي المستخرج من مستند تعليمي.
    استخدم هذا النص فقط. لا تستنتج مواضيع من اسم الدورة أو اسم الملف أو أي افتراضات خارجية.
    استخرج "المكونات المعرفية" الأساسية (KCs) - وهي المفاهيم أو التعريفات أو الحقائق الأساسية.
    هام: استخرج فقط أهم 5 إلى 7 مفاهيم نقدية من النص. لا تقم بإرجاع أكثر من 7 مكونات.
    قم بإرجاع النتيجة بتنسيق مصفوفة JSON فقط.
    يجب أن يحتوي كل كائن على مفتاحين فقط: "topic" و "content".
    تعليمات اللغة: يجب أن يكون المخرج (المواضيع والمحتوى) بنفس لغة النص المرفق. إذا كان النص بالعربية أجب بالعربية، وإذا كان بالإنجليزية أجب بالإنجليزية.
    لا تقم بتغليف JSON بكتل ماركداون، فقط أرجع JSON الخام حتى يمكن تحليله.

    النص:
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
    أنت خبير تعليمي يعتمد على الذكاء الاصطناعي.
    قم بتحليل المورد التعليمي المرفق نفسه.
    استخدم فقط المحتوى المرئي أو المقروء داخل الملف المرفق. تجاهل اسم الدورة واسم الملف والافتراضات الخارجية.
    استخرج "المكونات المعرفية" الأساسية (KCs) - وهي المفاهيم أو التعريفات أو الحقائق الأساسية.
    هام: استخرج فقط أهم 5 إلى 7 مفاهيم نقدية من الملف. لا تقم بإرجاع أكثر من 7 مكونات.
    قم بإرجاع النتيجة بتنسيق مصفوفة JSON فقط.
    يجب أن يحتوي كل كائن على مفتاحين فقط: "topic" و "content".
    تعليمات اللغة: يجب أن يكون المخرج (المواضيع والمحتوى) بنفس لغة الملف المرفق. إذا كان محتوى الملف بالعربية أجب بالعربية، وإذا كان بالإنجليزية أجب بالإنجليزية.
    لا تقم بتغليف JSON بكتل ماركداون، فقط أرجع JSON الخام حتى يمكن تحليله.
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
    أنت صانع اختبارات خبير يعتمد على الذكاء الاصطناعي.
    بناءً على المكونات المعرفية التالية بدقة، قم بإنشاء 5 أسئلة متعددة الخيارات.
    هام: يشير 'احتمال الإتقان' (Mastery Probability) (من 0.0 إلى 1.0) إلى مدى فهم الطالب للموضوع.
    - إذا كان احتمال الإتقان منخفضًا (مثل < 0.4)، فقم بإنشاء أسئلة تختبر المفاهيم الأساسية والسهلة.
    - إذا كان احتمال الإتقان متوسطًا (مثل 0.4 إلى 0.7)، فقم بإنشاء أسئلة متوسطة الصعوبة.
    - إذا كان احتمال الإتقان عاليًا (مثل > 0.7)، فقم بإنشاء أسئلة صعبة ومتقدمة تتطلب تفكيرًا نقديًا عميقًا.
    
    قم بإرجاع النتيجة بتنسيق مصفوفة JSON فقط.
    تعليمات اللغة: يجب أن تكون الأسئلة والخيارات بنفس لغة المكونات المعرفية المرفقة (عربي إذا كانت المكونات بالعربية، أو إنجليزي إذا كانت بالإنجليزية).
    يجب أن يحتوي كل كائن على:
    - "question": نص السؤال
    - "options": مصفوفة تحتوي على 4 خيارات نصية بالضبط
    - "answer": فهرس (0-3) الخيار الصحيح
    - "kc_id": المعرف الرقمي للمكون المعرفي الذي يختبره هذا السؤال

    المكونات المعرفية:
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
            "تحتوي الدورة بالفعل على المعرفة التالية المستخرجة من الموارد المرفوعة:\n"
            + "\n".join(content_lines)
        )
        grounding_instruction = (
            "ابنِ اقتراحاتك بشكل صارم على المحتوى أعلاه من الموارد المرفوعة. "
            "لا تخترع مواضيع من اسم الدورة أو المعرفة العامة. "
            "اقترح مواضيع توسع أو تكمل منطقيًا ما هو موجود بالفعل في المواد المرفوعة."
        )
    else:
        resource_context = ""
        grounding_instruction = (
            "نظرًا لعدم رفع أي موارد بعد، اقترح مواضيع ذات صلة عامة بهذه الدورة."
        )

    prompt = f"""
    أنت خبير في تصميم المناهج.
    يدرس الطالب دورة تسمى: "{course_name}".
    لديهم بالفعل مواضيع المكونات المعرفية التالية: {existing_str}.

    {resource_context}

    {grounding_instruction}

    اقترح بالضبط 3 مواضيع جديدة ومتميزة للمكونات المعرفية ليست موجودة بالفعل في القائمة أعلاه.
    تعليمات اللغة: يجب أن تكون المواضيع والمبررات بنفس لغة اسم الدورة والمواضيع الموجودة (عربي إذا كانت بالعربية، أو إنجليزي إذا كانت بالإنجليزية).
    قم بإرجاع النتيجة بتنسيق مصفوفة JSON فقط من كائنات تحتوي على مفتاحين بالضبط:
    - "topic": اسم موضوع قصير وواضح (بحد أقصى 8 كلمات)
    - "rationale": جملة واحدة تشرح سبب أهميته
    لا تقم بتغليف JSON بكتل ماركداون، فقط أرجع JSON الخام.
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
    Step 1: Python keyword check — is the topic word present in any document content?
    Step 2: AI semantic check — is it genuinely about the same subject?
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
        prompt = f"""أنت ذكاء اصطناعي تعليمي. يضيف طالب الموضوع المقترح والمعتمد مسبقًا: "{topic}" إلى دورته: "{course_name}".
        
--- المواد الدراسية المرفوعة ---
{document_corpus}
--- نهاية المواد ---

لخص بالضبط ما تقوله المادة عن "{topic}" في جملتين إلى 3 جمل. لا تضف معرفة خارجية. 
إذا لم يتم العثور على الموضوع الدقيق، فلخص أقرب مفهوم ذي صلة من المادة.

استجب فقط ككائن JSON خام:
{{"valid": true, "topic": "{topic}", "content": "<الملخص من المادة فقط، ويجب أن يكون بنفس لغة المادة>"}}"""
    else:
        prompt = f"""أنت مدقق محتوى تعليمي ومهمتك الوحيدة: تحديد ما إذا كان الموضوع يغطيه بالفعل أو يرتبط ارتباطًا وثيقًا بالمواد الدراسية المرفوعة أدناه.

الدورة: "{course_name}"
الموضوع المطلوب من الطالب: "{topic}"

--- المواد الدراسية المرفوعة ---
{document_corpus}
--- نهاية المواد ---

قواعد القرار — اتبعها بدقة:
1. إذا تمت مناقشة "{topic}" صراحة، أو تعريفه، أو شرحه في المادة → valid=true
2. إذا كان "{topic}" مفهوما تعليميا معترفا به يرتبط ارتباطا مباشرا بالموضوع الشامل للمادة → valid=true
3. إذا ظهر "{topic}" فقط ككلمة عابرة غير ذات صلة (مثلا، في مثال مثل "عد الكلاب") → valid=false
4. إذا كان "{topic}" من مجال مختلف تماما عن المادة → valid=false

أمثلة لما يجب رفضه:
- المادة تتحدث عن الرياضيات، الموضوع هو "الكلاب" → رفض
- المادة تتحدث عن علم الأحياء، الموضوع هو "برمجة بايثون" → رفض
- المادة تتحدث عن الفيزياء، الموضوع هو "الطبخ" → رفض

إذا كان valid=true: لخص بالضبط ما تقوله المادة عن "{topic}" (أو كيف يرتبط بها) في جملتين إلى 3 جمل، واكتب الملخص بنفس لغة المادة.
إذا كان valid=false: اشرح في جملة واحدة سبب الرفض، واكتب الشرح بنفس لغة الموضوع المطلوب.

استجب فقط ككائن JSON خام (بدون ماركداون، وبدون شرح خارج JSON):
{{"valid": true, "topic": "<اسم الموضوع الدقيق>", "content": "<الملخص من المادة فقط>"}}
أو
{{"valid": false, "reason": "<شرح من جملة واحدة>"}}"""

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
        print(f"[validate] topic='{topic}' → valid={result.get('valid')}")
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
    أنت معلم خبير. أنشئ ورقة ملخص دراسي شاملة وسهلة الفهم بناءً على المكونات المعرفية التالية.
    تعليمات اللغة: يجب أن يكون الملخص بنفس لغة المكونات المعرفية المرفقة (عربي إذا كانت المكونات بالعربية، أو إنجليزي إذا كانت بالإنجليزية).
    نسق المخرجات بدقة بتنسيق Markdown النظيف. قم بتضمين عناوين واضحة، ونقاط، وميز المصطلحات الأساسية بخط غامق.
    لا تقم بتضمين أي JSON. فقط أرجع نص Markdown.

    المكونات المعرفية:
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
    أنت خبير تعليمي يعتمد على الذكاء الاصطناعي. قم بإنشاء خريطة ذهنية بتنسيق Mermaid JS بناءً على المكونات المعرفية التالية.
    تعليمات اللغة: يجب أن تكون نصوص العقد بنفس لغة المكونات المعرفية المرفقة (عربي إذا كانت المكونات بالعربية، أو إنجليزي إذا كانت بالإنجليزية).
    يجب أن تحتوي الخريطة الذهنية على عقدة جذرية مركزية (مثل "دليل الدراسة" أو "Study Guide")، تتفرع إلى المواضيع الرئيسية، ثم تتفرع إلى فروع فرعية للتفاصيل الرئيسية.
    
    متطلبات هامة:
    - أخرج فقط صيغة خريطة Mermaid الصالحة.
    - ابدأ المخرجات بالضبط بكلمة: mindmap
    - استخدم المسافات البادئة المناسبة (مسافات) لتحديد التسلسل الهرمي.
    - لا تقم بتغليف المخرجات في كتل التعليمات البرمجية Markdown (على سبيل المثال، لا تستخدم ```mermaid ... ```). فقط كود mermaid الخام.
    - اجعل نص العقدة قصيرًا وموجزًا للغاية (بحد أقصى 3-5 كلمات).
    - لا تستخدم أبدًا أحرفًا خاصة مثل النقطتين (:)، أو الأقواس ()، أو الأقواس المعقوفة []، أو الأقواس المتعرجة {{}}، أو العلامات النجمية (*)، أو علامات الاقتباس (") في نص العقدة. استخدم فقط الأحرف الأبجدية الرقمية والمسافات.

    المكونات المعرفية:
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
