import { AutocompleteInteraction, ChatInputCommandInteraction, Client, Events, REST, Routes, SharedSlashCommand } from "discord.js";
import connect from "./gateway/connect.ts";
import disconnect from "./gateway/disconnect.ts";
import upload from "./upload/upload.ts";
import soundboard from "./upload/soundboard.ts";
import reply from "./upload/reply.ts";
import { setupRespondent } from "./upload/respondent.ts";
import ytdl from "./download/ytdl.ts";

interface Command {
    data: SharedSlashCommand;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

const commands: Command[] = [connect, disconnect, upload, soundboard, reply, ytdl];

interface BootStrapOptions {
    isDeveloper: boolean;
    developerGuildIds: string[];
}

export function bootStrap(client: Client, options: BootStrapOptions): void {
    // 自動返信機能などのイベントリスナをセットアップ
    setupRespondent(client);

    // スラッシュコマンドの登録（Bot起動時）
    client.once(Events.ClientReady, async (readyClient) => {
        const rest = new REST({ version: "10" }).setToken(readyClient.token);
        const commandData = commands.map((cmd) => cmd.data.toJSON());

        try {
            console.log("Registering slash commands...");

            if (options.isDeveloper) {
                // 開発者モード: 特定ギルドに登録（即時反映）
                const betaCommandData = commandData.map((cmd) => ({
                    ...cmd,
                    description: `${cmd.description} (beta)`,
                }));

                for (const guildId of options.developerGuildIds) {
                    try {
                        const registered = await rest.put(
                            Routes.applicationGuildCommands(readyClient.user.id, guildId),
                            { body: betaCommandData }
                        ) as unknown[];
                        console.log(` ${registered.length} command(s) registered in guild: ${guildId}`);
                    } catch {
                        console.warn(` Skipped guild: ${guildId} (Missing Access)`);
                    }
                }
            } else {
                // 本番モード: グローバルに登録
                const registered = await rest.put(
                    Routes.applicationCommands(readyClient.user.id),
                    { body: commandData }
                ) as unknown[];
                console.log(` ${registered.length} command(s) are successfully registered.`);
            }
        } catch (error) {
            console.error("Error: Failed command(s) registration.", error);
        }
    });

    // InteractionCreate イベントのハンドリング
    client.on(Events.InteractionCreate, async (interaction) => {
        // オートコンプリート
        if (interaction.isAutocomplete()) {
            const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
            if (command?.autocomplete) {
                await command.autocomplete(interaction);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        if (command) {
            await command.execute(interaction as ChatInputCommandInteraction);
        } else {
            console.log(`Unknown command: ${interaction.commandName}`);
        }
    });
}