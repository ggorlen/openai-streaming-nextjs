import {marked} from "marked";
import Head from "next/head";
import {useState} from "react";
import styles from "./index.module.css";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [requestActive, setRequestActive] = useState(false);

  const onSubmit = async event => {
    event.preventDefault();

    try {
      setRequestActive(true);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({input}),
      });

      if (!response.ok) {
        console.error(response.statusText);
        throw Error(response.statusText);
      }

      setResponse("");

      for (const reader = response.body.getReader(); ; ) {
        const {value, done} = await reader.read();

        if (done) {
          break;
        }

        const chunk = new TextDecoder().decode(value);
        const subChunks = chunk.split(/(?<=})\n\ndata: (?={)/);

        for (const subChunk of subChunks) {
          const payload = subChunk.replace(/^data: /, "");
          const {chunk} = JSON.parse(payload);

          if (chunk) {
            setResponse(prev => prev + chunk);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRequestActive(false);
    }
  };

  return (
    <div>
      <Head>
        <title>OpenAI Streaming</title>
      </Head>
      <main className={styles.main}>
        <h1>OpenAI Streaming</h1>
        <form onSubmit={onSubmit}>
          <div>
            <textarea
              name="input"
              placeholder="Ask a question"
              value={input}
              onChange={e => setInput(e.target.value)}
            ></textarea>
          </div>
          <input
            type="submit"
            value="Submit"
            disabled={requestActive}
          />
        </form>
        <div
          className={styles.response}
          dangerouslySetInnerHTML={{
            __html: marked.parse(response, {
              mangle: false,
              headerIds: false,
            }),
          }}
        ></div>
      </main>
    </div>
  );
}
