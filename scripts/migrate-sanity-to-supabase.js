/**
 * One-time migration script: Sanity -> Supabase.
 *
 * Usage:
 *   SANITY_PROJECT_ID=ysuysqc1 \
 *   SANITY_DATASET=production \
 *   SANITY_TOKEN=<read_token> \
 *   SUPABASE_URL=https://<your>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
 *   node scripts/migrate-sanity-to-supabase.js
 *
 * Notes:
 * - Uses fetch (Node 18+). No @sanity/client required.
 * - Uses Supabase service role key to bypass RLS for migration.
 * - Writes to tables: exercises, workouts (as defined in app).
 */

const { createClient } = require("@supabase/supabase-js");

const sanityProjectId = process.env.SANITY_PROJECT_ID;
const sanityDataset = process.env.SANITY_DATASET || "production";
const sanityToken = process.env.SANITY_TOKEN;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sanityProjectId || !sanityToken || !supabaseUrl || !supabaseServiceRole) {
  console.error(
    "Missing env. Require SANITY_PROJECT_ID, SANITY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

async function fetchSanity(query) {
  const url = `https://${sanityProjectId}.api.sanity.io/v2023-10-12/data/query/${sanityDataset}?query=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${sanityToken}` },
  });
  if (!res.ok) {
    throw new Error(`Sanity fetch failed ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.result || [];
}

async function migrateExercises() {
  const query = `*[_type == "exercise"]{
    name,
    description,
    difficulty,
    "image_url": image.asset->url,
    videoUrl,
    majorMuscleGroups,
    trainingDays,
    isActive
  }`;
  const rows = await fetchSanity(query);
  if (!rows.length) {
    console.log("No exercises found in Sanity.");
    return;
  }
  const payload = rows.map((ex) => ({
    name: ex.name,
    description: ex.description || "No description provided.",
    difficulty: ex.difficulty || "unknown",
    image_url: ex.image_url || null,
    video_url: ex.videoUrl || null,
    major_muscle_groups: ex.majorMuscleGroups || [],
    training_days: ex.trainingDays || [],
    is_active: ex.isActive !== false,
  }));
  const { error } = await supabase.from("exercises").upsert(payload);
  if (error) throw error;
  console.log(`Exercises migrated: ${payload.length}`);
}

async function migrateWorkouts() {
  const query = `*[_type == "workout"]{
    date,
    durationMin,
    exercises[]{
      "exerciseId": exercise->_id,
      "name": exercise->name,
      sets[]{reps, weight, weightUnit}
    }
  }`;
  const rows = await fetchSanity(query);
  if (!rows.length) {
    console.log("No workouts found in Sanity.");
    return;
  }
  const payload = rows.map((w) => ({
    date: w.date || null,
    duration_min: w.durationMin || null,
    exercises: w.exercises || [],
  }));
  const { error } = await supabase.from("workouts").upsert(payload);
  if (error) throw error;
  console.log(`Workouts migrated: ${payload.length}`);
}

async function main() {
  try {
    await migrateExercises();
    await migrateWorkouts();
    console.log("Migration complete.");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

main();

