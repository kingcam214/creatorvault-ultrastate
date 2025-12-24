import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppHeader() {
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === "king" || user?.role === "admin";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="/logo-white.png" 
                alt="CreatorVault" 
                className="h-10 w-auto"
              />
            </a>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/marketplace">
              <a className="text-gray-300 hover:text-white transition-colors">
                Marketplace
              </a>
            </Link>
            <Link href="/university">
              <a className="text-gray-300 hover:text-white transition-colors">
                University
              </a>
            </Link>
            <Link href="/services">
              <a className="text-gray-300 hover:text-white transition-colors">
                Services
              </a>
            </Link>
            {user && (
              <>
                <Link href="/creator">
                  <a className="text-gray-300 hover:text-white transition-colors">
                    Creator Dashboard
                  </a>
                </Link>
                <Link href="/ai-bot">
                  <a className="text-gray-300 hover:text-white transition-colors">
                    AI Assistant
                  </a>
                </Link>
                <Link href="/command-hub">
                  <a className="text-gray-300 hover:text-white transition-colors">
                    Command Hub
                  </a>
                </Link>
              </>
            )}
          </nav>

          {/* Owner Control + Mobile Menu */}
          <div className="flex items-center gap-4">
            {isOwnerOrAdmin && (
              <Button
                asChild
                size="sm"
                className="hidden md:flex bg-gradient-to-r from-slate-700 to-purple-700 text-white hover:from-slate-800 hover:to-purple-800 border border-purple-500"
              >
                <Link href="/owner-status">
                  <Shield className="h-4 w-4 mr-2" />
                  Owner Status
                </Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10">
                <DropdownMenuItem asChild>
                  <Link href="/marketplace">
                    <a className="w-full">Marketplace</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/university">
                    <a className="w-full">University</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/services">
                    <a className="w-full">Services</a>
                  </Link>
                </DropdownMenuItem>
                {user && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/creator">
                        <a className="w-full">Creator Dashboard</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/ai-bot">
                        <a className="w-full">AI Assistant</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/command-hub">
                        <a className="w-full">Command Hub</a>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isOwnerOrAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/owner-status">
                      <a className="w-full flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Owner Status
                      </a>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
