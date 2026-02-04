import type { Route } from "./+types/home";
import { Link, useLoaderData } from "react-router";
import { Target, TrendingUp, Calendar } from "lucide-react";
import { getFirstUsername } from "../lib/sparkyfitness";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SparkyViz - Fitness Nutrition Dashboard" },
    {
      name: "description",
      content: "Share your nutrition tracking progress with coaches and accountability partners",
    },
  ];
}

export async function loader() {
  const firstUsername = getFirstUsername();
  return { firstUsername };
}

export default function Home() {
  const { firstUsername } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SparkyViz
          </h1>
          <p className="text-xl text-gray-600">
            Visual nutrition tracking dashboard for coaches and accountability partners
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">90-Day Heatmap</h3>
              <p className="text-sm text-gray-600">
                Visual overview of nutrition adherence across all macros
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Goal Tracking</h3>
              <p className="text-sm text-gray-600">
                Color-coded progress against daily nutrition goals
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Meal Breakdown</h3>
              <p className="text-sm text-gray-600">
                Detailed view of meals and macros for any day
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Try it out</h2>
          <p className="text-gray-600 mb-6">
            View a sample dashboard to see how it works
          </p>
          {firstUsername ? (
            <Link
              to={`/${firstUsername}`}
              className="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              @{firstUsername}
            </Link>
          ) : (
            <p className="text-gray-500 text-sm">No users configured</p>
          )}
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
    </div>
  );
}
