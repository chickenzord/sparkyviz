import type { Route } from "./+types/api.$username.nutrition.history";
import { fetchNutritionHistory } from "../lib/sparkyfitness";

export async function loader({ params, request }: Route.LoaderArgs) {
  const username = params.username;

  if (!username) {
    return Response.json({ error: "Username is required" }, { status: 400 });
  }

  // Parse query parameters
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "90", 10);

  try {
    // Don't include meals by default for lighter payload (meals loaded on demand)
    const history = await fetchNutritionHistory(username, days, false);
    return Response.json(history);
  } catch (error) {
    console.error("Error fetching nutrition history:", error);
    return Response.json(
      { error: "Failed to fetch nutrition history" },
      { status: 500 }
    );
  }
}
