/**
 * SparkyFitness API Client
 *
 * This module handles all communication with the upstream SparkyFitness API.
 * It translates upstream responses into the data contracts expected by SparkyViz.
 */

const SPARKYFITNESS_API_URL = process.env.SPARKYFITNESS_API_URL || "https://api.sparkyfitness.com";
const SPARKYFITNESS_API_KEY = process.env.SPARKYFITNESS_API_KEY || "";

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
 */
export async function fetchProfile(username: string): Promise<Profile> {
  // TODO: Replace with actual API call to SparkyFitness
  // const response = await fetch(`${SPARKYFITNESS_API_URL}/users/${username}/profile`, {
  //   headers: { Authorization: `Bearer ${SPARKYFITNESS_API_KEY}` }
  // });
  // const data = await response.json();
  // return transformProfileResponse(data);

  // Mock data for now
  return {
    name: username.charAt(0).toUpperCase() + username.slice(1),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    goals: {
      calories: 2200,
      protein: 165,
      carbs: 248,
      fat: 73,
    },
    currentStreak: 15,
    totalDays: 90,
  };
}

/**
 * Fetch nutrition history from SparkyFitness API
 */
export async function fetchNutritionHistory(
  username: string,
  days: number = 90
): Promise<DailyData[]> {
  // TODO: Replace with actual API call to SparkyFitness
  // const response = await fetch(
  //   `${SPARKYFITNESS_API_URL}/users/${username}/nutrition/history?days=${days}`,
  //   { headers: { Authorization: `Bearer ${SPARKYFITNESS_API_KEY}` } }
  // );
  // const data = await response.json();
  // return transformHistoryResponse(data);

  // Mock data: Last 5 weeks (35 days) with up to 3 random blank days
  const totalDays = 35;

  // Pick 0-3 random days to be blank
  const blankDayCount = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
  const blankDayIndices = new Set<number>();
  while (blankDayIndices.size < blankDayCount) {
    blankDayIndices.add(Math.floor(Math.random() * totalDays));
  }

  const data = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - i));

    const isBlankDay = blankDayIndices.has(i);

    return {
      date: date.toISOString().split("T")[0],
      nutrients: isBlankDay
        ? { calories: 0, protein: 0, carbs: 0, fat: 0 }
        : {
            calories: Math.floor(Math.random() * 600) + 1800, // 1800-2400
            protein: Math.floor(Math.random() * 50) + 140,    // 140-190g
            carbs: Math.floor(Math.random() * 80) + 210,      // 210-290g
            fat: Math.floor(Math.random() * 25) + 60,         // 60-85g
          },
      meals: isBlankDay
        ? { breakfast: [], lunch: [], dinner: [], snack: [] }
        : {
            breakfast: [
              {
                name: "Nasi Goreng",
                calories: 450,
                protein: 15,
                carbs: 65,
                fat: 12,
              },
            ],
            lunch: [
              {
                name: "Ayam Bakar",
                calories: 380,
                protein: 45,
                carbs: 5,
                fat: 18,
              },
              { name: "Sayur Asem", calories: 80, protein: 3, carbs: 12, fat: 2 },
            ],
            dinner: [
              {
                name: "Gado-gado",
                calories: 320,
                protein: 14,
                carbs: 35,
                fat: 15,
              },
              {
                name: "Tempe Mendoan",
                calories: 200,
                protein: 12,
                carbs: 18,
                fat: 9,
              },
            ],
            snack: [
              {
                name: "Pisang Goreng",
                calories: 150,
                protein: 2,
                carbs: 28,
                fat: 4,
              },
            ],
          },
    };
  });

  // Pad with blank days at the beginning to reach requested 'days' count
  // This simulates a user who started tracking recently
  const paddingDays = days - totalDays;
  if (paddingDays > 0) {
    const padding = Array.from({ length: paddingDays }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split("T")[0],
        nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
      };
    });
    return [...padding, ...data];
  }

  return data;
}
