"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  FileText,
  Package,
  Users,
  Settings,
  Building2,
  Sparkles,
  ChevronDown,
  Plus,
  ClipboardList,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useBusiness } from "@/lib/business-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Launch Center", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/leads", label: "Pipeline", icon: TrendingUp },
  { href: "/quotes", label: "Quotes", icon: ClipboardList },
  { href: "/financials", label: "Financials", icon: FileText },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentBusiness, businesses, setCurrentBusiness } = useBusiness();

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col border-r border-gray-800">
      {/* Business Switcher */}
      <div className="p-4 border-b border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate">
                  {currentBusiness?.name ?? "Add Business"}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {currentBusiness?.type ?? "No business yet"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 ml-4" align="start">
            <DropdownMenuLabel>Your Businesses</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {businesses.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => setCurrentBusiness(b)}
                className={cn(currentBusiness?.id === b.id && "bg-blue-50 text-blue-700")}
              >
                <Avatar className="w-6 h-6 mr-2">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {getInitials(b.name)}
                  </AvatarFallback>
                </Avatar>
                {b.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/onboarding")}>
              <Plus className="w-4 h-4 mr-2" />
              Add business
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        <div className="pt-3 border-t border-gray-800 mt-3">
          <Link
            href="/ai-insights"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/ai-insights"
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            AI Insights
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">SMB AI v1.0</p>
      </div>
    </aside>
  );
}
