import "@/styles/globals.css";
import Head from "next/head";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Analyse YouTube</title>
        <meta
          name="description"
          content="Analyse YouTube videos with AI, provide video and comment summaries, perform QA regarding the content of the video and comments, perform sentiment analysis on video comments and much more."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
