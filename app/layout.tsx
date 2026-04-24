import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google AI Studio Exporter",
  description:
    "Export Google AI Studio conversations to Markdown, XML, or HTML — ready to paste into any chatbot or agent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-gray-50 text-gray-900"
      >
        {children}
      </body>
    </html>
  );
}
