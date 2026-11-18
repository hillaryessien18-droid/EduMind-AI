export type Role = "student" | "tutor" | "admin";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: Role;
  avatar: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  course_count?: number;
}

export interface Instructor {
  id: number;
  display_name: string;
}

export interface Lesson {
  id: number;
  module: number;
  title: string;
  content: string;
  estimated_minutes: number;
  order: number;
  completed: boolean;
}

export interface Module {
  id: number;
  course: number;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: Category | null;
  instructor: Instructor;
  thumbnail: string | null;
  level: "beginner" | "intermediate" | "advanced";
  status: "draft" | "published";
  price: string;
  original_price: string | null;
  discount_percent: number;
  lesson_count: number;
  student_count: number;
  is_enrolled: boolean;
  created_at: string;
  modules?: Module[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ChatMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  follow_ups: string[];
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  subject: string;
  socratic_mode: boolean;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface Dashboard {
  user: { display_name: string; role: Role };
  stats: {
    enrolled_courses: number;
    completed_lessons: number;
    learning_minutes: number;
    lessons_this_week: number;
    streak_days: number;
    quiz_average: number | null;
    quizzes_taken: number;
  };
  courses: { id: number; title: string; completed_lessons: number; total_lessons: number; percent: number }[];
  weekly_activity: { date: string; minutes: number }[];
  recent_conversations: { id: number; title: string; updated_at: string }[];
}
