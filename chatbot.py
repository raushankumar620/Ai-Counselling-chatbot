import requests

OLLAMA_URL = "http://localhost:5002/api/generate"
MODEL_NAME = "llama3.2"

def get_chatbot_response(user_message):
    try:
        payload = {
            "model": MODEL_NAME,
            "prompt": user_message,
            "stream": False  # Change to False for non-streaming
        }

        response = requests.post(OLLAMA_URL, json=payload, timeout=5)
        response.raise_for_status()  # HTTP errors handle karega

        return response.json().get("reply", "Sorry, I couldn't generate a response.")

    except requests.exceptions.RequestException as e:
        print(f"Chatbot Error: {e}")
        return "⚠️ Error: Unable to process request"
