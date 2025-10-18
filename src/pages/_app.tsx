import "../styles/globals.css";
import Head from "next/head";
import Script from "next/script";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase";
import { AppStateProvider } from "@/providers/app-state";
import { TaskInitializer } from "@/features/tasks/task-initializer";

const AUTH_PAGES = ["/login", "/signup", "/reset-password"];

const handleAuthSession = async (event: string, session: Session | null) => {
  await fetch("/api/auth", {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify({ event, session }),
  });
};

const MyApp = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const user = supabaseClient.auth.user();
  const [mounted, setMounted] = useState(false);
  const isAuthPage = AUTH_PAGES.includes(router.pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        await handleAuthSession(event, session);

        if (event === "SIGNED_IN") {
          const signedInUser = supabaseClient.auth.user();
          const userId = signedInUser?.id;

          if (userId) {
            const { error } = await supabaseClient.from("profiles").upsert({ id: userId });
            if (!error) {
              router.push("/");
            }
          }
        }

        if (event === "SIGNED_OUT") {
          router.push("/login");
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (user && AUTH_PAGES.includes(router.pathname)) {
      router.push("/");
    }
  }, [router.pathname, user, router]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Script src="https://www.googletagmanager.com/gtag/js?id=G-M8C4B8XCM8" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-M8C4B8XCM8');
        `}
      </Script>

      <AppStateProvider>
        {mounted ? (
          isAuthPage ? (
            <Component {...pageProps} />
          ) : (
            <TaskInitializer>
              <Component {...pageProps} />
            </TaskInitializer>
          )
        ) : null}
      </AppStateProvider>
    </>
  );
};

export default MyApp;
