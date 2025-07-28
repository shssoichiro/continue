import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CompactSizeSkeletonLoader,
  SizeSkeletonLoader,
  SkeletonLoader,
} from "./SkeletonLoader";

describe("SkeletonLoader", () => {
  describe("SkeletonLoader", () => {
    it("should render with default props", () => {
      const { container } = render(<SkeletonLoader />);
      const loader = container.firstChild as HTMLElement;

      expect(loader).toBeInTheDocument();
      expect(loader).toHaveClass("bg-gray-200", "rounded-sm", "animate-pulse");
      expect(loader).toHaveStyle({
        width: "80px",
        height: "12px",
        opacity: "0.6",
      });
    });

    it("should apply custom dimensions", () => {
      const { container } = render(
        <SkeletonLoader width="100px" height="20px" />,
      );
      const loader = container.firstChild as HTMLElement;

      expect(loader).toHaveStyle({
        width: "100px",
        height: "20px",
      });
    });

    it("should apply custom className", () => {
      const { container } = render(<SkeletonLoader className="custom-class" />);
      const loader = container.firstChild as HTMLElement;

      expect(loader).toHaveClass("custom-class");
    });

    it("should disable animation when animate is false", () => {
      const { container } = render(<SkeletonLoader animate={false} />);
      const loader = container.firstChild as HTMLElement;

      expect(loader).not.toHaveClass("animate-pulse");
      expect(loader).toHaveClass("bg-gray-200", "rounded-sm");
    });

    it("should have proper accessibility attributes", () => {
      const { container } = render(<SkeletonLoader />);
      const loader = container.firstChild as HTMLElement;

      expect(loader).toHaveAttribute("role", "progressbar");
      expect(loader).toHaveAttribute("aria-label", "Loading size information");
    });
  });

  describe("SizeSkeletonLoader", () => {
    it("should render with proper structure", () => {
      const { container } = render(<SizeSkeletonLoader />);

      // Should have main container
      const container_div = container.firstChild as HTMLElement;
      expect(container_div).toHaveClass("flex", "items-center", "gap-1");

      // Should have two skeleton loaders and a comma
      const skeletonElements = container.querySelectorAll(
        '[role="progressbar"]',
      );
      expect(skeletonElements).toHaveLength(2);

      // Check for comma separator
      const comma = container.querySelector('span[aria-hidden="true"]');
      expect(comma).toBeInTheDocument();
      expect(comma).toHaveTextContent(",");
    });

    it("should apply custom className to container", () => {
      const { container } = render(
        <SizeSkeletonLoader className="custom-size-class" />,
      );
      const containerDiv = container.firstChild as HTMLElement;

      expect(containerDiv).toHaveClass("custom-size-class");
    });

    it("should have correct skeleton dimensions", () => {
      const { container } = render(<SizeSkeletonLoader />);
      const skeletons = container.querySelectorAll('[role="progressbar"]');

      // First skeleton (for size)
      expect(skeletons[0]).toHaveStyle({
        width: "35px",
        height: "10px",
      });

      // Second skeleton (for count)
      expect(skeletons[1]).toHaveStyle({
        width: "40px",
        height: "10px",
      });
    });
  });

  describe("CompactSizeSkeletonLoader", () => {
    it("should render with compact dimensions", () => {
      const { container } = render(<CompactSizeSkeletonLoader />);
      const loader = container.firstChild as HTMLElement;

      expect(loader).toBeInTheDocument();
      expect(loader).toHaveStyle({
        width: "70px",
        height: "10px",
      });
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CompactSizeSkeletonLoader className="compact-custom" />,
      );
      const loader = container.firstChild as HTMLElement;

      expect(loader).toHaveClass("compact-custom");
    });

    it("should have proper accessibility attributes", () => {
      const { container } = render(<CompactSizeSkeletonLoader />);
      const loader = container.firstChild as HTMLElement;

      expect(loader).toHaveAttribute("role", "progressbar");
      expect(loader).toHaveAttribute("aria-label", "Loading size information");
    });
  });

  describe("responsive behavior", () => {
    it("should maintain structure with different screen sizes", () => {
      // This is a basic test - in a real scenario you might want to test
      // with different viewport sizes using testing utilities
      const { container, rerender } = render(<SizeSkeletonLoader />);

      expect(container.firstChild).toHaveClass("flex", "items-center");

      // Rerender with different class to simulate responsiveness
      rerender(<SizeSkeletonLoader className="lg:flex-col" />);
      expect(container.firstChild).toHaveClass("lg:flex-col");
    });
  });
});
