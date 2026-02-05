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
// Format: "username1:password1:apikey1,username2:password2:apikey2"
const API_KEYS_MAP = new Map<string, { password: string; apiKey: string }>();
const apiKeysEnv = process.env.SPARKYFITNESS_API_KEYS || "";
if (apiKeysEnv) {
  apiKeysEnv.split(',').forEach(entry => {
    const parts = entry.trim().split(':');
    if (parts.length === 3) {
      const [username, password, apiKey] = parts;
      if (username && password && apiKey) {
        API_KEYS_MAP.set(username, { password, apiKey });
      }
    }
  });
}

/**
 * Get API key for a specific username
 */
function getApiKey(username: string): string {
  const entry = API_KEYS_MAP.get(username);
  if (!entry) {
    throw new Error(`No API key configured for username: ${username}`);
  }
  return entry.apiKey;
}

/**
 * Validate password for a specific username
 */
export function validatePassword(username: string, password: string): boolean {
  const entry = API_KEYS_MAP.get(username);
  if (!entry) {
    return false;
  }
  return entry.password === password;
}

/**
 * Get the first registered username
 */
export function getFirstUsername(): string | null {
  const firstEntry = Array.from(API_KEYS_MAP.keys())[0];
  return firstEntry || null;
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

interface UpstreamFoodEntry {
  id: string;
  food_id: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  quantity: number;
  unit: string;
  entry_date: string;
  food_name: string;
  brand_name: string;
  serving_size: number;
  serving_unit: string;
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
  age: number | null;
  gender: string | null;
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
  brand?: string;
  quantity: number;
  unit: string;
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
  meals?: {
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

  // Calculate age from date_of_birth
  let age: number | null = null;
  if (data.date_of_birth) {
    const birthDate = new Date(data.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  return {
    name: data.full_name || username,
    avatar: avatarUrl,
    age,
    gender: data.gender || null,
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
 * Fetch food entries for a specific date from SparkyFitness API
 *
 * @param username - The username to fetch food entries for
 * @param date - Date in YYYY-MM-DD format
 * @returns Object with meals grouped by meal type
 */
export async function fetchFoodEntriesForDate(
  username: string,
  date: string
): Promise<{
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snack: FoodItem[];
}> {
  const apiKey = getApiKey(username);

  const response = await fetch(`${SPARKYFITNESS_API_URL}/food-entries/by-date/${date}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Host': WEB_HOST,
      'Referer': SPARKYFITNESS_WEB_URL,
      'Content-Type': 'application/json'
    }
  });


  if (!response.ok) {
    // If no food entries found for this date, return empty meals
    if (response.status === 404) {
      return { breakfast: [], lunch: [], dinner: [], snack: [] };
    }
    throw new Error(`Failed to fetch food entries for ${username} on ${date}: ${response.statusText}`);
  }

  const entries: UpstreamFoodEntry[] = await response.json();

  // Transform and group by meal type
  const meals: {
    breakfast: FoodItem[];
    lunch: FoodItem[];
    dinner: FoodItem[];
    snack: FoodItem[];
  } = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  entries.forEach(entry => {
    // Calculate actual nutritional values based on quantity consumed
    // The API returns values per serving_size, we need to scale by quantity
    const ratio = entry.quantity / entry.serving_size;

    const foodItem: FoodItem = {
      name: entry.food_name,
      brand: entry.brand_name || undefined,
      quantity: entry.quantity,
      unit: entry.unit,
      calories: Math.round(entry.calories * ratio * 10) / 10,
      protein: Math.round(entry.protein * ratio * 10) / 10,
      carbs: Math.round(entry.carbs * ratio * 10) / 10,
      fat: Math.round(entry.fat * ratio * 10) / 10,
    };

    meals[entry.meal_type] ??= [];
    meals[entry.meal_type].push(foodItem);
  });

  return meals;
}

/**
 * Fetch nutrition history from SparkyFitness API
 *
 * Process:
 * 1. Get API key for username
 * 2. Fetch profile to get userId
 * 3. Calculate date range (last N days)
 * 4. Call GET /reports/mini-nutrition-trends for daily totals
 * 5. Optionally fetch food entries for each day (GET /food-entries/by-date/{date})
 * 6. Transform and combine data into DailyData format
 *
 * Note: Food entries are fetched in parallel for all days when includeMeals is true.
 */
export async function fetchNutritionHistory(
  username: string,
  days: number = 90,
  includeMeals: boolean = true
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

  // Step 5: Optionally fetch food entries for all days in parallel
  const dateStrings: string[] = [];
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    dateStrings.push(dateStr);
  }

  let mealsMap = new Map<string, { breakfast: FoodItem[]; lunch: FoodItem[]; dinner: FoodItem[]; snack: FoodItem[] }>();

  if (includeMeals) {
    const datePromises: Promise<{ date: string; meals: { breakfast: FoodItem[]; lunch: FoodItem[]; dinner: FoodItem[]; snack: FoodItem[] } }>[] = [];

    dateStrings.forEach(dateStr => {
      // Fetch food entries for this date
      datePromises.push(
        fetchFoodEntriesForDate(username, dateStr)
          .then(meals => ({ date: dateStr, meals }))
          .catch(() => ({
            date: dateStr,
            meals: { breakfast: [], lunch: [], dinner: [], snack: [] }
          }))
      );
    });

    // Wait for all food entry requests to complete
    const foodEntriesResults = await Promise.all(datePromises);

    // Create a map of date -> meals for quick lookup
    foodEntriesResults.forEach(({ date, meals }) => {
      mealsMap.set(date, meals);
    });
  }

  // Generate array for all requested days
  const result: DailyData[] = [];
  for (let i = 0; i < days; i++) {
    const dateStr = dateStrings[i];
    const dayData = nutritionMap.get(dateStr);
    const meals = includeMeals ? (mealsMap.get(dateStr) || {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }) : undefined;

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
      meals: meals as any, // Type assertion to handle optional meals
    });
  }

  return result;
}
