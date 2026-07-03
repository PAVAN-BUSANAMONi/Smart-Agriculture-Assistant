import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export const CustomCursor = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Smooth spring physics for the cursor
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const dotXSpring = useSpring(cursorX, { damping: 40, stiffness: 1000 });
  const dotYSpring = useSpring(cursorY, { damping: 40, stiffness: 1000 });

  useEffect(() => {
    // Only show custom cursor on devices with a mouse (pointer: fine)
    const mediaQuery = window.matchMedia("(pointer: fine)");
    setIsPointer(mediaQuery.matches);

    if (!mediaQuery.matches) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if hovering over clickable elements
      if (
        window.getComputedStyle(target).cursor === "pointer" ||
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") ||
        target.closest("a")
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [cursorX, cursorY, isVisible]);

  if (!isPointer) return null;

  return (
    <>
      {/* Small center dot (instant tracking) */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-[#4eb69c] rounded-full pointer-events-none z-[9999] mix-blend-difference shadow-[0_0_10px_rgba(78,182,156,0.8)]"
        style={{
          x: dotXSpring,
          y: dotYSpring,
          translateX: "-50%",
          translateY: "-50%",
          opacity: isVisible ? 1 : 0,
          scale: isHovered ? 0 : 1,
        }}
      />
      
      {/* Outer trailing ring */}
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 border-2 border-[#4eb69c]/60 rounded-full pointer-events-none z-[9998]"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: "-50%",
          translateY: "-50%",
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          scale: isHovered ? 1.8 : 1,
          backgroundColor: isHovered ? "rgba(78, 182, 156, 0.15)" : "transparent",
          borderColor: isHovered ? "rgba(78, 182, 156, 0)" : "rgba(78, 182, 156, 0.6)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
    </>
  );
};
