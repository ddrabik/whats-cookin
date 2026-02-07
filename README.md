# Meal Planner

A modern recipe management application with AI-powered recipe extraction from images.

## Features

- **AI Recipe Extraction** - Upload photos of recipes and automatically extract ingredients and instructions using OpenAI Vision
- **Smart Search** - Fuzzy search across all your recipes
- **Meal Type Organization** - Categorize recipes by breakfast, lunch, dinner, snacks, and desserts
- **Favorites** - Mark and filter your favorite recipes
- **Real-time Sync** - Changes sync instantly across all devices

## Tech Stack

- **Frontend**: [TanStack Start](https://tanstack.com/start) (React 19 + Vite)
- **Backend**: [Convex](https://convex.dev) (Serverless functions + Real-time database)
- **AI**: OpenAI GPT-4 Vision API
- **Styling**: Tailwind CSS v4
- **State**: TanStack Query + Convex reactive queries

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A [Convex](https://convex.dev) account (free tier available)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/meal-planner.git
   cd meal-planner
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Convex:

   ```bash
   npx convex dev
   ```

   This will prompt you to log in and create a new project.

4. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

   The Convex CLI will automatically populate `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL`.

5. Set your OpenAI API key in the Convex Dashboard:
   - Open the dashboard: `npx convex dashboard`
   - Go to Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your API key

6. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3006](http://localhost:3006) in your browser.

## Scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start development server (frontend + Convex) |
| `npm run build`      | Build for production                         |
| `npm run lint`       | Run TypeScript and ESLint checks             |
| `npm test`           | Run test suite                               |
| `npm run test:watch` | Run tests in watch mode                      |

## Project Structure

```
meal-planner/
├── convex/                    # Backend: Convex functions and schema
│   ├── uploads/               # File upload handling
│   ├── vision/                # OpenAI Vision integration
│   ├── recipes.ts             # Recipe CRUD operations
│   └── schema.ts              # Database schema
├── src/
│   ├── components/            # React components
│   │   └── ui/                # UI primitives (shadcn)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions
│   ├── routes/                # TanStack Router pages
│   └── types/                 # TypeScript type definitions
└── public/                    # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for any purpose.

## Acknowledgments

- [Convex](https://convex.dev) for the excellent serverless platform
- [TanStack](https://tanstack.com) for the amazing React tooling
- [OpenAI](https://openai.com) for the Vision API
