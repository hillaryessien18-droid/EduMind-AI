import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Course } from "../../lib/types";
import CourseCard from "./CourseCard";

const course: Course = {
  id: 1, title: "Introduction to UI/UX Design", slug: "intro", description: "",
  category: { id: 1, name: "Design", slug: "design", color: "orange" },
  instructor: { id: 2, display_name: "Tony Stark" }, thumbnail: null, level: "beginner",
  status: "published", price: "50.00", original_price: "100.00", discount_percent: 50,
  lesson_count: 6, student_count: 3, is_enrolled: false, created_at: "2026-11-18T00:00:00Z",
};

describe("CourseCard", () => {
  it("shows title, author, discount and price", () => {
    render(<MemoryRouter><CourseCard course={course} actions={[]} /></MemoryRouter>);
    expect(screen.getByText("Introduction to UI/UX Design")).toBeInTheDocument();
    expect(screen.getByText("Tony Stark")).toBeInTheDocument();
    expect(screen.getByText("50% off")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute("href", "/courses/1");
  });
});
