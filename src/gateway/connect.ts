import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ChannelType,
    VoiceChannel,
    MessageFlags,
} from "discord.js";
import {
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnection,
    VoiceConnectionStatus,
    entersState,
} from "@discordjs/voice";

/**
 * ボイスチャンネルに接続するヘルパー関数（他モジュールからも利用可能）
 */
export async function connectToChannel(channel: VoiceChannel): Promise<VoiceConnection> {
    // 既存の接続があれば破棄してから再接続
    const existing = getVoiceConnection(channel.guild.id);
    if (existing) {
        existing.destroy();
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // Disconnected状態での自動再接続ループを防止
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // 再接続中なので待機
        } catch (error) {
            // 再接続できない場合は破棄
            console.log(`[VoiceConnection] Failed to reconnect, destroying connection. Reason: ${error}`);
            connection.destroy();
        }
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
        return connection;
    } catch (error) {
        connection.destroy();
        throw error;
    }
}

const data = new SlashCommandBuilder()
    .setName("connect")
    .setDescription("選択したボイスチャンネルに接続します")
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setDescription("接続するボイスチャンネルを選択してください")
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
    );

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel("channel", true) as VoiceChannel;

    console.log(`/connect command is executed by ${interaction.user.tag} in ${interaction.guild?.name}.`);

    if (!interaction.guild) {
        await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", flags: MessageFlags.Ephemeral });
        console.log("Error: Not in server.");
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        await connectToChannel(channel);

        await interaction.followUp(`${channel.name} に接続しました！`);
        console.log(`Successfully connected to: ${channel.name}`);
    } catch (error: any) {
        if (error.code === "VOICE_ALREADY_ACTIVE") {
            await interaction.followUp({ content: "既に使用されています。", flags: MessageFlags.Ephemeral });
            console.log("Error: Already connected.");
        } else if (error.code === 50013) {
            await interaction.followUp({ content: "接続に必要な権限がありません。", flags: MessageFlags.Ephemeral });
            console.log("Error: No permission.");
        } else {
            await interaction.followUp({ content: "接続中に予期せぬエラーが発生しました。", flags: MessageFlags.Ephemeral });
            console.log(`[EXCEPTION] ${error}`);
        }
    }
}

export default { data, execute };