import { Client, Events, Message } from "discord.js";

export function registerMessageHandler(client: Client): void {
    client.on(Events.MessageCreate, (message: Message) => {
        if (message.author.bot) return;

        if (message.content === "!ping") {
            message.reply("🏓 Pong!");
        }
    });
}
