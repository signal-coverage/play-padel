import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export function ScrollHintBadge({ className }: { className?: string }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 hidden h-16 bg-linear-to-t from-primary/20 to-transparent md:block",
          className,
        )}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.85 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center md:flex",
          className,
        )}
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </>
  );
}
