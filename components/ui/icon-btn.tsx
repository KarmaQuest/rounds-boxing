import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icône ou élément visuel au centre */
  children: React.ReactNode;
}

/**
 * Bouton icône 44×44 partagé (navbar burger, theme toggle, etc.).
 * Utilise la utility `icon-btn` définie dans globals.css.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("press icon-btn", className)}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";
