import "../styles/globals.css";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabaseClient } from "../backend";
import { ContextProvider } from "../localState";
import Script from "next/script";
import Head from "next/head";
import { ThemeProvider } from "next-themes";
import { useTheme } from "next-themes";
import { Initialization } from "../initialization";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const user = supabaseClient.auth.user();
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  // Avoid theme Hydration Mismatch:
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        handleAuthSession(event, session);
        if (event === "SIGNED_IN") {
          const signedInUser = supabaseClient.auth.user();
          const userId = signedInUser.id;
          supabaseClient
            .from("profiles")
            .upsert({ id: userId })
            .then((_data, error) => {
              if (!error) {
                router.push("/");
              }
            });
        }
        if (event === "SIGNED_OUT") {
          router.push("/login");
        }
      }
    );

    return () => {
      authListener.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (user) {
      if (router.pathname === "/login") {
        router.push("/");
      }
    }
  }, [router.pathname, user, router]);

  const handleAuthSession = async (event, session) => {
    await fetch("/api/auth", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({ event, session }),
    });
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-M8C4B8XCM8"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-M8C4B8XCM8');
        `}
      </Script>

      <ThemeProvider defaultTheme={theme}>
        <ContextProvider>
          {mounted && (
            <Initialization>
              <Component {...pageProps} />
            </Initialization>
          )}
        </ContextProvider>
      </ThemeProvider>
    </>
  );
}

export default MyApp;
