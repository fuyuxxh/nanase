import { Client, Events } from "discord.js";
import fs from "fs";
import path from "path";

export function setupRespondent(client: Client): void {
    client.on(Events.MessageCreate, async (message) => {
        // ボットのメッセージ、あるいはギルド（サーバー）外のメッセージは無視
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const imageDir = path.join("./resources", "image", guildId);
        const textDir = path.join("./resources", "text", guildId);

        // --- 画像アップロードの対応 ---
        if (fs.existsSync(imageDir)) {
            try {
                const files = fs.readdirSync(imageDir);
                for (const file of files) {
                    const parsedPath = path.parse(file);
                    if (parsedPath.name === message.content) {
                        const filePath = path.join(imageDir, file);
                        await message.reply({ files: [filePath] });
                        console.log(`Responded to "${message.content}" with image ${file} in guild ${message.guild.name}.`);
                        return; // 画像で返信したらここで終了
                    }
                }
            } catch (error) {
                console.error(`Error reading image directory for guild ${guildId}:`, error);
            }
        }

        // --- テキスト返信の対応 ---
        if (fs.existsSync(textDir)) {
            try {
                const files = fs.readdirSync(textDir);
                for (const file of files) {
                    const parsedPath = path.parse(file);
                    if (parsedPath.name === message.content && parsedPath.ext === ".txt") {
                        const filePath = path.join(textDir, file);
                        const replyContent = fs.readFileSync(filePath, "utf-8");
                        await message.reply({ content: replyContent });
                        console.log(`Responded to "${message.content}" with text ${file} in guild ${message.guild.name}.`);
                        return; // テキストで返信したらここで終了
                    }
                }
            } catch (error) {
                console.error(`Error reading text directory for guild ${guildId}:`, error);
            }
        }
    });
}
