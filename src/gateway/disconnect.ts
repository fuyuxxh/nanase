import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

const data = new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("ボイスチャンネルから切断します");

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log(`/disconnect command is executed by ${interaction.user.tag} in ${interaction.guild?.name}.`);

    if (!interaction.guild) {
        await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", flags: MessageFlags.Ephemeral });
        console.log("Error: Not in server.");
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const connection = getVoiceConnection(interaction.guild.id);

        if (connection) {
            connection.destroy();
            await interaction.followUp("ボイスチャンネルから切断しました。");
            console.log("Successfully disconnected.");
        } else {
            await interaction.followUp({ content: "ボイスチャンネルに接続していません。", flags: MessageFlags.Ephemeral });
            console.log("Error: Not connected.");
        }
    } catch (error) {
        await interaction.followUp({ content: "切断中に予期せぬエラーが発生しました。", flags: MessageFlags.Ephemeral });
        console.log(`[EXCEPTION] ${error}`);
    }
}

export default { data, execute };
