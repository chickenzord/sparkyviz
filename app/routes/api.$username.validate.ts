import type { Route } from "./+types/api.$username.validate";
import { validatePassword } from "../lib/sparkyfitness";

export async function loader({ params, request }: Route.LoaderArgs) {
  const username = params.username;
  const url = new URL(request.url);
  const password = url.searchParams.get("password");

  if (!password) {
    return Response.json({ valid: false }, { status: 400 });
  }

  const isValid = validatePassword(username, password);

  return Response.json({ valid: isValid });
}
