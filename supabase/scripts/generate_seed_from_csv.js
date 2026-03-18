/**
 * Reads semicolon-delimited CSVs and generates SQL INSERT statements
 * for trips, sports_calendar, and activities_field_trips.
 * Run: node supabase/scripts/generate_seed_from_csv.js
 * Then run the generated SQL in Supabase Dashboard → SQL Editor.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function parseCSV(content, delimiter = ';') {
  const rows = [];
  let i = 0;
  while (i < content.length) {
    const row = [];
    while (i < content.length) {
      if (content[i] === '"') {
        i++;
        let cell = '';
        while (i < content.length) {
          if (content[i] === '"' && content[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (content[i] === '"') {
            i++;
            break;
          } else {
            cell += content[i];
            i++;
          }
        }
        row.push(cell);
        if (content[i] === delimiter) i++;
        else if (content[i] === '\n' || content[i] === '\r') {
          while (content[i] === '\n' || content[i] === '\r') i++;
          break;
        }
      } else {
        let cell = '';
        while (i < content.length && content[i] !== delimiter && content[i] !== '\n' && content[i] !== '\r') {
          cell += content[i];
          i++;
        }
        row.push(cell);
        if (content[i] === delimiter) i++;
        else {
          while (content[i] === '\n' || content[i] === '\r') i++;
          break;
        }
      }
    }
    if (row.some(c => c !== '')) rows.push(row);
  }
  return rows;
}

function escape(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function toPgBool(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const v = String(val).toLowerCase();
  if (v === 'true' || v === '1') return 'true';
  if (v === 'false' || v === '0') return 'false';
  return 'NULL';
}

function toPgArray(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const s = String(val).trim();
  if (s === '[]') return "'{}'";
  try {
    const arr = JSON.parse(s.replace(/""/g, '"'));
    if (!Array.isArray(arr) || arr.length === 0) return "'{}'";
    return "'{" + arr.map(a => String(a).replace(/"/g, '')).join(',') + "}'";
  } catch {
    return escape(val);
  }
}

function toPgUuid(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const s = String(val).trim();
  if (/^[0-9a-f-]{36}$/i.test(s)) return `'${s}'::uuid`;
  return 'NULL';
}

// ---- TRIPS ----
const tripsPath = path.join(ROOT, 'trips-export-2026-03-16_21-01-35.csv');
const tripsContent = fs.existsSync(tripsPath) ? fs.readFileSync(tripsPath, 'utf8') : '';
const tripsRows = tripsContent ? parseCSV(tripsContent) : [];
const tripsHeader = tripsRows[0] || [];
const tripsData = tripsRows.slice(1);

// ---- SPORTS_CALENDAR ----
const sportsPath = path.join(ROOT, 'sports_calendar-export-2026-03-16_20-57-27.csv');
const sportsContent = fs.existsSync(sportsPath) ? fs.readFileSync(sportsPath, 'utf8') : '';
const sportsRows = sportsContent ? parseCSV(sportsContent) : [];
const sportsHeader = sportsRows[0] || [];
const sportsData = sportsRows.slice(1);

// ---- ACTIVITIES_FIELD_TRIPS ----
const activitiesPath = path.join(ROOT, 'activities_field_trips-export-2026-03-16_20-56-09.csv');
const activitiesContent = fs.existsSync(activitiesPath) ? fs.readFileSync(activitiesPath, 'utf8') : '';
const activitiesRows = activitiesContent ? parseCSV(activitiesContent) : [];
const activitiesHeader = activitiesRows[0] || [];
const activitiesData = activitiesRows.slice(1);

const out = [];

out.push('-- =============================================================================');
out.push('-- SEED: Trips, Sports Calendar, Activities & Field Trips (from Lovable export CSVs)');
out.push('-- Run this in Supabase Dashboard → SQL Editor after migrations are applied.');
out.push('-- Uses ON CONFLICT DO NOTHING so safe to re-run.');
out.push('-- =============================================================================\n');

// 1) TRIPS
if (tripsData.length > 0) {
  out.push('-- TRIPS');
  const colIdx = (name) => tripsHeader.findIndex(h => h === name);
  for (const row of tripsData) {
    const get = (name) => { const i = colIdx(name); return i >= 0 ? row[i] : ''; };
    const id = toPgUuid(get('id'));
    if (id === 'NULL') continue;
    const capacity = get('capacity');
    const capacityNum = capacity && /^\d+$/.test(capacity) ? capacity : 'NULL';
    const values = [
      id,
      escape(get('name')),
      escape(get('type')),
      escape(get('destination')),
      escape(get('date')) + '::date',
      escape(get('departure_time')),
      escape(get('return_time')),
      escape(get('chaperone')),
      capacityNum,
      escape(get('status') || 'pending'),
      escape(get('created_at')) + '::timestamptz',
      escape(get('meal')),
      escape(get('event_type')),
      escape(get('event_length')),
      escape(get('transportation_type')),
      escape(get('driver')),
      toPgUuid(get('sports_event_id')),
      escape(get('season') || '2026'),
      toPgUuid(get('company_id')),
      get('end_date') ? escape(get('end_date')) + '::date' : 'NULL',
      toPgBool(get('is_multi_day'))
    ].join(', ');
    out.push(`INSERT INTO public.trips (id, name, type, destination, date, departure_time, return_time, chaperone, capacity, status, created_at, meal, event_type, event_length, transportation_type, driver, sports_event_id, season, company_id, end_date, is_multi_day) VALUES (${values}) ON CONFLICT (id) DO NOTHING;`);
  }
  out.push('');
}

// 2) SPORTS_CALENDAR (insert in order: sports_calendar has FKs from trips)
if (sportsData.length > 0) {
  out.push('-- SPORTS_CALENDAR');
  const colIdx = (name) => sportsHeader.findIndex(h => h === name);
  for (const row of sportsData) {
    const get = (name) => { const i = colIdx(name); return i >= 0 ? row[i] : ''; };
    const id = toPgUuid(get('id'));
    if (id === 'NULL') continue;
    const mealOpts = get('meal_options');
    const mealOptsPg = mealOpts ? toPgArray(mealOpts) : "'{}'";
    const values = [
      id,
      escape(get('event_date')) + '::date',
      escape(get('title')),
      escape(get('description')),
      escape(get('sport_type')),
      escape(get('time')),
      escape(get('location')),
      escape(get('team')),
      escape(get('opponent')),
      escape(get('created_at')) + '::timestamptz',
      toPgUuid(get('created_by')),
      toPgUuid(get('division_id')),
      escape(get('custom_sport_type')),
      escape(get('event_type')),
      toPgBool(get('division_provides_coach')),
      toPgBool(get('division_provides_ref')),
      escape(get('home_away')),
      escape(get('season') || '2026'),
      mealOptsPg + '::text[]',
      escape(get('meal_notes')),
      toPgUuid(get('company_id')),
      escape(get('depart_time')),
      escape(get('start_time_field'))
    ].join(', ');
    out.push(`INSERT INTO public.sports_calendar (id, event_date, title, description, sport_type, time, location, team, opponent, created_at, created_by, division_id, custom_sport_type, event_type, division_provides_coach, division_provides_ref, home_away, season, meal_options, meal_notes, company_id, depart_time, start_time_field) VALUES (${values}) ON CONFLICT (id) DO NOTHING;`);
  }
  out.push('');
}

// 3) ACTIVITIES_FIELD_TRIPS
if (activitiesData.length > 0) {
  out.push('-- ACTIVITIES_FIELD_TRIPS');
  const colIdx = (name) => activitiesHeader.findIndex(h => h === name);
  for (const row of activitiesData) {
    const get = (name) => { const i = colIdx(name); return i >= 0 ? row[i] : ''; };
    const id = toPgUuid(get('id'));
    if (id === 'NULL') continue;
    const capacity = get('capacity');
    const capacityNum = capacity && /^\d+$/.test(capacity) ? capacity : 'NULL';
    const mealOpts = get('meal_options');
    const mealOptsPg = mealOpts ? toPgArray(mealOpts) : "'{}'";
    const values = [
      id,
      escape(get('event_date')) + '::date',
      escape(get('title')),
      escape(get('description')),
      escape(get('activity_type')),
      escape(get('time')),
      escape(get('location')),
      capacityNum,
      escape(get('chaperone')),
      toPgUuid(get('division_id')),
      toPgUuid(get('created_by')),
      escape(get('created_at')) + '::timestamptz',
      escape(get('season') || '2026'),
      mealOptsPg + '::text[]',
      escape(get('meal_notes')),
      toPgUuid(get('company_id')),
      escape(get('home_away')),
      escape(get('depart_from_camp')),
      escape(get('depart_from_activity')),
      get('end_date') ? escape(get('end_date')) + '::date' : 'NULL',
      toPgBool(get('is_multi_day'))
    ].join(', ');
    out.push(`INSERT INTO public.activities_field_trips (id, event_date, title, description, activity_type, time, location, capacity, chaperone, division_id, created_by, created_at, season, meal_options, meal_notes, company_id, home_away, depart_from_camp, depart_from_activity, end_date, is_multi_day) VALUES (${values}) ON CONFLICT (id) DO NOTHING;`);
  }
  out.push('');
}

out.push('-- Backfill activities_field_trips_divisions from activities that have division_id');
out.push(`INSERT INTO public.activities_field_trips_divisions (activity_id, division_id, company_id)`);
out.push(`SELECT id, division_id, company_id FROM public.activities_field_trips WHERE division_id IS NOT NULL ON CONFLICT (activity_id, division_id) DO NOTHING;`);
out.push('');
out.push('-- Backfill sports_calendar_divisions from sports_calendar that have division_id');
out.push(`INSERT INTO public.sports_calendar_divisions (sports_event_id, division_id, company_id)`);
out.push(`SELECT id, division_id, company_id FROM public.sports_calendar WHERE division_id IS NOT NULL ON CONFLICT (sports_event_id, division_id) DO NOTHING;`);

const outPath = path.join(__dirname, 'seed_imported_data.sql');
fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log('Written:', outPath);
console.log('Trips:', tripsData.length, 'Sports:', sportsData.length, 'Activities:', activitiesData.length);
