"""
Guardrails and compliance enforcement for ZaiqaBox Karachi.
Strict Compliance Rule:
Never make or imply any medical, diabetic or weight-loss claim or guarantee,
anywhere. Words like 'lose weight', 'diabetic friendly', 'cures', 'good for diabetes'
are strictly forbidden. Any medical, diabetic, allergy, weight-loss or dietary-condition
question must be escalated to a human nutritionist.
"""

import re
from typing import Tuple

# Standard compliance handoff reply required by client
HANDOFF_REPLY_EN = (
    "ZaiqaBox meals are home-cooked, portion-controlled, and nutritionist-reviewed for "
    "healthy corporate professionals, but we never make medical, diabetic, or weight-loss claims. "
    "For any medical or dietary questions, our human nutritionist will assist you."
)

HANDOFF_REPLY_UR = (
    "ZaiqaBox ke khane portion-controlled aur nutritionist-reviewed hain, lekin hum kisi qisam "
    "ka medical, diabetic ya wazan kam karnay ka dawa nahi kartay. "
    "For any medical or dietary questions, our human nutritionist will assist you."
)

# Forbidden keywords / patterns in User query or System prompt bypasses
MEDICAL_AND_DIET_PATTERNS = [
    # English terms
    r"\bdiabet(es|ic)\b",
    r"\bblood\s*sugar\b",
    r"\bsugar\s*level\b",
    r"\bweight\s*loss\b",
    r"\blose\s*weight\b",
    r"\blosing\s*weight\b",
    r"\bburn\s*fat\b",
    r"\bfat\s*loss\b",
    r"\bobes(e|ity)\b",
    r"\bhypertension\b",
    r"\bblood\s*pressure\b",
    r"\b(high|low)\s*bp\b",
    r"\bcholesterol\b",
    r"\bheart\s*(patient|disease|attack)\b",
    r"\bkidney\b",
    r"\ballerg(y|ies|ic)\b",
    r"\bceliac\b",
    r"\bgluten\s*intoleran(ce|t)\b",
    r"\bpeanut\s*allergy\b",
    r"\bmedic(al|ine|ation|ated)\b",
    r"\bdoctor\b",
    r"\bcur(e|es|ing)\b",
    r"\btreat(ment|ing)\b",
    r"\bpregnan(t|cy)\b",
    r"\blactat(ing|ion)\b",
    r"\bthyroid\b",
    r"\bpcos\b",
    r"\bpcod\b",
    r"\binsulin\b",
    r"\bcalorie\s*deficit\b",
    
    # Roman Urdu / Urdu keywords
    r"\bsugar\b",
    r"\bwazan\b",
    r"\bwazan\s*kam\b",
    r"\bmotap(a|ay)\b",
    r"\bcharbi\b",
    r"\bbimar(i|ee|iyan)\b",
    r"\bbeemar(i|ee)\b",
    r"\bilaj\b",
    r"\bdaw(a|ai|aye|ayi)\b",
    r"\bpait\s*kam\b",
    r"\bchot\b",
    r"\bsehat\s*kharab\b",
    r"\bhaamla\b",
    r"\bhamal\b",
    r"\bkhana\s*hazam\b",
    
    # Jailbreak / Bypass attempts
    r"\bignore\s*(your|all)?\s*rules\b",
    r"\bpromise\s*weight\b",
    r"\bbypass\b",
    r"\bpretend\s*you\s*are\b",
    r"\bforget\s*rules\b",
]

# Words forbidden in LLM generated output
FORBIDDEN_OUTPUT_WORDS = [
    r"lose\s*weight",
    r"losing\s*weight",
    r"weight\s*loss",
    r"diabetic\s*friendly",
    r"good\s*for\s*diabet(es|ics)",
    r"cures?",
    r"curative",
    r"burn\s*fat",
    r"fat\s*loss",
    r"treats?\s*diabetes",
    r"wazan\s*kam",
    r"motapa\s*kam",
    r"sugar\s*theek",
    r"sugar\s*control",
    r"medical\s*cure",
]

COMPILED_INPUT_REGEX = re.compile("|".join(MEDICAL_AND_DIET_PATTERNS), re.IGNORECASE)
COMPILED_OUTPUT_REGEX = re.compile("|".join(FORBIDDEN_OUTPUT_WORDS), re.IGNORECASE)

# Urdu / Roman Urdu detector for user queries
ROMAN_URDU_SIGNALS = [
    "kya", "hai", "mujhe", "ap", "aap", "khana", "theek", "bataen", "batao", 
    "chahiye", "karachi", "mein", "kitna", "karo", "nahi", "shukriya"
]


def check_input_guardrails(text: str) -> Tuple[bool, str, str]:
    """
    Step 1 Guardrail: Checks user input before reaching the LLM.
    Returns:
        (is_triggered: bool, response_message: str, detected_match: str)
    """
    if not text:
        return False, "", ""
    
    match = COMPILED_INPUT_REGEX.search(text)
    if match:
        detected = match.group(0)
        # Check if user spoke Roman Urdu to reply appropriately
        words = text.lower().split()
        is_roman_urdu = any(w in words for w in ROMAN_URDU_SIGNALS)
        handoff_reply = HANDOFF_REPLY_UR if is_roman_urdu else HANDOFF_REPLY_EN
        return True, handoff_reply, detected
    
    return False, "", ""


def check_output_guardrails(llm_reply: str) -> Tuple[bool, str]:
    """
    Step 4 Guardrail: Checks LLM output for forbidden medical or weight-loss claims.
    If found, replaces with the handoff reply.
    Returns:
        (is_violation: bool, sanitized_or_handoff_reply: str)
    """
    if not llm_reply:
        return False, llm_reply
    
    if COMPILED_OUTPUT_REGEX.search(llm_reply):
        return True, HANDOFF_REPLY_EN
    
    return False, llm_reply
