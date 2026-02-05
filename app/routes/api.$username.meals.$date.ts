import type { Route } from "./+types/api.$username.meals.$date";

/**
 * API endpoint to fetch meal details for a specific date
 * This allows lazy loading of meal data when a day is clicked
 */
export async function loader({ params }: Route.LoaderArgs) {
  const username = params.username;
  const date = params.date;

  // Dynamic import to avoid bundling server-only code
  const sparkyfitness = await import("../lib/sparkyfitness");

  try {
    // Fetch food entries for the specific date
    const meals = await sparkyfitness.fetchFoodEntriesForDate(username, date);

    return Response.json({ meals });
  } catch (error) {
    console.error(`Failed to fetch meals for ${username} on ${date}:`, error);
    return Response.json(
      { error: "Failed to fetch meal data" },
      { status: 500 }
    );
  }
}
