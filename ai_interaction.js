const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

/* FUNCTIONS */

async function query(history) {
    // write history to file
    const fs = require('fs');
    fs.writeFile('history.txt', JSON.stringify(history), function (err) {
        if (err) return console.log(err);
    });

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: history,
    });
    console.log(completion.data.choices[0].message);
    return completion.data.choices[0].message.content;
}

/* TEST */

async function main() {
    response = await query([{ role: "user", content: "How are you?" }]);
    console.log(response);
}

// main();

module.exports = { query };