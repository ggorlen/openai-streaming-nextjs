import OpenAI from "openai";

const openai = new OpenAI();

export default async function (req, res) {
  // TODO keep message history
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{role: "user", content: req.body.input || ""}],
      max_tokens: 1000,
      temperature: 0.9,
      stream: true,
    });
    
    res.writeHead(200, {
      "Connection": "keep-alive",
      "Content-Encoding": "none",
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
    });
    
    let aborted = false;
    res.on("close", () => {
      aborted = true;
      res.end();
    });

    for await (const chunk of completion) {
      if (aborted) {
        break;
      }

      const { content } = chunk.choices[0].delta;
      const data = JSON.stringify({ chunk: content });
      res.write(`data: ${data}\n\n`);
    }
    
    res.end();
  } catch (err) {
    console.error(err);
    res.json({error: err.message});
  }
}
