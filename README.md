# 🏏 Cricket Auction 26

> IPL-style multiplayer cricket auction game — bid on real Indian players, build your squad, simulate T20 matches, and win!

---

## 🎮 Game Overview

- **10 IPL Teams** — each player picks one real IPL team
- **Indian Players Only** — 60 players from the 2026 India squad pool
- **Live Bidding** — real-time auction with 10-second timer, auto-reset on new bid
- **T20 Simulation** — squads play simulated T20 matches after auction
- **AI Teams** — smart AI fills unused teams with 5 personality types

---

## 🏟️ The 10 IPL Teams

| Team | Abbr | City |
|---|---|---|
| Chennai Super Kings | CSK | Chennai |
| Delhi Capitals | DC | New Delhi |
| Gujarat Titans | GT | Ahmedabad |
| Kolkata Knight Riders | KKR | Kolkata |
| Lucknow Super Giants | LSG | Lucknow |
| Mumbai Indians | MI | Mumbai |
| Punjab Kings | PBKS | Mohali |
| Rajasthan Royals | RR | Jaipur |
| Royal Challengers Bengaluru | RCB | Bengaluru |
| Sunrisers Hyderabad | SRH | Hyderabad |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Start the Server

```bash
cd server
npm install
npm run dev
```

Server runs on **http://localhost:3001**

### 2. Start the Client

```bash
cd client
npm install
npm run dev
```

Client runs on **http://localhost:5173**

### 3. Play!

1. Open the client in your browser
2. Click **CREATE AUCTION** → pick your IPL team → share room code
3. Friends open same URL → **JOIN AUCTION** → enter room code
4. Host clicks **START AUCTION**
5. Bid on players in real-time!
6. After auction → build your XI → simulate T20 matches
7. See who wins! 🏆

---

## 🏗️ Project Structure

```
CricketAuction26/
├── client/              # React + TypeScript + Tailwind frontend
│   └── src/
│       ├── pages/       # All game screens
│       ├── components/  # Reusable UI
│       ├── hooks/       # Custom React hooks
│       ├── store/       # Zustand state management
│       ├── types/       # TypeScript types
│       └── utils/       # Helpers
└── server/              # Node.js + Express + Socket.io backend
    └── src/
        ├── data/        # Player & team database
        ├── engine/      # Auction engine, T20 sim, team rating
        ├── ai/          # AI team logic
        ├── socket/      # Socket.io event handlers
        └── types/       # TypeScript types
```

---

## 💰 Point System

| Tier | Players | Base Price |
|---|---|---|
| S | Superstar (Bumrah, Kohli...) | 200 pts |
| A | Top International | 150 pts |
| B | Established | 100 pts |
| C | Emerging | 50 pts |
| D | Budget | 25 pts |

Starting purse: **1000 points** per team

---

## 🤖 AI Personalities

- **Aggressive** — bids heavily on S/A tier stars
- **Balanced** — even spend across all roles
- **Budget** — fills squad cheaply
- **Bowling Specialist** — targets bowlers
- **Batting Specialist** — targets batters

---

## 📱 Mobile

Fully responsive — works on Android, iPhone, tablet, desktop.

---

## 🛡️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| State | Zustand |
| Animations | Framer Motion |
| Real-time | Socket.io |
| Backend | Node.js + Express |
| Data | In-memory (no external DB needed) |

---

*Made for IPL fans. 2026 edition. 🏏*
