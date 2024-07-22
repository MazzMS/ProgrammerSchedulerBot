import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'bun';

const commands = [];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
	const foldersPath = path.join(__dirname, 'commands');
	const commandsFolders = await readdir(foldersPath);

	for (const folder of commandsFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith('.js'));

		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = await import(filePath);

			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
}

await loadCommands();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.APP_ID, process.env.DEV_GUILD_ID),
			{ body: commands },
		);

		console.log(`Succesfully reloaded ${data.length} application (/) commands.`);
	} catch (err) {
		console.error(err);
	}
})();
