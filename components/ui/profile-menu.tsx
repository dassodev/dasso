"use client"

import * as React from "react"
import {
  CreditCard,
  LogOut,
  Settings,
  User,
  ChevronLeft,
  MessageSquare,
  Info,
  ChevronRight
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface ProfileMenuProps {
  onClose: () => void
}

export function ProfileMenu({ onClose }: ProfileMenuProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/auth')
      onClose()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 animate-in slide-in-from-left duration-300">
      <div className="flex flex-col h-full w-full md:max-w-none bg-background">
        {/* Header */}
        <div className="py-3 px-4 md:py-4 md:px-6 border-b border-border/40">
          <div className="flex items-center max-w-screen-2xl mx-auto w-full">
            <button 
              onClick={onClose} 
              className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors duration-200"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="ml-3 text-lg font-medium">Profile</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto w-full">
            {/* Profile Info */}
            <div className="px-6 py-8 md:py-10 border-b border-border/40 bg-gradient-to-b from-accent/50">
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-2 ring-border ring-offset-2 ring-offset-background">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder-avatar.png"} alt="Profile picture" />
                  <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || "DS"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 pt-2">
                  <h1 className="text-2xl md:text-3xl font-bold truncate">
                    {user?.user_metadata?.full_name || "User"}
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base truncate mt-1">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items Container */}
            <div className="p-4 md:p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Main Menu Items */}
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground px-3 mb-1">Account Settings</h2>
                  <MenuButton 
                    icon={User} 
                    label="User Account" 
                    description="Manage your account details"
                  />
                  <MenuButton 
                    icon={CreditCard} 
                    label="Subscription" 
                    description="View and manage subscription"
                  />
                  <MenuButton 
                    icon={Settings} 
                    label="Settings" 
                    description="App preferences and settings"
                  />
                </div>

                <div className="border-t border-border/40" />

                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground px-3 mb-1">Support</h2>
                  <MenuButton 
                    icon={MessageSquare} 
                    label="Contact Us" 
                    description="Get help and support"
                  />
                  <MenuButton 
                    icon={Info} 
                    label="About Us" 
                    description="Learn more about DassoShu"
                  />
                </div>

                <div className="pt-4 md:pt-6">
                  <MenuButton 
                    icon={LogOut} 
                    label="Logout" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-border/40"
                    onClick={handleLogout}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MenuButtonProps {
  icon: React.ElementType
  label: string
  description?: string
  className?: string
  onClick?: () => void
}

function MenuButton({ icon: Icon, label, description, className, onClick }: MenuButtonProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center justify-between p-3 md:p-4 hover:bg-accent rounded-lg transition-all duration-200",
        "group relative",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 md:p-2.5 rounded-full bg-accent/50 group-hover:bg-accent">
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <div className="text-left">
          <div className="font-medium text-base md:text-lg">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>
      </div>
      {!className?.includes('text-red') && (
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
    </button>
  )
} 