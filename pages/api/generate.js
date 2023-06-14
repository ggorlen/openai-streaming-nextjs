import {Configuration, OpenAIApi} from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function (req, res) {
  if (!configuration.apiKey) {
    // TODO convert to stream
    return res.status(500).json({
      error: {
        message:
          "OpenAI API key not configured, please follow instructions in README.md",
      },
    });
  }

  const input = req.body.input || "";

  if (input.trim().length === 0) {
    return res.status(400).json({
      error: {
        message: "Please enter a valid input",
      },
    });
  }

  try {
    const completion = await openai.createCompletion(
      {
        model: "text-davinci-003",
        prompt: input,
        max_tokens: 1000,
        temperature: 0.9,
        stream: true,
      },
      {
        responseType: "stream",
      }
    );

    res.writeHead(200, {
      "Connection": "keep-alive",
      "Content-Encoding": "none",
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
    });

    let finalMessage = "";

    completion.data.on("end", data => {
      console.log(finalMessage);
      res.end();
    });
    completion.data.on("data", data => {
      const chunks = data
        .toString()
        .split(/\n\n/)
        .filter(Boolean);

      for (const chunk of chunks) {
        const message = chunk.replace(/^data: /, "");

        if (message === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(message);
          const text = parsed.choices[0].text;
          finalMessage += text;
          res.write(
            `data: ${JSON.stringify({chunk: text})}\n\n`
          );
        } catch (error) {
          console.error(
            "Could not JSON parse stream message",
            message,
            error
          );
        }
      }
    });
  } catch (error) {
    if (error.response?.status) {
      console.error(error.response.status, error.message);
      error.response.data.on("data", data => {
        const message = data.toString();

        try {
          const parsed = JSON.parse(message);
          console.error(
            "An error occurred during OpenAI request: ",
            parsed
          );
        } catch (error) {
          console.error(
            "An error occurred during OpenAI request: ",
            message
          );
        }
      });
    } else {
      console.error(
        "An error occurred during OpenAI request",
        error
      );
    }

    //res.end();
  }
}
/*
} catch(error) {
  // Consider adjusting the error handling logic for your use case
  if (error.response) {
    console.error(error.response.status, error.response.data);
    res.status(error.response.status).json(error.response.data);
  } else {
    console.error(`Error with OpenAI API request: ${error.message}`);
    res.status(500).json({
      error: {
        message: "An error occurred during your request.",
      }
    });
  }
}
*/

