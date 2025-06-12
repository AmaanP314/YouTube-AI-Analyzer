import { AnalysisProvider } from "../context/AnalysisContext";
import "@/styles/globals.css";
import Head from "next/head";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Analyze YouTube</title>
        <meta
          name="description"
          content="Analyze YouTube videos with AI, provide video and comment summaries, perform QA regarding the content of the video and comments, perform sentiment analysis on video comments and much more."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AnalysisProvider>
        <Component {...pageProps} />
      </AnalysisProvider>
    </>
  );
}

export default MyApp;
