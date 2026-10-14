import { ShoppingCart, Briefcase, LayoutDashboard, PenSquare, Rocket, GraduationCap, Utensils, Bot, type LucideIcon } from "lucide-react";

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
