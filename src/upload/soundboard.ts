import {
    ChatInputCommandInteraction,
    AutocompleteInteraction,
    SlashCommandBuilder,
    MessageFlags,
    GuildMember,
    VoiceChannel,
} from "discord.js";
import {
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import { connectToChannel } from "../gateway/connect.ts";
import { join, extname, basename } from "@std/path";

const audioDir = "./resources/audio";

const data = new SlashCommandBuilder()
    .setName("soundboard")
    .setDescription("アップロードされた音声ファイルを再生します")
    .addStringOption((option) =>
        option
            .setName("name")
            .setDescription("再生するファイル名")
            .setRequired(true)
            .setAutocomplete(true)
    );

/**
 * 指定ギルドの音声ファイル一覧を取得（拡張子なし）
 */
function getAudioFiles(guildId: string): { name: string; file: string }[] {
    const dir = join(audioDir, guildId);

    try {
        const entries = [...Deno.readDirSync(dir)];
        return entries
            .filter((e) => e.isFile && [".mp3", ".wav", ".m4a", ".ogg"].includes(extname(e.name).toLowerCase()))
            .map((e) => ({
                name: basename(e.name, extname(e.name)),
                file: e.name,
            }));
    } catch {
        return [];
    }
}

/**
 * オートコンプリート: ギルド内の音声ファイルを候補として返す
 */
async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.guild) return;

    const focused = interaction.options.getFocused().toLowerCase();
    const files = getAudioFiles(interaction.guild.id);

    const filtered = files
        .filter((f) => f.name.toLowerCase().includes(focused))
        .slice(0, 25);

    await interaction.respond(
        filtered.map((f) => ({ name: f.name, value: f.name }))
    );
}

/**
 * /soundboard コマンドのハンドラ
 */
async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log(`/soundboard command is executed by ${interaction.user.tag} in ${interaction.guild?.name}.`);

    if (!interaction.guild) {
        await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", flags: MessageFlags.Ephemeral });
        console.log("Error: Not in server.");
        return;
    }

    let connection = getVoiceConnection(interaction.guild.id);

    // 既に他の機能（または自身）が音声を再生中かチェックする
    if (connection) {
        const subscription = (connection.state as any).subscription;
        if (subscription && subscription.player.state.status !== AudioPlayerStatus.Idle) {
            await interaction.reply({ content: "再生に失敗しました。時間をおいて再度実行してください。", flags: MessageFlags.Ephemeral });
            console.log("Error: VoiceConnection is already busy playing audio.");
            return;
        }
    }

    const name = interaction.options.getString("name", true);
    const files = getAudioFiles(interaction.guild.id);
    const match = files.find((f) => f.name === name);

    if (!match) {
        await interaction.reply({ content: `Error: "${name}" が見つかりません。`, flags: MessageFlags.Ephemeral });
        console.log(`Error: File "${name}" not found.`);
        return;
    }

    const member = interaction.member as GuildMember;
    const memberVoiceChannel = member.voice.channel as VoiceChannel | null;
    let autoConnected = false;

    // ボットもユーザーもVCにいない場合
    if (!connection && !memberVoiceChannel) {
        await interaction.reply({ content: "ボイスチャンネルに接続してください。", flags: MessageFlags.Ephemeral });
        console.log("Error: Neither bot nor user in voice channel.");
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ユーザーはVCにいるが、ボットがいない場合 → 自動接続
    if (!connection && memberVoiceChannel) {
        try {
            connection = await connectToChannel(memberVoiceChannel);
            autoConnected = true;
            console.log(`Auto-connected to: ${memberVoiceChannel.name}`);
        } catch (error) {
            await interaction.followUp({ content: "Error: ボイスチャンネルへの接続に失敗しました。", flags: MessageFlags.Ephemeral });
            console.log(`[EXCEPTION] Auto-connect failed: ${error}`);
            return;
        }
    }

    try {
        const filePath = join(audioDir, interaction.guild.id, match.file);
        const player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
        });
        const resource = createAudioResource(filePath);

        connection!.subscribe(player);
        player.play(resource);

        await interaction.followUp({ content: `🔊 "${name}" を再生中...`, flags: MessageFlags.Ephemeral });
        console.log(`Playing: ${filePath}`);

        player.on(AudioPlayerStatus.Idle, () => {
            player.stop();
            // 自動接続した場合は再生後に切断
            if (autoConnected) {
                connection?.destroy();
                console.log("Auto-disconnected after playback.");
            }
        });

        player.on("error", (error) => {
            console.log(`[EXCEPTION] Audio player error: ${error}`);
            if (autoConnected) {
                connection?.destroy();
            }
        });
    } catch (error) {
        await interaction.followUp({ content: "Error: 再生に失敗しました。", flags: MessageFlags.Ephemeral });
        console.log(`[EXCEPTION] ${error}`);
        if (autoConnected) {
            connection?.destroy();
        }
    }
}

export default { data, execute, autocomplete };