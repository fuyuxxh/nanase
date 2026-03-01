import { Client, Events } from "discord.js";
import { join, parse } from "@std/path";

export function setupRespondent(client: Client): void {
    client.on(Events.MessageCreate, async (message) => {
        // ボットのメッセージ、あるいはギルド（サーバー）外のメッセージは無視
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const imageDir = join("./resources", "image", guildId);
        const textDir = join("./resources", "text", guildId);

        // --- 画像アップロードの対応 ---
        try {
            const files = [...Deno.readDirSync(imageDir)];
            for (const entry of files) {
                if (!entry.isFile) continue;
                const parsedPath = parse(entry.name);
                if (parsedPath.name === message.content) {
                    const filePath = join(imageDir, entry.name);
                    await message.reply({ files: [filePath] });
                    console.log(`Responded to "${message.content}" with image ${entry.name} in guild ${message.guild.name}.`);
                    return;
                }
            }
        } catch {
            // ディレクトリが存在しない場合は無視
        }

        // --- テキスト返信の対応 ---
        try {
            const files = [...Deno.readDirSync(textDir)];
            for (const entry of files) {
                if (!entry.isFile) continue;
                const parsedPath = parse(entry.name);
                if (parsedPath.name === message.content && parsedPath.ext === ".txt") {
                    const filePath = join(textDir, entry.name);
                    const replyContent = Deno.readTextFileSync(filePath);
                    await message.reply({ content: replyContent });
                    console.log(`Responded to "${message.content}" with text ${entry.name} in guild ${message.guild.name}.`);
                    return;
                }
            }
        } catch {
            // ディレクトリが存在しない場合は無視
        }
    });
}
