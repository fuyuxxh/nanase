import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    MessageFlags,
    AttachmentBuilder,
} from "discord.js";
import { join } from "@std/path";

const ytdlpPath = ".\\bin\\yt-dlp.exe";
const ffmpegDir = join(Deno.cwd(), "bin");
const baseArgs = ["--ffmpeg-location", ffmpegDir, "--js-runtimes", "deno"];

const data = new SlashCommandBuilder()
    .setName("twdl")
    .setDescription("Twitterの動画をダウンロードします")
    .addStringOption((option) =>
        option
            .setName("url")
            .setDescription("TwitterのURL")
            .setRequired(true)
    );

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log(`/twdl command is executed by ${interaction.user.tag} in ${interaction.guild?.name ?? "DM"}.`);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const url = interaction.options.getString("url", true);

    // Twitter/X のURLかチェック
    if (!isTwitterUrl(url)) {
        await interaction.followUp({ content: "Error: 有効なTwitter/XのURLを入力してください。", flags: MessageFlags.Ephemeral });
        console.log(`Error: Invalid Twitter URL "${url}".`);
        return;
    }

    const tmpDir = "./temp";
    Deno.mkdirSync(tmpDir, { recursive: true });

    try {
        // yt-dlpで動画情報をJSON形式で取得
        const infoCmd = new Deno.Command(ytdlpPath, {
            args: [...baseArgs, "--dump-json", "--no-download", "--", url],
            stdout: "piped",
            stderr: "piped",
        });
        const infoResult = infoCmd.outputSync();
        const rawOutput = new TextDecoder("utf-8").decode(infoResult.stdout);

        if (!infoResult.success || !rawOutput.trim()) {
            await interaction.followUp({ content: "Error: 動画情報を取得できませんでした。", flags: MessageFlags.Ephemeral });
            console.log(`Error: Failed to get video info for "${url}".`);
            return;
        }

        const videoInfo = JSON.parse(rawOutput);
        const title = (videoInfo.title as string) || "twitter_video";
        const ext = (videoInfo.ext as string) || "mp4";
        
        // 推定または実際のファイルサイズを取得
        const rawSize = videoInfo.filesize_approx || videoInfo.filesize || 0;
        const sizeStr = rawSize > 0 ? ` (${(rawSize / 1024 / 1024).toFixed(1)}MB)` : "";

        const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
        const filename = `${safeTitle}.${ext}`;
        const tmpPath = join(tmpDir, filename);

        await interaction.followUp({ content: `"${title}"${sizeStr} をダウンロード中...`, flags: MessageFlags.Ephemeral });

        // yt-dlpで動画をダウンロード
        const dlCmd = new Deno.Command(ytdlpPath, {
            args: [...baseArgs, "-f", "best[ext=mp4]/best", "-o", tmpPath, "--", url],
            stdout: "piped",
            stderr: "piped",
        });
        const dlResult = dlCmd.outputSync();

        if (!dlResult.success) {
            const stderr = new TextDecoder().decode(dlResult.stderr);
            console.log(`[EXCEPTION] yt-dlp download error: ${stderr}`);
            await interaction.followUp({ content: "Error: ダウンロードに失敗しました。", flags: MessageFlags.Ephemeral });
            return;
        }

        // ダウンロードされたファイルを確認
        let fileSize: number;
        try {
            const stat = Deno.statSync(tmpPath);
            fileSize = stat.size;
        } catch {
            await interaction.followUp({ content: "Error: ダウンロードに失敗しました。", flags: MessageFlags.Ephemeral });
            return;
        }

        // Discordにファイルを送信
        const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
        const attachment = new AttachmentBuilder(tmpPath, { name: filename });
        await interaction.followUp({ content: `"${title}" (${sizeMB}MB)`, files: [attachment], flags: MessageFlags.Ephemeral });
        console.log(`Downloaded: ${filename}`);

        // 一時ファイルを削除
        Deno.removeSync(tmpPath);
    } catch (error) {
        await interaction.followUp({ content: "Error: ダウンロードに失敗しました。URLが正しいか確認してください。", flags: MessageFlags.Ephemeral });
        console.log(`[EXCEPTION] twdl error: ${error}`);
    }
}

/**
 * Twitter/X のURLかどうかを判定する
 */
function isTwitterUrl(url: string): boolean {
    const patterns = [
        /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\/\d+/,
        /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/video\/\d+/,
        /^https?:\/\/t\.co\//,
    ];

    return patterns.some((pattern) => pattern.test(url));
}

export default { data, execute };
