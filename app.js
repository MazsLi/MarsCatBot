require("dotenv").config();

const express = require("express");
const line = require("@line/bot-sdk");
const timeout = require("connect-timeout");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

const TIMEOUTMS = 60 * 1000; // 60 secs
app.use(timeout("60s"));

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post("/callback", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  try {
    // API doc: https://beta.openai.com/docs/api-reference/completions/create?lang=node.js
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: event.message.text,
      temperature: 0.8,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // create a echoing text message
    const echo = { type: "text", text: completion.data.choices[0].text.trim() };

    // use reply API
    return client.replyMessage(event.replyToken, echo);
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
    return client.replyMessage(
      event.replyToken,
      error.response.data || error.message
    );
  }
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
