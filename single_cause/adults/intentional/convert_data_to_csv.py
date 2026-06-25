import json
import csv
from pathlib import Path


INPUT_PATH = Path("data.json")
OUTPUT_PATH = Path("data.csv")

COLUMNS = [
    "participant_id",
    "condition",
    "scenario_order",
    "bike_question_order",
    "mirror_question_order",
    # Bike scenario responses
    "bike_cause",
    "bike_simple",
    "bike_fault",
    "bike_punish",
    # Mirror scenario responses
    "mirror_cause",
    "mirror_simple",
    "mirror_fault",
    "mirror_punish",
    # Demographics
    "age",
    "race",
    "gender",
    "ethnicity",
]


def load_records(path: Path):
    """
    Parse data.json, which contains multiple JSON objects separated by blank
    lines and commas, plus one stray '×' character.
    We turn the whole thing into a single JSON array and load it.
    """
    text = path.read_text(encoding="utf-8")
    # Remove the single stray '×' marker
    text = text.replace("×", "")

    # Wrap as a JSON array. The file is already a sequence of
    # `{ ... },` blocks, so this should be valid as-is.
    array_text = "[\n" + text + "\n]"

    return json.loads(array_text)


def main():
    records = load_records(INPUT_PATH)

    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()

        for rec in records:
            responses = rec.get("responses", {}) or {}
            participants = rec.get("participants", {}) or {}
            scenario_order = rec.get("scenario_order", [])
            question_orders = rec.get("question_orders", {}) or {}
            
            # Convert scenario_order list to string (e.g., "bike,mirror")
            scenario_order_str = ",".join(scenario_order) if scenario_order else ""
            
            # Convert question orders to strings
            bike_q_order_str = ",".join(question_orders.get("bike", [])) if "bike" in question_orders else ""
            mirror_q_order_str = ",".join(question_orders.get("mirror", [])) if "mirror" in question_orders else ""

            row = {
                "participant_id": rec.get("participant_id", ""),
                "condition": rec.get("condition", ""),
                "scenario_order": scenario_order_str,
                "bike_question_order": bike_q_order_str,
                "mirror_question_order": mirror_q_order_str,
                # Bike scenario responses
                "bike_cause": responses.get("bike_cause", ""),
                "bike_simple": responses.get("bike_simple", ""),
                "bike_fault": responses.get("bike_fault", ""),
                "bike_punish": responses.get("bike_punish", ""),
                # Mirror scenario responses
                "mirror_cause": responses.get("mirror_cause", ""),
                "mirror_simple": responses.get("mirror_simple", ""),
                "mirror_fault": responses.get("mirror_fault", ""),
                "mirror_punish": responses.get("mirror_punish", ""),
                # Demographics
                "age": participants.get("age", ""),
                "race": participants.get("race", ""),
                "gender": participants.get("gender", ""),
                "ethnicity": participants.get("ethnicity", ""),
            }
            writer.writerow(row)


if __name__ == "__main__":
    main()
