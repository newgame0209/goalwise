import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isLoggedIn = !!user;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Define navigation items based on auth state
  const navItems = isLoggedIn 
    ? [
        { name: 'ホーム', path: '/' },
        { name: 'ダッシュボード', path: '/dashboard' },
        { name: '教材一覧', path: '/materials' },
        { name: '教材サンプル', path: '/material-samples' },
      ]
    : [
        { name: 'ホーム', path: '/' },
        { name: '教材サンプル', path: '/material-samples' },
      ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out w-full ${
        isScrolled ? 'py-3 glass shadow-subtle' : 'py-5 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex items-center justify-between">
        {/* Logo - Add margin-right for spacing */}
        <NavLink to="/" className="relative z-10 flex items-center mr-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1 rounded-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">goalwise</span>
          </div>
        </NavLink>

        {/* Desktop Nav - Ensure enough space, potentially reduce space-x if needed */}
        <nav className="hidden md:flex flex-1 items-center space-x-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `font-medium transition-colors hover:text-primary whitespace-nowrap ${
                  isActive ? 'text-primary' : 'text-foreground/80'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Auth Buttons / User Menu - Ensure it doesn't overlap */}
        <div className="hidden md:flex items-center space-x-2">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 animate-scale-in">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>プロフィール</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <NavLink to="/login">ログイン</NavLink>
              </Button>
              <Button asChild className="button-hover whitespace-nowrap">
                <NavLink to="/signup">無料で始める</NavLink>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="relative z-10 md:hidden"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 transition-all" />
          ) : (
            <Menu className="h-6 w-6 transition-all" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-0 glass transform transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-full flex flex-col pt-24 pb-8">
          <nav className="flex flex-col space-y-6 text-lg">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-foreground/80'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col space-y-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4 p-4 glass rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80" />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.email}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive px-0"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    ログアウト
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button variant="outline" asChild className="w-full">
                  <NavLink to="/login">ログイン</NavLink>
                </Button>
                <Button asChild className="w-full button-hover">
                  <NavLink to="/signup">無料で始める</NavLink>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
