import hashlib
from urllib.parse import quote


NEGATIVE_PROMPT = (
    "readable text, fake text, misspelled text, gibberish letters, words, captions, "
    "headlines, labels, logos, watermark, signage, chalkboard writing, whiteboard writing, "
    "poster, book-cover text, screen code, low quality, blurry, distorted objects, cluttered desk, "
    "messy composition, cartoon, vector art, flat illustration, abstract template"
)


def _clean_course_name(course_name: str) -> str:
    return " ".join((course_name or "educational course").split())[:90] or "educational course"


def _stable_seed(course_name: str, seed: int | str | None = None, salt: str = "primary") -> str:
    source = f"{course_name}|{seed if seed is not None else ''}|{salt}"
    return hashlib.sha256(source.encode("utf-8")).hexdigest()[:12]


def _subject_visual_brief(course_name: str) -> str:
    name = course_name.lower()
    subject_briefs = [
        (
            ("software", "programming", "coding", "computer science", "web development", "app development", "developer"),
            "a sleek software engineering workspace with a laptop showing abstract non-readable UI panels, subtle circuit-board details, small server lights, and clean blue technology accents"
        ),
        (
            ("math", "mathematics", "algebra", "calculus", "geometry", "statistics", "trigonometry"),
            "a precise mathematics learning scene with geometric solids, a compass, ruler, graph-paper texture without numbers or letters, and elegant 3D coordinate forms"
        ),
        (
            ("physics", "mechanics", "electricity", "optics", "quantum"),
            "a modern physics lab still life with a prism splitting light, pendulum apparatus, coils, lenses, and clean experimental equipment"
        ),
        (
            ("chemistry", "chemical"),
            "a clean chemistry laboratory bench with realistic glassware, molecular models, controlled colored liquids, and premium lab lighting"
        ),
        (
            ("biology", "anatomy", "medicine", "medical", "health"),
            "a polished biology and health science scene with a microscope, anatomical model, glass slides, and carefully arranged lab instruments"
        ),
        (
            ("science", "scientific", "laboratory"),
            "a modern science lab scene with a microscope, molecular model, glassware, specimen tray, and clean research environment"
        ),
        (
            ("history", "civilization", "geography"),
            "a thoughtful humanities study scene with archival objects, antique map textures without labels, museum-quality artifacts, and warm library light"
        ),
        (
            ("literature", "english", "language", "writing", "poetry"),
            "an elegant literature study scene with an open book showing blank pages, fountain pen, quiet library shelves, and warm editorial lighting"
        ),
        (
            ("business", "finance", "economics", "marketing", "management"),
            "a premium business learning scene with abstract chart shapes, a clean desk, tablet with non-readable dashboard blocks, and polished office lighting"
        ),
        (
            ("art", "design", "drawing", "painting"),
            "a refined creative studio scene with sketching tools, color swatches, canvas texture, and carefully arranged design materials"
        ),
    ]

    for keywords, brief in subject_briefs:
        if any(keyword in name for keyword in keywords):
            return brief

    return (
        f"a realistic, subject-specific learning scene for {course_name!r}, built from authentic objects, "
        "tools, and environment that clearly communicate the topic without using text"
    )


def _pollinations_url(prompt: str, seed: str, *, model: str | None = "zimage") -> str:
    query = (
        f"width=1200&height=675&seed={quote(seed)}"
        "&nologo=true&safe=true&enhance=false"
        f"&negative_prompt={quote(NEGATIVE_PROMPT, safe='')}"
    )
    if model:
        query += f"&model={quote(model)}"
    return f"https://image.pollinations.ai/prompt/{quote(prompt, safe='')}?{query}"


def build_course_image_url(course_name: str, course_color: str = "#3b82f6", seed: int | str | None = None) -> str:
    """
    Build an AI-generated professional course cover from the exact course name.

    This intentionally does not map titles to a fixed list of images or keyword
    buckets. The model receives the course name and decides the visual subject.
    """
    clean_name = _clean_course_name(course_name)
    visual_brief = _subject_visual_brief(clean_name)
    prompt = (
        "Create a high-end photorealistic editorial image for an online course cover. "
        f"The learning theme is {clean_name!r}; visualize it as {visual_brief}. "
        "Use one clear main idea, elegant negative space, accurate subject-specific objects, "
        "realistic materials, shallow depth of field, polished lighting, and premium education-platform quality. "
        "Do not place the course title in the image. No readable text, labels, logos, captions, or fake letters anywhere. "
        "If a screen, book, paper, board, or label is visible, it must be blank or contain only soft abstract shapes."
    )
    return _pollinations_url(prompt, _stable_seed(clean_name, seed, "primary"), model="flux")


def build_course_image_fallback_url(course_name: str, course_color: str = "#3b82f6", seed: int | str | None = None) -> str:
    """
    Build a second AI image URL if the first generated cover fails to load.

    The fallback is still AI-generated from the course name; it is not a local
    icon/template asset.
    """
    clean_name = _clean_course_name(course_name)
    visual_brief = _subject_visual_brief(clean_name)
    prompt = (
        "Premium realistic course cover image, clean and beautiful. "
        f"Theme: {clean_name!r}. Visual subject: {visual_brief}. "
        "Compose as a modern hero banner with centered subject clarity, rich but restrained color, "
        "natural shadows, realistic textures, and no clutter. "
        "No readable text, no logos, no captions, no fake writing, no title inside the picture."
    )
    return _pollinations_url(prompt, _stable_seed(clean_name, seed, "fallback"), model="flux")
