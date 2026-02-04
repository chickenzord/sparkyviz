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
 * Fetch user profile from SparkyFitness API
 *
 * Since each API key can only access its own data, we:
 * 1. Get the API key for the username
 * 2. Call GET /auth/profiles to get user profile and userId
 * 3. Transform response to our Profile format
 *
 * Note: The upstream API doesn't provide goals or streak data,
 * so we use hardcoded defaults for now.
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

  return {
    name: data.full_name || username,
    avatar: avatarUrl,
    // TODO: Get actual goals from user preferences/settings endpoint
    goals: {
      calories: 2200,
      protein: 120,
      carbs: 160,
      fat: 73,
    },
    // TODO: Calculate streak from nutrition history data
    currentStreak: 0,
    totalDays: 0,
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
