import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Settings } from 'lucide-react';

interface HeaderProps {
  showAdminLink?: boolean;
}

export function Header({ showAdminLink = true }: HeaderProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <Link href="/">
            <h1
              data-testid="site-title"
              className="font-display text-3xl gradient-text hover:opacity-80 transition-opacity cursor-pointer"
            >
              PennQuinn.com
            </h1>
          </Link>
          <p className="text-muted-foreground mt-1">for all your Penn and Quinn needs</p>
        </div>
        
        <nav className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated ? (
            <>
              {showAdminLink && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" data-testid="admin-link">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                data-testid="logout-button"
                onClick={() => logout()}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button
                size="sm"
                data-testid="login-button"
                className="hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Log in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
