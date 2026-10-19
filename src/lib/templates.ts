import {
  ShoppingCart, Briefcase, LayoutDashboard, PenSquare, Rocket, GraduationCap, Utensils, Bot,
  Gamepad2, Car, Box, Users, CircleDot, Puzzle, type LucideIcon,
} from "lucide-react";

export type Template = { id: string; title: string; blurb: string; icon: LucideIcon; prompt: string };

export const TEMPLATES: Template[] = [
  { id: "ecommerce", title: "E-commerce Store", blurb: "Online store with cart", icon: ShoppingCart,
    prompt: "A modern e-commerce store for premium electronics: hero, product grid with category filters and search, product detail modal, working shopping cart with quantity controls and totals saved to localStorage, and a checkout form." },
  { id: "portfolio", title: "Portfolio Website", blurb: "Showcase your work", icon: Briefcase,
    prompt: "A personal portfolio for a product designer: bold hero, filterable project gallery, about section with skills, testimonials and a validated contact form." },
  { id: "dashboard", title: "Analytics Dashboard", blurb: "Charts & management", icon: LayoutDashboard,
    prompt: "A SaaS analytics dashboard with sidebar navigation, KPI cards, line and bar charts drawn with canvas or SVG, a sortable/searchable data table, and dark mode toggle." },
  { id: "blog", title: "Blog Website", blurb: "Content & blogging", icon: PenSquare,
    prompt: "A minimalist blog with article list, tag filtering, search, reading view, and a simple editor that saves new posts to localStorage." },
  { id: "saas", title: "SaaS Landing", blurb: "Product launch page", icon: Rocket,
    prompt: "A SaaS landing page for an AI note-taking app: hero with CTA, features grid, pricing table with monthly/yearly toggle, FAQ accordion and footer." },
  { id: "education", title: "Educational Platform", blurb: "Courses & lessons", icon: GraduationCap,
    prompt: "An online learning platform: course catalog with filters, course detail with lesson list, progress tracking saved in localStorage, and a quiz with scoring." },
  { id: "restaurant", title: "Restaurant Site", blurb: "Menu & reservations", icon: Utensils,
    prompt: "A restaurant website with hero, tabbed menu with prices, gallery, opening hours and a table reservation form with validation." },
  { id: "chat", title: "AI Chat App UI", blurb: "Chat interface", icon: Bot,
    prompt: "A chat app interface with conversation list sidebar, message thread, composer with typing indicator, and simulated bot replies; conversations saved to localStorage." },
];

export const GAME_TEMPLATES: Template[] = [
  { id: "runner", title: "2D Endless Runner", blurb: "Offline · jump, coins, speed-up", icon: Gamepad2,
    prompt: "A smooth 60fps 2D endless runner game on canvas: player jumps over obstacles, collects coins, speed increases over time, parallax background, Web Audio sound effects, keyboard and touch controls, start/pause/game-over screens and high score saved locally." },
  { id: "racing", title: "Top-down Car Racing", blurb: "Offline · lanes, traffic, nitro", icon: Car,
    prompt: "A top-down car racing game on canvas: switch lanes to dodge traffic, nitro boost, fuel pickups, increasing difficulty, engine sounds with Web Audio, touch buttons for mobile, score and high score." },
  { id: "3d-arena", title: "3D Arena Shooter", blurb: "Offline · Three.js, enemies", icon: Box,
    prompt: "A lightweight 3D arena shooter with Three.js: third-person player moves with WASD / on-screen joystick, aim and shoot at enemies that chase you, health bar, waves that get harder, low-poly style that runs smoothly on phones, score and restart." },
  { id: "pool-online", title: "Online 8-Ball Pool", blurb: "Online · play a friend by room code", icon: CircleDot,
    prompt: "An 8-ball pool game on canvas with realistic ball physics (collisions, friction, pockets), drag to aim and set power. Online multiplayer with PeerJS: Create room shows a short code, friend joins with the code, turns sync between both players. Also a same-device 2-player mode." },
  { id: "tictactoe-online", title: "Online Board Game", blurb: "Online · tic-tac-toe & connect-4", icon: Users,
    prompt: "An online multiplayer board game hub with tic-tac-toe and connect-four: Create room / Join room by code using PeerJS, live turn sync, in-game chat, rematch button, plus a vs-computer mode for offline play." },
  { id: "puzzle", title: "Match-3 Puzzle", blurb: "Offline · levels & moves", icon: Puzzle,
    prompt: "A colorful match-3 puzzle game: swap gems with mouse or touch, cascading matches with animations, level goals with limited moves, star rating per level, progress saved locally, Web Audio sound effects." },
];
