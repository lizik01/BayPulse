from flask import Flask, render_template
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("TICKETMASTER_API_KEY")

@app.route("/")
def index():
    url = "https://app.ticketmaster.com/discovery/v2/events.json"
    cities = ["San Francisco", "San Jose"]
    all_events = []

    for city in cities:
        params = {
            "apikey": API_KEY,
            "city": city,
            "countryCode": "US",
            "size": 10
        }

        response = requests.get(url, params = params)
        data = response.json()
        if "_embedded" in data:
            events = data["_embedded"]["events"]
            all_events.extend(events)

    all_events = sorted(all_events, key=lambda e: e["dates"]["start"]["localDate"])
    return render_template("index.html", events=all_events)

if __name__ == "__main__":
    app.run(debug=True)