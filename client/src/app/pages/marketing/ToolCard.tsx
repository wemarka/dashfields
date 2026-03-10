import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  gradient: string;
  iconColor: string;
  borderColor: string;
}

export function ToolCard({ icon: Icon, title, description, href, gradient, iconColor, borderColor }: Props) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(href)}
      className={[
        "group relative flex flex-col gap-4 p-6 rounded-2xl border bg-gradient-to-br text-left",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 w-full",
        gradient, borderColor,
      ].join(" ")}
    >
      <div className={["w-12 h-12 rounded-xl flex items-center justify-center bg-white/80 shadow-sm", iconColor].join(" ")}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-base mb-1">{title}</p>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
