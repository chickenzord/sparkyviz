import { useLoaderData } from "react-router";
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

  return { profile, history, username, dateParam };
}

export default function Dashboard() {
  const { profile: profileData, history: heatmapData, dateParam } = useLoaderData<typeof loader>();

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
        setSelectedDay(heatmapData[todayIndex]);
      }
    }
  };

  const mealTypes = [
    { key: "breakfast" as const, label: "Breakfast", icon: Coffee, color: "amber" },
    { key: "lunch" as const, label: "Lunch", icon: Sun, color: "orange" },
    { key: "dinner" as const, label: "Dinner", icon: Moon, color: "indigo" },
    { key: "snack" as const, label: "Snacks", icon: Cookie, color: "pink" },
  ];

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

  const getHeatmapColor = (percentage: number) => {
    // Universal red-yellow-green gradient for all nutrients
    if (percentage === 0) return "bg-gray-100"; // No data
    if (percentage < 70) return "bg-red-200";
    if (percentage < 85) return "bg-orange-200";
    if (percentage < 100) return "bg-yellow-200";
    if (percentage < 115) return "bg-green-300";
    return "bg-green-400";
  };

  const getPercentage = (value: number, goal: number) => (value / goal) * 100;

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
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">90-Day Nutrition Heatmap</h2>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Today Button */}
              <button
                onClick={scrollToToday}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium"
              >
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Jump to </span>Today
              </button>

              {/* Legend - Hidden on mobile, show on md+ */}
              <div className="hidden md:flex items-center gap-3 text-xs">
                <span className="text-gray-600 font-medium">Goal %:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-200 rounded"></div>
                  <span>&lt;70%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-200 rounded"></div>
                  <span>70-85%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                  <span>85-100%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-300 rounded"></div>
                  <span>100-115%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>&gt;115%</span>
                </div>
              </div>
            </div>
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
                                  ${getHeatmapColor(percentage)}
                                  ${isSelected ? "shadow-[inset_0_0_0_2px_rgb(79,70,229)]" : ""}
                                  flex items-center justify-center flex-shrink-0
                                `}
                                title={`${day.date}\n${nutrient.label}: ${value}${nutrient.unit} (${percentage.toFixed(0)}%)`}
                              >
                                {/* Today indicator - big dot in center */}
                                {isToday && (
                                  <div className="absolute w-2 h-2 bg-indigo-600 rounded-full"></div>
                                )}
                                {/* Missed indicator - "x" for zero */}
                                {isMissed && !isToday && (
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

          {/* Mobile Legend */}
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600 font-medium">Goal %:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-red-200 rounded"></div>
                  <span>&lt;70</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-orange-200 rounded"></div>
                  <span>70-85</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-yellow-200 rounded"></div>
                  <span>85-100</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-300 rounded"></div>
                  <span>100-115</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded"></div>
                  <span>&gt;115</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Food Details Section */}
        {selectedDay && (
          <div className="bg-white rounded-2xl shadow-lg p-3 md:p-6 animate-fade-in">
            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-800">
                {formatDate(selectedDay.date, "long")}
              </h2>

              {/* Daily Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-3 md:mt-4">
                {nutrients.map((nutrient) => {
                  const Icon = nutrient.icon;
                  const value = selectedDay.nutrients[nutrient.key];
                  const goal = profileData.goals[nutrient.key];
                  const percentage = getPercentage(value, goal);
                  const isOnTrack = percentage >= 85 && percentage <= 115;

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
                      <div
                        className={`text-[10px] md:text-xs mt-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded inline-block ${
                          isOnTrack
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Meals by Type */}
            <h3 className="text-sm md:text-base font-semibold text-gray-700 mb-2 md:mb-3">Meals</h3>
            <div className="space-y-3 md:space-y-4">
              {mealTypes.map((mealType) => {
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
                      className={`flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-${mealType.color}-50 rounded-lg`}
                    >
                      <Icon className={`w-4 h-4 md:w-5 md:h-5 text-${mealType.color}-600`} />
                      <span className="text-sm md:text-base font-semibold text-gray-700">{mealType.label}</span>
                      <span className="ml-auto text-[10px] md:text-sm text-gray-600">
                        <span className="hidden sm:inline">
                          {mealTotals.calories} cal • {mealTotals.protein}g P • {mealTotals.carbs}g C • {mealTotals.fat}g F
                        </span>
                        <span className="sm:hidden">
                          {mealTotals.calories} cal
                        </span>
                      </span>
                    </div>

                    {/* Food Items */}
                    {meals.map((food, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 md:p-3 bg-gray-50 rounded-lg ml-4 md:ml-8 gap-2 sm:gap-0"
                      >
                        <div className="text-sm md:text-base font-medium text-gray-800">{food.name}</div>
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
      </div>
    </div>
  );
}
