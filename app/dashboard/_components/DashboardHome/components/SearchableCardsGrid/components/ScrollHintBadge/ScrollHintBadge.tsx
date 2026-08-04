import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function ScrollHintBadge() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center md:flex">
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
    </div>
  );
}
