"use client"

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { cn } from '@/lib/utils'

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
        "border backdrop-blur-sm cursor-pointer",
        resolvedTheme === 'dark'
          ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white"
          : "bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
      )}
      title={`Tema: ${theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}`}
    >
      <span className="relative w-4 h-4">
        <Sun className={cn(
          "absolute inset-0 w-4 h-4 transition-all duration-300",
          theme === 'light' ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
        )} />
        <Moon className={cn(
          "absolute inset-0 w-4 h-4 transition-all duration-300",
          theme === 'dark' ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
        )} />
        <Monitor className={cn(
          "absolute inset-0 w-4 h-4 transition-all duration-300",
          theme === 'system' ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
        )} />
      </span>
      <span className="hidden sm:inline">
        {theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Oscuro' : 'Claro'}
      </span>
    </button>
  )
}
