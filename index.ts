import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import { registerMessageHandler } from "./src/main";

const tokenPath = "./config/token.env";

if (!fs.existsSync(tokenPath)) {
    console.error(`Error: Make sure the directory "${tokenPath}" exists, or rename "example_token.env" to "token.env".`);
    process.exit(1);
}

dotenv.config({ path: tokenPath });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Successfully logged in as: ${readyClient.user.tag}`);
});

// main code import
registerMessageHandler(client);

const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("Error: Invalid token. Make sure you have added the token to the file.");
    process.exit(1);
}

client.login(token);