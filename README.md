# Edenia World

A tile-based game engine built with Expo and React Native.

## Author

**Guillaume HARARI**

Vibe coded with Claude (Anthropic)

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development) or Xcode (for iOS development)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/Edenia-World.git
cd Edenia-World
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on device/emulator:

**Android:**
```bash
npx expo run:android
```

**iOS:**
```bash
npx expo run:ios
```

## Project Structure

```
Edenia-World/
├── App.tsx                    # Main application entry
├── assets/
│   └── environment/           # Tile assets (tree, rock, flower, water)
└── src/
    ├── actions/               # JSON action system
    ├── data/                  # WorldState, CameraState, configs
    └── renderer/              # Tile and grid rendering
```

## License

MIT
