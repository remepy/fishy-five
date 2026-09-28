import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <title>Where&apos;s Fishy?</title>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background-color: #011627;
            overflow: hidden;
            direction: ltr;
          }
          #root {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100vh;
            height: 100dvh;
            padding-bottom: env(safe-area-inset-bottom);
            box-sizing: border-box;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
