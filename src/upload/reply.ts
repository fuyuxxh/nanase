import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";

const data = new SlashCommandBuilder()
    .setName("reply")
    .setDescription("テキストコマンドを追加します")
    .addStringOption((option) =>
        option
            .setName("command")
            .setDescription("コマンド名")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("reply")
            .setDescription("返信内容")
            .setRequired(true)
    );

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log(`/reply command is executed by ${interaction.user.tag} in ${interaction.guild?.name}.`);

    if (!interaction.guild) {
        await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", flags: MessageFlags.Ephemeral });
        console.log("Error: Not in server.");
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const commandName = interaction.options.getString("command", true);
    const replyText = interaction.options.getString("reply", true);

    // 禁則文字チェック
    if (/[\\/:*?"<>|]/.test(commandName)) {
        await interaction.followUp({ content: 'Error: コマンド名に次の文字は使用できません: \\ / : * ? " < > |', flags: MessageFlags.Ephemeral });
        console.log(`Error: Invalid characters in command name "${commandName}".`);
        return;
    }

    if (/[\\/:*?"<>|]/.test(replyText)) {
        await interaction.followUp({ content: 'Error: 返信内容に次の文字は使用できません: \\ / : * ? " < > |', flags: MessageFlags.Ephemeral });
        console.log(`Error: Invalid characters in reply text.`);
        return;
    }

    // 保存先: ./resources/text/<サーバーID>/<コマンド名>.txt
    const saveDir = path.join("./resources", "text", interaction.guild.id);
    const filename = `${commandName}.txt`;
    const savePath = path.join(saveDir, filename);

    // ファイル重複チェック
    if (fs.existsSync(savePath)) {
        await interaction.followUp({ content: "Error: このコマンド名は既に登録されています。", flags: MessageFlags.Ephemeral });
        console.log(`Error: File already exists at ${savePath}.`);
        return;
    }

    try {
        // ディレクトリ作成
        fs.mkdirSync(saveDir, { recursive: true });

        // ファイル保存
        fs.writeFileSync(savePath, Buffer.from(replyText, "utf-8"));

        await interaction.followUp({ content: "テキストコマンドが保存されました。", flags: MessageFlags.Ephemeral });
        console.log(`File is successfully uploaded to ${savePath}.`);
    } catch (error) {
        await interaction.followUp({ content: "Error: 正常に保存できませんでした。", flags: MessageFlags.Ephemeral });
        console.log(`Error while saving: ${error}`);
    }
}

export default { data, execute };
