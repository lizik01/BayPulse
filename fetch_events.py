import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("TICKETMASTER_API_KEY")
API_URL = "https://app.ticketmaster.com/discovery/v2/events.json"

cities = ["San Francisco", "San Jose", "Palo Alto"]
all_events = []

for city in cities:
    params = {
        "apikey": API_KEY,
        "city": city,
        "countryCode": "US",
        "size": 10
    }

    response = requests.get(API_URL, params=params)
    data = response.json()

    if "_embedded" in data:
        events = data["_embedded"]["events"]
        all_events.extend(events)

all_events = sorted(all_events, key=lambda e: e["dates"]["start"]["localDate"])

for event in all_events:
    name = event["name"]
    date = event["dates"]["start"]["localDate"]
    venue = event["_embedded"]["venues"][0]["name"]
    city = event["_embedded"]["venues"][0]["city"]["name"]
    event_url = event["url"]

    print(f"Event: {name}")
    print(f"Date: {date}")
    print(f"Venue: {venue}, {city}")
    print(f"URL: {event_url}")
    print("---")