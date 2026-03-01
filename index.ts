import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import { bootStrap } from "./src/main";

process.chdir(__dirname);
const tokenPath = "./config/token.env";
const isDeveloper = true;

if (!fs.existsSync(tokenPath)) {
    console.error(`Error: Make sure the directory "${tokenPath}" exists, or rename "example_token.env" to "token.env".`);
    process.exit(1);
}

dotenv.config({ path: tokenPath });

const developerGuildIds: string[] = JSON.parse(
    fs.readFileSync("./config/guild.env", "utf-8")
);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Successfully logged in as: ${readyClient.user.tag}`);
});

// main code import
bootStrap(client, { isDeveloper, developerGuildIds });

const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("Error: Invalid token. Make sure you have added the token to the file.");
    process.exit(1);
}

client.login(token);