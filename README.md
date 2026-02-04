# SparkyViz

A read-only fitness showcase dashboard for displaying nutrition tracking data from SparkyFitness to coaches and accountability partners.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Framework**: React Router v7 (evolution of Remix)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Build Tool**: Vite

## Project Structure

```
app/
├── routes/
│   ├── home.tsx                           # Home page (/)
│   ├── $username.tsx                      # User dashboard (/:username)
│   ├── api.$username.profile.ts           # API: GET /api/:username/profile
│   └── api.$username.nutrition.history.ts # API: GET /api/:username/nutrition/history
├── lib/
│   └── sparkyfitness.ts                   # SparkyFitness API client
├── components/                             # Shared components
├── routes.ts                               # Route configuration
└── root.tsx                                # Root layout
```

## Getting Started

### Prerequisites

- Node.js 18+ (latest LTS recommended)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# SparkyFitness API Configuration
SPARKYFITNESS_API_URL=https://api.sparkyfitness.com
SPARKYFITNESS_API_KEY=your_api_key_here
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm start
```

### Type Checking

```bash
# Run TypeScript type checker
npm run typecheck
```

## Routes

- `/` - Home/landing page with project info
- `/:username` - User dashboard with 90-day nutrition heatmap
- `/api/:username/profile` - API endpoint for user profile data
- `/api/:username/nutrition/history?days=90` - API endpoint for nutrition history

## Key Features

### 90-Day Nutrition Heatmap
- **Layout**: Nutrient rows × Date columns (4 nutrients × 90 days)
- **Nutrients Tracked**: Calories, Protein, Carbs, Fat
- **Color Coding**: Percentage-based against daily goals (70%/85%/100%/115% thresholds)
- **Synchronized Scrolling**: All nutrient rows scroll together horizontally

### Meal Breakdown View
Displays selected day's nutrition grouped by meal type:
- **Breakfast** (Coffee icon, amber theme)
- **Lunch** (Sun icon, orange theme)
- **Dinner** (Moon icon, indigo theme)
- **Snacks** (Cookie icon, pink theme)

## Integration with SparkyFitness

The backend acts as a **proxy and translation layer** between the frontend and the upstream SparkyFitness API.

**Current Status**: Using mock data in `app/lib/sparkyfitness.ts`

**To integrate with real API**:
1. Set environment variables in `.env`
2. Update `fetchProfile()` and `fetchNutritionHistory()` in `app/lib/sparkyfitness.ts`
3. Implement response transformation logic

## Deployment

### Docker Deployment

```bash
docker build -t sparkyviz .
docker run -p 3000:3000 sparkyviz
```

Can be deployed to any platform that supports Docker:
- AWS ECS, Google Cloud Run, Azure Container Apps
- Digital Ocean App Platform, Fly.io, Railway

### DIY Deployment

Deploy the output of `npm run build`:
```
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Learn More

- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

## Project Brief

See [CLAUDE.md](./CLAUDE.md) for detailed architectural documentation and guidance for future development.
