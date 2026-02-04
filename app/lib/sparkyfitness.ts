/**
 * SparkyFitness API Client
 *
 * This module handles all communication with the upstream SparkyFitness API.
 * It translates upstream responses into the data contracts expected by SparkyViz.
 */

const SPARKYFITNESS_API_URL = process.env.SPARKYFITNESS_API_URL || "https://api.sparkyfitness.com";
const SPARKYFITNESS_WEB_URL = process.env.SPARKYFITNESS_WEB_URL || "https://fit.mdgrd.net";

// Extract host from web URL for headers
const WEB_HOST = new URL(SPARKYFITNESS_WEB_URL).host;

// Parse API keys mapping from environment variable
// Format: "username1:apikey1,username2:apikey2"
const API_KEYS_MAP = new Map<string, string>();
const apiKeysEnv = process.env.SPARKYFITNESS_API_KEYS || "";
if (apiKeysEnv) {
  apiKeysEnv.split(',').forEach(entry => {
    const [username, apiKey] = entry.trim().split(':');
    if (username && apiKey) {
      API_KEYS_MAP.set(username, apiKey);
    }
  });
}

/**
 * Get API key for a specific username
 */
function getApiKey(username: string): string {
  const apiKey = API_KEYS_MAP.get(username);
  if (!apiKey) {
    throw new Error(`No API key configured for username: ${username}`);
  }
  return apiKey;
}

/**
 * Upstream API response types
 */
interface UpstreamProfile {
  id: string;
  full_name: string;
  phone_number: string;
  date_of_birth: string;
  bio: string;
  avatar_url: string;
  gender: string;
}

interface UpstreamNutritionDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturated_fat?: number;
  polyunsaturated_fat?: number;
  monounsaturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  dietary_fiber?: number;
  sugars?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
}

interface UpstreamGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_goal_ml: number;
  saturated_fat: number;
  polyunsaturated_fat: number;
  monounsaturated_fat: number;
  trans_fat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
  dietary_fiber: number;
  sugars: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
  target_exercise_calories_burned: number;
  target_exercise_duration_minutes: number;
  protein_percentage: number | null;
  carbs_percentage: number | null;
  fat_percentage: number | null;
  breakfast_percentage: number;
  lunch_percentage: number;
  dinner_percentage: number;
  snacks_percentage: number;
}

export interface Profile {
  name: string;
  avatar: string;
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  currentStreak: number;
  totalDays: number;
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyData {
  date: string; // ISO format YYYY-MM-DD
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: {
    breakfast: FoodItem[];
    lunch: FoodItem[];
    dinner: FoodItem[];
    snack: FoodItem[];
  };
}

/**
 * Fetch user goals for a specific date from SparkyFitness API
 *
 * @param username - The username to fetch goals for
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 * @returns Goals data from the API
 */
export async function fetchGoals(username: string, date?: string): Promise<UpstreamGoals> {
  const apiKey = getApiKey(username);

  // Use today's date if not provided
  const targetDate = date || new Date().toISOString().split('T')[0];

  const response = await fetch(`${SPARKYFITNESS_API_URL}/goals/by-date/${targetDate}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Host': WEB_HOST,
      'Referer': SPARKYFITNESS_WEB_URL,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch goals for ${username} on ${targetDate}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Calculate streak and total days tracked from nutrition history
 *
 * @param nutritionHistory - Array of daily nutrition data sorted by date (oldest first)
 * @returns Object containing currentStreak and totalDays
 */
function calculateStreakAndTotalDays(nutritionHistory: DailyData[]): {
  currentStreak: number;
  totalDays: number;
} {
  // Count total days with any nutrition data (calories > 0)
  const totalDays = nutritionHistory.filter(day => day.nutrients.calories > 0).length;

  // Calculate current streak by counting backwards from today
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];

  // Create a map for quick date lookup
  const nutritionMap = new Map<string, DailyData>();
  nutritionHistory.forEach(day => {
    nutritionMap.set(day.date, day);
  });

  // Count backwards from today until we hit a day with no data
  const currentDate = new Date();
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = nutritionMap.get(dateStr);

    // Stop if we have no data for this day or calories is 0
    if (!dayData || dayData.nutrients.calories === 0) {
      break;
    }

    currentStreak++;

    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);

    // Safety check: don't go back more than we have data for
    if (currentStreak > nutritionHistory.length) {
      break;
    }
  }

  return { currentStreak, totalDays };
}

/**
 * Fetch user profile from SparkyFitness API
 *
 * Since each API key can only access its own data, we:
 * 1. Get the API key for the username
 * 2. Call GET /auth/profiles to get user profile and userId
 * 3. Call GET /goals/by-date/{today} to get today's goals
 * 4. Fetch nutrition history to calculate streak and total days
 * 5. Transform response to our Profile format
 */
export async function fetchProfile(username: string): Promise<Profile> {
  const apiKey = getApiKey(username);

  const response = await fetch(`${SPARKYFITNESS_API_URL}/auth/profiles`, {
    headers: {
      'X-Api-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Host': WEB_HOST,
      'Referer': SPARKYFITNESS_WEB_URL,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile for ${username}: ${response.statusText}`);
  }

