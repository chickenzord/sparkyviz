import type { Route } from "./+types/api.$username.profile";
import { fetchProfile } from "../lib/sparkyfitness";

export async function loader({ params }: Route.LoaderArgs) {
  const username = params.username;

  if (!username) {
    return Response.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const profile = await fetchProfile(username);
    return Response.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Response.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
