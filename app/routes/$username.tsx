import { useLoaderData, useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import type { Route } from "./+types/$username";
import {
  Target,
  TrendingUp,
  Calendar,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Clock,
  AlertTriangle,
  UtensilsCrossed,
  Soup,
  Sunrise,
  Lock,
  XCircle,
} from "lucide-react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.username}'s Nutrition Dashboard | SparkyViz` },
    { name: "description", content: "90-day nutrition tracking dashboard" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const username = params.username;

  // Use the request URL to build API URLs (works in both dev and production)
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Get password from cookie only (not from query params)
  const cookieHeader = request.headers.get("Cookie");
  const passwordCookie = cookieHeader?.split(';').find(c => c.trim().startsWith(`auth-${username}=`))?.split('=')[1];

  // Lazy import to avoid issues with server-only code
  const { validatePassword } = await import("../lib/sparkyfitness");

  // Check if password is valid
  const isAuthenticated = passwordCookie && validatePassword(username, passwordCookie);

  // Check if there was an authentication failure
  const authFailed = url.searchParams.get("auth_failed") === "1";

  // If not authenticated, return early with auth required flag
  if (!isAuthenticated) {
    return {
      authenticated: false,
      username,
      profile: null,
      history: null,
      dateParam: null,
      authFailed
    };
  }

  // Get optional date query parameter
  const dateParam = url.searchParams.get("date");

  // Fetch profile and nutrition data from our API
  const [profileRes, historyRes] = await Promise.all([
    fetch(`${baseUrl}/api/${username}/profile`),
    fetch(`${baseUrl}/api/${username}/nutrition/history?days=90`),
  ]);

  if (!profileRes.ok || !historyRes.ok) {
    throw new Response("User not found", { status: 404 });
  }

  const profile = await profileRes.json();
  const history = await historyRes.json();

  return {
    authenticated: true,
    profile,
    history,
    username,
    dateParam
  };
}

export default function Dashboard() {
  const loaderData = useLoaderData<typeof loader>();
  const { authenticated, username, profile: profileData, history: heatmapData, dateParam, authFailed } = loaderData;
  const navigate = useNavigate();

  // Password form state (always declared at top level)
  const [passwordValue, setPasswordValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showError, setShowError] = useState(false);

  // Try to get password from localStorage on mount and auto-authenticate
  useEffect(() => {
    if (!authenticated) {
      try {
        const storedPassword = localStorage.getItem(`auth-${username}`);
        if (storedPassword) {
          setPasswordValue(storedPassword);
          // Auto-validate stored password
          handlePasswordSubmit(storedPassword);
        }
      } catch (e) {
        console.warn('Failed to read password from localStorage:', e);
      }
    }
  }, [authenticated, username]);

  // Show error if auth failed
  useEffect(() => {
    if (authFailed) {
      setShowError(true);
      // Clear the auth_failed query param
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_failed');
      window.history.replaceState({}, '', url.toString());
    }
  }, [authFailed]);

  // Handle password validation and storage
  const handlePasswordSubmit = async (password: string) => {
    setIsValidating(true);
    setShowError(false);

    try {
      // Validate password via API
      const response = await fetch(`/api/${username}/validate?password=${encodeURIComponent(password)}`);
      const data = await response.json();

      if (data.valid) {
        // Store in cookie (30 days)
        document.cookie = `auth-${username}=${password}; path=/; max-age=2592000; SameSite=Strict`;

        // Store in localStorage as backup
        try {
          localStorage.setItem(`auth-${username}`, password);
        } catch (e) {
          console.warn('Failed to store password in localStorage:', e);
        }

        // Reload page to trigger authentication
        window.location.reload();
      } else {
        // Invalid password
        setShowError(true);
        setIsValidating(false);

        // Clear stored password if validation fails
        try {
          localStorage.removeItem(`auth-${username}`);
        } catch (e) {
          console.warn('Failed to clear password from localStorage:', e);
        }
      }
    } catch (error) {
      console.error('Password validation error:', error);
      setShowError(true);
      setIsValidating(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePasswordSubmit(passwordValue);
  };

  // If not authenticated, show password form
  if (!authenticated) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Protected Dashboard
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Enter the password to view @{username}'s nutrition dashboard
          </p>

          {showError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Invalid password. Please try again.</p>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={passwordValue}
                onChange={(e) => {
                  setPasswordValue(e.target.value);
                  setShowError(false); // Clear error when user types
                }}
                disabled={isValidating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter password"
                autoFocus={!passwordValue}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={isValidating || !passwordValue}
              className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Access Dashboard'}
            </button>
          </form>
        </div>

        {/* Attribution Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Built by{" "}
            <a
              href="https://akhy.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-medium underline"
            >
              akhy
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Type guard: after authentication check, these should be non-null
  if (!profileData || !heatmapData) {
    throw new Error("Profile or history data is missing");
  }

  const [selectedDay, setSelectedDay] = useState<typeof heatmapData[0] | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Trim consecutive blank days from the beginning
  const trimmedData = (() => {
    let startIndex = 0;
    for (let i = 0; i < heatmapData.length; i++) {
      const day = heatmapData[i];
      const hasData =
        day.nutrients.calories > 0 ||
        day.nutrients.protein > 0 ||
        day.nutrients.carbs > 0 ||
        day.nutrients.fat > 0;
      if (hasData) {
        startIndex = i;
        break;
      }
    }
    return heatmapData.slice(startIndex);
  })();

  // Find today's data
  const today = new Date().toISOString().split("T")[0];
  const todayIndex = trimmedData.findIndex((d) => d.date === today);

  useEffect(() => {
    // Auto-select today or specified date on load (run only once on mount)
    const targetDate = dateParam || today;
    const targetIndex = trimmedData.findIndex((d) => d.date === targetDate);

    if (targetIndex >= 0) {
      setSelectedDay(trimmedData[targetIndex]);

      // Auto-scroll to today if no date param specified
      if (!dateParam && todayRef.current) {
        // Small delay to ensure refs are ready
        setTimeout(() => {
          todayRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Synchronize scroll across all nutrient rows
  const handleScroll = (scrollingIndex: number) => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = (e.target as HTMLDivElement).scrollLeft;
    scrollContainerRefs.current.forEach((ref, idx) => {
      if (ref && idx !== scrollingIndex) {
        ref.scrollLeft = scrollLeft;
      }
    });
  };

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      if (todayIndex >= 0) {
        setSelectedDay(trimmedData[todayIndex]);
      }
    }
  };

  // Default meal type ordering and styling
  const defaultMealTypes = [
    { key: "breakfast", label: "Breakfast", icon: Sunrise, color: "amber" },
    { key: "lunch", label: "Lunch", icon: Sun, color: "orange" },
    { key: "snack", label: "Snacks", icon: Cookie, color: "pink" },
    { key: "dinner", label: "Dinner", icon: Moon, color: "indigo" },
  ] as const;

  // Get all meal types from selected day, sorted by default order
  const getMealTypes = () => {
    if (!selectedDay) return [];

    const defaultKeys = defaultMealTypes.map(m => m.key);
    const allMealKeys = Object.keys(selectedDay.meals) as string[];

    // Sort: default meal types first (in order), then custom meal types
    const sorted = allMealKeys.sort((a, b) => {
      const aIndex = defaultKeys.indexOf(a as any);
      const bIndex = defaultKeys.indexOf(b as any);

      // Both are default types
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // Only a is default
      if (aIndex !== -1) return -1;
      // Only b is default
      if (bIndex !== -1) return 1;
      // Both are custom, sort alphabetically
      return a.localeCompare(b);
    });

    // Map to meal type objects
    return sorted.map(key => {
      const defaultType = defaultMealTypes.find(m => m.key === key);
      if (defaultType) return defaultType;

      // Custom meal type - capitalize first letter
      return {
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        icon: Cookie, // Default icon for custom types
        color: "gray" as const,
      };
    });
  };

  const nutrients = [
    {
      key: "calories" as const,
      label: "Calories",
      unit: "cal",
      icon: Flame,
      color: "orange",
    },
    {
      key: "protein" as const,
      label: "Protein",
      unit: "g",
      icon: Beef,
      color: "red",
    },
    {
      key: "carbs" as const,
      label: "Carbs",
      unit: "g",
      icon: Wheat,
      color: "yellow",
    },
    {
      key: "fat" as const,
      label: "Fat",
      unit: "g",
      icon: Droplet,
      color: "blue",
    },
  ];

  /**
   * Get heatmap color based on distance from 100% target
   * Returns smooth RGBA gradient from red (far from target) to green (at target)
   * More lenient when over 100% (eating more is less concerning than eating less)
   */
  const getHeatmapColor = (percentage: number): string => {
    // No data
    if (percentage === 0) return "rgba(229, 231, 235, 1)"; // gray-200

    // Calculate distance from 100%, but weight it differently for over vs under
    // Under 100%: Use actual distance (stricter)
    // Over 100%: Scale distance down (more lenient)
    let adjustedDistance: number;
    if (percentage < 100) {
      // Below target: use full distance (stricter)
      adjustedDistance = 100 - percentage;
    } else {
      // Above target: scale distance by 0.5 (more lenient)
      // e.g., 130% feels like 115% in terms of color severity
      adjustedDistance = (percentage - 100) * 0.5;
    }

    // Color zones based on adjusted distance from 100%:
    // 0-15 adjusted distance: Green
    // 15-30 adjusted distance: Yellow
    // 30-50 adjusted distance: Orange
    // 50+ adjusted distance: Red

    if (adjustedDistance <= 15) {
      // Green zone - darker green at exactly 100%, lighter as we move away
      const intensity = 1 - (adjustedDistance / 15) * 0.3; // 1.0 to 0.7
      return `rgba(34, 197, 94, ${intensity})`; // green-500 base
    } else if (adjustedDistance <= 30) {
      // Yellow zone - transition from green to yellow
      const t = (adjustedDistance - 15) / 15; // 0 to 1
      const r = Math.round(34 + (234 - 34) * t);
      const g = Math.round(197 + (179 - 197) * t);
      const b = Math.round(94 + (0 - 94) * t);
      return `rgba(${r}, ${g}, ${b}, ${0.9 - t * 0.1})`; // 0.9 to 0.8 opacity
    } else if (adjustedDistance <= 50) {
      // Orange zone - transition from yellow to orange
      const t = (adjustedDistance - 30) / 20; // 0 to 1
      const r = Math.round(234 + (249 - 234) * t);
      const g = Math.round(179 + (115 - 179) * t);
      const b = Math.round(0 + (0 - 0) * t);
      return `rgba(${r}, ${g}, ${b}, ${0.85 - t * 0.05})`; // 0.85 to 0.8 opacity
    } else {
      // Red zone - transition from orange to red
      const t = Math.min((adjustedDistance - 50) / 50, 1); // 0 to 1
      const r = 239; // red-500
      const g = Math.round(115 - 115 * t * 0.3);
      const b = Math.round(0 + 68 * t * 0.3);
      return `rgba(${r}, ${g}, ${b}, ${0.85 + t * 0.15})`; // 0.85 to 1.0 opacity
    }
  };

  const getPercentage = (value: number, goal: number) => (value / goal) * 100;

  /**
   * Get color based on distance from 100% target
   * Returns same RGBA gradient as heatmap for consistency
   * More lenient when over 100% (eating more is less concerning than eating less)
   */
  const getPercentageColor = (percentage: number) => {
    // Use the same color logic as heatmap
    const bgColor = getHeatmapColor(percentage);

    // Calculate distance for text color determination
    let adjustedDistance: number;
    if (percentage < 100) {
      adjustedDistance = 100 - percentage;
    } else {
      adjustedDistance = (percentage - 100) * 0.5;
    }

    // Determine text color based on severity
    let textColor: string;
    if (adjustedDistance <= 15) {
      textColor = "rgb(21, 128, 61)"; // green-700
    } else if (adjustedDistance <= 30) {
      textColor = "rgb(161, 98, 7)"; // yellow-700
    } else if (adjustedDistance <= 50) {
      textColor = "rgb(194, 65, 12)"; // orange-700
    } else {
      textColor = "rgb(185, 28, 28)"; // red-700
    }

    return {
      bg: bgColor,
      text: textColor,
    };
  };

  const formatDate = (dateStr: string, format: "short" | "long" = "short") => {
    const date = new Date(dateStr);
    if (format === "short") {
      return date.getDate();
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRelativeDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 60) return `${diffDays} days ago`;
    if (diffDays < 90) return "~2 months ago";
    return `~${Math.floor(diffDays / 30)} months ago`;
  };

  // Group days by month for headers
  const monthGroups = trimmedData.reduce((acc, day) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        days: [],
      };
    }
    acc[monthKey].days.push(day);
    return acc;
  }, {} as Record<string, { label: string; days: typeof trimmedData }>);

  const months = Object.values(monthGroups);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <img
              src={profileData.avatar}
              alt="Avatar"
              className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-indigo-200"
            />
            <div className="flex-1 text-center md:text-left w-full">
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-3">
                {profileData.name}'s Nutrition Tracking
              </h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                {nutrients.map((nutrient) => {
                  const Icon = nutrient.icon;
                  return (
                    <div key={nutrient.key} className="flex items-center gap-1 md:gap-2 justify-center md:justify-start">
                      <Icon className={`w-4 h-4 md:w-5 md:h-5 text-${nutrient.color}-600`} />
                      <span className="text-gray-600">
                        <strong>{profileData.goals[nutrient.key]}</strong> {nutrient.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 md:gap-6 text-xs md:text-sm mt-3 pt-3 border-t justify-center md:justify-start">
                <div className="flex items-center gap-1 md:gap-2">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  <span className="text-gray-600">
                    <strong>{profileData.currentStreak}</strong> day streak
                  </span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  <span className="text-gray-600">
                    <strong>{profileData.totalDays}</strong> days tracked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="bg-white rounded-2xl shadow-lg p-3 md:p-6 mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">90-Day Nutrition Heatmap</h2>

            {/* Today Button - Hide if today is already selected */}
            {selectedDay?.date !== today && (
              <button
                onClick={scrollToToday}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium"
              >
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Jump to </span>Today
              </button>
            )}
          </div>

          {/* Heatmap Table */}
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <div className="inline-block min-w-full">
              {/* Month Headers */}
              <div className="flex">
                {/* Spacer for nutrient labels - semi-transparent */}
                <div className="sticky left-0 z-20 bg-white/80 backdrop-blur-sm w-20 md:w-32 flex-shrink-0 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]" />

                {/* Month labels */}
                <div className="flex gap-0.5">
                  {months.map((month, idx) => (
                    <div key={idx} className="flex-shrink-0">
                      <div className="text-center border-b-2 border-gray-200 pb-1">
                        <div className="text-xs md:text-sm font-semibold text-gray-700">
                          {month.label}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {month.days.map((day) => (
                          <div key={day.date} className="w-7 md:w-8 h-0 flex-shrink-0" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Headers */}
              <div className="flex border-b border-gray-200 mb-2">
                {/* Spacer for nutrient labels - semi-transparent */}
                <div className="sticky left-0 z-20 bg-white/80 backdrop-blur-sm w-20 md:w-32 flex-shrink-0 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]" />

                {/* Date labels */}
                <div className="flex gap-0.5">
                  {trimmedData.map((day) => {
                    const date = new Date(day.date);
                    const isToday = day.date === today;
                    return (
                      <div
                        key={day.date}
                        className={`w-7 md:w-8 text-center flex-shrink-0 ${isToday ? "font-bold text-green-600" : "text-gray-500"}`}
                      >
                        <div className="text-[10px] leading-tight">
                          {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                        </div>
                        <div className="text-xs font-medium">
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nutrient Rows */}
              <div className="space-y-2 md:space-y-3">
                {nutrients.map((nutrient, nutrientIdx) => {
                  const Icon = nutrient.icon;
                  return (
                    <div key={nutrient.key} className="flex items-center">
                      {/* Sticky Nutrient Label */}
                      <div className="sticky left-0 z-20 bg-white/90 backdrop-blur-sm w-20 md:w-32 flex-shrink-0 pr-2 md:pr-3 pl-1 md:pl-2 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Icon className={`w-3 h-3 md:w-4 md:h-4 text-${nutrient.color}-600 flex-shrink-0`} />
                          <div className="min-w-0">
                            <div className="text-xs md:text-sm font-semibold text-gray-700 truncate">
                              {nutrient.label}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-500 truncate">
                              {profileData.goals[nutrient.key]}{nutrient.unit}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Days */}
                      <div
                        ref={(el) => (scrollContainerRefs.current[nutrientIdx] = el)}
                        onScroll={handleScroll(nutrientIdx)}
                        className="flex-1 overflow-x-auto hide-scrollbar"
                      >
                        <div className="flex gap-0.5">
                          {trimmedData.map((day, dayIdx) => {
                            const value = day.nutrients[nutrient.key];
                            const percentage = getPercentage(
                              value,
                              profileData.goals[nutrient.key]
                            );
                            const isToday = day.date === today;
                            const isSelected = selectedDay?.date === day.date;
                            const isMissed = value === 0;
                            return (
                              <div
                                key={dayIdx}
                                ref={
                                  isToday && nutrient.key === "calories" ? todayRef : null
                                }
                                onClick={() => setSelectedDay(day)}
                                className={`
                                  relative w-7 h-7 md:w-8 md:h-8 cursor-pointer transition-all active:scale-95
                                  ${isSelected ? "shadow-[inset_0_0_0_2px_rgb(79,70,229)]" : ""}
                                  flex items-center justify-center flex-shrink-0
                                `}
                                style={{ backgroundColor: getHeatmapColor(percentage) }}
                                title={`${day.date}\n${nutrient.label}: ${value}${nutrient.unit} (${percentage.toFixed(0)}%)`}
                              >
                                {/* Selected indicator - show percentage */}
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                                    {percentage.toFixed(0)}
                                  </span>
                                )}
                                {/* Today indicator - big dot in center (only if not selected) */}
                                {isToday && !isSelected && (
                                  <div className="absolute w-2 h-2 bg-gray-800 opacity-50 rounded-full"></div>
                                )}
                                {/* Missed indicator - "x" for zero (only if not selected and not today) */}
                                {isMissed && !isSelected && !isToday && (
                                  <span className="text-gray-400 text-xs font-bold">×</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Food Details Section */}
        {selectedDay && (
          <div className="bg-white rounded-2xl shadow-lg p-3 md:p-6 animate-fade-in">
            <div className="mb-4 md:mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">
                  {formatDate(selectedDay.date, "long")}
                </h2>
                {selectedDay.date === today ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Today</span>
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                    {getRelativeDate(selectedDay.date)}
                  </div>
                )}
              </div>
              {selectedDay.date === today && (
                <p className="text-xs md:text-sm text-gray-500 italic mb-2">
                  Data may be incomplete as the day is still in progress
                </p>
              )}

              {/* Daily Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-3 md:mt-4">
                {nutrients.map((nutrient) => {
                  const Icon = nutrient.icon;
                  const value = selectedDay.nutrients[nutrient.key];
                  const goal = profileData.goals[nutrient.key];
                  const percentage = getPercentage(value, goal);
                  const colors = getPercentageColor(percentage);

                  // Calculate progress bar width (max 200% = full width)
                  const progressWidth = Math.min(percentage, 200);

                  return (
                    <div key={nutrient.key} className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                        <Icon className={`w-4 h-4 md:w-5 md:h-5 text-${nutrient.color}-600`} />
                        <span className="text-xs md:text-sm text-gray-600">{nutrient.label}</span>
                      </div>
                      <div className="text-lg md:text-2xl font-bold text-gray-800">
                        {value}
                        <span className="text-xs md:text-sm text-gray-500">/{goal}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="mb-1 flex items-center gap-1">
                          <span
                            className="text-xs md:text-sm font-semibold"
                            style={{ color: colors.text }}
                          >
                            {percentage.toFixed(0)}%
                          </span>
                          {percentage > 200 && (
                            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
                          )}
                        </div>
                        <div className="relative w-full bg-gray-200 h-2 md:h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${selectedDay.date === today ? 'progress-in-progress' : ''}`}
                            style={{
                              width: `${(progressWidth / 200) * 100}%`,
                              backgroundColor: colors.bg
                            }}
                          />
                          {/* 100% target marker - positioned at 50% (middle of 0-200% range) */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-gray-800 opacity-40"
                            style={{ left: '50%' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Meals by Type */}
            <h3 className="text-sm md:text-base font-semibold text-gray-700 mb-2 md:mb-3">Meals</h3>
            <div className="space-y-3 md:space-y-4">
              {getMealTypes().map((mealType) => {
                const Icon = mealType.icon;
                const meals = selectedDay.meals[mealType.key];

                if (!meals || meals.length === 0) return null;

                const mealTotals = meals.reduce(
                  (acc, food) => ({
                    calories: acc.calories + food.calories,
                    protein: acc.protein + food.protein,
                    carbs: acc.carbs + food.carbs,
                    fat: acc.fat + food.fat,
                  }),
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                );

                return (
                  <div key={mealType.key} className="space-y-1.5 md:space-y-2">
                    {/* Meal Type Header */}
                    <div
                      className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 bg-${mealType.color}-50 rounded-lg`}
                    >
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${mealType.color}-600 shrink-0`} />
                      <span className="text-sm md:text-base font-semibold text-gray-700">{mealType.label}</span>
                      <span className="ml-auto text-[10px] md:text-sm text-gray-600">
                        <span className="hidden sm:inline">
                          {mealTotals.calories.toFixed(1)} cal • {mealTotals.protein.toFixed(1)}g P • {mealTotals.carbs.toFixed(1)}g C • {mealTotals.fat.toFixed(1)}g F
                        </span>
                        <span className="sm:hidden">
                          {mealTotals.calories.toFixed(1)} cal
                        </span>
                      </span>
                    </div>

                    {/* Food Items */}
                    {meals.map((food, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 md:p-3 bg-gray-50 rounded-lg ml-4 md:ml-8 gap-2 sm:gap-0"
                      >
                        <div className="flex flex-col">
                          <div className="text-sm md:text-base font-medium text-gray-800">{food.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {food.brand && <span>{food.brand} • </span>}
                            <span>{food.quantity} {food.unit}</span>
                          </div>
                        </div>
                        <div className="flex gap-3 md:gap-6 text-xs md:text-sm">
                          <div className="text-center">
                            <div className="text-[10px] md:text-xs text-gray-500">Cal</div>
                            <div className="font-semibold text-gray-800">{food.calories}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] md:text-xs text-gray-500">P</div>
                            <div className="font-semibold text-red-600">{food.protein}g</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] md:text-xs text-gray-500">C</div>
                            <div className="font-semibold text-yellow-600">{food.carbs}g</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] md:text-xs text-gray-500">F</div>
                            <div className="font-semibold text-blue-600">{food.fat}g</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Totals */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200 font-semibold">
                <div className="text-sm md:text-base text-gray-800">Daily Total</div>
                <div className="flex gap-3 md:gap-6 text-xs md:text-sm">
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs text-gray-500">Cal</div>
                    <div className="font-bold text-gray-800">
                      {selectedDay.nutrients.calories}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs text-gray-500">P</div>
                    <div className="font-bold text-red-600">
                      {selectedDay.nutrients.protein}g
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs text-gray-500">C</div>
                    <div className="font-bold text-yellow-600">
                      {selectedDay.nutrients.carbs}g
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] md:text-xs text-gray-500">F</div>
                    <div className="font-bold text-blue-600">{selectedDay.nutrients.fat}g</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedDay && (
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
            <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
            <p className="text-gray-500 text-sm md:text-lg">
              Tap any day to view detailed nutrition breakdown
            </p>
          </div>
        )}

        {/* Attribution Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs md:text-sm text-gray-500">
            Built by{" "}
            <a
              href="https://akhy.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-medium underline"
            >
              akhy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
