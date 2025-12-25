import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Menu, DollarSign, Users, BarChart3, Podcast, TrendingUp, ShoppingBag, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {/* Creator Tools Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Creator Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-white/10">
                  <DropdownMenuLabel className="text-gray-400">Money Making</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/creator-subscriptions">
                      <a className="w-full">Subscriptions (70/30)</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/vault-live">
                      <a className="w-full">VaultLive (85/15)</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/podcast-studio">
                      <a className="w-full flex items-center gap-2">
                        <Podcast className="h-4 w-4" />
                        Podcast Studio
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/creator-earnings">
                      <a className="w-full flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        My Earnings
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-gray-400">Growth Tools</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/social-audit">
                      <a className="w-full">Social Media Audit</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/performance-insights">
                      <a className="w-full flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Performance Insights
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/creator-toolbox">
                      <a className="w-full">Content Tools</a>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Marketplace */}
            <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white">
              <Link href="/marketplace">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Marketplace
              </Link>
            </Button>

            {/* University */}
            <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white">
              <Link href="/university">
                <GraduationCap className="h-4 w-4 mr-2" />
                University
              </Link>
            </Button>

            {/* Emma Network / Recruiter */}
            {user && (
              <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white">
                <Link href="/recruiter">
                  <Users className="h-4 w-4 mr-2" />
                  Emma Network
                </Link>
              </Button>
            )}

            {/* Admin Menu */}
            {isOwnerOrAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-purple-500/20">
                  <DropdownMenuLabel className="text-purple-400">Money Management</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/payouts">
                      <a className="w-full">Approve Payouts</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/manual-payments">
                      <a className="w-full">Confirm Payments</a>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-purple-400">System</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/owner-status">
                      <a className="w-full">Owner Status</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/king">
                      <a className="w-full">King Dashboard</a>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Mobile Menu */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-slate-900 border-white/10 max-h-[80vh] overflow-y-auto">
                {user && (
                  <>
                    <DropdownMenuLabel className="text-gray-400">Money Making</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/creator-subscriptions">
                        <a className="w-full">Subscriptions (70/30)</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/vault-live">
                        <a className="w-full">VaultLive (85/15)</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/podcast-studio">
                        <a className="w-full">Podcast Studio</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/creator-earnings">
                        <a className="w-full">My Earnings</a>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuLabel className="text-gray-400">Growth Tools</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/social-audit">
                        <a className="w-full">Social Media Audit</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/performance-insights">
                        <a className="w-full">Performance Insights</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/creator-toolbox">
                        <a className="w-full">Content Tools</a>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuLabel className="text-gray-400">Marketplace & Learning</DropdownMenuLabel>
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
                    
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuLabel className="text-gray-400">Emma Network</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/recruiter">
                        <a className="w-full">Recruiter Dashboard</a>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                {isOwnerOrAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-purple-500/20" />
                    <DropdownMenuLabel className="text-purple-400">Admin</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/payouts">
                        <a className="w-full">Approve Payouts</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/manual-payments">
                        <a className="w-full">Confirm Payments</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/owner-status">
                        <a className="w-full">Owner Status</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/king">
                        <a className="w-full">King Dashboard</a>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
