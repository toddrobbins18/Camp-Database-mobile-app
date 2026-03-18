# Deploy get-weather via Supabase Dashboard

Follow these steps to create and run the weather function using only the Dashboard.

---

## Step 1: Open Edge Functions

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and open your **project** (the one your mobile app uses).
2. In the left sidebar, click **Edge Functions**.

---

## Step 2: Add the secret (if not already set)

1. In the Edge Functions area, open the **Secrets** tab (or the **Project Settings** → **Edge Functions** section where secrets are listed).
2. Click **Add secret** / **New secret**.
3. Set:
   - **Name:** `WEATHER_API_KEY` (exactly this)
   - **Value:** your WeatherAPI.com API key
4. Save.

---

## Step 3: Create the function

1. In **Edge Functions**, click **Create a new function** (or **New function**).
2. **Function name:** `get-weather` (must be exactly this; the app calls `get-weather`).
3. You will either:
   - **A)** See a code editor in the Dashboard, or  
   - **B)** See a message like “Deploy from CLI” or “Connect repo” with no editor.

---

## Step 4A: If the Dashboard has a code editor

1. Paste the **entire** code below into the editor (replace any placeholder).
2. Save and click **Deploy** (or **Save and deploy**).
3. Skip to **Step 5**.

---

## Step 4B: If the Dashboard has no editor (deploy from your machine once)

The function code lives in your repo. Deploy it **once** from your PC (no global install):

1. Open PowerShell and run:
   ```powershell
   cd E:\DataCamp\datacamp-mobile
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy get-weather
   ```
2. Replace `YOUR_PROJECT_REF` with your project ref (from Dashboard → Project Settings → General).
3. After this, the function will appear in the Dashboard and you can manage it there.

---

## Step 5: Test the function

1. In **Edge Functions**, open **get-weather**.
2. Use **Invoke** / **Test** (if available).
3. Request body (JSON):
   ```json
   { "zipCode": "18469" }
   ```
4. You should get a response with `today` and `tomorrow` (temp, condition, high, low). If you see `"error": "Weather API not configured"`, the secret name is wrong or not set (must be `WEATHER_API_KEY`).

---

## Step 6: Use in the app

The mobile dashboard already calls this function with the company’s zip (or `18469`). No app code change needed. Open the app’s Dashboard screen; the Weather widget should load once the function is deployed and the secret is set.

---

## Full function code (copy for Step 4A)

Copy everything below into the Dashboard editor if you have one:

```typescript
// Weather API key: set in Supabase Dashboard → Edge Functions → Secrets as WEATHER_API_KEY
// Uses https://www.weatherapi.com/ (forecast.json, days=2)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let zipCode: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      zipCode = body?.zipCode ?? undefined;
    } catch {
      zipCode = undefined;
    }
    const resolvedZip = (zipCode && String(zipCode).trim()) || '18469';

    const WEATHER_API_KEY = Deno.env.get('WEATHER_API_KEY');
    if (!WEATHER_API_KEY) {
      console.error('WEATHER_API_KEY not set. Add it in Supabase Dashboard → Edge Functions → Secrets.');
      return new Response(
        JSON.stringify({ error: 'Weather API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${resolvedZip}&days=2&aqi=no`
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Weather API error:', response.status, text);
      return new Response(
        JSON.stringify({ error: `Weather API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const forecastDays = data?.forecast?.forecastday ?? [];
    const day0 = forecastDays[0]?.day;
    const day1 = forecastDays[1]?.day;
    const current = data?.current ?? {};
    const condition0 = current?.condition ?? day0?.condition ?? {};
    const condition1 = day1?.condition ?? {};

    const today = {
      temp_f: Math.round(Number(current?.temp_f) || Number(day0?.maxtemp_f) || 0),
      condition: condition0?.text || 'N/A',
      icon: condition0?.icon,
      high: Math.round(Number(day0?.maxtemp_f) ?? 0),
      low: Math.round(Number(day0?.mintemp_f) ?? 0),
    };

    const tomorrow = day1
      ? {
          high: Math.round(Number(day1.maxtemp_f) ?? 0),
          low: Math.round(Number(day1.mintemp_f) ?? 0),
          condition: condition1?.text || 'N/A',
          icon: condition1?.icon,
        }
      : { ...today, condition: today.condition };

    const weatherData = {
      today,
      tomorrow,
      location: data?.location?.name ?? resolvedZip,
    };

    return new Response(
      JSON.stringify(weatherData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Weather fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Checklist

- [ ] Secret `WEATHER_API_KEY` is set under Edge Functions (or Project Settings).
- [ ] Function name is exactly `get-weather`.
- [ ] Function is deployed (via Dashboard editor or `npx supabase functions deploy get-weather`).
- [ ] Test invoke with `{ "zipCode": "18469" }` returns `today` and `tomorrow`.
- [ ] Mobile app Dashboard screen shows the Weather widget (no code changes needed).
