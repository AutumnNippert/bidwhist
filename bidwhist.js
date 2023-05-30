const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const configuration = new Configuration({
    apiKey: dotenv.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function query(history) {
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: history,
    });
    return completion.data.choices[0].message;
}


console.log(query([{ role: "user", content: "Hello world" }]));