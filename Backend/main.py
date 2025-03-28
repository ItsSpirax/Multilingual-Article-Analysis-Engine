import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from openai import OpenAI
from newspaper import Article

app = Flask(__name__)
CORS(app)

load_dotenv()

sutraClient = OpenAI(base_url="https://api.two.ai/v2", api_key=os.getenv("SUTRA_API_KEY"))
geminiClient = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Welcome to the AI News Summarizer API!"})

if __name__ == '__main__':
    app.run(debug=os.getenv("DEBUG", False), host="0.0.0.0", port=8000)
