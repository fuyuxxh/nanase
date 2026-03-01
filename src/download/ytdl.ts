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
    .setName("ytdl")
    .setDescription("YouTubeの動画から音声をダウンロードします")
    .addStringOption((option) =>
        option
            .setName("url")
            .setDescription("YouTubeのURL")
            .setRequired(true)
    );

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log(`/ytdl command is executed by ${interaction.user.tag} in ${interaction.guild?.name ?? "DM"}.`);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const url = interaction.options.getString("url", true);

    // URLからビデオIDを抽出
    const videoId = extractVideoId(url);
    if (!videoId) {
        await interaction.followUp({ content: "Error: 無効なURLです。", flags: MessageFlags.Ephemeral });
        console.log(`Error: Invalid YouTube URL "${url}".`);
        return;
    }

    const tmpDir = "./temp";
    Deno.mkdirSync(tmpDir, { recursive: true });

    try {
        // yt-dlpでタイトルを取得
        const titleCmd = new Deno.Command(ytdlpPath, {
            args: [...baseArgs, "--dump-json", "--no-download", "--", videoId],
            stdout: "piped",
            stderr: "piped",
        });
        const titleResult = titleCmd.outputSync();
        const rawOutput = new TextDecoder("utf-8").decode(titleResult.stdout);

        if (!titleResult.success || !rawOutput.trim()) {
            await interaction.followUp({ content: "Error: 動画情報を取得できませんでした。", flags: MessageFlags.Ephemeral });
            return;
        }

        const videoInfo = JSON.parse(rawOutput);
        const title = videoInfo.title as string;

        // 推定または実際のファイルサイズを取得
        const rawSize = videoInfo.filesize_approx || videoInfo.filesize || 0;
        const sizeStr = rawSize > 0 ? ` (${(rawSize / 1024 / 1024).toFixed(1)}MB)` : "";

        const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
        const filename = `${safeTitle}.m4a`;
        const tmpPath = join(tmpDir, filename);

        await interaction.followUp({ content: `"${title}"${sizeStr} をダウンロード中...`, flags: MessageFlags.Ephemeral });

        // yt-dlpで音声をm4a形式でダウンロード
        const dlCmd = new Deno.Command(ytdlpPath, {
            args: [...baseArgs, "-f", "ba[ext=m4a]/ba", "--extract-audio", "--audio-format", "m4a", "-o", tmpPath, "--", videoId],
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
        console.log(`[EXCEPTION] ytdl error: ${error}`);
    }
}

/**
 * YouTubeのURLからビデオIDを抽出する
 */
function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    // URLではなくIDが直接渡された場合
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

    return null;
}

export default { data, execute };
