"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const authRoutes = ["/login", "/signup", "/(auth)/login", "/(auth)/signup"];

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        if (!authRoutes.includes(pathname)) {
          router.replace("/login");
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[#a259e6]">
        Checking authentication...
      </div>
    );
  }

  // Allow access to auth pages without being logged in
  if (authRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // If authenticated, show children; otherwise, null (redirect handled)
  return isAuthenticated ? <>{children}</> : null;
}
