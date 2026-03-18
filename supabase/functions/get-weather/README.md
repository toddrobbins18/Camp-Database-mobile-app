# get-weather Edge Function

Fetches today and tomorrow weather for a US zip code using [WeatherAPI.com](https://www.weatherapi.com/).

## Setup

1. **Secret:** In Supabase Dashboard go to **Edge Functions** → **Secrets**. Add:
   - **Name:** `WEATHER_API_KEY`
   - **Value:** your WeatherAPI.com key

2. **Deploy:** From the project root (where `supabase/` lives):
   ```bash
   supabase functions deploy get-weather
   ```

The mobile dashboard calls this with `body: { zipCode }` (uses company `zip_code` from DB or default `18469`).
