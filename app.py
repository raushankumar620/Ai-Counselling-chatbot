from flask import Flask, request, jsonify, render_template, redirect, url_for, session, Blueprint
import requests
import json
import threading
import os
from pymongo import MongoClient
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecretkey")
CORS(app, resources={r"/chat": {"origins": "*"}})

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["auth_system"]
users_collection = db["users"]


from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Configure JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET")
jwt = JWTManager(app)

# Initialize bcrypt for password hashing
bcrypt = Bcrypt(app)

# Configure OAuth for Social Logins
oauth = OAuth(app)



# Blueprint for authentication routes
auth_bp = Blueprint("auth", __name__)

# Ollama Chatbot Configuration
OLLAMA_URL = "http://localhost:5002/api/generate"
MODEL_NAME = "llama3.2"

# Chat History Storage
HISTORY_FILE = "chat_history.json"
chat_history = []

@auth_bp.route("/login_page", methods=["GET"])
def login_page():
    return render_template("login.html")  # Ensure 'login.html' exists in 'templates' folder

def load_chat_history():
    """Load chat history from file at startup."""
    global chat_history
    try:
        with open(HISTORY_FILE, "r") as file:
            chat_history = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        chat_history = []

def save_chat_history():
    """Save chat history asynchronously."""
    def _save():
        with open(HISTORY_FILE, "w") as file:
            json.dump(chat_history, file)
    threading.Thread(target=_save, daemon=True).start()

def get_chatbot_response(user_message):
    """Send user message to Ollama model and return response."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": user_message, "stream": False},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("response", "Error: No response from model")
        return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error: {str(e)}"

# Load chat history at startup
load_chat_history()

# Authentication Routes
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    name, email, password = data.get("name"), data.get("email"), data.get("password")

    if users_collection.find_one({"email": email}):
        return jsonify({"message": "User already exists"}), 400
    
    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
    users_collection.insert_one({"name": name, "email": email, "password": hashed_password})
    
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email, password = data.get("email"), data.get("password")
    
    user = users_collection.find_one({"email": email})
    
    if user and bcrypt.check_password_hash(user["password"], password):
        access_token = create_access_token(identity=email)
        return jsonify({"message": "Login successful", "token": access_token}), 200
    
    return jsonify({"message": "Invalid email or password"}), 401

@app.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    current_user = get_jwt_identity()
    return jsonify({"message": f"Welcome {current_user}!"})



# Chatbot Routes
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        if not user_message:
            return jsonify({"error": "Message cannot be empty"}), 400
        bot_response = get_chatbot_response(user_message)
        chat_entry = {"user": user_message, "bot": bot_response}
        chat_history.append(chat_entry)
        save_chat_history()
        return jsonify({"reply": bot_response})
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

@app.route("/get_history", methods=["GET"])
def get_history():
    return jsonify({"history": chat_history})

@app.route("/clear_history", methods=["POST"])
def clear_history():
    global chat_history
    chat_history = []
    save_chat_history()
    return jsonify({"message": "Chat history cleared successfully"})

# Register Blueprint
app.register_blueprint(auth_bp, url_prefix="/auth")

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True, port=5001, threaded=True, use_reloader=False)
