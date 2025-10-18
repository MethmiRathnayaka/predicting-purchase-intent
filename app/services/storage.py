from typing import Dict, Any, List

_data_store: Dict[str, Any] = {}

def save(key: str, value: Any) -> None:
    _data_store[key] = value

def get(key: str) -> Any:
    return _data_store.get(key)
# app/services/storage.py
from typing import Dict, Any, List

_data_store: Dict[str, Any] = {}

def set_baskets(baskets: List[Dict[str, Any]]):
    _data_store["baskets"] = baskets

def get_baskets() -> List[Dict[str, Any]]:
    # This ensures an empty list is returned if the "baskets" key doesn't exist
    return _data_store.get("baskets", [])

def set_intents(rows: list[dict]) -> None:
    _data_store["intents"] = rows

def get_intents() -> list[dict]:
    return _data_store.get("intents", [])

def get_intent_counts() -> dict[str, int]:
    intents = _data_store.get("intents", [])
    counts = {}
    for row in intents:
        intent = row.get("intent")
        if intent:
            counts[intent] = counts.get(intent, 0) + 1
    return counts