  const data: UpstreamProfile = await response.json();

  // Construct full avatar URL - avatars are served from the web URL
  const avatarUrl = data.avatar_url?.startsWith('/')
    ? `${SPARKYFITNESS_WEB_URL}${data.avatar_url}`
    : data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  // Fetch today's goals
  // NOTE: Currently using today's goals for all dates. In the future, we should
  // fetch goals for each individual date to calculate achieved percentages accurately.
  const todayGoals = await fetchGoals(username);

  // Fetch nutrition history to calculate streak and total days
  // Using 90 days for streak calculation - enough to capture most streaks
  const nutritionHistory = await fetchNutritionHistory(username, 90);
  const { currentStreak, totalDays } = calculateStreakAndTotalDays(nutritionHistory);

  return {
    name: data.full_name || username,
    avatar: avatarUrl,
    goals: {
      calories: todayGoals.calories,
      protein: todayGoals.protein,
      carbs: todayGoals.carbs,
      fat: todayGoals.fat,
    },
    currentStreak,
    totalDays,
  };
}

/**
 * Fetch nutrition history from SparkyFitness API
 *
 * Process:
 * 1. Get API key for username
 * 2. Fetch profile to get userId
 * 3. Calculate date range (last N days)
 * 4. Call GET /reports/mini-nutrition-trends
 * 5. Transform response to DailyData format
 *
 * Note: The upstream API only provides daily nutrition totals, not meal breakdown.
 * Meal data will be empty arrays for now.
 */
export async function fetchNutritionHistory(
  username: string,
  days: number = 90
): Promise<DailyData[]> {
  const apiKey = getApiKey(username);

  // Step 1: Get userId from profile
  const profileResponse = await fetch(`${SPARKYFITNESS_API_URL}/auth/profiles`, {
    headers: {
      'X-Api-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Host': WEB_HOST,
      'Referer': SPARKYFITNESS_WEB_URL,
      'Content-Type': 'application/json'
    }
  });

  if (!profileResponse.ok) {
    throw new Error(`Failed to fetch profile for ${username}: ${profileResponse.statusText}`);
  }

  const profileData: UpstreamProfile = await profileResponse.json();
  const userId = profileData.id;

  if (!userId) {
    throw new Error(`No userId found in profile for ${username}`);
  }

  // Step 2: Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const endDateStr = endDate.toISOString().split('T')[0];
  const startDateStr = startDate.toISOString().split('T')[0];

  // Step 3: Fetch nutrition trends
  const nutritionUrl = `${SPARKYFITNESS_API_URL}/reports/mini-nutrition-trends?userId=${userId}&startDate=${startDateStr}&endDate=${endDateStr}`;
  const nutritionResponse = await fetch(nutritionUrl, {
    headers: {
      'X-Api-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Host': WEB_HOST,
      'Referer': SPARKYFITNESS_WEB_URL,
      'Content-Type': 'application/json'
    }
  });

  if (!nutritionResponse.ok) {
    throw new Error(`Failed to fetch nutrition history for ${username}: ${nutritionResponse.statusText}`);
  }

  const nutritionData: UpstreamNutritionDay[] = await nutritionResponse.json();

  // Step 4: Transform to DailyData format
  // Create a map of date -> nutrition data for quick lookup
  const nutritionMap = new Map<string, UpstreamNutritionDay>();
  nutritionData.forEach(day => {
    nutritionMap.set(day.date, day);
  });

  // Generate array for all requested days
  const result: DailyData[] = [];
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const dayData = nutritionMap.get(dateStr);

    result.push({
      date: dateStr,
      nutrients: dayData ? {
        calories: Math.round(dayData.calories * 10) / 10,
        protein: Math.round(dayData.protein * 10) / 10,
        carbs: Math.round(dayData.carbs * 10) / 10,
        fat: Math.round(dayData.fat * 10) / 10,
      } : {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      // TODO: Meal breakdown requires additional API endpoint
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      },
    });
  }

  return result;
}
