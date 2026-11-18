"""Deterministic grading for objective questions.

Multiple-choice and true/false answers are checked against the stored correct option.
Short answers are matched against accepted answers after normalising case and whitespace;
anything else is marked incorrect (AI feedback for subjective answers is a later phase
and will be labelled as AI-generated).
"""
import re

from .models import Question


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip().lower()


def grade_question(question: Question, given) -> bool:
    answers = list(question.answers.all())
    if question.type in (Question.Type.MULTIPLE_CHOICE, Question.Type.TRUE_FALSE):
        try:
            given_id = int(given)
        except (TypeError, ValueError):
            return False
        return any(a.id == given_id and a.is_correct for a in answers)
    accepted = {_normalise(a.text) for a in answers if a.is_correct}
    return _normalise(given) in accepted


def grade_attempt(quiz, responses: dict) -> tuple[int, int, dict]:
    score = max_score = 0
    results = {}
    for q in quiz.questions.prefetch_related("answers"):
        given = responses.get(str(q.id), responses.get(q.id))
        correct = grade_question(q, given)
        max_score += q.points
        score += q.points if correct else 0
        correct_answers = [a.id if q.type != Question.Type.SHORT_ANSWER else a.text for a in q.answers.all() if a.is_correct]
        results[str(q.id)] = {
            "given": given, "correct": correct, "graded_by": "rule",
            "correct_answers": correct_answers, "explanation": q.explanation,
        }
    return score, max_score, results
