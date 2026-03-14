import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-card !text-foreground !border-border !shadow-lg",
          title: "!text-foreground !font-semibold",
          description: "!text-muted-foreground",
          actionButton:
            "!bg-primary !text-primary-foreground",
          cancelButton:
            "!bg-muted !text-muted-foreground",
          closeButton:
            "!bg-card !border-border !text-muted-foreground hover:!text-foreground",
          success:
            "!border-emerald-500/30 [&>[data-icon]]:!text-emerald-400",
          error:
            "!border-[#ef3735]/30 [&>[data-icon]]:!text-[#f87171]",
          warning:
            "!border-amber-500/30 [&>[data-icon]]:!text-amber-400",
          info:
            "!border-blue-500/30 [&>[data-icon]]:!text-blue-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
