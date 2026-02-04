import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route(":username", "routes/$username.tsx"),
  route("api/:username/profile", "routes/api.$username.profile.ts"),
  route("api/:username/nutrition/history", "routes/api.$username.nutrition.history.ts"),
  route("api/:username/validate", "routes/api.$username.validate.ts"),
] satisfies RouteConfig;
