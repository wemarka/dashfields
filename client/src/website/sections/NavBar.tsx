/**
 * website/sections/NavBar.tsx — Landing page navigation bar with mobile menu.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/core/components/ui/button";
import { appUrl } from "@/shared/lib/domain";
import { Menu, X, Play } from "lucide-react";
import { LOGO_URL, scrollToId } from "./shared";

export function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    scrollToId(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <img src={LOGO_URL} alt="DashFields" className="h-8 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo("features")} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Features</button>
            <button onClick={() => scrollTo("pricing")} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Pricing</button>
            <button onClick={() => scrollTo("platforms")} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Integrations</button>
            <a href="/blog" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Blog</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a href={appUrl("/demo")} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors">
              <Play className="w-3.5 h-3.5" />
              Live Demo
            </a>
            <a href={appUrl("/login")}>
              <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600">Sign In</Button>
            </a>
            <a href={appUrl("/register")}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200">Start Free Trial</Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-4 space-y-3">
          <button onClick={() => scrollTo("features")} className="block w-full text-left text-sm font-medium text-gray-700 py-2">Features</button>
          <button onClick={() => scrollTo("pricing")} className="block w-full text-left text-sm font-medium text-gray-700 py-2">Pricing</button>
          <button onClick={() => scrollTo("platforms")} className="block w-full text-left text-sm font-medium text-gray-700 py-2">Integrations</button>
          <a href="/blog" className="block w-full text-left text-sm font-medium text-gray-700 py-2">Blog</a>
          <div className="flex flex-col gap-2 pt-2">
            <a href={appUrl("/demo")} className="w-full">
              <Button variant="outline" size="sm" className="w-full border-blue-200 text-blue-700">
                <Play className="w-3.5 h-3.5 mr-1.5" />Try Interactive Demo
              </Button>
            </a>
            <div className="flex gap-3">
              <a href={appUrl("/login")} className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign In</Button></a>
              <a href={appUrl("/register")} className="flex-1"><Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Start Free Trial</Button></a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
