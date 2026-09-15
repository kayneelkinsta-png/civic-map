import { Link } from "@tanstack/react-router";
import { BarChart3, ListChecks, Map, Plus, User } from "lucide-react";

const items = [
  { to: "/", label: "Map", Icon: Map },
  { to: "/issues", label: "Issues", Icon: ListChecks },
  { to: "/report", label: "Report", Icon: Plus, primary: true },
  { to: "/insights", label: "Insights", Icon: BarChart3 },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon, ...rest }) => {
          const primary = "primary" in rest && rest.primary;
          return (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ "data-active": "true" }}
                className="group flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground data-[active=true]:text-primary"
              >
                {primary ? (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
