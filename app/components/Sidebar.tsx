"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  isAdmin: boolean;
}

export default function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
    { name: "Projetos", href: "/projetos", icon: FolderKanban, adminOnly: false },
    { name: "Tarefas", href: "/tarefas", icon: CheckSquare, adminOnly: false },
    { name: "Reuniões", href: "/reunioes", icon: Calendar, adminOnly: false },
    { name: "Equipe", href: "/equipe", icon: Users, adminOnly: true },
    { name: "Relatórios", href: "/relatorios", icon: BarChart3, adminOnly: true },
  ];

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const handleLogout = async () => {
    setIsOpen(false);

    const data = await signOut({
      redirect: false,
      callbackUrl: "/login",
    });

    router.push(data.url);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-purple-800 p-2 rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6 text-white" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-gray-900 to-black
          border-r border-purple-800/30 shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-purple-800/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <span className="text-xl font-bold text-white">V-Team</span>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 md:hidden"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                    ${isActive
                      ? "bg-purple-600/20 text-purple-300 border-l-4 border-purple-500"
                      : "text-gray-400 hover:bg-purple-800/20 hover:text-purple-200"}
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-purple-800/30">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}