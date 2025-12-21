import { forwardRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if ('vibrate' in navigator) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
      case 'success':
        navigator.vibrate([10, 50, 10]);
        break;
      case 'error':
        navigator.vibrate([50, 30, 50]);
        break;
    }
  }
}

interface SafeAreaProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export function SafeArea({ 
  children, 
  className,
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaProps) {
  return (
    <div 
      className={cn("", className)}
      style={{
        paddingTop: top ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: bottom ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: left ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: right ? 'env(safe-area-inset-right)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

interface MobileAppLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  noPadding?: boolean;
}

export function MobileAppLayout({
  children,
  header,
  footer,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
  noPadding = false,
}: MobileAppLayoutProps) {
  return (
    <div className={cn("fixed inset-0 flex flex-col bg-background", className)}>
      {header && (
        <header 
          className={cn(
            "shrink-0 z-30",
            headerClassName
          )}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {header}
        </header>
      )}
      
      <main 
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain",
          !noPadding && "px-4",
          contentClassName
        )}
      >
        {children}
      </main>
      
      {footer && (
        <footer 
          className={cn(
            "shrink-0 z-30",
            footerClassName
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  className,
}: BottomSheetProps) {
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 100) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[90vh] flex flex-col",
              className
            )}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {title && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <h2 className="text-lg font-semibold">{title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-9 w-9 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface HapticButtonProps extends ButtonProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'error';
}

export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticType = 'light', onClick, className, ...props }, ref) => {
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      triggerHaptic(hapticType);
      onClick?.(e);
    }, [hapticType, onClick]);

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={cn("min-h-[44px] min-w-[44px]", className)}
        {...props}
      />
    );
  }
);
HapticButton.displayName = "HapticButton";

interface FloatingActionButtonProps extends ButtonProps {
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

export const FloatingActionButton = forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ position = 'bottom-right', className, ...props }, ref) => {
    const positionClasses = {
      'bottom-right': 'right-4',
      'bottom-center': 'left-1/2 -translate-x-1/2',
      'bottom-left': 'left-4',
    };

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn("fixed z-30", positionClasses[position])}
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <HapticButton
          ref={ref}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-gradient-to-br from-primary to-primary/80",
            className
          )}
          hapticType="medium"
          {...props}
        />
      </motion.div>
    );
  }
);
FloatingActionButton.displayName = "FloatingActionButton";

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  transparent = false,
  className,
}: MobileHeaderProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between px-4 py-3 min-h-[56px]",
        !transparent && "bg-background border-b border-border",
        transparent && "bg-transparent",
        className
      )}
    >
      <div className="w-12 flex justify-start">
        {leftAction}
      </div>
      
      <div className="flex-1 text-center">
        {title && (
          <h1 className="font-semibold text-foreground truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      
      <div className="w-12 flex justify-end">
        {rightAction}
      </div>
    </div>
  );
}

interface MobileNavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function MobileNavItem({ icon: Icon, label, active, onClick, badge }: MobileNavItemProps) {
  return (
    <button
      onClick={() => {
        triggerHaptic('light');
        onClick?.();
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[56px] relative transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-xl transition-colors relative",
        active && "bg-primary/10"
      )}>
        <Icon className="h-5 w-5" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

interface MobileBottomBarProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileBottomBar({ children, className }: MobileBottomBarProps) {
  return (
    <div 
      className={cn(
        "bg-card/95 backdrop-blur-xl border-t border-border",
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {children}
      </div>
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}
