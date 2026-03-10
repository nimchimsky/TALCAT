"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Database,
  LayoutDashboard,
  PlaySquare,
  Users,
} from "lucide-react";

const navigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tests", label: "Proves", icon: PlaySquare },
  { href: "/admin/participants", label: "Participants", icon: Users },
  { href: "/admin/sessions", label: "Sessions", icon: Activity },
  { href: "/admin/results", label: "Resultats", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="card-surface sticky top-6 space-y-8 p-6">
          <div className="space-y-3">
            <p className="eyebrow">TALCAT - recerca</p>
            <div className="space-y-2">
              <h1 className="font-display text-3xl leading-tight text-slate-950">
                Espai d&apos;investigacio
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                Seguiment de formes, sessions, participants i qualitat de les
                respostes.
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-3xl bg-slate-950 px-5 py-5 text-sm text-white">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <Database className="h-4 w-4" />
              Seguiment intern
            </div>
            <p className="leading-6 text-slate-200">
              Aquest acces es reserva per a l&apos;equip investigador i la
              coordinacio de camp.
            </p>
          </div>
        </div>
      </aside>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : "bg-white/80 text-slate-600"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
