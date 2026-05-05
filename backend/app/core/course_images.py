import hashlib
from urllib.parse import quote


NEGATIVE_PROMPT = (
    "text, words, letters, typography, caption, headline, logo, watermark, signage, "
    "ui, interface, low quality, blurry, cartoon, vector, illustration, abstract template"
)


def _clean_course_name(course_name: str) -> str:
    return " ".join((course_name or "educational course").split())[:90] or "educational course"


def _stable_seed(course_name: str, seed: int | str | None = None, salt: str = "primary") -> str:
    source = f"{course_name}|{seed if seed is not None else ''}|{salt}"
    return hashlib.sha256(source.encode("utf-8")).hexdigest()[:12]


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
    prompt = (
        "Generate a high-end cinematic editorial photograph for an online course hero banner. "
        f"The exact course title is {clean_name!r}. The scene must be directly related to that title "
        "with authentic subject-specific objects and environment, polished professional lighting, "
        "clean composition, realistic textures, and premium education-brand quality. "
        "Keep it full-bleed, modern, and professional. No readable text or labels anywhere."
    )
    return _pollinations_url(prompt, _stable_seed(clean_name, seed, "primary"), model="zimage")


def build_course_image_fallback_url(course_name: str, course_color: str = "#3b82f6", seed: int | str | None = None) -> str:
    """
    Build a second AI image URL if the first generated cover fails to load.

    The fallback is still AI-generated from the course name; it is not a local
    icon/template asset.
    """
    clean_name = _clean_course_name(course_name)
    prompt = (
        f"Premium professional course cover photo for {clean_name!r}. "
        "Use the course title as the main semantic guide for the subject matter. "
        "Create a realistic and elegant scene with natural depth, clean framing, "
        "high-detail subject assets, and modern platform-ready aesthetics. "
        "No readable text, no logos, no captions."
    )
    return _pollinations_url(prompt, _stable_seed(clean_name, seed, "fallback"), model="flux")
