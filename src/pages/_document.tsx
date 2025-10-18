import Document, { Html, Head, Main, NextScript } from "next/document";

const themeInitializer = `(() => {
  try {
    const storageKey = 'offtasks-theme';
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
      return;
    }
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    console.error('Failed to set theme', error);
  }
})();`;

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
