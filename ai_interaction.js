const { Configuration, OpenAIApi } = require("openai");
const { log } = require("./logger.js");
require("dotenv").config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

/* FUNCTIONS */

async function query(history) {
    while (true) {
        try {

            const completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: history,
            });
            log(completion.data.choices[0].message.content, "ai.log");
            return completion.data.choices[0].message.content;
        } catch (e) {
            console.log(e);
        }
    }

}

/* TEST */

async function main() {
    response = await query([{ role: "user", content: "How are you?" }]);
    console.log(response);
}

// main();

module.exports = { query };