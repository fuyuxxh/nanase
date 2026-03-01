import { Client, GatewayIntentBits, Events } from "discord.js";
import { bootStrap } from "./src/main.ts";

const tokenPath = "./config/token.env";

const isDeveloper = true;

// token.env の存在確認
try {
    Deno.statSync(tokenPath);
} catch {
    console.error(`Error: Make sure the directory "${tokenPath}" exists, or rename "example_token.env" to "token.env".`);
    Deno.exit(1);
}

// .env ファイルを手動パース（dotenv 不要）
const envContent = Deno.readTextFileSync(tokenPath);
for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    Deno.env.set(key, value);
}

const developerGuildIds: string[] = JSON.parse(
    Deno.readTextFileSync("./config/guild.env")
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

const token = Deno.env.get("BOT_TOKEN");

if (!token) {
    console.error("Error: Invalid token. Make sure you have added the token to the file.");
    Deno.exit(1);
}

client.login(token);