import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    MessageFlags,
    Attachment,
} from "discord.js";
import fs from "fs";
import path from "path";

const audioExtensions = [".mp3", ".wav", ".m4a", ".ogg"];
const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".jfif"];

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
    audio: audioExtensions,
    image: imageExtensions,
};

const data = new SlashCommandBuilder()
    .setName("upload")
    .setDescription("好きなコマンドを追加できます。")
    .addStringOption((option) =>
        option
            .setName("type")
            .setDescription("ファイル形式")
            .setRequired(true)
            .addChoices(
                { name: "audio", value: "audio" },
                { name: "image", value: "image" },
            )
    )
    .addStringOption((option) =>
        option
            .setName("name")
            .setDescription("コマンド名")
            .setRequired(true)
    )
    .addAttachmentOption((option) =>
        option
            .setName("file")
            .setDescription("アップロードするファイル")
            .setRequired(true)
    );

async function execute(
    interaction: ChatInputCommandInteraction,
    allowedExtensions: Record<string, string[]> = ALLOWED_EXTENSIONS,
): Promise<void> {
    console.log(`/upload command is executed by ${interaction.user.tag} in ${interaction.guild?.name}.`);

    if (!interaction.guild) {
        await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", flags: MessageFlags.Ephemeral });
        console.log("Error: Not in server.");
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const selectedType = interaction.options.getString("type", true);
    const file = interaction.options.getAttachment("file", true) as Attachment;
    const name = interaction.options.getString("name", true);

    // 禁則文字チェック
    if (/[\\/:*?"<>|]/.test(name)) {
        await interaction.followUp({ content: 'Error: コマンド名に次の文字は使用できません: \ / : * ? " < > |', flags: MessageFlags.Ephemeral });
        console.log(`Error: Invalid characters in command name "${name}".`);
        return;
    }

    const ext = path.extname(file.name).toLowerCase();
    const filename = `${name}${ext}`;

    // 拡張子チェック
    if (!allowedExtensions[selectedType]?.includes(ext)) {
        await interaction.followUp({ content: "Error: invalid extension.", flags: MessageFlags.Ephemeral });
        console.log(`Error: Invalid extension "${ext}" for type "${selectedType}".`);
        return;
    }

    // 保存先: ./resources/<filetype>/<サーバーID>/<ファイル名>
    const saveDir = path.join("./resources", selectedType, interaction.guild.id);
    const savePath = path.join(saveDir, filename);

    // ファイル重複チェック
    if (fs.existsSync(savePath)) {
        await interaction.followUp({ content: "Error: file already exists.", flags: MessageFlags.Ephemeral });
        console.log(`Error: File already exists at ${savePath}.`);
        return;
    }

    try {
        // ディレクトリ作成
        fs.mkdirSync(saveDir, { recursive: true });

        // ファイルダウンロード＆保存
        const response = await fetch(file.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(savePath, buffer);

        await interaction.followUp({ content: "ファイルが保存されました。", flags: MessageFlags.Ephemeral });
        console.log(`File is successfully uploaded to ${savePath}.`);
    } catch (error) {
        await interaction.followUp({ content: "Error: not successfully saved.", flags: MessageFlags.Ephemeral });
        console.log(`Error while saving: ${error}`);
    }
}

export default { data, execute };