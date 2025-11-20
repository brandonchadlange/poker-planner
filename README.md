# Poker Planner

A real-time planning poker application built with React, TypeScript, Tailwind CSS, and Ably for agile team estimations.

## Features

- 🎯 **Real-time Voting**: Vote on issues using Fibonacci sequence cards
- 👥 **Multi-player Support**: Multiple team members can join and vote simultaneously
- 📊 **Visual Results**: See voting results with averages, medians, and vote distribution
- 📝 **Issue Management**: Create and manage issues to estimate
- 🔄 **Real-time Sync**: All game state synchronized in real-time using Ably
- 🎨 **Beautiful UI**: Modern, responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v20.19.0 or >=22.12.0 recommended)
- npm or yarn
- An Ably account (free tier available at [ably.com](https://ably.com))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd poker-planner
```

2. Install dependencies:
```bash
npm install
```

3. Set up your Ably API key:
   - Create a `.env` file in the root directory
   - Add your Ably API key:
   ```
   VITE_ABLY_API_KEY=your-ably-api-key-here
   ```
   - You can get a free API key from [Ably Dashboard](https://ably.com/dashboard)

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### Creating a Game

1. Enter your name
2. Click "Create Game"
3. Share the generated Game ID with your team members

### Joining a Game

1. Enter your name
2. Click "Join Game"
3. Enter the Game ID provided by the host

### Voting

1. The host selects an issue and clicks "Start Voting"
2. All players select their estimate cards
3. The host reveals votes when ready
4. Review the results and save the estimate

## Project Structure

```
poker-planner/
├── src/
│   ├── components/          # React components
│   │   ├── GameRoom.tsx     # Main game room component
│   │   ├── LandingPage.tsx  # Landing page for create/join
│   │   ├── VotingCards.tsx  # Voting card selection UI
│   │   ├── VotingResults.tsx # Results visualization
│   │   └── IssueManager.tsx  # Issue management sidebar
│   ├── hooks/
│   │   └── useAbly.ts       # Ably integration hook
│   ├── types.ts             # TypeScript type definitions
│   ├── utils/
│   │   └── gameUtils.ts     # Game utility functions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── .env.example             # Environment variables template
└── README.md
```

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Ably** - Real-time messaging and presence
- **Vite** - Build tool and dev server

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

- `VITE_ABLY_API_KEY` - Your Ably API key (required)

## Deployment

### Deploy to Vercel

This app is ready to deploy to Vercel. Follow these steps:

1. **Push your code to GitHub** (or another Git provider)

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your Git repository
   - Vercel will auto-detect the Vite framework

3. **Configure Environment Variables**:
   - In your Vercel project settings, go to "Environment Variables"
   - Add `VITE_ABLY_API_KEY` with your Ably API key
   - Make sure to add it for all environments (Production, Preview, Development)

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your app automatically

5. **Access your app**:
   - Your app will be available at `https://your-project.vercel.app`
   - You can also set up a custom domain in Vercel settings

### Manual Deployment

If you prefer to deploy manually:

```bash
# Build the project
npm run build

# The dist folder contains the production build
# You can deploy the dist folder to any static hosting service
```

### Environment Variables

Make sure to set the following environment variable in your deployment platform:
- `VITE_ABLY_API_KEY` - Your Ably API key

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
