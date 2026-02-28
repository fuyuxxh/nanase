import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import { registerMessageHandler } from "./src/main";

dotenv.config({ path: "./config/token.env" });

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
    console.error("Error: Invalid token");
    process.exit(1);
}

client.login(token);