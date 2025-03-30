import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import joblib
import json
from newspaper import Article
import nltk
from openai import OpenAI
import pandas as pd
import re
from textstat import flesch_kincaid_grade, dale_chall_readability_score

app = Flask(__name__)
CORS(app)

load_dotenv()
nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)
url_pattern = re.compile(
    r"(?:https?://)?(?:www\.)?[\w\.-]+\.\w{2,}(?:/[\w\.-]*)*(?:\?\S*)?", re.IGNORECASE
)


sutraClient = OpenAI(
    base_url="https://api.two.ai/v2", api_key=os.getenv("SUTRA_API_KEY")
)
geminiClient = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


fake_news_model = joblib.load("models/fake_news/naive_bayes_model.pkl")
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


def summarize(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        article.nlp()
        summary = article.summary
    except Exception as e:
        return {"error": str(e)}

    summary_original = summary

    if article.meta_lang != "en":
        try:
            response = geminiClient.models.generate_content(
                model="gemini-2.0-flash",
                contents=article.text
                + " convert the text to English and return only the converted text and try to retain the original meaning and format",
            )
            summary = response.text
        except Exception as e:
            return {"error": str(e)}

    summary_vectorized = fake_news_vectorizer.transform([summary])
    fake_news_prediction = fake_news_labels[fake_news_model.predict(summary_vectorized)[0]]

    readability_vector = readability_vectorizer.transform([summary])
    readability_features = pd.DataFrame([compute_features(summary)])
    readability_vector = pd.concat(
        [readability_features, pd.DataFrame(readability_vector.toarray())], axis=1
    ).values
    readability_score = float(readability_model.predict(readability_vector)[0])

    sentiment = int(
        sentiment_model.predict(sentiment_vectorizer.transform([summary]))[0]
    )

    response = geminiClient.models.generate_content(
        model="gemini-2.0-flash",
        contents=summary_original
        + " give the tone in "
        + article.meta_lang
        + " and return only the response in one to two words!",
    )
    tone = response.text.strip()

    response = geminiClient.models.generate_content(
        model="gemini-2.0-flash",
        contents=summary_original
        + " give the style in "
        + article.meta_lang
        + " and return only the response in one to two words!",
    )
    style = response.text.strip()

    return {
        "title": article.title,
        "summary": summary_original,
        "author": article.authors,
        "language": article.meta_lang,
        "keywords": article.keywords,
        "tone": tone,
        "style": style,
        "fake_news": fake_news_prediction,
        "readability_score": readability_score,
        "sentiment": sentiment_labels[sentiment],
    }


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": 200, "message": "API is running!"})


@app.route("/chat", methods=["POST"])
def chat():
    req = request.get_json() or {}
    history = req.get("history", [])
    analytics = req.get("analytics", dict())
    current_msg = req.get("message", "")

    if not history:
        messages = [
            {
                "role": "system",
                "content": "You are a helpful article analyzing assistant. Answer the user's questions based on the provided context.",
            },
            {"role": "assistant", "content": "Can you please provide an article URL?"},
        ]

        return jsonify({"chat_history": messages, "analytics": analytics})
    else:
        messages = history.copy()
        if current_msg:
            messages.append({"role": "user", "content": current_msg})

    url_match = url_pattern.search(current_msg)
    if url_match:
        url = url_match.group(0)
        try:
            analytics_response = summarize(url)
            if isinstance(analytics_response, dict):
                analytics = analytics_response

            messages.append(
                {
                    "role": "system",
                    "content": f"Here is the article details: {analytics_response}",
                }
            )
            messages.append(
                {
                    "role": "assistant",
                    "content": f"Here is a summary of the article!",
                }
            )

            return jsonify(
                {
                    "chat_history": messages,
                    "analytics": analytics_response,
                    "url": url,
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    response = sutraClient.chat.completions.create(
        model="sutra-v2", messages=messages, max_tokens=1024, temperature=0
    )
    response_dict = response.to_dict()
    assistant_message = (
        response_dict.get("choices", [{}])[0].get("message", {}).get("content", "")
    )
    messages.append({"role": "assistant", "content": assistant_message})

    return jsonify({"chat_history": messages, "analytics": analytics})


if __name__ == "__main__":
    app.run(debug=os.getenv("DEBUG", False), host="0.0.0.0", port=8000)
