import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import joblib
from newspaper import Article
import nltk
from openai import OpenAI
import pandas as pd
from textstat import flesch_kincaid_grade, dale_chall_readability_score

app = Flask(__name__)
CORS(app)

load_dotenv()
nltk.download("stopwords")
nltk.download("punkt")
nltk.download("punkt_tab")


sutraClient = OpenAI(
    base_url="https://api.two.ai/v2", api_key=os.getenv("SUTRA_API_KEY")
)
geminiClient = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


fake_news_models = {
    "Random Forest": joblib.load("models/fake_news/random_forest_model.pkl"),
    "Logistic Regression": joblib.load(
        "models/fake_news/logistic_regression_model.pkl"
    ),
    "Decision Tree": joblib.load("models/fake_news/decision_tree_model.pkl"),
    "Gradient Boosting": joblib.load("models/fake_news/gradient_boosting_model.pkl"),
}
fake_news_vectorizer = joblib.load("models/fake_news/tfidf_vectorizer.pkl")
fake_news_labels = {0: "Fake", 1: "Real"}

readability_model = joblib.load("models/readability_score/catboost_model.pkl")
readability_vectorizer = joblib.load("models/readability_score/tfidf_vectorizer.pkl")

sentiment_model = joblib.load("models/sentiment_analysis/svm_model.pkl")
sentiment_vectorizer = joblib.load("models/sentiment_analysis/tfidf_vectorizer.pkl")
sentiment_labels = {0: "Positive", 1: "Negative"}


def compute_features(text):
    return {
        "flesch_kincaid": flesch_kincaid_grade(text),
        "dale_chall": dale_chall_readability_score(text),
        "sentence_length": len(text.split(".")) / max(1, len(text.split())),
        "complex_word_ratio": sum(1 for word in text.split() if len(word) > 6)
        / max(1, len(text.split())),
    }


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": 200, "message": "API is running!"})


@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    url = data.get("url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        article = Article(url)
        article.download()
        article.parse()
        article.nlp()
        summary = article.summary
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    fake_news_predictions = dict()
    summary_vectorized = fake_news_vectorizer.transform([summary])
    for model_name, model in fake_news_models.items():
        fake_news_predictions[model_name] = fake_news_labels[
            int(model.predict(summary_vectorized)[0])
        ]

    readability_vector = readability_vectorizer.transform([summary])
    readability_features = pd.DataFrame([compute_features(summary)])
    readability_vector = pd.concat(
        [readability_features, pd.DataFrame(readability_vector.toarray())], axis=1
    ).values
    readability_score = float(readability_model.predict(readability_vector)[0])

    sentiment = int(
        sentiment_model.predict(sentiment_vectorizer.transform([summary]))[0]
    )

    return jsonify(
        {
            "summary": summary,
            "fake_news": fake_news_predictions,
            "readability_score": readability_score,
            "sentiment": sentiment_labels[sentiment],
        }
    )


if __name__ == "__main__":
    app.run(debug=os.getenv("DEBUG", False), host="0.0.0.0", port=8000)
